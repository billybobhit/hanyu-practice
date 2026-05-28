import OpenAI from "openai";
import { NextRequest } from "next/server";
import { OPENROUTER_TEXT_FALLBACK_MODELS } from "@/lib/openrouter-models";
import { createClient } from "@/lib/supabase/server";
import { syncUserRank } from "@/lib/supabase/rankSync";
import { eloToRank } from "@/lib/elo";
import {
  ADVANCED_PLACEMENT_ELO,
  PLACEMENT_STARTING_ELO,
  type PlacementMode,
} from "@/lib/placement";

const STANDARD_PLACEMENT_GRADE_PROMPT = `You are grading a Chinese language placement assessment conversation. Based on the conversation, determine the student's proficiency level.

Return ONLY valid JSON:
{
  "overallGrade": <"A" | "B" | "C" | "D" | "F">,
  "overallScore": <integer 0-100>,
  "referenceLevel": <one English sentence describing what level this demonstrates, e.g. "Solid Intermediate (HSK 3-4) with strong vocabulary and natural sentence flow.">,
  "strengths": [<2-3 English strings about what they did well>],
  "improvements": [<2-3 English strings about what to work on>]
}

Grade scale:
- A (90-100): Advanced/Pro level — fluid conversation, rich vocabulary, no English mixing, handles complex topics
- B (75-89): Intermediate level — holds conversation on familiar topics, minor errors, some depth
- C (60-74): Basic/Elementary level — understands and responds to simple questions, limited vocabulary
- D (45-59): Beginner level — very limited Chinese, heavy English mixing, basic greetings only
- F (0-44): No placement — could not respond in Chinese or showed no comprehension`;

const ADVANCED_PLACEMENT_GRADE_PROMPT = `You are grading an advanced Chinese placement assessment. The student already reached Pro on the standard placement, so this assessment decides whether they should be placed higher.

Return ONLY valid JSON:
{
  "overallGrade": <"A" | "B" | "C" | "D" | "F">,
  "overallScore": <integer 0-100>,
  "referenceLevel": <one English sentence describing the demonstrated level, e.g. "Diamond-level: sustained abstract discussion with strong vocabulary but not near-native idiomatic control.">,
  "strengths": [<2-3 English strings about what they did well>],
  "improvements": [<2-3 English strings about what to work on>]
}

Advanced grade scale:
- A (90-100): Ethereal — near-native everyday fluency, natural phrasing, nuanced abstract discussion, idiomatic control
- B (75-89): Diamond — strong advanced speaker, handles abstract topics with varied vocabulary and natural transitions
- C (60-74): Gold — solid advanced classroom speaker, clear multi-sentence answers but not consistently natural
- D (45-59): Iron — can sustain a real conversation, but vocabulary/range is limited for advanced placement
- F (0-44): Pro — remains Pro; does not yet show enough advanced control to move higher`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.groqkey;
  if (!apiKey) {
    return Response.json({ error: "Server misconfigured: missing API key" }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, languageCode, mode } = await req.json();
  const placementMode: PlacementMode = mode === "advanced" ? "advanced" : "standard";

  if (!languageCode) {
    return Response.json({ error: "languageCode required" }, { status: 400 });
  }

  const { data: currentRow } = await supabase
    .from("user_language_elo")
    .select("elo")
    .eq("user_id", user.id)
    .eq("language_code", languageCode)
    .maybeSingle();

  const eloBefore = Math.max(0, Number(currentRow?.elo ?? 0));

  if (placementMode === "advanced" && eloBefore < 2100) {
    return Response.json(
      { error: "Advanced placement requires Pro rank first" },
      { status: 403 }
    );
  }

  const client = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });

  const conversation = messages
    .map(
      (m: { role: string; content: string }) =>
        `[${m.role === "user" ? "学生" : "老师"}]: ${m.content}`
    )
    .join("\n");

  const prompt = `${
    placementMode === "advanced"
      ? ADVANCED_PLACEMENT_GRADE_PROMPT
      : STANDARD_PLACEMENT_GRADE_PROMPT
  }\n\nConversation:\n${conversation}`;

  let text = "";
  let lastError: unknown;

  for (const model of OPENROUTER_TEXT_FALLBACK_MODELS) {
    try {
      const response = await client.chat.completions.create({
        model,
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      });
      text = response.choices[0]?.message?.content ?? "";
      lastError = undefined;
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError) {
    const msg = lastError instanceof Error ? lastError.message : String(lastError);
    return Response.json({ error: msg }, { status: 502 });
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return Response.json({ error: "Failed to parse placement grade" }, { status: 500 });
  }

  const gradeData = JSON.parse(jsonMatch[0]);
  const grade: string = gradeData.overallGrade ?? "F";
  const eloByGrade =
    placementMode === "advanced" ? ADVANCED_PLACEMENT_ELO : PLACEMENT_STARTING_ELO;
  const targetElo = eloByGrade[grade] ?? 0;

  const eloAfter =
    placementMode === "advanced" ? Math.max(eloBefore, targetElo) : targetElo;
  const eloChange = Math.max(0, eloAfter - eloBefore);

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

  const { data: allRows } = await supabase
    .from("user_language_elo")
    .select("elo")
    .eq("user_id", user.id);

  const globalEloSum = allRows?.reduce((sum, row) => sum + (row.elo ?? 0), 0) ?? eloAfter;

  return Response.json({
    ...gradeData,
    startingElo: eloChange,
    placementMode,
    targetElo,
    eloBefore,
    eloAfter,
    eloChange,
    rankName: eloToRank(eloAfter),
    globalEloSum,
    bestRankName: bestRank?.rankName ?? eloToRank(eloAfter),
  });
}
