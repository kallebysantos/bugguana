import { EdgeWorker } from "npm:@pgflow/edge-worker@0.1.12";
import ApplyAIProcessing from "./flow.ts";

EdgeWorker.start(ApplyAIProcessing);
