import { answer, AnswererOutput } from "@shared/ai/answerer.ts";
import { getDatabase } from "@shared/supabase/service.ts";

const db = getDatabase({ serviceRole: true });
if (typeof db === "string") throw new Error(db);

export type GetTagInput = {
  /** Represents the issue's ID */
  id: string;
  /** Represents the issue's Summary content */
  summaryContent: string;
};

const questions = [
  "Extract the most important tool name where the topic is about",
  "Extract the first important tool name (not related with ':IGNORE_LABEL') where the topic is about",
];

export async function getTag(
  payload: GetTagInput,
) {
  const predicts = await questions.reduce(
    async (acc, question) => {
      const predicts = await acc;
      const previousTags = predicts.map((tag) => tag.answer).join(", ");

      const predict = await answer({
        context: payload.summaryContent,
        question: question.replace(":IGNORE_LABEL", previousTags),
      });

      // score must be least 10% to be considered a possible tag
      return [...predicts, predict].filter((tag) => tag.score >= 0.1);
    },
    Promise.resolve([] as AnswererOutput[]),
  );

  const tagString = predicts.map((tag) => tag.answer).join(", ");

  const { error: saveKindError } = await db.from("issues")
    .update({
      tag: tagString,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.id);

  if (saveKindError) {
    console.error(saveKindError);

    throw new Error(
      saveKindError.message || SaveTagError(payload.id),
    );
  }

  console.log(
    "processed issue tag",
    payload.id,
    tagString,
  );

  return predicts;
}

export const SaveTagError = (id: string) =>
  `could not determinate a tag for issue with id: ${id}`;
