import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { EdgeWorker } from "jsr:@pgflow/edge-worker@0.0.4";
import { getDatabase } from "@shared/supabase/service.ts";
import { SummarizationError, summarize } from "./summarizer.ts";

const db = getDatabase({ serviceRole: true });
if (typeof db === "string") throw new Error(db);

EdgeWorker.start(async (payload: { id: string }) => {
  console.info("processing issue", payload.id);

  const {
    data: issue,
    error: loadIssueError,
  } = await db.from("issues")
    .select("content,title")
    .eq("id", payload.id)
    .single();

  if (loadIssueError || !issue) {
    console.error(loadIssueError);
    throw new Error(
      loadIssueError.message || LoadIssueError(payload.id),
    );
  }

  /* AI SUMMARY */
  const summary = await summarize({ ...issue });
  if (!summary) {
    console.error(SummarizationError);
    throw new Error(SummarizationError);
  }

  const { error: updateIssueError } = await db.from("issues")
    .update({
      summary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.id);

  if (updateIssueError) {
    console.error(updateIssueError);
    throw new Error(updateIssueError.message);
  }
}, {
  queueName: "issues",
});

export const LoadIssueError = (id: string) =>
  `could not load issue with id: [${id}]`;
