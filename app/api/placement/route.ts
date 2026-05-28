import OpenAI from "openai";
import { NextRequest } from "next/server";
import { OPENROUTER_TEXT_FALLBACK_MODELS } from "@/lib/openrouter-models";

const PLACEMENT_SYSTEM = `You are 汉语老师 (Master Chen), a Chinese language tutor quietly assessing a student's proficiency level.

Assessment guidelines:
- Open with: "你好！请用中文简单介绍一下你自己。"
- Ask 4-5 follow-up questions that escalate naturally: greetings → daily life → opinions → abstract discussion
- Calibrate each follow-up based on the student's response quality
- If the student seems beginner: simplify, add pinyin after Chinese in parentheses like 你好(nǐ hǎo)
- If the student seems intermediate or above: respond in full Mandarin without pinyin
- If the student seems advanced: introduce idioms, abstract topics, complex phrasing
- Keep each tutor response to 2-3 sentences
- Never tell the student this is a placement test or assessment
- Conduct the session naturally as a regular tutoring conversation`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.groqkey;
  if (!apiKey) {
    return Response.json({ error: "Server misconfigured: missing API key" }, { status: 500 });
  }

  const client = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });

  const { messages } = await req.json();

  const requestMessages = [
    { role: "system" as const, content: PLACEMENT_SYSTEM },
    ...messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const readable = new ReadableStream({
    async start(controller) {
      let hasSentContent = false;
      let lastError: unknown;

      for (const model of OPENROUTER_TEXT_FALLBACK_MODELS) {
        try {
          const stream = client.chat.completions.stream({
            model,
            max_tokens: 256,
            messages: requestMessages,
          });

          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              hasSentContent = true;
              controller.enqueue(new TextEncoder().encode(text));
            }
          }

          controller.close();
          return;
        } catch (err) {
          lastError = err;
          if (hasSentContent) break;
        }
      }

      const msg = lastError instanceof Error ? lastError.message : String(lastError);
      try {
        controller.enqueue(new TextEncoder().encode(`\n\n[ERROR: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
