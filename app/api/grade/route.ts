import { NextRequest } from "next/server";
import { createAiClient, formatAiError, getTextProviderConfig, isRateLimitError } from "@/lib/ai-provider";
import type { Difficulty } from "@/lib/types";

export const maxDuration = 60;

// ── Universal rules injected into every rank ──────────────────────────────────
const UNIVERSAL_RULES = `UNIVERSAL RULES (inject into ALL rubrics):
1. Voice/speech-to-text errors — NEVER penalize. Grade intended meaning.
2. This is spoken conversation, not a written exam. Grade spoken fluency.
3. Real-world knowledge, cultural depth, and practical nuance = high
   comprehension score.
4. A native speaker demonstrating deep cultural knowledge in casual
   speech should score A at any rank below Gold.
5. Grade what they MEANT, not surface errors in how they said it.
6. If the user self-corrects or shows awareness of their errors,
   reward that metacognitive awareness.`;

// ── Per-rank rubrics ──────────────────────────────────────────────────────────
const RANK_RUBRICS: Record<string, string> = {
  Noob: `You are grading a complete beginner. Be maximally generous.
Reward any genuine attempt in Chinese whatsoever.
Single words, broken sentences, heavy English mixing — all acceptable.
Tone errors, wrong grammar, wrong characters — ignore entirely.
PASS if they made any attempt in Chinese. FAIL only if fully English
with zero effort.

Grade scale:
- A: Responded in Chinese, understood the gist, used relevant words
- B: Mostly understood, attempted Chinese even if mixed with English
- C: Barely understood but tried something in Chinese
- D: Very confused but made some attempt
- F: Responded entirely in English with zero Chinese effort`,

  Beginner: `You are grading an early learner who knows basic phrases and simple
sentences. They may mix English. Short answers are fine. They should
be able to handle very simple questions like name, age, food, weather,
daily routine. Reward effort and any correct structure, however small.

Grade scale:
- A: Simple sentences in Chinese, understood questions, relevant answers
- B: Understood most, some Chinese output even if patchy
- C: Struggled but produced some Chinese
- D: Minimal output, mostly confused
- F: No Chinese produced at all`,

  Intermediate: `You are grading a learner who can handle familiar everyday topics.
Expect short paragraphs, basic opinions, simple descriptions. Grammar
will be imperfect. Vocabulary is limited to common daily words. They
should not need English to survive the conversation on familiar topics.

Grade scale:
- A: Handled familiar topics in Chinese throughout, ideas came through
- B: Mostly in Chinese, some gaps but communicated effectively
- C: Gaps were significant but stayed in Chinese and tried
- D: Frequent breakdowns, heavy English reliance
- F: Could not sustain Chinese at all`,

  Advanced: `You are grading a learner at solid intermediate level — similar to
Chinese 2 curriculum. They should be able to form coherent sentences
that make sense, discuss familiar topics with some depth, and stay in
Chinese throughout. Do not expect complexity or rich vocabulary.
Reward: staying on topic, connected ideas, no English switching.
Penalize: complete topic avoidance, falling back to English.

Grade scale:
- A: Coherent connected sentences, ideas are clear, no English
- B: Mostly coherent, minor gaps, stayed in Chinese
- C: Some coherent moments but frequent breakdowns
- D: Struggled to form meaningful sentences
- F: Could not produce coherent Chinese`,

  Pro: `You are grading a learner around Chinese 2–3 level. They should
produce 2–3 coherent sentences per response, make sense, show some
vocabulary range beyond the most basic words, and hold a decent
conversation without English. Vocabulary doesn't need to be rich —
just functional and appropriate. No English tolerated.

Grade scale:
- A: 2–3+ solid sentences, sensible, some vocab variety, zero English
- B: Mostly solid, minor vocab gaps, held up the conversation
- C: Sentences made sense but thin on vocab or frequent short answers
- D: Struggled to produce meaningful multi-sentence responses
- F: Could not produce coherent multi-sentence Chinese`,

  Iron: `You are grading a learner at Chinese 3 level. Expect 3+ coherent
sentences, clear ideas, some vocabulary beyond basic. They should
handle moderately abstract topics (opinions, preferences, simple
cultural topics) without English. Vocabulary should start showing
some range — not textbook-basic only.

HSK alignment: Expect comfortable use of HSK 4–5 vocabulary naturally
in context. Words like 影响 (influence), 环境 (environment), 态度
(attitude), 经验 (experience), 发展 (development) should appear when
relevant. Sentences should feel connected, not just strung-together
fragments.

Grade scale:
- A: 3+ sentences, coherent argument, HSK 4–5 vocab appears naturally
- B: Solid sentences, mostly coherent, some HSK 4–5 range
- C: Sentences make sense but vocabulary stays at HSK 3 or below
- D: Fragmented, limited vocabulary, topic avoidance
- F: Cannot produce connected Chinese at this level`,

  Gold: `You are grading a learner who should be approaching HSK 5–6 range.
Expect fluent multi-sentence responses, abstract topic handling,
appropriate connectors (不仅...而且, 虽然...但是, 尽管, 从而, 反而),
and vocabulary that goes beyond everyday basics.

HSK alignment: Expect natural use of HSK 5–6 vocabulary in context.
Words like 促进 (promote), 导致 (lead to), 逐渐 (gradually), 强调
(emphasize), 矛盾 (contradiction), 具体 (concrete/specific) should
appear. No English. Minor grammar errors acceptable but
vocabulary range and coherence are graded seriously.

Grade scale:
- A: Fluent, abstract capable, HSK 5–6 vocab appears naturally
- B: Mostly fluent, good range, minor gaps at HSK 6 level
- C: Can hold conversation but vocabulary stays at HSK 4 ceiling
- D: Functional but clearly below expected range
- F: Cannot operate at this level`,

  Diamond: `You are grading a learner who should be at or above HSK 6, approaching
HSK 7–9 territory. This is the boundary between advanced learner and
near-native. Expect:
- HSK 7–9 vocabulary appearing naturally — 权衡 (weigh up), 折射
  (reflect/refract metaphorically), 内卷 (involution), 无声的抵抗
  (silent resistance), 集体反思 (collective reflection), 语境 (context),
  潜移默化 (imperceptible influence), 付诸实践 (put into practice)
- Complex sentence structures used correctly
- Appropriate 成语 usage when natural (not forced)
- Near-native register awareness — knowing when to be formal vs casual
- Zero English. Penalize code-switching.
- Minor grammar errors acceptable but vocabulary depth is graded strictly.

Penalize: textbook-sounding responses, overuse of simple connectors,
vocabulary that stays at HSK 5–6 ceiling, any English.

Grade scale:
- A: HSK 7–9 vocab appears naturally, near-native flow, 成语 optional
   but natural if present
- B: Mostly HSK 6–7 range, strong coherence, very minor gaps
- C: Solid HSK 5–6 but not breaking into 7–9 territory
- D: Functional but clearly stuck at advanced learner ceiling
- F: Cannot operate at near-native level`,

  Ethereal: `You are grading a speaker at native level with strong vocabulary.
This means 10+ years of native exposure — fluent, idiomatic, culturally
grounded, and LEXICALLY RICH. This is not just 'native' — it is a
well-read, articulate native speaker with wide vocabulary range.

Expectations:
- HSK 7–9 and beyond: expect a wide repertoire of advanced and
  low-frequency words used precisely — 蕴含 (contain/embody),
  渗透 (permeate), 诠释 (interpret/expound), 凸显 (highlight/accentuate),
  衍生 (derive/give rise to), 勾勒 (outline/sketch), 深邃 (profound/deep),
  宏观 (macro-level), 微妙 (subtle/nuanced), 架构 (framework/structure)
- 成语 used naturally, accurately, in context — never forced
- Register flexibility: can shift between casual and formal seamlessly
- Cultural insider knowledge: understands subtext, irony, implicit meaning
- No code-switching tolerated under any circumstances
- Responses feel like talking to a well-educated Chinese person,
  not a textbook example or a translation

Penalize: any non-native phrasing patterns, forced literary references,
vocabulary that stays at HSK 6 ceiling, awkward register mixing.

Grade scale:
- A: Native + rich vocabulary, idiomatic, culturally aware, lexically varied
- B: Native-like with occasional vocabulary gaps at the highest register
- C: Fluent but vocabulary does not reach well-read native range
- D: Near-native but clearly a learner at the ceiling
- F: Does not belong at Ethereal`,

  Master: `You are grading at full native speaker level — specifically a
well-educated, articulate native speaker with excellent diction.
This is a 文化人 (cultured person) standard: vocabulary is loquacious,
precise, and varied. Responses demonstrate both fluency AND lexical
richness.

Expectations:
- Vocabulary is genuinely impressive — low-frequency literary and
  formal words used accurately: 斟酌 (carefully consider), 意蘊
  (connotation/implication), 铿锵 (resonant/sonorous), 娓娓道来
  (speak fluently and engagingly), 字斟句酌 (weigh every word),
  旁征博引 (cite extensively), 言简意赅 (concise and comprehensive)
- 成语 and 四字格 woven in naturally throughout
- Can discuss philosophy, culture, literature, society with precision
- Idiomatic accuracy: no awkward patterns, natural rhythm in every sentence
- An inarticulate native speaker scores C here — this standard is
  for educated, well-spoken natives.

Penalize: vocabulary that feels like a learner's best effort rather than
native production, missing 成语 opportunities when natural, any
unnatural phrasing, any non-native rhythm.

Grade scale:
- A: Educated native diction, loquacious, rich 成语 use, impressive range
- B: Strong educated native quality, minor vocabulary range gaps
- C: Native but inarticulate — grammar fine, lexical depth lacking
- D: Fluent but non-native patterns detectable by an educated native
- F: Does not belong at Master`,

  Eternal: `You are grading at native scholar level — think a Chinese literature
professor, classical Chinese specialist, or a journalist at the peak of
their craft. This is mastery OF the language, not just mastery IN it.

Expectations:
- Classical allusions, literary references, and archaic structures
  handled with ease and deployed naturally: 子曰, 知之為知之，不知為不知，
  是知也 — interpreted and applied in modern context, not just quoted
- Diction is extraordinary: rare, precise, beautiful word choices that
  a standard native speaker would notice and admire
- 成語, 四字格, 歇後語, and literary 典故 (allusions) all in repertoire
- Academic and formal register fully available
- Responses show depth of thought AND linguistic artistry — not just
  correctness but style, rhythm, and rhetorical awareness
- An articulate native educated speaker gets B here, not A.
  Only true language scholars sustain an A at Eternal.

Penalize: vocabulary that merely reaches educated native range without
scholarly depth, 成語 used without literary flair, any moment that
would not impress a Chinese literature professor.

Grade scale:
- A: Scholarly mastery — linguistic artistry, classical depth, rare diction
- B: Highly educated native — impressive range but not scholarly register
- C: Well-educated articulate native — solid but not scholar-level
- D: Standard educated native — correct but no scholarly depth
- F: Does not belong at Eternal`,
};

function getRubricRankName(rankName: string): string {
  return (
    Object.keys(RANK_RUBRICS).find(
      (entry) => entry.toLowerCase() === rankName.trim().toLowerCase()
    ) ?? "Noob"
  );
}

function getRubric(rankName: string): string {
  return RANK_RUBRICS[getRubricRankName(rankName)] ?? RANK_RUBRICS.Noob;
}

export async function POST(req: NextRequest) {
  const provider = getTextProviderConfig();
  if (!provider.apiKey) {
    return Response.json(
      { error: `Server misconfigured: missing ${provider.providerName} API key` },
      { status: 500 }
    );
  }

  const client = createAiClient({ baseURL: provider.baseURL, apiKey: provider.apiKey });

  const { messages, material, difficulty, userRank, userElo, userLanguageElo } = await req.json();
  const selectedDifficulty: Difficulty =
    difficulty === "easy" || difficulty === "medium" || difficulty === "hard"
      ? difficulty
      : "hard";

  const rankName: string = typeof userRank === "string" && userRank ? userRank : "Noob";
  const rankElo: number = typeof userElo === "number" ? userElo : 0;
  const localLanguageElo = typeof userLanguageElo === "number" ? userLanguageElo : 0;
  const rubricRankName = getRubricRankName(rankName);

  const userMessages = messages.filter(
    (m: { role: string }) => m.role === "user"
  );
  if (userMessages.length < 2) {
    return Response.json(
      { error: "Not enough conversation data to grade" },
      { status: 400 }
    );
  }

  const conversation = messages
    .map(
      (m: { role: string; content: string }) =>
        `[${m.role === "user" ? "学生" : "老师"}]: ${m.content}`
    )
    .join("\n");

  const rubric = getRubric(rubricRankName);

  const prompt = `${rubric}

${UNIVERSAL_RULES}

---

Displayed global rank: ${rankName} (${rankElo} ELO)
Hidden local language ELO for rubric: ${localLanguageElo} (${rubricRankName} rubric)
Study Material Context: ${material || "(General conversation, no specific material)"}
Difficulty: ${selectedDifficulty.toUpperCase()}

Full Conversation:
${conversation}

Grade the student on their Chinese language performance at the ${rubricRankName} rank standard. Return ONLY valid JSON matching this exact structure:
{
  "vocabularyScore": <integer 0-100>,
  "grammarScore": <integer 0-100>,
  "comprehensionScore": <integer 0-100>,
  "overallScore": <integer 0-100>,
  "overallGrade": <"A" | "B" | "C" | "D" | "F">,
  "strengths": [<3-4 detailed English strings about what they did well, citing concrete moments from the conversation when possible>],
  "improvements": [<3-5 specific English strings about concrete areas to improve; each should include what to do next>],
  "studyAreas": [<3-5 English strings: specific vocabulary themes, grammar points, comprehension habits, or pronunciation items to review>],
  "difficultyNotes": <one English sentence explaining how the selected difficulty affected the evaluation>,
  "nextPracticePlan": [<3 short English action items for the next session>],
  "rankFeedback": <one English sentence on the single most important thing to improve to perform better at this rank>,
  "referenceLevel": <one English sentence describing what performance level this conversation demonstrated, e.g. "This conversation demonstrated solid Beginner-level performance with some Intermediate vocabulary.">
}

Scoring dimensions:
- vocabularyScore: accurate use of relevant vocabulary for this rank level
- grammarScore: sentence structure appropriate for this rank level
- comprehensionScore: depth of understanding and response quality for this rank level
- overallScore: weighted average (vocab 25%, grammar 35%, comprehension 40%)
- overallGrade: calibrated to the ${rubricRankName} rank standard above

Mode adjustments:
- EASY mode: reward comprehension and willingness; do not over-penalize English scaffolding.
- MEDIUM mode: evaluate Chinese output and pinyin-supported comprehension.
- HARD mode: evaluate sustained Mandarin-only communication.`;

  try {
    let text = "";
    let lastError: unknown;
    let lastModel: string | undefined;

    for (const model of provider.models) {
      lastModel = model;
      try {
        const response = await client.chat.completions.create({
          model,
          max_tokens: 800,
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
      throw new Error(formatAiError(provider, lastModel, lastError));
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return Response.json({ error: "Failed to parse grade response" }, { status: 500 });
    }

    const grade = JSON.parse(jsonMatch[0]);
    return Response.json(grade);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 502 });
  }
}
