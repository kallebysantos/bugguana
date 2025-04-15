import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getDatabase } from "../_shared/supabase/service.ts";

const db = getDatabase({ serviceRole: true });
if (typeof db === "string") throw new Error(db);

export type FetchDocumentPayload = {
  url: string;
  title: string;
};

Deno.serve(async (req) => {
  const { url, title }: FetchDocumentPayload = await req.json();

  const documentRes = await fetch(url);
  const { error } = await db.from("documents").insert({
    title,
    content: await documentRes.text(),
  });

  if (error) {
    const erroMsg = InsertDocumentError(url);
    console.error(error, erroMsg);

    return new Response(erroMsg, { status: 400 });
  }

  return new Response(null, { status: 201 });
});

const InsertDocumentError = (url: string) =>
  `could not insert document from the given url ${url}`;
