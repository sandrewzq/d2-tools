import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type {
  VaultItemInstanceMatchInfo,
  VaultItemMatchInput
} from "@d2-tools/core/community-perks";
import {
  advanceVaultRecommendationMatchCacheRevision,
  createVaultWeaponRollFingerprint,
  partitionVaultRecommendationMatchCache,
  saveVaultRecommendationMatchCache,
  type VaultRecommendationMatchCacheContext
} from "../src/community/vaultRecommendationMatchCache.js";

/**
 * 比对结果缓存的**失效判据**。这里钉的是 Bug #97 的第二、三条处置：
 *
 * - 缓存的键里带着算法版本，所以形状一变（新版本号）旧行自然重算——这条是既有做法，本次只是加一版。
 * - 但「盖版本号」那条快路（`advanceVaultRecommendationMatchCacheRevision`，为的是让一次小改动
 *   不必全量重算）过去会把**所有**没受影响的行直接盖上当前版本号。行里不存算法版本时，
 *   「哪个版本写下的」无从判断，于是升级后的第一次盖号会把**旧形状**宣布成有效——
 *   修复被悄悄顶掉，以后再改形状也会重演。
 *
 * 所以行里存下算法版本，盖号只盖**同一算法版本**的行。下面三条各自钉住一半：
 * 同一版本照旧盖（快路没被修坏）、别的版本不许盖（快路不再吃掉修复）、
 * 更早的表连这一列都没有（补 0 而不是补当前版本，旧行一律重算）。
 */

const instanceId = "instance-1";

const item: VaultItemMatchInput = { hash: 5001, instance_id: instanceId, item_name: "测试步枪" };

/** 一条字段齐全、`parseMatch` 全部能过的比对结果——否则下面的「读不到」是空转。 */
function match(): VaultItemInstanceMatchInfo {
  return {
    hash: 5001,
    instance_id: instanceId,
    canonical_weapon_name: "测试步枪",
    matched: 1,
    available: 1,
    coverage: "covered",
    match_status: "full_match",
    recommendation_state: "compare",
    partial: 0,
    modes: ["pve"]
  };
}

function context(recommendationRevision: string): VaultRecommendationMatchCacheContext {
  return {
    account_key: "account-1",
    manifest_version: "test-manifest-cache",
    manifest_language: "zh-chs",
    recommendation_revision: recommendationRevision
  };
}

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "d2-tools-match-cache-"));
}

function databasePath(dir: string): string {
  return join(dir, "cache", "account-cache.sqlite");
}

function cachedCount(dir: string, revision: string): number {
  return partitionVaultRecommendationMatchCache(dir, [item], context(revision)).cached_by_index.size;
}

/** 行上写着的那两列。用来钉「版本号那一列不说假话」——只有直接读库才看得到。 */
function storedRow(dir: string): { recommendation_revision?: string; algorithm_version?: number } {
  const database = new DatabaseSync(databasePath(dir));
  try {
    return (database
      .prepare("SELECT recommendation_revision, algorithm_version FROM vault_weapon_match_cache WHERE instance_id = ?")
      .get(instanceId) ?? {}) as { recommendation_revision?: string; algorithm_version?: number };
  } finally {
    database.close();
  }
}

/** 走一次公开写入，把「当前算法版本」问出来——不写死在用例里，升版本号时用例不会自己过期。 */
function currentAlgorithmVersion(dir: string): number | undefined {
  saveVaultRecommendationMatchCache(
    dir,
    [{ item, roll_fingerprint: createVaultWeaponRollFingerprint(item), match: match() }],
    context("rev-1")
  );
  return storedRow(dir).algorithm_version;
}

/** 直接落一行，用来假装「早先某个版本写下的行」——公开接口只会写当前算法版本。 */
function writeRow(
  dir: string,
  row: { algorithm_version: number | null; recommendation_revision: string }
): void {
  mkdirSync(join(dir, "cache"), { recursive: true });
  const { account_key, manifest_version, manifest_language } = context(row.recommendation_revision);
  const database = new DatabaseSync(databasePath(dir));
  try {
    // `algorithm_version` 为 null 时建的就是**没有这一列**的旧表，模拟更早版本留下的库。
    const withVersion = row.algorithm_version !== null;
    database.exec(`
      CREATE TABLE IF NOT EXISTS vault_weapon_match_cache (
        account_key TEXT NOT NULL,
        instance_id TEXT NOT NULL,
        item_hash INTEGER NOT NULL CHECK (item_hash >= 0 AND item_hash <= 4294967295),
        roll_fingerprint TEXT NOT NULL,
        manifest_version TEXT NOT NULL,
        manifest_language TEXT NOT NULL,
        recommendation_revision TEXT NOT NULL,
        ${withVersion ? "algorithm_version INTEGER NOT NULL," : ""}
        match_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (account_key, instance_id)
      ) STRICT;
    `);
    const columns = ["account_key", "instance_id", "item_hash", "roll_fingerprint",
      "manifest_version", "manifest_language", "recommendation_revision"]
      .concat(withVersion ? ["algorithm_version"] : [])
      .concat(["match_json", "updated_at"]);
    const values: Array<string | number> = [account_key, instanceId, item.hash,
      createVaultWeaponRollFingerprint(item), manifest_version, manifest_language,
      row.recommendation_revision];
    if (withVersion) values.push(row.algorithm_version!);
    values.push(JSON.stringify(match()), "2026-01-01T00:00:00.000Z");
    database.prepare(
      `INSERT INTO vault_weapon_match_cache (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`
    ).run(...values);
  } finally {
    database.close();
  }
}

describe("比对结果缓存的失效判据", () => {
  it("同一算法版本内盖版本号照旧生效：小改动不必全量重算", () => {
    // 这条是快路不被修坏的锚点，同时也是下一条的对照——
    // 同一行数据、同一套其余字段，只因算法版本不同，结论就必须相反。
    const dir = tempDir();
    saveVaultRecommendationMatchCache(
      dir,
      [{ item, roll_fingerprint: createVaultWeaponRollFingerprint(item), match: match() }],
      context("rev-1")
    );
    expect(cachedCount(dir, "rev-1")).toBe(1);

    advanceVaultRecommendationMatchCacheRevision(dir, "rev-2", []);
    expect(cachedCount(dir, "rev-2")).toBe(1);
  });

  it("别的算法版本写下的行：读的时候不认它，盖版本号时也不许给它盖章", () => {
    // 当前算法版本从公开写入的那一行问出来，不写死——否则下次升版本号，用例会自己过期。
    const probe = tempDir();
    const currentVersion = currentAlgorithmVersion(probe);
    if (typeof currentVersion !== "number") throw new Error("公开写入没有落下算法版本。");

    // 非空锚点：同一份数据、同一套字段，**只把版本号换成当前版本**就能被读回来。
    // 少了这个对照，下面「读不到」也可能只是因为这行本来就写坏了。
    const control = tempDir();
    writeRow(control, { algorithm_version: currentVersion, recommendation_revision: "rev-1" });
    expect(cachedCount(control, "rev-1")).toBe(1);

    // 读：不是当前算法写的行，逐出缓存重算。
    const dir = tempDir();
    writeRow(dir, { algorithm_version: currentVersion - 1, recommendation_revision: "rev-1" });
    expect(cachedCount(dir, "rev-1")).toBe(0);

    // 写：盖版本号也不许把它盖上——否则版本号那一列会说一句假话
    // （「这行是当前算法核过的」），别处只信这一列时就会被骗过去。
    advanceVaultRecommendationMatchCacheRevision(dir, "rev-2", []);
    expect(storedRow(dir).recommendation_revision).toBe("rev-1");

    // 对照：同一版本写下的行照旧被盖（快路没被这一道保护修坏）。
    advanceVaultRecommendationMatchCacheRevision(probe, "rev-2", []);
    expect(storedRow(probe).recommendation_revision).toBe("rev-2");
  });

  it("更早的表连算法版本列都没有：补 0 而不是补当前版本，旧行一律重算", () => {
    const dir = tempDir();
    writeRow(dir, { algorithm_version: null, recommendation_revision: "rev-1" });
    // 非空锚点：同上——这一行除了「没有算法版本」以外处处合格，
    // 若把缺失的那一列补成当前版本，它就会被当成有效行读回来。
    const partition = partitionVaultRecommendationMatchCache(dir, [item], context("rev-1"));
    expect(partition.cached_by_index.size).toBe(0);
    expect(partition.missing).toHaveLength(1);

    // 迁移之后这张表还得能正常用（补列没有把读写弄坏）。
    saveVaultRecommendationMatchCache(
      dir,
      [{ item, roll_fingerprint: createVaultWeaponRollFingerprint(item), match: match() }],
      context("rev-1")
    );
    expect(cachedCount(dir, "rev-1")).toBe(1);
  });
});
