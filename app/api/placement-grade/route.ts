import { NextRequest } from "next/server";
import { createAiClient, formatAiError, getTextProviderConfig, isRateLimitError } from "@/lib/ai-provider";
import { createClient } from "@/lib/supabase/server";
import { syncUserRank } from "@/lib/supabase/rankSync";
import { ADVANCED_PLACEMENT_ELO, PLACEMENT_STARTING_ELO, eloToRank } from "@/lib/elo";
import {
  canTakeAdvancedPlacement,
  canTakeStandardPlacement,
} from "@/lib/supabase/placement-status";

const PLACEMENT_GRADE_PROMPT = `You are grading a Chinese language placement assessment conversation. Based on the conversation, determine the student's proficiency level.

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

const ADVANCED_PLACEMENT_GRADE_PROMPT = `You are grading an advanced Chinese placement assessment for a student who already reached Pro.

Return ONLY valid JSON:
{
  "overallGrade": <"A" | "B" | "C" | "D" | "F">,
  "overallScore": <integer 0-100>,
  "referenceLevel": <one English sentence describing what upper-echelon level this demonstrates, e.g. "Diamond-level: strong abstract discussion with varied vocabulary and natural transitions.">,
  "strengths": [<2-3 English strings about what they did well>],
  "improvements": [<2-3 English strings about what to work on>]
}

Advanced placement scale:
- A (90-100): Ethereal — near-native everyday fluency, natural phrasing, nuanced abstract discussion, idiomatic control
- B (75-89): Diamond — strong advanced speaker, handles abstract topics with varied vocabulary and natural transitions
- C (60-74): Gold — rich classroom/heritage-speaker level, clear multi-sentence answers, good vocabulary, not fully natural yet
- D (45-59): Iron — can sustain real conversation, but lacks range and precision for higher advanced placement
- F (0-44): Pro — remains Pro; does not demonstrate upper-echelon control yet`;

export async function POST(req: NextRequest) {
  const provider = getTextProviderConfig();
  if (!provider.apiKey) {
    return Response.json(
      { error: `Server misconfigured: missing ${provider.providerName} API key` },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, languageCode, mode } = await req.json();
  const isAdvanced = mode === "advanced";

  if (!languageCode) {
    return Response.json({ error: "languageCode required" }, { status: 400 });
  }

  const { data: currentRow } = await supabase
    .from("user_language_elo")
    .select("elo")
    .eq("user_id", user.id)
    .eq("language_code", languageCode)
    .maybeSingle();

  const currentElo = Math.max(0, Number(currentRow?.elo ?? 0));
  if (isAdvanced && !canTakeAdvancedPlacement(currentElo)) {
    return Response.json(
      { error: "Advanced placement is only available at Pro local language ELO" },
      { status: 403 }
    );
  }

  if (!isAdvanced && !canTakeStandardPlacement(currentElo)) {
    return Response.json(
      { error: "Standard placement is only available at Noob local language ELO" },
      { status: 403 }
    );
  }

  const client = createAiClient({ baseURL: provider.baseURL, apiKey: provider.apiKey });

  const conversation = messages
    .map(
      (m: { role: string; content: string }) =>
        `[${m.role === "user" ? "学生" : "老师"}]: ${m.content}`
    )
    .join("\n");

  const prompt = `${isAdvanced ? ADVANCED_PLACEMENT_GRADE_PROMPT : PLACEMENT_GRADE_PROMPT}\n\nConversation:\n${conversation}`;

  let text = "";
  let lastError: unknown;
  let lastModel: string | undefined;

  for (const model of provider.models) {
    lastModel = model;
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
      if (!isRateLimitError(err)) break;
    }
  }

  if (lastError) {
    const msg = formatAiError(provider, lastModel, lastError);
    return Response.json({ error: msg }, { status: 502 });
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return Response.json({ error: "Failed to parse placement grade" }, { status: 500 });
  }

  const gradeData = JSON.parse(jsonMatch[0]);
  const grade: string = gradeData.overallGrade ?? "F";
  const targetElo = isAdvanced
    ? ADVANCED_PLACEMENT_ELO[grade] ?? 2100
    : PLACEMENT_STARTING_ELO[grade] ?? 0;
  const eloAfter = isAdvanced ? Math.max(currentElo, targetElo) : targetElo;
  const eloChange = Math.max(0, eloAfter - currentElo);

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
    eloBefore: currentElo,
    eloAfter,
    eloChange,
    placementMode: isAdvanced ? "advanced" : "standard",
    rankName: eloToRank(eloAfter),
    globalEloSum,
    bestRankName: bestRank?.rankName ?? eloToRank(eloAfter),
  });
}
