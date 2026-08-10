import { toServiceError, type ServiceError } from "@d2-tools/services/errors";
import type {
  ArmorPlannerClient,
  ArmorPlannerWorkspaceJob
} from "./armorPlannerContracts.js";
import type { ArmorPlannerSourceRevision } from "@d2-tools/services/armor/planner";
import {
  buildArmorPlannerViewModel,
  type ArmorPlannerMode,
  type ArmorPlannerViewModel
} from "./armorPlannerViewModel.js";

export type ArmorPlannerWorkspaceResultMeta = {
  resultId: string;
  cacheKey: string;
  fromCache: boolean;
  checkedAt: string;
  expiresAt: string;
  sources: ArmorPlannerSourceRevision;
};

type ArmorPlannerWorkspaceStateBase = {
  scopeId: string;
  revision: number;
  mode: ArmorPlannerMode | null;
  viewModel: ArmorPlannerViewModel | null;
};

export type ArmorPlannerWorkspaceState =
  | (ArmorPlannerWorkspaceStateBase & {
      status: "idle";
      mode: null;
      error: null;
      result: null;
    })
  | (ArmorPlannerWorkspaceStateBase & {
      status: "loading";
      mode: ArmorPlannerMode;
      error: null;
      result: null;
    })
  | (ArmorPlannerWorkspaceStateBase & {
      status: "ready" | "stale";
      mode: ArmorPlannerMode;
      viewModel: ArmorPlannerViewModel;
      error: null;
      result: ArmorPlannerWorkspaceResultMeta;
    })
  | (ArmorPlannerWorkspaceStateBase & {
      status: "error";
      mode: ArmorPlannerMode;
      error: ServiceError;
      result: null;
    });

export type ArmorPlannerWorkspace = {
  getState(): ArmorPlannerWorkspaceState;
  subscribe(listener: (state: ArmorPlannerWorkspaceState) => void): () => void;
  plan<Job extends ArmorPlannerWorkspaceJob>(job: Job): Promise<ArmorPlannerWorkspaceState>;
  reset(): ArmorPlannerWorkspaceState;
  invalidate(): Promise<ArmorPlannerWorkspaceState>;
};

export type CreateArmorPlannerWorkspaceOptions = {
  scopeId: string;
  client: ArmorPlannerClient;
  initialRevision?: number;
};

export function createArmorPlannerWorkspace(
  options: CreateArmorPlannerWorkspaceOptions
): ArmorPlannerWorkspace {
  const scopeId = normalizeScopeId(options.scopeId);
  let revision = normalizeRevision(options.initialRevision);
  let state: ArmorPlannerWorkspaceState = idleState(scopeId, revision);
  const listeners = new Set<(state: ArmorPlannerWorkspaceState) => void>();

  return {
    getState(): ArmorPlannerWorkspaceState {
      return state;
    },

    subscribe(listener: (nextState: ArmorPlannerWorkspaceState) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async plan<Job extends ArmorPlannerWorkspaceJob>(
      job: Job
    ): Promise<ArmorPlannerWorkspaceState> {
      revision += 1;
      const requestRevision = revision;
      const previousViewModel = state.viewModel;
      setState({
        status: "loading",
        scopeId,
        revision: requestRevision,
        mode: job.mode,
        viewModel: previousViewModel,
        error: null,
        result: null
      });

      try {
        const response = await options.client.plan({
          scopeId,
          revision: requestRevision,
          job
        });
        if (requestRevision !== revision) return state;
        const viewModel = buildArmorPlannerViewModel(job, response.ruleset, response.result);
        return setState({
          status: response.status === "current" ? "ready" : "stale",
          scopeId,
          revision: requestRevision,
          mode: job.mode,
          viewModel,
          error: null,
          result: {
            resultId: response.resultId,
            cacheKey: response.cacheKey,
            fromCache: response.fromCache,
            checkedAt: response.checkedAt,
            expiresAt: response.expiresAt,
            sources: { ...response.sources }
          }
        });
      } catch (error) {
        if (requestRevision !== revision) return state;
        return setState({
          status: "error",
          scopeId,
          revision: requestRevision,
          mode: job.mode,
          viewModel: previousViewModel,
          error: toServiceError(error, "护甲规划失败"),
          result: null
        });
      }
    },

    reset(): ArmorPlannerWorkspaceState {
      revision += 1;
      return setState(idleState(scopeId, revision));
    },

    async invalidate(): Promise<ArmorPlannerWorkspaceState> {
      revision += 1;
      const nextState = setState(idleState(scopeId, revision));
      await options.client.invalidate?.(scopeId);
      return nextState;
    }
  };

  function setState(nextState: ArmorPlannerWorkspaceState): ArmorPlannerWorkspaceState {
    state = nextState;
    for (const listener of listeners) listener(state);
    return state;
  }
}

function idleState(scopeId: string, revision: number): ArmorPlannerWorkspaceState {
  return {
    status: "idle",
    scopeId,
    revision,
    mode: null,
    viewModel: null,
    error: null,
    result: null
  };
}

function normalizeScopeId(value: string): string {
  const scopeId = value.trim();
  if (!scopeId) throw new Error("Armor planner workspace scopeId is required");
  return scopeId;
}

function normalizeRevision(value: number | undefined): number {
  if (value === undefined) return 0;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Armor planner workspace initialRevision must be a non-negative integer");
  }
  return value;
}
