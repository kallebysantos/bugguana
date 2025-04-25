import { getDatabase } from "@shared/supabase/service.ts";
import { SummarizationError, summarize } from "@shared/ai/summarizer.ts";

const db = getDatabase({ serviceRole: true });
if (typeof db === "string") throw new Error(db);

export type SummaryInput = {
  /** Represents the issue's ID */
  id: string;
};

export async function summary(payload: SummaryInput): Promise<string> {
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

  return summary;
}

export const LoadIssueError = (id: string) =>
  `could not load issue with id: [${id}]`;
