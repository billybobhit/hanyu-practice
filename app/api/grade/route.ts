import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key") || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "No API key" }, { status: 401 });
  }
  const client = new Anthropic({ apiKey });
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

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are evaluating a Chinese language learning session. Carefully analyze the student's responses and grade them.

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

Be honest and specific. A student who gives short answers or shows shallow comprehension should not get high scores.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return Response.json({ error: "Failed to parse grade response" }, { status: 500 });
  }

  try {
    const grade = JSON.parse(jsonMatch[0]);
    return Response.json(grade);
  } catch {
    return Response.json({ error: "Invalid grade JSON" }, { status: 500 });
  }
}
