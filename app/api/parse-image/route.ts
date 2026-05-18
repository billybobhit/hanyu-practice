import OpenAI from "openai";
import { NextRequest } from "next/server";
import { OPENROUTER_VISION_MODEL } from "@/lib/openrouter-models";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Server misconfigured: missing API key" }, { status: 500 });
  }

  const { base64, mediaType } = await req.json();

  if (!base64 || !mediaType) {
    return Response.json({ error: "Missing base64 or mediaType" }, { status: 400 });
  }

  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!validTypes.includes(mediaType)) {
    return Response.json({ error: "Unsupported image type" }, { status: 400 });
  }

  const client = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });

  try {
    const response = await client.chat.completions.create({
      model: OPENROUTER_VISION_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mediaType};base64,${base64}` },
            },
            {
              type: "text",
              text: "Extract all text content from this image verbatim. If it contains Chinese characters, preserve them exactly. Include any pinyin or romanization shown. Return only the extracted text with no commentary or formatting.",
            },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    return Response.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 502 });
  }
}
