export type PlacementMode = "standard" | "advanced";

export const STANDARD_PLACEMENT_REQUIRED_TURNS = 4;
export const ADVANCED_PLACEMENT_REQUIRED_TURNS = 6;

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

export function getPlacementRequiredTurns(mode: PlacementMode) {
  return mode === "advanced"
    ? ADVANCED_PLACEMENT_REQUIRED_TURNS
    : STANDARD_PLACEMENT_REQUIRED_TURNS;
}

export function getPlacementTitle(mode: PlacementMode, languageLabel: string) {
  return mode === "advanced"
    ? `Advanced Placement Assessment · ${languageLabel}`
    : `Placement Assessment · ${languageLabel}`;
}
