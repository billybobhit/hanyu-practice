import OpenAI from "openai";
import { NextRequest } from "next/server";
import { OPENROUTER_TEXT_MODEL } from "@/lib/openrouter-models";

const BASE_SYSTEM = `You are 汉语老师 (Master Chen), a strict but encouraging Chinese tutor conducting an immersive Mandarin conversation session. The student has provided study materials — your job is to test their deep comprehension through Socratic dialogue.

Rules:
- Conduct the ENTIRE conversation in Mandarin Chinese only
- Ask probing questions that move from recall → analysis → application → synthesis
- When the student makes grammar errors, note them briefly: (应说"___") then continue naturally
- When vocabulary is wrong, briefly correct: (这里用"___"更准确)
- Vary your Socratic methods: hypotheticals, analogies, follow-up "why?", devil's advocate
- Keep responses conversational: 2-3 sentences max per turn
- Encourage good responses with brief affirmations before pushing deeper
- Never switch to English

{PINYIN_INSTRUCTION}

Study Materials:
---
{MATERIAL}
---`;

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return Response.json({ error: "No API key provided" }, { status: 401 });
  }

  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });

  const { messages, material, pinyinMode } = await req.json();

  const pinyinInstruction = pinyinMode
    ? "- Include pinyin in parentheses after key vocabulary and your own sentences, e.g.: 你好(nǐ hǎo)"
    : "";

  const systemPrompt = BASE_SYSTEM.replace(
    "{PINYIN_INSTRUCTION}",
    pinyinInstruction
  ).replace(
    "{MATERIAL}",
    material || "(No material provided — have a general Chinese conversation)"
  );

  let stream: ReturnType<typeof client.chat.completions.stream>;
  try {
    stream = client.chat.completions.stream({
      model: OPENROUTER_TEXT_MODEL,
      max_tokens: 512,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 502 });
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            controller.enqueue(new TextEncoder().encode(text));
          }
        }
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          new TextEncoder().encode(`\n\n[ERROR: ${msg}]`)
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
