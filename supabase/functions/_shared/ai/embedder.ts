import { env, pipeline } from "@huggingface/transformers.js";
import { getConfig } from "@shared/supabase/config.ts";

// Ensure we do use browser cache,
// in order to apply the latest fetch optimizations features
env.useBrowserCache = true;
env.allowLocalModels = false;

const config = getConfig();

export const embedder = pipeline(
  "feature-extraction",
  "Supabase/gte-small",
  {
    device: "auto",
  },
);

export type EmbedInput = {
  text: string;
};

export type EmbedOutput = {
  data: number[];
  length: number;
};

/** Uses an external EdgeFunction endpoint to perform inference */
export async function embed(payload: EmbedInput) {
  if (typeof config === "string") throw new Error(config);

  const { supabaseUrl, supabaseAnonKey } = config;

  const embeddings = await fetch(`${supabaseUrl}/functions/v1/embedder`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
    },
  });

  const result: EmbedOutput = await embeddings.json();

  return result;
}
