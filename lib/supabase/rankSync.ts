import type { SupabaseClient } from "@supabase/supabase-js";
import { getBestLanguageRank } from "@/lib/elo";

export async function syncUserRank(userId: string, supabase: SupabaseClient) {
  const { data } = await supabase
    .from("user_language_elo")
    .select("language_code, elo")
    .eq("user_id", userId);

  if (!data?.length) return null;
  return getBestLanguageRank(data);
}
