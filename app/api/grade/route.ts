import OpenAI from "openai";
import { NextRequest } from "next/server";
import { OPENROUTER_TEXT_FALLBACK_MODELS } from "@/lib/openrouter-models";
import type { Difficulty } from "@/lib/types";

// ── Universal rules injected into every rank ──────────────────────────────────
const UNIVERSAL_RULES = `UNIVERSAL RULES FOR ALL RANKS (apply without exception):
1. Voice/speech-to-text errors (garbled words, wrong characters from misrecognition) — NEVER penalize. Grade intended meaning only.
2. This is spoken conversation, not a written exam. Grade spoken fluency.
3. Real-world knowledge, cultural depth, practical nuance (e.g. knowing food has no preservatives) = high comprehension score.
4. A native speaker demonstrating deep cultural knowledge in casual speech should score A at any rank below Gold.
5. Grade what they meant, not surface errors in how they said it.
6. If the user self-corrects or shows awareness of their errors, reward that metacognitive awareness.`;

// ── Per-rank rubrics ──────────────────────────────────────────────────────────
const RANK_RUBRICS: Record<string, string> = {
  noob: `You are grading a complete beginner learning Chinese. Be extremely encouraging. The bar is very low — reward any genuine attempt.

Standards:
- Vocabulary: Did they use ANY Chinese words correctly? Even one word counts.
- Grammar: Ignore almost entirely. Reward attempts over correctness.
- Comprehension: Did they understand the general topic? Basic yes/no counts.
- Voice input errors: Ignore completely.
- Mixing English and Chinese: Totally acceptable at this rank.

Example reference dialogue (A grade at Noob):
Tutor: 你叫什么名字？
User: 我 name is 小明, 我 like 中文!
Tutor: 你喜欢吃什么？
User: 我喜欢 pizza 和饺子
→ A grade: tried, used Chinese words, understood questions, genuine effort.

Grade scale:
- A: Responded in Chinese (even mixed), understood questions, used relevant words
- B: Mostly understood, attempted Chinese even if heavily mixed with English
- C: Barely understood, very minimal Chinese, but tried
- D: Confused but attempted something
- F: Responded entirely in English with zero Chinese effort`,

  beginner: `You are grading an early learner who knows basic phrases and simple sentences. Be encouraging but start rewarding correct structure.

Standards:
- Vocabulary: HSK 1-2 level words, basic nouns and verbs
- Grammar: Basic SVO structure (Subject + Verb + Object)
- Comprehension: Understands simple direct questions, gives short answers
- Voice errors: Ignore completely
- English mixing: Penalize slightly but do not fail for it

Example reference dialogue (A grade at Beginner):
Tutor: 你今天吃什么了？
User: 我吃了面条，很好吃。
Tutor: 你家有几口人？
User: 我家有四口人，爸爸妈妈和我还有弟弟。
→ A grade: correct simple sentences, understood all questions, HSK 1-2 vocab.

Example reference dialogue (C grade at Beginner):
Tutor: 你今天吃什么了？
User: 我 eat 面条. 好吃.
Tutor: 你家有几口人？
User: Four people.
→ C grade: heavy mixing, barely structured, understood but couldn't respond well.

Grade scale:
- A: Correct simple sentences, understood all questions, relevant answers
- B: Mostly correct, minor errors, understood most questions
- C: Some errors, understood about half, limited vocabulary
- D: Frequent errors, struggled to understand
- F: Cannot form basic sentences or understand simple questions`,

  intermediate: `You are grading a learner who can hold basic conversations on familiar topics. Reward depth and penalize one-word answers.

Standards:
- Vocabulary: HSK 3-4 level, topic-specific words
- Grammar: Compound sentences, 了/过/着 aspect markers, measure words
- Comprehension: Can discuss familiar topics with some depth
- Reward: Extended responses, opinions, asking questions back
- Penalize: Repeating same simple phrases, refusing to elaborate
- Voice errors: Ignore, grade meaning not transcription

Example reference dialogue (A grade at Intermediate):
Tutor: 你上周末做了什么有趣的事情？
User: 上周末我和朋友去了电影院，看了一部科幻电影。故事很吸引人，讲的是未来世界的故事。我很喜欢，但是结局有点让我失望。
→ A grade: extended response, opinions, specific details, natural flow.

Example reference dialogue (C grade at Intermediate):
Tutor: 你上周末做了什么？
User: 我在家。很无聊。
→ C grade: understood but gave minimal response, no elaboration.

Grade scale:
- A: Extended natural responses, topic depth, some grammatical complexity
- B: Good responses, minor errors, adequate depth
- C: Short responses, limited depth, noticeable vocabulary gaps
- D: Struggles with topic development, frequent errors
- F: Cannot sustain basic conversation on familiar topics`,

  advanced: `You are grading a learner who can hold conversations on familiar topics with some depth. Standard is similar to a solid intermediate learner. Do not expect complexity — reward sustained conversation and topic development.

Standards:
- Vocabulary: HSK 3-4 level, can express opinions on familiar topics
- Grammar: Compound sentences, basic aspect markers (了/过)
- Comprehension: Can discuss familiar topics, gives more than one-sentence answers
- Reward: Extended responses, simple opinions, staying on topic
- Penalize: One-word answers, constant English switching, total avoidance of questions
- Voice errors: Ignore completely

Example reference dialogue (A grade at Advanced):
Tutor: 你上周末做了什么？
User: 上周末我去了朋友家，我们一起做饭，做了很多菜。我做了红烧肉，朋友做了凉拌黄瓜。吃完饭我们看了电影，很开心，下次还想再去。
→ A grade: extended response, specific details, natural simple flow.

Example reference dialogue (C grade at Advanced):
Tutor: 你上周末做了什么？
User: 我在家。很无聊。
→ C grade: understood but no elaboration, minimal effort.

Grade scale:
- A: Extended responses, topic depth, simple but correct sentences
- B: Good responses, minor errors, adequate depth
- C: Short responses, limited depth, vocabulary gaps
- D: Struggles to develop topics, frequent errors
- F: Cannot hold basic conversation on familiar topics`,

  pro: `You are grading someone who can hold a solid conversation entirely in Chinese without switching to English, with decent vocabulary. Not expecting fluency — expecting sustained effort and some range.

Standards:
- Vocabulary: HSK 4-5 level, topic-specific words, minimal English mixing
- Grammar: Mostly correct compound sentences, some complexity attempted
- Comprehension: Can handle unfamiliar topics with some struggle
- Reward: No English, vocabulary range, attempts at complex ideas
- Penalize: Heavy English mixing, refusal to engage harder questions, very repetitive simple sentence patterns
- Voice errors: Ignore transcription, note consistent spoken grammar issues

Example reference dialogue (A grade at Pro):
Tutor: 你觉得大城市生活和小城市生活有什么不同？
User: 大城市机会更多，工作选择也比较丰富，但是生活压力很大，房价很高，节奏很快。小城市比较轻松，但是发展机会少，很多年轻人还是选择去大城市。我觉得两种生活方式各有优缺点，要看个人的目标和性格。
→ A grade: no English, decent vocabulary, balanced opinion, natural flow.

Example reference dialogue (C grade at Pro):
Tutor: 你觉得大城市和小城市有什么不同？
User: 大城市 very busy. 小城市 more 轻松. 我喜欢大城市 because 机会多.
→ C grade: heavy English mixing, shallow, not at Pro standard.

Grade scale:
- A: No English, decent vocabulary range, sustained conversation, opinions
- B: Minimal English, good range, some depth
- C: Some English mixing, limited range, shallow responses
- D: Heavy English mixing or very limited vocabulary
- F: Cannot sustain conversation without constant English`,

  iron: `You are grading a near-fluent speaker. Expect near-native conversation quality. Minor errors acceptable but noted.

Standards:
- Vocabulary: Rich and varied, literary words, chengyu encouraged
- Grammar: Near-perfect complex grammar, rhetorical structures
- Comprehension: Professional topics, abstract debate, cultural depth
- Reward: Chengyu (成语), classical references, sophisticated reasoning
- Penalize: Simple vocabulary when complex fits better, avoidance of difficult topics, unnatural sentence patterns
- Voice errors: Ignore transcription, small penalty for consistent spoken grammar errors

Example reference dialogue (A grade at Iron):
Tutor: 如果你是市长，你会如何解决城市交通拥堵的问题？
User: 这个问题说起来容易做起来难。单纯限制私家车数量治标不治本，更重要的是完善公共交通体系，让人们觉得坐公交比开车更方便、更舒适。另外，推广远程办公也能从根本上减少通勤需求。当然，不同城市情况各异，不能一刀切。
→ A grade: 治标不治本 chengyu, nuanced policy thinking, 一刀切, natural flow.

Grade scale:
- A: Near-native fluency, chengyu, sophisticated cultural awareness
- B: Near-native, very minor non-native patterns
- C: Fluent but some consistent non-native patterns
- D: Multiple non-native patterns, limited to safe topics
- F: Should not be at Iron rank`,

  gold: `You are grading a near-fluent speaker, slightly stricter than Iron. Expect the same near-native quality but penalize inconsistency more.

Standards:
- Same as Iron but stricter:
- Less tolerance for non-native patterns
- Vocabulary should be consistently rich not occasionally rich
- Transitions between topics should feel natural not mechanical
- Reward: Everything Iron rewards plus stylistic consistency
- Penalize: Inconsistency — great one moment, weak the next

Example reference dialogue (A grade at Gold):
Tutor: 谈谈你对当代教育制度的看法。
User: 现行教育制度有其历史背景和合理性，但也存在明显的局限。过于注重考试成绩，往往忽视了学生的创造力和批判性思维的培养。当然，改革不能一蹴而就，需要在稳定与创新之间寻求平衡。我个人认为，教育的核心应该是点燃兴趣，而非灌输知识。
→ A grade: consistently high throughout, 一蹴而就 chengyu, nuanced view, no weak moments, completely natural.

Grade scale:
- A: Consistently near-native throughout, no weak moments
- B: Near-native with 1-2 inconsistent moments
- C: Fluent but inconsistent quality throughout
- D: Inconsistent, several clear non-native patterns
- F: Should not be at Gold rank`,

  diamond: `You are grading a speaker who should be indistinguishable from an educated native speaker. Be stricter — look for any non-native markers.

Standards:
- Vocabulary: Native range, colloquialisms, regional expressions appropriate
- Grammar: Fully correct complex grammar, natural rhythm throughout
- Comprehension: Any topic including technical, political, philosophical
- Reward: Natural native-like flow, humor, cultural sensitivity, spontaneous topic connections
- Penalize: Textbook-sounding phrases, unnatural transitions, overuse of simple connectors (然后然后然后), any awkwardness

Example reference dialogue (A grade at Diamond):
Tutor: 谈谈你对当代年轻人"躺平"现象的看法。
User: "躺平"这个词本身就很有意思，折射出一代人对传统成功观的集体反思。与其说是懒惰，不如说是对内卷文化的一种无声抵抗。当然，躺平也有程度之分，完全放弃和适度降低期望是两回事。我觉得社会应该反思的是，为什么年轻人会走到这一步。
→ A grade: 内卷, sophisticated sociological framing, nuanced distinction, completely native feel throughout.

Grade scale:
- A: Indistinguishable from educated native throughout
- B: Near-indistinguishable, very subtle non-native markers
- C: Clearly fluent but consistent patterns marking non-native
- D: Strong but clear non-native speaker
- F: Should not be at Diamond rank`,

  ethereal: `You are grading a speaker at advanced fluent native level. Apply Iron standards strictly. Penalize anything below consistent near-native quality.

Standards:
- Native-like flow throughout entire conversation
- Chengyu and literary references used naturally not forced
- Cultural and historical awareness demonstrated organically
- Matches Iron standard applied with zero tolerance for inconsistency
- Penalize: Any forced literary references, any non-native patterns, any moments that feel like translation from English

Example reference dialogue (A grade at Ethereal):
Tutor: 请谈谈你对中国传统文化在现代社会中传承的看法。
User: 我认为传统文化的传承面临两难困境。一方面，随着全球化的深入，年轻人越来越倾向于接受西方文化；另一方面，政府和社会各界也在积极推动文化复兴。以春节为例，虽然商业化色彩日益浓厚，但它依然是凝聚家庭情感的重要纽带。关键在于如何在现代化与传统之间找到平衡。
→ A grade: 两难困境, 纽带, sophisticated argument, zero non-native feel.

Grade scale:
- A: Exceptional educated native quality throughout, natural literary touch
- B: Strong educated native quality, very minor gaps
- C: Near-native but limited stylistic range or occasional non-native patterns
- D: Fluent but falls short of educated native standard
- F: Should not be at Ethereal rank`,

  master: `You are grading a potential heritage speaker, professor, or literary writer. The standard is publishing-quality Chinese.

Standards:
- Publishing-quality expression
- Academic or literary register on demand
- Classical Chinese references woven naturally
- Argumentation at academic paper level
- Penalize: Anything below publishing standard, any non-native markers, any word choice that could have been more precise

Example reference dialogue (A grade at Master):
Tutor: 请谈谈鲁迅的文学遗产对当代中国社会的意义。
User: 鲁迅的价值不仅在于他的文字，更在于他敢于直面民族性格之痼疾的勇气。《阿Q正传》中那种精神胜利法，在当代社会以不同形式延续着。他的批判精神在某种意义上是超时代的——每当社会需要自我审视时，鲁迅就会被重新召唤出来。这本身就说明他的思想并未过时。
→ A grade: 痼疾, literary analysis, classical reference, academic register, original insight, publishing quality throughout.

Grade scale:
- A: Publishing/academic quality, masterful control of language
- B: Near-publishing quality, minor refinements needed
- C: Very strong but not at publishing standard
- D: Falls clearly short of Master level
- F: Should not be at Master rank`,

  eternal: `You are grading someone who has demonstrated transcendent mastery of Chinese. The bar is the highest living speakers and writers of Mandarin.

Standards:
- Equivalent to a celebrated Chinese author, orator, or scholar
- Every word choice precise and intentional
- Classical Chinese fluency demonstrated naturally
- Cultural, historical, philosophical depth at scholar level
- Penalize: Any word that could have been better chosen, any moment that feels less than transcendent

Example reference dialogue (A grade at Eternal):
Tutor: 如何理解庄子"逍遥游"的哲学境界？
User: 逍遥游的核心，在于破除"有待"与"无待"之辨。鲲鹏之变固然壮观，然其南徙仍赖风之力，未臻真正自由。庄子理想中的至人、神人、圣人，乃是超越物我对立、与道合一的存在。这种境界非理性推导所能至，而是一种生命状态的彻底转化。以现代语言言之，近乎海德格尔所谓"诗意地栖居"，却又更为彻底，因为它连"栖居"本身的执念也要放下。
→ A grade: classical Chinese fluency, original philosophical synthesis, cross-cultural reference used naturally, transcendent scholar level.

Grade scale:
- A: Transcendent — matches the best living speakers and scholars
- B: Exceptional but not transcendent, near-Master quality
- C: Master-level quality but clearly not Eternal
- D: Clearly not at Eternal level
- F: Should not be at Eternal rank`,
};

function getRubric(rankName: string): string {
  const key = rankName.trim().toLowerCase();
  return RANK_RUBRICS[key] ?? RANK_RUBRICS["noob"];
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.groqkey;
  if (!apiKey) {
    return Response.json({ error: "Server misconfigured: missing API key" }, { status: 500 });
  }

  const client = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });

  const { messages, material, difficulty, userRank, userElo } = await req.json();
  const selectedDifficulty: Difficulty =
    difficulty === "easy" || difficulty === "medium" || difficulty === "hard"
      ? difficulty
      : "hard";

  const rankName: string = typeof userRank === "string" && userRank ? userRank : "Noob";
  const rankElo: number = typeof userElo === "number" ? userElo : 0;

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

  const rubric = getRubric(rankName);

  const prompt = `${rubric}

${UNIVERSAL_RULES}

---

Student rank: ${rankName} (${rankElo} ELO)
Study Material Context: ${material || "(General conversation, no specific material)"}
Difficulty: ${selectedDifficulty.toUpperCase()}

Full Conversation:
${conversation}

Grade the student on their Chinese language performance at the ${rankName} rank standard. Return ONLY valid JSON matching this exact structure:
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
- overallGrade: calibrated to the ${rankName} rank standard above

Mode adjustments:
- EASY mode: reward comprehension and willingness; do not over-penalize English scaffolding.
- MEDIUM mode: evaluate Chinese output and pinyin-supported comprehension.
- HARD mode: evaluate sustained Mandarin-only communication.`;

  try {
    let text = "";
    let lastError: unknown;

    for (const model of OPENROUTER_TEXT_FALLBACK_MODELS) {
      try {
        const response = await client.chat.completions.create({
          model,
          max_tokens: 1200,
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
      throw lastError;
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
