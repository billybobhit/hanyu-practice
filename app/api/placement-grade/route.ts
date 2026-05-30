import { NextRequest } from "next/server";
import { createAiClient, formatAiError, getTextProviderConfig, isRateLimitError } from "@/lib/ai-provider";
import { createClient } from "@/lib/supabase/server";
import { syncUserRank } from "@/lib/supabase/rankSync";
import { RANK_THRESHOLDS, eloToRank } from "@/lib/elo";
import {
  canTakeAdvancedPlacement,
  canTakeStandardPlacement,
} from "@/lib/supabase/placement-status";

const PLACEMENT_ELO_BY_RANK: Record<string, number> = Object.fromEntries(
  RANK_THRESHOLDS.map((r) => [r.name, r.minElo])
);

const MAX_REGULAR_ELO = PLACEMENT_ELO_BY_RANK["Pro"]; // 2100

// Regular placement grades: Pro = A (ceiling), down from there
const REGULAR_PLACEMENT_GRADE_BY_RANK: Record<string, "A" | "B" | "C" | "D" | "F"> = {
  Pro: "A",
  Advanced: "B",
  Intermediate: "C",
  Beginner: "D",
  Noob: "F",
};

// Advanced placement grades: Ethereal+ = A, down to Pro = F (no advancement)
const ADVANCED_PLACEMENT_GRADE_BY_RANK: Record<string, "A" | "B" | "C" | "D" | "F"> = {
  Eternal: "A",
  Master: "A",
  Ethereal: "A",
  Diamond: "B",
  Gold: "C",
  Iron: "D",
  Pro: "F",
};

const PLACEMENT_SCORE_BY_GRADE: Record<"A" | "B" | "C" | "D" | "F", number> = {
  A: 95,
  B: 85,
  C: 70,
  D: 55,
  F: 30,
};

const FAIRNESS_RULE = `FAIRNESS RULE — examples are not checklists:
All vocabulary, connector, idiom, literary, cultural, and structure examples
are illustrative, not required. Do not grade by checking whether the user used
the exact examples listed. Award full credit for equivalent-level language that
serves the same function: contrast, cause/effect, concession, nuance,
hypothesis, abstraction, register control, cultural reasoning, or rhetorical
depth. Do not require any specific connector, idiom, word, author, or example.`;

const RANK_LADDER = `RANK LADDER AND ELO:
- Noob: 0 ELO
- Beginner: 250 ELO
- Intermediate: 650 ELO
- Advanced: 1250 ELO
- Pro: 2100 ELO
- Iron: 3300 ELO
- Gold: 5000 ELO
- Diamond: 7500 ELO
- Ethereal: 11000 ELO
- Master: 16000 ELO
- Eternal: 23000 ELO`;

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

const CHINESE_PLACEMENT_GRADE_PROMPT = `You are evaluating a Mandarin Chinese placement conversation to assign
a starting rank and ELO on the HanYu platform.

HARD CAP: The maximum rank you may award is Pro (2100 ELO).
No matter how strong the performance, do NOT assign Iron or above.
Users who clearly exceed Pro will unlock the advanced placement test
to reach higher ranks. Your job here is only to place up to Pro.

${FAIRNESS_RULE}

RANK LADDER FOR THIS TEST (Noob through Pro only):
- Noob: 0 ELO
- Beginner: 250 ELO
- Intermediate: 650 ELO
- Advanced: 1250 ELO
- Pro: 2100 ELO

RUBRIC — assess the full conversation against these standards:

NOOB (0–249 ELO):
Any genuine Chinese attempt qualifies. Single words, heavy English
mixing, broken sentences — all count. Tone/grammar errors irrelevant.
Fails only if response was entirely English with zero Chinese effort.

BEGINNER (250–649 ELO):
Basic phrases and simple sentences on everyday topics (name, food,
daily routine). English mixing acceptable. Short answers fine.
Vocabulary is HSK 1–2 range.

INTERMEDIATE (650–1249 ELO):
Handles familiar everyday topics in Chinese without needing English.
Short paragraphs, basic opinions, simple descriptions. Grammar
imperfect. HSK 2–3 vocabulary range.

ADVANCED (1250–2099 ELO):
Coherent connected sentences on familiar topics. Makes sense
throughout. No English switching. Some depth on familiar subjects.
Around Chinese 2 curriculum level. HSK 3–4 passive range.

PRO (2100 ELO — CEILING):
2–3 coherent sentences per response. Functional vocabulary beyond
basics. Can hold a decent conversation without English. Some
vocabulary variety. Around Chinese 2–3 curriculum. HSK 4 range.
Award Pro whenever the user clearly exceeds Advanced — do not
try to differentiate above Pro here.

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
- Single words, attempts at phrases, heavy English → Noob (0)
- Simple sentences on daily life, some English mixing → Beginner (250)
- Familiar topics without English, short paragraphs → Intermediate (650)
- Coherent connected sentences, no English switching → Advanced (1250)
- Discusses modern stress with structure, stays in Chinese,
  basic vocab beyond survival level → Pro (2100)

SCORING RULES:
- Be generous at the bottom (Noob–Intermediate): reward effort.
- Anyone who can hold a real conversation without English switching
  and shows some vocabulary range beyond HSK 1–3 → Pro.
- When in doubt between Advanced and Pro, award Pro.
- Assign 2100 ELO for Pro — users earn up from there.

${JSON_OUTPUT_SCHEMA}`;

const FRENCH_PLACEMENT_GRADE_PROMPT = `You are evaluating a French placement conversation to assign
a starting rank and ELO on the HanYu platform.

HARD CAP: The maximum rank you may award is Pro (2100 ELO).
No matter how strong the performance, do NOT assign Iron or above.
Users who clearly exceed Pro will unlock the advanced placement test
to reach higher ranks. Your job here is only to place up to Pro.

${FAIRNESS_RULE}

RANK LADDER FOR THIS TEST (Noob through Pro only):
- Noob: 0 ELO
- Beginner: 250 ELO
- Intermediate: 650 ELO
- Advanced: 1250 ELO
- Pro: 2100 ELO

RUBRIC — assess the full conversation against these standards:

NOOB (0–249 ELO):
Any genuine French attempt qualifies. Single words, broken phrases,
heavy English mixing, and pronunciation/spelling issues all count.
Fails only if response was entirely English with zero French effort.

BEGINNER (250–649 ELO):
A1 survival French. Basic phrases and simple daily-life sentences:
name, routine, food, weather, likes/dislikes. English mixing acceptable.
Short answers are fine if they show real French.

INTERMEDIATE (650–1249 ELO):
A2 to early B1. Handles familiar topics in French, gives short connected
answers, basic opinions, and understandable descriptions. Grammar is
imperfect but meaning is clear.

ADVANCED (1250–2099 ELO):
B1. Produces coherent connected sentences on familiar topics, mostly or
entirely in French. Can explain simple reasons and opinions with some depth.
Major breakdowns or heavy English reliance should keep the rank lower.

PRO (2100 ELO — CEILING):
B1+ to early B2. Can sustain a real conversation in French, explain opinions,
give reasons, and use functional vocabulary beyond survival level. Award Pro
whenever the user clearly exceeds Advanced — do not differentiate above Pro here.

RANK ASSIGNMENT RULE — GRADE THE CEILING, NOT THE FLOOR:
Always assign rank based on the HIGHEST level demonstrated, not weakest moments.
One exceptional response outweighs two average ones. Learners underperform due
to nerves or topic familiarity — their ceiling is their true level.

CONTRADICTION CHECK — mandatory before outputting JSON:
If your strengths list includes ANY of:
- abstract topic handling
- structured argument
- clear expression of opinions
- natural use of discourse markers
- balanced analysis
- nuanced distinction
- cultural understanding
...the rank CANNOT be Noob, Beginner, Intermediate, or Advanced.
These are Pro-minimum indicators.

CALIBRATION ANCHORS:
- Single words, attempts at phrases, heavy English → Noob (0)
- Simple daily-life sentences, some English mixing → Beginner (250)
- Familiar topics without heavy English, short paragraphs → Intermediate (650)
- Coherent connected sentences, mostly French, clear opinions → Advanced (1250)
- Sustained conversation, reasons, functional B1+/B2 vocabulary → Pro (2100)

SCORING RULES:
- Be generous at the bottom (Noob–Intermediate): reward effort.
- Anyone who can hold a real conversation mostly in French and shows vocabulary
  beyond A1/A2 survival level → Pro.
- When in doubt between Advanced and Pro, award Pro.
- Assign 2100 ELO for Pro — users earn up from there.

${JSON_OUTPUT_SCHEMA}`;

const CHINESE_ADVANCED_PLACEMENT_GRADE_PROMPT = `You are evaluating a Mandarin Chinese advanced placement conversation
to assign a new rank and ELO on the HanYu platform. The user is
already at Pro level or above and believes they belong higher.

${RANK_LADDER}

${FAIRNESS_RULE}

RUBRIC — assess the full conversation against these standards:

PRO (2100–3299 ELO):
2–3 coherent sentences per response. Functional vocabulary beyond basics.
Can hold a decent conversation without English. Some vocabulary variety.
Around Chinese 2–3 curriculum. HSK 4 range.

IRON (3300–4999 ELO):
Roughly HSK 4–5. Sustains moderately abstract topics with connected reasoning.
Can discuss opinions, preferences, simple cultural topics, and social issues
without English. Vocabulary moves beyond daily-life basics.

GOLD (5000–7499 ELO):
Roughly HSK 5–6. Handles abstract topics fluently with organized reasoning.
Uses connectors and discourse markers naturally for contrast, cause/effect,
concession, sequence, and clarification. Exact connector examples are not
required. Minor grammar errors are acceptable.

DIAMOND (7500–10999 ELO):
Roughly HSK 6 to early HSK 7–9. High advanced learner / near-native learner.
Can discuss nuance, tradeoffs, social issues, culture, and abstract concepts
with precision. Advanced vocabulary and complex structures should appear
naturally, but exact listed words are not required.

ETHEREAL (11000–15999 ELO):
Strong HSK 7–9 and beyond. Native-like or heritage/native-level richness.
Vocabulary is broad, idiomatic, culturally grounded, and register-aware.
Understands subtext, irony, implicit meaning, and tone. Must sound natural,
not translated or textbook-like.

MASTER (16000–22999 ELO):
Beyond HSK. Educated native standard. Strong diction, elegant phrasing,
natural 成语/四字格 where appropriate, and depth on culture, society,
literature, philosophy, or history. The language should feel polished and
well-read, not merely fluent.

ETERNAL (23000+ ELO):
Beyond HSK. Scholar/literary level. Classical or literary references can be
used accurately and meaningfully. Language shows artistry, rhetoric, precision,
and intellectual depth. A highly educated native may reach Master; Eternal
requires true scholarly command.

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
- 成语 forced or used incorrectly when attempted → note it

HSK VOCABULARY EXPECTATIONS BY RANK (strictly enforced):
- Iron: HSK 4–5 range or equivalent must appear naturally.
- Gold: HSK 5–6 range or equivalent, with organized abstract reasoning.
- Diamond: HSK 6 to early HSK 7–9 range or equivalent. If vocabulary and
  structure stay at HSK 5–6 throughout, place at Gold maximum.
- Ethereal: Strong HSK 7–9 and beyond, with native richness. If vocabulary is
  strong but clearly learner-range, place at Diamond maximum.
- Master: Educated native diction. 成语 natural. 字斟句酌 quality.
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
  (e.g. Diamond = 7500, not 10999) — users earn up from placement.

${JSON_OUTPUT_SCHEMA}`;

const FRENCH_ADVANCED_PLACEMENT_GRADE_PROMPT = `You are evaluating a French advanced placement conversation
to assign a new rank and ELO on the HanYu platform. The user is
already at Pro level or above and believes they belong higher.

${RANK_LADDER}

${FAIRNESS_RULE}

RUBRIC — assess the full conversation against these standards:

PRO (2100–3299 ELO):
B1+ to early B2. Can sustain a real conversation, explain opinions,
give reasons, and use functional vocabulary beyond survival level.
Grammar errors are acceptable if meaning remains clear.

IRON (3300–4999 ELO):
Solid B2-ish French. Can discuss moderately abstract topics without switching
languages. Connected reasoning, clear opinions, some vocabulary range, and
control of common past/future/conditional structures.

GOLD (5000–7499 ELO):
Strong B2 to early C1. Handles abstract topics fluently with structured
reasoning. Uses discourse markers naturally for contrast, cause/effect,
concession, sequencing, and clarification. Exact connector examples are not
required.

DIAMOND (7500–10999 ELO):
C1. High advanced speaker with precision and register awareness. Can discuss
society, culture, education, identity, politics, philosophy, or literature with
nuance. Vocabulary and syntax feel flexible rather than translated.

ETHEREAL (11000–15999 ELO):
C2/native-like. Idiomatic, culturally grounded, flexible register. Understands
French cultural subtext and can discuss complex topics naturally. Can shift
between casual and formal French without awkwardness.

MASTER (16000–22999 ELO):
Educated native standard. Elegant diction, strong rhetorical control, precise
vocabulary, and the ability to discuss literature, philosophy, history, or
society with sophistication. A fluent but plain native speaker should not
automatically reach Master.

ETERNAL (23000+ ELO):
Scholar/literary French. Rare precision, literary references, formal or
academic register, rhetorical artistry, and depth that would impress a highly
educated native speaker. Eternal requires mastery of French as language and
style, not just fluent French.

PHILOSOPHY: Strict but honest. Grade accurately — do not inflate,
but do not punish unfairly either. A strong performance at Gold
level should land at Gold, not Iron. The goal is precision, not
deflation.

RANK ASSIGNMENT RULE — GRADE THE SUSTAINED AVERAGE, NOT THE CEILING:
Unlike regular placement, advanced placement grades on SUSTAINED
performance across the full conversation. One exceptional response
does not override consistently weaker ones. The user should
demonstrate their level consistently across most turns.

WHAT DOES NOT LOWER RANK:
- Minor grammar errors (1–2 per response) → no rank impact
- One weaker turn out of six → no rank impact
- Slightly formal or classroom-like phrasing → minor note only
- Not using a specific connector from the examples → no rank impact

WHAT DOES LOWER RANK:
- Vocabulary consistently stays below the expected CEFR range for
  the rank claimed → drop one rank
- Could not handle the harder turns (turns 4–6) → drop one rank
- Any English switching → drop one rank per instance
- Arguments are surface-level throughout with no depth → drop one rank
- Register is consistently awkward, translated, or unnatural → drop one rank

CEFR EXPECTATIONS BY RANK (strictly enforced):
- Iron: B2-ish range or equivalent must appear naturally.
- Gold: Strong B2 to early C1 range, with organized abstract reasoning.
- Diamond: C1 precision and register awareness. If vocabulary and syntax stay
  at B2 throughout, place at Gold maximum.
- Ethereal: C2/native-like idiom, cultural fluency, and register flexibility.
  If strong but clearly learner-range, place at Diamond maximum.
- Master: Educated native diction and rhetorical control. If native-like but
  not cultivated or elegant, place at Ethereal.
- Eternal: Scholarly/literary register, precise references, and rhetorical
  artistry. If not demonstrably scholarly, place at Master.

FAIR GRADING RULE:
Strict does not mean punishing. If a user genuinely demonstrated Gold-level
French consistently across the conversation, award Gold — do not drop to Iron
just because they did not reach Diamond moments.

SCORING RULES:
- Be strict at the top (Ethereal–Eternal): vocabulary depth, register, and
  diction are the primary differentiators, not just fluency.
- A very strong learner should reach Diamond at most.
  Ethereal requires genuinely native-like idiomatic and cultural richness.
- Master and Eternal require diction that would impress an educated native
  French speaker — not just fluency.
- Do NOT award Eternal or Master unless you saw actual evidence of
  scholar-level or educated-native diction in the conversation.
- Assign the ELO at the BOTTOM of the range for that rank
  (e.g. Diamond = 7500, not 10999) — users earn up from placement.

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

  const validLanguageCode =
    languageCode === "zh-cn" || languageCode === "zh-tw" || languageCode === "fr";

  if (!validLanguageCode) {
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
        `[${m.role === "user" ? "Student" : "Tutor"}]: ${m.content}`
    )
    .join("\n");

  const placementPrompt =
    languageCode === "fr"
      ? isAdvanced
        ? FRENCH_ADVANCED_PLACEMENT_GRADE_PROMPT
        : FRENCH_PLACEMENT_GRADE_PROMPT
      : isAdvanced
        ? CHINESE_ADVANCED_PLACEMENT_GRADE_PROMPT
        : CHINESE_PLACEMENT_GRADE_PROMPT;

  const languageGradingNote =
    languageCode === "fr"
      ? `LANGUAGE NOTE: This is a French placement conversation. Use CEFR-style French standards. Do not assess Chinese characters, tones, pinyin, HSK levels, or Chinese-specific markers.`
      : `LANGUAGE NOTE: This is a Mandarin Chinese placement conversation. Use HSK-informed Chinese standards for the requested Chinese variant.`;

  const prompt = `${placementPrompt}\n\n${languageGradingNote}\n\nConversation:\n${conversation}`;

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
  const rawTargetElo = PLACEMENT_ELO_BY_RANK[placedRank] ?? 0;
  const targetElo = isAdvanced ? rawTargetElo : Math.min(rawTargetElo, MAX_REGULAR_ELO);
  const eloAfter = isAdvanced ? Math.max(currentElo, targetElo) : targetElo;
  const eloChange = Math.max(0, eloAfter - currentElo);
  const finalRank = eloToRank(eloAfter);
  const gradeMap = isAdvanced ? ADVANCED_PLACEMENT_GRADE_BY_RANK : REGULAR_PLACEMENT_GRADE_BY_RANK;
  const overallGrade = gradeMap[finalRank] ?? "F";
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
    rankName: finalRank,
    globalEloSum,
    bestRankName: bestRank?.rankName ?? eloToRank(eloAfter),
  });
}
