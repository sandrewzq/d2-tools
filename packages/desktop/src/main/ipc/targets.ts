import { ipcMain } from "electron";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import {
  createGuideWeaponTarget,
  normalizeEquipmentTargetStore,
  buildMigratedEquipmentTargetStore,
  mergeImportedEquipmentTargets,
  upsertEquipmentTarget,
  type EquipmentTargetConversionIssue,
  type EquipmentTargetConversionResult,
  type EquipmentTargetStore,
  type GuideEquipmentTargetConversionRequest,
  type WeaponTarget,
  type WeaponTargetManifestRecord,
  type WeaponTargetPerkRequirement,
  type WeaponTargetResolution
} from "@d2-tools/core/targets/equipmentTargets";
import {
  clearLocalTargetRules,
  loadLocalTargetRules,
  saveLocalTargetRules
} from "@d2-tools/services/analysis/targetRulesStore";
import { loadDimWishlist } from "@d2-tools/services/analysis/wishlistStore";
import {
  clearEquipmentTargetStore,
  loadOrMigrateEquipmentTargetStore,
  loadEquipmentTargetStore,
  saveEquipmentTargetStore as persistEquipmentTargetStore
} from "@d2-tools/services/targets/equipmentTargetStore";
import { listGuideExtractions } from "@d2-tools/services/guides/extractionStore";
import { listGuideDocuments } from "@d2-tools/services/guides/store";
import type { GuideExtractionCandidate } from "@d2-tools/core/guides/extraction";
import { createGuideDerivedRelation } from "@d2-tools/core/guides/relations";
import { emptyLocalTargetRules } from "@d2-tools/core/analysis/targets";
import { loadConfig } from "@d2-tools/services/config/store";
import {
  recordGuideDerivedRelation,
  removeStoredGuideDerivedRelationsForEntity
} from "@d2-tools/services/guides/relationStore";
import { getGameDataCatalog } from "../runtime/gameDataRuntime.js";
import { getDesktopManifestStatus } from "./manifest.js";

export function registerTargetRulesIpcHandlers(): void {
  ipcMain.handle("targets:get", () => {
    const config = loadConfig();
    return loadLocalTargetRules(config.data.data_dir);
  });

  ipcMain.handle("targets:save", async (_event, rules: LocalTargetRules) => {
    const config = loadConfig();
    const saved = saveLocalTargetRules(config.data.data_dir, rules);
    await syncEquipmentTargetImports(config.data.data_dir, ["legacy_local_rules"]);
    return saved;
  });

  ipcMain.handle("targets:clear", async () => {
    const config = loadConfig();
    clearLocalTargetRules(config.data.data_dir);
    await syncEquipmentTargetImports(config.data.data_dir, ["legacy_local_rules"]);
    return emptyLocalTargetRules satisfies LocalTargetRules;
  });

  ipcMain.handle("equipment-targets:get", async () => {
    const config = loadConfig();
    const store = await loadOrMigrateEquipmentTargetStore(config.data.data_dir, {
      legacy_rules: loadLocalTargetRules(config.data.data_dir),
      wishlist: loadDimWishlist(config.data.data_dir),
      resolve_weapon: resolveWeaponByHash
    });
    const validated = await validateEquipmentTargetStore(store);
    const saved = equipmentTargetsChanged(store, validated)
      ? persistEquipmentTargetStore(config.data.data_dir, validated)
      : store;
    syncEquipmentTargetDerivedRelations(config.data.data_dir, saved, store);
    return saved;
  });

  ipcMain.handle("equipment-targets:save", async (_event, store: EquipmentTargetStore) => {
    const config = loadConfig();
    const previous = loadEquipmentTargetStore(config.data.data_dir);
    const validated = await validateEquipmentTargetStore(store);
    const saved = persistEquipmentTargetStore(config.data.data_dir, validated);
    syncEquipmentTargetDerivedRelations(config.data.data_dir, saved, previous);
    return saved;
  });

  ipcMain.handle("equipment-targets:clear", () => {
    const config = loadConfig();
    const previous = loadEquipmentTargetStore(config.data.data_dir);
    const cleared = clearEquipmentTargetStore(config.data.data_dir);
    for (const target of previous?.targets ?? []) {
      removeStoredGuideDerivedRelationsForEntity(config.data.data_dir, {
        kind: "equipment_target",
        id: target.id
      });
    }
    return cleared;
  });

  ipcMain.handle("equipment-targets:convert-guide", async (
    _event,
    input: GuideEquipmentTargetConversionRequest
  ) => {
    const config = loadConfig();
    return convertConfirmedGuideEquipmentTargets(config.data.data_dir, input);
  });
}

export async function convertConfirmedGuideEquipmentTargets(
  dataDir: string,
  input: GuideEquipmentTargetConversionRequest
): Promise<EquipmentTargetConversionResult> {
  const documents = listGuideDocuments(dataDir);
  const document = documents.find((entry) => entry.id === input.guide_document_id);
  if (!document) throw new Error("攻略文档不存在");
  const extraction = listGuideExtractions(dataDir, documents).find((entry) => (
    entry.id === input.extraction_id && entry.guide_document_id === input.guide_document_id
  ));
  if (!extraction || extraction.status !== "confirmed") {
    throw new Error("攻略提取尚未确认，不能写入正式装备目标");
  }

  const acceptedIds = new Set(extraction.accepted_candidate_ids);
  const weaponCandidates = extraction.candidates.filter((candidate) => (
    acceptedIds.has(candidate.id) && candidate.kind === "weapon"
  ));
  const current = await loadValidatedEquipmentTargetStore(dataDir);
  let next = current;
  const createdTargetIds: string[] = [];
  const unchangedTargetIds: string[] = [];
  const issues: EquipmentTargetConversionIssue[] = [];

  for (const candidate of weaponCandidates) {
    if (candidate.detail.kind !== "weapon_specific") {
      issues.push({
        source_id: candidate.id,
        label: candidate.label,
        reason: "该条目不是具体武器名称，只保留在攻略确认中，不会转换为正式装备目标。"
      });
      continue;
    }
    const converted = await resolveGuideWeaponTarget({
      candidate,
      guideDocumentId: document.id,
      guideTitle: document.title,
      sourceSnapshotId: extraction.source_snapshot_id,
      extractionId: extraction.id
    });
    if ("issue" in converted) {
      issues.push(converted.issue);
      continue;
    }
    const existing = next.targets.find((target) => target.id === converted.target.id);
    if (existing) {
      unchangedTargetIds.push(existing.id);
      continue;
    }
    next = upsertEquipmentTarget(next, converted.target);
    createdTargetIds.push(converted.target.id);
  }

  if (!weaponCandidates.length) {
    issues.push({
      source_id: extraction.id,
      label: document.title,
      reason: "当前确认结果没有可转换的武器条目。"
    });
  }
  const saved = createdTargetIds.length
    ? persistEquipmentTargetStore(dataDir, await validateEquipmentTargetStore(next))
    : current;
  syncEquipmentTargetDerivedRelations(dataDir, saved, current);
  return {
    store: saved,
    created_target_ids: createdTargetIds,
    unchanged_target_ids: unchangedTargetIds,
    issues
  };
}

function syncEquipmentTargetDerivedRelations(
  dataDir: string,
  store: EquipmentTargetStore,
  previous: EquipmentTargetStore | null
): void {
  const currentIds = new Set(store.targets.map((target) => target.id));
  const guideDocumentIds = new Set(listGuideDocuments(dataDir).map((document) => document.id));
  const previousById = new Map((previous?.targets ?? []).map((target) => [target.id, target]));
  for (const target of previous?.targets ?? []) {
    if (!currentIds.has(target.id)) {
      removeStoredGuideDerivedRelationsForEntity(dataDir, { kind: "equipment_target", id: target.id });
    }
  }
  for (const target of store.targets) {
    if (!isDerivedEquipmentTarget(target) && !isDerivedEquipmentTarget(previousById.get(target.id))) continue;
    removeStoredGuideDerivedRelationsForEntity(dataDir, { kind: "equipment_target", id: target.id });
    if (target.source.kind === "guide_confirmation") {
      const guideEvidence = target.source.evidence_refs.find((evidence) => evidence.entity?.type === "guide");
      const guideId = guideEvidence?.entity?.id;
      if (!guideId || !guideDocumentIds.has(guideId)) continue;
      recordGuideDerivedRelation(dataDir, createGuideDerivedRelation({
        kind: "guide_to_equipment_target",
        source: {
          kind: "guide",
          id: guideId,
          ...(guideEvidence.open_target?.secondary_id
            ? { secondary_id: guideEvidence.open_target.secondary_id }
            : {}),
          label: target.source.label
        },
        target: {
          kind: "equipment_target",
          id: target.id,
          label: target.name
        },
        now: new Date(target.created_at)
      }));
      continue;
    }
    if (target.kind === "armor_acquisition" && target.planner_context) {
      recordGuideDerivedRelation(dataDir, createGuideDerivedRelation({
        kind: "armor_result_to_equipment_target",
        source: {
          kind: "armor_result",
          id: target.planner_context.result_id,
          secondary_id: target.planner_context.candidate_id,
          label: `${target.planner_context.archetype_name} / ${target.planner_context.slot}`
        },
        target: {
          kind: "equipment_target",
          id: target.id,
          label: target.name
        },
        now: new Date(target.created_at)
      }));
    }
  }
}

function isDerivedEquipmentTarget(target: EquipmentTargetStore["targets"][number] | undefined): boolean {
  return target?.source.kind === "guide_confirmation"
    || (target?.kind === "armor_acquisition" && Boolean(target.planner_context));
}

export async function syncEquipmentTargetImports(
  dataDir: string,
  sourceKinds: Array<"legacy_local_rules" | "dim_wishlist">
): Promise<EquipmentTargetStore> {
  const current = loadEquipmentTargetStore(dataDir);
  if (!current) {
    return loadOrMigrateEquipmentTargetStore(dataDir, {
      legacy_rules: loadLocalTargetRules(dataDir),
      wishlist: loadDimWishlist(dataDir),
      resolve_weapon: resolveWeaponByHash
    });
  }
  const imported = await buildMigratedEquipmentTargetStore({
    legacy_rules: loadLocalTargetRules(dataDir),
    wishlist: loadDimWishlist(dataDir),
    resolve_weapon: resolveWeaponByHash
  });
  return persistEquipmentTargetStore(dataDir, mergeImportedEquipmentTargets(current, imported, sourceKinds));
}

/** DIM Wishlist is a community match source, not a personal equipment-target generator. */
export async function removeDimWishlistEquipmentTargets(dataDir: string): Promise<EquipmentTargetStore> {
  const current = loadEquipmentTargetStore(dataDir) ?? await loadOrMigrateEquipmentTargetStore(dataDir, {
    legacy_rules: loadLocalTargetRules(dataDir),
    wishlist: null,
    resolve_weapon: resolveWeaponByHash
  });
  const migration = { ...(current.migration ?? {}) };
  delete migration.dim_wishlist_imported_at;
  return persistEquipmentTargetStore(dataDir, normalizeEquipmentTargetStore({
    ...current,
    targets: current.targets.filter((target) => target.source.kind !== "dim_wishlist"),
    migration
  }));
}

async function validateEquipmentTargetStore(store: EquipmentTargetStore): Promise<EquipmentTargetStore> {
  const normalized = normalizeEquipmentTargetStore(store);
  const manifestVersion = currentManifestVersion();
  const targets = await mapWithConcurrency(normalized.targets, 8, async (target) => {
    if (target.kind !== "weapon") return target;
    return validateWeaponTarget(target, manifestVersion);
  });
  return normalizeEquipmentTargetStore({ ...normalized, targets });
}

async function loadValidatedEquipmentTargetStore(dataDir: string): Promise<EquipmentTargetStore> {
  const store = await loadOrMigrateEquipmentTargetStore(dataDir, {
    legacy_rules: loadLocalTargetRules(dataDir),
    wishlist: loadDimWishlist(dataDir),
    resolve_weapon: resolveWeaponByHash
  });
  const validated = await validateEquipmentTargetStore(store);
  return equipmentTargetsChanged(store, validated)
    ? persistEquipmentTargetStore(dataDir, validated)
    : store;
}

async function resolveGuideWeaponTarget(input: {
  candidate: GuideExtractionCandidate;
  guideDocumentId: string;
  guideTitle: string;
  sourceSnapshotId: string;
  extractionId: string;
}): Promise<
  | { target: WeaponTarget }
  | { issue: EquipmentTargetConversionIssue }
> {
  const query = input.candidate.label.trim();
  let matches: Array<{ hash: number }>;
  try {
    matches = (await getGameDataCatalog().searchItems({ query, limit: 50 }))
      .filter((item) => item.group_key === "weapons" && normalizeName(item.name) === normalizeName(query));
  } catch (error) {
    return { issue: conversionIssue(input.candidate, `Manifest 武器查询失败：${error instanceof Error ? error.message : String(error)}`) };
  }
  const uniqueMatches = [...new Map(matches.map((item) => [item.hash, item])).values()];
  const uniqueMatch = uniqueMatches[0];
  if (uniqueMatches.length !== 1 || !uniqueMatch) {
    return {
      issue: conversionIssue(
        input.candidate,
        uniqueMatches.length
          ? `找到 ${uniqueMatches.length} 个同名武器版本，需要先人工确认具体版本。`
          : "Manifest 没有找到同名武器，未创建正式目标。"
      )
    };
  }

  const record = await resolveWeaponByHash(uniqueMatch.hash);
  if (!record) {
    return { issue: conversionIssue(input.candidate, "Manifest 无法读取该武器的完整定义，未创建正式目标。") };
  }
  const perkRequirements: WeaponTargetPerkRequirement[] = [];
  for (const perkName of input.candidate.detail.perk_names ?? []) {
    const matchingPerks = [...new Map(record.perk_definitions
      .filter((perk) => normalizeName(perk.perk_name) === normalizeName(perkName))
      .map((perk) => [perk.perk_hash, perk])).values()];
    const matchingPerk = matchingPerks[0];
    if (matchingPerks.length !== 1 || !matchingPerk) {
      return {
        issue: conversionIssue(
          input.candidate,
          matchingPerks.length
            ? `武器内找到 ${matchingPerks.length} 个名为“${perkName}”的 Perk 定义，需要人工确认具体版本。`
            : `无法确认 Perk“${perkName}”属于该武器，未创建正式目标。`
        )
      };
    }
    perkRequirements.push(matchingPerk);
  }

  const targetId = `guide-weapon:${input.guideDocumentId}:${input.sourceSnapshotId}:${input.candidate.id}`;
  return {
    target: createGuideWeaponTarget({
      id: targetId,
      name: `${record.item_name} / 攻略目标`,
      item_hash: record.item_hash,
      item_name: record.item_name,
      perk_requirements: perkRequirements,
      guide_document_id: input.guideDocumentId,
      source_snapshot_id: input.sourceSnapshotId,
      extraction_id: input.extractionId,
      candidate_id: input.candidate.id,
      guide_title: input.guideTitle,
      ...(record.manifest_version ? { manifest_version: record.manifest_version } : {}),
      note: input.candidate.detail.perk_names?.length
        ? `攻略确认要求：${input.candidate.detail.perk_names.join(" + ")}`
        : "攻略确认只指定武器版本，不限制 Roll。"
    })
  };
}

function conversionIssue(
  candidate: GuideExtractionCandidate,
  reason: string
): EquipmentTargetConversionIssue {
  return {
    source_id: candidate.id,
    label: candidate.label,
    reason
  };
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("zh-CN");
}

async function validateWeaponTarget(target: WeaponTarget, manifestVersion?: string): Promise<WeaponTarget> {
  if (target.weapon.status === "verified") {
    if (!manifestVersion || target.weapon.manifest_version === manifestVersion) return target;
    return applyManifestRecord(target, await resolveWeaponByHash(target.weapon.item_hash));
  }
  if (target.weapon.status === "unresolved" && target.weapon.requested_item_hash) {
    if (manifestVersion && target.weapon.checked_manifest_version === manifestVersion) return target;
    return applyManifestRecord(target, await resolveWeaponByHash(target.weapon.requested_item_hash));
  }
  if (target.weapon.status === "unresolved"
    && manifestVersion
    && target.weapon.checked_manifest_version === manifestVersion) return target;
  if (target.weapon.status === "ambiguous") return target;

  try {
    const query = target.weapon.query.trim();
    const matches = (await getGameDataCatalog().searchItems({ query, limit: 20 }))
      .filter((item) => item.group_key === "weapons" && item.name.trim().toLocaleLowerCase() === query.toLocaleLowerCase());
    const uniqueMatches = [...new Map(matches.map((item) => [item.hash, item])).values()];
    const uniqueMatch = uniqueMatches[0];
    if (uniqueMatches.length === 1 && uniqueMatch) {
      return applyManifestRecord(target, await resolveWeaponByHash(uniqueMatch.hash));
    }
    if (uniqueMatches.length > 1) {
      return {
        ...target,
        weapon: {
          status: "ambiguous",
          query,
          candidates: uniqueMatches.map((item) => ({
            item_hash: item.hash,
            item_name: item.name,
            release_label: item.release?.description
          })),
          reason: `找到 ${uniqueMatches.length} 个同名武器版本，需要人工选择后才能参与命中。`
        }
      };
    }
  } catch {
    return target;
  }
  return {
    ...target,
    weapon: {
      status: "unresolved",
      query: target.weapon.query,
      ...(manifestVersion ? { checked_manifest_version: manifestVersion } : {}),
      reason: "当前 Manifest 没有找到可确认的武器版本，目标暂不参与命中。"
    }
  };
}

async function resolveWeaponByHash(itemHash: number): Promise<WeaponTargetManifestRecord | null> {
  try {
    const item = await getGameDataCatalog().getItemDetail({ hash: itemHash });
    if (!item) return null;
    return {
      item_hash: item.hash,
      item_name: item.name,
      group_key: item.group_key,
      perk_definitions: (item.perks ?? []).flatMap((group) => group.plugs.map((plug) => ({
        perk_hash: plug.hash,
        perk_name: plug.name
      }))),
      manifest_version: currentManifestVersion()
    };
  } catch {
    return null;
  }
}

function currentManifestVersion(): string | undefined {
  try {
    return getDesktopManifestStatus().version;
  } catch {
    return undefined;
  }
}

function applyManifestRecord(target: WeaponTarget, record: WeaponTargetManifestRecord | null): WeaponTarget {
  if (!record || record.group_key !== "weapons") {
    return {
      ...target,
      source: withoutManifestEvidence(target),
      weapon: unresolvedWeapon(
        target.weapon,
        "当前 Manifest 无法确认这件武器，目标暂不参与命中。",
        currentManifestVersion()
      )
    };
  }
  const manifestPerks = new Map(record.perk_definitions.map((perk) => [perk.perk_hash, perk.perk_name]));
  const missingPerks = target.perk_requirements.filter((perk) => !manifestPerks.has(perk.perk_hash));
  if (missingPerks.length) {
    return {
      ...target,
      source: withoutManifestEvidence(target),
      weapon: {
        status: "unresolved",
        query: record.item_name,
        requested_item_hash: record.item_hash,
        ...(record.manifest_version ? { checked_manifest_version: record.manifest_version } : {}),
        reason: `Manifest 无法确认 ${missingPerks.length} 个 Perk 属于该武器，目标暂不参与命中。`
      }
    };
  }
  return {
    ...target,
    source: {
      ...target.source,
      evidence_refs: [
        ...target.source.evidence_refs.filter((evidence) => evidence.kind !== "manifest_definition"),
        {
          evidence_id: `equipment-target:${target.id}:manifest:${record.item_hash}`,
          kind: "manifest_definition",
          label: `${record.item_name} / Manifest 定义`,
          observed_at: new Date().toISOString(),
          entity: { type: "inventory_item", id: String(record.item_hash) },
          manifest_version: record.manifest_version,
          open_target: { kind: "item", id: String(record.item_hash) }
        }
      ]
    },
    weapon: {
      status: "verified",
      item_hash: record.item_hash,
      item_name: record.item_name,
      manifest_version: record.manifest_version
    },
    perk_requirements: normalizePerkNames(target.perk_requirements, manifestPerks)
  };
}

function unresolvedWeapon(
  current: WeaponTargetResolution,
  reason: string,
  manifestVersion?: string
): Extract<WeaponTargetResolution, { status: "unresolved" }> {
  if (current.status === "verified") {
    return {
      status: "unresolved",
      query: current.item_name,
      requested_item_hash: current.item_hash,
      ...(manifestVersion ? { checked_manifest_version: manifestVersion } : {}),
      reason
    };
  }
  if (current.status === "ambiguous") {
    return {
      status: "unresolved",
      query: current.query,
      ...(manifestVersion ? { checked_manifest_version: manifestVersion } : {}),
      reason
    };
  }
  return {
    ...current,
    ...(manifestVersion ? { checked_manifest_version: manifestVersion } : {}),
    reason
  };
}

function normalizePerkNames(
  requirements: WeaponTargetPerkRequirement[],
  manifestPerks: Map<number, string>
): WeaponTargetPerkRequirement[] {
  return requirements.map((requirement) => ({
    perk_hash: requirement.perk_hash,
    perk_name: manifestPerks.get(requirement.perk_hash) || requirement.perk_name
  }));
}

function withoutManifestEvidence(target: WeaponTarget): WeaponTarget["source"] {
  return {
    ...target.source,
    evidence_refs: target.source.evidence_refs.filter((evidence) => evidence.kind !== "manifest_definition")
  };
}

function equipmentTargetsChanged(left: EquipmentTargetStore, right: EquipmentTargetStore): boolean {
  return JSON.stringify(left.targets) !== JSON.stringify(right.targets);
}

async function mapWithConcurrency<TInput, TOutput>(
  inputs: TInput[],
  concurrency: number,
  mapper: (input: TInput) => Promise<TOutput>
): Promise<TOutput[]> {
  const outputs = new Array<TOutput>(inputs.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < inputs.length) {
      const index = nextIndex;
      nextIndex += 1;
      outputs[index] = await mapper(inputs[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, inputs.length) }, () => worker()));
  return outputs;
}
