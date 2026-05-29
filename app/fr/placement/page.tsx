"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  canTakeAdvancedPlacement,
  canTakeStandardPlacement,
  getPlacementStatus,
} from "@/lib/supabase/placement-status";
import { addConversationHistory } from "@/lib/supabase/conversation-history";
import { saveSession, generateSessionId, setCurrentSessionId } from "@/lib/storage";
import { getRankForElo } from "@/lib/ranks";
import PlacementResult from "@/components/PlacementResult";
import VoiceButton from "@/components/VoiceButton";
import type { Message, RankEvent, Session } from "@/lib/types";

interface PlacementGradeResult {
  grade: string;
  referenceLevel?: string;
  rankEvent: RankEvent;
}

export default function FrPlacementPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [result, setResult] = useState<PlacementGradeResult | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [placementElo, setPlacementElo] = useState(0);
  const [isAdvancedPlacement, setIsAdvancedPlacement] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startedRef = useRef(false);
  const streamInFlightRef = useRef(false);

  const userTurns = messages.filter((m) => m.role === "user").length;
  const requiredTurns = isAdvancedPlacement ? 6 : 4;

  const speakText = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/\([^)]+\)/g, ""));
    utterance.lang = "fr-FR";
    utterance.rate = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((v) => v.lang.includes("fr"));
    if (preferredVoice) utterance.voice = preferredVoice;
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    async function init() {
      if (startedRef.current) return;
      startedRef.current = true;

      const params = new URLSearchParams(window.location.search);
      const wantsAdvanced = params.get("advanced") === "1";
      setIsAdvancedPlacement(wantsAdvanced);

      const supabase = createClient();
      if (!supabase) {
        router.replace("/");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }

      const placementStatus = await getPlacementStatus(supabase, user.id, "fr");

      if (wantsAdvanced) {
        if (!canTakeAdvancedPlacement(placementStatus.elo)) {
          router.replace("/fr");
          return;
        }
      } else if (!canTakeStandardPlacement(placementStatus.elo)) {
        router.replace("/fr");
        return;
      }

      setPlacementElo(placementStatus.elo);
      setChecking(false);
      void streamAssistant([], wantsAdvanced);
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, [messages]);

  const streamAssistant = useCallback(async (
    history: Message[],
    advanced = isAdvancedPlacement
  ) => {
    if (streamInFlightRef.current) return;
    streamInFlightRef.current = true;
    setIsLoading(true);
    try {
      const res = await fetch("/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          languageCode: "fr",
          mode: advanced ? "advanced" : "standard",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = data?.error || "Placement could not start. Please try again.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: message, timestamp: Date.now() },
        ]);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let text = "";

      const placeholder: Message = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, placeholder]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            role: "assistant",
            content: text,
          };
          return next;
        });
      }
      if (!text.trim()) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            role: "assistant",
            content: "Placement response was empty. Please try again.",
          };
          return next;
        });
        return;
      }
      if (autoSpeak && text) speakText(text);
    } finally {
      streamInFlightRef.current = false;
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [autoSpeak, isAdvancedPlacement, speakText]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    await streamAssistant(next);
  }, [input, isLoading, messages, streamAssistant]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const submitForAssessment = async () => {
    if (isGrading) return;
    setIsGrading(true);
    try {
      const res = await fetch("/api/placement-grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          languageCode: "fr",
          mode: isAdvancedPlacement ? "advanced" : "standard",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Placement grading failed");
      }
      const currentElo = placementElo;
      const eloAfter =
        typeof data.eloAfter === "number"
          ? data.eloAfter
          : currentElo + (data.startingElo ?? 0);
      const rankEvent: RankEvent = {
        eloBefore: typeof data.eloBefore === "number" ? data.eloBefore : currentElo,
        eloAfter,
        eloChange:
          typeof data.eloChange === "number"
            ? data.eloChange
            : eloAfter - currentElo,
        rankBefore: getRankForElo(currentElo).name,
        rankAfter: getRankForElo(eloAfter).name,
      };
      const overallScore = data.overallScore ?? 65;
      const overallGrade = (
        ["A", "B", "C", "D", "F"].includes(data.overallGrade)
          ? data.overallGrade
          : "C"
      ) as "A" | "B" | "C" | "D" | "F";
      const sessionId = generateSessionId();
      setCurrentSessionId(sessionId);
      const endedSession: Session = {
        id: sessionId,
        materialTitle: isAdvancedPlacement
          ? "Advanced Placement Assessment · French"
          : "Placement Assessment · French",
        materialContent: "",
        difficulty: "hard",
        messages,
        startTime: Date.now(),
        endTime: Date.now(),
        languageCode: "fr",
        grade: {
          overallGrade,
          overallScore,
          vocabularyScore: overallScore,
          grammarScore: overallScore,
          comprehensionScore: overallScore,
          strengths: data.strengths ?? [],
          improvements: data.improvements ?? [],
          studyAreas: [],
          difficultyNotes: "",
          nextPracticePlan: [],
          referenceLevel: data.referenceLevel,
        },
        rankEvent,
      };
      saveSession(endedSession);
      await addConversationHistory(endedSession);
      setResult({
        grade: overallGrade,
        referenceLevel: data.referenceLevel,
        rankEvent,
      });
    } catch {
      setIsGrading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-cream-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (result) {
    return (
      <PlacementResult
        grade={result.grade}
        referenceLevel={result.referenceLevel}
        rankEvent={result.rankEvent}
        onComplete={() => router.push("/fr")}
        onViewReport={() => router.push("/results")}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-ink-900 pt-16">
      <header className="glass border-b border-ink-600 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push("/fr")}
          className="text-cream-500 hover:text-cream-300 transition-colors cursor-pointer text-lg"
        >
          ←
        </button>
        <div className="flex-1">
          <h1
            className="text-cream-100 font-medium"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            {isAdvancedPlacement
              ? "Advanced Placement Assessment"
              : "Placement Assessment"}
          </h1>
          <p className="text-cream-600 text-xs">
            French · {userTurns}/{requiredTurns} turns
          </p>
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
        {userTurns >= requiredTurns && (
          <button
            onClick={submitForAssessment}
            disabled={isGrading || isLoading}
            className="px-4 py-2 bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-ink-900 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isGrading ? "Assessing..." : "Submit →"}
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <div className="text-center">
          <span className="text-xs text-gold-600 bg-gold-800/20 border border-gold-800/30 rounded-full px-3 py-1">
            {isAdvancedPlacement
              ? "Advanced placement · Answer 6 upper-rank questions"
              : "Have a natural conversation · Submit when ready"}
          </span>
        </div>

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 rounded-xl text-base ${
                msg.role === "user"
                  ? "bg-ink-500 text-cream-200"
                  : "bg-ink-700 border border-ink-500 text-cream-300"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2">
            <div className="bg-ink-700 border border-ink-500 rounded-xl px-4 py-3 flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-cream-600 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="h-2" />
      </div>

      {userTurns >= requiredTurns && !isLoading && (
        <div className="px-4 pb-2 shrink-0">
          <button
            onClick={submitForAssessment}
            disabled={isGrading}
            className="w-full py-3 rounded-xl bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-ink-900 text-sm font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isGrading ? "Assessing your level..." : "Submit for Assessment →"}
          </button>
        </div>
      )}

      <div className="glass border-t border-ink-600 p-4 shrink-0">
        <div className="flex gap-2 items-end">
          <VoiceButton
            onTranscript={(text) => setInput((prev) => prev + text)}
            disabled={isLoading || isGrading}
            language="fr-FR"
          />
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply in French..."
            rows={1}
            disabled={isLoading || isGrading}
            className="flex-1 bg-ink-700 border border-ink-500 focus:border-vermillion-600 rounded-xl px-4 py-2.5 text-cream-100 placeholder-cream-600 resize-none transition-colors text-base leading-relaxed focus:outline-none disabled:opacity-50"
            style={{ maxHeight: "160px", minHeight: "52px" }}
            onInput={(e) => {
              const el = e.target as HTMLTextAreaElement;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 160) + "px";
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || isGrading}
            className="shrink-0 w-10 h-10 bg-vermillion-600 hover:bg-vermillion-500 disabled:bg-ink-600 disabled:cursor-not-allowed rounded-xl flex items-center justify-center text-cream-100 transition-all cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current rotate-90">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
