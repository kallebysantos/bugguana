import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { EdgeWorker } from "jsr:@pgflow/edge-worker@0.0.4";

EdgeWorker.start((payload) => {
  console.log("Document handled", payload);
}, {
  queueName: "documents",
});
