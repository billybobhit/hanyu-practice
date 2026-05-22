"use client";

import { useEffect, useState } from "react";
import RankBadge from "@/components/RankBadge";

type Phase = "analyzing" | "grade" | "rank" | "hold";

const gradeColor: Record<string, string> = {
  A: "#EEC050",
  B: "#86efac",
  C: "#fde047",
  D: "#fb923c",
  F: "#F55040",
};

interface PlacementResultProps {
  grade: string;
  startingElo: number;
  rankName: string;
  referenceLevel?: string;
  onComplete: () => void;
}

export default function PlacementResult({
  grade,
  startingElo,
  rankName,
  referenceLevel,
  onComplete,
}: PlacementResultProps) {
  const [phase, setPhase] = useState<Phase>("analyzing");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("hold");
      return;
    }
    const t1 = setTimeout(() => setPhase("grade"), 1800);
    const t2 = setTimeout(() => setPhase("rank"), 3800);
    const t3 = setTimeout(() => setPhase("hold"), 6300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

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
      {(phase === "grade" || phase === "rank" || phase === "hold") && (
        <div className="flex flex-col items-center gap-6">
          <p className="text-cream-500 text-xs uppercase tracking-[0.2em] mb-2">Placement Result</p>
          <div
            className="text-[9rem] font-bold leading-none"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: gradeColor[grade] ?? "#EDE4D4",
              animation: phase === "grade" ? "gradeDropIn 0.6s cubic-bezier(0.22,1,0.36,1) both, letterSlam 0.12s 0.55s ease-out both" : "none",
            }}
          >
            {grade}
          </div>
          {referenceLevel && (
            <p className="text-cream-400 text-sm text-center max-w-xs px-4 animate-fade-up">
              {referenceLevel}
            </p>
          )}
        </div>
      )}

      {/* Phase 3: Rank reveal */}
      {(phase === "rank" || phase === "hold") && (
        <div className="flex flex-col items-center gap-4 mt-10 animate-fade-up">
          <p className="text-cream-500 text-xs uppercase tracking-[0.2em]">Your Starting Rank</p>
          <RankBadge elo={startingElo} size="lg" />
          <p
            className="text-2xl font-semibold text-cream-100"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {rankName}
          </p>
          <p className="text-cream-600 text-xs">{startingElo} ELO</p>
        </div>
      )}

      {/* Hold: CTA */}
      {phase === "hold" && (
        <button
          onClick={onComplete}
          className="mt-10 cursor-pointer rounded-full bg-gold-600 px-8 py-3.5 text-sm font-bold text-ink-900 shadow-[0_0_18px_rgba(238,192,80,0.4)] transition-all hover:bg-gold-500 hover:shadow-[0_0_28px_rgba(238,192,80,0.6)] animate-fade-up"
        >
          Begin Practicing →
        </button>
      )}

      {/* Skip */}
      {phase !== "hold" && (
        <button
          onClick={() => setPhase("hold")}
          className="absolute bottom-8 right-8 text-cream-700 hover:text-cream-500 text-xs cursor-pointer transition-colors"
        >
          Skip
        </button>
      )}
    </div>
  );
}
