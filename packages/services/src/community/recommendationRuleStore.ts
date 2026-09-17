import type { DatabaseSync } from "node:sqlite";

/**
 * 规则的统一读写口（T56 Layer 3）。
 *
 * 存储里规则是三级模型的第三级，格式（DIM / 人工 CSV / 将来的其它格式）只影响
 * **写进来的字段从哪来**，不影响表结构与读取路径——所以这里没有任何按来源类型的判断。
 *
 * 两个子表承载可变长的部分：
 * - `recommendation_source_rule_items`：一条规则可覆盖多把武器（人工模板一行可写多个武器 ID），
 *   所以武器身份不能留在规则行的单值 `item_hash` 上。
 * - `recommendation_source_rule_requirements`：逐条要求，`slot` 为空串表示来源没有指定栏位
 *   （DIM 格式就是这种），由读取方按武器定义解析。同一性语义是**逐条与**，
 *   备选写在单条要求的 `candidates` 列表里，或在读取层按 `rule_group_id` 归约。
 *
 * `perk_hashes` 列自 v9 起不再读写，只作为迁移来源保留。
 */

export type RecommendationRulePurpose = "pve" | "pvp" | "general";

export type RecommendationStoredRequirement = {
  /** 空串 = 来源未指定栏位。 */
  slot: string;
  /** 该要求的候选武器特长哈希，任选其一即满足。 */
  candidates: number[];
};

export type RecommendationStoredRule = {
  ruleId: string;
  /** 互为备选的规则共用同一个分组键；单条规则自成一组。 */
  ruleGroupId: string;
  itemHashes: number[];
  mode: RecommendationRulePurpose;
  kind: "roll" | "weapon_only";
  requirements: RecommendationStoredRequirement[];
  purposes: RecommendationRulePurpose[];
  note: string;
  tags: string[];
  author: string;
  sourceNote: string;
  sourceTitle: string;
  sourceDescription: string;
  blockId: string;
  rating: string;
  ranking: string;
  pageUpdatedAt: string;
  version: string;
  sourceLocation: string;
  sourceUrl: string;
};

export type RecommendationRuleWrite = {
  ruleId: string;
  ruleGroupId?: string;
  itemHashes: number[];
  /**
   * 规则的用途集合。空数组表示来源没有声明用途，按 `general` 处理。
   * `mode` 是单值投影，取集合首项；两者在写入时一次算出，不存在两个真相。
   */
  purposes: RecommendationRulePurpose[];
  mode?: RecommendationRulePurpose;
  kind?: "roll" | "weapon_only";
  requirements?: RecommendationStoredRequirement[];
  note?: string;
  tags?: string[];
  author?: string;
  sourceNote?: string;
  sourceTitle?: string;
  sourceDescription?: string;
  blockId?: string;
  rating?: string;
  ranking?: string;
  pageUpdatedAt?: string;
  version?: string;
  sourceLocation?: string;
  sourceUrl?: string;
};

export function writeRecommendationRule(
  database: DatabaseSync,
  sourceId: string,
  rule: RecommendationRuleWrite
): void {
  const purposes = normalizePurposes(rule.purposes);
  // 单值投影只在写入这一刻产生，读侧永远同时拿到两份一致的数据。
  const mode = rule.mode ?? purposes[0] ?? "general";
  const requirements = rule.requirements ?? [];
  const kind = rule.kind ?? (requirements.length ? "roll" : "weapon_only");
  database.prepare(`
    INSERT INTO recommendation_source_rules(
      source_id, rule_id, rule_group_id, item_hash, mode, kind, perk_hashes, purposes,
      note, tags, author, source_note, source_title, source_description, block_id,
      rating, ranking, page_updated_at, version, source_location, source_url
    ) VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sourceId, rule.ruleId, rule.ruleGroupId ?? rule.ruleId,
    rule.itemHashes[0] ?? 0, mode, kind, JSON.stringify(purposes),
    rule.note ?? "", JSON.stringify(rule.tags ?? []), rule.author ?? "",
    rule.sourceNote ?? "", rule.sourceTitle ?? "", rule.sourceDescription ?? "", rule.blockId ?? "",
    rule.rating ?? "", rule.ranking ?? "", rule.pageUpdatedAt ?? "", rule.version ?? "",
    rule.sourceLocation ?? "", rule.sourceUrl ?? ""
  );
  const insertItem = database.prepare(`
    INSERT OR IGNORE INTO recommendation_source_rule_items(source_id, rule_id, item_hash)
    VALUES (?, ?, ?)
  `);
  for (const itemHash of rule.itemHashes) insertItem.run(sourceId, rule.ruleId, itemHash);
  const insertRequirement = database.prepare(`
    INSERT INTO recommendation_source_rule_requirements(source_id, rule_id, ordinal, slot, candidates)
    VALUES (?, ?, ?, ?, ?)
  `);
  requirements.forEach((requirement, ordinal) => {
    insertRequirement.run(sourceId, rule.ruleId, ordinal, requirement.slot, JSON.stringify(requirement.candidates));
  });
}

export function readRecommendationRules(
  database: DatabaseSync,
  sourceId: string
): RecommendationStoredRule[] {
  const ruleRows = database.prepare(`
    SELECT rule_id, rule_group_id, mode, kind, purposes, note, tags, author,
           source_note, source_title, source_description, block_id,
           rating, ranking, page_updated_at, version, source_location, source_url
    FROM recommendation_source_rules
    WHERE source_id = ?
    ORDER BY rowid
  `).all(sourceId) as Array<Record<string, string>>;
  if (!ruleRows.length) return [];
  const items = groupRows(database.prepare(`
    SELECT rule_id, item_hash FROM recommendation_source_rule_items
    WHERE source_id = ? ORDER BY rule_id, item_hash
  `).all(sourceId) as Array<{ rule_id: string; item_hash: number | bigint }>, (row) => Number(row.item_hash));
  const requirements = groupRows(database.prepare(`
    SELECT rule_id, slot, candidates FROM recommendation_source_rule_requirements
    WHERE source_id = ? ORDER BY rule_id, ordinal
  `).all(sourceId) as Array<{ rule_id: string; slot: string; candidates: string }>,
    (row) => ({ slot: String(row.slot ?? ""), candidates: parseNumbers(row.candidates) }));
  return ruleRows.map((row) => {
    const mode = row.mode as RecommendationRulePurpose;
    const purposes = parsePurposes(row.purposes, mode);
    return {
      ruleId: String(row.rule_id),
      ruleGroupId: String(row.rule_group_id ?? "") || String(row.rule_id),
      itemHashes: items.get(String(row.rule_id)) ?? [],
      mode,
      kind: row.kind === "weapon_only" ? "weapon_only" : "roll",
      requirements: requirements.get(String(row.rule_id)) ?? [],
      purposes,
      note: String(row.note ?? ""),
      tags: parseStrings(row.tags),
      author: String(row.author ?? ""),
      sourceNote: String(row.source_note ?? ""),
      sourceTitle: String(row.source_title ?? ""),
      sourceDescription: String(row.source_description ?? ""),
      blockId: String(row.block_id ?? ""),
      rating: String(row.rating ?? ""),
      ranking: String(row.ranking ?? ""),
      pageUpdatedAt: String(row.page_updated_at ?? ""),
      version: String(row.version ?? ""),
      sourceLocation: String(row.source_location ?? ""),
      sourceUrl: String(row.source_url ?? "")
    };
  });
}

/**
 * 只取要求：管理面手上是 `(来源实例, 规则)` 组合，不需要把整条规则读出来。
 * 返回的键是 `ruleId`。
 */
export function readRecommendationRuleRequirements(
  database: DatabaseSync,
  sourceId: string,
  ruleIds: readonly string[]
): Map<string, RecommendationStoredRequirement[]> {
  const result = new Map<string, RecommendationStoredRequirement[]>();
  if (!ruleIds.length) return result;
  const placeholders = ruleIds.map(() => "?").join(", ");
  const rows = database.prepare(`
    SELECT rule_id, slot, candidates FROM recommendation_source_rule_requirements
    WHERE source_id = ? AND rule_id IN (${placeholders})
    ORDER BY rule_id, ordinal
  `).all(sourceId, ...ruleIds) as Array<{ rule_id: string; slot: string; candidates: string }>;
  for (const row of rows) {
    const ruleId = String(row.rule_id);
    result.set(ruleId, [...(result.get(ruleId) ?? []), {
      slot: String(row.slot ?? ""),
      candidates: parseNumbers(row.candidates)
    }]);
  }
  return result;
}

/**
 * 只取武器 hash：管理面手上是 `(来源实例, 规则)` 组合，不需要把整条规则读出来。
 * 一条规则的武器身份可能有好几个哈希（导入期展开的结果），返回的键是 `ruleId`。
 */
export function readRecommendationRuleItemHashes(
  database: DatabaseSync,
  sourceId: string,
  ruleIds: readonly string[]
): Map<string, number[]> {
  const result = new Map<string, number[]>();
  if (!ruleIds.length) return result;
  const placeholders = ruleIds.map(() => "?").join(", ");
  const rows = database.prepare(`
    SELECT rule_id, item_hash FROM recommendation_source_rule_items
    WHERE source_id = ? AND rule_id IN (${placeholders})
    ORDER BY rule_id, item_hash
  `).all(sourceId, ...ruleIds) as Array<{ rule_id: string; item_hash: number | bigint }>;
  for (const row of rows) {
    const ruleId = String(row.rule_id);
    result.set(ruleId, [...(result.get(ruleId) ?? []), Number(row.item_hash)]);
  }
  return result;
}

function normalizePurposes(purposes: readonly RecommendationRulePurpose[]): RecommendationRulePurpose[] {
  const seen = new Set<RecommendationRulePurpose>();
  for (const purpose of purposes) if (isPurpose(purpose)) seen.add(purpose);
  return seen.size ? [...seen] : ["general"];
}

function parsePurposes(value: unknown, fallback: RecommendationRulePurpose): RecommendationRulePurpose[] {
  const parsed = parseStrings(value).filter(isPurpose);
  return parsed.length ? parsed : [fallback];
}

function isPurpose(value: string): value is RecommendationRulePurpose {
  return value === "pve" || value === "pvp" || value === "general";
}

function groupRows<Row extends { rule_id: string }, T>(
  rows: Row[],
  project: (row: Row) => T
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const ruleId = String(row.rule_id);
    grouped.set(ruleId, [...(grouped.get(ruleId) ?? []), project(row)]);
  }
  return grouped;
}

function parseNumbers(value: unknown): number[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}

function parseStrings(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}
