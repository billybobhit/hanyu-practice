export const CEREBRAS_TEXT_MODEL = "gpt-oss-120b";

export const SAMBANOVA_TEXT_MODEL = "Llama-4-Maverick-17B-128E-Instruct";

export const GROQ_TEXT_MODEL = "llama-3.3-70b-versatile";
export const GROQ_TEXT_FALLBACK_MODELS = [
  GROQ_TEXT_MODEL,
  "llama-3.1-70b-versatile",
  "llama3-70b-8192",
  "llama-3.1-8b-instant",
] as const;

export const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
