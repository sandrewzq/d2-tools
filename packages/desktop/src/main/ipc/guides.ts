import { ipcMain } from "electron";
import {
  createGuideArmorConstraintDraftArtifact,
  createGuideLoadoutCandidatesArtifact
} from "@d2-tools/core/guides/derivedArtifacts";
import {
  createGuideDerivedRelation,
  upsertGuideDerivedRelation
} from "@d2-tools/core/guides/relations";
import type { AccountSummary } from "@d2-tools/core/account/summary";
import {
  createGuideDocument,
  listGuideDocuments,
  updateGuideDocument
} from "@d2-tools/services/guides/store";
import { listLocalLoadoutPlans } from "@d2-tools/services/loadouts/plans";
import { readGuideSourceUrl } from "@d2-tools/services/guides/sourceReader";
import {
  deleteGuideDocumentWithExtractions,
  listGuideExtractions,
  previewGuideExtraction,
  saveGuideExtractionConfirmation
} from "@d2-tools/services/guides/extractionStore";
import {
  loadGuideDerivedRelationStore,
  recordGuideDerivedRelation,
  removeStoredGuideDerivedRelationsForGuide,
  removeStoredGuideDerivedRelationsForEntity,
  saveGuideDerivedRelationStore
} from "@d2-tools/services/guides/relationStore";
import { loadConfig } from "@d2-tools/services/config/store";
import { getAccountSnapshot } from "../runtime/accountSession.js";
import type {
  CreateGuideDocumentInput,
  UpdateGuideDocumentInput
} from "../../contracts/guides.js";

export function registerGuideIpcHandlers(): void {
  ipcMain.handle("guides:list", () => {
    const config = loadConfig();
    return listGuideDocuments(config.data.data_dir);
  });

  ipcMain.handle("guides:create", (_event, input: CreateGuideDocumentInput) => {
    const config = loadConfig();
    return createGuideDocument(config.data.data_dir, input);
  });

  ipcMain.handle("guides:update", (_event, input: { id: string; document: UpdateGuideDocumentInput }) => {
    const config = loadConfig();
    return updateGuideDocument(config.data.data_dir, input.id, input.document);
  });

  ipcMain.handle("guides:delete", (_event, id: string) => {
    const config = loadConfig();
    const documents = deleteGuideDocumentWithExtractions(config.data.data_dir, id);
    removeStoredGuideDerivedRelationsForGuide(config.data.data_dir, id);
    return documents;
  });

  ipcMain.handle("guides:source:read", (_event, url: string) => readGuideSourceUrl(url));

  ipcMain.handle("guides:extractions:list", () => {
    const config = loadConfig();
    return listGuideExtractions(config.data.data_dir);
  });

  ipcMain.handle("guides:relations:list", () => {
    const config = loadConfig();
    return loadSyncedGuideDerivedRelations(config.data.data_dir);
  });

  ipcMain.handle("guides:extraction:preview", (_event, id: string) => {
    const config = loadConfig();
    return previewGuideExtraction(config.data.data_dir, id);
  });

  ipcMain.handle("guides:extraction:confirm", (_event, input: {
    guideDocumentId: string;
    extractionId: string;
    acceptedCandidateIds: string[];
  }) => {
    const config = loadConfig();
    const extraction = saveGuideExtractionConfirmation({ dataDir: config.data.data_dir, ...input });
    const document = listGuideDocuments(config.data.data_dir).find((entry) => entry.id === input.guideDocumentId);
    if (document) {
      removeStoredGuideDerivedRelationsForEntity(config.data.data_dir, {
        kind: "armor_constraint_draft",
        id: `guide-armor-constraint:${extraction.id}`
      });
      const armorArtifact = createGuideArmorConstraintDraftArtifact({ document, extraction });
      if (armorArtifact) {
        recordGuideDerivedRelation(config.data.data_dir, createGuideDerivedRelation({
          kind: "guide_to_armor_constraint_draft",
          source: {
            kind: "guide",
            id: document.id,
            secondary_id: extraction.id,
            label: document.title
          },
          target: {
            kind: "armor_constraint_draft",
            id: armorArtifact.artifact_id,
            label: armorArtifact.summary
          },
          now: new Date(armorArtifact.created_at)
        }));
      }
    }
    return extraction;
  });

  ipcMain.handle("guides:loadout-candidates:create", async (_event, input: {
    guideDocumentId: string;
    extractionId: string;
    characterId: string;
  }) => {
    const config = loadConfig();
    const documents = listGuideDocuments(config.data.data_dir);
    const document = documents.find((entry) => entry.id === input.guideDocumentId);
    if (!document) throw new Error("攻略文档不存在");
    const extraction = listGuideExtractions(config.data.data_dir, documents).find((entry) => (
      entry.id === input.extractionId && entry.guide_document_id === document.id
    ));
    if (!extraction || extraction.status !== "confirmed") {
      throw new Error("攻略提取尚未确认，不能生成配装候选");
    }
    const account = await getAccountSnapshot("refresh");
    const character = account.characters.find((entry) => entry.character_id === input.characterId);
    if (!character) throw new Error("目标角色不在当前账号快照中");
    const artifact = createGuideLoadoutCandidatesArtifact({
      document,
      extraction,
      account,
      character,
      items: collectGuideAccountItems(account)
    });
    if (!artifact) throw new Error("当前攻略正文或确认已经变化，请重新提取并确认");
    recordGuideDerivedRelation(config.data.data_dir, createGuideDerivedRelation({
      kind: "guide_to_loadout_candidates",
      source: {
        kind: "guide",
        id: document.id,
        secondary_id: extraction.id,
        label: document.title
      },
      target: {
        kind: "loadout_candidates",
        id: artifact.artifact_id,
        secondary_id: artifact.account_scope.character_id,
        label: `${artifact.account_scope.character_class} / ${artifact.summary}`
      },
      now: new Date(artifact.created_at)
    }));
    return artifact;
  });
}

function loadSyncedGuideDerivedRelations(dataDir: string) {
  const documents = listGuideDocuments(dataDir);
  const documentsById = new Map(documents.map((document) => [document.id, document]));
  let store = loadGuideDerivedRelationStore(dataDir);
  let changed = false;
  for (const extraction of listGuideExtractions(dataDir, documents)) {
    const document = documentsById.get(extraction.guide_document_id);
    if (!document) continue;
    const artifact = createGuideArmorConstraintDraftArtifact({ document, extraction });
    if (!artifact) continue;
    const relation = createGuideDerivedRelation({
      kind: "guide_to_armor_constraint_draft",
      source: {
        kind: "guide",
        id: document.id,
        secondary_id: extraction.id,
        label: document.title
      },
      target: {
        kind: "armor_constraint_draft",
        id: artifact.artifact_id,
        label: artifact.summary
      },
      now: new Date(artifact.created_at)
    });
    if (store.relations.some((entry) => entry.id === relation.id)) continue;
    store = upsertGuideDerivedRelation(store, relation);
    changed = true;
  }
  for (const plan of listLocalLoadoutPlans(dataDir)) {
    const artifactId = plan.source.kind === "guide" ? plan.source.source_id : undefined;
    const source = artifactId ? localPlanGuideSource(artifactId) : null;
    if (!artifactId || !source) continue;
    const hasGuideParent = store.relations.some((relation) => (
      relation.source.kind === "guide"
      && relation.target.kind === source.entityKind
      && relation.target.id === artifactId
    ));
    if (!hasGuideParent) continue;
    const relation = createGuideDerivedRelation({
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
    });
    if (store.relations.some((entry) => entry.id === relation.id)) continue;
    store = upsertGuideDerivedRelation(store, relation);
    changed = true;
  }
  return (changed ? saveGuideDerivedRelationStore(dataDir, store) : store).relations;
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

function collectGuideAccountItems(account: AccountSummary): AccountSummary["vault"]["items"] {
  return [
    ...account.vault.items,
    ...account.characters.flatMap((character) => [
      ...character.equipped_items,
      ...character.inventory_items,
      ...character.postmaster_items
    ])
  ];
}
