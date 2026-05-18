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
  if (mins < 1) return "< 1 分钟";
  return `${mins} 分钟`;
}

export default function ResultsPage() {
  const router = useRouter();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [tab, setTab] = useState<"current" | "history">("current");
  const [showReveal, setShowReveal] = useState(false);

  useEffect(() => {
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
    <div className="min-h-screen">
      {showReveal && currentSession?.grade && (
        <GradeReveal
          grade={currentSession.grade.overallGrade}
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
            学习报告
          </h1>
        </div>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-vermillion-600 hover:bg-vermillion-500 text-cream-100 rounded-xl text-sm font-medium transition-all cursor-pointer"
        >
          再次练习
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-ink-800 rounded-xl p-1">
          {[
            { key: "current" as const, label: "本次成绩" },
            { key: "history" as const, label: `历史记录 (${summaries.length})` },
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
                    <p className="text-cream-500 text-xs mt-1">用户回复</p>
                  </div>
                  <div className="bg-ink-800 border border-ink-600 rounded-xl p-4 text-center">
                    <p className="text-gold-400 text-xl font-bold">
                      {currentSession.endTime
                        ? formatDuration(currentSession.startTime, currentSession.endTime)
                        : "—"}
                    </p>
                    <p className="text-cream-500 text-xs mt-1">练习时长</p>
                  </div>
                </div>

                {/* Conversation preview */}
                <div>
                  <h3 className="text-cream-400 text-sm font-medium mb-3">对话回顾</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {currentSession.messages
                      .filter(
                        (m) =>
                          !(
                            m.role === "user" &&
                            m.content === "老师好，请开始我们的对话练习。"
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
                <p className="text-cream-300 font-medium mb-2">本次练习未评分</p>
                <p className="text-cream-500 text-sm">
                  需要至少 3 轮对话才能生成评分报告
                </p>
                <button
                  onClick={() => {
                    router.push("/practice");
                  }}
                  className="mt-4 px-6 py-2 bg-vermillion-600 hover:bg-vermillion-500 text-cream-100 rounded-xl text-sm transition-all cursor-pointer"
                >
                  继续练习
                </button>
              </div>
            ) : (
              <div className="bg-ink-800 border border-ink-500 rounded-2xl p-8 text-center">
                <p className="text-5xl mb-4">🎋</p>
                <p className="text-cream-300 font-medium">尚无练习记录</p>
                <p className="text-cream-500 text-sm mt-1">上传材料开始你的第一次练习</p>
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
                <h3 className="text-cream-300 text-sm font-medium mb-4">总分趋势</h3>
                <ProgressChart summaries={summaries} />
              </div>
            )}

            {/* Session list */}
            {summaries.length === 0 ? (
              <div className="bg-ink-800 border border-ink-500 rounded-2xl p-8 text-center">
                <p className="text-4xl mb-3">📚</p>
                <p className="text-cream-400 text-sm">完成练习后历史记录将显示在这里</p>
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
                        {new Date(s.startTime).toLocaleDateString("zh-CN")} ·{" "}
                        {s.messageCount} 轮 · {s.overallScore} 分
                      </p>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-cream-600 hover:text-vermillion-400 transition-colors cursor-pointer text-xs shrink-0"
                      title="删除记录"
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
