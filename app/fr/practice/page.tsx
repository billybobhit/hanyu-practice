"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import ChatBubble, { TypingIndicator } from "@/components/ChatBubble";
import VoiceButton from "@/components/VoiceButton";
import {
  getCurrentSessionId,
  getSession,
  getSessions,
  saveSession,
} from "@/lib/storage";
import { applyEloChange, getProgressFromSessions, getRankForElo } from "@/lib/ranks";
import { pushSessionToCloud } from "@/lib/supabase/session-sync";
import { addConversationHistory } from "@/lib/supabase/conversation-history";
import { createClient } from "@/lib/supabase/client";
import { dispatchRankUpdated } from "@/lib/rank-events";
import type { Difficulty, Message, Session } from "@/lib/types";

const difficultyLabels: Record<Difficulty, string> = {
  hard: "Hard",
  medium: "Medium",
  easy: "Easy",
};

const difficultyDescriptions: Record<Difficulty, string> = {
  hard: "French-only tutor responses",
  medium: "French with English hints",
  easy: "Plain English tutor responses",
};

const GRADE_TIMEOUT_MS = 45_000;
const VALID_GRADES = ["A", "B", "C", "D", "F"];

export default function PracticePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [userLanguageElo, setUserLanguageElo] = useState(0);
  const [devMode, setDevMode] = useState(false);
  const [devInput, setDevInput] = useState("");
  const [devMessages, setDevMessages] = useState<{ role: "sys" | "user"; text: string }[]>([
    { role: "sys", text: "HanYu Dev Console active. What would you like to test?" },
    { role: "sys", text: 'Try: "Give me an A" · "Show B" · "F grade" · or just type a letter.' },
  ]);
  const devInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  function parseGrade(text: string): string | null {
    for (const g of ["A", "B", "C", "D", "F"]) {
      if (text.toUpperCase().includes(g)) return g;
    }
    return null;
  }

  const handleDevCommand = () => {
    const text = devInput.trim();
    if (!text) return;
    setDevMessages((prev) => [...prev, { role: "user", text }]);
    setDevInput("");
    const grade = parseGrade(text);
    if (grade) {
      setDevMessages((prev) => [...prev, { role: "sys", text: `Launching grade ${grade} preview...` }]);
      setTimeout(() => {
        setDevMode(false);
        router.push(`/fr/results?preview=${grade}`);
      }, 700);
    } else {
      setDevMessages((prev) => [
        ...prev,
        { role: "sys", text: 'Unrecognized. Try "Give me an A" or just "B".' },
      ]);
    }
  };

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const loadLanguageElo = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUserLanguageElo(0);
        return;
      }

      const { data } = await supabase
        .from("user_language_elo")
        .select("elo")
        .eq("user_id", user.id)
        .eq("language_code", "fr")
        .maybeSingle();
      setUserLanguageElo(typeof data?.elo === "number" ? data.elo : 0);
    };

    void loadLanguageElo();
  }, []);

  useEffect(() => {
    const id = getCurrentSessionId();
    if (!id) {
      router.replace("/");
      return;
    }
    const s = getSession(id);
    if (!s) {
      router.replace("/");
      return;
    }
    setSession(s);

    // Auto-start: have the tutor greet if no messages yet
    if (s.messages.length === 0) {
      setTimeout(() => sendFirstMessage(s), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 50);
  }, []);

  useEffect(() => {
    if (session?.messages.length) scrollToBottom();
  }, [session?.messages.length, scrollToBottom]);

  const speakText = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/\([^)]+\)/g, ""));
      utterance.lang = session?.difficulty === "easy" ? "en-US" : "fr-FR";
      utterance.rate = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find((v) =>
        session?.difficulty === "easy"
          ? v.lang.includes("en")
          : v.lang.includes("fr")
      );
      if (preferredVoice) utterance.voice = preferredVoice;
      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [session?.difficulty]
  );

  const sendFirstMessage = async (s: Session) => {
    const messages: Message[] = [
      {
        role: "user",
        content: "Please begin our practice session.",
        timestamp: Date.now(),
      },
    ];
    await streamAssistant(s, messages);
  };

  const streamAssistant = useCallback(
    async (currentSession: Session, messages: Message[]) => {
      setIsLoading(true);

      try {
        const response = await fetch("/fr/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            material: currentSession.materialContent,
            difficulty: currentSession.difficulty ?? "hard",
          }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const msg = body.error || `API error ${response.status}`;
          setApiError(msg);
          return;
        }
        setApiError(null);

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let assistantText = "";

        const assistantMsg: Message = {
          role: "assistant",
          content: "",
          timestamp: Date.now(),
        };

        const allMessages = [...messages, assistantMsg];
        const updatedSession = { ...currentSession, messages: allMessages };
        setSession(updatedSession);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantText += decoder.decode(value, { stream: true });

          setSession((prev) => {
            if (!prev) return prev;
            const msgs = [...prev.messages];
            msgs[msgs.length - 1] = { ...assistantMsg, content: assistantText };
            return { ...prev, messages: msgs };
          });
        }

        const finalMsg: Message = {
          ...assistantMsg,
          content: assistantText,
          timestamp: Date.now(),
        };
        const finalMessages = [...messages, finalMsg];
        const finalSession = { ...currentSession, messages: finalMessages };
        setSession(finalSession);
        saveSession(finalSession);
        void pushSessionToCloud(finalSession);

        if (autoSpeak && assistantText) {
          speakText(assistantText);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [autoSpeak, speakText]
  );

  const sendMessage = useCallback(async () => {
    if (!session || !input.trim() || isLoading) return;
    if (input.trim().toLowerCase() === "hanyu dev") {
      setInput("");
      setDevMode(true);
      setTimeout(() => devInputRef.current?.focus(), 50);
      return;
    }

    const userMsg: Message = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    const messages = [...session.messages, userMsg];
    const updated = { ...session, messages };
    setSession(updated);
    saveSession(updated);
    void pushSessionToCloud(updated);
    setInput("");

    await streamAssistant(updated, messages);
  }, [session, input, isLoading, streamAssistant]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const endSession = async () => {
    if (!session || session.messages.length < 3) {
      router.push("/fr/results");
      return;
    }

    setIsGrading(true);
    setGradingError(null);
    let gradeTimeout: ReturnType<typeof setTimeout> | null = null;
    try {
      const previousProgress = getProgressFromSessions(
        getSessions().filter((s) => s.id !== session.id && s.languageCode === "fr")
      );

      const gradeAbort = new AbortController();
      gradeTimeout = setTimeout(() => gradeAbort.abort(), GRADE_TIMEOUT_MS);
      const response = await fetch("/fr/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: session.messages,
          material: session.materialContent,
          difficulty: session.difficulty ?? "hard",
          userRank: previousProgress.currentRank.name,
          userElo: previousProgress.currentElo,
          userLanguageElo,
          languageCode: "fr",
        }),
        signal: gradeAbort.signal,
      });
      clearTimeout(gradeTimeout);
      gradeTimeout = null;

      const grade = await response.json();
      if (!response.ok) {
        throw new Error(grade.error || `Grading failed with status ${response.status}`);
      }
      if (!VALID_GRADES.includes(grade.overallGrade) || typeof grade.overallScore !== "number") {
        throw new Error("Grading returned an invalid report.");
      }
      const endedSession: Session = {
        ...session,
        endTime: Date.now(),
        grade,
      };
      endedSession.rankEvent =
        typeof grade.globalEloBefore === "number" &&
        typeof grade.globalEloAfter === "number"
          ? {
              eloBefore: grade.globalEloBefore,
              eloAfter: grade.globalEloAfter,
              eloChange:
                typeof grade.globalContribution === "number"
                  ? grade.globalContribution
                  : grade.globalEloAfter - grade.globalEloBefore,
              rankBefore:
                typeof grade.globalRankBefore === "string"
                  ? grade.globalRankBefore
                  : getRankForElo(grade.globalEloBefore).name,
              rankAfter:
                typeof grade.globalRankAfter === "string"
                  ? grade.globalRankAfter
                  : getRankForElo(grade.globalEloAfter).name,
              sessionEloGain:
                typeof grade.sessionEloGain === "number"
                  ? grade.sessionEloGain
                  : undefined,
              globalContribution:
                typeof grade.globalContribution === "number"
                  ? grade.globalContribution
                  : undefined,
              languageRank:
                typeof grade.languageRank === "string" ? grade.languageRank : undefined,
            }
          : applyEloChange(
              previousProgress.currentElo,
              grade.overallGrade,
              grade.overallScore
            );
      if (endedSession.rankEvent) {
        dispatchRankUpdated({
          elo: endedSession.rankEvent.eloAfter,
          languageCode: "fr",
          rankEvent: endedSession.rankEvent,
        });
      }
      saveSession(endedSession);
      void pushSessionToCloud(endedSession);
      await addConversationHistory(endedSession);
      sessionStorage.setItem("hanyu_fresh_grade", "1");
      router.push("/fr/results");
    } catch (err) {
      if (gradeTimeout) clearTimeout(gradeTimeout);
      setIsGrading(false);
      const timedOut = err instanceof DOMException && err.name === "AbortError";
      setGradingError(
        timedOut
          ? "Grading is taking longer than expected — your session is saved."
          : err instanceof Error
            ? err.message
            : "Grading failed — your session is saved."
      );
      const endedSession = { ...session, endTime: Date.now() };
      saveSession(endedSession);
      void pushSessionToCloud(endedSession);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-cream-500 text-sm">Loading...</div>
      </div>
    );
  }

  const userMessages = session.messages.filter((m) => m.role === "user");
  const difficulty = session.difficulty ?? "hard";

  return (
    <div className="h-screen flex flex-col bg-ink-900 pt-16">
      {/* Top bar */}
      <header className="glass border-b border-ink-600 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push("/")}
          className="text-cream-500 hover:text-cream-300 transition-colors cursor-pointer text-lg"
        >
          ←
        </button>

        <div className="flex-1 min-w-0">
          <h1
            className="text-cream-100 font-medium truncate"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            {session.materialTitle}
          </h1>
          <p className="text-cream-600 text-xs">
            {userMessages.length} turns · {difficultyLabels[difficulty]} mode
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-gold-800/25 border border-gold-700/40 text-gold-200 text-xs font-medium">
            {difficultyLabels[difficulty]}
          </div>

          <button
            onClick={() => {
              setAutoSpeak((v) => !v);
              if (autoSpeak) window.speechSynthesis?.cancel();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              autoSpeak
                ? "bg-vermillion-700 text-vermillion-200"
                : "bg-ink-600 text-cream-400 hover:text-cream-200"
            }`}
            title="Auto speak"
          >
            🔊
          </button>

          <button
            onClick={endSession}
            disabled={isGrading}
            className="px-3 py-1.5 bg-ink-600 hover:bg-ink-500 disabled:opacity-50 text-cream-300 hover:text-cream-100 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isGrading ? "Grading..." : "End"}
          </button>
        </div>
      </header>

      {/* Chat messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        <div className="text-center">
          <span className="text-xs text-gold-600 bg-gold-800/20 border border-gold-800/30 rounded-full px-3 py-1">
            {difficultyLabels[difficulty]}: {difficultyDescriptions[difficulty]}
          </span>
        </div>

        {session.messages
          .filter(
            (m) =>
              !(
                m.role === "user" &&
                m.content === "Please begin our practice session."
              )
          )
          .map((msg) => (
            <ChatBubble
              key={msg.timestamp}
              message={msg}
              pinyinMode={false}
              onSpeak={msg.role === "assistant" ? speakText : undefined}
            />
          ))}

        {isLoading && <TypingIndicator />}
        <div className="h-2" />
      </div>

      {/* API error banner */}
      {apiError && (
        <div className="bg-vermillion-700/20 border-t border-vermillion-700/50 px-4 py-3 shrink-0 flex items-start gap-3">
          <span className="text-vermillion-400 shrink-0">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-vermillion-300 text-sm font-medium">API Error</p>
            <p className="text-vermillion-400 text-xs mt-0.5 break-words">{apiError}</p>
          </div>
          <button
            onClick={() => setApiError(null)}
            className="text-vermillion-500 hover:text-vermillion-300 text-xs cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grading error banner */}
      {gradingError && (
        <div className="bg-ink-700/80 border-t border-ink-500 px-4 py-3 shrink-0 flex items-center gap-3">
          <span className="text-cream-400 text-sm flex-1">{gradingError}</span>
          <button
            onClick={() => router.push("/fr/results")}
            className="px-3 py-1.5 bg-vermillion-600 hover:bg-vermillion-500 text-cream-100 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
          >
            Continue →
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="glass border-t border-ink-600 p-4 shrink-0">
        <div className="flex gap-2 items-end">
          <VoiceButton
            onTranscript={(text) => setInput((prev) => prev + text)}
            disabled={isLoading}
            language="fr-FR"
          />

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your response... (Enter to send, Shift+Enter for a new line)"
            rows={1}
            className="flex-1 bg-ink-700 border border-ink-500 focus:border-vermillion-600 rounded-xl px-4 py-2.5 text-cream-100 placeholder-cream-600 resize-none transition-colors text-sm leading-relaxed focus:outline-none"
            style={{ maxHeight: "120px", minHeight: "42px" }}
            onInput={(e) => {
              const el = e.target as HTMLTextAreaElement;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="shrink-0 w-10 h-10 bg-vermillion-600 hover:bg-vermillion-500 disabled:bg-ink-600 disabled:cursor-not-allowed rounded-xl flex items-center justify-center text-cream-100 transition-all cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current rotate-90">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Dev Console Overlay */}
      {devMode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-ink-950 border border-green-500/40 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-green-950/60 border-b border-green-500/30 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs font-mono tracking-widest uppercase">HanYu Dev Console</span>
              </div>
              <button
                onClick={() => setDevMode(false)}
                className="text-green-700 hover:text-green-400 text-xs font-mono transition-colors cursor-pointer"
              >
                [esc]
              </button>
            </div>

            {/* Messages */}
            <div className="p-4 space-y-2 min-h-[120px] max-h-64 overflow-y-auto">
              {devMessages.map((m, i) => (
                <div key={i} className="font-mono text-sm flex gap-2">
                  <span className={m.role === "sys" ? "text-green-600" : "text-green-300"}>
                    {m.role === "sys" ? ">" : "$"}
                  </span>
                  <span className={m.role === "sys" ? "text-green-400" : "text-green-200"}>
                    {m.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-green-500/30 px-4 py-3 flex gap-2 items-center">
              <span className="text-green-500 font-mono text-sm shrink-0">$</span>
              <input
                ref={devInputRef}
                value={devInput}
                onChange={(e) => setDevInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleDevCommand();
                  if (e.key === "Escape") setDevMode(false);
                }}
                placeholder="give me an A..."
                className="flex-1 bg-transparent text-green-200 font-mono text-sm outline-none placeholder-green-800"
                autoFocus
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
