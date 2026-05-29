import { NextRequest } from "next/server";
import { createAiClient, formatAiError, getTextProviderConfig, isRateLimitError } from "@/lib/ai-provider";
import {
  canTakeAdvancedPlacement,
  canTakeStandardPlacement,
} from "@/lib/supabase/placement-status";
import { createClient } from "@/lib/supabase/server";

const PLACEMENT_SYSTEM = `You are 汉语老师 (Master Chen), a Chinese language tutor quietly assessing a student's proficiency level.

Assessment guidelines:
- Open with the exact language variant requested below.
- Ask 4-5 follow-up questions that escalate naturally: greetings → daily life → opinions → abstract discussion
- Calibrate each follow-up based on the student's response quality
- If the student seems beginner: simplify, add pinyin after Chinese in parentheses like 你好(nǐ hǎo)
- If the student seems intermediate or above: respond in full Mandarin without pinyin
- If the student seems advanced: introduce idioms, abstract topics, complex phrasing
- Keep each tutor response to 1-2 short sentences
- Never tell the student this is a placement test or assessment
- Conduct the session naturally as a regular tutoring conversation`;

const ADVANCED_PLACEMENT_SYSTEM = `You are 汉语老师 (Master Chen), a Chinese language tutor assessing whether a Pro-level student belongs in the upper ranks.

Assessment guidelines:
- Open with the exact advanced language variant requested below.
- Ask 5-6 follow-up questions that escalate through abstract opinion, comparison, hypotheticals, nuanced examples, and idiomatic expression
- Use full Mandarin only. Do not use pinyin or English.
- Keep the same natural tutoring conversation format, but make the questions noticeably harder than standard placement
- Test upper-echelon standards: Iron, Gold, Diamond, and Ethereal
- Keep each tutor response to 1-2 short sentences
- Never tell the student this is a placement test or assessment`;

export async function POST(req: NextRequest) {
  const provider = getTextProviderConfig();
  if (!provider.apiKey) {
    return Response.json(
      { error: `Server misconfigured: missing ${provider.providerName} API key` },
      { status: 500 }
    );
  }

  const { messages, mode, languageCode } = await req.json();
  const normalizedMessages = Array.isArray(messages) ? messages : [];
  const isAdvanced = mode === "advanced";
  const validLanguageCode = languageCode === "zh-cn" || languageCode === "zh-tw";

  if (!validLanguageCode) {
    return Response.json({ error: "languageCode required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: currentRow } = await supabase
    .from("user_language_elo")
    .select("elo")
    .eq("user_id", user.id)
    .eq("language_code", languageCode)
    .maybeSingle();

  const currentElo = Math.max(0, Number(currentRow?.elo ?? 0));
  if (isAdvanced && !canTakeAdvancedPlacement(currentElo)) {
    return Response.json(
      { error: "Advanced placement is only available at Pro local language ELO" },
      { status: 403 }
    );
  }

  if (!isAdvanced && !canTakeStandardPlacement(currentElo)) {
    return Response.json(
      { error: "Standard placement is only available at Noob local language ELO" },
      { status: 403 }
    );
  }

  const client = createAiClient({ baseURL: provider.baseURL, apiKey: provider.apiKey });
  const languageVariantInstruction =
    languageCode === "zh-tw"
      ? `Language variant: Traditional Chinese.
- Use Traditional characters only.
- Do not use Simplified characters.
- Opening line for standard placement: "你好！請用中文簡單介紹一下你自己。"
- Opening line for advanced placement: "你已經有不錯的基礎。我們來聊一個更深入的話題：你覺得一個人學習語言最難跨過的階段是什麼？"`
      : `Language variant: Simplified Chinese.
- Use Simplified characters only.
- Opening line for standard placement: "你好！请用中文简单介绍一下你自己。"
- Opening line for advanced placement: "你已经有不错的基础。我们来聊一个更深入的话题：你觉得一个人学习语言最难跨过的阶段是什么？"`;

  if (normalizedMessages.length === 0) {
    const openingLine =
      languageCode === "zh-tw"
        ? isAdvanced
          ? "你已經有不錯的基礎。我們來聊一個更深入的話題：你覺得一個人學習語言最難跨過的階段是什麼？"
          : "你好！請用中文簡單介紹一下你自己。"
        : isAdvanced
          ? "你已经有不错的基础。我们来聊一个更深入的话题：你觉得一个人学习语言最难跨过的阶段是什么？"
          : "你好！请用中文简单介绍一下你自己。";

    return new Response(openingLine, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const requestMessages = [
    {
      role: "system" as const,
      content: `${isAdvanced ? ADVANCED_PLACEMENT_SYSTEM : PLACEMENT_SYSTEM}\n\n${languageVariantInstruction}`,
    },
    ...normalizedMessages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const readable = new ReadableStream({
    async start(controller) {
      let hasSentContent = false;
      let lastError: unknown;
      let lastModel: string | undefined;

      for (const model of provider.models) {
        lastModel = model;
        try {
          const stream = client.chat.completions.stream({
            model,
            max_tokens: isAdvanced ? 220 : 160,
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
          if (hasSentContent || !isRateLimitError(err)) break;
        }
      }

      const msg = formatAiError(provider, lastModel, lastError);
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
