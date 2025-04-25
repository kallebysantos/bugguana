import { EmbedInput, EmbedOutput } from "@shared/ai/embedder.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Lazy Loading the embedder instance
const embedder = await (await import("@shared/ai/embedder.ts")).embedder;

Deno.serve(async (req) => {
  const { text }: EmbedInput = await req.json();
  if (!text) {
    return new Response("invalid payload, expected: 'text'", {
      status: 400,
    });
  }

  console.time("embedder time");
  const predicts = await embedder(text, {
    pooling: "mean",
    normalize: true,
  });
  const embeddings = predicts.tolist().at(0);
  console.timeEnd("embedder time");

  const result: EmbedOutput = {
    data: embeddings,
    length: embeddings.length,
  };

  return Response.json(result);
});
