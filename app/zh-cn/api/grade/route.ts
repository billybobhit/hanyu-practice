import { NextRequest } from "next/server";
import { createAiClient, formatAiError, getTextProviderConfig, isRateLimitError } from "@/lib/ai-provider";
import type { Difficulty } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { calculateEloChange, getRankForElo } from "@/lib/ranks";
import { calculateGlobalEloContribution } from "@/lib/elo";

export const maxDuration = 60;

// ── Universal rules injected into every rank ──────────────────────────────────
const UNIVERSAL_RULES = `UNIVERSAL RULES FOR ALL RANKS (apply without exception):
1. Voice/speech-to-text errors (garbled words, wrong characters from misrecognition) — NEVER penalize. Grade intended meaning only.
2. This is spoken conversation, not a written exam. Grade spoken fluency.
3. Real-world knowledge, cultural depth, practical nuance (e.g. knowing food has no preservatives) = high comprehension score.
4. A native speaker demonstrating deep cultural knowledge in casual speech should score A at any rank below Gold.
5. Grade what they meant, not surface errors in how they said it.
6. If the user self-corrects or shows awareness of their errors, reward that metacognitive awareness.`;

// ── Per-rank rubrics ──────────────────────────────────────────────────────────
const BEGINNER_RUBRIC = `Be extremely generous. Reward any genuine attempt in Chinese.
Single words, broken sentences, heavy English mixing — all acceptable.
The student is a true beginner. Encourage everything, penalize nothing except full English refusal.

Grade scale:
- A: Any Chinese used, understood the topic, made an effort
- B: Mostly English but sprinkled Chinese, showed comprehension
- C: Barely tried but attempted something in Chinese
- D: Almost entirely English, minimal effort
- F: Zero Chinese, refused to engage`;

const RANK_RUBRICS: Record<string, string> = {
  noob: BEGINNER_RUBRIC,
  beginner: BEGINNER_RUBRIC,
  intermediate: BEGINNER_RUBRIC,

  advanced: `You are grading a Chinese 2 curriculum level student.
They can form sentences that make sense and communicate a clear idea.
Expect correct basic sentence structure, familiar topics, no complex grammar.
Think: a student who just finished their second year of Chinese class.

Standards:
- Can form one complete, grammatically reasonable sentence per response
- Vocabulary matches HSK 2-3 level (food, family, daily life, simple opinions)
- Grammar: basic SVO, simple connectors (因为, 所以, 但是)
- No code-switching expected to be penalized heavily yet
- Errors are fine as long as meaning is clear

Example A-grade response at Advanced:
Tutor: 你喜欢做什么运动？
User: 我喜欢打篮球，因为很有意思，我和朋友一起打。
→ Clear sentence, reason given, simple vocab, makes sense. A grade.`,

  pro: `You are grading a Chinese 2-3 transition level student.
They should hold a short, coherent conversation without English.
3+ sentence responses expected. Vocabulary is decent but not rich.
Think: someone who studied Chinese 2-3 years and uses it occasionally.

Standards:
- 2-3 sentences minimum per response
- No English mixing tolerated
- HSK 3 level vocabulary
- Can express opinions, describe situations, give reasons
- Grammar doesn't have to be perfect but meaning must be clear`,

  iron: `You are grading a Chinese 3 curriculum level student.
They can hold a real conversation on familiar topics.
3 solid sentences with some vocabulary depth expected.
Think: end of Chinese 3 class — can communicate comfortably.

Standards:
- 3+ sentences, coherent and on-topic
- Some HSK 3-4 vocabulary used naturally
- No English mixing
- Can sustain a topic, give opinions with reasoning
- Minor grammar errors acceptable if meaning is clear

Example A-grade at Iron:
Tutor: 你觉得城市生活和农村生活有什么区别？
User: 城市生活比较方便，有很多商店和地铁，但是也很吵。农村比较安静，
      空气也好一点，但是找工作比较难。我更喜欢城市因为我喜欢热闹。
→ 3 sentences, comparison structure, some vocab (安静、方便、热闹), clear. A grade.`,

  gold: `Same as Iron standard but slightly stricter.
Expect richer vocabulary and smoother flow.
An Iron-level response gets a B here, not an A.`,

  diamond: `You are grading a student approaching fluency.
Iron-level responses get a C here.
Expect 4+ sentences, varied vocabulary, natural transitions,
and the ability to discuss abstract or opinion-based topics.

Standards:
- HSK 4-5 vocabulary
- Natural sentence variety (not just SVO repeated)
- Connectors and discourse markers used correctly
- Can discuss feelings, comparisons, hypotheticals
- No English. No formulaic repetition.`,

  ethereal: `You are grading a native speaker or near-native speaker.
This is someone who grew up speaking Chinese or has lived in a Chinese-speaking environment for years. Think: 10+ year speaker.
Everyday fluency is the baseline — not the goal.

Standards:
- Natural, idiomatic speech. No textbook phrasing.
- Cultural references, tone-appropriate register
- Complex sentences with subordinate clauses
- Errors in tones or minor grammar do not matter — natural flow does
- Cannot be formulaic. Must feel like a real native conversation.`,

  master: `You are grading a highly educated native speaker.
Think: Chinese person who went to university, reads books,
can discuss literature, history, society with depth and nuance.
This is native level but polished — not scholar level yet.

Standards:
- Rich, varied vocabulary including chengyu and formal registers
- Can shift between casual and formal effortlessly
- Discussions of abstract topics: society, philosophy, culture
- Zero tolerance for unnatural phrasing
- Must feel like talking to a well-read, articulate native speaker`,

  eternal: `You are grading a scholar of the Chinese language.
Think: a Chinese literature professor, a classical Chinese expert,
or a professional writer/journalist at the top of their field.
This is not just native fluency — it is mastery of the language itself.

Standards:
- Classical references, literary allusions expected
- Ability to use and explain chengyu in context
- Academic register available when appropriate
- Responses show depth of thought, not just correctness
- An articulate native speaker gets a C here, not an A
- Only true language scholars can sustain an A at Eternal`,
};

function getRubric(rankName: string): string {
  const key = rankName.trim().toLowerCase();
  return RANK_RUBRICS[key] ?? RANK_RUBRICS["noob"];
}

function getRubricRankNameForLanguageElo(elo: unknown): string {
  const safeElo = Math.max(0, Math.floor(Number(elo) || 0));
  if (safeElo >= 23000) return "Eternal";
  if (safeElo >= 16000) return "Master";
  if (safeElo >= 11000) return "Ethereal";
  if (safeElo >= 7500) return "Diamond";
  if (safeElo >= 5000) return "Gold";
  if (safeElo >= 3300) return "Iron";
  if (safeElo >= 2100) return "Pro";
  if (safeElo >= 1250) return "Advanced";
  return "Noob";
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

  const { messages, material, difficulty, userElo, userLanguageElo, languageCode } = await req.json();
  const selectedDifficulty: Difficulty =
    difficulty === "easy" || difficulty === "medium" || difficulty === "hard"
      ? difficulty
      : "hard";

  const rankElo: number = typeof userElo === "number" ? userElo : 0;
  const requestedLanguageElo = typeof userLanguageElo === "number" ? userLanguageElo : 0;
  const bearerToken = req.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];

  const validLanguageCode =
    typeof languageCode === "string" &&
    (languageCode === "zh-cn" || languageCode === "zh-tw");
  let accountUserId: string | undefined;
  let dbLanguageElo: number | undefined;
  let dbGlobalElo: number | undefined;
  if (validLanguageCode) {
    try {
      const supabase = await createClient();
      let {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user && bearerToken) {
        const tokenResult = await supabase.auth.getUser(bearerToken);
        user = tokenResult.data.user;
      }
      accountUserId = user?.id;
      if (!accountUserId) throw new Error("No signed-in user");

      const [{ data: languageRow }, { data: profile }] = await Promise.all([
        supabase
          .from("user_language_elo")
          .select("elo")
          .eq("user_id", accountUserId)
          .eq("language_code", languageCode)
          .maybeSingle(),
        supabase
          .from("user_account_elo")
          .select("elo")
          .eq("user_id", accountUserId)
          .maybeSingle(),
      ]);
      dbLanguageElo = typeof languageRow?.elo === "number" ? languageRow.elo : 0;
      dbGlobalElo = typeof profile?.elo === "number" ? profile.elo : 0;
    } catch {
      // guests and unauthenticated requests use client-local progress
    }
  }
  const isSignedInAccount = Boolean(accountUserId);
  const effectiveElo = isSignedInAccount ? (dbLanguageElo ?? 0) : requestedLanguageElo;
  const effectiveRank = getRubricRankNameForLanguageElo(effectiveElo);
  const effectiveGlobalElo = isSignedInAccount ? (dbGlobalElo ?? 0) : rankElo;
  const effectiveGlobalRank = getRankForElo(effectiveGlobalElo).name;

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

  const rubric = getRubric(effectiveRank);

  const prompt = `${rubric}

${UNIVERSAL_RULES}

---

Displayed global rank: ${effectiveGlobalRank} (${effectiveGlobalElo} ELO)
Hidden local language ELO for rubric: ${effectiveElo} (${effectiveRank} rubric)
Study Material Context: ${material || "(General conversation, no specific material)"}
Difficulty: ${selectedDifficulty.toUpperCase()}

Full Conversation:
${conversation}

Grade the student on their Chinese language performance at the ${effectiveRank} rank standard. Return ONLY valid JSON matching this exact structure:
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
- overallGrade: calibrated to the ${effectiveRank} rank standard above

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

    let extraFields: Record<string, unknown> = {};
    if (validLanguageCode && accountUserId) {
      const supabase = await createClient();
      const currentLanguageElo = effectiveElo;
      const languageRank = getRankForElo(currentLanguageElo).name;
      const sessionEloGain = calculateEloChange(grade.overallGrade, grade.overallScore);
      const newLanguageElo = Math.max(0, currentLanguageElo + sessionEloGain);
      const globalContribution = calculateGlobalEloContribution(
        sessionEloGain,
        languageRank
      );

      const currentGlobalElo = Math.max(0, effectiveGlobalElo);
      const newGlobalElo = Math.max(0, currentGlobalElo + globalContribution);
      const globalRankBefore = getRankForElo(currentGlobalElo).name;
      const globalRankAfter = getRankForElo(newGlobalElo).name;
      const updatedAt = new Date().toISOString();

      const { error: languageWriteError } = await supabase
        .from("user_language_elo")
        .upsert(
          {
            user_id: accountUserId,
            language_code: languageCode,
            elo: newLanguageElo,
            updated_at: updatedAt,
          },
          { onConflict: "user_id,language_code" }
        );

      if (languageWriteError) {
        throw new Error(`Failed to update local language ELO: ${languageWriteError.message}`);
      }

      const { error: globalWriteError } = await supabase
        .from("user_account_elo")
        .upsert(
          {
            user_id: accountUserId,
            elo: newGlobalElo,
            rank: globalRankAfter,
            updated_at: updatedAt,
          },
          { onConflict: "user_id" }
        );

      if (globalWriteError) {
        throw new Error(`Failed to update global ELO: ${globalWriteError.message}`);
      }

      extraFields = {
        sessionEloGain,
        globalContribution,
        languageRank,
        languageEloBefore: currentLanguageElo,
        languageEloAfter: newLanguageElo,
        languageEloChange: sessionEloGain,
        languageEloAppliedChange: newLanguageElo - currentLanguageElo,
        languageRankBefore: languageRank,
        languageRankAfter: getRankForElo(newLanguageElo).name,
        globalEloBefore: currentGlobalElo,
        globalEloAfter: newGlobalElo,
        globalRankBefore,
        globalRankAfter,
      };
    }

    return Response.json({ ...grade, ...extraFields });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 502 });
  }
}
