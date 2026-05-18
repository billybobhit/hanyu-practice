import OpenAI from "openai";
import { NextRequest } from "next/server";
import { OPENROUTER_TEXT_FALLBACK_MODELS } from "@/lib/openrouter-models";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Server misconfigured: missing API key" }, { status: 500 });
  }

  const client = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });

  const { messages, material } = await req.json();

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

Full Conversation:
${conversation}

Grade the student on their Chinese language performance. Return ONLY valid JSON matching this exact structure:
{
  "vocabularyScore": <integer 0-100>,
  "grammarScore": <integer 0-100>,
  "comprehensionScore": <integer 0-100>,
  "overallScore": <integer 0-100>,
  "overallGrade": <"A" | "B" | "C" | "D" | "F">,
  "strengths": [<2-3 specific English strings about what they did well>],
  "improvements": [<2-3 specific English strings about concrete areas to improve>],
  "studyAreas": [<2-3 English strings: specific topics/grammar points to review>]
}

Grading criteria:
- vocabularyScore: accurate use of relevant vocabulary, word choice precision
- grammarScore: sentence structure, particle use, measure words, tones (inferred from text)
- comprehensionScore: depth of understanding of the material, quality of analysis
- overallScore: weighted average (vocab 25%, grammar 35%, comprehension 40%)
- overallGrade: A=90-100, B=80-89, C=70-79, D=60-69, F=below 60

Be honest and specific. A student who gives short answers or shows shallow comprehension should not get high scores.`;

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
