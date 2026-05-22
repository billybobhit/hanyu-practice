"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PlacementResult from "@/components/PlacementResult";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface PlacementGradeResult {
  grade: string;
  startingElo: number;
  rankName: string;
  referenceLevel?: string;
}

export default function ZhCnPlacementPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [result, setResult] = useState<PlacementGradeResult | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userTurns = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    async function init() {
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

      const { data } = await supabase
        .from("user_language_elo")
        .select("has_completed_placement")
        .eq("user_id", user.id)
        .eq("language_code", "zh-cn")
        .maybeSingle();

      if (data?.has_completed_placement) {
        router.replace("/zh-cn");
        return;
      }

      setChecking(false);
      startPlacement();
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, [messages]);

  const streamAssistant = useCallback(async (history: Message[]) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) return;

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let text = "";

      const placeholder: Message = { role: "assistant", content: "" };
      setMessages((prev) => [...prev, placeholder]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: text };
          return next;
        });
      }
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, []);

  function startPlacement() {
    streamAssistant([]);
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
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
        body: JSON.stringify({ messages, languageCode: "zh-cn" }),
      });
      const data = await res.json();
      setResult({
        grade: data.overallGrade ?? "C",
        startingElo: data.startingElo ?? 0,
        rankName: data.rankName ?? "Noob",
        referenceLevel: data.referenceLevel,
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
        startingElo={result.startingElo}
        rankName={result.rankName}
        referenceLevel={result.referenceLevel}
        onComplete={() => router.push("/zh-cn")}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-ink-900 pt-16">
      <header className="glass border-b border-ink-600 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push("/zh-cn")}
          className="text-cream-500 hover:text-cream-300 transition-colors cursor-pointer text-lg"
        >
          ←
        </button>
        <div className="flex-1">
          <h1
            className="text-cream-100 font-medium"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            Placement Assessment
          </h1>
          <p className="text-cream-600 text-xs">Simplified Chinese · {userTurns} turns</p>
        </div>
        {userTurns >= 4 && (
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
            Have a natural conversation · Submit when ready
          </span>
        </div>

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
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

      {userTurns >= 4 && !isLoading && (
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
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply in Chinese..."
            rows={1}
            disabled={isLoading || isGrading}
            className="flex-1 bg-ink-700 border border-ink-500 focus:border-vermillion-600 rounded-xl px-4 py-2.5 text-cream-100 placeholder-cream-600 resize-none transition-colors text-sm leading-relaxed focus:outline-none disabled:opacity-50"
            style={{ maxHeight: "120px", minHeight: "42px" }}
            onInput={(e) => {
              const el = e.target as HTMLTextAreaElement;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
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
