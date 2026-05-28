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

export function eloToRank(elo: number): string {
  return [...RANK_THRESHOLDS].reverse().find((r) => elo >= r.minElo)?.name ?? "Noob";
}

export function getBestLanguageRank(
  rows: Array<{ language_code: string; elo: number }>
): { rankName: string; languageCode: string; elo: number } | null {
  if (!rows.length) return null;
  const best = rows.reduce((a, b) => (a.elo >= b.elo ? a : b));
  return { rankName: eloToRank(best.elo), languageCode: best.language_code, elo: best.elo };
}
