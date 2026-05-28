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

const ADVANCED_PLACEMENT_SYSTEM = `You are 汉语老师 (Master Chen), a Chinese language tutor assessing whether a Pro-level student belongs in the upper ranks.

Assessment guidelines:
- Open with: "你已经有不错的基础。我们来聊一个更深入的话题：你觉得一个人学习语言最难跨过的阶段是什么？"
- Ask 5-6 follow-up questions that escalate through abstract opinion, comparison, hypotheticals, nuanced examples, and idiomatic expression
- Use full Mandarin only. Do not use pinyin or English.
- Keep the same natural tutoring conversation format, but make the questions noticeably harder than standard placement
- Test upper-echelon standards: Iron, Gold, Diamond, and Ethereal
- Keep each tutor response to 2-3 sentences
- Never tell the student this is a placement test or assessment`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.groqkey;
  if (!apiKey) {
    return Response.json({ error: "Server misconfigured: missing API key" }, { status: 500 });
  }

  const client = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });

  const { messages, mode } = await req.json();
  const isAdvanced = mode === "advanced";

  const requestMessages = [
    { role: "system" as const, content: isAdvanced ? ADVANCED_PLACEMENT_SYSTEM : PLACEMENT_SYSTEM },
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
            max_tokens: isAdvanced ? 420 : 256,
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
