"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GradeCard from "@/components/GradeCard";
import GradeReveal from "@/components/GradeReveal";
import ProgressChart from "@/components/ProgressChart";
import {
  getCurrentSessionId,
  getSession,
  getSessionSummaries,
  deleteSession,
} from "@/lib/storage";
import type { Session, SessionSummary } from "@/lib/types";

const gradeColor: Record<string, string> = {
  A: "#EEC050",
  B: "#86efac",
  C: "#fde047",
  D: "#fb923c",
  F: "#F55040",
};

function formatDuration(start: number, end: number) {
  const mins = Math.floor((end - start) / 60000);
  if (mins < 1) return "< 1 min";
  return `${mins} min`;
}

export default function ResultsPage() {
  const router = useRouter();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [tab, setTab] = useState<"current" | "history">("current");
  const [showReveal, setShowReveal] = useState(false);

  useEffect(() => {
    // Dev preview mode: /results?preview=A
    const params = new URLSearchParams(window.location.search);
    const preview = params.get("preview")?.toUpperCase();
    const validGrades = ["A", "B", "C", "D", "F"];
    if (preview && validGrades.includes(preview)) {
      const scoreMap: Record<string, number> = { A: 95, B: 83, C: 74, D: 63, F: 42 };
      const score = scoreMap[preview] ?? 75;
      setCurrentSession({
        id: "dev-preview",
        materialTitle: "Dev Preview",
        materialContent: "",
        difficulty: "hard",
        messages: [],
        startTime: Date.now(),
        endTime: Date.now(),
        grade: {
          overallGrade: preview as "A" | "B" | "C" | "D" | "F",
          overallScore: score,
          vocabularyScore: score,
          grammarScore: score,
          comprehensionScore: score,
          strengths: ["Dev preview mode"],
          improvements: ["Dev preview mode"],
          studyAreas: ["Dev preview mode"],
          difficultyNotes: "Dev preview mode.",
          nextPracticePlan: ["Review the animation preview."],
        },
      });
      setShowReveal(true);
      return;
    }

    const fresh = sessionStorage.getItem("hanyu_fresh_grade");
    if (fresh) sessionStorage.removeItem("hanyu_fresh_grade");

    const id = getCurrentSessionId();
    if (id) {
      const s = getSession(id);
      setCurrentSession(s);
      if (s?.grade && fresh) setShowReveal(true);
    }
    setSummaries(getSessionSummaries());
  }, []);

  const handleDelete = (id: string) => {
    deleteSession(id);
    setSummaries(getSessionSummaries());
    if (currentSession?.id === id) setCurrentSession(null);
  };

  return (
    <div className="min-h-screen pt-16">
      {showReveal && currentSession?.grade && (
        <GradeReveal
          grade={currentSession.grade.overallGrade}
          gradeData={currentSession.grade}
          onComplete={() => setShowReveal(false)}
        />
      )}
      {/* Header */}
      <header className="glass border-b border-ink-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="text-cream-500 hover:text-cream-300 transition-colors cursor-pointer text-lg"
          >
            ←
          </button>
          <h1
            className="text-cream-100 font-semibold text-lg"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            Practice Report
          </h1>
        </div>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-vermillion-600 hover:bg-vermillion-500 text-cream-100 rounded-xl text-sm font-medium transition-all cursor-pointer"
        >
          Practice Again
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-ink-800 rounded-xl p-1">
          {[
            { key: "current" as const, label: "Current Score" },
            { key: "history" as const, label: `History (${summaries.length})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                tab === t.key
                  ? "bg-ink-500 text-cream-100 shadow-sm"
                  : "text-cream-400 hover:text-cream-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Current session tab */}
        {tab === "current" && (
          <div className="animate-fade-up space-y-6">
            {currentSession?.grade ? (
              <>
                <GradeCard
                  grade={currentSession.grade}
                  materialTitle={currentSession.materialTitle}
                  messageCount={
                    currentSession.messages.filter((m) => m.role === "user").length
                  }
                />

                {/* Session meta */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-ink-800 border border-ink-600 rounded-xl p-4 text-center">
                    <p className="text-gold-400 text-xl font-bold">
                      {currentSession.messages.filter((m) => m.role === "user").length}
                    </p>
                    <p className="text-cream-500 text-xs mt-1">Your Replies</p>
                  </div>
                  <div className="bg-ink-800 border border-ink-600 rounded-xl p-4 text-center">
                    <p className="text-gold-400 text-xl font-bold">
                      {currentSession.endTime
                        ? formatDuration(currentSession.startTime, currentSession.endTime)
                        : "—"}
                    </p>
                    <p className="text-cream-500 text-xs mt-1">Practice Time</p>
                  </div>
                  <div className="bg-ink-800 border border-ink-600 rounded-xl p-4 text-center col-span-2">
                    <p className="text-gold-400 text-xl font-bold capitalize">
                      {currentSession.difficulty ?? "hard"}
                    </p>
                    <p className="text-cream-500 text-xs mt-1">Difficulty</p>
                  </div>
                </div>

                {/* Conversation preview */}
                <div>
                  <h3 className="text-cream-400 text-sm font-medium mb-3">Conversation Review</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {currentSession.messages
                      .filter(
                        (m) =>
                          !(
                            m.role === "user" &&
                            m.content === "老师好，请开始我们的对话练习。" ||
                            m.content === "Please begin our practice session."
                          )
                      )
                      .map((msg) => (
                        <div
                          key={msg.timestamp}
                          className={`flex gap-2 ${
                            msg.role === "user" ? "flex-row-reverse" : ""
                          }`}
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
                  </div>
                </div>
              </>
            ) : currentSession ? (
              <div className="bg-ink-800 border border-ink-500 rounded-2xl p-8 text-center">
                <p className="text-5xl mb-4">📝</p>
                <p className="text-cream-300 font-medium mb-2">This session has not been graded</p>
                <p className="text-cream-500 text-sm">
                  You need at least 3 conversation turns to generate a report.
                </p>
                <button
                  onClick={() => {
                    router.push("/zh-cn/practice");
                  }}
                  className="mt-4 px-6 py-2 bg-vermillion-600 hover:bg-vermillion-500 text-cream-100 rounded-xl text-sm transition-all cursor-pointer"
                >
                  Continue Practice
                </button>
              </div>
            ) : (
              <div className="bg-ink-800 border border-ink-500 rounded-2xl p-8 text-center">
                <p className="text-5xl mb-4">🎋</p>
                <p className="text-cream-300 font-medium">No practice history yet</p>
                <p className="text-cream-500 text-sm mt-1">Upload material to begin your first session.</p>
              </div>
            )}
          </div>
        )}

        {/* History tab */}
        {tab === "history" && (
          <div className="animate-fade-up space-y-4">
            {/* Progress chart */}
            {summaries.length >= 2 && (
              <div className="bg-ink-800 border border-ink-600 rounded-2xl p-5">
                <h3 className="text-cream-300 text-sm font-medium mb-4">Score Trend</h3>
                <ProgressChart summaries={summaries} />
              </div>
            )}

            {/* Session list */}
            {summaries.length === 0 ? (
              <div className="bg-ink-800 border border-ink-500 rounded-2xl p-8 text-center">
                <p className="text-4xl mb-3">📚</p>
                <p className="text-cream-400 text-sm">Completed sessions will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {summaries.map((s, i) => (
                  <div
                    key={s.id}
                    className="bg-ink-800 border border-ink-600 rounded-2xl p-4 flex items-center gap-4 animate-fade-up"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    {/* Grade */}
                    <div
                      className="text-3xl font-bold shrink-0 w-10 text-center"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        color: gradeColor[s.overallGrade] || "#EDE4D4",
                      }}
                    >
                      {s.overallGrade}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-cream-200 text-sm font-medium truncate">
                        {s.materialTitle}
                      </p>
                      <p className="text-cream-600 text-xs mt-0.5">
                        {new Date(s.startTime).toLocaleDateString("en-US")} ·{" "}
                        {s.messageCount} turns · {s.overallScore} pts · {s.difficulty}
                      </p>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-cream-600 hover:text-vermillion-400 transition-colors cursor-pointer text-xs shrink-0"
                      title="Delete session"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
