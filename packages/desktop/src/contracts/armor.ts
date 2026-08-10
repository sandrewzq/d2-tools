import type {
  ArmorPlannerClientRunRequest,
  ArmorPlannerClientRunResult,
  ArmorPlannerWorkspaceJob
} from "@d2-tools/app/armor";

export type ArmorApi = {
  planArmor<Job extends ArmorPlannerWorkspaceJob>(
    request: ArmorPlannerClientRunRequest<Job>
  ): Promise<ArmorPlannerClientRunResult<Job>>;
  invalidateArmorPlanner(scopeId?: string): Promise<void>;
};

export type {
  ArmorPlannerClientRunRequest,
  ArmorPlannerClientRunResult,
  ArmorPlannerWorkspaceJob
} from "@d2-tools/app/armor";
