import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { ClassifyInput } from "@shared/ai/classifier.ts";

// Lazy Loading the classifier instance
const classifier = await (await import("@shared/ai/classifier.ts")).classifier;

Deno.serve(async (req) => {
  const { text, labels }: ClassifyInput = await req.json();
  if (!text || !labels) {
    return new Response("invalid payload, expected: 'text' and 'labels'", {
      status: 400,
    });
  }

  console.time("classifier time");
  const predicts = await classifier(text, labels);
  console.timeEnd("classifier time");

  return Response.json({
    data: predicts,
  });
});
