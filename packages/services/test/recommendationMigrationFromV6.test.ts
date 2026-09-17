import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { DimWishlistRule } from "@d2-tools/core/analysis/wishlistImport";
import { dimWishlistForSource } from "../src/analysis/wishlistStore.js";
import { openRecommendationDatabase, recommendationDocumentKey } from "../src/community/recommendationDatabase.js";
import { loadRecommendationSources } from "../src/community/recommendationDocumentStore.js";

/**
 * v0.0.26（`abd465c`）发布的推荐库是 **schema v6**。用户从那个版本升级上来，
 * 走的是 `v6 → v11` 这一条**其它迁移用例都没覆盖**的路径：
 * 已有的用例只有 `v8 → v11` 与 `v10 → v11` 两个起点。
 *
 * 这里的库不是「用当前 schema 建好再往回拆」，而是**逐字照抄 v6 的建表语句**建出来的
 * （取自 `git show abd465c:packages/services/src/community/recommendationDatabase.ts`）。
 * 只有这样才能真实地走到 v6 起点上的每一个分支，而不是靠拆解造出一个「像 v6」的库——
 * v6 与 v11 的差别不只是少几张表，还有 `recommendation_source_rules` 少了 8 列、
 * 两张子表根本不存在、以及旧 CSV 表族与旧 DIM 表族同时在场。
 *
 * 数据按 v6 的真实键形状写：文档 `dim-document:<hash>`、实例与覆盖键 `dim:<documentKey>`。
 */

const weaponHash = 1001;
const perkA = 2001;
const perkB = 2002;
const documentName = "测试推荐";

function tempDataDir(): string {
  return mkdtempSync(join(tmpdir(), "d2-tools-migrate-v6-"));
}

function tableExists(database: DatabaseSync, tableName: string): boolean {
  const row = database.prepare(
    "SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ?"
  ).get(tableName) as { present?: number } | undefined;
  return row?.present === 1;
}

/**
 * 逐字照抄 v6 的 `ensureRecommendationSchema` 里的 DDL。
 *
 * 刻意**不**从当前 schema 出发往回拆：v6 的规则表没有 v9 才加的 8 个列，
 * 拆法很容易拆出一个「列比真 v6 多」的库，于是 ALTER 分支被静默跳过、断言恒真。
 */
const v6Ddl = `
  CREATE TABLE knowledge_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  ) STRICT;

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
    normalized_english_name TEXT NOT NULL DEFAULT '',
    english_name TEXT NOT NULL DEFAULT '',
    source_id INTEGER NOT NULL REFERENCES recommendation_sources(id) ON DELETE CASCADE,
    page TEXT NOT NULL DEFAULT '',
    rating TEXT NOT NULL DEFAULT '',
    ranking TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    source_url TEXT NOT NULL DEFAULT '',
    page_updated_at TEXT NOT NULL DEFAULT '',
    version TEXT NOT NULL DEFAULT '',
    source_location TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '',
    icon_url TEXT NOT NULL DEFAULT '',
    stats TEXT NOT NULL DEFAULT '',
    frame TEXT NOT NULL DEFAULT '',
    season TEXT NOT NULL DEFAULT '',
    acquisition_source TEXT NOT NULL DEFAULT '',
    champion TEXT NOT NULL DEFAULT '',
    champion_icon_url TEXT NOT NULL DEFAULT '',
    ammo_generation TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    shield TEXT NOT NULL DEFAULT '',
    charge_efficiency TEXT NOT NULL DEFAULT '',
    UNIQUE (source_id, rule_stable_id),
    UNIQUE (identity_key, source_id)
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
    slot TEXT NOT NULL CHECK (slot IN ('barrel', 'magazine', 'masterwork', 'perk1', 'perk2', 'origin')),
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    perk_name TEXT NOT NULL,
    normalized_perk_name TEXT NOT NULL,
    PRIMARY KEY (recommendation_id, slot, normalized_perk_name)
  ) STRICT;

  CREATE TABLE external_recommendation_sets (
    source_kind TEXT PRIMARY KEY CHECK (source_kind IN ('dim_wishlist', 'local_community')),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT '',
    source_url TEXT NOT NULL DEFAULT '',
    revision TEXT NOT NULL DEFAULT '',
    source_fingerprint TEXT NOT NULL,
    imported_at TEXT NOT NULL
  ) STRICT;

  CREATE TABLE external_recommendation_rules (
    id INTEGER PRIMARY KEY,
    source_kind TEXT NOT NULL REFERENCES external_recommendation_sets(source_kind) ON DELETE CASCADE,
    rule_stable_id TEXT NOT NULL,
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    item_hash INTEGER NOT NULL CHECK (item_hash >= 0 AND item_hash <= 4294967295),
    mode TEXT NOT NULL CHECK (mode IN ('pve', 'pvp', 'general')),
    note TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT '',
    source_note TEXT NOT NULL DEFAULT '',
    source_title TEXT NOT NULL DEFAULT '',
    source_description TEXT NOT NULL DEFAULT '',
    source_label TEXT NOT NULL DEFAULT '',
    block_id INTEGER,
    UNIQUE (source_kind, rule_stable_id),
    UNIQUE (source_kind, ordinal)
  ) STRICT;

  CREATE TABLE external_recommendation_rule_perks (
    rule_id INTEGER NOT NULL REFERENCES external_recommendation_rules(id) ON DELETE CASCADE,
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    perk_hash INTEGER NOT NULL CHECK (perk_hash >= 0 AND perk_hash <= 4294967295),
    PRIMARY KEY (rule_id, ordinal),
    UNIQUE (rule_id, perk_hash)
  ) STRICT;

  CREATE TABLE recommendation_documents (
    document_id TEXT PRIMARY KEY,
    origin TEXT NOT NULL CHECK (origin IN ('url', 'file', 'paste')),
    source_url TEXT NOT NULL DEFAULT '',
    revision TEXT NOT NULL DEFAULT '',
    fingerprint TEXT NOT NULL,
    imported_at TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT ''
  ) STRICT;

  CREATE TABLE recommendation_source_instances (
    source_id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES recommendation_documents(document_id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('dim', 'excel', 'csv', 'builtin')),
    label TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT '',
    block_id TEXT NOT NULL DEFAULT '',
    origin TEXT NOT NULL CHECK (origin IN ('community', 'local-file', 'paste', 'builtin')),
    source_url TEXT NOT NULL DEFAULT '',
    revision TEXT NOT NULL DEFAULT '',
    fingerprint TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('active', 'disabled', 'removed'))
  ) STRICT;

  CREATE TABLE recommendation_source_rules (
    source_id TEXT NOT NULL REFERENCES recommendation_source_instances(source_id) ON DELETE CASCADE,
    rule_id TEXT NOT NULL,
    item_hash INTEGER NOT NULL CHECK (item_hash >= 0 AND item_hash <= 4294967295),
    mode TEXT NOT NULL CHECK (mode IN ('pve', 'pvp', 'general')),
    kind TEXT NOT NULL CHECK (kind IN ('roll', 'weapon_only')),
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

  CREATE TABLE recommendation_source_overrides (
    source_key TEXT PRIMARY KEY,
    state TEXT NOT NULL CHECK (state IN ('active', 'disabled', 'removed')),
    updated_at TEXT NOT NULL
  ) STRICT;

  CREATE TABLE recommendation_rule_overrides (
    source_key TEXT NOT NULL,
    rule_stable_id TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('active', 'removed')),
    reason TEXT NOT NULL DEFAULT '',
    source_revision TEXT NOT NULL DEFAULT '',
    review_required INTEGER NOT NULL DEFAULT 0 CHECK (review_required IN (0, 1)),
    updated_at TEXT NOT NULL,
    PRIMARY KEY (source_key, rule_stable_id)
  ) STRICT;
`;

const v6DocumentId = "dim-document:v6testdocumentkey";
const v6SourceId = "dim:v6testdocumentkey";

/**
 * 手工搭一个真 v6 库，把三类数据都放进去——它们各自的迁移去向不同，
 * 少放一类就等于少测一条分支：
 *
 * 1. **DIM**（三级模型 + 旧 `external_*` 表族残留）；
 * 2. **CSV**（v6 时它还住在五张旧表里，三级模型没有它的份）；
 * 3. **用户选择**（停用 / 移除覆盖，键是 v6 的 `dim:` 形态）。
 */
function createV6Database(dataDir: string): DatabaseSync {
  mkdirSync(join(dataDir, "knowledge"), { recursive: true });
  const raw = new DatabaseSync(join(dataDir, "knowledge", "weapon-recommendations.sqlite"));
  raw.exec("PRAGMA foreign_keys = ON;");
  raw.exec(v6Ddl);

  // 1. DIM：一份文档 + 一个实例 + 两条规则。
  raw.prepare(`
    INSERT INTO recommendation_documents(document_id, origin, source_url, revision, fingerprint, imported_at, title, description, author)
    VALUES (?, 'url', 'https://example.com/wishlist', 'rev-1', 'fp-dim', '2026-01-01T00:00:00.000Z', ?, '', '文档作者')
  `).run(v6DocumentId, documentName);
  raw.prepare(`
    INSERT INTO recommendation_source_instances(
      source_id, document_id, kind, label, title, author, block_id, origin, source_url, revision, fingerprint, state
    ) VALUES (?, ?, 'dim', ?, ?, '', 'block-1', 'community', 'https://example.com/wishlist', 'rev-1', 'fp-dim', 'active')
  `).run(v6SourceId, v6DocumentId, documentName, documentName);
  const insertRule = raw.prepare(`
    INSERT INTO recommendation_source_rules(
      source_id, rule_id, item_hash, mode, kind, perk_hashes, note, tags, author,
      source_note, source_title, source_description, block_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', ?)
  `);
  insertRule.run(v6SourceId, "rule-1", weaponHash, "pve", "roll", JSON.stringify([perkA, perkB]),
    "清怪首选", JSON.stringify(["PVE"]), "作者甲", "备注", "block-1");
  insertRule.run(v6SourceId, "rule-2", weaponHash, "pvp", "roll", JSON.stringify([perkB]),
    "", "[]", "", "", "block-1");
  // 旧 DIM 表族的残留：v6 的 DIM 也可能还留在这个族里。
  raw.prepare(`
    INSERT INTO external_recommendation_sets(source_kind, title, source_fingerprint, imported_at)
    VALUES ('dim_wishlist', '旧 DIM 合集', 'fp-old', '2025-01-01T00:00:00.000Z')
  `).run();

  // 2. CSV：v6 时住在五张旧表里。
  raw.prepare("INSERT INTO recommendation_sources(id, source_key, label) VALUES (1, 'aegis', 'Aegis推荐')").run();
  raw.prepare(`
    INSERT INTO weapon_recommendations(id, rule_stable_id, identity_key, normalized_weapon_name, weapon_name, source_id, rating, note)
    VALUES (1, 'old-rule', 'hash:1001', '测试步枪', '测试步枪', 1, 'S', '旧 CSV 数据')
  `).run();
  raw.prepare("INSERT INTO weapon_recommendation_item_ids(recommendation_id, item_hash) VALUES (1, ?)").run(weaponHash);
  raw.prepare("INSERT INTO weapon_recommendation_purposes(recommendation_id, purpose) VALUES (1, 'pve')").run();
  raw.prepare(`
    INSERT INTO weapon_recommendation_perks(recommendation_id, slot, ordinal, perk_name, normalized_perk_name)
    VALUES (1, 'perk1', 0, '特性甲', '特性甲')
  `).run();

  // 3. 用户选择：DIM 来源被停用、一条规则被移除。
  raw.prepare("INSERT INTO recommendation_source_overrides(source_key, state, updated_at) VALUES (?, 'disabled', '2026-01-02T00:00:00.000Z')").run(v6SourceId);
  raw.prepare(`
    INSERT INTO recommendation_rule_overrides(source_key, rule_stable_id, state, updated_at)
    VALUES (?, 'rule-2', 'removed', '2026-01-02T00:00:00.000Z')
  `).run(v6SourceId);

  // metadata：6 个 CSV 键 + 2 个与 CSV 无关的键（后者必须活下来）。
  const insertKey = raw.prepare("INSERT INTO knowledge_metadata(key, value) VALUES (?, ?)");
  for (const key of [
    "schema_version", "source_fingerprint", "imported_at", "semantic_validation_version",
    "validated_manifest_version", "dataset_revision"
  ]) insertKey.run(key, "legacy");
  insertKey.run("etag", 'W/"abc"');
  insertKey.run("latest_revision", "rev-2");

  raw.exec("PRAGMA user_version = 6;");
  return raw;
}

function countRows(database: DatabaseSync, sql: string): number {
  return Number((database.prepare(sql).get() as { count?: number | bigint } | undefined)?.count ?? 0);
}

/** 存储层不认识格式，DIM 形状的规则要经适配器还原——断言写在这一侧才有意义。 */
function dimRules(dataDir: string): DimWishlistRule[] {
  return loadRecommendationSources(dataDir, "dim")
    .flatMap((source) => dimWishlistForSource(source).rules);
}

describe("v6 → v11 upgrade（v0.0.26 用户的唯一升级路径）", () => {
  it("upgrades a real v6 database without throwing and reaches v11", () => {
    const dataDir = tempDataDir();
    createV6Database(dataDir).close();

    const migrated = openRecommendationDatabase(dataDir);
    try {
      expect(Number((migrated.prepare("PRAGMA user_version").get() as { user_version: number }).user_version)).toBe(11);
      expect(migrated.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      migrated.close();
    }
  });

  it("drops every legacy table family and the legacy metadata keys", () => {
    const dataDir = tempDataDir();
    createV6Database(dataDir).close();
    const migrated = openRecommendationDatabase(dataDir);
    try {
      for (const table of [
        // 旧 CSV 表族（S8 删）
        "recommendation_sources",
        "weapon_recommendations",
        "weapon_recommendation_item_ids",
        "weapon_recommendation_purposes",
        "weapon_recommendation_perks",
        // 旧 DIM 表族（更早就废弃）
        "external_recommendation_sets",
        "external_recommendation_rules",
        "external_recommendation_rule_perks"
      ]) {
        expect({ table, present: tableExists(migrated, table) }).toEqual({ table, present: false });
      }
      // knowledge_metadata 保留，且这一步只清 CSV 自己的键。
      expect(tableExists(migrated, "knowledge_metadata")).toBe(true);
      expect(migrated.prepare("SELECT key FROM knowledge_metadata ORDER BY key").all())
        .toEqual([{ key: "etag" }, { key: "latest_revision" }]);
    } finally {
      migrated.close();
    }
  });

  it("keeps the user's DIM import: same rules, rekeyed onto the name-based key", () => {
    const dataDir = tempDataDir();
    createV6Database(dataDir).close();
    openRecommendationDatabase(dataDir).close();

    // 口径「DIM 侧不重导」的落点：读侧必须看到和升级前一样的一条来源、一样的规则。
    const sources = loadRecommendationSources(dataDir, "dim");
    expect(sources).toHaveLength(1);
    expect(sources[0]?.label).toBe(documentName);
    expect(dimRules(dataDir)).toEqual([
      {
        rule_stable_id: "rule-1", item_hash: weaponHash, perk_hashes: [perkA, perkB], mode: "pve",
        kind: "roll", note: "清怪首选", tags: ["PVE"], author: "作者甲", source_note: "备注",
        source_block_id: "block-1"
      },
      {
        rule_stable_id: "rule-2", item_hash: weaponHash, perk_hashes: [perkB], mode: "pvp",
        kind: "roll", note: "", source_block_id: "block-1"
      }
    ]);
  });

  it("reattaches the disabled/removed choices to the rekeyed source instead of orphaning them", () => {
    const dataDir = tempDataDir();
    createV6Database(dataDir).close();
    const migrated = openRecommendationDatabase(dataDir);
    try {
      const sourceId = loadRecommendationSources(dataDir, "dim")[0]!.sourceId;
      // v6 的键是 `dim:<docKey>`，迁移要先改写成 `dim-document:<docKey>`（v8 档）、
      // 再随文档键改写成按名字算出来的新键（v10 档）。覆盖表没有外键，
      // 若这一步漏了，用户的选择会静默失效——所以断言直接钉在新键上。
      expect(migrated.prepare(
        "SELECT source_key, state FROM recommendation_source_overrides ORDER BY source_key"
      ).all()).toEqual([{ source_key: sourceId, state: "disabled" }]);
      expect(migrated.prepare(
        "SELECT source_key, rule_stable_id, state FROM recommendation_rule_overrides ORDER BY rule_stable_id"
      ).all()).toEqual([{ source_key: sourceId, rule_stable_id: "rule-2", state: "removed" }]);
    } finally {
      migrated.close();
    }
  });

  it("adopts unnamed and duplicate-named pre-v7 documents instead of failing the upgrade", () => {
    const dataDir = tempDataDir();
    createV6Database(dataDir).close();
    // v6 库里两份文档同名、一份没有标题都是可能的（当时身份是指纹 / URL，名字不参与身份）。
    // 名字参与身份之后这三种情况必须被收养，而不是让库打不开。
    const raw = new DatabaseSync(join(dataDir, "knowledge", "weapon-recommendations.sqlite"));
    raw.exec("PRAGMA foreign_keys = ON;");
    raw.prepare(`
      INSERT INTO recommendation_documents(document_id, origin, source_url, revision, fingerprint, imported_at, title, description, author)
      VALUES ('dim-document:twin', 'url', '', '', 'fp-2', '2026-01-01T00:00:00.000Z', ?, '', '')
    `).run(documentName);
    raw.prepare(`
      INSERT INTO recommendation_documents(document_id, origin, source_url, revision, fingerprint, imported_at, title, description, author)
      VALUES ('dim-document:nameless', 'file', '', '', 'fp-3', '2026-01-01T00:00:00.000Z', '', '', '')
    `).run();
    // 每份文档都挂一个实例：没有实例的文档本来就不会出现在可管理来源里，
    // 那样断言的就只是「文档行还在」，测不到「用户看得见的那一层还认得出它」。
    const insertInstance = raw.prepare(`
      INSERT INTO recommendation_source_instances(
        source_id, document_id, kind, label, title, author, block_id, origin, source_url, revision, fingerprint, state
      ) VALUES (?, ?, 'dim', ?, ?, '', '', 'community', '', '', 'fp', 'active')
    `);
    insertInstance.run("dim:twin", "dim-document:twin", documentName, documentName);
    insertInstance.run("dim:nameless", "dim-document:nameless", "", "");
    raw.close();

    const migrated = openRecommendationDatabase(dataDir);
    try {
      expect(Number((migrated.prepare("PRAGMA user_version").get() as { user_version: number }).user_version)).toBe(11);
      expect(countRows(migrated, "SELECT COUNT(*) AS count FROM recommendation_documents")).toBe(3);
      expect(migrated.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      migrated.close();
    }

    // 三份都还在，且各有一个互不相同的名字——重名的没有合并、没名的拿到了兜底名。
    const letters = loadRecommendationSources(dataDir, "dim");
    expect(letters).toHaveLength(3);
    const names = letters.map((source) => source.documentTitle).sort();
    expect(names).toEqual([documentName, `${documentName} (2)`, "未命名推荐 1"].sort());
  });

  it("keeps the block suffix of a pre-v8 instance key (its prefix differs from the document key)", () => {
    const dataDir = tempDataDir();
    createV6Database(dataDir).close();
    // v6 的实例键是 `dim:<docKey>[:<blockKey>]`，文档键是 `dim-document:<docKey>`——
    // **两者前缀长度不同**。按文档键长度去切后缀会切出半截块键，多出来的那个实例
    // 在新库里就变成一个没有意义的键。v8 起两者共用前缀，所以只有 v6 会踩到。
    const raw = new DatabaseSync(join(dataDir, "knowledge", "weapon-recommendations.sqlite"));
    raw.exec("PRAGMA foreign_keys = ON;");
    raw.prepare(`
      INSERT INTO recommendation_source_instances(
        source_id, document_id, kind, label, title, author, block_id, origin, source_url, revision, fingerprint, state
      ) VALUES ('dim:v6testdocumentkey:block-1', 'dim-document:v6testdocumentkey', 'dim', '段标题', '', '', 'block-1', 'community', '', '', 'fp', 'active')
    `).run();
    raw.close();

    const migrated = openRecommendationDatabase(dataDir);
    try {
      const documentId = recommendationDocumentKey(documentName);
      expect(migrated.prepare(
        "SELECT source_id FROM recommendation_source_instances ORDER BY source_id"
      ).all()).toEqual([
        { source_id: documentId },
        { source_id: `${documentId}:block-1` }
      ]);
    } finally {
      migrated.close();
    }
  });

  it("is idempotent: a second open changes nothing", () => {
    const dataDir = tempDataDir();
    createV6Database(dataDir).close();
    openRecommendationDatabase(dataDir).close();

    const database = openRecommendationDatabase(dataDir);
    try {
      expect(Number((database.prepare("PRAGMA user_version").get() as { user_version: number }).user_version)).toBe(11);
      expect(countRows(database, "SELECT COUNT(*) AS count FROM recommendation_documents")).toBe(1);
      expect(countRows(database, "SELECT COUNT(*) AS count FROM recommendation_source_instances")).toBe(1);
      // 补名只跑一次：第二次打开时键已经按名字算好，名字不该再变。
      expect(database.prepare("SELECT title FROM recommendation_documents").all())
        .toEqual([{ title: documentName }]);
      expect(database.prepare("SELECT source_key FROM recommendation_source_overrides").all())
        .toEqual([{ source_key: loadRecommendationSources(dataDir, "dim")[0]!.sourceId }]);
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      database.close();
    }
  });
});
