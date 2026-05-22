import type { Grade, RankEvent, Session } from "@/lib/types";

export const RANKS = [
  {
    name: "Noob",
    minElo: 0,
    badge: "N",
    tone: "bg-ink-700 text-cream-300 border-ink-500",
    glow: "none",
  },
  {
    name: "Beginner",
    minElo: 250,
    badge: "B",
    tone: "bg-ink-700 text-cream-200 border-cream-700",
    glow: "none",
  },
  {
    name: "Intermediate",
    minElo: 650,
    badge: "I",
    tone: "bg-ink-700 text-cream-100 border-cream-500",
    glow: "none",
  },
  {
    name: "Advanced",
    minElo: 1250,
    badge: "A",
    tone: "bg-ink-700 text-gold-300 border-gold-800",
    glow: "none",
  },
  {
    name: "Pro",
    minElo: 2100,
    badge: "P",
    tone: "bg-ink-700 text-gold-200 border-gold-700",
    glow: "none",
  },
  {
    name: "Iron",
    minElo: 3300,
    badge: "IR",
    tone: "bg-gradient-to-br from-zinc-700 to-ink-800 text-zinc-100 border-zinc-500",
    glow: "shadow-[0_0_20px_rgba(161,161,170,0.25)]",
  },
  {
    name: "Gold",
    minElo: 5000,
    badge: "G",
    tone: "bg-gradient-to-br from-gold-500 to-gold-800 text-ink-900 border-gold-300",
    glow: "shadow-[0_0_26px_rgba(238,192,80,0.32)]",
  },
  {
    name: "Diamond",
    minElo: 7500,
    badge: "D",
    tone: "bg-gradient-to-br from-cyan-200 to-blue-600 text-ink-900 border-cyan-100",
    glow: "shadow-[0_0_34px_rgba(103,232,249,0.38)]",
  },
  {
    name: "Ethereal",
    minElo: 11000,
    badge: "E",
    tone: "bg-gradient-to-br from-violet-200 via-fuchsia-400 to-cyan-300 text-ink-900 border-fuchsia-200",
    glow: "shadow-[0_0_42px_rgba(217,70,239,0.42)]",
  },
  {
    name: "Master",
    minElo: 16000,
    badge: "M",
    tone: "bg-[conic-gradient(from_180deg,#EEC050,#F55040,#EDE4D4,#EEC050)] text-ink-900 border-gold-200",
    glow: "shadow-[0_0_54px_rgba(238,192,80,0.52)]",
  },
  {
    name: "Eternal",
    minElo: 23000,
    badge: "ET",
    tone: "bg-[conic-gradient(from_90deg,#EDE4D4,#EEC050,#67e8f9,#d946ef,#EDE4D4)] text-ink-900 border-cream-100",
    glow: "shadow-[0_0_70px_rgba(238,192,80,0.62)]",
  },
] as const;

export type RankName = (typeof RANKS)[number]["name"];
export type Rank = (typeof RANKS)[number];

const VALID_GRADES = ["A", "B", "C", "D", "F"] as const;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scale(score: number, low: number, high: number) {
  if (high <= low) return 0;
  return clamp((score - low) / (high - low), 0, 1);
}

export function calculateEloChange(grade: unknown, percentScore: unknown) {
  const normalizedGrade = String(grade ?? "").toUpperCase();
  const score = clamp(Number(percentScore) || 0, 0, 100);

  if (!VALID_GRADES.includes(normalizedGrade as Grade["overallGrade"])) {
    return 0;
  }

  if (normalizedGrade === "A") {
    return Math.round(100 + scale(score, 90, 100) * 50);
  }

  if (normalizedGrade === "B") {
    return Math.round(10 + scale(score, 80, 89) * 40);
  }

  if (normalizedGrade === "C") {
    return Math.round(scale(score, 70, 79) * 20);
  }

  if (normalizedGrade === "D") {
    return Math.round(-50 + scale(score, 60, 69) * 40);
  }

  return Math.round(-150 + scale(score, 0, 59) * 50);
}

export function getRankForElo(elo: number): Rank {
  const safeElo = Math.max(0, Math.floor(Number(elo) || 0));
  return [...RANKS].reverse().find((rank) => safeElo >= rank.minElo) ?? RANKS[0];
}

export function getNextRank(elo: number): Rank | null {
  const safeElo = Math.max(0, Math.floor(Number(elo) || 0));
  return RANKS.find((rank) => rank.minElo > safeElo) ?? null;
}

export function getRankProgress(elo: number) {
  const currentRank = getRankForElo(elo);
  const nextRank = getNextRank(elo);
  const safeElo = Math.max(0, Math.floor(Number(elo) || 0));

  if (!nextRank) {
    return {
      currentRank,
      nextRank,
      currentElo: safeElo,
      eloIntoRank: 0,
      eloForNextRank: 0,
      percentToNextRank: 100,
      isMaxRank: true,
    };
  }

  const eloIntoRank = safeElo - currentRank.minElo;
  const eloForNextRank = nextRank.minElo - currentRank.minElo;

  return {
    currentRank,
    nextRank,
    currentElo: safeElo,
    eloIntoRank,
    eloForNextRank,
    percentToNextRank: clamp((eloIntoRank / eloForNextRank) * 100, 0, 100),
    isMaxRank: false,
  };
}

export function applyEloChange(
  previousElo: number,
  grade: unknown,
  percentScore: unknown
): RankEvent {
  const beforeElo = Math.max(0, Math.floor(Number(previousElo) || 0));
  const change = calculateEloChange(grade, percentScore);
  const afterElo = Math.max(0, beforeElo + change);

  return {
    eloBefore: beforeElo,
    eloAfter: afterElo,
    eloChange: afterElo - beforeElo,
    rankBefore: getRankForElo(beforeElo).name,
    rankAfter: getRankForElo(afterElo).name,
  };
}

export function getProgressFromSessions(sessions: Session[]) {
  const sorted = [...sessions]
    .filter((session) => session.grade && session.endTime)
    .sort((a, b) => (a.endTime ?? a.startTime) - (b.endTime ?? b.startTime));

  const elo = sorted.reduce((currentElo, session) => {
    const event =
      session.rankEvent ??
      applyEloChange(
        currentElo,
        session.grade?.overallGrade,
        session.grade?.overallScore
      );
    return Math.max(0, event.eloAfter);
  }, 0);

  return getRankProgress(elo);
}

export function getRankEventsForSessions(sessions: Session[]) {
  const events = new Map<string, RankEvent>();
  let currentElo = 0;

  [...sessions]
    .filter((session) => session.grade && session.endTime)
    .sort((a, b) => (a.endTime ?? a.startTime) - (b.endTime ?? b.startTime))
    .forEach((session) => {
      const event =
        session.rankEvent ??
        applyEloChange(
          currentElo,
          session.grade?.overallGrade,
          session.grade?.overallScore
        );
      currentElo = Math.max(0, event.eloAfter);
      events.set(session.id, event);
    });

  return events;
}
