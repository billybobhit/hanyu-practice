import OpenAI from "openai";
import { NextRequest } from "next/server";
import { OPENROUTER_TEXT_FALLBACK_MODELS } from "@/lib/openrouter-models";
import type { Difficulty } from "@/lib/types";

const BASE_SYSTEM = `You are 汉语老师 (Master Chen), a strict but encouraging Chinese tutor conducting an immersive Mandarin conversation session. The student has provided study materials — your job is to test their deep comprehension through Socratic dialogue.

Core teaching rules:
- Ask probing questions that move from recall → analysis → application → synthesis
- When the student makes grammar errors, correct them briefly and continue naturally
- When vocabulary is wrong, briefly suggest a more accurate word
- Vary your Socratic methods: hypotheticals, analogies, follow-up "why?", devil's advocate
- Keep responses conversational: 2-3 sentences max per turn
- Encourage good responses with brief affirmations before pushing deeper

Difficulty mode:
{DIFFICULTY_INSTRUCTION}

Study Materials:
---
{MATERIAL}
---`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.groqkey;
  if (!apiKey) {
    return Response.json({ error: "Server misconfigured: missing API key" }, { status: 500 });
  }

  const client = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });

  const { messages, material, difficulty, pinyinMode } = await req.json();
  const selectedDifficulty: Difficulty =
    difficulty === "easy" || difficulty === "medium" || difficulty === "hard"
      ? difficulty
      : pinyinMode
        ? "medium"
        : "hard";

  const difficultyInstruction: Record<Difficulty, string> = {
    hard:
      "- HARD: Conduct the entire conversation in Mandarin Chinese only. Do not switch to English. Corrections should be brief and in Chinese.",
    medium:
      "- MEDIUM: Respond in Mandarin Chinese and include pinyin in parentheses immediately after each Chinese word or short phrase so the UI can stack pinyin above the Chinese text. Format every Chinese segment as 汉字(pinyin), with spaces between segments. Example: 你(nǐ) 今天(jīn tiān) 想(xiǎng) 讨论(tǎo lùn) 什么(shén me)？ Do not put pinyin on separate lines. Keep corrections simple.",
    easy:
      "- EASY: Respond in plain English. Teach Chinese concepts gently by introducing key Chinese words with pinyin and meaning, but explain questions and corrections in clear English.",
  };

  const systemPrompt = BASE_SYSTEM.replace(
    "{DIFFICULTY_INSTRUCTION}",
    difficultyInstruction[selectedDifficulty]
  ).replace(
    "{MATERIAL}",
    material || "(No material provided — have a general Chinese conversation)"
  );

  const requestMessages = [
    { role: "system" as const, content: systemPrompt },
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
            max_tokens: 512,
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
          if (hasSentContent) {
            break;
          }
        }
      }

      const msg = lastError instanceof Error ? lastError.message : String(lastError);
      try {
        controller.enqueue(
          new TextEncoder().encode(`\n\n[ERROR: ${msg}]`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
