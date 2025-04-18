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

const categoryClassifier = await pipeline(
  "zero-shot-classification",
  "Xenova/mobilebert-uncased-mnli",
  {
    device: "auto",
  },
);

const categories = {
  "Database": "database",
  "Security": "security",
  "File Storage": "storage",
  "Realtime Communication": "realtime",
  "Infrastrucure": "infrastructure",
};

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

  console.time("category time");
  const predicts = await categoryClassifier(
    issue.summary,
    Object.keys(categories),
  );
  console.log(predicts);
  console.timeEnd("category time");

  const { error: saveCategoryError } = await db.from("issues")
    .update({
      // @ts-ignore: safety cause we did used 'Object.keys' as label input
      category: categories[predicts.labels[0]],
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.id);

  if (saveCategoryError) {
    console.error(saveCategoryError);

    throw new Error(
      saveCategoryError.message || SaveCategoryError(payload.id),
    );
  }

  console.log(
    "processed issue category",
    payload.id,
    predicts.labels.at(0),
    predicts.scores.at(0),
  );
}, {
  queueName: "category-issue",
  maxConcurrent: 1,
  maxPgConnections: 1,
});

export const SaveCategoryError = (id: string) =>
  `could not determinate a category for issue with id: ${id}`;

export const LoadIssueError = (id: string) =>
  `could not load issue with id: ${id}`;
