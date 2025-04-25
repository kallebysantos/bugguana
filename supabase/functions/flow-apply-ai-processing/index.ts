import { EdgeWorker } from "jsr:@pgflow/edge-worker@0.1.18";
import ApplyAIProcessing from "./flow.ts";

EdgeWorker.start(ApplyAIProcessing);
