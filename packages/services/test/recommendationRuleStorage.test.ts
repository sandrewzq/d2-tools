import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { DimWishlist, DimWishlistRule } from "@d2-tools/core/analysis/wishlistImport";
import { dimWishlistForSource, saveDimWishlist } from "../src/analysis/wishlistStore.js";
import {
  openRecommendationDatabase,
  recommendationDocumentKey
} from "../src/community/recommendationDatabase.js";
import { loadRecommendationSources } from "../src/community/recommendationDocumentStore.js";
import {
  listRecommendationManagedRules
} from "../src/community/recommendationManagement.js";

/**
 * L3-1 / L3-3-S1：规则的武器与要求进入子表、存储层不再认识格式之后的读写网。
 *
 * 这一层改的是**存储**，对外必须逐字段不变：`loadRecommendationSources` 的返回值是
 * 下游 `dimWishlistSource` 的唯一输入，它变了整套匹配结果就变了。所以断言全部写在
 * 「同一份数据经 DIM 适配器读出来是否与迁移前相同」上。
 *
 * 覆盖两条路径：
 * - 新库直写（v10 schema，写入走子表）；
 * - 老库升级（v8 schema + `perk_hashes` 平铺数据 → 补写进子表 + 统一文档键）。
 */

const weaponHash = 1001;
const perkA = 2001;
const perkB = 2002;
const perkC = 2003;
const documentName = "测试推荐";

function tempDataDir(): string {
  return mkdtempSync(join(tmpdir(), "d2-tools-rule-storage-"));
}

function dimRule(overrides: Partial<DimWishlistRule> = {}): DimWishlistRule {
  return {
    rule_stable_id: "rule-1",
    item_hash: weaponHash,
    perk_hashes: [perkA, perkB],
    mode: "pve",
    note: "清怪首选",
    ...overrides
  };
}

function dimWishlist(rules: DimWishlistRule[], overrides: Partial<DimWishlist> = {}): DimWishlist {
  return { title: documentName, rules, ...overrides };
}

function save(
  dataDir: string,
  rules: DimWishlistRule[],
  mode: "create" | "overwrite" = "create",
  name = documentName
): void {
  saveDimWishlist(dataDir, dimWishlist(rules), { name, mode });
}

/** 存储层不认识格式，DIM 形状的规则要经适配器还原——断言写在这一侧才有意义。 */
function dimRules(dataDir: string): DimWishlistRule[] {
  return loadRecommendationSources(dataDir, "dim")
    .flatMap((source) => dimWishlistForSource(source).rules);
}

describe("recommendation rule storage (current schema)", () => {
  it("round-trips a rule through the child tables field-for-field", () => {
    const dataDir = tempDataDir();
    // 两条规则同属一个注释段，才会落在同一个来源实例里（分组是既有行为，这里只要一份可比的输入）。
    const source = dimWishlist([
      dimRule({ tags: ["PVE", "清怪"], author: "作者甲", source_note: "备注", source_block_id: "block-1" }),
      dimRule({ rule_stable_id: "rule-2", perk_hashes: [perkC], mode: "pvp", note: "", source_block_id: "block-1" })
    ], { author: "文档作者", description: "文档说明", source_blocks: [{ id: "block-1", title: "段标题" }] });
    saveDimWishlist(dataDir, source, { name: documentName, mode: "create" });

    const sources = loadRecommendationSources(dataDir, "dim");
    expect(sources).toHaveLength(1);
    expect(sources[0]?.label).toBe("段标题");
    expect(dimWishlistForSource(sources[0]!).rules).toEqual([
      {
        rule_stable_id: "rule-1", item_hash: weaponHash, perk_hashes: [perkA, perkB], mode: "pve",
        kind: "roll", note: "清怪首选", tags: ["PVE", "清怪"], author: "作者甲", source_note: "备注",
        source_block_id: "block-1"
      },
      {
        rule_stable_id: "rule-2", item_hash: weaponHash, perk_hashes: [perkC], mode: "pvp",
        kind: "roll", note: "", source_block_id: "block-1"
      }
    ]);
  });

  it("keeps weapon_only rules free of requirements", () => {
    const dataDir = tempDataDir();
    save(dataDir, [dimRule({ rule_stable_id: "weapon-only", perk_hashes: [], kind: "weapon_only" })]);

    const [loaded] = dimRules(dataDir);
    expect(loaded?.kind).toBe("weapon_only");
    expect(loaded?.perk_hashes).toEqual([]);

    const database = openRecommendationDatabase(dataDir);
    try {
      const requirements = database.prepare(
        "SELECT COUNT(*) AS count FROM recommendation_source_rule_requirements"
      ).get() as { count: number };
      const items = database.prepare(
        "SELECT COUNT(*) AS count FROM recommendation_source_rule_items"
      ).get() as { count: number };
      expect(Number(requirements.count)).toBe(0);
      // 没有要求的规则仍然要能按武器查到。
      expect(Number(items.count)).toBe(1);
    } finally {
      database.close();
    }
  });

  it("replaces the whole document on overwrite", () => {
    const dataDir = tempDataDir();
    save(dataDir, [dimRule()]);
    save(dataDir, [dimRule({ rule_stable_id: "rule-2", perk_hashes: [perkC] })], "overwrite");

    expect(loadRecommendationSources(dataDir, "dim")).toHaveLength(1);
    const rules = dimRules(dataDir);
    expect(rules).toHaveLength(1);
    expect(rules[0]?.perk_hashes).toEqual([perkC]);

    const database = openRecommendationDatabase(dataDir);
    try {
      // 覆盖是全删全增：旧要求的子表行必须随级联删除一起消失。
      const requirements = database.prepare(
        "SELECT COUNT(*) AS count FROM recommendation_source_rule_requirements"
      ).get() as { count: number };
      expect(Number(requirements.count)).toBe(1);
    } finally {
      database.close();
    }
  });

  it("projects an unspecified-slot rule onto the management surface as one combo row", () => {
    const dataDir = tempDataDir();
    save(dataDir, [dimRule()]);

    const [loaded] = loadRecommendationSources(dataDir, "dim");
    const rules = listRecommendationManagedRules(dataDir, loaded!.sourceId);
    expect(rules).toHaveLength(1);
    // 管理面无武器定义，解析不出栏位，因此未指定栏位的要求仍合并成一条组合行；
    // 名称沿用迁移前的口径（数字哈希的字符串形式），行为不变。
    expect(rules[0]?.requirements).toEqual([
      { slot: "combo", names: [String(perkA), String(perkB)] }
    ]);
  });
});

describe("v8 → v11 upgrade", () => {
  it("backfills the child tables and unifies the document keys without changing what readers see", () => {
    const dataDir = tempDataDir();
    const { oldDocumentId, oldSourceId } = createV8Database(dataDir);
    const documentId = recommendationDocumentKey(documentName);
    const sourceId = `${documentId}:instance`;
    expect(documentId).not.toBe(oldDocumentId);

    const sources = loadRecommendationSources(dataDir, "dim");
    expect(sources).toHaveLength(1);
    expect(sources[0]?.documentId).toBe(documentId);
    expect(sources[0]?.sourceId).toBe(sourceId);
    expect(dimRules(dataDir)).toEqual([
      {
        rule_stable_id: "rule-1", item_hash: weaponHash, perk_hashes: [perkA, perkB], mode: "pve",
        kind: "roll", note: "清怪首选", tags: ["PVE"], author: "作者甲", source_note: "备注",
        source_block_id: "block-1"
      },
      { rule_stable_id: "rule-2", item_hash: weaponHash, perk_hashes: [], mode: "general",
        kind: "weapon_only", note: "" }
    ]);

    const migrated = openRecommendationDatabase(dataDir);
    try {
      const version = migrated.prepare("PRAGMA user_version").get() as { user_version: number };
      expect(Number(version.user_version)).toBe(11);
      const requirements = migrated.prepare(`
        SELECT rule_id, ordinal, slot, candidates FROM recommendation_source_rule_requirements
        WHERE source_id = ? ORDER BY rule_id, ordinal
      `).all(sourceId) as Array<{ rule_id: string; ordinal: number; slot: string; candidates: string }>;
      expect(requirements.map((row) => [row.rule_id, row.ordinal, row.slot, row.candidates])).toEqual([
        ["rule-1", 0, "", JSON.stringify([perkA])],
        ["rule-1", 1, "", JSON.stringify([perkB])]
      ]);
      const items = migrated.prepare(
        "SELECT rule_id, item_hash FROM recommendation_source_rule_items WHERE source_id = ? ORDER BY rule_id"
      ).all(sourceId) as Array<{ rule_id: string; item_hash: number }>;
      expect(items.map((row) => [row.rule_id, Number(row.item_hash)])).toEqual([
        ["rule-1", weaponHash],
        ["rule-2", weaponHash]
      ]);
      const rules = migrated.prepare(
        "SELECT rule_id, rule_group_id, mode, purposes FROM recommendation_source_rules WHERE source_id = ? ORDER BY rule_id"
      ).all(sourceId) as Array<{ rule_id: string; rule_group_id: string; mode: string; purposes: string }>;
      // 分组键 = 来源实例 + 武器：同一实例下同一把武器的规则互为备选。
      expect(rules.map((row) => [row.rule_id, row.rule_group_id, row.mode, row.purposes])).toEqual([
        ["rule-1", `${sourceId}|${weaponHash}`, "pve", JSON.stringify(["pve"])],
        ["rule-2", `${sourceId}|${weaponHash}`, "general", JSON.stringify(["general"])]
      ]);
      // 旧键必须一行不剩：留着会让「按名字覆盖」找不到自己那份导入。
      const staleDocuments = migrated.prepare(
        "SELECT COUNT(*) AS count FROM recommendation_documents WHERE document_id = ?"
      ).get(oldDocumentId) as { count: number };
      const staleInstances = migrated.prepare(
        "SELECT COUNT(*) AS count FROM recommendation_source_instances WHERE source_id = ?"
      ).get(oldSourceId) as { count: number };
      expect(Number(staleDocuments.count)).toBe(0);
      expect(Number(staleInstances.count)).toBe(0);
    } finally {
      migrated.close();
    }
  });

  it("keeps override selections across the key rewrite", () => {
    const dataDir = tempDataDir();
    const { database: v8, oldSourceId } = createV8Database(dataDir);
    v8.prepare(`
      INSERT INTO recommendation_source_overrides(source_key, state, updated_at)
      VALUES (?, 'disabled', '2026-01-01T00:00:00.000Z')
    `).run(oldSourceId);
    v8.prepare(`
      INSERT INTO recommendation_rule_overrides(source_key, rule_stable_id, state, reason, source_revision, review_required, updated_at)
      VALUES (?, 'rule-1', 'removed', '', '', 0, '2026-01-01T00:00:00.000Z')
    `).run(oldSourceId);
    v8.close();

    const sourceId = `${recommendationDocumentKey(documentName)}:instance`;
    const database = openRecommendationDatabase(dataDir);
    try {
      const sourceKeys = database.prepare(
        "SELECT source_key FROM recommendation_source_overrides ORDER BY source_key"
      ).all() as Array<{ source_key: string }>;
      const ruleKeys = database.prepare(
        "SELECT source_key, rule_stable_id FROM recommendation_rule_overrides ORDER BY source_key"
      ).all() as Array<{ source_key: string; rule_stable_id: string }>;
      // 覆盖表没有外键、不随文档级联删除，键改写漏掉它们等于悄悄丢掉用户的选择。
      expect(sourceKeys.map((row) => row.source_key)).toEqual([sourceId]);
      expect(ruleKeys.map((row) => [row.source_key, row.rule_stable_id])).toEqual([[sourceId, "rule-1"]]);
    } finally {
      database.close();
    }
  });

  it("is idempotent: a second open does not duplicate backfilled rows or re-rewrite keys", () => {
    const dataDir = tempDataDir();
    createV8Database(dataDir).database.close();
    const first = openRecommendationDatabase(dataDir);
    first.close();

    const database = openRecommendationDatabase(dataDir);
    try {
      const requirements = database.prepare(
        "SELECT COUNT(*) AS count FROM recommendation_source_rule_requirements"
      ).get() as { count: number };
      expect(Number(requirements.count)).toBe(2);
      const documents = database.prepare(
        "SELECT COUNT(*) AS count FROM recommendation_documents"
      ).get() as { count: number };
      const instances = database.prepare(
        "SELECT COUNT(*) AS count FROM recommendation_source_instances"
      ).get() as { count: number };
      expect(Number(documents.count)).toBe(1);
      expect(Number(instances.count)).toBe(1);
    } finally {
      database.close();
    }
  });
});

describe("v10 → v11 upgrade (S8：删 CSV 表族)", () => {
  it("drops the five CSV tables and their metadata keys, keeping DIM data and overrides intact", () => {
    const dataDir = tempDataDir();
    const { database, sourceId } = createV10Database(dataDir);
    database.close();

    const migrated = openRecommendationDatabase(dataDir);
    try {
      const version = migrated.prepare("PRAGMA user_version").get() as { user_version: number };
      expect(Number(version.user_version)).toBe(11);
      // 五张旧表必须真的消失：留着会让人以为还有第二条读写通道。
      for (const table of [
        "recommendation_sources",
        "weapon_recommendations",
        "weapon_recommendation_item_ids",
        "weapon_recommendation_purposes",
        "weapon_recommendation_perks"
      ]) {
        expect({ table, present: tableExists(migrated, table) }).toEqual({ table, present: false });
      }
      // knowledge_metadata **保留**：这一步只清 CSV 自己的键。
      expect(tableExists(migrated, "knowledge_metadata")).toBe(true);
      const keys = migrated.prepare("SELECT key FROM knowledge_metadata ORDER BY key").all() as Array<{ key: string }>;
      expect(keys.map((row) => row.key)).toEqual(["etag", "latest_revision"]);
      // 没有外键悬挂：五张表里那张带 FK 的子表也是整族删掉的。
      expect(migrated.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      migrated.close();
    }

    // DIM 数据与用户的启用 / 停用选择逐条不变。
    const sources = loadRecommendationSources(dataDir, "dim");
    expect(sources).toHaveLength(1);
    expect(sources[0]?.sourceId).toBe(sourceId);
    expect(dimRules(dataDir)).toEqual([
      {
        rule_stable_id: "rule-1", item_hash: weaponHash, perk_hashes: [perkA, perkB], mode: "pve",
        kind: "roll", note: "清怪首选"
      }
    ]);
    const reopened = openRecommendationDatabase(dataDir);
    try {
      const override = reopened.prepare(
        "SELECT source_key, state FROM recommendation_source_overrides"
      ).get() as { source_key: string; state: string } | undefined;
      expect(override).toEqual({ source_key: sourceId, state: "disabled" });
    } finally {
      reopened.close();
    }
  });

  it("is idempotent: a second open neither re-drops nor resurrects anything", () => {
    const dataDir = tempDataDir();
    createV10Database(dataDir).database.close();
    openRecommendationDatabase(dataDir).close();

    const database = openRecommendationDatabase(dataDir);
    try {
      expect(Number((database.prepare("PRAGMA user_version").get() as { user_version: number }).user_version)).toBe(11);
      const count = (sql: string): number => Number(
        (database.prepare(sql).get() as { count?: number | bigint } | undefined)?.count ?? 0
      );
      expect(count("SELECT COUNT(*) AS count FROM recommendation_documents")).toBe(1);
      expect(count("SELECT COUNT(*) AS count FROM recommendation_source_instances")).toBe(1);
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      // 第二次打开时「CSV 表还在就删」这一段是空操作——表已经不在了。
      expect(tableExists(database, "weapon_recommendations")).toBe(false);
    } finally {
      database.close();
    }
  });
});

function tableExists(database: DatabaseSync, tableName: string): boolean {
  const row = database.prepare(
    "SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ?"
  ).get(tableName) as { present?: number } | undefined;
  return row?.present === 1;
}

/**
 * 手工搭一个 v10 形状的库：三级模型是 v10 的（键已统一、子表已在），
 * 但 CSV 的五张旧表与六个 metadata 键**还在**。
 *
 * 这是唯一能真正走到「删表 + 清键」分支的办法——用当前 schema 建的库根本没有那五张表，
 * 断言会变成恒真。DIM 侧另存一份真实数据 + 一条停用选择，用来证明迁移不碰它们。
 */
function createV10Database(dataDir: string): { database: DatabaseSync; sourceId: string } {
  // 先按当前 schema 建库，再补回 v10 的 CSV 表族并把版本号压回 10。
  save(dataDir, [dimRule()]);
  const sourceId = loadRecommendationSources(dataDir, "dim")[0]!.sourceId;
  const raw = new DatabaseSync(join(dataDir, "knowledge", "weapon-recommendations.sqlite"));
  raw.exec("PRAGMA foreign_keys = ON;");
  raw.exec(`
    CREATE TABLE recommendation_sources (
      id INTEGER PRIMARY KEY,
      source_key TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      source_url TEXT NOT NULL DEFAULT ''
    ) STRICT;

    CREATE TABLE weapon_recommendations (
      id INTEGER PRIMARY KEY,
      rule_stable_id TEXT NOT NULL,
      identity_key TEXT NOT NULL,
      normalized_weapon_name TEXT NOT NULL,
      weapon_name TEXT NOT NULL,
      source_id INTEGER NOT NULL REFERENCES recommendation_sources(id) ON DELETE CASCADE,
      page TEXT NOT NULL DEFAULT '',
      rating TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      UNIQUE (source_id, rule_stable_id)
    ) STRICT;

    CREATE TABLE weapon_recommendation_item_ids (
      recommendation_id INTEGER NOT NULL REFERENCES weapon_recommendations(id) ON DELETE CASCADE,
      item_hash INTEGER NOT NULL,
      PRIMARY KEY (recommendation_id, item_hash)
    ) STRICT;

    CREATE TABLE weapon_recommendation_purposes (
      recommendation_id INTEGER NOT NULL REFERENCES weapon_recommendations(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL CHECK (purpose IN ('pve', 'pvp', 'general')),
      PRIMARY KEY (recommendation_id, purpose)
    ) STRICT;

    CREATE TABLE weapon_recommendation_perks (
      recommendation_id INTEGER NOT NULL REFERENCES weapon_recommendations(id) ON DELETE CASCADE,
      slot TEXT NOT NULL,
      ordinal INTEGER NOT NULL,
      perk_name TEXT NOT NULL,
      normalized_perk_name TEXT NOT NULL,
      PRIMARY KEY (recommendation_id, slot, normalized_perk_name)
    ) STRICT;
  `);
  // 真的写一行进去：删表断言才有对象，不是「本来就没有」的恒真。
  raw.prepare("INSERT INTO recommendation_sources(id, source_key, label) VALUES (1, 'aegis', 'Aegis推荐')").run();
  raw.prepare(`
    INSERT INTO weapon_recommendations(id, rule_stable_id, identity_key, normalized_weapon_name, weapon_name, source_id)
    VALUES (1, 'old-rule', 'hash:1001', '测试步枪', '测试步枪', 1)
  `).run();
  raw.prepare("INSERT INTO weapon_recommendation_item_ids(recommendation_id, item_hash) VALUES (1, 1001)").run();
  const metadata = raw.prepare("INSERT INTO knowledge_metadata(key, value) VALUES (?, ?)");
  for (const key of [
    "schema_version", "source_fingerprint", "imported_at",
    "semantic_validation_version", "validated_manifest_version", "dataset_revision"
  ]) metadata.run(key, "csv-only");
  // 这两个是 CSV 之外的键，**必须活过 v11**。
  metadata.run("etag", "abc");
  metadata.run("latest_revision", "42");
  raw.prepare(`
    INSERT INTO recommendation_source_overrides(source_key, state, updated_at)
    VALUES (?, 'disabled', '2026-01-01T00:00:00.000Z')
  `).run(sourceId);
  raw.exec("PRAGMA user_version = 10;");
  return { database: raw, sourceId };
}

/**
 * 手工搭一个 v8 形状的库：规则表只有 v8 的列，没有两个子表，文档键还是老的 `dim-document:` 形态。
 * 这是唯一能真正走到「ALTER 补列 + 补写子表 + 统一文档键」全部分支的办法。
 */
function createV8Database(dataDir: string): {
  database: DatabaseSync;
  oldDocumentId: string;
  oldSourceId: string;
} {
  const database = openRecommendationDatabase(dataDir);
  // 先按当前 schema 建库拿到全部表，再把 v9 / v10 新增的部分拆掉，还原成 v8 形状。
  database.close();
  const raw = new DatabaseSync(join(dataDir, "knowledge", "weapon-recommendations.sqlite"));
  raw.exec("PRAGMA foreign_keys = ON;");
  raw.exec(`
    DROP TABLE recommendation_source_rule_requirements;
    DROP TABLE recommendation_source_rule_items;
    CREATE TABLE recommendation_source_rules_v8 (
      source_id TEXT NOT NULL REFERENCES recommendation_source_instances(source_id) ON DELETE CASCADE,
      rule_id TEXT NOT NULL,
      item_hash INTEGER NOT NULL,
      mode TEXT NOT NULL,
      kind TEXT NOT NULL,
      perk_hashes TEXT NOT NULL DEFAULT '[]',
      note TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      author TEXT NOT NULL DEFAULT '',
      source_note TEXT NOT NULL DEFAULT '',
      source_title TEXT NOT NULL DEFAULT '',
      source_description TEXT NOT NULL DEFAULT '',
      block_id TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (source_id, rule_id)
    ) STRICT;
    DROP TABLE recommendation_source_rules;
    ALTER TABLE recommendation_source_rules_v8 RENAME TO recommendation_source_rules;
  `);
  const oldDocumentId = "dim-document:v8test";
  const oldSourceId = `${oldDocumentId}:instance`;
  raw.prepare(`
    INSERT INTO recommendation_documents(document_id, origin, source_url, revision, fingerprint, imported_at, title, description, author)
    VALUES (?, 'file', '', '', 'fp', '2026-01-01T00:00:00.000Z', ?, '', '文档作者')
  `).run(oldDocumentId, documentName);
  raw.prepare(`
    INSERT INTO recommendation_source_instances(
      source_id, document_id, kind, label, title, author, block_id, origin, source_url, revision, fingerprint, state
    ) VALUES (?, ?, 'dim', ?, ?, '', 'block-1', 'local-file', '', '', 'fp', 'active')
  `).run(oldSourceId, oldDocumentId, documentName, documentName);
  const insertRule = raw.prepare(`
    INSERT INTO recommendation_source_rules(
      source_id, rule_id, item_hash, mode, kind, perk_hashes, note, tags, author,
      source_note, source_title, source_description, block_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', ?)
  `);
  insertRule.run(oldSourceId, "rule-1", weaponHash, "pve", "roll", JSON.stringify([perkA, perkB]),
    "清怪首选", JSON.stringify(["PVE"]), "作者甲", "备注", "block-1");
  insertRule.run(oldSourceId, "rule-2", weaponHash, "general", "weapon_only", "[]", "", "[]", "", "", "");
  raw.exec("PRAGMA user_version = 8;");
  return { database: raw, oldDocumentId, oldSourceId };
}
