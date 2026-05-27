"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GradeCard from "@/components/GradeCard";
import { createClient } from "@/lib/supabase/client";
import {
  getConversationHistory,
  deleteConversationHistoryEntry,
  type ConversationHistoryRow,
} from "@/lib/supabase/conversation-history";
import type { Message } from "@/lib/types";

const gradeColor: Record<string, string> = {
  A: "#EEC050",
  B: "#86efac",
  C: "#fde047",
  D: "#fb923c",
  F: "#F55040",
};

const languageName: Record<string, string> = {
  "zh-cn": "Simplified Chinese",
  "zh-tw": "Traditional Chinese",
  general: "Mandarin",
};

function shouldShowMessage(message: Message) {
  return !(
    message.role === "user" &&
    (message.content === "老师好，请开始我们的对话练习。" ||
      message.content === "Please begin our practice session.")
  );
}

function formatDownload(conv: ConversationHistoryRow): string {
  const lang = languageName[conv.language_code] ?? conv.language_code;
  const date = new Date(conv.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const grade = conv.grade?.overallGrade;
  const eloText =
    conv.elo_change !== null
      ? `ELO Change: ${conv.elo_change >= 0 ? "+" : ""}${conv.elo_change}`
      : "";
  const gradeText = grade ? `Grade: ${grade}` : "";
  const meta = [gradeText, eloText].filter(Boolean).join(" | ");

  let text = `[ZombieRunner Hanyu — Conversation History]\n`;
  text += `Language: ${lang}\n`;
  text += `Date: ${date}\n`;
  if (meta) text += `${meta}\n`;
  text += `\n`;

  const visible = conv.messages.filter(shouldShowMessage);
  for (const msg of visible) {
    text += `${msg.role === "assistant" ? "Tutor" : "You"}: ${msg.content}\n\n`;
  }

  return text;
}

function downloadConversation(conv: ConversationHistoryRow) {
  const text = formatDownload(conv);
  const date = new Date(conv.created_at)
    .toLocaleDateString("en-US")
    .replace(/\//g, "-");
  const filename = `hanyu-${conv.language_code}-${date}.txt`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HistoryPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [conversations, setConversations] = useState<ConversationHistoryRow[]>([]);
  const [selected, setSelected] = useState<ConversationHistoryRow | null>(null);

  const loadHistory = useCallback(
    async (sb: NonNullable<typeof supabase>, userId: string) => {
      console.log("[history] fetch:start", { userId });

      try {
        const rows = await getConversationHistory(sb, userId);
        console.log("[history] fetch:success", { count: rows.length });
        setConversations(rows);
        setSelected(rows[0] ?? null);
      } catch (error) {
        console.log("[history] fetch:failed-showing-empty", error);
        setConversations([]);
        setSelected(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadForCurrentSession = async () => {
      setLoading(true);

      try {
        console.log("[history] auth:session-check:start");
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        console.log("[history] auth:session-check:complete", {
          hasUser: Boolean(session?.user),
          userId: session?.user?.id ?? null,
        });

        if (!session?.user) {
          setAuthed(false);
          setConversations([]);
          setSelected(null);
          setLoading(false);
          return;
        }

        setAuthed(true);
        await loadHistory(supabase, session.user.id);
      } catch (error) {
        if (cancelled) return;
        console.log("[history] auth:session-check:failed", error);
        setAuthed(false);
        setConversations([]);
        setSelected(null);
        setLoading(false);
      }
    };

    void loadForCurrentSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (_event === "INITIAL_SESSION") return;

      console.log("[history] auth:event", {
        event: _event,
        hasUser: Boolean(session?.user),
        userId: session?.user?.id ?? null,
      });

      if (!session?.user) {
        setAuthed(false);
        setConversations([]);
        setSelected(null);
        setLoading(false);
        return;
      }

      setAuthed(true);
      setLoading(true);
      setConversations([]);
      setSelected(null);
      window.setTimeout(() => {
        if (!cancelled) void loadHistory(supabase, session.user.id);
      }, 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadHistory, supabase]);

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    await deleteConversationHistoryEntry(supabase, id);
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (selected?.id === id) setSelected(next[0] ?? null);
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-ink-900 pt-16">
      <header className="glass flex items-center justify-between border-b border-ink-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="cursor-pointer text-lg text-cream-500 transition-colors hover:text-cream-300"
            aria-label="Back to home"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-semibold text-cream-100">
              Conversation History
            </h1>
            <p className="text-xs text-cream-600">
              Review past grades and conversation transcripts.
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/")}
          className="cursor-pointer rounded-xl bg-vermillion-600 px-4 py-2 text-sm font-medium text-cream-100 transition-all hover:bg-vermillion-500"
        >
          Practice Again
        </button>
      </header>

      {/* Loading */}
      {loading && (
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-cream-500">Loading...</p>
        </div>
      )}

      {/* Not signed in */}
      {!loading && !authed && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-lg font-medium text-cream-300">
            Sign in to view your history
          </p>
          <p className="text-sm text-cream-500">
            Your conversation history is saved to your account.
          </p>
        </div>
      )}

      {/* History */}
      {!loading && authed && (
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,420px)_1fr]">
          {/* Left: list */}
          <section className="space-y-4">
            {conversations.length === 0 ? (
              <div className="rounded-2xl border border-ink-500 bg-ink-800 p-8 text-center">
                <p className="mb-1 font-medium text-cream-300">
                  No history yet
                </p>
                <p className="text-sm text-cream-400">
                  Completed sessions will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.map((conv, index) => {
                  const isSelected = selected?.id === conv.id;
                  const grade = conv.grade?.overallGrade;
                  const date = new Date(conv.created_at).toLocaleDateString(
                    "en-US"
                  );
                  const userMsgs = conv.messages.filter(
                    (m) => m.role === "user"
                  );
                  const lang =
                    languageName[conv.language_code] ?? conv.language_code;

                  return (
                    <div
                      key={conv.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected(conv)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(conv);
                        }
                      }}
                      className={`flex w-full cursor-pointer items-center gap-4 rounded-2xl border bg-ink-800 p-4 text-left transition-all animate-fade-up ${
                        isSelected
                          ? "border-vermillion-600"
                          : "border-ink-600 hover:border-ink-400"
                      }`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div
                        className="w-10 shrink-0 text-center text-3xl font-bold"
                        style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          color: grade
                            ? (gradeColor[grade] ?? "#EDE4D4")
                            : "#EDE4D4",
                        }}
                      >
                        {grade ?? "?"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-cream-200">
                          {conv.material_title ?? "Untitled"}
                        </p>
                        <p className="mt-0.5 text-xs text-cream-600">
                          {date} · {lang} · {userMsgs.length} turns ·{" "}
                          {conv.difficulty}
                          {conv.elo_change !== null && (
                            <span
                              className={
                                conv.elo_change >= 0
                                  ? "text-green-400"
                                  : "text-vermillion-400"
                              }
                            >
                              {" "}
                              · {conv.elo_change >= 0 ? "+" : ""}
                              {conv.elo_change} ELO
                            </span>
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDelete(conv.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleDelete(conv.id);
                          }
                        }}
                        className="shrink-0 cursor-pointer text-xs text-cream-600 transition-colors hover:text-vermillion-400"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Right: detail */}
          <section className="space-y-6">
            {selected?.grade ? (
              <>
                <div className="flex items-center justify-between">
                  <div />
                  <button
                    onClick={() => downloadConversation(selected)}
                    className="cursor-pointer rounded-xl border border-ink-500 bg-ink-700 px-4 py-2 text-sm font-medium text-cream-300 transition-all hover:border-ink-400 hover:bg-ink-600 hover:text-cream-100"
                  >
                    Download ↓
                  </button>
                </div>

                <GradeCard
                  grade={selected.grade}
                  materialTitle={selected.material_title ?? ""}
                  messageCount={
                    selected.messages.filter((m) => m.role === "user").length
                  }
                />

                <div>
                  <h2 className="mb-3 text-sm font-medium text-cream-400">
                    Conversation Review
                  </h2>
                  <div className="max-h-[520px] space-y-2 overflow-y-auto rounded-2xl border border-ink-600 bg-ink-800 p-4">
                    {selected.messages
                      .filter(shouldShowMessage)
                      .map((message, i) => (
                        <div
                          key={i}
                          className={`flex gap-2 ${
                            message.role === "user" ? "flex-row-reverse" : ""
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                              message.role === "user"
                                ? "bg-ink-500 text-cream-200"
                                : "border border-ink-500 bg-ink-700 text-cream-300"
                            }`}
                          >
                            {message.content}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            ) : selected ? (
              <div className="rounded-2xl border border-ink-500 bg-ink-800 p-8 text-center">
                <p className="font-medium text-cream-300">No grade available</p>
                <p className="mt-1 text-sm text-cream-500">
                  This session was not graded.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-ink-500 bg-ink-800 p-8 text-center">
                <p className="font-medium text-cream-300">
                  Select a completed session
                </p>
                <p className="mt-1 text-sm text-cream-500">
                  The grade report and full conversation will appear here.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
