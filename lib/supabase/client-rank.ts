import type { SupabaseClient } from "@supabase/supabase-js";

export async function getBestAccountElo(supabase: SupabaseClient) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) return null;

    const { data, error } = await supabase
      .from("user_language_elo")
      .select("elo")
      .eq("user_id", user.id)
      .order("elo", { ascending: false })
      .limit(1);

    if (error) {
      console.log("[rank] fetch:failed", error);
      return null;
    }

    return data?.[0]?.elo ?? null;
  } catch (error) {
    console.log("[rank] fetch:failed", error);
    return null;
  }
}
