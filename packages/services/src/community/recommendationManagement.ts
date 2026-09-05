import type { DatabaseSync } from "node:sqlite";
import {
  openRecommendationDatabase,
  recommendationMetadataValue,
  writeRecommendationMetadata
} from "./recommendationDatabase.js";
import {
  recommendationSourceState,
  setRecommendationRuleState,
  setRecommendationSourceState,
  type RecommendationRuleState,
  type RecommendationSourceState
} from "./recommendationOverrides.js";

const managedSources = [
  { source_key: "aegis", label: "Aegis推荐", kind: "curated" },
  { source_key: "lgpig", label: "LGpig推荐", kind: "curated" },
  { source_key: "yxcrallxy", label: "YXCRALLXY推荐表", kind: "curated" },
  { source_key: "sayalarry", label: "Sayalarry推荐表", kind: "curated" },
  { source_key: "dim_wishlist", label: "DIM社区愿望单", kind: "dim" }
] as const;

export type RecommendationManagedSource = {
  source_key: string;
  label: string;
  kind: "curated" | "dim";
  state: RecommendationSourceState;
  configured: boolean;
  rule_count: number;
  weapon_count: number;
  revision: string;
  imported_at: string;
  affected_instance_count?: number;
};

export type RecommendationManagedRule = {
  source_key: string;
  source_label: string;
  rule_stable_id: string;
  weapon_hashes: number[];
  weapon_name: string;
  purposes: Array<"pve" | "pvp" | "general">;
  requirements: Array<{ slot: string; names: string[] }>;
  note: string;
  state: RecommendationRuleState;
  review_required: boolean;
  source_revision: string;
  reason: string;
  affected_instance_count?: number;
};

export type RecommendationManagementSnapshot = {
  curated_revision: string;
  dim_revision: string;
  sources: RecommendationManagedSource[];
  removed_rules: RecommendationManagedRule[];
  affected_weapon_hashes?: number[];
};

export function readRecommendationManagementSnapshot(dataDir: string): RecommendationManagementSnapshot {
  const database = openRecommendationDatabase(dataDir);
  try {
    const curatedRevision = recommendationMetadataValue(database, "dataset_revision");
    const importedAt = recommendationMetadataValue(database, "imported_at");
    const curatedRows = database.prepare(`
      SELECT s.source_key, s.label, COUNT(DISTINCT r.id) AS rule_count,
             COUNT(DISTINCT item.item_hash) AS weapon_count
      FROM recommendation_sources s
      LEFT JOIN weapon_recommendations r ON r.source_id = s.id
      LEFT JOIN weapon_recommendation_item_ids item ON item.recommendation_id = r.id
      GROUP BY s.source_key, s.label
    `).all() as Array<{ source_key: string; label: string; rule_count: number; weapon_count: number }>;
    const curatedByKey = new Map(curatedRows.map((row) => [row.source_key, row]));
    const dimSet = database.prepare(`
      SELECT revision, source_fingerprint, imported_at
      FROM external_recommendation_sets
      WHERE source_kind = 'dim_wishlist'
    `).get() as { revision: string; source_fingerprint: string; imported_at: string } | undefined;
    const dimCounts = database.prepare(`
      SELECT COUNT(*) AS rule_count, COUNT(DISTINCT item_hash) AS weapon_count
      FROM external_recommendation_rules
      WHERE source_kind = 'dim_wishlist'
    `).get() as { rule_count: number; weapon_count: number };
    const sources = managedSources.map((source): RecommendationManagedSource => {
      if (source.kind === "dim") {
        return {
          ...source,
          state: recommendationSourceState(database, source.source_key),
          configured: Boolean(dimSet),
          rule_count: Number(dimCounts.rule_count ?? 0),
          weapon_count: Number(dimCounts.weapon_count ?? 0),
          revision: dimSet?.revision || dimSet?.source_fingerprint || "",
          imported_at: dimSet?.imported_at ?? ""
        };
      }
      const row = curatedByKey.get(source.source_key);
      return {
        ...source,
        label: row?.label || source.label,
        state: recommendationSourceState(database, source.source_key),
        configured: Boolean(row?.rule_count),
        rule_count: Number(row?.rule_count ?? 0),
        weapon_count: Number(row?.weapon_count ?? 0),
        revision: curatedRevision,
        imported_at: importedAt
      };
    });
    return {
      curated_revision: curatedRevision,
      dim_revision: dimSet?.revision || dimSet?.source_fingerprint || "",
      sources,
      removed_rules: listRecommendationRulesFromDatabase(database, undefined, "removed")
    };
  } finally {
    database.close();
  }
}

export function listRecommendationManagedRules(
  dataDir: string,
  sourceKey: string,
  query = "",
  limit = 200
): RecommendationManagedRule[] {
  assertManagedSource(sourceKey);
  const database = openRecommendationDatabase(dataDir);
  try {
    const normalized = query.trim().toLocaleLowerCase();
    return listRecommendationRulesFromDatabase(database, sourceKey, "all")
      .filter((rule) => {
        return !normalized
          || rule.weapon_name.toLocaleLowerCase().includes(normalized)
          || rule.note.toLocaleLowerCase().includes(normalized)
          || rule.requirements.some((requirement) => requirement.names.some((name) => name.toLocaleLowerCase().includes(normalized)));
      })
      .slice(0, Math.max(1, Math.min(500, limit)));
  } finally {
    database.close();
  }
}

export function updateRecommendationManagedSource(
  dataDir: string,
  sourceKey: string,
  state: RecommendationSourceState
): RecommendationManagementSnapshot {
  assertManagedSource(sourceKey);
  if (state === "removed") removeSourceDatasetAndKeepTombstone(dataDir, sourceKey);
  else setRecommendationSourceState(dataDir, sourceKey, state);
  return readRecommendationManagementSnapshot(dataDir);
}

export function updateRecommendationManagedRule(
  dataDir: string,
  input: {
    source_key: string;
    rule_stable_id: string;
    state: RecommendationRuleState;
    reason?: string;
    source_revision?: string;
  }
): RecommendationManagementSnapshot {
  assertManagedSource(input.source_key);
  setRecommendationRuleState(dataDir, input);
  return readRecommendationManagementSnapshot(dataDir);
}

export function clearCuratedRecommendationDataset(dataDir: string): RecommendationManagementSnapshot {
  const database = openRecommendationDatabase(dataDir);
  database.exec("BEGIN IMMEDIATE;");
  try {
    database.exec(`
      DELETE FROM weapon_recommendation_perks;
      DELETE FROM weapon_recommendation_purposes;
      DELETE FROM weapon_recommendation_item_ids;
      DELETE FROM weapon_recommendations;
      DELETE FROM recommendation_sources;
    `);
    for (const key of [
      "schema_version", "source_fingerprint", "imported_at",
      "semantic_validation_version", "validated_manifest_version", "dataset_revision"
    ]) writeRecommendationMetadata(database, key, "");
    writeRecommendationMetadata(database, "curated_dataset_state", `cleared:${new Date().toISOString()}`);
    database.exec("COMMIT;");
  } catch (error) {
    try { database.exec("ROLLBACK;"); } catch { /* 保留原始错误。 */ }
    throw error;
  } finally {
    database.close();
  }
  return readRecommendationManagementSnapshot(dataDir);
}

export function curatedRecommendationDatasetWasCleared(dataDir: string): boolean {
  const database = openRecommendationDatabase(dataDir);
  try {
    return recommendationMetadataValue(database, "curated_dataset_state").startsWith("cleared:");
  } finally {
    database.close();
  }
}

export function recommendationSourceItemHashes(dataDir: string, sourceKey: string): number[] {
  const database = openRecommendationDatabase(dataDir);
  try {
    if (sourceKey === "dim_wishlist") {
      return (database.prepare(`
        SELECT DISTINCT item_hash
        FROM external_recommendation_rules
        WHERE source_kind = 'dim_wishlist'
      `).all() as Array<{ item_hash: number }>).map((row) => Number(row.item_hash));
    }
    return (database.prepare(`
      SELECT DISTINCT item.item_hash
      FROM weapon_recommendation_item_ids item
      JOIN weapon_recommendations r ON r.id = item.recommendation_id
      JOIN recommendation_sources s ON s.id = r.source_id
      WHERE s.source_key = ?
    `).all(sourceKey) as Array<{ item_hash: number }>).map((row) => Number(row.item_hash));
  } finally {
    database.close();
  }
}

function removeSourceDatasetAndKeepTombstone(dataDir: string, sourceKey: string): void {
  const database = openRecommendationDatabase(dataDir);
  database.exec("BEGIN IMMEDIATE;");
  try {
    database.prepare(`
      INSERT INTO recommendation_source_overrides (source_key, state, updated_at)
      VALUES (?, 'removed', ?)
      ON CONFLICT(source_key) DO UPDATE SET
        state = excluded.state,
        updated_at = excluded.updated_at
    `).run(sourceKey, new Date().toISOString());
    if (sourceKey === "dim_wishlist") {
      database.prepare("DELETE FROM external_recommendation_sets WHERE source_kind = 'dim_wishlist'").run();
      writeRecommendationMetadata(database, "legacy_dim_wishlist_migration", `cleared:${new Date().toISOString()}`);
    } else {
      database.prepare("DELETE FROM recommendation_sources WHERE source_key = ?").run(sourceKey);
    }
    database.exec("COMMIT;");
  } catch (error) {
    try { database.exec("ROLLBACK;"); } catch { /* 保留原始错误。 */ }
    throw error;
  } finally {
    database.close();
  }
}

function listRecommendationRulesFromDatabase(
  database: DatabaseSync,
  sourceKey: string | undefined,
  state: "all" | "removed"
): RecommendationManagedRule[] {
  const overrides = listRuleOverrides(database);
  const overridesByKey = new Map(overrides.map((entry) => [overrideKey(entry.source_key, entry.rule_stable_id), entry]));
  const curated = curatedRules(database, sourceKey).map((rule) => withOverride(rule, overridesByKey));
  const dim = (!sourceKey || sourceKey === "dim_wishlist")
    ? dimRules(database).map((rule) => withOverride(rule, overridesByKey))
    : [];
  const current = [...curated, ...dim];
  if (state === "all") return current.sort(compareRules);
  const currentByKey = new Map(current.map((rule) => [`${rule.source_key}:${rule.rule_stable_id}`, rule]));
  const removedRules = listRecommendationRuleOverridesFromRows(overrides)
    .filter((entry) => entry.state === "removed")
    .map((entry) => currentByKey.get(`${entry.source_key}:${entry.rule_stable_id}`) ?? {
      source_key: entry.source_key,
      source_label: managedSources.find((source) => source.source_key === entry.source_key)?.label ?? entry.source_key,
      rule_stable_id: entry.rule_stable_id,
      weapon_hashes: [],
      weapon_name: entry.review_required ? "原规则已变化，需要复核" : "当前数据中未找到原规则",
      purposes: [],
      requirements: [],
      note: "",
      state: entry.state,
      review_required: entry.review_required,
      source_revision: entry.source_revision,
      reason: entry.reason
    });
  return removedRules.sort(compareRules);
}

type RuleOverrideRow = ReturnType<typeof listRuleOverrides>[number];

function listRuleOverrides(database: DatabaseSync) {
  return database.prepare(`
    SELECT source_key, rule_stable_id, state, reason, source_revision, review_required
    FROM recommendation_rule_overrides
  `).all() as Array<{
    source_key: string;
    rule_stable_id: string;
    state: RecommendationRuleState;
    reason: string;
    source_revision: string;
    review_required: number;
  }>;
}

function listRecommendationRuleOverridesFromRows(rows: RuleOverrideRow[]) {
  return rows.map((row) => ({ ...row, review_required: row.review_required === 1 }));
}

function curatedRules(database: DatabaseSync, sourceKey?: string): RecommendationManagedRule[] {
  const rows = database.prepare(`
    SELECT r.id, r.rule_stable_id, r.weapon_name, r.note, s.source_key, s.label AS source_label
    FROM weapon_recommendations r
    JOIN recommendation_sources s ON s.id = r.source_id
    WHERE (? = '' OR s.source_key = ?)
    ORDER BY r.weapon_name, r.id
  `).all(sourceKey ?? "", sourceKey ?? "") as Array<{
    id: number;
    rule_stable_id: string;
    weapon_name: string;
    source_key: string;
    source_label: string;
    note: string;
  }>;
  const ids = new Set(rows.map((row) => row.id));
  const hashes = groupRows(database.prepare(`
    SELECT recommendation_id AS id, item_hash AS value
    FROM weapon_recommendation_item_ids
  `).all() as Array<{ id: number; value: number }>, ids, Number);
  const purposes = groupRows(database.prepare(`
    SELECT recommendation_id AS id, purpose AS value
    FROM weapon_recommendation_purposes
  `).all() as Array<{ id: number; value: string }>, ids, String);
  const perkRows = database.prepare(`
    SELECT recommendation_id AS id, slot, perk_name
    FROM weapon_recommendation_perks
    ORDER BY recommendation_id, slot, ordinal
  `).all() as Array<{ id: number; slot: string; perk_name: string }>;
  const requirements = new Map<number, Map<string, string[]>>();
  for (const row of perkRows) {
    if (!ids.has(row.id)) continue;
    const bySlot = requirements.get(row.id) ?? new Map<string, string[]>();
    bySlot.set(row.slot, [...(bySlot.get(row.slot) ?? []), row.perk_name]);
    requirements.set(row.id, bySlot);
  }
  return rows.map((row) => ({
    source_key: row.source_key,
    source_label: row.source_label,
    rule_stable_id: row.rule_stable_id,
    weapon_hashes: hashes.get(row.id) ?? [],
    weapon_name: row.weapon_name,
    purposes: (purposes.get(row.id) ?? ["general"]) as Array<"pve" | "pvp" | "general">,
    requirements: [...(requirements.get(row.id) ?? [])].map(([slot, names]) => ({ slot, names })),
    note: row.note,
    state: "active",
    review_required: false,
    source_revision: recommendationMetadataValue(database, "dataset_revision"),
    reason: ""
  }));
}

function dimRules(database: DatabaseSync): RecommendationManagedRule[] {
  const set = database.prepare(`
    SELECT revision, source_fingerprint
    FROM external_recommendation_sets
    WHERE source_kind = 'dim_wishlist'
  `).get() as { revision: string; source_fingerprint: string } | undefined;
  const rows = database.prepare(`
    SELECT id, rule_stable_id, item_hash, mode, note, source_title
    FROM external_recommendation_rules
    WHERE source_kind = 'dim_wishlist'
    ORDER BY item_hash, ordinal
  `).all() as Array<{ id: number; rule_stable_id: string; item_hash: number; mode: "pve" | "pvp" | "general"; note: string; source_title: string }>;
  const ids = new Set(rows.map((row) => row.id));
  const perks = groupRows(database.prepare(`
    SELECT rule_id AS id, perk_hash AS value
    FROM external_recommendation_rule_perks
    ORDER BY rule_id, ordinal
  `).all() as Array<{ id: number; value: number }>, ids, Number);
  return rows.map((row) => ({
    source_key: "dim_wishlist",
    source_label: "DIM社区愿望单",
    rule_stable_id: row.rule_stable_id,
    weapon_hashes: [Number(row.item_hash)],
    weapon_name: `武器 ${row.item_hash}`,
    purposes: [row.mode],
    requirements: [{ slot: "DIM 完整组合", names: (perks.get(row.id) ?? []).map(String) }],
    note: row.note || row.source_title,
    state: "active",
    review_required: false,
    source_revision: set?.revision || set?.source_fingerprint || "",
    reason: ""
  }));
}

function withOverride(
  rule: RecommendationManagedRule,
  overridesByKey: ReadonlyMap<string, RuleOverrideRow>
): RecommendationManagedRule {
  const override = overridesByKey.get(overrideKey(rule.source_key, rule.rule_stable_id));
  return override ? {
    ...rule,
    state: override.state,
    review_required: override.review_required === 1,
    source_revision: override.source_revision || rule.source_revision,
    reason: override.reason
  } : rule;
}

function overrideKey(sourceKey: string, ruleStableId: string): string {
  return `${sourceKey}\u0000${ruleStableId}`;
}

function groupRows<T>(
  rows: Array<{ id: number; value: unknown }>,
  allowedIds: ReadonlySet<number>,
  convert: (value: unknown) => T
): Map<number, T[]> {
  const grouped = new Map<number, T[]>();
  for (const row of rows) {
    if (!allowedIds.has(row.id)) continue;
    grouped.set(row.id, [...(grouped.get(row.id) ?? []), convert(row.value)]);
  }
  return grouped;
}

function compareRules(left: RecommendationManagedRule, right: RecommendationManagedRule): number {
  return left.source_label.localeCompare(right.source_label, "zh-Hans-CN")
    || left.weapon_name.localeCompare(right.weapon_name, "zh-Hans-CN")
    || left.rule_stable_id.localeCompare(right.rule_stable_id);
}

function assertManagedSource(sourceKey: string): void {
  if (!managedSources.some((source) => source.source_key === sourceKey)) {
    throw new Error("推荐来源无效。");
  }
}
