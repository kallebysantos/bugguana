import { classify } from "@shared/ai/classifier.ts";
import { getDatabase } from "@shared/supabase/service.ts";

const db = getDatabase({ serviceRole: true });
if (typeof db === "string") throw new Error(db);

export type GetCategoryInput = {
  /** Represents the issue's ID */
  id: string;
  /** Represents the issue's Summary content */
  summaryContent: string;
};

export async function getKind(
  payload: GetCategoryInput,
) {
  const predicts = await classify({
    text: payload.summaryContent,
    labels: ["issue", "help wanted"],
  });

  const kind = predicts.labels[0];

  const { error: saveKindError } = await db.from("issues")
    .update({
      kind: kind.split(" ").at(0), // get only the 'help' part if is the case
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
    "processed issue category",
    payload.id,
    kind,
  );

  return predicts;
}

export const SaveKindError = (id: string) =>
  `could not determinate a kind for issue with id: ${id}`;
