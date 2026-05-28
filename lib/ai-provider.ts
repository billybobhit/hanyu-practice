import OpenAI from "openai";
import {
  SAMBANOVA_TEXT_MODEL,
  GROQ_TEXT_FALLBACK_MODELS,
  GROQ_VISION_MODEL,
} from "@/lib/openrouter-models";

const SAMBANOVA_BASE_URL = "https://api.sambanova.ai/v1";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

type TextProviderConfig = {
  apiKey: string | undefined;
  baseURL: string;
  models: readonly string[];
  providerName: string;
};

type VisionProviderConfig = {
  apiKey: string | undefined;
  baseURL: string;
  model: string;
  providerName: string;
  disabledReason?: string;
};

export function shouldUseSambaNova(): boolean {
  return process.env.USE_SAMBANOVA === "true";
}

export function getTextProviderConfig(): TextProviderConfig {
  if (shouldUseSambaNova()) {
    return {
      apiKey: process.env.SAMBANOVA_API_KEY,
      baseURL: SAMBANOVA_BASE_URL,
      models: [process.env.SAMBANOVA_MODEL || SAMBANOVA_TEXT_MODEL],
      providerName: "SambaNova",
    };
  }

  return {
    apiKey: process.env.groqkey,
    baseURL: GROQ_BASE_URL,
    models: GROQ_TEXT_FALLBACK_MODELS,
    providerName: "Groq",
  };
}

export function getVisionProviderConfig(): VisionProviderConfig {
  if (shouldUseSambaNova()) {
    return {
      apiKey: undefined,
      baseURL: "",
      model: "",
      providerName: "SambaNova",
      disabledReason:
        "Image parsing is unavailable while USE_SAMBANOVA=true because the configured SambaNova model is text-only.",
    };
  }

  return {
    apiKey: process.env.groqkey,
    baseURL: GROQ_BASE_URL,
    model: GROQ_VISION_MODEL,
    providerName: "Groq",
  };
}

export function createAiClient(config: { apiKey: string; baseURL: string }) {
  return new OpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });
}
