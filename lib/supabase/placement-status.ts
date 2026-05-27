import type { SupabaseClient } from "@supabase/supabase-js";

export type PlacementLanguageCode = "zh-tw" | "zh-cn";

export interface PlacementStatus {
  hasCompletedPlacement: boolean;
  elo: number;
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

  return {
    hasCompletedPlacement: data?.has_completed_placement === true,
    elo: Math.max(0, Number(data?.elo ?? 0)),
  };
}
