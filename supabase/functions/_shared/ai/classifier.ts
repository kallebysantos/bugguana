import { env, pipeline } from "@huggingface/transformers.js";
import { getConfig } from "@shared/supabase/config.ts";

// Ensure we do use browser cache,
// in order to apply the latest fetch optimizations features
env.useBrowserCache = true;
env.allowLocalModels = false;

const config = getConfig();

// We do not await here for lazy loading
export const classifier = pipeline(
  "zero-shot-classification",
  "Xenova/mobilebert-uncased-mnli",
  {
    device: "auto",
  },
);

export type ClassifyInput = {
  text: string;
  labels: string[];
};

export type ClassifyOutput = {
  sequence: string;
  labels: string[];
  scores: number[];
};

/** Uses an external EdgeFunction endpoint to perform inference */
export async function classify(payload: ClassifyInput) {
  if (typeof config === "string") throw new Error(config);

  const { supabaseUrl, supabaseAnonKey } = config;

  const classification = await fetch(`${supabaseUrl}/functions/v1/classifier`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
    },
  });

  const { data } = await classification.json();

  return data as ClassifyOutput;
}
