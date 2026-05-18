import { GoogleGenAI, createPartFromBase64 } from "@google/genai";
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

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          createPartFromBase64(base64, mediaType),
          {
            text: "Extract all text content from this image verbatim. If it contains Chinese characters, preserve them exactly. Include any pinyin or romanization shown. Return only the extracted text with no commentary or formatting.",
          },
        ],
      },
    ],
  });

  const text = response.text ?? "";
  return Response.json({ text });
}
