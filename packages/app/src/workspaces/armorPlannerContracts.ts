import type {
  ArmorAcquisitionPlanRequest,
  ArmorAcquisitionPlanResult,
  ArmorOwnedPlanRequest,
  ArmorOwnedPlanResult,
  ArmorTheoreticalPlanRequest,
  ArmorTheoreticalPlanResult,
  ArmorUpgradePlanRequest,
  ArmorUpgradePlanResult
} from "@d2-tools/core/armor";
import type { ArmorPlannerSourceRevision } from "@d2-tools/services/armor/planner";

export type ArmorPlannerWorkspaceJob =
  | {
      mode: "theoretical";
      request: Omit<ArmorTheoreticalPlanRequest, "ruleset" | "armor_set_catalog">;
    }
  | {
      mode: "owned";
      request: Omit<ArmorOwnedPlanRequest, "ruleset" | "pieces" | "armor_set_catalog">;
    }
  | {
      mode: "acquisition";
      request: Omit<
        ArmorAcquisitionPlanRequest,
        "ruleset" | "owned_pieces" | "armor_set_catalog"
      >;
    }
  | {
      mode: "upgrade";
      request: Omit<ArmorUpgradePlanRequest, "ruleset" | "pieces" | "armor_set_catalog">;
    };

export type ArmorPlannerWorkspaceJobResult<
  Job extends ArmorPlannerWorkspaceJob = ArmorPlannerWorkspaceJob
> = Job extends { mode: "theoretical" } ? ArmorTheoreticalPlanResult
  : Job extends { mode: "owned" } ? ArmorOwnedPlanResult
    : Job extends { mode: "acquisition" } ? ArmorAcquisitionPlanResult
      : Job extends { mode: "upgrade" } ? ArmorUpgradePlanResult
        : never;

export type ArmorPlannerRulesetContext = {
  id: "armor-3.0";
  version: number;
  sourceReference: string;
  manifestVersion?: string;
};

export type ArmorPlannerClientRunRequest<Job extends ArmorPlannerWorkspaceJob> = {
  scopeId: string;
  revision: number;
  job: Job;
};

export type ArmorPlannerClientRunResult<Job extends ArmorPlannerWorkspaceJob> = {
  status: "current" | "stale";
  scopeId: string;
  revision: number;
  resultId: string;
  cacheKey: string;
  fromCache: boolean;
  checkedAt: string;
  expiresAt: string;
  sources: ArmorPlannerSourceRevision;
  ruleset: ArmorPlannerRulesetContext;
  result: ArmorPlannerWorkspaceJobResult<Job>;
};

export type ArmorPlannerClient = {
  plan<Job extends ArmorPlannerWorkspaceJob>(
    request: ArmorPlannerClientRunRequest<Job>
  ): Promise<ArmorPlannerClientRunResult<Job>>;
  invalidate?(scopeId?: string): void | Promise<void>;
};
