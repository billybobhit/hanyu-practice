"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isDev } from "@/lib/dev";
import { getRankForElo } from "@/lib/ranks";
import { RANK_THRESHOLDS } from "@/lib/elo";
import GradeReveal, { preloadGradeRevealImage } from "@/components/GradeReveal";
import EloProgressAnimation from "@/components/EloProgressAnimation";
import type { RankEvent } from "@/lib/types";

type Stage = "selector" | "grade" | "elo" | "done";
type PreviewLanguage = "zh" | "fr" | "es";

const GRADES = ["A", "B", "C", "D", "F"] as const;
const LANGUAGES: Array<{ code: PreviewLanguage; label: string }> = [
  { code: "zh", label: "Chinese" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
];

function getInitialLanguage(): PreviewLanguage {
  if (typeof window === "undefined") return "zh";
  const requested = new URLSearchParams(window.location.search).get("language");
  if (requested === "fr" || requested === "es" || requested === "zh") return requested;
  return "zh";
}

function getInitialGrade() {
  if (typeof window === "undefined") return "A";
  const requested = new URLSearchParams(window.location.search).get("grade")?.toUpperCase();
  return GRADES.find((grade) => grade === requested) ?? "A";
}

export default function TestGradeRevealPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [stage, setStage] = useState<Stage>("selector");
  const [selectedGrade, setSelectedGrade] = useState<string>(() => getInitialGrade());
  const [selectedLanguage, setSelectedLanguage] = useState<PreviewLanguage>(() => getInitialLanguage());
  const [selectedImageReady, setSelectedImageReady] = useState(false);
  const [eloBefore, setEloBefore] = useState(1250);
  const [eloChange, setEloChange] = useState(350);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      if (!supabase) { router.replace("/"); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/"); return; }
      const { data } = await supabase
        .from("user_profiles")
        .select("is_dev")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data?.is_dev && !isDev(user.email)) { router.replace("/"); return; }
      setChecking(false);
    }
    void check();
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    setSelectedImageReady(false);

    preloadGradeRevealImage(selectedLanguage, selectedGrade).then(() => {
      if (!cancelled) setSelectedImageReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedGrade, selectedLanguage]);

  const eloAfter = eloBefore + eloChange;
  const rankEvent: RankEvent = {
    eloBefore,
    eloAfter,
    eloChange,
    rankBefore: getRankForElo(eloBefore).name,
    rankAfter: getRankForElo(eloAfter).name,
  };

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-ink-900">
        <div className="text-cream-500 text-sm">Checking access...</div>
      </div>
    );
  }

  if (stage === "grade") {
    return (
      <GradeReveal
        grade={selectedGrade}
        languageCode={selectedLanguage}
        onComplete={() => setStage("elo")}
      />
    );
  }

  if (stage === "elo") {
    return (
      <EloProgressAnimation
        event={rankEvent}
        onComplete={() => setStage("done")}
      />
    );
  }

  if (stage === "done") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-ink-900">
        <p className="text-gold-400 text-lg font-semibold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Animation complete ✓
        </p>
        <button
          onClick={() => setStage("selector")}
          className="cursor-pointer rounded-full bg-ink-700 border border-ink-500 px-6 py-2.5 text-sm text-cream-300 hover:bg-ink-600 transition-colors"
        >
          ← Back to selector
        </button>
      </div>
    );
  }

  // selector
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-8 bg-ink-900 px-6">
      <h1
        className="text-cream-100 text-2xl font-semibold"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        ⚡ Test Grade Reveal
      </h1>

      <div className="space-y-2">
        <p className="text-cream-500 text-xs uppercase tracking-widest text-center">Language Deck</p>
        <div className="flex flex-wrap justify-center gap-2">
          {LANGUAGES.map((language) => (
            <button
              key={language.code}
              onClick={() => setSelectedLanguage(language.code)}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                selectedLanguage === language.code
                  ? "bg-vermillion-600 text-cream-100 shadow-[0_0_16px_rgba(220,38,38,0.4)]"
                  : "bg-ink-700 border border-ink-500 text-cream-400 hover:bg-ink-600"
              }`}
            >
              {language.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-cream-500 text-xs uppercase tracking-widest text-center">Grade</p>
        <div className="flex gap-2">
          {GRADES.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGrade(g)}
              className={`cursor-pointer w-12 h-12 rounded-xl text-lg font-bold transition-all ${
                selectedGrade === g
                  ? "bg-gold-600 text-ink-900 shadow-[0_0_16px_rgba(238,192,80,0.5)]"
                  : "bg-ink-700 border border-ink-500 text-cream-400 hover:bg-ink-600"
              }`}
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* ELO inputs */}
      <div className="w-full max-w-xs space-y-4">
        <div className="space-y-1.5">
          <label className="text-cream-500 text-xs uppercase tracking-widest">
            ELO Before — {getRankForElo(eloBefore).name}
          </label>
          <select
            value={eloBefore}
            onChange={(e) => setEloBefore(Number(e.target.value))}
            className="w-full bg-ink-700 border border-ink-500 rounded-xl px-3 py-2 text-cream-200 text-sm focus:outline-none focus:border-gold-600"
          >
            {RANK_THRESHOLDS.map((r) => (
              <option key={r.name} value={r.minElo}>
                {r.name} ({r.minElo.toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-cream-500 text-xs uppercase tracking-widest">
            ELO Change ({eloChange >= 0 ? "+" : ""}{eloChange})
          </label>
          <input
            type="number"
            value={eloChange}
            onChange={(e) => setEloChange(Number(e.target.value))}
            className="w-full bg-ink-700 border border-ink-500 rounded-xl px-3 py-2 text-cream-200 text-sm focus:outline-none focus:border-gold-600"
          />
        </div>

        <div className="flex justify-between text-xs text-cream-500 px-1">
          <span>{getRankForElo(eloBefore).name}</span>
          <span>→</span>
          <span className={getRankForElo(eloAfter).name !== getRankForElo(eloBefore).name ? "text-gold-400 font-semibold" : ""}>
            {getRankForElo(eloAfter).name} ({eloAfter.toLocaleString()} ELO)
          </span>
        </div>
      </div>

      <button
        onClick={() => {
          if (selectedImageReady) setStage("grade");
        }}
        disabled={!selectedImageReady}
        className={`rounded-full px-8 py-3 text-sm font-bold transition-all ${
          selectedImageReady
            ? "cursor-pointer bg-gold-600 text-ink-900 shadow-[0_0_18px_rgba(238,192,80,0.4)] hover:bg-gold-500 hover:shadow-[0_0_28px_rgba(238,192,80,0.6)]"
            : "cursor-wait bg-ink-700 text-cream-500"
        }`}
      >
        {selectedImageReady ? "Fire Animation →" : "Loading portrait..."}
      </button>
    </div>
  );
}
