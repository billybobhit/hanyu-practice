"use client";

import { useEffect, useState } from "react";
import EloProgressAnimation from "@/components/EloProgressAnimation";
import type { RankEvent } from "@/lib/types";

type Phase = "analyzing" | "grade" | "elo" | "done";

const gradeColor: Record<string, string> = {
  A: "#EEC050",
  B: "#86efac",
  C: "#fde047",
  D: "#fb923c",
  F: "#F55040",
};

interface PlacementResultProps {
  grade: string;
  referenceLevel?: string;
  rankEvent: RankEvent;
  onComplete: () => void;
  onViewReport: () => void;
}

export default function PlacementResult({
  grade,
  referenceLevel,
  rankEvent,
  onComplete,
  onViewReport,
}: PlacementResultProps) {
  const [phase, setPhase] = useState<Phase>("analyzing");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("elo");
      return;
    }
    const t1 = setTimeout(() => setPhase("grade"), 1600);
    const t2 = setTimeout(() => setPhase("elo"), 4200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "elo") {
    return <EloProgressAnimation event={rankEvent} onComplete={() => setPhase("done")} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink-950/95 backdrop-blur-md">
      {/* Phase 1: Analyzing */}
      {phase === "analyzing" && (
        <div className="flex flex-col items-center gap-6 animate-fade-up">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-gold-500 animate-bounce"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
          <p
            className="text-cream-400 text-sm tracking-[0.2em] uppercase"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            Analyzing your responses...
          </p>
        </div>
      )}

      {/* Phase 2: Grade reveal */}
      {phase === "grade" && (
        <div className="flex flex-col items-center gap-6">
          <p className="text-cream-500 text-xs uppercase tracking-[0.2em] mb-2">Placement Result</p>
          <div
            className="text-[9rem] font-bold leading-none"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: gradeColor[grade] ?? "#EDE4D4",
              animation: "gradeDropIn 0.6s cubic-bezier(0.22,1,0.36,1) both, letterSlam 0.12s 0.55s ease-out both",
            }}
          >
            {grade}
          </div>
          {referenceLevel && (
            <p className="text-cream-400 text-sm text-center max-w-xs px-4 animate-fade-up">
              {referenceLevel}
            </p>
          )}
          <button
            onClick={() => setPhase("elo")}
            className="mt-4 cursor-pointer rounded-full bg-gold-600 px-6 py-2.5 text-sm font-bold text-ink-900 transition-all hover:bg-gold-500 animate-fade-up"
          >
            Continue →
          </button>
        </div>
      )}

      {/* Phase 4: Done — offer report or start practicing */}
      {phase === "done" && (
        <div className="flex flex-col items-center gap-6 animate-fade-up">
          <p
            className="text-cream-500 text-xs uppercase tracking-[0.2em]"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            Placement Complete
          </p>
          <div
            className="text-6xl font-bold leading-none"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: gradeColor[grade] ?? "#EDE4D4",
            }}
          >
            {grade}
          </div>
          <div className="flex gap-3 mt-2">
            <button
              onClick={onViewReport}
              className="cursor-pointer rounded-full bg-gold-600 px-6 py-2.5 text-sm font-bold text-ink-900 transition-all hover:bg-gold-500"
            >
              View Report
            </button>
            <button
              onClick={onComplete}
              className="cursor-pointer rounded-full border border-cream-600 px-6 py-2.5 text-sm font-medium text-cream-300 transition-all hover:border-cream-400 hover:text-cream-100"
            >
              Start Practicing →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
