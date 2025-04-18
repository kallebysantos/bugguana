import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";

export type SummarizerPayload = {
  title: string;
  content: string;
};

const openai = new OpenAI({
  baseURL: Deno.env.get("OPEN_AI_URL"),
  apiKey: Deno.env.get("OPEN_AI_API_KEY"),
});

export const MODEL = Deno.env.get("OPEN_AI_API_MODEL") ||
  "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";

export const MODEL_OPTS = {
  max_tokens: 768,
  temperature: 0,
  //  top_p: 0.7,
  //  top_k: 40,
  //  repetition_penalty: 1.0,
};

export const SYSTEM_PROMPT = `#CONTEXT:
- You're a digital assistant of the Supabase FAQ support.
- Your main goal is grab the user issue and summarise that in a short and concise text.
- Don't answer the issue directly, your function is only digest the text in order to prepare it for Human Review.`;

export const applyTemplate = ({ title, content }: SummarizerPayload) =>
  `ISSUE: ${title}\n${content}`;

const CLEAN_UP_PREFIXES = [
  "Here is a concise summary of the user's issue:",
  "Here's a concise summary of the user's issue:",
  "Here's a summary of the user's issue:",
];

// TODO: Use functional way to get more styled code
export function applyCleanUp(completion: string) {
  for (let i = 0; i < CLEAN_UP_PREFIXES.length; i++) {
    const prefix = CLEAN_UP_PREFIXES.at(i) || "";
    if (!completion.startsWith(prefix)) continue;

    completion = completion.replace(prefix, "");
    break;
  }

  completion = completion.trim();

  // Clean possible ""
  if (completion.startsWith('"') && completion.endsWith('"')) {
    completion = completion.substring(1, completion.length - 1);
  }

  return completion;
}

export async function summarize(payload: SummarizerPayload) {
  const completion = await openai.chat.completions.create({
    model: "meta-llama/Llama-Vision-Free",
    messages: [{
      role: "system",
      content: SYSTEM_PROMPT,
    }, {
      role: "user",
      content: applyTemplate(payload),
    }],
    ...MODEL_OPTS,
    stop: ["<|eot_id|>", "<|eom_id|>"],
    stream: false,
  });

  const result = completion.choices.at(0)?.message?.content;
  if (!result) return;

  return applyCleanUp(result);
}

export const SummarizationError = "Could not summarize";
