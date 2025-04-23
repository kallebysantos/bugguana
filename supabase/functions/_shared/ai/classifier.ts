import { env, pipeline } from "@huggingface/transformers.js";

// Ensure we do use browser cache,
// in order to apply the latest fetch optimizations features
env.useBrowserCache = true;

env.allowLocalModels = false;

export const classifier = await pipeline(
  "zero-shot-classification",
  "Xenova/mobilebert-uncased-mnli",
  {
    device: "auto",
  },
);
