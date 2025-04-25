import { Flow } from "npm:@pgflow/dsl@0.1.18";
import { summary } from "./steps/summary.ts";
import { embed } from "./steps/embed.ts";
import { getCategory } from "./steps/get_category.ts";
import { getKind } from "./steps/get_kind.ts";

type Input = {
  /** Represents the issue's ID */
  id: string;
};

export const ApplyAIProcessing = new Flow<Input>({
  slug: "flow_apply_ai_processing",
  maxAttempts: 3,
})
  .step({ slug: "summary" }, async ({ run: payload }) => {
    return await summary(payload);
  })
  .step(
    { slug: "embed", dependsOn: ["summary"] },
    async ({ run: { id }, summary }) => {
      return await embed({ id, summaryContent: summary });
    },
  )
  .step(
    { slug: "get_category", dependsOn: ["summary"] },
    async ({ run: { id }, summary }) => {
      return await getCategory({ id, summaryContent: summary });
    },
  )
  .step(
    { slug: "get_kind", dependsOn: ["summary"] },
    async ({ run: { id }, summary }) => {
      return await getKind({ id, summaryContent: summary });
    },
  );

export default ApplyAIProcessing;
