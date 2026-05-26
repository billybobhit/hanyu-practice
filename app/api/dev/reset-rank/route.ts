import { createClient } from "@/lib/supabase/server";
import { isDev } from "@/lib/dev";
import { syncUserRank } from "@/lib/supabase/rankSync";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_dev")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.is_dev && !isDev(user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabase.from("user_language_elo").upsert(
    [
      { user_id: user.id, language_code: "zh-cn", elo: 0, has_completed_placement: false, updated_at: new Date().toISOString() },
      { user_id: user.id, language_code: "zh-tw", elo: 0, has_completed_placement: false, updated_at: new Date().toISOString() },
    ],
    { onConflict: "user_id,language_code" }
  );

  const bestRank = await syncUserRank(user.id, supabase);
  return Response.json({ ok: true, bestRankName: bestRank?.rankName });
}
