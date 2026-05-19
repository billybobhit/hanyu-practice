"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Grade } from "@/lib/types";

type Phase = "blackout" | "flash" | "grade" | "char" | "split";
type ImgStatus = "loading" | "loaded" | "error";

const makeUrl = (prompt: string, seed: number) =>
  `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=768&nologo=true&seed=${seed}`;

const GRADE_DATA = {
  A: {
    imageUrl: makeUrl(
      "ancient chinese monkey king deity warrior, golden crown and battle armor, wielding golden ruyi staff, fierce expression, glowing golden divine aura, dark dramatic fantasy background, cinematic portrait, hyperrealistic 8k digital art, epic",
      8001
    ),
    fallbackChar: "孫",
    chinese: "孫悟空",
    english: "Sun Wukong",
    color: "#EEC050",
    glow: "rgba(238,192,80,0.7)",
    rayColor: "rgba(238,192,80,0.18)",
    bg: "radial-gradient(ellipse at center, rgba(120,10,10,0.45) 0%, #000 70%)",
    imgClass: "img-glow-a",
  },
  B: {
    imageUrl:
      "https://image.pollinations.ai/prompt/ancient%20Chinese%20emperor%20Qin%20Shi%20Huang%20standing%20in%20black%20dragon%20imperial%20robe%20gold%20crown%20commanding%20stern%20expression%20full%20body%20cinematic%20portrait%20dark%20fantasy%20hyperrealistic%20digital%20painting%208k%20dramatic%20throne%20room%20lighting%20red%20and%20gold%20palace%20background%20epic%20emperor%20concept%20art?width=512&height=768&nologo=true&seed=77",
    fallbackChar: "秦",
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
    fallbackChar: "兵",
    chinese: "帝國士兵",
    english: "Imperial Soldier",
    color: "#9ca3af",
    glow: "rgba(156,163,175,0.6)",
    rayColor: "rgba(156,163,175,0.1)",
    bg: "radial-gradient(ellipse at center, rgba(50,50,60,0.45) 0%, #000 70%)",
    imgClass: "img-glow-c",
  },
  D: {
    imageUrl:
      "https://image.pollinations.ai/prompt/ancient%20Chinese%20peasant%20man%20full%20body%20portrait%20straw%20hat%20dirty%20worn%20linen%20clothing%20carrying%20heavy%20wooden%20yoke%20buckets%20muddy%20rice%20field%20background%20cinematic%20dramatic%20lighting%20hyperrealistic%20digital%20painting%208k%20somber%20tired%20expression%20dark%20moody%20sky%20concept%20art?width=512&height=768&nologo=true&seed=55",
    fallbackChar: "農",
    chinese: "農民",
    english: "Peasant",
    color: "#d97706",
    glow: "rgba(217,119,6,0.65)",
    rayColor: "rgba(217,119,6,0.12)",
    bg: "radial-gradient(ellipse at center, rgba(60,35,0,0.45) 0%, #000 70%)",
    imgClass: "img-glow-d",
  },
  F: {
    imageUrl:
      "https://image.pollinations.ai/prompt/ancient%20Chinese%20prisoner%20man%20full%20body%20iron%20shackles%20chains%20on%20wrists%20ragged%20torn%20clothing%20dark%20dungeon%20stone%20background%20cinematic%20dramatic%20lighting%20hyperrealistic%20digital%20painting%208k%20desperate%20haunted%20expression%20dark%20red%20torchlight%20shadows%20concept%20art?width=512&height=768&nologo=true&seed=13",
    fallbackChar: "囚",
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

// ── Placeholder — spinner while loading, styled char on failure ───────────────
function CharPlaceholder({ color, chinese, fallbackChar, error }: {
  color: string; chinese: string; fallbackChar: string; error: boolean;
}) {
  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: "rgba(6,10,20,0.9)", borderRadius: "inherit" }}>
        <div style={{
          fontFamily: "'Noto Serif SC', serif",
          fontSize: "clamp(5rem,22vw,9rem)",
          fontWeight: 700,
          lineHeight: 1,
          color,
          textShadow: `0 0 40px ${color}, 0 0 100px ${color}55`,
          animation: "characterFadeIn 0.8s ease-out both",
        }}>
          {fallbackChar}
        </div>
        <p className="text-sm font-bold tracking-widest" style={{ color, fontFamily: "'Noto Serif SC', serif" }}>{chinese}</p>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ background: "rgba(6,10,20,0.75)", borderRadius: "inherit", animation: "breathe 2s ease-in-out infinite" }}>
      <div style={{ width: 48, height: 48, borderRadius: "50%", border: `3px solid ${color}33`, borderTopColor: color, borderRightColor: `${color}88`, animation: "inkSpin 1s linear infinite" }} />
      <p className="text-base font-bold" style={{ color, fontFamily: "'Noto Serif SC', serif", textShadow: `0 0 16px ${color}` }}>{chinese}</p>
      <p className="text-cream-600 text-xs tracking-widest" style={{ fontFamily: "'Noto Serif SC', serif" }}>生成中...</p>
    </div>
  );
}

// ── Split screen (Phase 3) ────────────────────────────────────────────────────
function SplitScreen({ grade, gradeData, imagePreloaded, imagePreloadFailed, onComplete }: {
  grade: string; gradeData?: Grade; imagePreloaded: boolean; imagePreloadFailed: boolean; onComplete: () => void;
}) {
  const router = useRouter();
  const char = GRADE_DATA[grade as keyof typeof GRADE_DATA] ?? GRADE_DATA["C"];
  const flavor = FLAVOR[grade] ?? FLAVOR["C"];
  const [loaded, setLoaded] = useState(imagePreloaded);
  const [error, setError] = useState(imagePreloadFailed);

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

        <div className="absolute inset-0 flex items-start justify-center" style={{ backgroundColor: "#050508" }}>
          {!loaded && !error && <CharPlaceholder color={char.color} chinese={char.chinese} fallbackChar={char.fallbackChar} error={false} />}
          {error && <CharPlaceholder color={char.color} chinese={char.chinese} fallbackChar={char.fallbackChar} error={true} />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={char.imageUrl}
            alt={char.english}
            className={char.imgClass}
            onLoad={() => setLoaded(true)}
            onError={() => { setLoaded(false); setError(true); }}
            style={{ height: "100%", width: "auto", objectFit: "contain", objectPosition: "top center", display: loaded ? "block" : "none" }}
          />
        </div>

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
  const [preloadStatuses, setPreloadStatuses] = useState<Record<string, ImgStatus>>({
    A: "loading", B: "loading", C: "loading", D: "loading", F: "loading",
  });
  const [selectedImageStatus, setSelectedImageStatus] = useState<ImgStatus>("loading");

  const char = GRADE_DATA[grade as keyof typeof GRADE_DATA] ?? GRADE_DATA["C"];
  const flavor = FLAVOR[grade] ?? FLAVOR["C"];
  const imageLoaded = selectedImageStatus === "loaded";
  const imageError = selectedImageStatus === "error";

  const skip = useCallback(() => setPhase("split"), []);

  // Preload the selected image before the cinematic reveal starts. Slow loads
  // should wait here instead of showing the one-character failure fallback.
  useEffect(() => {
    setSelectedImageStatus("loading");

    const img = new window.Image();
    let cancelled = false;

    const markLoaded = () => {
      if (!cancelled) setSelectedImageStatus("loaded");
    };
    const markError = () => {
      if (!cancelled) setSelectedImageStatus("error");
    };

    img.onload = () => {
      if (typeof img.decode === "function") {
        img.decode().then(markLoaded).catch(markLoaded);
        return;
      }
      markLoaded();
    };
    img.onerror = markError;
    img.src = char.imageUrl;

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [char.imageUrl]);

  // Warm the other grade images in the background for later sessions.
  useEffect(() => {
    const grades = ["A", "B", "C", "D", "F"] as const;
    const pending = new Set<string>(["A", "B", "C", "D", "F"]);
    const statuses: Record<string, ImgStatus> = { A: "loading", B: "loading", C: "loading", D: "loading", F: "loading" };

    const resolve = (g: string, status: "loaded" | "error") => {
      if (!pending.has(g)) return;
      statuses[g] = status;
      pending.delete(g);
      if (pending.size === 0) setPreloadStatuses({ ...statuses });
    };

    const imgs = grades.map(g => {
      const img = new window.Image();
      img.src = GRADE_DATA[g].imageUrl;
      img.onload = () => resolve(g, "loaded");
      img.onerror = () => resolve(g, "error");
      return img;
    });

    const timeout = setTimeout(() => {
      [...pending].forEach(g => resolve(g, "error"));
    }, 15000);

    return () => {
      clearTimeout(timeout);
      imgs.forEach(img => { img.onload = null; img.onerror = null; });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start animation phases after the selected image is ready or truly failed.
  useEffect(() => {
    if (selectedImageStatus === "loading") return;
    requestAnimationFrame(() => setVisible(true));
    const timers = [
      setTimeout(() => setPhase("flash"), 300),
      setTimeout(() => { setPhase("grade"); setRumbling(true); }, 600),
      setTimeout(() => setRumbling(false), 1800),
      setTimeout(() => setPhase("char"), 2500),
      setTimeout(() => setPhase("split"), 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [selectedImageStatus]);

  // Preload gate — show spinner until the selected reveal image is paint-ready.
  if (selectedImageStatus === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5" style={{ background: char.bg, backgroundColor: "#000" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", border: `4px solid ${char.color}22`, borderTopColor: char.color, borderRightColor: `${char.color}55`, animation: "inkSpin 1s linear infinite" }} />
        <p style={{ fontFamily: "'Noto Serif SC', serif", color: char.color, fontSize: "0.875rem", letterSpacing: "0.3em", opacity: 0.7 }}>正在召唤...</p>
      </div>
    );
  }

  if (phase === "split") {
    return <SplitScreen grade={grade} gradeData={gradeData} imagePreloaded={imageLoaded} imagePreloadFailed={imageError} onComplete={onComplete} />;
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

        {isChar && (
          <div className="flex-1 flex items-center justify-center relative w-full">
            <LightRays color={char.rayColor} />

            <div
              className="relative z-10"
              style={{ width: "min(85vw, 380px)", aspectRatio: "2 / 3", maxHeight: "72vh", animation: "charBurst 0.8s 0.1s cubic-bezier(0.22,1,0.36,1) both" }}
            >
              {!imageLoaded && !imageError && <CharPlaceholder color={char.color} chinese={char.chinese} fallbackChar={char.fallbackChar} error={false} />}
              {imageError && <CharPlaceholder color={char.color} chinese={char.chinese} fallbackChar={char.fallbackChar} error={true} />}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={char.imageUrl}
                alt={char.english}
                className={`${char.imgClass} rounded-2xl`}
                onError={() => {/* handled by preload */}}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: imageLoaded ? "block" : "none" }}
              />

              {imageLoaded && (
                <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.88) 100%)" }} />
              )}

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
