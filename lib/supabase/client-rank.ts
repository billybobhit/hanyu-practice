import type { SupabaseClient } from "@supabase/supabase-js";

export async function getBestAccountElo(
  supabase: SupabaseClient,
  userId?: string
) {
  try {
    const user = userId
      ? { id: userId }
      : (
          await supabase.auth.getSession()
        ).data.session?.user;

    if (!user?.id) return null;

    const { data, error } = await supabase
      .from("user_profiles")
      .select("elo")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.log("[rank] fetch:failed", error);
      return null;
    }

    return typeof data?.elo === "number" ? data.elo : null;
  } catch (error) {
    console.log("[rank] fetch:failed", error);
    return null;
  }
}
