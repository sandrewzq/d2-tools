import type {
  ArmorPlannerClient,
  ArmorPlannerClientRunRequest,
  ArmorPlannerClientRunResult,
  ArmorPlannerWorkspaceJob
} from "@d2-tools/app/armor";
import type { ArmorApi } from "../../contracts/armor.js";

export type {
  ArmorApi,
  ArmorPlannerClientRunRequest,
  ArmorPlannerClientRunResult,
  ArmorPlannerWorkspaceJob
} from "../../contracts/armor.js";

export function createDesktopArmorPlannerClient(
  api: Pick<ArmorApi, "planArmor" | "invalidateArmorPlanner">
): ArmorPlannerClient {
  return {
    plan<Job extends ArmorPlannerWorkspaceJob>(
      request: ArmorPlannerClientRunRequest<Job>
    ): Promise<ArmorPlannerClientRunResult<Job>> {
      return api.planArmor(request);
    },
    invalidate: (scopeId) => api.invalidateArmorPlanner(scopeId)
  };
}
