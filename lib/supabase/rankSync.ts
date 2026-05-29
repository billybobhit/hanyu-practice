import type { SupabaseClient } from "@supabase/supabase-js";
import { eloToRank } from "@/lib/elo";

export async function syncUserRank(userId: string, supabase: SupabaseClient) {
  const { data } = await supabase
    .from("user_account_elo")
    .select("elo, rank")
    .eq("user_id", userId);

  const profile = data?.[0];
  if (!profile) return null;

  const elo = Math.max(0, Number(profile.elo ?? 0));
  return {
    rankName: typeof profile.rank === "string" ? profile.rank : eloToRank(elo),
    languageCode: "account",
    elo,
  };
}
