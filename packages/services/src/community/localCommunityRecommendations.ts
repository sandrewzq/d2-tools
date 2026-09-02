import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createLocalCommunitySource as createCoreLocalCommunitySource,
  normalizeLocalCommunityRecommendationTable,
  type CommunityPerkSource,
  type LocalCommunityRecommendationTable
} from "@d2-tools/core/community-perks";
import {
  clearExternalRecommendationSet,
  externalRecommendationMigrationState,
  loadExternalRecommendationSet,
  markExternalRecommendationMigrationChecked,
  saveExternalRecommendationSet,
  type ExternalRecommendationSetRecord
} from "./externalRecommendationStore.js";

const fileName = "local-community-recommendations.json";
const sourceKind = "local_community" as const;
const legacyMigrationMetadataKey = "legacy_local_community_migration";

export function saveLocalCommunityRecommendations(
  dataDir: string,
  table: LocalCommunityRecommendationTable
): LocalCommunityRecommendationTable {
  const next = normalizeLocalCommunityRecommendationTable(table);
  if (next.rules.length === 0) {
    throw new Error("自定义推荐规则至少需要一条有效规则。");
  }

  return externalSetToLocalTable(saveExternalRecommendationSet(dataDir, {
    source_kind: sourceKind,
    title: next.title,
    description: "",
    author: "",
    source_url: "",
    revision: "",
    blocks: [],
    rules: next.rules.map((rule) => ({
      item_hash: rule.item_hash,
      perk_hashes: rule.perk_hashes,
      mode: rule.mode,
      note: rule.note,
      author: "",
      source_note: "",
      source_title: "",
      source_description: "",
      source_label: rule.source_label ?? "",
      tags: []
    })),
    migration_metadata_key: legacyMigrationMetadataKey
  }));
}

export function loadLocalCommunityRecommendations(dataDir: string): LocalCommunityRecommendationTable | null {
  const stored = loadExternalRecommendationSet(dataDir, sourceKind);
  if (stored) return externalSetToLocalTable(stored);

  if (externalRecommendationMigrationState(dataDir, legacyMigrationMetadataKey)) {
    return null;
  }

  const legacy = loadLegacyLocalTable(dataDir);
  if (!legacy) {
    markExternalRecommendationMigrationChecked(dataDir, legacyMigrationMetadataKey);
    return null;
  }
  return saveLocalCommunityRecommendations(dataDir, legacy);
}

export function clearLocalCommunityRecommendations(dataDir: string): void {
  clearExternalRecommendationSet(dataDir, sourceKind, legacyMigrationMetadataKey);
}

export function createLocalCommunitySource(dataDir: string): CommunityPerkSource {
  return createCoreLocalCommunitySource(() => loadLocalCommunityRecommendations(dataDir));
}

function loadLegacyLocalTable(dataDir: string): LocalCommunityRecommendationTable | null {
  const file = tablePath(dataDir);
  if (!existsSync(file)) return null;

  const table = normalizeLocalCommunityRecommendationTable(JSON.parse(readFileSync(file, "utf8")) as unknown);
  return table.rules.length ? table : null;
}

function externalSetToLocalTable(set: ExternalRecommendationSetRecord): LocalCommunityRecommendationTable {
  return {
    title: set.title || "自定义推荐规则",
    rules: set.rules.map((rule) => ({
      item_hash: rule.item_hash,
      perk_hashes: rule.perk_hashes,
      mode: rule.mode,
      note: rule.note,
      ...(rule.source_label ? { source_label: rule.source_label } : {})
    }))
  };
}

function tablePath(dataDir: string): string {
  return join(dataDir, fileName);
}
