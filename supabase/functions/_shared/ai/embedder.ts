import { env, pipeline } from "@huggingface/transformers.js";

// Ensure we do use browser cache,
// in order to apply the latest fetch optimizations features
env.useBrowserCache = true;

env.allowLocalModels = false;

export const embedder = await pipeline(
  "feature-extraction",
  "Supabase/gte-small",
  {
    device: "auto",
  },
);
