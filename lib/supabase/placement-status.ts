import type { SupabaseClient } from "@supabase/supabase-js";

export type PlacementLanguageCode = "zh-tw" | "zh-cn" | "fr" | "es";

export interface PlacementStatus {
  hasCompletedPlacement: boolean;
  elo: number;
}

export function canTakeStandardPlacement(elo: number): boolean {
  return Math.max(0, Number(elo) || 0) < 250;
}

export function canTakeAdvancedPlacement(elo: number): boolean {
  const safeElo = Math.max(0, Number(elo) || 0);
  return safeElo >= 2100 && safeElo < 3300;
}

export async function getPlacementStatus(
  supabase: SupabaseClient,
  userId: string,
  languageCode: PlacementLanguageCode
): Promise<PlacementStatus> {
  const { data, error } = await supabase
    .from("user_language_elo")
    .select("elo, has_completed_placement")
    .eq("user_id", userId)
    .eq("language_code", languageCode)
    .maybeSingle();

  if (error) {
    console.log("[placement-status] fetch-failed", {
      languageCode,
      userId,
      error,
    });
    return { hasCompletedPlacement: false, elo: 0 };
  }

  const elo = Math.max(0, Number(data?.elo ?? 0));
  // Placement is rank-gated by local language ELO:
  // standard placement only in Noob, advanced placement only in Pro.
  return {
    hasCompletedPlacement: !canTakeStandardPlacement(elo),
    elo,
  };
}
