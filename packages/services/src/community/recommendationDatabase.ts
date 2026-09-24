import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const databaseFileName = "weapon-recommendations.sqlite";
export const recommendationDatabaseSchemaVersion = 12;

/**
 * 文档键只由用户给的名字决定；前缀是命名空间常量，**不表达来源格式**。
 *
 * v9 及以前的键写成 `<格式>-document:<散列>`，格式因此泄漏进身份，同一个名字在两种格式下
 * 变成两份文档。v10 起两者共用一个名字空间：同一个名字 = 同一份来源文档，覆盖就是整体替换。
 */
export function recommendationDocumentKey(name: string): string {
  return `document:${sha256(name).slice(0, 24)}`;
}

/**
 * 来源实例键 = 所属文档键 + 实例身份的派生后缀。
 * 身份输入由各格式的适配器给出（DIM 给注释段的标题 / 作者，人工 CSV 给「推荐来源」列）。
 */
export function recommendationInstanceKey(documentId: string, identity: string): string {
  return `${documentId}:${sha256(identity).slice(0, 16)}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function openRecommendationDatabase(dataDir: string): DatabaseSync {
  mkdirSync(join(dataDir, "knowledge"), { recursive: true });
  const database = new DatabaseSync(recommendationDatabasePath(dataDir), { timeout: 5_000 });
  try {
    database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;");
    ensureRecommendationSchema(database);
    return database;
  } catch (error) {
    try {
      database.close();
    } catch {
      // 保留原始数据库错误。
    }
    throw error;
  }
}

export function recommendationDatabasePath(dataDir: string): string {
  return join(dataDir, "knowledge", databaseFileName);
}

function ensureRecommendationSchema(database: DatabaseSync): void {
  const versionRow = database.prepare("PRAGMA user_version").get() as { user_version?: number | bigint } | undefined;
  const currentVersion = Number(versionRow?.user_version ?? 0);
  const hasTables = hasRecommendationTables(database);
  const shouldRebuildAll = hasTables && currentVersion < 2;
  // v7 起 DIM 文档身份由「内容指纹 / URL」改为「用户命名的来源名」。v7 当初的处置是
  // **整族删掉、让用户重新导入一次**，理由是旧 document_id 反推不出名字。
  //
  // 那个理由在 v10 之后不再成立：v10 的键改写（`unifyDocumentKeys`）本来就是**按名字重算文档键**，
  // 老文档的 `title` 就在库里，改名这一步它本来就要做。删除于是成了纯粹的数据损失——
  // 而且 v0.0.26 发布的正是 schema v6，等于每个从 26 升上来的用户都要重导一次推荐来源，
  // 违反已定口径「CSV 需用户重新导入一次（**DIM 侧不重导**）」。
  //
  // 所以这里改为**收养**：把 pre-v7 文档的名字补齐、去重，交给键改写按名字重算。
  // 名字不是用户选的（是标题行/URL），所以自动补名是安全的；v7+ 库里名字是身份、
  // 静默合并等于丢数据，那里的重名抛错原样保留。
  const shouldAdoptPreV7DocumentNames = hasTables
    && currentVersion >= 2
    && currentVersion < 7;
  // v8 起存储来源的键改用存储层自己的键（文档级 `document_id`、实例级 `source_id`），
  // v7 及以前写作 `dim:<documentKey>[:<blockKey>]`。覆盖表没有外键，不会随文档键改写一起动，
  // 因此先按前缀改写一次，v10 那一步再把它们跟着文档键一起改到名字键上。
  const shouldRewriteStoredSourceKeys = hasTables
    && currentVersion >= 2
    && currentVersion < 8;
  // v9 起规则的「武器」与「要求」进入子表（`recommendation_source_rule_items` /
  // `recommendation_source_rule_requirements`），平铺的 `perk_hashes` 只作为迁移来源保留。
  // DIM 规则整族无损搬进新表，因此这里只做补写，不删任何数据。
  const shouldBackfillStructuredRules = hasTables
    && currentVersion >= 2
    && currentVersion < 9;
  // v10 起文档键不再含格式名（`dim-document:` → `document:`），实例键与覆盖键按同一映射跟随。
  // 这是一次原地改写，不删数据：用户已有的导入与启用 / 停用 / 移除选择都保留。
  const shouldUnifyDocumentKeys = hasTables
    && currentVersion >= 2
    && currentVersion < 10;
  // v11 起 CSV 的五张旧表整族删除（T56/DD1）。CSV 的读写、状态门、管理面与导出
  // 全部改走三级模型，这些表已无任何读写方，留着只会让人以为还有第二条通道。
  // 与上面各档不同，这一步不受版本区间约束：只要表还在就删。函数自身门控
  // （`IF EXISTS` + 表存在才 DELETE），所以无条件调用；全新库上它是空操作。
  // v12 起文档多一列 `import_pipeline_version`，记下这份导入是按哪一版导入口径写下的
  // （身份怎么展开成 hash 集）。只加列、不动数据：老库补出来就是旧口径，读取侧据此
  // 把旧口径导入挡在匹配之外，管理面提示「需要重新导入」。

  database.exec("BEGIN IMMEDIATE;");
  try {
    if (shouldRebuildAll) dropRecommendationTables(database);
    dropLegacyExternalRecommendationTables(database);
    dropLegacyCsvTables(database);
    database.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      ) STRICT;

      CREATE TABLE IF NOT EXISTS recommendation_documents (
        document_id TEXT PRIMARY KEY,
        origin TEXT NOT NULL CHECK (origin IN ('url', 'file', 'paste')),
        source_url TEXT NOT NULL DEFAULT '',
        revision TEXT NOT NULL DEFAULT '',
        fingerprint TEXT NOT NULL,
        imported_at TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        author TEXT NOT NULL DEFAULT '',
        -- v12 起：这份导入是按哪一版**导入口径**写下的（身份怎么展开成 hash 集）。
        -- 缺省 1 = v12 之前的旧口径，读取侧按「需要重新导入」处理（见
        -- recommendationImportPipelineVersion）。
        import_pipeline_version INTEGER NOT NULL DEFAULT 1
      ) STRICT;

      CREATE TABLE IF NOT EXISTS recommendation_source_instances (
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

      CREATE TABLE IF NOT EXISTS recommendation_source_rules (
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
        -- v9 起：互为备选的规则共用同一个分组键（投影时按它归约成逐栏候选池或逐条备选）。
        rule_group_id TEXT NOT NULL DEFAULT '',
        -- v9 起：来源侧的说明字段，统一投影直接读这里，不再由各格式各算一套。
        purposes TEXT NOT NULL DEFAULT '[]',
        rating TEXT NOT NULL DEFAULT '',
        ranking TEXT NOT NULL DEFAULT '',
        page_updated_at TEXT NOT NULL DEFAULT '',
        version TEXT NOT NULL DEFAULT '',
        source_location TEXT NOT NULL DEFAULT '',
        source_url TEXT NOT NULL DEFAULT '',
        PRIMARY KEY (source_id, rule_id)
      ) STRICT;

      -- 一条规则可以覆盖多把武器（人工推荐的一行可写多个武器 ID），
      -- 所以武器身份进子表，而不是留在规则行的单值 item_hash 上。
      CREATE TABLE IF NOT EXISTS recommendation_source_rule_items (
        source_id TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        item_hash INTEGER NOT NULL CHECK (item_hash >= 0 AND item_hash <= 4294967295),
        PRIMARY KEY (source_id, rule_id, item_hash),
        FOREIGN KEY (source_id, rule_id)
          REFERENCES recommendation_source_rules(source_id, rule_id) ON DELETE CASCADE
      ) STRICT;

      -- 逐条要求取代平铺的 perk_hashes：slot 为空表示来源未指定栏位（读时按武器定义解析）。
      CREATE TABLE IF NOT EXISTS recommendation_source_rule_requirements (
        source_id TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
        slot TEXT NOT NULL DEFAULT '',
        candidates TEXT NOT NULL DEFAULT '[]',
        PRIMARY KEY (source_id, rule_id, ordinal),
        FOREIGN KEY (source_id, rule_id)
          REFERENCES recommendation_source_rules(source_id, rule_id) ON DELETE CASCADE
      ) STRICT;

      CREATE INDEX IF NOT EXISTS idx_recommendation_source_rule_items_hash
        ON recommendation_source_rule_items(item_hash);

      CREATE INDEX IF NOT EXISTS idx_recommendation_source_rules_item
        ON recommendation_source_rules(item_hash);
      CREATE INDEX IF NOT EXISTS idx_recommendation_source_rules_source
        ON recommendation_source_rules(source_id);

      CREATE TABLE IF NOT EXISTS recommendation_source_overrides (
        source_key TEXT PRIMARY KEY,
        state TEXT NOT NULL CHECK (state IN ('active', 'disabled', 'removed')),
        updated_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE IF NOT EXISTS recommendation_rule_overrides (
        source_key TEXT NOT NULL,
        rule_stable_id TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('active', 'removed')),
        reason TEXT NOT NULL DEFAULT '',
        source_revision TEXT NOT NULL DEFAULT '',
        review_required INTEGER NOT NULL DEFAULT 0 CHECK (review_required IN (0, 1)),
        updated_at TEXT NOT NULL,
        PRIMARY KEY (source_key, rule_stable_id)
      ) STRICT;

      CREATE INDEX IF NOT EXISTS idx_recommendation_rule_overrides_state
        ON recommendation_rule_overrides(source_key, state, review_required);
    `);
    if (shouldAdoptPreV7DocumentNames) adoptPreV7DocumentNames(database);
    if (shouldRewriteStoredSourceKeys) {
      // `dim:<documentKey>[:<blockKey>]` → `dim-document:<documentKey>[:<blockKey>]`：
      // 文档级与实例级键共用同一个前缀改写，不需要区分两者。
      for (const table of ["recommendation_source_overrides", "recommendation_rule_overrides"]) {
        database.prepare(`
          UPDATE ${table}
          SET source_key = 'dim-document:' || substr(source_key, 5)
          WHERE source_key LIKE 'dim:%'
        `).run();
      }
    }
    ensureRecommendationRuleColumns(database);
    ensureRecommendationDocumentColumns(database);
    if (shouldBackfillStructuredRules) backfillStructuredRuleStorage(database);
    database.exec("COMMIT;");
  } catch (error) {
    try {
      database.exec("ROLLBACK;");
    } catch {
      // 保留原始 schema 错误。
    }
    throw error;
  }

  // 统一键必须排在结构迁移**之后**：v9 之前库里还没有分组列与两张子表，那时无从改起，
  // 而这些结构里的键由补写按改写后的来源键生成，晚改正好。改写本身要关外键、自开事务，
  // 只能在结构迁移提交后的窗口里做。版本号因此留到改写成功之后再写——改写失败时下次打开
  // 仍会重试，不会留下「版本已是 v10、键却还是旧的」这种半升级状态。
  if (shouldUnifyDocumentKeys) unifyDocumentKeys(database);
  database.exec(`PRAGMA user_version = ${recommendationDatabaseSchemaVersion};`);
}

/**
 * `external_recommendation_sets` 表族是 DIM 规则的旧归宿，三级模型（文档 / 实例 / 规则）
 * 已经接管全部读写，这里只负责把老库里的残留整族删掉。
 *
 * 自门控：老表不存在时不做任何事，所以可以无条件调用。
 * 注意 `hasRecommendationTables` 仍保留该表名作标记——它是 v1 库的判别位之一，
 * 删掉它会让 v1 库被误判成「无推荐表」并跳过重建。表本身在这里清，标记语义不动。
 */
function dropLegacyExternalRecommendationTables(database: DatabaseSync): void {
  if (!tableExists(database, "external_recommendation_sets")) return;
  database.exec(`
    DROP TABLE IF EXISTS external_recommendation_rule_tags;
    DROP TABLE IF EXISTS external_recommendation_rule_perks;
    DROP TABLE IF EXISTS external_recommendation_rules;
    DROP TABLE IF EXISTS external_recommendation_block_tags;
    DROP TABLE IF EXISTS external_recommendation_blocks;
    DROP TABLE IF EXISTS external_recommendation_sets;
  `);
}

/**
 * v9 新增的规则列。`CREATE TABLE IF NOT EXISTS` 对已存在的表不生效，
 * 所以老库要靠 ALTER 补齐；新库在上面建表时就带上了，这里是空操作。
 */
function ensureRecommendationRuleColumns(database: DatabaseSync): void {
  const columns: Array<[string, string]> = [
    ["rule_group_id", "TEXT NOT NULL DEFAULT ''"],
    ["purposes", "TEXT NOT NULL DEFAULT '[]'"],
    ["rating", "TEXT NOT NULL DEFAULT ''"],
    ["ranking", "TEXT NOT NULL DEFAULT ''"],
    ["page_updated_at", "TEXT NOT NULL DEFAULT ''"],
    ["version", "TEXT NOT NULL DEFAULT ''"],
    ["source_location", "TEXT NOT NULL DEFAULT ''"],
    ["source_url", "TEXT NOT NULL DEFAULT ''"],
  ];
  for (const [name, definition] of columns) {
    if (columnExists(database, "recommendation_source_rules", name)) continue;
    database.exec(`ALTER TABLE recommendation_source_rules ADD COLUMN ${name} ${definition};`);
  }
}

/**
 * v12 新增的文档列。同 `ensureRecommendationRuleColumns`：建表语句对已存在的表不生效，
 * 老库要靠 ALTER 补齐。
 *
 * 补出来的值一定是 `1`（旧口径）——v12 之前的导入本来就按旧口径写下，这是事实而不是猜测；
 * 用户在下一次重新导入时才升到当前版本。
 */
function ensureRecommendationDocumentColumns(database: DatabaseSync): void {
  if (columnExists(database, "recommendation_documents", "import_pipeline_version")) return;
  database.exec(
    "ALTER TABLE recommendation_documents ADD COLUMN import_pipeline_version INTEGER NOT NULL DEFAULT 1;"
  );
}

/**
 * v8 → v9 的结构化补写：把平铺的 `perk_hashes` 拆成逐条要求，把单值 `item_hash`
 * 同步进武器子表。逐字段无损（读取方按 ordinal 顺序把候选拼回去就得到原数组），
 * 所以这一步不做删除，用户已有的导入结果与覆盖选择都不会丢。
 *
 * - `perk_hashes` 里的每个值各自成为一条要求，`slot` 留空表示「来源没有指定栏位」，
 *   由读取方按武器定义解析——DIM 格式本来就不带栏位信息。
 * - `rule_group_id` 取 `<来源实例>|<武器>`：同一实例下同一把武器的多条规则互为备选，
 *   与迁移前按武器分组再归约成栏位候选池的口径一致。
 * - `purposes` 由 `mode` 派生；`mode` 仍是 DIM 格式声明的单一用途。
 */
function backfillStructuredRuleStorage(database: DatabaseSync): void {
  const rules = database.prepare(`
    SELECT source_id, rule_id, item_hash, mode, perk_hashes
    FROM recommendation_source_rules r
    WHERE NOT EXISTS (
      SELECT 1 FROM recommendation_source_rule_items i
      WHERE i.source_id = r.source_id AND i.rule_id = r.rule_id
    )
    ORDER BY source_id, rowid
  `).all() as Array<{
    source_id: string;
    rule_id: string;
    item_hash: number | bigint;
    mode: string;
    perk_hashes: string;
  }>;
  if (!rules.length) return;
  const insertItem = database.prepare(`
    INSERT OR IGNORE INTO recommendation_source_rule_items(source_id, rule_id, item_hash)
    VALUES (?, ?, ?)
  `);
  const insertRequirement = database.prepare(`
    INSERT INTO recommendation_source_rule_requirements(source_id, rule_id, ordinal, slot, candidates)
    VALUES (?, ?, ?, '', ?)
  `);
  const updateRule = database.prepare(`
    UPDATE recommendation_source_rules
    SET rule_group_id = ?, purposes = ?
    WHERE source_id = ? AND rule_id = ?
  `);
  for (const rule of rules) {
    const itemHash = Number(rule.item_hash);
    insertItem.run(rule.source_id, rule.rule_id, itemHash);
    parseHashArray(rule.perk_hashes).forEach((perkHash, ordinal) => {
      insertRequirement.run(rule.source_id, rule.rule_id, ordinal, JSON.stringify([perkHash]));
    });
    updateRule.run(
      ruleGroupKey(rule.source_id, itemHash),
      JSON.stringify([rule.mode]),
      rule.source_id,
      rule.rule_id
    );
  }
}

/** 同一来源实例下同一把武器的规则互为备选，这是投影分组的最小单位。 */
export function ruleGroupKey(sourceId: string, itemHash: number): string {
  return `${sourceId}|${itemHash}`;
}

/**
 * 把格式名从键里摘出去：旧键 `dim-document:<散列>` 改写成 `document:<散列>`，
 * 来源实例键、规则键里的来源前缀，以及两张覆盖表（没有外键）的键都按同一张映射表跟随。
 *
 * 改写主键会与外键约束冲突（父子两侧不可能同一条语句里同时改完），因此这一段的写法是：
 * 关掉 `foreign_keys` → 开事务 → 全部改写 → **在事务内 `PRAGMA foreign_key_check` 校验** →
 * 有违例就回滚。宁可升级失败让用户重试，也不留一个改了一半的库。
 *
 * 由 `ensureRecommendationSchema` 在结构迁移提交后调用，所以此刻表与列都已齐备；
 * 对已经是新键的库是恒等映射（重跑一遍 UPDATE 全是空操作），可以安全重试。
 */
function unifyDocumentKeys(database: DatabaseSync): void {
  const rewrite = documentKeyRewrite(database);
  if (rewrite.documentKeys.size === 0) return;
  database.exec("PRAGMA foreign_keys = OFF;");
  try {
    database.exec("BEGIN IMMEDIATE;");
    try {
      rewriteKeys(database, rewrite);
      const violations = database.prepare("PRAGMA foreign_key_check").all();
      if (violations.length) {
        throw new Error(`推荐库升级后存在 ${violations.length} 处外键违例，已回滚。`);
      }
      database.exec("COMMIT;");
    } catch (error) {
      try {
        database.exec("ROLLBACK;");
      } catch {
        // 保留原始升级错误。
      }
      throw error;
    }
  } finally {
    database.exec("PRAGMA foreign_keys = ON;");
  }
}

/**
 * 给 pre-v7 的 DIM 文档补一份**可用且唯一**的名字，供 v10 的键改写按名字重算键。
 *
 * v7 以前文档身份是内容指纹 / URL，`title` 只是当时顺手记下的标题行：可能是空的，
 * 也可能两份导入共用一个标题。而 `documentKeyRewrite` 对空名字与重名是要抛错的
 * （v7+ 库里那是有意为之——名字就是身份，静默合并两份导入等于丢数据）。
 * 老库不能跟着抛：名字本来就不是用户选的，升级失败＝库直接打不开，比丢数据更糟。
 *
 * 所以这里只动 pre-v7 的文档：空的补序号名，重的加序号区分。名字一旦补出来就是稳定的，
 * 第二次打开时键已经改完、这一段也不会再跑（版本号已过 7）。
 */
function adoptPreV7DocumentNames(database: DatabaseSync): void {
  const documents = database.prepare(
    "SELECT document_id, title FROM recommendation_documents WHERE document_id LIKE 'dim-document:%' ORDER BY document_id"
  ).all() as Array<{ document_id: string; title: string }>;
  if (!documents.length) return;
  const claimed = new Set<string>();
  const rename = database.prepare("UPDATE recommendation_documents SET title = ? WHERE document_id = ?");
  for (const [index, row] of documents.entries()) {
    // 兜底名不带格式名：面向用户不存在「DIM 愿望单」这个概念。
    const base = row.title.trim() || `未命名推荐 ${index + 1}`;
    let name = base;
    for (let suffix = 2; claimed.has(name); suffix++) name = `${base} (${suffix})`;
    claimed.add(name);
    if (name !== row.title) rename.run(name, row.document_id);
  }
}

/**
 * 逐行算出「旧键 → 新键」。文档键来自 `title`（就是用户起的名字），
 * 实例键保留原来的派生后缀，只换前缀——因此这一步是可逆的纯映射，不重算任何身份。
 */
type DocumentKeyRewrite = {
  documentKeys: Map<string, string>;
  instanceKeys: Map<string, string>;
  /** 实例旧键 → 新文档键，用来同步 `recommendation_source_instances.document_id`。 */
  instanceDocument: Map<string, string>;
};

function documentKeyRewrite(database: DatabaseSync): DocumentKeyRewrite {
  const documentKeys = new Map<string, string>();
  const instanceKeys = new Map<string, string>();
  const instanceDocument = new Map<string, string>();
  // 新键由名字算出来，所以「撞键」只可能是两份文档同名。名字就是身份，
  // 静默合并两份导入等于丢数据，这里宁可让升级失败并让用户先改名。
  const claimed = new Map<string, string>();
  const documents = database.prepare(
    "SELECT document_id, title FROM recommendation_documents ORDER BY document_id"
  ).all() as Array<{ document_id: string; title: string }>;
  for (const row of documents) {
    const name = row.title.trim();
    if (!name) throw new Error("推荐来源缺少名字，无法统一文档键。");
    const next = recommendationDocumentKey(name);
    const owner = claimed.get(next);
    if (owner && owner !== row.document_id) {
      throw new Error(`有两份推荐来源都叫「${name}」，升级后会合并成一份，请先改名再升级。`);
    }
    claimed.set(next, row.document_id);
    documentKeys.set(row.document_id, next);
  }
  const instances = database.prepare(
    "SELECT source_id, document_id FROM recommendation_source_instances ORDER BY source_id"
  ).all() as Array<{ source_id: string; document_id: string }>;
  for (const row of instances) {
    const documentKey = documentKeys.get(row.document_id);
    if (!documentKey) continue;
    instanceKeys.set(row.source_id, documentKey + instanceKeySuffix(row));
    instanceDocument.set(row.source_id, documentKey);
  }
  return { documentKeys, instanceKeys, instanceDocument };
}

/**
 * 实例键里「文档键之外的那一段」（块后缀）。
 *
 * 不能直接按 `document_id.length` 切：实例键与文档键**只在 v8 之后才共用前缀**
 * （`dim-document:<docKey>`），v6/v7 写的是 `dim:<docKey>[:<blockKey>]`——两个前缀长度不同，
 * 按文档键长度切会把块后缀切歪，块实例的键就会带着半截后缀进新库。
 *
 * 这条分支过去是死的：v6 升级时文档整族被删，实例跟着级联消失，切法错不错没人知道。
 * 现在文档被收养下来，它必须在场。
 */
function instanceKeySuffix(instance: { source_id: string; document_id: string }): string {
  const legacyDocumentPrefix = "dim:" + instance.document_id.slice("dim-document:".length);
  if (instance.source_id.startsWith(instance.document_id)) {
    // v8+：`dim-document:<docKey>[:<blockKey>]`，与文档键同前缀。
    return instance.source_id.slice(instance.document_id.length);
  }
  if (instance.source_id.startsWith(legacyDocumentPrefix)) {
    // v7 及以前：`dim:<docKey>[:<blockKey>]`。
    return instance.source_id.slice(legacyDocumentPrefix.length);
  }
  // 认不出前缀：宁可当作文档级实例（后缀为空），也不要切出一段残尾当块键。
  return "";
}

function rewriteKeys(database: DatabaseSync, rewrite: DocumentKeyRewrite): void {
  const { documentKeys, instanceKeys, instanceDocument } = rewrite;
  const updateDocument = database.prepare(
    "UPDATE recommendation_documents SET document_id = ? WHERE document_id = ?"
  );
  const updateInstance = database.prepare(`
    UPDATE recommendation_source_instances SET source_id = ?, document_id = ?
    WHERE source_id = ?
  `);
  const readRules = database.prepare(
    "SELECT rule_id, rule_group_id FROM recommendation_source_rules WHERE source_id = ? ORDER BY rule_id"
  );
  // 规则键与两张子表都没有独立的来源列：它们跟着规则行的来源键走。
  const updateRule = database.prepare(`
    UPDATE recommendation_source_rules SET source_id = ?, rule_group_id = ?
    WHERE source_id = ? AND rule_id = ?
  `);
  const childTables = ["recommendation_source_rule_items", "recommendation_source_rule_requirements"];
  const updateChildren = childTables.map((table) => database.prepare(
    `UPDATE ${table} SET source_id = ? WHERE source_id = ? AND rule_id = ?`
  ));
  const overrideTables = ["recommendation_source_overrides", "recommendation_rule_overrides"];
  // 覆盖表没有外键，文档级与实例级的键都可能出现（源覆盖两者都收，规则覆盖只有实例级），
  // 所以两张表都按「文档键 ∪ 实例键」整份改写，不做形态判断。
  const updateOverrides = overrideTables.map((table) => database.prepare(
    `UPDATE ${table} SET source_key = ? WHERE source_key = ?`
  ));

  for (const [previous, next] of documentKeys) updateDocument.run(next, previous);
  for (const [previous, next] of instanceKeys) {
    updateInstance.run(next, instanceDocument.get(previous) ?? next, previous);
    for (const rule of readRules.all(previous) as Array<{ rule_id: string; rule_group_id: string }>) {
      // 分组键写作 `<来源键>|<武器>`，来源键变了前缀，后缀原样保留。
      const groupKey = rule.rule_group_id.startsWith(`${previous}|`)
        ? `${next}${rule.rule_group_id.slice(previous.length)}`
        : rule.rule_group_id;
      updateRule.run(next, groupKey, previous, rule.rule_id);
      for (const statement of updateChildren) statement.run(next, previous, rule.rule_id);
    }
  }
  for (const [previous, next] of [...documentKeys, ...instanceKeys]) {
    for (const statement of updateOverrides) statement.run(next, previous);
  }
}

function parseHashArray(value: unknown): number[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}

function tableExists(database: DatabaseSync, tableName: string): boolean {
  const row = database.prepare(`
    SELECT 1 AS present
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(tableName) as { present?: number } | undefined;
  return row?.present === 1;
}

function columnExists(database: DatabaseSync, tableName: string, columnName: string): boolean {
  const rows = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name?: string }>;
  return rows.some((row) => row.name === columnName);
}

function hasRecommendationTables(database: DatabaseSync): boolean {
  const row = database.prepare(`
    SELECT COUNT(*) AS table_count
    FROM sqlite_master
    WHERE type = 'table'
      AND name IN (
        'knowledge_metadata',
        'external_recommendation_sets'
      )
  `).get() as { table_count?: number | bigint } | undefined;
  return Number(row?.table_count ?? 0) > 0;
}

/**
 * 整库重建（v1 及更早）用。只删**当前模型**的表——v11 之后 CSV 的五张旧表
 * 由 `dropLegacyCsvTables` 无条件清，两边不重复列举，也不会出现「这里漏了一张」。
 */
function dropRecommendationTables(database: DatabaseSync): void {
  database.exec(`
    DROP TABLE IF EXISTS recommendation_source_rule_requirements;
    DROP TABLE IF EXISTS recommendation_source_rule_items;
    DROP TABLE IF EXISTS recommendation_source_rules;
    DROP TABLE IF EXISTS recommendation_source_instances;
    DROP TABLE IF EXISTS recommendation_documents;
    DROP TABLE IF EXISTS recommendation_rule_overrides;
    DROP TABLE IF EXISTS recommendation_source_overrides;
    DROP TABLE IF EXISTS knowledge_metadata;
  `);
}

/**
 * CSV 的旧归宿：五张表 + `knowledge_metadata` 里描述「一份被托管的全局文件」的六个键。
 *
 * 自门控，可以无条件调用：`DROP TABLE IF EXISTS` 对不存在的表是空操作，
 * 元数据键则在 `knowledge_metadata` 真的存在时才删——全新库上这里一次都不写。
 * **`knowledge_metadata` 表本身保留**：它现在没有任何读写方（在线更新缓存已随
 * 固定地址在线导入一起删除），但它是 `hasRecommendationTables` 识别 v1 旧库的两个
 * 标志之一，删表要连识别口径一起改，属于 schema 变更，不在本次范围内。
 */
function dropLegacyCsvTables(database: DatabaseSync): void {
  database.exec(`
    DROP TABLE IF EXISTS weapon_recommendation_perks;
    DROP TABLE IF EXISTS weapon_recommendation_purposes;
    DROP TABLE IF EXISTS weapon_recommendation_item_ids;
    DROP TABLE IF EXISTS weapon_recommendations;
    DROP TABLE IF EXISTS recommendation_sources;
  `);
  if (!tableExists(database, "knowledge_metadata")) return;
  database.exec(`
    DELETE FROM knowledge_metadata
      WHERE key IN (
        'schema_version',
        'source_fingerprint',
        'imported_at',
        'semantic_validation_version',
        'validated_manifest_version',
        'dataset_revision'
      );
  `);
}
