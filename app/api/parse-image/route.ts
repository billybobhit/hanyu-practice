import OpenAI from "openai";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return Response.json({ error: "No API key" }, { status: 401 });
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
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });

  try {
    const response = await client.chat.completions.create({
      model: "meta-llama/llama-3.1-8b-instruct:free",
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
