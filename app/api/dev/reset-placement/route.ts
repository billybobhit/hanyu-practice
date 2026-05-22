import { createClient } from "@/lib/supabase/server";
import { isDev } from "@/lib/dev";

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

  await supabase
    .from("user_language_elo")
    .update({ has_completed_placement: false })
    .eq("user_id", user.id)
    .in("language_code", ["zh-tw", "zh-cn"]);

  return Response.json({ ok: true });
}
