"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import ChatBubble, { TypingIndicator } from "@/components/ChatBubble";
import VoiceButton from "@/components/VoiceButton";
import { getSession, saveSession, getCurrentSessionId } from "@/lib/storage";
import type { Message, Session } from "@/lib/types";

export default function PracticePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pinyinMode, setPinyinMode] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

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
      utterance.lang = "zh-CN";
      utterance.rate = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const zhVoice = voices.find(
        (v) => v.lang.includes("zh") && (v.lang.includes("CN") || v.lang.includes("TW"))
      );
      if (zhVoice) utterance.voice = zhVoice;
      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    []
  );

  const sendFirstMessage = async (s: Session) => {
    const messages: Message[] = [
      {
        role: "user",
        content: "老师好，请开始我们的对话练习。",
        timestamp: Date.now(),
      },
    ];
    await streamAssistant(s, messages);
  };

  const streamAssistant = useCallback(
    async (currentSession: Session, messages: Message[]) => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            material: currentSession.materialContent,
            pinyinMode,
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
    [pinyinMode, autoSpeak, speakText]
  );

  const sendMessage = useCallback(async () => {
    if (!session || !input.trim() || isLoading) return;

    const userMsg: Message = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    const messages = [...session.messages, userMsg];
    const updated = { ...session, messages };
    setSession(updated);
    saveSession(updated);
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
      router.push("/results");
      return;
    }

    setIsGrading(true);
    try {
      const response = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: session.messages,
          material: session.materialContent,
        }),
      });

      const grade = await response.json();
      const endedSession = {
        ...session,
        endTime: Date.now(),
        grade,
      };
      saveSession(endedSession);
      router.push("/results");
    } catch {
      const endedSession = { ...session, endTime: Date.now() };
      saveSession(endedSession);
      router.push("/results");
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-cream-500 text-sm">加载中...</div>
      </div>
    );
  }

  const userMessages = session.messages.filter((m) => m.role === "user");

  return (
    <div className="h-screen flex flex-col bg-ink-900">
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
          <p className="text-cream-600 text-xs">{userMessages.length} 轮对话</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPinyinMode((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              pinyinMode
                ? "bg-gold-700 text-gold-200"
                : "bg-ink-600 text-cream-400 hover:text-cream-200"
            }`}
            title="拼音模式"
          >
            拼
          </button>

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
            title="自动朗读"
          >
            🔊
          </button>

          <button
            onClick={endSession}
            disabled={isGrading}
            className="px-3 py-1.5 bg-ink-600 hover:bg-ink-500 disabled:opacity-50 text-cream-300 hover:text-cream-100 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isGrading ? "评分中..." : "结束"}
          </button>
        </div>
      </header>

      {/* Chat messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {pinyinMode && (
          <div className="text-center">
            <span className="text-xs text-gold-600 bg-gold-800/20 border border-gold-800/30 rounded-full px-3 py-1">
              拼音模式已开启 — AI会在回复中包含拼音
            </span>
          </div>
        )}

        {session.messages
          .filter((m) => !(m.role === "user" && m.content === "老师好，请开始我们的对话练习。"))
          .map((msg) => (
            <ChatBubble
              key={msg.timestamp}
              message={msg}
              pinyinMode={pinyinMode}
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
            <p className="text-vermillion-300 text-sm font-medium">API 错误</p>
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

      {/* Input area */}
      <div className="glass border-t border-ink-600 p-4 shrink-0">
        <div className="flex gap-2 items-end">
          <VoiceButton
            onTranscript={(text) => setInput((prev) => prev + text)}
            disabled={isLoading}
          />

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="用中文输入... (Enter 发送, Shift+Enter 换行)"
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
    </div>
  );
}
