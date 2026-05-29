import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncUserRank } from "@/lib/supabase/rankSync";
import { isDev } from "@/lib/dev";
import { getRankForElo } from "@/lib/ranks";

export async function POST(req: NextRequest) {
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

  const { languageCode, elo } = await req.json();

  const validLanguages = ["zh-tw", "zh-cn", "fr"];
  if (!validLanguages.includes(languageCode)) {
    return Response.json({ error: "Invalid language" }, { status: 400 });
  }

  const eloAfter = Math.max(0, Math.floor(Number(elo)));
  if (!Number.isFinite(eloAfter)) {
    return Response.json({ error: "Invalid ELO value" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("user_language_elo")
    .select("elo")
    .eq("user_id", user.id)
    .eq("language_code", languageCode)
    .maybeSingle();

  const eloBefore = Math.max(0, Number(existing?.elo) || 0);

  await supabase.from("user_language_elo").upsert(
    {
      user_id: user.id,
      language_code: languageCode,
      elo: eloAfter,
      has_completed_placement: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,language_code" }
  );

  const bestRank = await syncUserRank(user.id, supabase);

  return Response.json({
    ok: true,
    eloSet: eloAfter,
    languageCode,
    bestRankName: bestRank?.rankName,
    rankEvent: {
      eloBefore,
      eloAfter,
      eloChange: eloAfter - eloBefore,
      rankBefore: getRankForElo(eloBefore).name,
      rankAfter: getRankForElo(eloAfter).name,
    },
  });
}
