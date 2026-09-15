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
    const dimSet = database.prepare(`
      SELECT MAX(d.imported_at) AS imported_at, MAX(d.fingerprint) AS revision
      FROM recommendation_documents d
      WHERE d.document_id LIKE 'dim-document:%'
    `).get() as { imported_at: string; revision: string } | undefined;
    const sources: RecommendationManagedSource[] = curatedRows.map((row) => ({
      source_key: row.source_key,
      label: row.label,
      kind: "curated" as const,
      state: recommendationSourceState(database, row.source_key),
      configured: true,
      rule_count: Number(row.rule_count ?? 0),
      weapon_count: Number(row.weapon_count ?? 0),
      revision: curatedRevision,
      imported_at: importedAt
    }));
    const storedInstances = database.prepare(`
      SELECT s.document_id, d.title AS document_title, d.author AS document_author,
             MAX(s.revision) AS revision, MAX(s.fingerprint) AS fingerprint,
             MAX(d.imported_at) AS imported_at,
             COUNT(r.rule_id) AS rule_count,
             COUNT(DISTINCT r.item_hash) AS weapon_count
      FROM recommendation_source_instances s
      JOIN recommendation_documents d ON d.document_id = s.document_id
      LEFT JOIN recommendation_source_rules r ON r.source_id = s.source_id
      WHERE s.kind = 'dim' AND s.state <> 'removed'
      GROUP BY s.document_id, d.title, d.author
      ORDER BY imported_at, s.document_id
    `).all() as Array<{ document_id: string; document_title: string; document_author: string; revision: string; fingerprint: string; imported_at: string; rule_count: number; weapon_count: number }>;
    // 一个 DIM 导入文档是一个与人工 CSV 平级的可管理来源；作者 / block 只在详情中展示。
    sources.push(...storedInstances.map((row) => {
      const sourceKey = `dim:${row.document_id.slice("dim-document:".length)}`;
      return {
        source_key: sourceKey,
        label: row.document_title || "DIM Wishlist",
        kind: "dim" as const,
        state: recommendationSourceState(database, sourceKey),
        configured: true,
        rule_count: Number(row.rule_count ?? 0),
        weapon_count: Number(row.weapon_count ?? 0),
        revision: row.revision || row.fingerprint,
        imported_at: row.imported_at
      };
    }));
    return {
      curated_revision: curatedRevision,
      dim_revision: dimSet?.revision ?? "",
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
  assertManagedSource(dataDir, sourceKey);
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
  assertManagedSource(dataDir, sourceKey);
  if (state === "removed") removeSourceDataset(dataDir, sourceKey);
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
  assertManagedSource(dataDir, input.source_key);
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
  return recommendationSourceItemHashesBySource(dataDir, [sourceKey]).get(sourceKey) ?? [];
}

export function recommendationSourceItemHashesBySource(
  dataDir: string,
  sourceKeys: readonly string[]
): Map<string, number[]> {
  const requestedKeys = [...new Set(sourceKeys)];
  const hashesBySource = new Map(requestedKeys.map((sourceKey) => [sourceKey, new Set<number>()]));
  if (!requestedKeys.length) return new Map();

  const database = openRecommendationDatabase(dataDir);
  try {
    const curatedKeys = requestedKeys.filter((sourceKey) => (
      !sourceKey.startsWith("dim:")
    ));
    if (curatedKeys.length) {
      const placeholders = curatedKeys.map(() => "?").join(", ");
      const rows = database.prepare(`
        SELECT DISTINCT s.source_key, item.item_hash
        FROM weapon_recommendation_item_ids item
        JOIN weapon_recommendations r ON r.id = item.recommendation_id
        JOIN recommendation_sources s ON s.id = r.source_id
        WHERE s.source_key IN (${placeholders})
      `).all(...curatedKeys) as Array<{ source_key: string; item_hash: number }>;
      for (const row of rows) hashesBySource.get(row.source_key)?.add(Number(row.item_hash));
    }

    const dimKeys = requestedKeys.filter((sourceKey) => sourceKey.startsWith("dim:"));
    if (dimKeys.length) {
      const placeholders = dimKeys.map(() => "?").join(", ");
      const storedSources = database.prepare(`
        SELECT source_id
        FROM recommendation_source_instances
        WHERE source_id IN (${placeholders})
      `).all(...dimKeys) as Array<{ source_id: string }>;
      // 文档级来源使用 dim:<documentKey>，规则实例使用 dim:<documentKey>:<blockKey>。
      // 精确查询上面只覆盖实例 key，文档 key 通过前缀查询补齐。
      for (const documentKey of dimKeys.filter(isDimDocumentSourceKey)) {
        const rows = database.prepare(`
          SELECT source_id
          FROM recommendation_source_instances
          WHERE source_id LIKE ?
        `).all(`${documentKey}:%`) as Array<{ source_id: string }>;
        storedSources.push(...rows);
      }
      const storedSourceIds = [...new Set(storedSources.map((row) => row.source_id))];
      if (storedSourceIds.length) {
        const storedPlaceholders = storedSourceIds.map(() => "?").join(", ");
        const storedRows = database.prepare(`
          SELECT DISTINCT source_id, item_hash
          FROM recommendation_source_rules
          WHERE source_id IN (${storedPlaceholders})
        `).all(...storedSourceIds) as Array<{ source_id: string; item_hash: number }>;
        for (const row of storedRows) {
          const itemHash = Number(row.item_hash);
          hashesBySource.get(row.source_id)?.add(itemHash);
          hashesBySource.get(dimDocumentSourceKey(row.source_id))?.add(itemHash);
        }
      }
    }

    return new Map([...hashesBySource].map(([sourceKey, hashes]) => [sourceKey, [...hashes]]));
  } finally {
    database.close();
  }
}

function removeSourceDataset(dataDir: string, sourceKey: string): void {
  const database = openRecommendationDatabase(dataDir);
  database.exec("BEGIN IMMEDIATE;");
  try {
    if (sourceKey.startsWith("dim:")) {
      const documentId = "dim-document:" + sourceKey.slice("dim:".length);
      database.prepare("DELETE FROM recommendation_rule_overrides WHERE source_key = ? OR source_key LIKE ?").run(sourceKey, sourceKey + ":%");
      database.prepare("DELETE FROM recommendation_source_rules WHERE source_id IN (SELECT source_id FROM recommendation_source_instances WHERE document_id = ?)").run(documentId);
      database.prepare("DELETE FROM recommendation_source_instances WHERE document_id = ?").run(documentId);
      database.prepare("DELETE FROM recommendation_documents WHERE document_id = ?").run(documentId);
      const remainingDocuments = database.prepare("SELECT COUNT(*) AS count FROM recommendation_documents WHERE document_id LIKE 'dim-document:%'").get() as { count?: number };
      if (!Number(remainingDocuments.count ?? 0)) {
        database.prepare("DELETE FROM external_recommendation_sets WHERE source_kind = 'dim_wishlist'").run();
      }
    } else {
      database.prepare("DELETE FROM recommendation_rule_overrides WHERE source_key = ?").run(sourceKey);
      database.prepare("DELETE FROM recommendation_sources WHERE source_key = ?").run(sourceKey);
    }
    database.prepare("DELETE FROM recommendation_source_overrides WHERE source_key = ? OR source_key LIKE ?").run(sourceKey, sourceKey + ":%");
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
  if (state === "removed") {
    return listRecommendationRuleOverridesFromRows(overrides)
      .filter((entry) => entry.state === "removed")
      .map((entry) => currentRuleForOverride(database, entry) ?? missingRuleForOverride(entry))
      .sort(compareRules);
  }
  const overridesByKey = new Map(overrides.map((entry) => [overrideKey(entry.source_key, entry.rule_stable_id), entry]));
  const curated = curatedRules(database, sourceKey).map((rule) => withOverride(rule, overridesByKey));
  const dim = (!sourceKey || sourceKey.startsWith("dim:"))
    ? dimRules(database, sourceKey).map((rule) => withOverride(rule, overridesByKey))
    : [];
  return [...curated, ...dim].sort(compareRules);
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

function currentRuleForOverride(
  database: DatabaseSync,
  override: ReturnType<typeof listRecommendationRuleOverridesFromRows>[number]
): RecommendationManagedRule | null {
  if (override.source_key.startsWith("dim:")) {
    return dimRuleForOverride(database, override);
  }
  const row = database.prepare(`
    SELECT r.id, r.weapon_name, r.note, s.label AS source_label
    FROM weapon_recommendations r
    JOIN recommendation_sources s ON s.id = r.source_id
    WHERE s.source_key = ? AND r.rule_stable_id = ?
  `).get(override.source_key, override.rule_stable_id) as {
    id: number;
    weapon_name: string;
    note: string;
    source_label: string;
  } | undefined;
  if (!row) return null;

  const weaponHashes = (database.prepare(`
    SELECT item_hash FROM weapon_recommendation_item_ids WHERE recommendation_id = ?
  `).all(row.id) as Array<{ item_hash: number }>).map((entry) => Number(entry.item_hash));
  const purposes = (database.prepare(`
    SELECT purpose FROM weapon_recommendation_purposes WHERE recommendation_id = ?
  `).all(row.id) as Array<{ purpose: "pve" | "pvp" | "general" }>).map((entry) => entry.purpose);
  const perkRows = database.prepare(`
    SELECT slot, perk_name
    FROM weapon_recommendation_perks
    WHERE recommendation_id = ?
    ORDER BY slot, ordinal
  `).all(row.id) as Array<{ slot: string; perk_name: string }>;
  const requirementsBySlot = new Map<string, string[]>();
  for (const perk of perkRows) {
    requirementsBySlot.set(perk.slot, [...(requirementsBySlot.get(perk.slot) ?? []), perk.perk_name]);
  }
  return withOverride({
    source_key: override.source_key,
    source_label: row.source_label,
    rule_stable_id: override.rule_stable_id,
    weapon_hashes: weaponHashes,
    weapon_name: row.weapon_name,
    purposes: purposes.length ? purposes : ["general"],
    requirements: [...requirementsBySlot].map(([slot, names]) => ({ slot, names })),
    note: row.note,
    state: "active",
    review_required: false,
    source_revision: recommendationMetadataValue(database, "dataset_revision"),
    reason: ""
  }, new Map([[overrideKey(override.source_key, override.rule_stable_id), {
    ...override,
    review_required: override.review_required ? 1 : 0
  }]]));
}

function dimRuleForOverride(
  database: DatabaseSync,
  override: ReturnType<typeof listRecommendationRuleOverridesFromRows>[number]
): RecommendationManagedRule | null {
  // 旧版 dim_wishlist 覆盖键按规则 ID 匹配任意 DIM 来源实例，其余按来源实例精确匹配。
  const scopedToInstance = override.source_key.startsWith("dim:") && !isDimDocumentSourceKey(override.source_key);
  const stored = database.prepare(`
    SELECT r.item_hash, r.mode, r.kind, r.perk_hashes, r.note, r.source_id,
           s.label, s.revision
    FROM recommendation_source_rules r
    JOIN recommendation_source_instances s ON s.source_id = r.source_id
    WHERE r.rule_id = ? AND s.kind = 'dim'
      ${scopedToInstance ? "AND r.source_id = ?" : ""}
    ORDER BY r.rowid
  `).get(...(scopedToInstance ? [override.rule_stable_id, override.source_key] : [override.rule_stable_id])) as {
    item_hash: number;
    mode: "pve" | "pvp" | "general";
    kind: "roll" | "weapon_only";
    perk_hashes: string;
    note: string;
    source_id: string;
    label: string;
    revision: string;
  } | undefined;
  if (!stored) return null;
  return {
    source_key: stored.source_id,
    source_label: stored.label,
    rule_stable_id: override.rule_stable_id,
    weapon_hashes: [Number(stored.item_hash)],
    weapon_name: `武器 ${stored.item_hash}`,
    purposes: [stored.mode],
    requirements: stored.kind === "weapon_only"
      ? []
      : [{ slot: "DIM 完整组合", names: parseJsonStrings(stored.perk_hashes) }],
    note: stored.note,
    state: override.state,
    review_required: override.review_required,
    source_revision: override.source_revision || stored.revision,
    reason: override.reason
  };
}

function missingRuleForOverride(
  entry: ReturnType<typeof listRecommendationRuleOverridesFromRows>[number]
): RecommendationManagedRule {
  return {
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
  };
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

function dimRules(database: DatabaseSync, sourceKey?: string): RecommendationManagedRule[] {
  // DIM 规则只来自新模型：dim:<documentKey> 取整个文档，dim:<documentKey>:<identity> 取单个来源实例。
  const scoped = Boolean(sourceKey?.startsWith("dim:"));
  const documentSource = scoped && isDimDocumentSourceKey(sourceKey as string);
  const rows = database.prepare(`
    SELECT r.rule_id, r.item_hash, r.mode, r.kind, r.perk_hashes, r.note,
           s.source_id,
           s.label, s.revision
    FROM recommendation_source_rules r
    JOIN recommendation_source_instances s ON s.source_id = r.source_id
    WHERE s.kind = 'dim'
      ${scoped ? (documentSource ? "AND r.source_id LIKE ?" : "AND r.source_id = ?") : ""}
    ORDER BY r.rowid
  `).all(...(scoped ? [documentSource ? `${sourceKey}:%` : (sourceKey as string)] : [])) as Array<{
    source_id: string;
    rule_id: string;
    item_hash: number;
    mode: "pve" | "pvp" | "general";
    kind: "roll" | "weapon_only";
    perk_hashes: string;
    note: string;
    label: string;
    revision: string;
  }>;
  return rows.map((row) => ({
    source_key: row.source_id,
    source_label: row.label,
    rule_stable_id: row.rule_id,
    weapon_hashes: [Number(row.item_hash)],
    weapon_name: `武器 ${row.item_hash}`,
    purposes: [row.mode],
    requirements: row.kind === "weapon_only" ? [] : [{ slot: "DIM 完整组合", names: parseJsonStrings(row.perk_hashes) }],
    note: row.note,
    state: "active",
    review_required: false,
    source_revision: row.revision,
    reason: ""
  }));
}

function isDimDocumentSourceKey(sourceKey: string): boolean {
  return /^dim:[^:]+$/u.test(sourceKey);
}

function dimDocumentSourceKey(sourceKey: string): string {
  if (!sourceKey.startsWith("dim:")) return sourceKey;
  const [, documentKey] = sourceKey.split(":");
  return documentKey ? `dim:${documentKey}` : sourceKey;
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

function parseJsonStrings(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function assertManagedSource(dataDir: string, sourceKey: string): void {
  if (managedSources.some((source) => source.source_key === sourceKey) || sourceKey.startsWith("dim:")) return;
  const database = openRecommendationDatabase(dataDir);
  try {
    const row = database.prepare("SELECT 1 AS present FROM recommendation_sources WHERE source_key = ?").get(sourceKey) as { present?: number } | undefined;
    if (row?.present === 1) return;
  } finally {
    database.close();
  }
  throw new Error("推荐来源无效。");
}
