import { ipcMain } from "electron";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import {
  createLoadoutTemplate,
  deleteLoadoutTemplate,
  listLoadoutTemplates,
  renameLoadoutTemplate,
  type CreateLoadoutTemplateInput,
  type LoadoutTemplate
} from "@d2-tools/services/loadouts/templates";
import {
  createLocalLoadoutPlan,
  deleteLocalLoadoutPlan,
  listLocalLoadoutPlans,
  updateLocalLoadoutPlan
} from "@d2-tools/services/loadouts/plans";
import { previewDimLoadoutImport } from "@d2-tools/services/loadouts/dimImport";
import type {
  CreateLocalLoadoutPlanInput,
  UpdateLocalLoadoutPlanInput
} from "../../contracts/loadouts.js";
import { createLoadoutTemplateTransferPlan } from "@d2-tools/core/loadouts/plan";
import { createGuideDerivedRelation } from "@d2-tools/core/guides/relations";
import { loadConfig } from "@d2-tools/services/config/store";
import {
  loadGuideDerivedRelationStore,
  recordGuideDerivedRelation,
  removeStoredGuideDerivedRelationsForEntity
} from "@d2-tools/services/guides/relationStore";

export function registerLoadoutIpcHandlers(): void {
  ipcMain.handle("loadouts:list", () => {
    const config = loadConfig();
    return listLoadoutTemplates(config.data.data_dir);
  });

  ipcMain.handle("loadouts:create", (_event, input: CreateLoadoutTemplateInput) => {
    const config = loadConfig();
    return createLoadoutTemplate(config.data.data_dir, input);
  });

  ipcMain.handle("loadouts:rename", (_event, input: { id: string; name: string }) => {
    const config = loadConfig();
    return renameLoadoutTemplate(config.data.data_dir, input.id, input.name);
  });

  ipcMain.handle("loadouts:delete", (_event, id: string) => {
    const config = loadConfig();
    return deleteLoadoutTemplate(config.data.data_dir, id);
  });

  ipcMain.handle("loadouts:plans:list", () => {
    const config = loadConfig();
    return listLocalLoadoutPlans(config.data.data_dir);
  });

  ipcMain.handle("loadouts:plans:create", (_event, input: CreateLocalLoadoutPlanInput) => {
    const config = loadConfig();
    const plan = createLocalLoadoutPlan(config.data.data_dir, input);
    syncLocalPlanDerivedRelation(config.data.data_dir, plan);
    return plan;
  });

  ipcMain.handle("loadouts:plans:update", (_event, input: {
    id: string;
    plan: UpdateLocalLoadoutPlanInput;
  }) => {
    const config = loadConfig();
    const previous = listLocalLoadoutPlans(config.data.data_dir).find((plan) => plan.id === input.id);
    const plan = updateLocalLoadoutPlan(config.data.data_dir, input.id, input.plan);
    if (previous?.source.kind !== plan.source.kind || previous?.source.source_id !== plan.source.source_id) {
      removeStoredGuideDerivedRelationsForEntity(config.data.data_dir, { kind: "local_loadout_plan", id: plan.id });
    }
    syncLocalPlanDerivedRelation(config.data.data_dir, plan);
    return plan;
  });

  ipcMain.handle("loadouts:plans:delete", (_event, id: string) => {
    const config = loadConfig();
    const plans = deleteLocalLoadoutPlan(config.data.data_dir, id);
    removeStoredGuideDerivedRelationsForEntity(config.data.data_dir, { kind: "local_loadout_plan", id });
    return plans;
  });

  ipcMain.handle("loadouts:dim:preview", (_event, url: string) => previewDimLoadoutImport(url));

  ipcMain.handle("loadouts:transfer-plan", (_event, input: {
    template: LoadoutTemplate;
    target_character_id: string;
    available_items: AccountItemSummary[];
    equipped_items: AccountItemSummary[];
  }) => {
    return createLoadoutTemplateTransferPlan(input);
  });
}

function syncLocalPlanDerivedRelation(
  dataDir: string,
  plan: ReturnType<typeof createLocalLoadoutPlan>
): void {
  const artifactId = plan.source.kind === "guide" ? plan.source.source_id : undefined;
  if (!artifactId) return;
  const source = localPlanGuideSource(artifactId);
  if (!source) return;
  const hasGuideParent = loadGuideDerivedRelationStore(dataDir).relations.some((relation) => (
    relation.source.kind === "guide"
    && relation.target.kind === source.entityKind
    && relation.target.id === artifactId
  ));
  if (!hasGuideParent) return;
  recordGuideDerivedRelation(dataDir, createGuideDerivedRelation({
    kind: source.relationKind,
    source: {
      kind: source.entityKind,
      id: artifactId,
      label: plan.source.label
    },
    target: {
      kind: "local_loadout_plan",
      id: plan.id,
      label: plan.name
    },
    now: new Date(plan.updated_at ?? plan.created_at)
  }));
}

function localPlanGuideSource(artifactId: string): {
  entityKind: "armor_constraint_draft" | "loadout_candidates";
  relationKind: "armor_constraint_draft_to_local_loadout_plan" | "loadout_candidates_to_local_loadout_plan";
} | null {
  if (artifactId.startsWith("guide-armor-constraint:")) {
    return {
      entityKind: "armor_constraint_draft",
      relationKind: "armor_constraint_draft_to_local_loadout_plan"
    };
  }
  if (artifactId.startsWith("guide-loadout-candidates:")) {
    return {
      entityKind: "loadout_candidates",
      relationKind: "loadout_candidates_to_local_loadout_plan"
    };
  }
  return null;
}
