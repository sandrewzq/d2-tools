import type { DatabaseSync } from "node:sqlite";
import { openRecommendationDatabase } from "./recommendationDatabase.js";
import {
  readRecommendationRuleItemHashes,
  readRecommendationRuleRequirements,
  type RecommendationStoredRequirement
} from "./recommendationRuleStore.js";
import {
  clearRecommendationDocuments,
  listRecommendationDocuments,
  listRecommendationDocumentsFrom,
  recommendationDocumentRevision
} from "./recommendationDocumentStore.js";
import {
  recommendationSourceState,
  setRecommendationRuleState,
  setRecommendationSourceState,
  type RecommendationRuleState,
  type RecommendationSourceState
} from "./recommendationOverrides.js";
import { recommendationSourceKindLabel } from "./recommendationSourceKindLabels.js";

export type RecommendationManagedSource = {
  source_key: string;
  label: string;
  /**
   * 这份来源的**来源格式**，用面向用户的名字写出来（「推荐表格」/「愿望单文本」）。
   *
   * 名字由存储里的来源类型（`recommendation_source_instances.kind`）算出来——格式判断只在这里做一次，
   * 消费方拿到的就是可以照原样显示的文字，界面因此不必认识任何一种格式、更不必按格式分叉。
   */
  format_label: string;
  state: RecommendationSourceState;
  configured: boolean;
  rule_count: number;
  weapon_count: number;
  revision: string;
  imported_at: string;
  /** 这份来源当初从哪个链接读来的；本地文件导入没有链接，管理面也就没有「同步」。 */
  source_url?: string;
  /**
   * 这份来源在整个账号里点到多少件（仓库 + 角色身上 + 角色背包 + 邮政官）。
   *
   * 与 `vault_instance_count` 是同一件事的两个范围，两者必须同源算出：
   * 全账号 = 仓库 + 角色侧。分开给是因为界面上要把两个范围并排写出来——
   * 只给一个数，用户就会拿它去和仓库里的数字对，对不上时看着像程序算错了。
   */
  affected_instance_count?: number;
  /**
   * 同一件事，但只算**仓库**里那部分。
   *
   * 它对应的是「勾上这份来源，本页仓库会筛出多少件」，也就是来源清单上那个数字；
   * 来源行必须两个一起显示，缺一个就又会读出「两个数对不上」。
   */
  vault_instance_count?: number;
  /**
   * 这一行在**事实层**登记过的全部键：它自己的分组键，外加它下辖每个来源实例的键。
   *
   * 管理面一次导入是一行（分组键），事实层按具名来源登记（实例键），两者天然不等。
   * 消费层要拿管理面的键去看来源事实，必须先按这份对应关系把事实归队；
   * 少了它，白名单就会因为两个键不相等而把事实全部滤掉（仓库勾选来源后整页 0 件）。
   */
  fact_keys: string[];
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

/**
 * 「清空已导入的推荐规则」这个动作的对象摘要。
 *
 * 动作只作用于**规则导入**（人工 CSV）那一类来源，不碰愿望单、不碰账号数据——这是动作的语义，
 * 由存储层按来源格式算出来。UI 因此不需要认识任何来源身份，只负责展示与确认。
 */
export type RecommendationRuleClearance = {
  configured: boolean;
  source_count: number;
  rule_count: number;
};

export type RecommendationManagementSnapshot = {
  /** 全部推荐事实的修订。改动推荐数据后匹配缓存按它失效，与来源格式无关。 */
  revision: string;
  sources: RecommendationManagedSource[];
  removed_rules: RecommendationManagedRule[];
  clear_rule_imports: RecommendationRuleClearance;
  affected_weapon_hashes?: number[];
  /**
   * 本次操作改动的来源是否由导入文档托管。只有变更入口会设置它，
   * 供愿望单派生的下游（装备目标）判断是否需要联动——消费方因此不必认识来源键的写法。
   */
  stored_source_changed?: boolean;
};

/**
 * 存储层的来源身份索引。
 *
 * 来源属于哪一类只由「它住在哪张表」决定：文档级来源在 `recommendation_documents`，
 * 实例级来源在 `recommendation_source_instances`。键的写法不携带类型信息，
 * 服务层因此不需要解析任何前缀。
 *
 * - `groupKey`：同一份来源的全部实例共用的键。实例级来源取所属文档的键，文档级来源取自己。
 *   筛选与选项用分组键，消费层据此合并同一份来源的多个实例。
 * - `sourceId`：启用 / 停用 / 移除覆盖所用的键，文档级与实例级是两个不同的键。
 */
type StoredSourceIdentity = { sourceId: string; groupKey: string };

type StoredSourceIndex = {
  documents: Map<string, StoredSourceIdentity>;
  instances: Map<string, StoredSourceIdentity>;
};

function loadStoredSourceIndex(database: DatabaseSync): StoredSourceIndex {
  const documents = new Map<string, StoredSourceIdentity>();
  const instances = new Map<string, StoredSourceIdentity>();
  const documentRows = database.prepare(
    "SELECT document_id FROM recommendation_documents"
  ).all() as Array<{ document_id: string }>;
  for (const row of documentRows) {
    documents.set(row.document_id, { sourceId: row.document_id, groupKey: row.document_id });
  }
  const instanceRows = database.prepare(
    "SELECT source_id, document_id FROM recommendation_source_instances"
  ).all() as Array<{ source_id: string; document_id: string }>;
  for (const row of instanceRows) {
    instances.set(row.source_id, { sourceId: row.source_id, groupKey: row.document_id });
  }
  return { documents, instances };
}

function storedSourceIdentity(index: StoredSourceIndex, sourceKey: string): StoredSourceIdentity | undefined {
  return index.documents.get(sourceKey) ?? index.instances.get(sourceKey);
}

/** 文档级来源覆盖其下全部实例，因此清理覆盖状态时要展开成文档键 + 全部实例键。 */
function storedSourceKeysFor(index: StoredSourceIndex, identity: StoredSourceIdentity): string[] {
  if (identity.sourceId !== identity.groupKey) return [identity.sourceId];
  return [
    identity.sourceId,
    ...[...index.instances.values()]
      .filter((entry) => entry.groupKey === identity.groupKey)
      .map((entry) => entry.sourceId)
  ];
}

export function readRecommendationManagementSnapshot(dataDir: string): RecommendationManagementSnapshot {
  const database = openRecommendationDatabase(dataDir);
  try {
    // 事实层的键要按存储里真实存在的实例算，不能按前缀拼——键的写法不携带类型信息。
    const sourceIndex = loadStoredSourceIndex(database);
    const storedInstances = database.prepare(`
      SELECT s.document_id, d.title AS document_title, d.author AS document_author,
             MAX(s.revision) AS revision, MAX(s.fingerprint) AS fingerprint,
             MAX(d.imported_at) AS imported_at, MAX(d.source_url) AS source_url,
             GROUP_CONCAT(DISTINCT s.kind) AS source_kinds,
             COUNT(DISTINCT r.rule_id) AS rule_count,
             COUNT(DISTINCT item.item_hash) AS weapon_count
      FROM recommendation_source_instances s
      JOIN recommendation_documents d ON d.document_id = s.document_id
      LEFT JOIN recommendation_source_rules r ON r.source_id = s.source_id
      LEFT JOIN recommendation_source_rule_items item
        ON item.source_id = r.source_id AND item.rule_id = r.rule_id
      GROUP BY s.document_id, d.title, d.author
      ORDER BY imported_at, s.document_id
    `).all() as Array<{
      document_id: string;
      document_title: string;
      document_author: string;
      revision: string;
      fingerprint: string;
      imported_at: string;
      source_url: string;
      source_kinds: string;
      rule_count: number;
      weapon_count: number;
    }>;
    // 一份导入文档是一个可管理来源，来源键就是存储层的 document_id；
    // 文档名由用户给，作者与 block 只在详情中展示。
    // 链接也是文档级属性：来源当初从哪个链接读来，就由它决定这一行有没有「同步」。
    const sources: RecommendationManagedSource[] = storedInstances.map((row) => ({
      source_key: row.document_id,
      label: row.document_title || "",
      format_label: managedSourceFormatLabel(row.source_kinds),
      state: recommendationSourceState(database, row.document_id),
      configured: true,
      rule_count: Number(row.rule_count ?? 0),
      weapon_count: Number(row.weapon_count ?? 0),
      revision: row.revision || row.fingerprint,
      imported_at: row.imported_at,
      ...(row.source_url ? { source_url: row.source_url } : {}),
      fact_keys: storedSourceKeysFor(sourceIndex, {
        sourceId: row.document_id,
        groupKey: row.document_id
      })
    }));
    return {
      revision: recommendationDocumentRevision(dataDir),
      sources,
      removed_rules: listRecommendationRulesFromDatabase(database, undefined, "removed"),
      clear_rule_imports: readRuleClearance(dataDir)
    };
  } finally {
    database.close();
  }
}

/**
 * 来源行的**来源格式**说法。名字按存储里的来源类型取（`recommendationSourceKindLabels`），
 * 不按来源名、链接或来源键猜——名字是用户起的，链接是来路，两者都不说明格式。
 *
 * 一份文档 = 一次导入 = 一种格式（文档键只由名字决定，覆盖是整份替换），所以正常只会有一种；
 * 这里按去重后的全部类型换名再拼，是同一行代码在长度为 1 时的表现，不是一条走不到的分支。
 */
function managedSourceFormatLabel(sourceKinds: string): string {
  const kinds = [...new Set(sourceKinds.split(",").filter(Boolean))];
  return kinds.map(recommendationSourceKindLabel).filter(Boolean).join("、");
}

/**
 * 「清空已导入的推荐规则」的对象摘要。范围是规则导入（人工 CSV）这一格式的来源；
 * 判定只在这里做一次，消费方拿到的就是「能不能清、会清掉多少」。
 */
function readRuleClearance(dataDir: string): RecommendationRuleClearance {
  const documents = listRecommendationDocuments(dataDir, "csv");
  return {
    configured: documents.length > 0,
    source_count: documents.length,
    rule_count: documents.reduce((count, document) => count + document.ruleCount, 0)
  };
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
  // 删除会连同来源键一起消失，所以先问清楚它是不是存储层托管的来源。
  const storedSourceChanged = isStoredSource(dataDir, sourceKey);
  if (state === "removed") removeSourceDataset(dataDir, sourceKey);
  else setRecommendationSourceState(dataDir, sourceKey, state);
  return { ...readRecommendationManagementSnapshot(dataDir), stored_source_changed: storedSourceChanged };
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

/**
 * 清空规则导入（人工 CSV）那一类来源：整份删除文档，规则随外键级联消失。
 *
 * 覆盖表没有外键，所以先按「文档键 + 其下全部实例键」逐键删覆盖行——
 * 与逐条移除来源走的是同一套键展开（`storedSourceKeysFor`）。
 */
export function clearImportedRecommendationRules(dataDir: string): RecommendationManagementSnapshot {
  const database = openRecommendationDatabase(dataDir);
  database.exec("BEGIN IMMEDIATE;");
  try {
    const index = loadStoredSourceIndex(database);
    // 用已持有连接的版本：这里正处在 `BEGIN IMMEDIATE` 里，再 open 一次会自己等自己。
    for (const document of listRecommendationDocumentsFrom(database, "csv")) {
      const identity = storedSourceIdentity(index, document.documentId);
      if (identity) deleteOverrideRows(database, storedSourceKeysFor(index, identity));
    }
    database.exec("COMMIT;");
  } catch (error) {
    try { database.exec("ROLLBACK;"); } catch { /* 保留原始错误。 */ }
    throw error;
  } finally {
    database.close();
  }
  clearRecommendationDocuments(dataDir, "csv");
  return readRecommendationManagementSnapshot(dataDir);
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
    const placeholders = requestedKeys.map(() => "?").join(", ");
    // 键属于文档还是实例由存储列决定：文档级键命中整份文档，实例级键只命中自己。
    // 武器身份取规则声明的全部 hash（导入期展开的结果），与是否人工导入无关。
    const storedRows = database.prepare(`
      SELECT DISTINCT i.source_id AS source_id, d.document_id AS document_id, item.item_hash AS item_hash
      FROM recommendation_source_instances i
      JOIN recommendation_documents d ON d.document_id = i.document_id
      JOIN recommendation_source_rules r ON r.source_id = i.source_id
      JOIN recommendation_source_rule_items item
        ON item.source_id = r.source_id AND item.rule_id = r.rule_id
      WHERE i.source_id IN (${placeholders}) OR d.document_id IN (${placeholders})
    `).all(...requestedKeys, ...requestedKeys) as Array<{ source_id: string; document_id: string; item_hash: number }>;
    for (const row of storedRows) {
      const itemHash = Number(row.item_hash);
      hashesBySource.get(row.source_id)?.add(itemHash);
      hashesBySource.get(row.document_id)?.add(itemHash);
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
    const index = loadStoredSourceIndex(database);
    const stored = storedSourceIdentity(index, sourceKey);
    // 调用前已由 `assertManagedSource` 确认来源住在存储里，所以这里没有第二分支。
    if (!stored) return;
    // 删除文档 / 实例行即可级联清掉规则。覆盖表没有外键，
    // 因此按「文档键 + 其下全部实例键」逐键展开删除。
    deleteOverrideRows(database, storedSourceKeysFor(index, stored));
    if (stored.sourceId === stored.groupKey) {
      database.prepare("DELETE FROM recommendation_documents WHERE document_id = ?").run(stored.sourceId);
    } else {
      database.prepare("DELETE FROM recommendation_source_instances WHERE source_id = ?").run(stored.sourceId);
    }
    database.exec("COMMIT;");
  } catch (error) {
    try { database.exec("ROLLBACK;"); } catch { /* 保留原始错误。 */ }
    throw error;
  } finally {
    database.close();
  }
}

function deleteOverrideRows(database: DatabaseSync, sourceKeys: readonly string[]): void {
  const keys = [...new Set(sourceKeys)];
  if (!keys.length) return;
  const placeholders = keys.map(() => "?").join(", ");
  database.prepare(`DELETE FROM recommendation_rule_overrides WHERE source_key IN (${placeholders})`).run(...keys);
  database.prepare(`DELETE FROM recommendation_source_overrides WHERE source_key IN (${placeholders})`).run(...keys);
}

function listRecommendationRulesFromDatabase(
  database: DatabaseSync,
  sourceKey: string | undefined,
  state: "all" | "removed"
): RecommendationManagedRule[] {
  const index = loadStoredSourceIndex(database);
  const overrides = listRuleOverrides(database);
  if (state === "removed") {
    return listRecommendationRuleOverridesFromRows(overrides)
      .filter((entry) => entry.state === "removed")
      .map((entry) => currentRuleForOverride(database, index, entry) ?? missingRuleForOverride(entry))
      .sort(compareRules);
  }
  const overridesByKey = new Map(overrides.map((entry) => [overrideKey(entry.source_key, entry.rule_stable_id), entry]));
  return storedRules(database, index, sourceKey)
    .map((rule) => withOverride(rule, overridesByKey))
    .sort(compareRules);
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
  index: StoredSourceIndex,
  override: ReturnType<typeof listRecommendationRuleOverridesFromRows>[number]
): RecommendationManagedRule | null {
  return storedRuleForOverride(database, index, override);
}

function storedRuleForOverride(
  database: DatabaseSync,
  index: StoredSourceIndex,
  override: ReturnType<typeof listRecommendationRuleOverridesFromRows>[number]
): RecommendationManagedRule | null {
  // 实例级覆盖键只匹配该实例；文档级覆盖键匹配文档下的全部实例。
  const identity = storedSourceIdentity(index, override.source_key);
  const scopedToInstance = Boolean(identity && identity.sourceId !== identity.groupKey);
  const documentId = identity?.groupKey;
  const stored = database.prepare(`
    SELECT r.item_hash, r.mode, r.kind, r.note, r.source_id,
           s.label, s.revision
    FROM recommendation_source_rules r
    JOIN recommendation_source_instances s ON s.source_id = r.source_id
    WHERE r.rule_id = ?
      ${scopedToInstance ? "AND r.source_id = ?" : documentId ? "AND s.document_id = ?" : ""}
    ORDER BY r.rowid
  `).get(...(scopedToInstance ? [override.rule_stable_id, override.source_key]
    : documentId ? [override.rule_stable_id, documentId]
      : [override.rule_stable_id])) as {
    item_hash: number;
    mode: "pve" | "pvp" | "general";
    kind: "roll" | "weapon_only";
    note: string;
    source_id: string;
    label: string;
    revision: string;
  } | undefined;
  if (!stored) return null;
  const requirements = readRecommendationRuleRequirements(
    database,
    stored.source_id,
    [override.rule_stable_id]
  ).get(override.rule_stable_id) ?? [];
  const itemHashes = readRecommendationRuleItemHashes(
    database,
    stored.source_id,
    [override.rule_stable_id]
  ).get(override.rule_stable_id) ?? [Number(stored.item_hash)];
  return {
    source_key: stored.source_id,
    source_label: stored.label,
    rule_stable_id: override.rule_stable_id,
    weapon_hashes: itemHashes,
    weapon_name: `武器 ${itemHashes[0]}`,
    purposes: [stored.mode],
    requirements: managedRequirements(requirements, stored.kind),
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
    source_label: entry.source_key,
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

function storedRules(
  database: DatabaseSync,
  index: StoredSourceIndex,
  sourceKey?: string
): RecommendationManagedRule[] {
  // 键属于文档还是实例由存储列决定：文档键取整份文档，实例键只取该实例。
  const identity = sourceKey ? storedSourceIdentity(index, sourceKey) : undefined;
  const scopedToInstance = Boolean(identity && identity.sourceId !== identity.groupKey);
  const rows = database.prepare(`
    SELECT r.rule_id, r.item_hash, r.mode, r.kind, r.note,
           s.source_id,
           s.label, s.revision
    FROM recommendation_source_rules r
    JOIN recommendation_source_instances s ON s.source_id = r.source_id
    ${scopedToInstance ? "WHERE r.source_id = ?" : identity ? "WHERE s.document_id = ?" : ""}
    ORDER BY r.rowid
  `).all(...(scopedToInstance ? [identity!.sourceId] : identity ? [identity.groupKey] : [])) as Array<{
    source_id: string;
    rule_id: string;
    item_hash: number;
    mode: "pve" | "pvp" | "general";
    kind: "roll" | "weapon_only";
    note: string;
    label: string;
    revision: string;
  }>;
  const ruleIdsBySource = new Map<string, string[]>();
  for (const row of rows) {
    ruleIdsBySource.set(row.source_id, [...(ruleIdsBySource.get(row.source_id) ?? []), row.rule_id]);
  }
  const requirementsBySource = new Map(
    [...ruleIdsBySource].map(([sourceId, ruleIds]) => (
      [sourceId, readRecommendationRuleRequirements(database, sourceId, ruleIds)] as const
    ))
  );
  const itemHashesBySource = new Map(
    [...ruleIdsBySource].map(([sourceId, ruleIds]) => (
      [sourceId, readRecommendationRuleItemHashes(database, sourceId, ruleIds)] as const
    ))
  );
  return rows.map((row) => {
    // 一条规则的武器身份可能不止一个哈希（导入期展开了完整身份），全部列出。
    const itemHashes = itemHashesBySource.get(row.source_id)?.get(row.rule_id) ?? [Number(row.item_hash)];
    return {
      source_key: row.source_id,
      source_label: row.label,
      rule_stable_id: row.rule_id,
      weapon_hashes: itemHashes,
      weapon_name: `武器 ${itemHashes[0]}`,
      purposes: [row.mode],
      requirements: managedRequirements(
        requirementsBySource.get(row.source_id)?.get(row.rule_id) ?? [],
        row.kind
      ),
      note: row.note,
      state: "active",
      review_required: false,
      source_revision: row.revision,
      reason: ""
    };
  });
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

function compareRules(left: RecommendationManagedRule, right: RecommendationManagedRule): number {
  return left.source_label.localeCompare(right.source_label, "zh-Hans-CN")
    || left.weapon_name.localeCompare(right.weapon_name, "zh-Hans-CN")
    || left.rule_stable_id.localeCompare(right.rule_stable_id);
}

/**
 * 管理面按「栏位 + 候选名」展示规则要求。
 *
 * 来源没有声明栏位时合并成一条组合行：这一层拿不到武器定义，
 * 解析不出栏位名，所以只能照原样并成一组——与迁移前把 `perk_hashes` 显示为
 * 一条 `combo` 的口径一致。声明了栏位的来源按栏位分别成行。
 */
function managedRequirements(
  requirements: readonly RecommendationStoredRequirement[],
  kind: "roll" | "weapon_only"
): Array<{ slot: string; names: string[] }> {
  if (kind === "weapon_only") return [];
  const names = (requirement: RecommendationStoredRequirement) => requirement.candidates.map(String);
  const unspecified = requirements.filter((requirement) => !requirement.slot);
  const bySlot = new Map<string, string[]>();
  for (const requirement of requirements) {
    if (!requirement.slot) continue;
    bySlot.set(requirement.slot, [...(bySlot.get(requirement.slot) ?? []), ...names(requirement)]);
  }
  return [
    ...(unspecified.length ? [{ slot: "combo", names: unspecified.flatMap(names) }] : []),
    ...[...bySlot].map(([slot, slotNames]) => ({ slot, names: slotNames }))
  ];
}

function isStoredSource(dataDir: string, sourceKey: string): boolean {
  const database = openRecommendationDatabase(dataDir);
  try {
    return Boolean(storedSourceIdentity(loadStoredSourceIndex(database), sourceKey));
  } finally {
    database.close();
  }
}

function assertManagedSource(dataDir: string, sourceKey: string): void {
  const database = openRecommendationDatabase(dataDir);
  try {
    if (storedSourceIdentity(loadStoredSourceIndex(database), sourceKey)) return;
  } finally {
    database.close();
  }
  throw new Error("推荐来源无效。");
}
