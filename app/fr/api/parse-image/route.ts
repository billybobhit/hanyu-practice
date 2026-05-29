import { NextRequest } from "next/server";
import { createAiClient, getVisionProviderConfig } from "@/lib/ai-provider";

export async function POST(req: NextRequest) {
  const provider = getVisionProviderConfig();
  if (provider.disabledReason) {
    return Response.json({ error: provider.disabledReason }, { status: 501 });
  }

  if (!provider.apiKey) {
    return Response.json(
      { error: `Server misconfigured: missing ${provider.providerName} API key` },
      { status: 500 }
    );
  }

  const { base64, mediaType } = await req.json();

  if (!base64 || !mediaType) {
    return Response.json({ error: "Missing base64 or mediaType" }, { status: 400 });
  }

  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!validTypes.includes(mediaType)) {
    return Response.json({ error: "Unsupported image type" }, { status: 400 });
  }

  const client = createAiClient({ baseURL: provider.baseURL, apiKey: provider.apiKey });

  try {
    const response = await client.chat.completions.create({
      model: provider.model,
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
              text: "Extract all text content from this image verbatim for a French learning context. Preserve French accents and punctuation exactly. Return only the extracted text with no commentary or formatting.",
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
