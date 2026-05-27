"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GradeCard from "@/components/GradeCard";
import RankProgress from "@/components/RankProgress";
import {
  deleteSession,
  getSession,
  getSessionSummaries,
  getUserProgress,
  setStorageUserId,
} from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import {
  deleteSessionFromCloud,
  syncSessionsWithCloud,
} from "@/lib/supabase/session-sync";
import type { Message, Session, SessionSummary } from "@/lib/types";

const gradeColor: Record<string, string> = {
  A: "#EEC050",
  B: "#86efac",
  C: "#fde047",
  D: "#fb923c",
  F: "#F55040",
};

function shouldShowMessage(message: Message) {
  return !(
    message.role === "user" &&
    (message.content === "老师好，请开始我们的对话练习。" ||
      message.content === "Please begin our practice session.")
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [currentElo, setCurrentElo] = useState(0);
  const [syncStatus, setSyncStatus] = useState<
    "local" | "syncing" | "synced" | "unavailable"
  >("local");

  const refreshHistory = useCallback((selectedId?: string) => {
    const nextSummaries = getSessionSummaries();
    setSummaries(nextSummaries);
    setCurrentElo(getUserProgress().currentElo);

    const id = selectedId ?? nextSummaries[0]?.id;
    setSelectedSession(id ? getSession(id) : null);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setStorageUserId("guest");
      queueMicrotask(() => {
        refreshHistory();
        setSyncStatus("unavailable");
      });
      return;
    }

    let cancelled = false;

    const loadAccountHistory = async (userId: string | null) => {
      setStorageUserId(userId ?? "guest");
      setSelectedSession(null);

      if (!userId) {
        setSyncStatus("local");
        refreshHistory();
        return;
      }

      setSyncStatus("syncing");
      const result = await syncSessionsWithCloud(supabase);
      if (cancelled) return;
      setSyncStatus(result.synced ? "synced" : "unavailable");
      refreshHistory();
    };

    void supabase.auth
      .getUser()
      .then(({ data }) => loadAccountHistory(data.user?.id ?? null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadAccountHistory(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [refreshHistory, supabase]);

  const handleSelect = (id: string) => {
    setSelectedSession(getSession(id));
  };

  const handleDelete = async (id: string) => {
    deleteSession(id);
    await deleteSessionFromCloud(id);
    refreshHistory(selectedSession?.id === id ? undefined : selectedSession?.id);
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
            <p className="mt-1 text-[11px] text-cream-600">
              {syncStatus === "syncing"
                ? "Syncing..."
                : syncStatus === "synced"
                  ? "Synced to your account"
                  : "Stored on this browser"}
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

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,420px)_1fr]">
        <section className="space-y-4">
          <RankProgress elo={currentElo} compact />

          {summaries.length === 0 ? (
            <div className="rounded-2xl border border-ink-500 bg-ink-800 p-8 text-center">
              <p className="text-sm text-cream-400">
                Completed sessions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {summaries.map((summary, index) => {
                const selected = selectedSession?.id === summary.id;

                return (
                  <div
                    key={summary.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelect(summary.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSelect(summary.id);
                      }
                    }}
                    className={`flex w-full cursor-pointer items-center gap-4 rounded-2xl border bg-ink-800 p-4 text-left transition-all animate-fade-up ${
                      selected
                        ? "border-vermillion-600"
                        : "border-ink-600 hover:border-ink-400"
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div
                      className="w-10 shrink-0 text-center text-3xl font-bold"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        color: gradeColor[summary.overallGrade] || "#EDE4D4",
                      }}
                    >
                      {summary.overallGrade}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-cream-200">
                        {summary.materialTitle}
                      </p>
                      <p className="mt-0.5 text-xs text-cream-600">
                        {new Date(summary.startTime).toLocaleDateString(
                          "en-US"
                        )}{" "}
                        · {summary.messageCount} turns · {summary.overallScore}{" "}
                        pts · {summary.difficulty}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(summary.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          handleDelete(summary.id);
                        }
                      }}
                      className="shrink-0 cursor-pointer text-xs text-cream-600 transition-colors hover:text-vermillion-400"
                      title="Delete session"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-6">
          {selectedSession?.grade ? (
            <>
              <GradeCard
                grade={selectedSession.grade}
                materialTitle={selectedSession.materialTitle}
                messageCount={
                  selectedSession.messages.filter((m) => m.role === "user")
                    .length
                }
              />

              <div>
                <h2 className="mb-3 text-sm font-medium text-cream-400">
                  Conversation Review
                </h2>
                <div className="max-h-[520px] space-y-2 overflow-y-auto rounded-2xl border border-ink-600 bg-ink-800 p-4">
                  {selectedSession.messages
                    .filter(shouldShowMessage)
                    .map((message) => (
                      <div
                        key={message.timestamp}
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
    </main>
  );
}
