export const RANK_THRESHOLDS = [
  { name: "Noob", minElo: 0 },
  { name: "Beginner", minElo: 250 },
  { name: "Intermediate", minElo: 650 },
  { name: "Advanced", minElo: 1250 },
  { name: "Pro", minElo: 2100 },
  { name: "Iron", minElo: 3300 },
  { name: "Gold", minElo: 5000 },
  { name: "Diamond", minElo: 7500 },
  { name: "Ethereal", minElo: 11000 },
  { name: "Master", minElo: 16000 },
  { name: "Eternal", minElo: 23000 },
];

export const PLACEMENT_STARTING_ELO: Record<string, number> = {
  A: 2100,
  B: 1250,
  C: 650,
  D: 250,
  F: 0,
};

export const ADVANCED_PLACEMENT_ELO: Record<string, number> = {
  A: 11000,
  B: 7500,
  C: 5000,
  D: 3300,
  F: 2100,
};

export const LANGUAGE_RANK_WEIGHT: Record<string, number> = {
  Noob: 0.1,
  Beginner: 0.18,
  Intermediate: 0.28,
  Advanced: 0.38,
  Pro: 0.5,
  Iron: 0.62,
  Gold: 0.75,
  Diamond: 0.87,
  Ethereal: 1,
  Master: 1,
  Eternal: 1,
};

export function eloToRank(elo: number): string {
  return [...RANK_THRESHOLDS].reverse().find((r) => elo >= r.minElo)?.name ?? "Noob";
}

export function calculateGlobalEloContribution(
  sessionEloGain: number,
  languageRank: string
): number {
  const gain = Math.trunc(Number(sessionEloGain) || 0);
  if (gain < 0) return gain;

  const weight = LANGUAGE_RANK_WEIGHT[languageRank] ?? LANGUAGE_RANK_WEIGHT.Noob;
  return Math.round(gain * weight);
}

export function getBestLanguageRank(
  rows: Array<{ language_code: string; elo: number }>
): { rankName: string; languageCode: string; elo: number } | null {
  if (!rows.length) return null;
  const best = rows.reduce((a, b) => (a.elo >= b.elo ? a : b));
  return { rankName: eloToRank(best.elo), languageCode: best.language_code, elo: best.elo };
}
