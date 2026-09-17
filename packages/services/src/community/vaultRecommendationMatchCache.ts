import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  VaultItemInstanceMatchInfo,
  VaultItemMatchInput
} from "@d2-tools/core/community-perks";
import { recommendationDocumentRevision } from "./recommendationDocumentStore.js";
import { recommendationOverrideRevision } from "./recommendationOverrides.js";

const databaseFileName = "account-cache.sqlite";
// 旧缓存可能是在中文推荐库不可用、或未解析名称被误判为无法核对时生成；
// 当前匹配语义已改变，必须整体失效，避免继续显示历史错误结果。
// 13：来源标签改为导入期固化（新三级模型），旧缓存里的来源名称必须重算。
// 14：DIM 组合改为「hash 或同名」判定，强化特征能满足同名的普通特性要求。
// 15：事实层新增 DIM 逐栏结果（requirements），旧缓存缺少逐栏数据必须整体重算。
// 16：事实层新增归约后的 DIM 栏位候选池（columns），旧缓存没有候选池必须重算。
// 17：归约后的 DIM 来源改为输出到 source_matches（与人工来源同级），事实形状变化必须重算。
// 18：全部 DIM 来源都走 source_matches，组合事实不再保留 DIM 内容。
// 19：DIM 与本地社区来源改为产出来源事实（source_records），不再产出 combos。
// 20：删除本地导入通道（本地规则表），来源只剩人工推荐 CSV 与 DIM Wishlist。
// 21：缓存键去掉 legacy `external_recommendation_sets` 指纹（该表族已无写入方）。
// 22：缓存键去掉「人工 / DIM」两条通道，统一走三级模型的文档与来源实例——同一份事实只有一个键。
// 23：DIM 的武器级规则（「有就行」）也产出来源事实。此前这类命中只有来源名字、没有来源编号，
//     来源清单数不着、按来源筛选也筛不出；形状变了必须整体重算。
// 24：「两个特长栏都可能出」的 perk 改为按作者书写的栏位顺序归栏（Bug #102）。旧缓存里有两种
//     过期事实：这种行此前被整行丢掉（逐栏候选少了一个来源写明的候选，甚至整把枪没有事实），
//     所以必须整体重算，而不是等下一次盖号。
const matchAlgorithmVersion = 24;

export type VaultRecommendationMatchCacheContext = {
  account_key: string;
  manifest_version: string;
  manifest_language: string;
  recommendation_revision: string;
};

export type VaultRecommendationMatchCachePartition = {
  cached_by_index: Map<number, VaultItemInstanceMatchInfo>;
  missing: Array<{ index: number; item: VaultItemMatchInput; roll_fingerprint: string }>;
};

/**
 * 匹配缓存键。缓存里保存了来源标签与判定结果，所以键必须覆盖全部事实来源：
 * 文档与来源实例（两种格式共用同一份表）加上启用 / 停用 / 移除的覆盖表。
 * 格式不参与——同一份事实只有一个键，换格式不产生新键。
 */
export function buildVaultRecommendationMatchRevision(dataDir: string): string {
  return sha256(JSON.stringify({
    match_algorithm_version: matchAlgorithmVersion,
    document_revision: recommendationDocumentRevision(dataDir),
    override_revision: recommendationOverrideRevision(dataDir)
  }));
}

export function partitionVaultRecommendationMatchCache(
  dataDir: string,
  items: VaultItemMatchInput[],
  context: VaultRecommendationMatchCacheContext
): VaultRecommendationMatchCachePartition {
  const cachedByIndex = new Map<number, VaultItemInstanceMatchInfo>();
  const missing: VaultRecommendationMatchCachePartition["missing"] = [];
  if (!context.account_key) {
    items.forEach((item, index) => {
      missing.push({ index, item, roll_fingerprint: createVaultWeaponRollFingerprint(item) });
    });
    return { cached_by_index: cachedByIndex, missing };
  }
  const database = openAccountCacheDatabase(dataDir);
  try {
    const read = database.prepare(`
      SELECT item_hash, roll_fingerprint, manifest_version, manifest_language,
             recommendation_revision, algorithm_version, match_json
      FROM vault_weapon_match_cache
      WHERE account_key = ? AND instance_id = ?
    `);
    items.forEach((item, index) => {
      const rollFingerprint = createVaultWeaponRollFingerprint(item);
      if (!item.instance_id) {
        missing.push({ index, item, roll_fingerprint: rollFingerprint });
        return;
      }
      const row = read.get(context.account_key, item.instance_id) as MatchCacheRow | undefined;
      // 行的形状由算法版本决定，所以版本对不上与 `recommendation_revision` 对不上是同一件事：
      // 这一行不是当前算法写下的，必须重算。放在读取这一处判，是因为「这行还能不能用」
      // 就是在这里定的——只靠「盖版本号时小心」保证，别处迟早会有人只信版本号那一列。
      const cached = row
        && row.item_hash === item.hash
        && row.roll_fingerprint === rollFingerprint
        && row.manifest_version === context.manifest_version
        && row.manifest_language === context.manifest_language
        && row.recommendation_revision === context.recommendation_revision
        && row.algorithm_version === matchAlgorithmVersion
          ? parseMatch(row.match_json, item.instance_id, item.hash)
          : null;
      if (cached) cachedByIndex.set(index, cached);
      else missing.push({ index, item, roll_fingerprint: rollFingerprint });
    });
  } finally {
    database.close();
  }
  return { cached_by_index: cachedByIndex, missing };
}

export function saveVaultRecommendationMatchCache(
  dataDir: string,
  entries: Array<{
    item: VaultItemMatchInput;
    roll_fingerprint: string;
    match: VaultItemInstanceMatchInfo;
  }>,
  context: VaultRecommendationMatchCacheContext,
  now = new Date()
): void {
  if (!context.account_key) return;
  const persistable = entries.filter((entry) => Boolean(entry.item.instance_id));
  if (!persistable.length) return;
  const database = openAccountCacheDatabase(dataDir);
  try {
    const write = database.prepare(`
      INSERT INTO vault_weapon_match_cache (
        account_key, instance_id, item_hash, roll_fingerprint, manifest_version, manifest_language,
        recommendation_revision, algorithm_version, match_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_key, instance_id) DO UPDATE SET
        item_hash = excluded.item_hash,
        roll_fingerprint = excluded.roll_fingerprint,
        manifest_version = excluded.manifest_version,
        manifest_language = excluded.manifest_language,
        recommendation_revision = excluded.recommendation_revision,
        algorithm_version = excluded.algorithm_version,
        match_json = excluded.match_json,
        updated_at = excluded.updated_at
    `);
    database.exec("BEGIN IMMEDIATE;");
    try {
      persistable.forEach(({ item, roll_fingerprint, match }) => {
        const instanceId = item.instance_id;
        if (!instanceId) return;
        write.run(
          context.account_key,
          instanceId,
          item.hash,
          roll_fingerprint,
          context.manifest_version,
          context.manifest_language,
          context.recommendation_revision,
          matchAlgorithmVersion,
          JSON.stringify(match),
          now.toISOString()
        );
      });
      database.exec("COMMIT;");
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
  } finally {
    database.close();
  }
}

/**
 * A source/rule edit changes the composite recommendation revision globally,
 * but only weapons covered by that edit need to be recalculated. Remove those
 * rows and advance every unaffected row to the new revision so the next account
 * sync does not repeat work that is known to be semantically unchanged.
 *
 * 盖版本号的前提是「**只有数据变了，算法没变**」。算法变了（比对结果的形状不同）时盖号
 * 等于把旧形状宣布成有效——修复会被这一次盖号悄悄顶掉，以后再改形状也会重演。
 * 所以只盖**同一算法版本**写下的行；别的版本留在旧版本号上，下次核对自然重算。
 * 读取那一侧另有一道同样的核对（见 `partitionVaultRecommendationMatchCache`）；
 * 这里是让版本号那一列**不说假话**：写上去的版本号必须真的代表「这行是当前算法核过的」。
 */
export function advanceVaultRecommendationMatchCacheRevision(
  dataDir: string,
  recommendationRevision: string,
  affectedWeaponHashes: readonly number[]
): void {
  const database = openAccountCacheDatabase(dataDir);
  try {
    const removeAffected = database.prepare("DELETE FROM vault_weapon_match_cache WHERE item_hash = ?");
    database.exec("BEGIN IMMEDIATE;");
    try {
      for (const itemHash of new Set(affectedWeaponHashes)) removeAffected.run(itemHash);
      database.prepare("UPDATE vault_weapon_match_cache SET recommendation_revision = ? WHERE algorithm_version = ?")
        .run(recommendationRevision, matchAlgorithmVersion);
      database.exec("COMMIT;");
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
  } finally {
    database.close();
  }
}

export function createVaultWeaponRollFingerprint(item: VaultItemMatchInput): string {
  const socketPlugs = [...(item.socket_plugs ?? [])]
    .map((plug) => ({ hash: plug.hash, socket_index: plug.socket_index ?? -1 }))
    .sort((left, right) => left.socket_index - right.socket_index || left.hash - right.hash);
  const rollSockets = [...(item.weapon_roll?.sockets ?? [])]
    .map((socket) => ({
      slot: socket.slot,
      socket_index: socket.socket_index,
      complete: socket.complete,
      current_plug: socket.current_plug
        ? { hash: socket.current_plug.hash, name: socket.current_plug.name }
        : null,
      owned_plugs: [...socket.owned_plugs]
        .map((plug) => ({ hash: plug.hash, name: plug.name }))
        .sort((left, right) => left.hash - right.hash || left.name.localeCompare(right.name))
    }))
    .sort((left, right) => left.socket_index - right.socket_index || left.slot.localeCompare(right.slot));
  return sha256(JSON.stringify({
    hash: item.hash,
    item_name: item.item_name ?? "",
    socket_plugs: socketPlugs,
    weapon_roll: item.weapon_roll
      ? { fingerprint: item.weapon_roll.fingerprint, complete: item.weapon_roll.complete, sockets: rollSockets }
      : null
  }));
}

type MatchCacheRow = {
  item_hash: number;
  roll_fingerprint: string;
  manifest_version: string;
  manifest_language: string;
  recommendation_revision: string;
  algorithm_version: number;
  match_json: string;
};

function openAccountCacheDatabase(dataDir: string): DatabaseSync {
  mkdirSync(join(dataDir, "cache"), { recursive: true });
  const database = new DatabaseSync(join(dataDir, "cache", databaseFileName), { timeout: 5_000 });
  database.exec("PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;");
  const existingColumns = database.prepare("PRAGMA table_info(vault_weapon_match_cache)").all() as Array<{
    name?: string;
    pk?: number;
  }>;
  const existingPrimaryKey = existingColumns
    .filter((column) => Number(column.pk ?? 0) > 0)
    .sort((left, right) => Number(left.pk ?? 0) - Number(right.pk ?? 0))
    .map((column) => column.name);
  if (existingColumns.length > 0 && (
    !existingColumns.some((column) => column.name === "account_key")
    || JSON.stringify(existingPrimaryKey) !== JSON.stringify(["account_key", "instance_id"])
  )) {
    database.exec("DROP TABLE vault_weapon_match_cache;");
  }
  database.exec(`
    CREATE TABLE IF NOT EXISTS vault_weapon_match_cache (
      account_key TEXT NOT NULL,
      instance_id TEXT NOT NULL,
      item_hash INTEGER NOT NULL CHECK (item_hash >= 0 AND item_hash <= 4294967295),
      roll_fingerprint TEXT NOT NULL,
      manifest_version TEXT NOT NULL,
      manifest_language TEXT NOT NULL,
      recommendation_revision TEXT NOT NULL,
      algorithm_version INTEGER NOT NULL,
      match_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (account_key, instance_id)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_vault_weapon_match_revision
      ON vault_weapon_match_cache(account_key, manifest_version, manifest_language, recommendation_revision);
    CREATE INDEX IF NOT EXISTS idx_vault_weapon_match_item
      ON vault_weapon_match_cache(item_hash);
  `);
  // 早先的行没有算法版本。给 0（永远不等于真实版本）而不是当前版本——
  // 这些行是哪个版本写的无从得知，宁可让它们重算一次，也不能当成当前形状。
  // 表是这次刚建的时候 `existingColumns` 为空，那时上面建表已经带上了这一列。
  if (existingColumns.length > 0 && !existingColumns.some((column) => column.name === "algorithm_version")) {
    database.exec("ALTER TABLE vault_weapon_match_cache ADD COLUMN algorithm_version INTEGER NOT NULL DEFAULT 0;");
  }
  return database;
}

function parseMatch(
  value: string,
  instanceId: string,
  itemHash: number
): VaultItemInstanceMatchInfo | null {
  try {
    const parsed = JSON.parse(value) as Partial<VaultItemInstanceMatchInfo>;
    if (parsed.instance_id !== instanceId || parsed.hash !== itemHash) return null;
    if (typeof parsed.canonical_weapon_name !== "string" || !parsed.canonical_weapon_name) return null;
    if (parsed.coverage !== "covered" && parsed.coverage !== "uncovered") return null;
    if (parsed.recommendation_state !== "priority"
      && parsed.recommendation_state !== "compare"
      && parsed.recommendation_state !== "uncovered") return null;
    if (!Array.isArray(parsed.modes)) return null;
    return parsed as VaultItemInstanceMatchInfo;
  } catch {
    return null;
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
