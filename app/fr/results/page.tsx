"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GradeCard from "@/components/GradeCard";
import GradeReveal from "@/components/GradeReveal";
import EloProgressAnimation from "@/components/EloProgressAnimation";
import EloChangeSummary from "@/components/EloChangeSummary";
import RankProgress from "@/components/RankProgress";
import {
  getCurrentSessionId,
  getSession,
} from "@/lib/storage";
import { applyEloChange } from "@/lib/ranks";
import type { Session } from "@/lib/types";

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
  const [showReveal, setShowReveal] = useState(false);
  const [showEloAnim, setShowEloAnim] = useState(false);

  useEffect(() => {
    // Dev preview mode: /results?preview=A
    const params = new URLSearchParams(window.location.search);
    const preview = params.get("preview")?.toUpperCase();
    const validGrades = ["A", "B", "C", "D", "F"];
    if (preview && validGrades.includes(preview)) {
      const scoreMap: Record<string, number> = { A: 95, B: 83, C: 74, D: 63, F: 42 };
      const score = scoreMap[preview] ?? 75;
      const grade = preview as "A" | "B" | "C" | "D" | "F";
      const rankEvent = applyEloChange(0, grade, score);
      setCurrentSession({
        id: "dev-preview",
        materialTitle: "Dev Preview",
        materialContent: "",
        difficulty: "hard",
        messages: [],
        startTime: Date.now(),
        endTime: Date.now(),
        grade: {
          overallGrade: grade,
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
        rankEvent,
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

  }, []);

  return (
    <div className="min-h-screen pt-16">
      {showReveal && currentSession?.grade && (
        <GradeReveal
          grade={currentSession.grade.overallGrade}
          gradeData={currentSession.grade}
          onComplete={() => {
            setShowReveal(false);
            if (currentSession.rankEvent) setShowEloAnim(true);
          }}
        />
      )}
      {showEloAnim && currentSession?.rankEvent && (
        <EloProgressAnimation
          event={currentSession.rankEvent}
          onComplete={() => setShowEloAnim(false)}
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

                {currentSession.grade.referenceLevel && (
                  <div className="rounded-2xl border border-ink-600 bg-ink-800 px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-gold-500 mb-1">Performance Level</p>
                    <p className="text-cream-200 text-sm">{currentSession.grade.referenceLevel}</p>
                  </div>
                )}
                {currentSession.grade.rankFeedback && (
                  <div className="rounded-2xl border border-ink-600 bg-ink-800 px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-vermillion-500 mb-1">To Improve</p>
                    <p className="text-cream-300 text-sm">{currentSession.grade.rankFeedback}</p>
                  </div>
                )}

                <EloChangeSummary event={currentSession.rankEvent} />
                {currentSession.rankEvent && (
                  <RankProgress elo={currentSession.rankEvent.eloAfter} compact />
                )}

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
                    router.push("/fr/practice");
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
      </div>
    </div>
  );
}
