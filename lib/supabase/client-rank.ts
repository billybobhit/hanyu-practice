import type { SupabaseClient } from "@supabase/supabase-js";

export async function getBestAccountElo(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_language_elo")
    .select("elo")
    .eq("user_id", user.id)
    .order("elo", { ascending: false })
    .limit(1);

  return data?.[0]?.elo ?? null;
}
