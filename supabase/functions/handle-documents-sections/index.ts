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
  console.time("Task time");

  const {
    data: section,
    error: fetchSectionError,
  } = await db.from("documents_sections")
    .select("content")
    .eq("id", payload.id)
    .single();

  if (fetchSectionError || !section) {
    console.error("ERROR FETCH", fetchSectionError);

    throw new Error(
      fetchSectionError.message || FetchSectionError(payload.id),
    );
  }

  const embeddings = await embedder(section.content, {
    pooling: "mean",
    normalize: true,
  });

  const { error: saveEmbeddingsError } = await db.from("documents_sections")
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
    "processed document_section",
    payload.id,
    embeddings.tolist().at(0).length,
  );
  console.timeEnd("Task time");
}, {
  queueName: "documents_sections",
  maxConcurrent: 1,
  maxPgConnections: 1,
});

export const SaveEmbeddingsError = (id: string) =>
  `could not embeddings for document_section with id: ${id}`;

export const FetchSectionError = (id: string) =>
  `could not fetch document_section with id: ${id}`;
