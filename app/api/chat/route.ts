import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

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

  const ai = new GoogleGenAI({ apiKey });
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

  // Convert role "assistant" → "model" for Gemini
  const contents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let stream: AsyncGenerator<import("@google/genai").GenerateContentResponse>;
  try {
    stream = await ai.models.generateContentStream({
      model: "gemini-1.5-flash",
      contents,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 512,
      },
    });
  } catch (err) {
    let msg = err instanceof Error ? err.message : String(err);
    // Gemini wraps errors as: { error: { message: "<inner-json-string>", code, status } }
    // The inner message is itself a stringified JSON with the real human-readable error.
    try {
      const outer = JSON.parse(msg);
      const innerStr = outer?.error?.message ?? msg;
      try {
        const inner = JSON.parse(innerStr);
        msg = inner?.error?.message ?? innerStr;
      } catch {
        msg = innerStr;
      }
    } catch {
      // msg stays as raw string
    }
    return Response.json({ error: msg }, { status: 502 });
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            controller.enqueue(new TextEncoder().encode(text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
