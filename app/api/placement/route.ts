import { NextRequest } from "next/server";
import { createAiClient, formatAiError, getTextProviderConfig, isRateLimitError } from "@/lib/ai-provider";
import {
  canTakeAdvancedPlacement,
  canTakeStandardPlacement,
} from "@/lib/supabase/placement-status";
import { createClient } from "@/lib/supabase/server";

const CHINESE_PLACEMENT_SYSTEM = `You are conducting a Mandarin Chinese placement assessment for HanYu.
Your goal is to accurately place this person on the rank ladder through
natural conversation. Conduct the ENTIRE conversation in Chinese only.
Do NOT tell the user you are assessing them.

RANK LADDER YOU ARE PLACING AGAINST:
Noob (0) → Beginner (250) → Intermediate (650) → Advanced (1250) →
Pro (2100) → Iron (3300) → Gold (5000) → Diamond (7500) →
Ethereal (11000) → Master (16000) → Eternal (23000)

CONVERSATION ESCALATION STRATEGY:
Start at a mid level and adapt up or down based on each response.

Turn 1: Familiar topic requiring an opinion or short explanation.
  Target: separates Noob/Beginner from Intermediate/Advanced.
  Example: 你平时喜欢做什么？为什么？

Turn 2: Raise difficulty. Abstract opinion, simple cultural topic.
  Target: separates Advanced/Pro from Iron/Gold.
  Example: 你觉得现代人压力大的原因是什么？

Turn 3: Push to HSK 5–6 territory. Requires connectors, some depth.
  Target: separates Pro/Iron from Gold/Diamond.
  Example: 你认为科技的发展对人际关系有什么影响？

Turn 4: HSK 6–7 territory. Cultural nuance, implicit meaning,
  近义词 distinctions, or a concept without easy English equivalent.
  Target: separates Gold/Diamond from Ethereal.
  Example: 「面子」和「尊严」有什么区别？在什么情况下会冲突？

Turn 5: Native + vocab pressure. Something a strong learner would
  struggle with but a well-read native handles naturally.
  Target: separates Diamond/Ethereal from Master.
  Example: 你怎么看「内卷」这个现象背后反映的社会结构问题？

Turn 6: Scholar/literary territory. Classical reference applied to
  modern life, archaic structure, or rhetorical question requiring
  stylistic response.
  Target: separates Ethereal/Master from Eternal.
  Example: 韩愈说「师者，所以传道受业解惑也」——
  你觉得这句话放在AI教育盛行的今天还成立吗？

Ask ONE focused question per turn. Only Chinese. Never English.
Adapt: if the user struggles at turn 2, do not escalate further —
  stay at that level or drop down one turn to confirm the floor.
If the user excels through turn 4+, push hard on turns 5–6.
After turn 6, continue the conversation naturally — the user decides when to submit.`;

const FRENCH_PLACEMENT_SYSTEM = `You are conducting a French placement assessment for HanYu.
Your goal is to accurately place this person on the rank ladder through
natural conversation. Conduct the ENTIRE conversation in French only.
Do NOT tell the user you are assessing them.

RANK LADDER YOU ARE PLACING AGAINST:
Noob (0) → Beginner (250) → Intermediate (650) → Advanced (1250) →
Pro (2100) → Iron (3300) → Gold (5000) → Diamond (7500) →
Ethereal (11000) → Master (16000) → Eternal (23000)

CONVERSATION ESCALATION STRATEGY:
Start at a mid level and adapt up or down based on each response.

Turn 1: Familiar topic requiring an opinion or short explanation.
  Target: separates Noob/Beginner from Intermediate/Advanced.
  Example: Qu'est-ce que vous aimez faire pendant votre temps libre, et pourquoi ?

Turn 2: Raise difficulty. Abstract opinion or simple cultural topic.
  Target: separates Advanced/Pro from Iron/Gold.
  Example: Pourquoi pensez-vous que beaucoup de gens se sentent stressés aujourd'hui ?

Turn 3: Push to B2/C1 territory. Requires connectors, structure, and depth.
  Target: separates Pro/Iron from Gold/Diamond.
  Example: Selon vous, quel effet la technologie a-t-elle sur les relations humaines ?

Turn 4: C1 territory. Nuance, register, cultural ideas, or near-synonym distinctions.
  Target: separates Gold/Diamond from Ethereal.
  Example: Quelle différence voyez-vous entre la liberté individuelle et la responsabilité collective ?

Turn 5: Native + vocabulary pressure. Something a strong learner would
  struggle with but a well-read native handles naturally.
  Target: separates Diamond/Ethereal from Master.
  Example: Comment analysez-vous le rapport entre l'éducation, la classe sociale et la mobilité sociale ?

Turn 6: Scholar/literary territory. Literary or philosophical reference applied
to modern life, formal register, or rhetorical response.
  Target: separates Ethereal/Master from Eternal.
  Example: Si l'on pense à Camus ou à Sartre, comment peut-on comprendre la notion de liberté aujourd'hui ?

Ask ONE focused question per turn. Only French. Never English.
Adapt: if the user struggles at turn 2, do not escalate further —
  stay at that level or drop down one turn to confirm the floor.
If the user excels through turn 4+, push hard on turns 5–6.
After turn 6, continue the conversation naturally — the user decides when to submit.`;

const ADVANCED_CHINESE_PLACEMENT_SYSTEM = CHINESE_PLACEMENT_SYSTEM;
const ADVANCED_FRENCH_PLACEMENT_SYSTEM = FRENCH_PLACEMENT_SYSTEM;

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
  const validLanguageCode =
    languageCode === "zh-cn" || languageCode === "zh-tw" || languageCode === "fr" || languageCode === "es";

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
      : languageCode === "zh-cn"
        ? `Language variant: Simplified Chinese.
- Use Simplified characters only.
- Opening line for standard placement: "你好！请用中文简单介绍一下你自己。"
- Opening line for advanced placement: "你已经有不错的基础。我们来聊一个更深入的话题：你觉得一个人学习语言最难跨过的阶段是什么？"`
        : languageCode === "fr"
          ? `Language variant: French.
- Conduct the entire conversation in French only.
- Ask French questions and assess French proficiency.
- Do not use Chinese.
- Opening line for standard placement: "Bonjour ! Parlez-moi un peu de vous en français."
- Opening line for advanced placement: "Vous avez déjà de bonnes bases. Parlons d'un sujet plus approfondi : selon vous, quelle est la phase la plus difficile dans l'apprentissage d'une langue ?"`
          : `Language variant: Spanish.
- Conduct the entire conversation in Spanish only.
- Ask Spanish questions and assess Spanish proficiency.
- Do not use Chinese.
- Treat any Chinese examples in the base strategy as difficulty-shape examples only; write fresh Spanish questions instead.
- Opening line for standard placement: "¡Hola! Cuéntame un poco sobre ti en español."
- Opening line for advanced placement: "Ya tienes una buena base. Hablemos de algo más profundo: ¿cuál crees que es la etapa más difícil en el aprendizaje de un idioma?"`;

  if (normalizedMessages.length === 0) {
    const openingLine =
      languageCode === "zh-tw"
        ? isAdvanced
          ? "你已經有不錯的基礎。我們來聊一個更深入的話題：你覺得一個人學習語言最難跨過的階段是什麼？"
          : "你好！請用中文簡單介紹一下你自己。"
        : languageCode === "zh-cn"
          ? isAdvanced
            ? "你已经有不错的基础。我们来聊一个更深入的话题：你觉得一个人学习语言最难跨过的阶段是什么？"
            : "你好！请用中文简单介绍一下你自己。"
          : languageCode === "fr"
            ? isAdvanced
              ? "Vous avez déjà de bonnes bases. Parlons d'un sujet plus approfondi : selon vous, quelle est la phase la plus difficile dans l'apprentissage d'une langue ?"
              : "Bonjour ! Parlez-moi un peu de vous en français."
            : isAdvanced
              ? "Ya tienes una buena base. Hablemos de algo más profundo: ¿cuál crees que es la etapa más difícil en el aprendizaje de un idioma?"
              : "¡Hola! Cuéntame un poco sobre ti en español.";

    return new Response(openingLine, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const requestMessages = [
    {
      role: "system" as const,
      content: `${
        languageCode === "fr"
          ? isAdvanced
            ? ADVANCED_FRENCH_PLACEMENT_SYSTEM
            : FRENCH_PLACEMENT_SYSTEM
          : languageCode === "es"
            ? (isAdvanced
                ? ADVANCED_FRENCH_PLACEMENT_SYSTEM
                : FRENCH_PLACEMENT_SYSTEM
              )
                .replace(/French/g, "Spanish")
                .replace(/Mandarin Chinese/g, "Spanish")
                .replace(/in Chinese only/g, "in Spanish only")
                .replace(/Only Chinese\. Never English\./g, "Only Spanish. Never English.")
          : isAdvanced
            ? ADVANCED_CHINESE_PLACEMENT_SYSTEM
            : CHINESE_PLACEMENT_SYSTEM
      }\n\n${languageVariantInstruction}`,
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
