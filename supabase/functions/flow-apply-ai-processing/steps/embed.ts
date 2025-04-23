import { getDatabase } from "@shared/supabase/service.ts";
import { embedder } from "@shared/ai/embedder.ts";

const db = getDatabase({ serviceRole: true });
if (typeof db === "string") throw new Error(db);

export type EmbedInput = {
  /** Represents the issue's ID */
  id: string;
  /** Represents the issue's Summary content */
  summaryContent: string;
};

export async function embed(payload: EmbedInput): Promise<number[]> {
  console.time("embedding time");
  const predicts = await embedder(payload.summaryContent, {
    pooling: "mean",
    normalize: true,
  });
  const embeddings = predicts.tolist().at(0);
  console.timeEnd("embedding time");

  const { error: saveEmbeddingsError } = await db.from("issues")
    .update({
      embeddings: JSON.stringify(embeddings),
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
    embeddings.length,
  );

  return embeddings;
}

export const SaveEmbeddingsError = (id: string) =>
  `could not embeddings for document_section with id: ${id}`;
