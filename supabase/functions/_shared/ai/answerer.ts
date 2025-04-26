import { env, pipeline } from "@huggingface/transformers.js";
import { getConfig } from "@shared/supabase/config.ts";

// Ensure we do use browser cache,
// in order to apply the latest fetch optimizations features
env.useBrowserCache = true;
env.allowLocalModels = false;

const config = getConfig();

// We do not await here for lazy loading
export const answerer = pipeline(
  "question-answering",
  "Xenova/distilbert-base-uncased-distilled-squad",
  {
    device: "auto",
  },
);

export type AnswererInput = {
  context: string;
  question: string;
};

export type AnswererOutput = {
  answer: string;
  score: string;
};

/** Uses an external EdgeFunction endpoint to perform inference */
export async function answer(payload: AnswererInput) {
  if (typeof config === "string") throw new Error(config);

  const { supabaseUrl, supabaseAnonKey } = config;

  const classification = await fetch(`${supabaseUrl}/functions/v1/answerer`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
    },
  });

  const { data } = await classification.json();

  return data as AnswererOutput;
}
