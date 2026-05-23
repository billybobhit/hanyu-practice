export const OPENROUTER_TEXT_MODEL = "llama-3.1-8b-instant";
export const OPENROUTER_TEXT_FALLBACK_MODELS = [
  OPENROUTER_TEXT_MODEL,
  "llama-3.3-70b-versatile",
] as const;

export const OPENROUTER_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
