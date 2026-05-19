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
- EASY mode: reward comprehension and willingness to use Chinese terms, but do not over-penalize English scaffolding.
- MEDIUM mode: evaluate Chinese output and pinyin-supported comprehension; reward correct Chinese terms even if pinyin is used heavily.
- HARD mode: evaluate sustained Mandarin-only communication more strictly.

Be honest, specific, and useful. A student who gives short answers or shows shallow comprehension should not get high scores. Feedback must be in English and should give clear next steps.`;

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
