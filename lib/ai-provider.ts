import OpenAI from "openai";
import {
  CEREBRAS_TEXT_MODEL,
  SAMBANOVA_TEXT_MODEL,
  GROQ_TEXT_FALLBACK_MODELS,
  GROQ_VISION_MODEL,
} from "@/lib/openrouter-models";

const CEREBRAS_BASE_URL = "https://api.cerebras.ai/v1";
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

export function shouldUseCerebras(): boolean {
  return process.env.USE_CEREBRAS === "true";
}

export function shouldForceGroq(): boolean {
  return process.env.USE_GROQ === "true";
}

export function getTextProviderConfig(): TextProviderConfig {
  if (shouldForceGroq()) {
    return {
      apiKey: process.env.groqkey,
      baseURL: GROQ_BASE_URL,
      models: GROQ_TEXT_FALLBACK_MODELS,
      providerName: "Groq",
    };
  }

  if (shouldUseCerebras()) {
    return {
      apiKey: process.env.CEREBRAS_API_KEY,
      baseURL: CEREBRAS_BASE_URL,
      models: [process.env.CEREBRAS_MODEL || CEREBRAS_TEXT_MODEL],
      providerName: "Cerebras",
    };
  }

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
  if (shouldForceGroq()) {
    return {
      apiKey: process.env.groqkey,
      baseURL: GROQ_BASE_URL,
      model: GROQ_VISION_MODEL,
      providerName: "Groq",
    };
  }

  if (shouldUseCerebras()) {
    return {
      apiKey: undefined,
      baseURL: "",
      model: "",
      providerName: "Cerebras",
      disabledReason:
        "Image parsing is unavailable while USE_CEREBRAS=true because the configured Cerebras model is text-only.",
    };
  }

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
    maxRetries: 0,
    timeout: 20_000,
  });
}

export function formatAiError(
  provider: { providerName: string },
  model: string | undefined,
  err: unknown
): string {
  const errorWithStatus = err as { status?: number; message?: string };
  const status = typeof errorWithStatus?.status === "number" ? errorWithStatus.status : undefined;
  const message = err instanceof Error ? err.message : String(err);
  const label = `${provider.providerName}${model ? ` ${model}` : ""}`;

  if (status === 429 || message.includes("429")) {
    return `${label} rate limit exceeded (429). Try again in a minute.`;
  }

  if (message.toLowerCase().includes("timeout")) {
    return `${label} timed out after 20 seconds. Try again.`;
  }

  return `${label}: ${message}`;
}

export function isRateLimitError(err: unknown): boolean {
  const errorWithStatus = err as { status?: number; message?: string };
  const status = typeof errorWithStatus?.status === "number" ? errorWithStatus.status : undefined;
  const message = err instanceof Error ? err.message : String(err);
  return status === 429 || message.includes("429");
}
