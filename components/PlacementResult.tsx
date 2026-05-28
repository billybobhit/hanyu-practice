"use client";

import { useEffect, useState } from "react";
import EloProgressAnimation from "@/components/EloProgressAnimation";
import type { RankEvent } from "@/lib/types";

type Phase = "analyzing" | "blackout" | "flash" | "grade" | "elo" | "done";

const gradeColor: Record<string, string> = {
  A: "#EEC050",
  B: "#86efac",
  C: "#fde047",
  D: "#fb923c",
  F: "#F55040",
};

const gradeGlow: Record<string, string> = {
  A: "rgba(238,192,80,0.7)",
  B: "rgba(134,239,172,0.7)",
  C: "rgba(253,224,71,0.6)",
  D: "rgba(251,146,60,0.65)",
  F: "rgba(245,80,64,0.7)",
};

function Particles({ color }: { color: string }) {
  const items = Array.from({ length: 22 }, (_, i) => {
    const angle = (i / 22) * 2 * Math.PI;
    const dist = 160 + (i % 4) * 35;
    return {
      tx: Math.round(Math.cos(angle) * dist),
      ty: Math.round(Math.sin(angle) * dist),
      size: 4 + (i % 3) * 2,
      delay: (i % 6) * 0.05,
    };
  });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
      {items.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 ${p.size * 3}px ${color}`,
            ["--tx" as string]: `${p.tx}px`,
            ["--ty" as string]: `${p.ty}px`,
            animation: `particleOut 1.1s ${p.delay}s ease-out both`,
          }}
        />
      ))}
    </div>
  );
}

interface PlacementResultProps {
  grade: string;
  referenceLevel?: string;
  rankEvent: RankEvent;
  advancedPlacementLabel?: string;
  onAdvancedPlacement?: () => void;
  onComplete: () => void;
  onViewReport: () => void;
}

export default function PlacementResult({
  grade,
  referenceLevel,
  rankEvent,
  advancedPlacementLabel,
  onAdvancedPlacement,
  onComplete,
  onViewReport,
}: PlacementResultProps) {
  const [phase, setPhase] = useState<Phase>("analyzing");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("grade");
      return;
    }
    const t1 = setTimeout(() => setPhase("blackout"), 1400);
    const t2 = setTimeout(() => setPhase("flash"), 1700);
    const t3 = setTimeout(() => setPhase("grade"), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const color = gradeColor[grade] ?? "#EDE4D4";
  const glow = gradeGlow[grade] ?? "rgba(237,228,212,0.5)";

  if (phase === "elo") {
    return <EloProgressAnimation event={rankEvent} onComplete={() => setPhase("done")} />;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: phase === "blackout" || phase === "flash"
          ? "#000"
          : "radial-gradient(ellipse at center, rgba(10,10,20,0.98) 0%, #060A14 100%)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* White flash */}
      {phase === "flash" && (
        <div
          className="absolute inset-0 bg-white pointer-events-none"
          style={{ animation: "whiteFlash 0.3s ease-out forwards", zIndex: 20 }}
        />
      )}

      {/* Analyzing */}
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
          <p className="text-cream-400 text-sm tracking-[0.2em] uppercase" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            Analyzing your responses...
          </p>
        </div>
      )}

      {/* Grade reveal */}
      {phase === "grade" && (
        <div className="relative flex flex-col items-center gap-4">
          <Particles color={color} />
          <p
            className="text-cream-500 text-xs uppercase tracking-[0.2em] z-10"
            style={{ animation: "fadeInUp 0.5s 0.8s ease-out both", opacity: 0 }}
          >
            Placement Grade
          </p>
          <div
            className="relative z-10 font-bold leading-none select-none"
            style={{
              fontSize: "clamp(8rem,26vw,14rem)",
              fontFamily: "'Cormorant Garamond', serif",
              color,
              textShadow: `0 0 40px ${glow}, 0 0 90px ${glow}`,
              animation: "gradeDropIn 0.75s cubic-bezier(0.22,1,0.36,1) forwards, colorPulse 2s 0.8s ease-in-out infinite",
            }}
          >
            {grade}
          </div>
          {referenceLevel && (
            <p
              className="text-cream-400 text-sm text-center max-w-xs px-4 z-10"
              style={{ animation: "fadeInUp 0.6s 1s ease-out both", opacity: 0 }}
            >
              {referenceLevel}
            </p>
          )}
          <button
            onClick={() => setPhase("elo")}
            className="mt-4 cursor-pointer rounded-full bg-gold-600 px-6 py-2.5 text-sm font-bold text-ink-900 transition-all hover:bg-gold-500 z-10"
            style={{ animation: "fadeInUp 0.6s 1.2s ease-out both", opacity: 0 }}
          >
            Continue →
          </button>
        </div>
      )}

      {/* Done */}
      {phase === "done" && (
        <div className="flex flex-col items-center gap-6 animate-fade-up">
          <p className="text-cream-500 text-xs uppercase tracking-[0.2em]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            Placement Complete
          </p>
          <div
            className="font-bold leading-none"
            style={{
              fontSize: "clamp(5rem,14vw,8rem)",
              fontFamily: "'Cormorant Garamond', serif",
              color,
              textShadow: `0 0 30px ${glow}`,
            }}
          >
            {grade}
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {advancedPlacementLabel && onAdvancedPlacement && (
              <button
                onClick={onAdvancedPlacement}
                className="cursor-pointer rounded-full bg-vermillion-600 px-6 py-2.5 text-sm font-bold text-cream-100 transition-all hover:bg-vermillion-500"
              >
                {advancedPlacementLabel}
              </button>
            )}
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
