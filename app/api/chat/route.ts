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
    return new Response("No API key provided", { status: 401 });
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

  const stream = await ai.models.generateContentStream({
    model: "gemini-2.0-flash",
    contents,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 512,
    },
  });

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
