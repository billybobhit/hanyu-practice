"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Grade } from "@/lib/types";

type Phase = "blackout" | "flash" | "grade" | "char" | "split";

const makeUrl = (prompt: string, seed: number) =>
  `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=768&nologo=true&seed=${seed}`;

const GRADE_DATA = {
  A: {
    imageUrl: makeUrl(
      "ancient chinese monkey king deity warrior, golden crown and battle armor, wielding golden ruyi staff, fierce expression, glowing golden divine aura, dark dramatic fantasy background, cinematic portrait, hyperrealistic 8k digital art, epic",
      8001
    ),
    chinese: "孫悟空",
    english: "Sun Wukong",
    color: "#EEC050",
    glow: "rgba(238,192,80,0.7)",
    rayColor: "rgba(238,192,80,0.18)",
    bg: "radial-gradient(ellipse at center, rgba(120,10,10,0.45) 0%, #000 70%)",
    imgClass: "img-glow-a",
  },
  B: {
    imageUrl: makeUrl(
      "Qin Shi Huang first emperor of China portrait, ancient chinese emperor, black and gold dragon robe, tall imperial crown, commanding regal expression, dramatic throne room lighting, cinematic dark fantasy, hyperrealistic 8k digital art",
      8002
    ),
    chinese: "秦始皇",
    english: "Qin Shi Huang",
    color: "#94a3b8",
    glow: "rgba(148,163,184,0.7)",
    rayColor: "rgba(148,163,184,0.14)",
    bg: "radial-gradient(ellipse at center, rgba(80,0,20,0.45) 0%, #000 70%)",
    imgClass: "img-glow-b",
  },
  C: {
    imageUrl: makeUrl(
      "ancient chinese terracotta warrior soldier, clay stone battle armor, holding long spear, dramatic cinematic portrait, moody dark atmosphere, hyperrealistic digital art, epic warrior",
      8003
    ),
    chinese: "帝國士兵",
    english: "Imperial Soldier",
    color: "#9ca3af",
    glow: "rgba(156,163,175,0.6)",
    rayColor: "rgba(156,163,175,0.1)",
    bg: "radial-gradient(ellipse at center, rgba(50,50,60,0.45) 0%, #000 70%)",
    imgClass: "img-glow-c",
  },
  D: {
    imageUrl: makeUrl(
      "ancient chinese peasant farmer, large conical straw hat, humble worn robes, tired weathered face, dramatic somber portrait, muted earth tones, dark background, cinematic lighting, hyperrealistic digital art",
      8004
    ),
    chinese: "農民",
    english: "Peasant",
    color: "#d97706",
    glow: "rgba(217,119,6,0.65)",
    rayColor: "rgba(217,119,6,0.12)",
    bg: "radial-gradient(ellipse at center, rgba(60,35,0,0.45) 0%, #000 70%)",
    imgClass: "img-glow-d",
  },
  F: {
    imageUrl: makeUrl(
      "ancient chinese prisoner in heavy iron chains, shackled wrists, bowing head, dark dungeon stone cell, dramatic shadows, somber ominous portrait, hyperrealistic digital art, dark atmosphere",
      8005
    ),
    chinese: "罪犯",
    english: "Criminal",
    color: "#dc2626",
    glow: "rgba(220,38,38,0.75)",
    rayColor: "rgba(220,38,38,0.14)",
    bg: "radial-gradient(ellipse at center, rgba(80,0,0,0.5) 0%, #000 70%)",
    imgClass: "img-glow-f",
  },
} as const;

const FLAVOR: Record<string, { zh: string; en: string }> = {
  A: { zh: "天命之人！你的智慧如齊天大聖。", en: "Chosen by Heaven! Your wisdom rivals the Great Sage." },
  B: { zh: "統一之才！秦始皇之魄力。", en: "Unifying talent! The spirit of the First Emperor." },
  C: { zh: "忠誠的士兵，繼續訓練。", en: "Loyal soldier, keep training." },
  D: { zh: "耕耘不輟，方能收穫。", en: "Keep tilling the soil — harvest comes with effort." },
  F: { zh: "囚於無知之牢，學習是你的救贖。", en: "Imprisoned by ignorance — learning is your redemption." },
};

// ── Particles ─────────────────────────────────────────────────────────────────
function Particles({ color }: { color: string }) {
  const items = Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * 2 * Math.PI;
    const dist = 180 + (i % 4) * 40;
    return { tx: Math.round(Math.cos(angle) * dist), ty: Math.round(Math.sin(angle) * dist), size: 4 + (i % 4) * 2, delay: (i % 7) * 0.05 };
  });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
      {items.map((p, i) => (
        <div key={i} style={{ position: "absolute", left: "50%", top: "40%", width: p.size, height: p.size, borderRadius: "50%", background: color, boxShadow: `0 0 ${p.size * 3}px ${color}`, ["--tx" as string]: `${p.tx}px`, ["--ty" as string]: `${p.ty}px`, animation: `particleOut 1.1s ${p.delay}s ease-out both` }} />
      ))}
    </div>
  );
}

// ── Light rays ────────────────────────────────────────────────────────────────
function LightRays({ color }: { color: string }) {
  const stops: string[] = [];
  for (let i = 0; i < 12; i++) {
    const base = i * 30;
    stops.push(`transparent ${base}deg`, `${color} ${base + 6}deg`, `${color} ${base + 18}deg`, `transparent ${base + 30}deg`);
  }
  return (
    <div style={{ position: "absolute", width: "140vmax", height: "140vmax", left: "50%", top: "50%", background: `conic-gradient(${stops.join(", ")})`, animation: "raysSpin 10s linear infinite", willChange: "transform", pointerEvents: "none", zIndex: 0 }} />
  );
}

// ── Letter slam ───────────────────────────────────────────────────────────────
function SlamLetters({ text, style, delayBase = 0 }: { text: string; style?: React.CSSProperties; delayBase?: number }) {
  return (
    <div style={style}>
      {text.split("").map((ch, i) => (
        <span key={i} className="inline-block" style={{ animation: `letterSlam 0.45s ${delayBase + i * 0.07}s cubic-bezier(0.22,1,0.36,1) both` }}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </div>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function SplitScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-cream-400">{label}</span>
        <span style={{ color }} className="font-semibold">{score}</span>
      </div>
      <div className="h-1 bg-ink-600 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, transition: "width 1.2s 0.3s ease-out" }} />
      </div>
    </div>
  );
}

// ── Loading / error placeholder ───────────────────────────────────────────────
function CharPlaceholder({ color, chinese, error }: { color: string; chinese: string; error: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-ink-900/60 rounded-2xl">
      {error ? (
        <>
          <div className="text-5xl mb-2" style={{ color }}>☯</div>
          <p className="text-xl font-bold" style={{ color, fontFamily: "'Noto Serif SC', serif", textShadow: `0 0 16px ${color}` }}>{chinese}</p>
        </>
      ) : (
        <>
          <div style={{ width: 52, height: 52, borderRadius: "50%", border: `3px solid ${color}33`, borderTopColor: color, borderRightColor: `${color}88`, animation: "inkSpin 1s linear infinite" }} />
          <p className="text-xl font-bold" style={{ color, fontFamily: "'Noto Serif SC', serif", textShadow: `0 0 16px ${color}` }}>{chinese}</p>
          <p className="text-cream-600 text-xs tracking-widest" style={{ fontFamily: "'Noto Serif SC', serif" }}>召唤中...</p>
        </>
      )}
    </div>
  );
}

// ── Character image (shared) ──────────────────────────────────────────────────
function CharImage({
  src, alt, imgClass, loaded, error,
  onLoad, onError,
  containerStyle,
}: {
  src: string; alt: string; imgClass: string;
  loaded: boolean; error: boolean;
  onLoad: () => void; onError: () => void;
  containerStyle?: React.CSSProperties;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl" style={containerStyle}>
      {!loaded && !error && <CharPlaceholder color="#888" chinese={alt} error={false} />}
      {error && <CharPlaceholder color="#888" chinese={alt} error={true} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={imgClass}
        onLoad={onLoad}
        onError={onError}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "top center",
          display: loaded ? "block" : "none",
        }}
      />
    </div>
  );
}

// ── Split screen (Phase 3) ────────────────────────────────────────────────────
function SplitScreen({ grade, gradeData, onComplete }: { grade: string; gradeData?: Grade; onComplete: () => void }) {
  const router = useRouter();
  const char = GRADE_DATA[grade as keyof typeof GRADE_DATA] ?? GRADE_DATA["C"];
  const flavor = FLAVOR[grade] ?? FLAVOR["C"];
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const gradeTextColor: Record<string, string> = { A: "#EEC050", B: "#94a3b8", C: "#9ca3af", D: "#d97706", F: "#dc2626" };
  const textColor = gradeTextColor[grade] ?? "#EDE4D4";

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:flex-row" style={{ backgroundColor: "#060A14", background: char.bg }}>
      {/* LEFT: grade + scores */}
      <div
        className="flex-1 flex flex-col justify-center px-6 sm:px-10 py-8 overflow-y-auto"
        style={{ borderRight: `1px solid ${char.color}22`, boxShadow: `inset -1px 0 0 ${char.color}33, 4px 0 24px rgba(0,0,0,0.4)`, animation: "slideFromLeft 0.9s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        <div className="font-bold leading-none mb-1 select-none" style={{ fontSize: "clamp(5rem,14vw,9rem)", fontFamily: "'Cormorant Garamond', serif", color: textColor, textShadow: `0 0 30px ${char.glow}, 0 0 60px ${char.glow}` }}>{grade}</div>
        <div className="text-cream-600 text-xs uppercase tracking-widest mb-6">总体评分</div>

        {gradeData && (
          <>
            <div className="flex items-baseline gap-2 mb-5">
              <span style={{ color: textColor }} className="text-4xl font-bold">{gradeData.overallScore}</span>
              <span className="text-cream-600 text-sm">/ 100</span>
            </div>
            <div className="space-y-3 mb-6">
              <SplitScoreBar label="词汇准确度" score={gradeData.vocabularyScore} color={textColor} />
              <SplitScoreBar label="语法正确性" score={gradeData.grammarScore} color={textColor} />
              <SplitScoreBar label="理解深度" score={gradeData.comprehensionScore} color={textColor} />
            </div>
            {gradeData.strengths.length > 0 && (
              <div className="mb-4">
                <p className="text-xs uppercase tracking-widest text-gold-600 mb-1.5">做得好 ✓</p>
                {gradeData.strengths.map((s, i) => <p key={i} className="text-cream-300 text-xs leading-relaxed">· {s}</p>)}
              </div>
            )}
            {gradeData.improvements.length > 0 && (
              <div className="mb-5">
                <p className="text-xs uppercase tracking-widest text-vermillion-500 mb-1.5">需要改进 →</p>
                {gradeData.improvements.map((s, i) => <p key={i} className="text-cream-400 text-xs leading-relaxed">· {s}</p>)}
              </div>
            )}
          </>
        )}

        <button onClick={onComplete} className="text-xs text-cream-700 hover:text-cream-400 transition-colors cursor-pointer underline mt-auto pt-4" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          查看完整报告 →
        </button>
      </div>

      {/* RIGHT: character portrait */}
      <div className="flex-1 relative overflow-hidden" style={{ animation: "slideFromRight 0.9s cubic-bezier(0.22,1,0.36,1) both", minHeight: "40vh" }}>
        <LightRays color={char.rayColor} />

        {/* Portrait fills panel height, centered, natural width */}
        <div className="absolute inset-0 flex items-start justify-center" style={{ backgroundColor: "#050508" }}>
          {!loaded && !error && <CharPlaceholder color={char.color} chinese={char.chinese} error={false} />}
          {error && <CharPlaceholder color={char.color} chinese={char.chinese} error={true} />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={char.imageUrl}
            alt={char.english}
            className={char.imgClass}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            style={{ height: "100%", width: "auto", objectFit: "contain", objectPosition: "top center", display: loaded ? "block" : "none" }}
          />
        </div>

        {/* Bottom overlay — name / flavor / button */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center px-6 pt-16 pb-8" style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.97))" }}>
          <div className="text-2xl font-bold text-center mb-0.5" style={{ fontFamily: "'Noto Serif SC', serif", color: char.color, textShadow: `0 0 16px ${char.glow}` }}>{char.chinese}</div>
          <div className="text-base text-cream-400 italic mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{char.english}</div>
          <div className="text-center max-w-xs mb-6">
            <p className="text-cream-200 text-sm leading-loose" style={{ fontFamily: "'Noto Serif SC', serif" }}>{flavor.zh}</p>
            <p className="text-cream-500 text-xs italic mt-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{flavor.en}</p>
          </div>
          <button onClick={() => router.push("/")} className="px-7 py-3 bg-vermillion-600 hover:bg-vermillion-500 text-cream-100 rounded-xl font-medium transition-all cursor-pointer text-sm" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            练习更多 →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface GradeRevealProps {
  grade: string;
  gradeData?: Grade;
  onComplete: () => void;
}

export default function GradeReveal({ grade, gradeData, onComplete }: GradeRevealProps) {
  const [phase, setPhase] = useState<Phase>("blackout");
  const [rumbling, setRumbling] = useState(false);
  const [visible, setVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const char = GRADE_DATA[grade as keyof typeof GRADE_DATA] ?? GRADE_DATA["C"];
  const flavor = FLAVOR[grade] ?? FLAVOR["C"];

  const skip = useCallback(() => setPhase("split"), []);

  // Preload image via JS so it's ready before the char phase
  useEffect(() => {
    const img = new window.Image();
    img.src = char.imageUrl;
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageError(true);
  }, [char.imageUrl]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timers = [
      setTimeout(() => setPhase("flash"), 300),
      setTimeout(() => { setPhase("grade"); setRumbling(true); }, 600),
      setTimeout(() => setRumbling(false), 1800),
      setTimeout(() => setPhase("char"), 2500),
      setTimeout(() => setPhase("split"), 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (phase === "split") {
    return <SplitScreen grade={grade} gradeData={gradeData} onComplete={onComplete} />;
  }

  const showGrade = phase !== "blackout" && phase !== "flash";
  const isChar = phase === "char";

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ background: char.bg, backgroundColor: "#000", opacity: visible ? 1 : 0, transition: "opacity 0.35s ease" }}
    >
      {phase === "flash" && (
        <div className="absolute inset-0 bg-white pointer-events-none" style={{ animation: "whiteFlash 0.35s ease-out forwards", zIndex: 20 }} />
      )}

      {phase === "grade" && <Particles color={char.color} />}

      <div
        className={`w-full h-full flex flex-col items-center relative${rumbling ? " animate-screen-rumble" : ""}`}
        style={{ justifyContent: isChar ? "flex-start" : "center" }}
      >
        {/* Grade letter */}
        {showGrade && (
          <div
            className="font-bold leading-none select-none relative z-10"
            style={{
              fontSize: isChar ? "clamp(3rem,10vw,5.5rem)" : "clamp(8rem,28vw,20rem)",
              fontFamily: "'Cormorant Garamond', serif",
              color: char.color,
              textShadow: `0 0 40px ${char.glow}, 0 0 90px ${char.glow}`,
              animation: phase === "grade" ? "gradeDropIn 0.75s cubic-bezier(0.22,1,0.36,1) forwards, colorPulse 2s 0.8s ease-in-out infinite" : undefined,
              transition: "font-size 0.7s cubic-bezier(0.22,1,0.36,1)",
              alignSelf: isChar ? "flex-start" : "center",
              margin: isChar ? "1.5rem 0 0 2rem" : "0",
            }}
          >
            {grade}
          </div>
        )}

        {phase === "grade" && (
          <div className="text-cream-400 text-base tracking-[0.3em] z-10 mt-6" style={{ fontFamily: "'Noto Serif SC', serif", animation: "fadeInUp 0.6s 0.9s ease-out both" }}>
            你的等级是...
          </div>
        )}

        {/* Phase 2 — character cinematic */}
        {isChar && (
          <div className="flex-1 flex items-center justify-center relative w-full">
            <LightRays color={char.rayColor} />

            {/* Portrait container — fixed 2:3 aspect ratio, no stretching */}
            <div
              className="relative z-10"
              style={{
                width: "min(85vw, 380px)",
                aspectRatio: "2 / 3",
                maxHeight: "72vh",
                animation: (imageLoaded || imageError) ? "charBurst 0.8s 0.1s cubic-bezier(0.22,1,0.36,1) both" : undefined,
              }}
            >
              {/* Loading / error */}
              {!imageLoaded && !imageError && <CharPlaceholder color={char.color} chinese={char.chinese} error={false} />}
              {imageError && <CharPlaceholder color={char.color} chinese={char.chinese} error={true} />}

              {/* Portrait image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={char.imageUrl}
                alt={char.english}
                className={`${char.imgClass} rounded-2xl`}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: imageLoaded ? "block" : "none" }}
              />

              {/* Vignette */}
              {imageLoaded && (
                <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.88) 100%)" }} />
              )}

              {/* Name + flavor overlaid at bottom of image */}
              {(imageLoaded || imageError) && (
                <div className="absolute bottom-0 left-0 right-0 rounded-b-2xl text-center" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.97))", padding: "2.5rem 1rem 1.25rem" }}>
                  <SlamLetters text={char.chinese} delayBase={0.35} style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "1.6rem", fontWeight: 700, color: char.color, textShadow: `0 0 20px ${char.glow}`, marginBottom: "0.1rem" }} />
                  <SlamLetters text={char.english} delayBase={0.55} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", fontStyle: "italic", color: "#EDE4D4", opacity: 0.75, marginBottom: "0.6rem" }} />
                  <div style={{ animation: "flavorScrollUp 0.8s 1.3s ease-out both" }}>
                    <p className="text-cream-200 text-xs leading-loose" style={{ fontFamily: "'Noto Serif SC', serif" }}>{flavor.zh}</p>
                    <p className="text-cream-500 text-xs italic mt-0.5" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{flavor.en}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <button onClick={skip} className="absolute bottom-7 right-7 text-cream-600 hover:text-cream-300 text-sm transition-colors cursor-pointer z-30" style={{ fontFamily: "'Noto Serif SC', serif" }}>
        跳过 →
      </button>
    </div>
  );
}
