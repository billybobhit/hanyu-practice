import { NextRequest } from "next/server";
import { createAiClient, formatAiError, getTextProviderConfig, isRateLimitError } from "@/lib/ai-provider";
import { createClient } from "@/lib/supabase/server";
import { syncUserRank } from "@/lib/supabase/rankSync";
import { eloToRank } from "@/lib/elo";
import {
  canTakeAdvancedPlacement,
  canTakeStandardPlacement,
} from "@/lib/supabase/placement-status";

const PLACEMENT_ELO_BY_RANK: Record<string, number> = {
  Noob: 0,
  Beginner: 150,
  Intermediate: 400,
  Advanced: 800,
  Pro: 1400,
  Iron: 2200,
  Gold: 3300,
  Diamond: 4800,
  Ethereal: 7000,
  Master: 11000,
  Eternal: 18000,
};

const PLACEMENT_GRADE_BY_RANK: Record<string, "A" | "B" | "C" | "D" | "F"> = {
  Eternal: "A",
  Master: "A",
  Ethereal: "A",
  Diamond: "B",
  Gold: "B",
  Iron: "C",
  Pro: "C",
  Advanced: "C",
  Intermediate: "D",
  Beginner: "D",
  Noob: "F",
};

const PLACEMENT_SCORE_BY_GRADE: Record<"A" | "B" | "C" | "D" | "F", number> = {
  A: 95,
  B: 85,
  C: 70,
  D: 55,
  F: 30,
};

const SHARED_RANK_RUBRIC = `RANK LADDER AND ELO:
- Noob: 0 ELO
- Beginner: 150 ELO
- Intermediate: 400 ELO
- Advanced: 800 ELO
- Pro: 1400 ELO
- Iron: 2200 ELO
- Gold: 3300 ELO
- Diamond: 4800 ELO
- Ethereal: 7000 ELO
- Master: 11000 ELO
- Eternal: 18000 ELO

RUBRIC — assess the full conversation against these standards:

NOOB (0–149 ELO):
Any genuine Chinese attempt qualifies. Single words, heavy English
mixing, broken sentences — all count. Tone/grammar errors irrelevant.
Fails only if response was entirely English with zero Chinese effort.

BEGINNER (150–399 ELO):
Basic phrases and simple sentences on everyday topics (name, food,
daily routine). English mixing acceptable. Short answers fine.
Vocabulary is HSK 1–2 range.

INTERMEDIATE (400–799 ELO):
Handles familiar everyday topics in Chinese without needing English.
Short paragraphs, basic opinions, simple descriptions. Grammar
imperfect. HSK 2–3 vocabulary range.

ADVANCED (800–1399 ELO):
Coherent connected sentences on familiar topics. Makes sense
throughout. No English switching. Some depth on familiar subjects.
Around Chinese 2 curriculum level. HSK 3–4 passive range.

PRO (1400–2199 ELO):
2–3 coherent sentences per response. Functional vocabulary beyond
basics. Can hold a decent conversation without English. Some
vocabulary variety. Around Chinese 2–3 curriculum. HSK 4 range.

IRON (2200–3299 ELO):
3+ coherent sentences. Moderately abstract topics (opinions, cultural
topics) handled without English. HSK 4–5 vocabulary appearing
naturally — words like 影响, 环境, 态度, 经验, 发展 used correctly
in context. Connected argument, not just strung fragments.

GOLD (3300–4799 ELO):
Fluent multi-sentence responses on abstract topics. Appropriate
connectors used (不仅...而且, 虽然...但是, 从而, 反而, 尽管).
HSK 5–6 vocabulary appearing naturally — 促进, 导致, 逐渐, 强调,
矛盾, 具体. No English. Minor grammar errors acceptable.

DIAMOND (4800–6999 ELO):
At or above HSK 6, approaching HSK 7–9 territory. Near-native flow.
Advanced vocabulary appearing naturally — 权衡, 折射, 内卷,
潜移默化, 付诸实践, 语境, 集体反思. Appropriate 成语 usage when
natural. Near-native register awareness. Zero English tolerated.

ETHEREAL (7000–10999 ELO):
Native level with genuinely rich vocabulary — a well-read, articulate
native speaker with 10+ years exposure. HSK 7–9 and beyond:
蕴含, 渗透, 诠释, 凸显, 衍生, 勾勒, 深邃, 宏观, 微妙, 架构 used
precisely and naturally. 成语 natural and accurate. Register
flexibility between casual and formal. Cultural insider knowledge —
understands subtext, irony, implicit meaning. No code-switching.

MASTER (11000–17999 ELO):
Educated, articulate native with impressive diction — 文化人 standard.
Loquacious and lexically rich: 斟酌, 意蘊, 娓娓道来, 字斟句酌,
旁征博引, 言简意赅. 成语 and 四字格 woven in naturally. Can discuss
philosophy, culture, literature with precision and style.
An inarticulate native scores C here — this is for well-spoken,
well-read natives with strong diction.

ETERNAL (18000 ELO):
Native scholar level. Classical allusions and archaic structures
handled naturally and deployed with purpose. Diction is extraordinary
— rare, precise, beautiful choices a standard native would admire.
成語, 四字格, 歇後語, 典故 all in repertoire. Academic and formal
register fully available. Responses show linguistic artistry, not just
correctness — rhythm, rhetoric, stylistic awareness.
An educated articulate native gets B here. Only true language scholars
sustain A at Eternal.`;

const JSON_OUTPUT_SCHEMA = `Output ONLY this JSON, no prose before or after:
{
  "rank": "one of the 11 rank names exactly as spelled above",
  "elo": starting ELO number for that rank,
  "reasoning": "2–3 sentences in English explaining the placement",
  "strengths": ["up to 3 specific things they demonstrated well"],
  "areasToImprove": ["up to 3 specific gaps or missing competencies"],
  "rankFeedback": "one sentence on what to work on to reach the next rank"
}

Do NOT include any text outside the JSON block.`;

const PLACEMENT_GRADE_PROMPT = `You are evaluating a Mandarin Chinese placement conversation to assign
a starting rank and ELO on the HanYu platform.

${SHARED_RANK_RUBRIC}

RANK ASSIGNMENT RULE — GRADE THE CEILING, NOT THE FLOOR:
Always assign rank based on the HIGHEST level demonstrated, not
weakest moments. One exceptional response outweighs two average ones.
Learners underperform due to nerves or topic familiarity — their
ceiling is their true level.

CONTRADICTION CHECK — mandatory before outputting JSON:
If your strengths list includes ANY of:
- "abstract topic handling"
- "structured argument"
- "clear expression of opinions"
- "good use of connectors"
- "balanced analysis"
- "nuanced distinction"
- "cultural understanding"
...the rank CANNOT be Noob, Beginner, Intermediate, or Advanced.
These are Pro-minimum indicators.

WHAT DOES NOT LOWER RANK:
- Some grammar errors → never drops more than one rank
- Occasional simple sentences mixed with complex ones → irrelevant
- Vocabulary could be more varied → only relevant at Diamond and above
- Shorter answers on some turns → grade the best turns

WHAT DOES LOWER RANK:
- Heavy English switching → significant drop
- Could not sustain the topic → significant drop
- Responses were mostly single sentences with no development → drop
- Vocabulary stayed entirely at HSK 1–3 throughout → drop

CALIBRATION ANCHORS:
- Discusses modern stress with 第一/第二/第三 structure, stays in
  Chinese, basic vocab → Pro (1400)
- Discusses tech and relationships with 反而/即使/另外, balanced
  argument, vocab includes 依賴/表面/陪伴 → Iron (2200)
- Distinguishes 面子 vs 尊嚴 conceptually with conflict scenario,
  uses 外在/內在 framework, culturally grounded → Gold (3300)
- Handles 内卷 as sociological phenomenon, uses 折射/結構性/
  集體焦慮, connects individual to systemic → Diamond (4800)

SCORING RULES:
- Be generous at the bottom (Noob–Intermediate): reward effort.
- Be strict at the top (Ethereal–Eternal): vocabulary depth and
  diction are the primary differentiators, not just fluency.
- A very strong learner should reach Diamond at most.
  Ethereal requires genuinely native-level vocab richness.
- Master and Eternal require diction that would impress an educated
  native Chinese speaker — not just fluency.
- Do NOT award Eternal or Master unless you saw actual evidence of
  scholarly or native-educated diction in the conversation.
- Assign the ELO at the BOTTOM of the range for that rank
  (e.g. Diamond = 4800, not 6999) — users earn up from placement.

${JSON_OUTPUT_SCHEMA}`;

const ADVANCED_PLACEMENT_GRADE_PROMPT = `You are evaluating a Mandarin Chinese advanced placement conversation
to assign a new rank and ELO on the HanYu platform. The user is
already at Pro level or above and believes they belong higher.

${SHARED_RANK_RUBRIC}

PHILOSOPHY: Strict but honest. Grade accurately — do not inflate,
but do not punish unfairly either. A strong performance at Gold
level should land at Gold, not Iron. The goal is precision, not
deflation.

RANK ASSIGNMENT RULE — GRADE THE SUSTAINED AVERAGE, NOT THE CEILING:
Unlike regular placement, advanced placement grades on SUSTAINED
performance across the full conversation. One exceptional response
does not override consistently weaker ones. The user should
demonstrate their level consistently across most turns.

CONTRADICTION CHECK — mandatory before outputting JSON:
The rank assigned must be consistent with the feedback given.
If strengths include abstract topic handling and nuanced analysis,
rank cannot be below Pro. If gaps include shallow vocabulary and
simple structures throughout, rank cannot be above Iron.

WHAT DOES NOT LOWER RANK:
- Minor grammar errors (1–2 per response) → no rank impact
- One weaker turn out of six → no rank impact
- Slightly formal or textbook-sounding phrasing → minor note only

WHAT DOES LOWER RANK:
- Vocabulary consistently stays below the expected HSK range for
  the rank claimed → drop one rank
- Could not handle the harder turns (turns 4–6) → drop one rank
- Any English switching → drop one rank per instance
- Arguments are surface-level throughout with no depth → drop one rank
- 成語 forced or used incorrectly when attempted → note it

HSK VOCABULARY EXPECTATIONS BY RANK (strictly enforced):
- Iron/Gold: HSK 4–6 range must appear naturally. If vocabulary
  stays at HSK 3 throughout, cannot place above Pro.
- Diamond: HSK 6–7 must appear. 权衡, 折射, 潜移默化, 语境 etc.
  If absent throughout, cannot place at Diamond.
- Ethereal: HSK 7–9 must appear with native richness. 蕴含, 渗透,
  诠释, 凸显, 深邃 etc. Native flow required. If vocabulary is strong
  but clearly learner-range, place at Diamond maximum.
- Master: Educated native diction. 成語 natural. 字斟句酌 quality.
  If native but not loquacious, place at Ethereal.
- Eternal: Scholarly register. Classical references deployed naturally.
  Rhetorical awareness. If not demonstrably scholarly, place at Master.

FAIR GRADING RULE:
Strict does not mean punishing. If a user genuinely demonstrated
Gold-level Chinese consistently across the conversation, award Gold —
do not drop to Iron just because they did not reach Diamond moments.
The goal is accurate placement, not deflation.

SCORING RULES:
- Be strict at the top (Ethereal–Eternal): vocabulary depth and
  diction are the primary differentiators, not just fluency.
- A very strong learner should reach Diamond at most.
  Ethereal requires genuinely native-level vocab richness.
- Master and Eternal require diction that would impress an educated
  native Chinese speaker — not just fluency.
- Do NOT award Eternal or Master unless you saw actual evidence of
  scholarly or native-educated diction in the conversation.
- Assign the ELO at the BOTTOM of the range for that rank
  (e.g. Diamond = 4800, not 6999) — users earn up from placement.

${JSON_OUTPUT_SCHEMA}`;

function normalizePlacementRank(value: unknown) {
  const rank = Object.keys(PLACEMENT_ELO_BY_RANK).find(
    (entry) => entry.toLowerCase() === String(value ?? "").trim().toLowerCase()
  );
  return rank ?? "Noob";
}

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
  const placedRank = normalizePlacementRank(gradeData.rank);
  const promptElo = Math.max(0, Number(gradeData.elo) || 0);
  const targetElo = PLACEMENT_ELO_BY_RANK[placedRank] ?? promptElo;
  const eloAfter = isAdvanced ? Math.max(currentElo, targetElo) : targetElo;
  const eloChange = Math.max(0, eloAfter - currentElo);
  const overallGrade = PLACEMENT_GRADE_BY_RANK[eloToRank(eloAfter)] ?? "F";
  const overallScore = PLACEMENT_SCORE_BY_GRADE[overallGrade];

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
    rank: eloToRank(eloAfter),
    elo: eloAfter,
    overallGrade,
    overallScore,
    referenceLevel: `${eloToRank(eloAfter)} placement: ${gradeData.reasoning ?? "Placement completed."}`,
    improvements: gradeData.areasToImprove ?? [],
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
