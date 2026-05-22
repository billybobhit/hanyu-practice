"use client";

import { useEffect, useState } from "react";
import RankBadge from "@/components/RankBadge";
import { getRankProgress, RANKS } from "@/lib/ranks";
import type { RankEvent } from "@/lib/types";

type AnimPhase =
  | "intro"
  | "eloReveal"
  | "filling"
  | "rankFlash"
  | "rankFill"
  | "hold";

interface EloProgressAnimationProps {
  event: RankEvent;
  onComplete: () => void;
}

function RankParticles({ color, count }: { color: string; count: number }) {
  const items = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI;
    const dist = 70 + (i % 4) * 25;
    return {
      tx: Math.round(Math.cos(angle) * dist),
      ty: Math.round(Math.sin(angle) * dist),
      size: 3 + (i % 3) * 2,
      delay: (i % 6) * 0.05,
    };
  });
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 2 }}
    >
      {items.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: "50%",
            top: "35%",
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

export default function EloProgressAnimation({
  event,
  onComplete,
}: EloProgressAnimationProps) {
  const oldProgress = getRankProgress(event.eloBefore);
  const newProgress = getRankProgress(event.eloAfter);

  const rankChanged = event.rankBefore !== event.rankAfter;
  const rankUp = rankChanged && event.eloAfter >= event.eloBefore;
  const rankDown = rankChanged && event.eloAfter < event.eloBefore;

  const newRankConfig =
    RANKS.find((r) => r.name === event.rankAfter) ?? RANKS[0];
  const isPremium = newRankConfig.minElo >= 3300;
  const isElite =
    newRankConfig.name === "Master" || newRankConfig.name === "Eternal";
  const isMax = newProgress.isMaxRank;

  const [phase, setPhase] = useState<AnimPhase>("intro");
  const [barPercent, setBarPercent] = useState(oldProgress.percentToNextRank);
  const [activeBadgeRank, setActiveBadgeRank] = useState(event.rankBefore);
  const [showRankChangeBanner, setShowRankChangeBanner] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  const eloPositive = event.eloChange >= 0;
  const eloColor = eloPositive ? "#86efac" : "#F55040";

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setPhase("hold");
      setBarPercent(isMax ? 100 : newProgress.percentToNextRank);
      setActiveBadgeRank(event.rankAfter);
      if (rankChanged) setShowRankChangeBanner(true);
      return;
    }

    const t: ReturnType<typeof setTimeout>[] = [];

    t.push(setTimeout(() => setPhase("eloReveal"), 500));

    t.push(
      setTimeout(() => {
        setPhase("filling");
        if (!rankChanged) {
          setBarPercent(isMax ? 100 : newProgress.percentToNextRank);
        } else if (rankUp) {
          setBarPercent(100);
        } else {
          setBarPercent(0);
        }
      }, 1100)
    );

    if (!rankChanged) {
      t.push(setTimeout(() => setPhase("hold"), 2700));
    } else {
      t.push(
        setTimeout(() => {
          setPhase("rankFlash");
          setActiveBadgeRank(event.rankAfter);
          setShowRankChangeBanner(true);
          if (isPremium && rankUp) setShowParticles(true);
          if (rankDown) {
            setBarPercent(isMax ? 100 : newProgress.percentToNextRank);
          } else {
            setBarPercent(0);
          }
        }, 2500)
      );

      if (rankUp) {
        t.push(
          setTimeout(() => {
            setPhase("rankFill");
            setBarPercent(isMax ? 100 : newProgress.percentToNextRank);
          }, 2950)
        );
        t.push(setTimeout(() => setPhase("hold"), 4400));
      } else {
        t.push(setTimeout(() => setPhase("hold"), 3600));
      }
    }

    return () => t.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const barTransition =
    phase === "filling"
      ? "width 1.2s cubic-bezier(0.22,1,0.36,1)"
      : phase === "rankFill"
        ? "width 0.9s cubic-bezier(0.22,1,0.36,1)"
        : "none";

  const activeRankConfig =
    RANKS.find((r) => r.name === activeBadgeRank) ?? RANKS[0];
  const nextRankForActive =
    RANKS.find((r) => r.minElo > activeRankConfig.minElo) ?? null;
  const isActiveMax = !nextRankForActive;

  const showingRankUp = showRankChangeBanner && rankUp;
  const showingRankDown = showRankChangeBanner && rankDown;

  // Bar gradient — prismatic for elite, gold for premium, standard otherwise
  const barGradient =
    isElite && phase !== "intro" && phase !== "eloReveal" && phase !== "filling"
      ? "linear-gradient(90deg, #d946ef, #67e8f9, #EEC050)"
      : isPremium && phase !== "intro" && phase !== "eloReveal" && phase !== "filling"
        ? "linear-gradient(90deg, #EEC050aa, #EEC050)"
        : "linear-gradient(90deg, #F55040, #EEC050cc, #EEC050)";

  // Background — subtle glow for elite new rank
  const bgGlow =
    (phase === "rankFlash" || phase === "rankFill" || phase === "hold") &&
    isElite
      ? newRankConfig.name === "Eternal"
        ? "radial-gradient(ellipse at center, rgba(103,232,249,0.12) 0%, #060A14 65%)"
        : "radial-gradient(ellipse at center, rgba(238,192,80,0.12) 0%, #060A14 65%)"
      : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: bgGlow ?? "#060A14" }}
    >
      {showParticles && isPremium && (
        <RankParticles
          color={isElite ? (newRankConfig.name === "Eternal" ? "#67e8f9" : "#EEC050") : "#EEC050"}
          count={isElite ? 24 : 14}
        />
      )}

      <div className="relative z-10 w-full max-w-sm space-y-7">
        {/* Badge + rank name */}
        <div className="flex flex-col items-center gap-3">
          <div
            style={{
              animation:
                phase === "rankFlash"
                  ? "charBurst 0.5s cubic-bezier(0.22,1,0.36,1) both"
                  : undefined,
            }}
          >
            <RankBadge rank={activeBadgeRank} size="lg" />
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
              {isActiveMax ? "MAX RANK" : "Current Rank"}
            </p>
            <h2
              className="text-2xl font-semibold text-cream-100"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                textShadow:
                  isElite &&
                  (phase === "rankFlash" ||
                    phase === "rankFill" ||
                    phase === "hold")
                    ? `0 0 24px ${newRankConfig.name === "Eternal" ? "#67e8f9" : "#EEC050"}`
                    : undefined,
              }}
            >
              {activeBadgeRank}
            </h2>
          </div>
        </div>

        {/* ELO display */}
        <div className="text-center">
          <p
            className="text-5xl font-bold tabular-nums"
            style={{
              color: "#EDE4D4",
              fontFamily: "'Cormorant Garamond', serif",
            }}
          >
            {event.eloBefore.toLocaleString()}
          </p>
          <p className="mt-1 text-xs tracking-widest text-cream-600">ELO</p>

          {phase !== "intro" && (
            <div
              className="mt-3"
              style={{ animation: "fadeInUp 0.4s ease-out both" }}
            >
              <span
                className="text-3xl font-bold"
                style={{ color: eloColor, fontFamily: "'Cormorant Garamond', serif" }}
              >
                {eloPositive ? "+" : ""}
                {event.eloChange} ELO
              </span>
              <p className="mt-1 text-xs text-cream-600">
                → {event.eloAfter.toLocaleString()} ELO
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-cream-500">
            <span>
              {isActiveMax
                ? "Max rank reached"
                : `${activeRankConfig.name} → ${nextRankForActive?.name}`}
            </span>
            <span>{Math.round(barPercent)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border border-ink-500 bg-ink-700">
            <div
              className="h-full rounded-full"
              style={{
                width: `${barPercent}%`,
                background: barGradient,
                transition: barTransition,
                boxShadow: isPremium ? "0 0 10px rgba(238,192,80,0.45)" : undefined,
              }}
            />
          </div>
        </div>

        {/* Rank change banners */}
        {showingRankUp && (
          <div
            className="rounded-xl border border-gold-700 bg-gold-800/20 px-4 py-3 text-center"
            style={{ animation: "fadeInUp 0.5s ease-out both" }}
          >
            <p className="text-sm font-semibold text-gold-300">
              {isElite ? "✦ " : "↑ "}Promoted to {event.rankAfter}
              {isElite ? " ✦" : ""}
            </p>
            {isMax && (
              <p className="mt-1 text-xs text-gold-500">
                You have reached the highest rank.
              </p>
            )}
          </div>
        )}
        {showingRankDown && (
          <div
            className="rounded-xl border border-vermillion-700 bg-vermillion-900/20 px-4 py-3 text-center"
            style={{ animation: "fadeInUp 0.5s ease-out both" }}
          >
            <p className="text-sm font-semibold text-vermillion-400">
              ↓ Dropped to {event.rankAfter}
            </p>
          </div>
        )}

        {/* Continue button */}
        {phase === "hold" && (
          <button
            onClick={onComplete}
            className="w-full cursor-pointer rounded-full bg-gold-600 px-6 py-3.5 text-sm font-bold text-ink-900 shadow-[0_0_18px_rgba(238,192,80,0.4)] transition-all hover:bg-gold-500 hover:shadow-[0_0_28px_rgba(238,192,80,0.6)]"
            style={{ animation: "fadeInUp 0.4s ease-out both" }}
          >
            View Full Report →
          </button>
        )}
      </div>

      {phase !== "hold" && (
        <button
          onClick={onComplete}
          className="absolute bottom-7 right-7 z-30 cursor-pointer text-sm text-cream-600 transition-colors hover:text-cream-300"
        >
          Skip →
        </button>
      )}
    </div>
  );
}
