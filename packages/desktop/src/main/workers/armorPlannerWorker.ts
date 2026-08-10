import { parentPort } from "node:worker_threads";
import {
  planArmorAcquisition,
  planArmorUpgrade,
  planOwnedArmor,
  planTheoreticalArmor
} from "@d2-tools/core/armor";
import type { ArmorPlannerJob } from "@d2-tools/services/armor/planner";

type ArmorPlannerWorkerRequest =
  | { id: number; operation: "run"; job: ArmorPlannerJob }
  | { id: number; operation: "ping" }
  | { id: number; operation: "close" };

parentPort?.on("message", (request: ArmorPlannerWorkerRequest) => {
  try {
    if (request.operation === "close") {
      parentPort?.postMessage({ id: request.id, ok: true });
      parentPort?.close();
      return;
    }
    if (request.operation === "ping") {
      parentPort?.postMessage({ id: request.id, ok: true, result: true });
      return;
    }
    const result = runPlannerJob(request.job);
    parentPort?.postMessage({ id: request.id, ok: true, result });
  } catch (error) {
    parentPort?.postMessage({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

function runPlannerJob(job: ArmorPlannerJob) {
  if (job.mode === "theoretical") return planTheoreticalArmor(job.request);
  if (job.mode === "owned") return planOwnedArmor(job.request);
  if (job.mode === "acquisition") return planArmorAcquisition(job.request);
  return planArmorUpgrade(job.request);
}
