export const OPENROUTER_TEXT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
export const OPENROUTER_TEXT_FALLBACK_MODELS = [
  OPENROUTER_TEXT_MODEL,
  "openrouter/owl-alpha",
] as const;

export const OPENROUTER_VISION_MODEL =
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
