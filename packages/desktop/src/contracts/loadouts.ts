import type {
  CreateLocalLoadoutPlanInput,
  LocalLoadoutPlan,
  UpdateLocalLoadoutPlanInput
} from "@d2-tools/core/loadouts/plans";
import type { DimLoadoutImportPreview } from "@d2-tools/core/loadouts/dimImport";

export type {
  CreateLocalLoadoutPlanInput,
  LocalLoadoutPlan,
  UpdateLocalLoadoutPlanInput
} from "@d2-tools/core/loadouts/plans";

export type LoadoutPlansApi = {
  listLocalLoadoutPlans(): Promise<LocalLoadoutPlan[]>;
  createLocalLoadoutPlan(input: CreateLocalLoadoutPlanInput): Promise<LocalLoadoutPlan>;
  updateLocalLoadoutPlan(id: string, input: UpdateLocalLoadoutPlanInput): Promise<LocalLoadoutPlan>;
  deleteLocalLoadoutPlan(id: string): Promise<LocalLoadoutPlan[]>;
  previewDimLoadoutImport(url: string): Promise<DimLoadoutImportPreview>;
};

export type { DimLoadoutImportPreview } from "@d2-tools/core/loadouts/dimImport";
