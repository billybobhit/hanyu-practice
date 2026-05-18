"use client";

import type { Grade } from "@/lib/types";

interface GradeCardProps {
  grade: Grade;
  materialTitle: string;
  messageCount: number;
}

const gradeColors: Record<string, string> = {
  A: "text-gold-300",
  B: "text-green-400",
  C: "text-yellow-400",
  D: "text-orange-400",
  F: "text-vermillion-400",
};

const gradeLabel: Record<string, string> = {
  A: "优秀",
  B: "良好",
  C: "及格",
  D: "需改进",
  F: "不及格",
};

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-cream-300 text-sm">{label}</span>
        <span className={`font-semibold text-sm ${color}`}>{score}</span>
      </div>
      <div className="h-1.5 bg-ink-500 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, rgba(186,136,32,0.8), rgba(186,136,32,1))`,
          }}
        />
      </div>
    </div>
  );
}

export default function GradeCard({ grade, materialTitle, messageCount }: GradeCardProps) {
  const gradeColor = gradeColors[grade.overallGrade] || "text-cream-200";

  return (
    <div className="bg-ink-700 border border-ink-500 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-ink-800 border-b border-ink-600 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-cream-400 text-xs uppercase tracking-widest mb-0.5">学习材料</p>
          <h3 className="text-cream-100 font-medium truncate max-w-48">{materialTitle}</h3>
        </div>
        <div className="text-center">
          <div className={`text-6xl font-bold leading-none ${gradeColor}`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {grade.overallGrade}
          </div>
          <div className="text-cream-400 text-xs mt-1">{gradeLabel[grade.overallGrade]}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-5 space-y-4">
        <div className="flex gap-4 text-center">
          <div className="flex-1 bg-ink-800 rounded-xl py-3">
            <div className="text-gold-400 text-2xl font-bold">{grade.overallScore}</div>
            <div className="text-cream-500 text-xs">总分</div>
          </div>
          <div className="flex-1 bg-ink-800 rounded-xl py-3">
            <div className="text-gold-400 text-2xl font-bold">{messageCount}</div>
            <div className="text-cream-500 text-xs">对话轮次</div>
          </div>
        </div>

        <div className="space-y-3">
          <ScoreBar label="词汇准确度" score={grade.vocabularyScore} color={gradeColor} />
          <ScoreBar label="语法正确性" score={grade.grammarScore} color={gradeColor} />
          <ScoreBar label="理解深度" score={grade.comprehensionScore} color={gradeColor} />
        </div>

        {/* Feedback */}
        {grade.strengths.length > 0 && (
          <div>
            <h4 className="text-gold-500 text-xs uppercase tracking-widest mb-2">做得好 ✓</h4>
            <ul className="space-y-1">
              {grade.strengths.map((s, i) => (
                <li key={i} className="text-cream-300 text-sm flex gap-2">
                  <span className="text-gold-600 shrink-0">·</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {grade.improvements.length > 0 && (
          <div>
            <h4 className="text-vermillion-400 text-xs uppercase tracking-widest mb-2">需要改进 →</h4>
            <ul className="space-y-1">
              {grade.improvements.map((s, i) => (
                <li key={i} className="text-cream-300 text-sm flex gap-2">
                  <span className="text-vermillion-500 shrink-0">·</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {grade.studyAreas.length > 0 && (
          <div>
            <h4 className="text-ink-100 text-xs uppercase tracking-widest mb-2">建议学习</h4>
            <div className="flex flex-wrap gap-2">
              {grade.studyAreas.map((area, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-ink-600 border border-ink-400 rounded-full text-cream-300 text-xs"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
