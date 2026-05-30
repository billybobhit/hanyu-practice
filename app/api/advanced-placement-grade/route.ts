import { NextRequest } from "next/server";
import { createAiClient, formatAiError, getTextProviderConfig, isRateLimitError } from "@/lib/ai-provider";
import { createClient } from "@/lib/supabase/server";
import { syncUserRank } from "@/lib/supabase/rankSync";
import { RANK_THRESHOLDS, eloToRank } from "@/lib/elo";
import { canTakeAdvancedPlacement } from "@/lib/supabase/placement-status";

const PLACEMENT_ELO_BY_RANK: Record<string, number> = Object.fromEntries(
  RANK_THRESHOLDS.map((r) => [r.name, r.minElo])
);

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

const SHARED_RANK_RUBRIC = `RANK LADDER AND ELO:
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
- Eternal: 23000 ELO

RUBRIC — assess the full conversation against these standards:

PRO (2100–3299 ELO):
2–3 coherent sentences per response. Functional vocabulary beyond
basics. Can hold a decent conversation without English. Some
vocabulary variety. Around Chinese 2–3 curriculum. HSK 4 range.

IRON (3300–4999 ELO):
3+ coherent sentences. Moderately abstract topics (opinions, cultural
topics) handled without English. HSK 4–5 vocabulary appearing
naturally — words like 影响, 环境, 态度, 经验, 发展 used correctly
in context. Connected argument, not just strung fragments.

GOLD (5000–7499 ELO):
Fluent multi-sentence responses on abstract topics. Appropriate
connectors used (不仅...而且, 虽然...但是, 从而, 反而, 尽管).
HSK 5–6 vocabulary appearing naturally — 促进, 导致, 逐渐, 强调,
矛盾, 具体. No English. Minor grammar errors acceptable.

DIAMOND (7500–10999 ELO):
At or above HSK 6, approaching HSK 7–9 territory. Near-native flow.
Advanced vocabulary appearing naturally — 权衡, 折射, 内卷,
潜移默化, 付诸实践, 语境, 集体反思. Appropriate 成语 usage when
natural. Near-native register awareness. Zero English tolerated.

ETHEREAL (11000–15999 ELO):
Native level with genuinely rich vocabulary — a well-read, articulate
native speaker with 10+ years exposure. HSK 7–9 and beyond:
蕴含, 渗透, 诠释, 凸显, 衍生, 勾勒, 深邃, 宏观, 微妙, 架构 used
precisely and naturally. 成语 natural and accurate. Register
flexibility between casual and formal. Cultural insider knowledge —
understands subtext, irony, implicit meaning. No code-switching.

MASTER (16000–22999 ELO):
Educated, articulate native with impressive diction — 文化人 standard.
Loquacious and lexically rich: 斟酌, 意蘊, 娓娓道来, 字斟句酌,
旁征博引, 言简意赅. 成语 and 四字格 woven in naturally. Can discuss
philosophy, culture, literature with precision and style.
An inarticulate native scores C here — this is for well-spoken,
well-read natives with strong diction.

ETERNAL (23000+ ELO):
Native scholar level. Classical allusions and archaic structures
handled naturally and deployed with purpose. Diction is extraordinary
— rare, precise, beautiful choices a standard native would admire.
成語, 四字格, 歇後語, 典故 all in repertoire. Academic and formal
register fully available. Responses show linguistic artistry, not just
correctness — rhythm, rhetoric, stylistic awareness.
An educated articulate native gets B here. Only true language scholars
sustain A at Eternal.`;

const CHINESE_CALIBRATION_ANCHORS = `CHINESE CALIBRATION ANCHORS:
- Iron: Gives opinions on modern life topics (压力, 科技) with connected
  sentences. Vocabulary stays in HSK 4–5 range. No 成语. Basic connectors only.
- Gold: Handles abstract topics with HSK 5–6 vocabulary naturally
  (不仅...而且, 从而). Can express structured opinions. Minor grammar errors fine.
  Example competency: explains why tech affects relationships with supporting reasons.
- Diamond: Engages with culturally loaded concepts (内卷, 面子 vs 尊严) at a
  conceptual level with near-native vocabulary. Uses 成语 naturally when fitting.
  HSK 6–7+ range. Can distinguish near-synonyms meaningfully.
  Example competency: articulates the social structure behind 内卷 with precision.
- Ethereal: Applies classical Chinese references (韩愈, 论语, 唐诗) conceptually
  to modern questions — not just quoting but using them to reason. Accurate
  knowledge of the reference is required. Native richness: HSK 7–9 vocabulary,
  nuanced register shifts, insider cultural subtext.
  Example competency: engages with 「师者，所以传道受业解惑也」 and applies it
  meaningfully to AI education with stylistic awareness.
- Master: Loquacious, well-read native diction. 旁征博引 quality — draws on
  multiple domains (literature, history, philosophy) naturally within a response.
  字斟句酌 precision: word choices are deliberate and elegant.
- Eternal: Scholarly. Classical structures deployed with rhetorical intent.
  Archaic constructions (之乎者也 register awareness), rare 典故, 歇後語 used
  with precision and purpose. A standard educated native would admire the diction.

CRITICAL RULE — ETHEREAL FLOOR:
If the user accurately applies a canonical classical Chinese author or text
(韩愈, 杜甫, 论语, 道德经, 诗经, etc.) conceptually — not just quoting but
using it to reason about the question — the minimum placement is Ethereal (11000).
No exceptions. Accurate canonical knowledge at this level is the hallmark of
native literary education.

CONTRADICTION CHECK — CHINESE (mandatory before outputting JSON):
If strengths include ANY of:
- "classical reference" or "classical allusion"
- "literary or philosophical references"
- "conceptual application of canonical works"
- "academic register"
- "cultural insider knowledge"
- "near-synonyms distinguished" (e.g. 面子 vs 尊严)
- "成语 used accurately"
...the rank CANNOT be below Diamond (7500). These are Diamond-minimum indicators.
If the reference is to a canonical classical author/text applied conceptually,
the rank CANNOT be below Ethereal (11000).`;

const FRENCH_CALIBRATION_ANCHORS = `FRENCH CALIBRATION ANCHORS:
- Iron: Gives opinions on everyday topics (le stress, la technologie) in connected
  sentences with B1–B2 vocabulary. Basic connectors (mais, parce que, donc).
  Grammar imperfect but communicates. No sophisticated register awareness.
- Gold: Handles abstract topics with B2-level connectors (non seulement...mais aussi,
  bien que, en revanche, par conséquent). Expresses structured opinions with support.
  Vocabulary range beyond survival French. Minor grammar errors acceptable.
  Example competency: explains why technology affects human relationships with
  supporting arguments in fluent French.
- Diamond: Engages with culturally loaded concepts (laïcité, mai 68, identité
  nationale, République) at a conceptual level with C1 vocabulary and register
  awareness. Can distinguish near-synonyms and navigate formal/informal registers.
  Accurate cultural knowledge demonstrated.
  Example competency: articulates the tension between laïcité and religious
  pluralism with precision and appropriate vocabulary.
- Ethereal: Applies canonical French literary or philosophical authors
  (Montaigne, Descartes, Rousseau, Voltaire, Sartre, Camus, Simone de Beauvoir,
  Foucault, Bourdieu, Flaubert, Proust, etc.) conceptually to modern questions
  — not just naming them but using their ideas to reason. Accurate knowledge of
  the work is required. Native richness: C1–C2 vocabulary, nuanced register,
  rhetorical awareness.
  Example competency: uses Sartre's concept of mauvaise foi to analyze a modern
  social phenomenon with stylistic grace.
- Master: Rhetorical elegance. Well-read native diction with impressive lexical
  range: draws on literary, historical, and philosophical domains naturally.
  Word choices are deliberate and elegant — a cultivated French speaker.
  Subjunctive, conditional, and complex subordination used correctly and
  naturally throughout.
- Eternal: Scholarly register. Rare literary or archaic constructions deployed
  with rhetorical intent. Precise, beautiful French a standard educated native
  would admire. Academic writing register fully available — hypotaxe, périphrase,
  citations integrated fluidly. True scholar of the language.

CRITICAL RULE — ETHEREAL FLOOR (French):
If the user accurately applies a canonical French literary or philosophical author
(Montaigne, Sartre, Camus, Foucault, de Beauvoir, Proust, Rousseau, Flaubert,
Bourdieu, etc.) conceptually — not just naming but using their ideas to reason
about the question — the minimum placement is Ethereal (11000).
No exceptions. Accurate application of canonical works at this level is the
hallmark of a literary education in French.

CONTRADICTION CHECK — FRENCH (mandatory before outputting JSON):
If strengths include ANY of:
- "literary or philosophical references"
- "application of canonical French works"
- "academic register"
- "cultural insider knowledge" (laïcité, mai 68, republican values, etc.)
- "rhetorical awareness"
- "conceptual depth"
- "sophisticated register"
...the rank CANNOT be below Diamond (7500). These are Diamond-minimum indicators.
If the reference is to a canonical French author or philosopher applied
conceptually, the rank CANNOT be below Ethereal (11000).`;

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

const ADVANCED_PLACEMENT_GRADE_PROMPT = `You are evaluating an advanced language placement conversation
to assign a new rank and ELO on the HanYu platform. The user is
already at Pro level or above and believes they belong higher.

${SHARED_RANK_RUBRIC}

LANGUAGE DETECTION:
Detect whether this is a Chinese or French conversation from the conversation
content. Apply the corresponding calibration anchors below.

${CHINESE_CALIBRATION_ANCHORS}

${FRENCH_CALIBRATION_ANCHORS}

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
- Slightly formal or textbook-sounding phrasing → minor note only

WHAT DOES LOWER RANK:
- Vocabulary consistently stays below the expected range for
  the rank claimed → drop one rank
- Could not handle the harder turns (turns 4–6) → drop one rank
- Any English switching (for Chinese) / any non-French switching (for French)
  → drop one rank per instance
- Arguments are surface-level throughout with no depth → drop one rank
- 成語 forced or used incorrectly when attempted → note it (Chinese only)

HSK VOCABULARY EXPECTATIONS BY RANK (strictly enforced, Chinese only):
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

CEFR VOCABULARY EXPECTATIONS BY RANK (strictly enforced, French only):
- Iron/Gold: B1–B2 range must appear naturally. If vocabulary stays
  at A2–B1 throughout, cannot place above Pro.
- Diamond: C1 vocabulary must appear. Cultural competence demonstrated
  (laïcité, Mai 68 etc.). If absent throughout, cannot place at Diamond.
- Ethereal: C1–C2 with native rhetorical richness. If vocabulary is
  strong but clearly learner-range, place at Diamond maximum.
- Master: Cultivated native diction. Rhetorical precision. Lexically
  diverse across domains. If native but not loquacious, place at Ethereal.
- Eternal: Scholarly French. Archaic or literary structures with
  rhetorical intent. If not demonstrably scholarly, place at Master.

FAIR GRADING RULE:
Strict does not mean punishing. If a user genuinely demonstrated
Gold-level consistently across the conversation, award Gold —
do not drop to Iron just because they did not reach Diamond moments.
The goal is accurate placement, not deflation.

SCORING RULES:
- Be strict at the top (Ethereal–Eternal): vocabulary depth and
  diction are the primary differentiators, not just fluency.
- A very strong learner should reach Diamond at most.
  Ethereal requires genuinely native-level vocab richness.
- Master and Eternal require diction that would impress an educated
  native speaker — not just fluency.
- Do NOT award Eternal or Master unless you saw actual evidence of
  scholarly or native-educated diction in the conversation.
- Assign the ELO at the BOTTOM of the range for that rank
  (e.g. Diamond = 7500, not 10999) — users earn up from placement.

${JSON_OUTPUT_SCHEMA}`;

function normalizePlacementRank(value: unknown) {
  const rank = Object.keys(PLACEMENT_ELO_BY_RANK).find(
    (entry) => entry.toLowerCase() === String(value ?? "").trim().toLowerCase()
  );
  return rank ?? "Pro";
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

  const { messages, languageCode } = await req.json();

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
  if (!canTakeAdvancedPlacement(currentElo)) {
    return Response.json(
      { error: "Advanced placement is only available at Pro local language ELO" },
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

  const languageVariantNote =
    languageCode === "fr"
      ? `LANGUAGE NOTE: This is a French placement conversation. Use the FRENCH CALIBRATION ANCHORS above. Do not assess Chinese characters, tones, HSK levels, or Chinese-specific markers. Assess French grammar, vocabulary range, fluency, register awareness, idiomatic usage, and cultural competence (laïcité, mai 68, canonical French authors, etc.).`
      : `LANGUAGE NOTE: This is a Mandarin Chinese placement conversation (${languageCode === "zh-tw" ? "Traditional" : "Simplified"} Chinese). Use the CHINESE CALIBRATION ANCHORS above. Assess HSK vocabulary range, 成语 usage, register awareness, and canonical classical Chinese literary knowledge.`;

  const prompt = `${ADVANCED_PLACEMENT_GRADE_PROMPT}\n\n${languageVariantNote}\n\nConversation:\n${conversation}`;

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
  const targetElo = PLACEMENT_ELO_BY_RANK[placedRank] ?? 0;
  const eloAfter = Math.max(currentElo, targetElo);
  const eloChange = Math.max(0, eloAfter - currentElo);
  const finalRank = eloToRank(eloAfter);
  const overallGrade = ADVANCED_PLACEMENT_GRADE_BY_RANK[finalRank] ?? "F";
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
    placementMode: "advanced",
    rankName: finalRank,
    globalEloSum,
    bestRankName: bestRank?.rankName ?? eloToRank(eloAfter),
  });
}
