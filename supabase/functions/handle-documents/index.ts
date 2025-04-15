import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { EdgeWorker } from "jsr:@pgflow/edge-worker@0.0.4";
import { getDatabase } from "@shared/supabase/service.ts";

import { processMarkdown } from "./markdown_parser.ts";

console.log("Worker start");
const db = getDatabase({ serviceRole: true });
if (typeof db === "string") throw new Error(db);

console.log("Worker start");

EdgeWorker.start(async (payload: { id: string }) => {
  console.log("Worker run", payload);

  const { data: document, error: fetchDocumentError } = await db.from(
    "documents",
  )
    .select("content")
    .eq("id", payload.id)
    .single();

  console.log(document);

  if (fetchDocumentError || !document) {
    throw new Error(
      fetchDocumentError.message || FetchDocumentError(payload.id),
    );
  }

  const markdown = processMarkdown(document.content);
  const sections = markdown.sections.map(({ content }) => ({
    content,
    document_id: payload.id,
  }));

  const { error } = await db.from("document_sections").insert(sections);
  if (error) {
    throw new Error(
      error.message ||
        InsertSectionsError({
          id: payload.id,
          total_sections: sections.length,
        }),
    );
  }
}, {
  queueName: "documents",
});

export const InsertSectionsError = (
  { id, total_sections }: { id: string; total_sections: number },
) =>
  `could not insert ${total_sections} section(s) for document with id: ${id}`;

export const FetchDocumentError = (id: string) =>
  `could not fetch document with id: ${id}`;
