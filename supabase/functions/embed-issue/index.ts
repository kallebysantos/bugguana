import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { EdgeWorker } from "jsr:@pgflow/edge-worker@0.0.4";
import { getDatabase } from "@shared/supabase/service.ts";

import { env, pipeline } from "@huggingface/transformers.js";

// Ensure we do use browser cache,
// in order to apply the latest fetch optimizations features
env.useBrowserCache = true;

env.allowLocalModels = false;

const db = getDatabase({ serviceRole: true });
if (typeof db === "string") throw new Error(db);

const embedder = await pipeline("feature-extraction", "supabase/gte-small", {
  device: "auto",
});

EdgeWorker.start(async (payload: { id: string }) => {
  const {
    data: issue,
    error: fetchSectionError,
  } = await db.from("issues")
    .select("summary")
    .eq("id", payload.id)
    .single();

  if (fetchSectionError || !issue) {
    console.error("error", fetchSectionError);

    throw new Error(
      fetchSectionError.message || FetchSectionError(payload.id),
    );
  }

  console.time("embedding time");
  const embeddings = await embedder(issue.summary, {
    pooling: "mean",
    normalize: true,
  });
  console.timeEnd("embedding time");

  const { error: saveEmbeddingsError } = await db.from("issues")
    .update({
      embeddings: JSON.stringify(embeddings.tolist().at(0)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.id);

  if (saveEmbeddingsError) {
    console.error(saveEmbeddingsError);

    throw new Error(
      saveEmbeddingsError.message || SaveEmbeddingsError(payload.id),
    );
  }

  console.log(
    "processed issue embeddings",
    payload.id,
    embeddings.tolist().at(0).length,
  );
}, {
  queueName: "embed-issue",
  maxConcurrent: 1,
  maxPgConnections: 1,
});

export const SaveEmbeddingsError = (id: string) =>
  `could not embeddings for document_section with id: ${id}`;

export const FetchSectionError = (id: string) =>
  `could not fetch document_section with id: ${id}`;
