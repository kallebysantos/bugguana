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

const kindClassifier = await pipeline(
  "zero-shot-classification",
  "Xenova/mobilebert-uncased-mnli",
  {
    device: "auto",
  },
);

EdgeWorker.start(async (payload: { id: string }) => {
  const {
    data: issue,
    error: loadIssueError,
  } = await db.from("issues")
    .select("summary")
    .eq("id", payload.id)
    .single();

  if (loadIssueError || !issue) {
    console.error("error", loadIssueError);

    throw new Error(
      loadIssueError.message || LoadIssueError(payload.id),
    );
  }

  console.time("kind time");
  const predicts = await kindClassifier(issue.summary, [
    "issue",
    "help wanted",
  ]);
  console.timeEnd("kind time");

  const { error: saveKindError } = await db.from("issues")
    .update({
      kind: predicts.labels[0].split(" ").at(0),
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.id);

  if (saveKindError) {
    console.error(saveKindError);

    throw new Error(
      saveKindError.message || SaveKindError(payload.id),
    );
  }

  console.log(
    "processed issue kind",
    payload.id,
    predicts.labels.at(0),
    predicts.scores.at(0),
  );
}, {
  queueName: "kind-issue",
  maxConcurrent: 1,
  maxPgConnections: 1,
});

export const SaveKindError = (id: string) =>
  `could not determinate a kind for issue with id: ${id}`;

export const LoadIssueError = (id: string) =>
  `could not load issue with id: ${id}`;
