import OpenAI from "openai";
import { NextRequest } from "next/server";
import { OPENROUTER_TEXT_FALLBACK_MODELS } from "@/lib/openrouter-models";
import type { Difficulty } from "@/lib/types";

export async function POST(req: NextRequest) {
  const apiKey = process.env.groqkey;
  if (!apiKey) {
    return Response.json({ error: "Server misconfigured: missing API key" }, { status: 500 });
  }

  const client = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });

  const { messages, material, difficulty } = await req.json();
  const selectedDifficulty: Difficulty =
    difficulty === "easy" || difficulty === "medium" || difficulty === "hard"
      ? difficulty
      : "hard";

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

  const prompt = `You are evaluating a Chinese language learning session. Carefully analyze the student's responses and grade them.

Study Material Context:
${material || "(General conversation, no specific material)"}

Difficulty:
${selectedDifficulty.toUpperCase()}

Full Conversation:
${conversation}

Grade the student on their Chinese language performance. Return ONLY valid JSON matching this exact structure:
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
  "nextPracticePlan": [<3 short English action items for the next session>]
}

Grading criteria:
- vocabularyScore: accurate use of relevant vocabulary, word choice precision
- grammarScore: sentence structure, particle use, measure words, tones (inferred from text)
- comprehensionScore: depth of understanding of the material, quality of analysis
- overallScore: weighted average (vocab 25%, grammar 35%, comprehension 40%)
- overallGrade: A=90-100, B=80-89, C=70-79, D=60-69, F=below 60

Grade anchors — use these to calibrate your scoring:
- A (90-100): The student performed clearly and impressively well. Strong comprehension, mostly accurate Chinese, engaged throughout. Minor errors are fine — consistent high quality earns an A.
- B (80-89): The student was solid. Showed genuine effort, communicated understandably, got mostly correct answers. Some mistakes are expected and acceptable. A good, real conversation with mostly correct Chinese earns a B.
- C (70-79): Partial performance. Some correct answers mixed with errors. The student tried but understanding was uneven or Chinese output was limited. Still a genuine, passing attempt.
- D (60-69): The student struggled. Mostly incorrect answers, shallow responses, or significant communication breakdowns. Some engagement but not meeting the basics.
- F (below 60): Very weak. Minimal effort, mostly wrong or incomprehensible responses, or barely any Chinese output. Reserved for genuinely low-effort or failed sessions.

Reward the following behaviors:
- Consistent effort and engagement throughout the conversation
- Understandable communication, even with imperfect grammar or vocabulary
- Improvement or self-correction during the conversation
- Willingness to attempt answers and correct mistakes when guided
- Mostly correct answers, even with minor grammatical slips
- Meaningful engagement with the topic and material

Do NOT penalize minor errors that don't impede communication. Do NOT default to harsh scoring — if the student clearly tried and communicated understandably, that is at least a C; if they performed solidly across the session, that is a B.

Mode adjustments:
- EASY mode: reward comprehension and willingness to use Chinese terms; do not over-penalize English scaffolding. A genuine EASY session with real Chinese output and correct understanding deserves at least a B.
- MEDIUM mode: evaluate Chinese output and pinyin-supported comprehension; reward correct Chinese terms even if pinyin is used. Solid MEDIUM performance earns a B.
- HARD mode: evaluate sustained Mandarin-only communication more strictly; heavily English-scaffolded responses pull scores down significantly.

Be honest, specific, and useful. Reserve D and F for conversations that were genuinely weak, minimal-effort, mostly incorrect, or barely engaged. Feedback must be in English and should give clear next steps.`;

  try {
    let text = "";
    let lastError: unknown;

    for (const model of OPENROUTER_TEXT_FALLBACK_MODELS) {
      try {
        const response = await client.chat.completions.create({
          model,
          max_tokens: 1024,
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
