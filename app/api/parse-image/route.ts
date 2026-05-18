import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key") || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "No API key" }, { status: 401 });
  }
  const client = new Anthropic({ apiKey });
  const { base64, mediaType } = await req.json();

  if (!base64 || !mediaType) {
    return Response.json({ error: "Missing base64 or mediaType" }, { status: 400 });
  }

  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!validTypes.includes(mediaType)) {
    return Response.json({ error: "Unsupported image type" }, { status: 400 });
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: base64,
            },
          },
          {
            type: "text",
            text: "Extract all text content from this image verbatim. If it contains Chinese characters, preserve them exactly. Include any pinyin or romanization shown. Return only the extracted text with no commentary or formatting.",
          },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return Response.json({ text });
}
