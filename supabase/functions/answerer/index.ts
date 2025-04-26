import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AnswererInput } from "@shared/ai/answerer.ts";

// Lazy Loading the answerer instance
const answerer = await (await import("@shared/ai/answerer.ts")).answerer;

Deno.serve(async (req) => {
  const { question, context }: AnswererInput = await req.json();
  if (!question || !context) {
    return new Response("invalid payload, expected: 'question' and 'context'", {
      status: 400,
    });
  }

  console.time("answerer time");
  const predicts = await answerer(question, context);
  console.timeEnd("answerer time");

  return Response.json({
    data: predicts,
  });
});
