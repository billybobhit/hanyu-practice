"use client";

import { useEffect, useState, useCallback } from "react";

type Phase = "blackout" | "grade" | "character" | "exit";

const GRADE_DATA = {
  A: {
    emoji: "🐒",
    chinese: "孫悟空",
    english: "Sun Wukong",
    color: "#EEC050",
    glow: "rgba(238,192,80,0.55)",
    bg: "radial-gradient(ellipse at center, rgba(238,192,80,0.06) 0%, #000 65%)",
    flavor: "天命之人！你的智慧如齊天大聖。",
    sub: "Chosen by Heaven! Your wisdom rivals the Great Sage.",
  },
  B: {
    emoji: "👑",
    chinese: "秦始皇",
    english: "Qin Shi Huang",
    color: "#86efac",
    glow: "rgba(134,239,172,0.55)",
    bg: "radial-gradient(ellipse at center, rgba(134,239,172,0.06) 0%, #000 65%)",
    flavor: "統一之才！秦始皇之魄力。",
    sub: "Unifying talent! The spirit of the First Emperor.",
  },
  C: {
    emoji: "⚔️",
    chinese: "帝國士兵",
    english: "Imperial Soldier",
    color: "#9ca3af",
    glow: "rgba(156,163,175,0.55)",
    bg: "radial-gradient(ellipse at center, rgba(156,163,175,0.06) 0%, #000 65%)",
    flavor: "忠誠的士兵，繼續訓練。",
    sub: "Loyal soldier, keep training.",
  },
  D: {
    emoji: "🌾",
    chinese: "農民",
    english: "Peasant",
    color: "#d97706",
    glow: "rgba(217,119,6,0.55)",
    bg: "radial-gradient(ellipse at center, rgba(217,119,6,0.06) 0%, #000 65%)",
    flavor: "耕耘不輟，方能收穫。",
    sub: "Keep tilling the soil — harvest comes with effort.",
  },
  F: {
    emoji: "⛓️",
    chinese: "罪犯",
    english: "Criminal",
    color: "#F55040",
    glow: "rgba(245,80,64,0.55)",
    bg: "radial-gradient(ellipse at center, rgba(245,80,64,0.06) 0%, #000 65%)",
    flavor: "囚於無知之牢，學習是你的救贖。",
    sub: "Imprisoned by ignorance — learning is your redemption.",
  },
} as const;

interface GradeRevealProps {
  grade: string;
  onComplete: () => void;
}

export default function GradeReveal({ grade, onComplete }: GradeRevealProps) {
  const [phase, setPhase] = useState<Phase>("blackout");
  const [shaking, setShaking] = useState(false);
  const [visible, setVisible] = useState(false);

  const char = GRADE_DATA[grade as keyof typeof GRADE_DATA] ?? GRADE_DATA["C"];

  const skip = useCallback(() => {
    setPhase("exit");
    setTimeout(onComplete, 500);
  }, [onComplete]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));

    const timers = [
      setTimeout(() => { setPhase("grade"); setShaking(true); }, 500),
      setTimeout(() => setShaking(false), 1200),
      setTimeout(() => setPhase("character"), 2200),
      setTimeout(() => setPhase("exit"), 3700),
      setTimeout(onComplete, 4200),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const isExit = phase === "exit";
  const showGrade = phase !== "blackout";
  const showChar = phase === "character";

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{
        background: char.bg,
        backgroundColor: "#000",
        opacity: isExit ? undefined : visible ? 1 : 0,
        transition: isExit ? "none" : "opacity 0.4s ease",
        animation: isExit ? "revealSlideUp 0.5s ease-in forwards" : undefined,
      }}
    >
      <div
        className={`w-full h-full flex flex-col items-center justify-center${shaking ? " animate-screen-shake" : ""}`}
      >
        {/* Grade letter */}
        {showGrade && (
          <div
            className="font-bold leading-none select-none"
            style={{
              fontSize: showChar ? "clamp(4rem, 15vw, 9rem)" : "clamp(8rem, 28vw, 20rem)",
              fontFamily: "'Cormorant Garamond', serif",
              color: char.color,
              textShadow: `0 0 30px ${char.glow}, 0 0 70px ${char.glow}, 0 0 130px ${char.glow}`,
              transition: "font-size 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
              animation: phase === "grade"
                ? "gradeSlamIn 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards"
                : undefined,
            }}
          >
            {grade}
          </div>
        )}

        {/* Character reveal */}
        {showChar && (
          <div
            className="flex flex-col items-center mt-5 text-center px-8"
            style={{ animation: "characterFadeIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards" }}
          >
            <div className="text-6xl mb-3">{char.emoji}</div>
            <div
              className="text-2xl font-bold mb-0.5"
              style={{
                fontFamily: "'Noto Serif SC', serif",
                color: char.color,
                textShadow: `0 0 16px ${char.glow}`,
              }}
            >
              {char.chinese}
            </div>
            <div
              className="text-lg text-cream-400 mb-5"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}
            >
              {char.english}
            </div>
            <div
              className="max-w-sm"
              style={{ animation: "flavorTextReveal 0.6s 0.35s ease-out both" }}
            >
              <p
                className="text-cream-200 text-sm leading-loose mb-1"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                {char.flavor}
              </p>
              <p
                className="text-cream-500 text-xs italic"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {char.sub}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Skip */}
      <button
        onClick={skip}
        className="absolute bottom-8 right-8 text-cream-600 hover:text-cream-300 text-sm transition-colors cursor-pointer"
        style={{ fontFamily: "'Noto Serif SC', serif" }}
      >
        跳过 →
      </button>
    </div>
  );
}
