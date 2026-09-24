import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  openRecommendationDatabase,
  recommendationDocumentKey,
  recommendationInstanceKey,
  ruleGroupKey
} from "./recommendationDatabase.js";
import {
  readRecommendationRules,
  writeRecommendationRule,
  type RecommendationRuleWrite,
  type RecommendationStoredRule
} from "./recommendationRuleStore.js";

/**
 * 三级模型（文档 / 来源实例 / 规则）的存储层。**这里不认识任何格式**：
 * 一份文档由用户命名，切成几个来源实例、每个实例有哪些规则，全部由调用方
 * （各格式的适配器）决定——存储只负责按 `kind` 原样落库、按 `kind` 原样取回。
 *
 * `kind` 只表达「这份实例由哪种格式解析而来」，是数据，不是判据；
 * 判定 / 筛选 / 卡片 / 详情 / 排序一律不得读它（T56 不变量 I3）。
 */
export type RecommendationSourceKind = "dim" | "csv";

/**
 * **导入口径版本**：这份导入是按哪一版身份推导写下的——一条规则适用于哪些武器，是靠什么算出来的。
 *
 * 1（旧口径）：CSV 在展开之后还做「只保留最新发布组」的归约；愿望单文本压根不展开，只认自己那一行写的 hash。
 * 2（T56 2026-09-24）：家族全展开 + 声明版本优先 + 逐 hash 池子自检，CSV 与愿望单文本同一套。
 * 3（T56 2026-09-25）：自检的判据从「每一条候选都要有落点」放宽成「命中任意一条候选即保留」，
 *   并且「大师杰作」不参与判定（它在插件池里全量枚举，每一版都能到达，在不在判定里都不回答
 *   「这版跟规则有没有关系」，却会让有这一栏的 CSV 模板比没有这一栏的 DIM 文本多盖几个版本）。
 *   2 写下的覆盖集漏掉了「只差某一栏」的同族版本——实测 Aegis 暗夜魅影 `34731066` 的
 *   枪管 / 弹匣 / 大师杰作 / perk1 / perk2 全部命中，只因起源特性不是规则要的 `加速突击`
 *   就被整版剔除，用户仓库里 12 件这把枪一件来源都不显示（推荐表 748 条规则里 275 条、
 *   心愿单 6009 条里 1945 条都这样被整版剔除过）。「这版配不出整套」交给匹配期表达。
 *
 * 旧口径写下的 hash 集是**错的**——有的版本少显示了本该属于它的推荐（漏匹配），有的版本显示了
 * 它根本装不上的推荐（死配对，见 #108）。照旧用下去只会给出错的「符合 n 套」，所以
 * **低于当前版本的文档一律不参与匹配**（可用性门、来源加载都不认），管理面照旧列出来并提示重新导入。
 *
 * 口径本身再改一次就要 +1：改了它，用户手上的导入会重新变成「需要重新导入」。
 */
export const recommendationImportPipelineVersion = 3;

/**
 * 「这份文档是当前导入口径写下的」——把来源当成**可用事实**的读取路径都要带上它，参数是
 * `recommendationImportPipelineVersion`。写成一份片段而不是各处各写一遍：漏掉一处，
 * 那处就会把旧口径的数据当成有效事实用。
 *
 * 需要 `recommendation_documents` 的别名是 `d`。
 */
const currentPipelineDocumentSql = "d.import_pipeline_version >= ?";

/** 导入的两个显式动作：新建或覆盖同名文档。不存在默认路径。 */
export type RecommendationImportMode = "create" | "overwrite";

// 导入身份 = 用户命名的来源名。
export type RecommendationImportTarget = {
  name: string;
  mode: RecommendationImportMode;
};

/** 一个来源实例：身份输入 + 展示字段 + 规则。实例怎么切由格式适配器决定。 */
export type RecommendationInstanceWrite = {
  /** 实例身份的派生输入（DIM 给注释段的标题与作者，人工 CSV 给「推荐来源」列名）。 */
  identity: string;
  label: string;
  title?: string;
  author?: string;
  blockId?: string;
  sourceUrl?: string;
  revision?: string;
  fingerprint?: string;
  rules: RecommendationRuleWrite[];
};

export type RecommendationDocumentWrite = {
  kind: RecommendationSourceKind;
  name: string;
  mode: RecommendationImportMode;
  origin?: "url" | "file" | "paste";
  sourceUrl?: string;
  revision?: string;
  fingerprint?: string;
  importedAt?: string;
  description?: string;
  author?: string;
  instances: RecommendationInstanceWrite[];
};

export type StoredRecommendationInstance = {
  sourceId: string;
  documentId: string;
  kind: RecommendationSourceKind;
  label: string;
  title: string;
  author?: string;
  blockId?: string;
  origin: "community" | "local-file" | "paste";
  sourceUrl?: string;
  revision?: string;
  fingerprint: string;
  state: "active" | "disabled" | "removed";
  documentTitle: string;
  documentDescription?: string;
  documentAuthor?: string;
  importedAt: string;
  rules: RecommendationStoredRule[];
};

/**
 * 来源对外显示的名字：**用户给这次导入起的名字**（文档标题）优先，文件里自己声明的名字
 * （`label`：CSV 的「推荐来源」列值、DIM 的段名）退为副标题。
 *
 * 只在适配层判一次：管理名册、仓库来源筛选、来源事实、详情卡与卡片短名读的是同一个来源身份，
 * 两处各判一次就会出现「管理面板叫 A、武器详情叫 B」这种同一个来源两个名字的情况。
 */
export function recommendationSourceNames(instance: {
  label: string;
  documentTitle: string;
}): { label: string; declaredLabel?: string } {
  const declared = instance.label.trim();
  const label = instance.documentTitle.trim() || declared;
  return { label, ...(declared && declared !== label ? { declaredLabel: declared } : {}) };
}

export function saveRecommendationDocument(
  dataDir: string,
  input: RecommendationDocumentWrite
): StoredRecommendationInstance[] {
  const documentName = input.name.trim();
  if (!documentName) throw new Error("推荐来源必须命名后才能导入。");
  const documentId = recommendationDocumentKey(documentName);
  // 内容指纹是来源属性（供缓存键与在线更新判断），不参与身份判定。
  const fingerprint = input.fingerprint || sha256(JSON.stringify(input.instances));
  const importedAt = input.importedAt ?? new Date().toISOString();
  const origin = input.origin ?? "file";
  const database = openRecommendationDatabase(dataDir);
  try {
    database.exec("BEGIN IMMEDIATE;");
    const existing = database.prepare(
      "SELECT 1 AS present FROM recommendation_documents WHERE document_id = ?"
    ).get(documentId) as { present?: number } | undefined;
    if (input.mode === "create" && existing) {
      throw new Error(`已存在名为「${documentName}」的来源，请改名后新建，或改为覆盖。`);
    }
    if (input.mode === "overwrite" && !existing) {
      throw new Error(`没有找到名为「${documentName}」的来源，请改为新建。`);
    }
    // 覆盖 = 全删全增：级联删掉该文档下的来源实例与规则后整份重写。
    // 两张覆盖表按来源键独立存储，不受影响。
    if (existing) {
      database.prepare("DELETE FROM recommendation_documents WHERE document_id = ?").run(documentId);
    }
    // 导入口径由**写库的这份代码**决定，不由调用方传：适配器传什么都不该能写下「旧口径」。
    database.prepare(`
      INSERT INTO recommendation_documents(document_id, origin, source_url, revision, fingerprint, imported_at, title, description, author, import_pipeline_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(documentId, origin, input.sourceUrl ?? "", input.revision ?? "", fingerprint, importedAt,
      documentName, input.description ?? "", input.author ?? "", recommendationImportPipelineVersion);
    const insertInstance = database.prepare(`
      INSERT INTO recommendation_source_instances(
        source_id, document_id, kind, label, title, author, block_id, origin,
        source_url, revision, fingerprint, state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);
    for (const instance of input.instances) {
      // 标签只在导入期决定一次并持久化；读取路径不再推导，避免内部编号泄漏到界面。
      const sourceId = recommendationInstanceKey(documentId, instance.identity);
      insertInstance.run(sourceId, documentId, input.kind, instance.label, instance.title ?? instance.label,
        instance.author ?? "", instance.blockId ?? "", instanceOrigin(origin),
        instance.sourceUrl ?? input.sourceUrl ?? "", instance.revision ?? input.revision ?? "",
        instance.fingerprint ?? fingerprint);
      // 分组键的默认值是「同一实例同一武器互为备选」——这是 D2 的通用语义，
      // 与格式无关；只有声明了别的分组的来源（人工 CSV 每条规则自成一组）才显式给。
      for (const rule of instance.rules) {
        const itemHash = rule.itemHashes[0] ?? 0;
        writeRecommendationRule(database, sourceId, {
          ...rule,
          ruleGroupId: rule.ruleGroupId ?? ruleGroupKey(sourceId, itemHash)
        });
      }
    }
    database.exec("COMMIT;");
    return loadRecommendationSources(dataDir, input.kind).filter((source) => source.documentId === documentId);
  } catch (error) {
    try { database.exec("ROLLBACK;"); } catch { /* 保留原始导入错误。 */ }
    throw error;
  } finally {
    database.close();
  }
}

export type RecommendationDocumentSummary = {
  documentId: string;
  name: string;
  origin: "url" | "file" | "paste";
  importedAt: string;
  sourceCount: number;
  ruleCount: number;
  kinds: RecommendationSourceKind[];
  /** 写下这份导入的导入口径版本，见 `recommendationImportPipelineVersion`。 */
  importPipelineVersion: number;
  /** 口径低于当前版本：这份导入**没有参与匹配**，要重新导一次才生效。 */
  needsReimport: boolean;
};

// 命名身份要求界面能列出已有名字：用来判断冲突、选择覆盖对象、逐条移除。
// 名字是跨格式的单一名字空间，所以默认列出全部文档。
export function listRecommendationDocuments(
  dataDir: string,
  kind?: RecommendationSourceKind
): RecommendationDocumentSummary[] {
  const database = openRecommendationDatabase(dataDir);
  try {
    return listRecommendationDocumentsFrom(database, kind);
  } finally {
    database.close();
  }
}

/**
 * 已经持有连接、**并且可能正处在事务里**的调用方必须走这个版本。
 *
 * `openRecommendationDatabase` 每次打开都会跑一次 `BEGIN IMMEDIATE` 的 schema 保障，
 * 所以在事务内再开一个连接是**自己等自己**：外层的写锁不放，内层要 5 秒 busy_timeout
 * 后才报 `database is locked`。`clearImportedRecommendationRules` 踩过这条。
 */
export function listRecommendationDocumentsFrom(
  database: DatabaseSync,
  kind?: RecommendationSourceKind
): RecommendationDocumentSummary[] {
  const rows = database.prepare(`
      SELECT d.document_id, d.title, d.origin, d.imported_at, d.import_pipeline_version,
             (SELECT COUNT(*) FROM recommendation_source_instances s
               WHERE s.document_id = d.document_id AND (? = '' OR s.kind = ?)) AS source_count,
             (SELECT COUNT(*) FROM recommendation_source_rules r
                JOIN recommendation_source_instances s2 ON s2.source_id = r.source_id
               WHERE s2.document_id = d.document_id AND (? = '' OR s2.kind = ?)) AS rule_count,
             (SELECT GROUP_CONCAT(DISTINCT s3.kind) FROM recommendation_source_instances s3
               WHERE s3.document_id = d.document_id) AS kinds
      FROM recommendation_documents d
      WHERE ? = '' OR EXISTS (
        SELECT 1 FROM recommendation_source_instances s4
        WHERE s4.document_id = d.document_id AND s4.kind = ?
      )
      ORDER BY d.imported_at, d.document_id
    `).all(kind ?? "", kind ?? "", kind ?? "", kind ?? "", kind ?? "", kind ?? "") as Array<Record<string, string | number>>;
  return rows.map((row) => ({
    documentId: String(row.document_id),
    name: String(row.title ?? ""),
    origin: row.origin as RecommendationDocumentSummary["origin"],
    importedAt: String(row.imported_at ?? ""),
    sourceCount: Number(row.source_count ?? 0),
    ruleCount: Number(row.rule_count ?? 0),
    kinds: String(row.kinds ?? "").split(",").filter(Boolean) as RecommendationSourceKind[],
    // 缺列时的默认值在 SQL 侧给 1（老库 ALTER 出来的就是 1），这里再兜一次，
    // 免得读到 NULL 时把「口径未知」当成当前口径放行。
    importPipelineVersion: Number(row.import_pipeline_version ?? 1),
    needsReimport: Number(row.import_pipeline_version ?? 1) < recommendationImportPipelineVersion
  }));
}

/**
 * 读取来源实例（默认所有格式）。`state = 'removed'` 的实例不出现在结果里——
 * 它们的移除选择存在覆盖表，读取方据此再过滤启用 / 停用。
 */
export function loadRecommendationSources(
  dataDir: string,
  kind?: RecommendationSourceKind
): StoredRecommendationInstance[] {
  const database = openRecommendationDatabase(dataDir);
  try {
    const rows = database.prepare(`
      SELECT s.source_id, s.document_id, s.kind, s.label, s.title, s.author, s.block_id, s.origin,
             s.source_url, s.revision, s.fingerprint, s.state,
             d.title AS document_title, d.description AS document_description,
             d.author AS document_author, d.imported_at AS document_imported_at
      FROM recommendation_source_instances s
      JOIN recommendation_documents d ON d.document_id = s.document_id
      WHERE s.state <> 'removed' AND ${currentPipelineDocumentSql} AND (? = '' OR s.kind = ?)
      ORDER BY d.imported_at, s.source_id
    `).all(recommendationImportPipelineVersion, kind ?? "", kind ?? "") as Array<Record<string, string>>;
    return rows.map((row) => ({
      sourceId: row.source_id,
      documentId: row.document_id,
      kind: row.kind as RecommendationSourceKind,
      label: row.label,
      title: row.title,
      ...(row.author ? { author: row.author } : {}),
      ...(row.block_id ? { blockId: row.block_id } : {}),
      origin: row.origin as StoredRecommendationInstance["origin"],
      ...(row.source_url ? { sourceUrl: row.source_url } : {}),
      ...(row.revision ? { revision: row.revision } : {}),
      fingerprint: row.fingerprint,
      state: row.state as StoredRecommendationInstance["state"],
      documentTitle: row.document_title ?? "",
      ...(row.document_description ? { documentDescription: row.document_description } : {}),
      ...(row.document_author ? { documentAuthor: row.document_author } : {}),
      importedAt: row.document_imported_at ?? "",
      rules: readRecommendationRules(database, row.source_id)
    }));
  } finally {
    database.close();
  }
}

export type RecommendationDocumentInfo = {
  documentId: string;
  title: string;
  author?: string;
  sourceUrl?: string;
  revision?: string;
  fingerprint: string;
  importedAt: string;
};

// 在线更新检查只需要文档级元数据，不加载规则。
// 只认 origin='url' 的文档：来源可以并存多份后，「最新一份」不再等于「在线那份」。
export function loadRecommendationDocumentInfo(dataDir: string): RecommendationDocumentInfo | null {
  const database = openRecommendationDatabase(dataDir);
  try {
    const row = database.prepare(`
      SELECT document_id, title, author, source_url, revision, fingerprint, imported_at
      FROM recommendation_documents
      WHERE origin = 'url'
      ORDER BY imported_at DESC, document_id
      LIMIT 1
    `).get() as Record<string, string> | undefined;
    if (!row) return null;
    return {
      documentId: row.document_id,
      title: row.title,
      ...(row.author ? { author: row.author } : {}),
      ...(row.source_url ? { sourceUrl: row.source_url } : {}),
      ...(row.revision ? { revision: row.revision } : {}),
      fingerprint: row.fingerprint,
      importedAt: row.imported_at
    };
  } finally {
    database.close();
  }
}

/**
 * 「这个链接对应的是哪份来源」——同步入口据此找到要覆盖的对象、并比对内容指纹。
 *
 * 判据是**链接本身**（同一份来源就一条链接），不比名字：名字是用户起的，
 * 同一个人可能给同一个链接起不同的名字。排除 `origin='removed'` 之外的都不看，
 * 因为同步的目的就是刷新那份来源。
 *
 * **旧口径的文档不认**：它的内容指纹是按旧口径算的，认了就会拿新内容去比旧指纹，
 * 一致时回一句「没有变化」，用户点多少次同步都换不来重新导入，那份来源就永远停在旧口径。
 */
export function findRecommendationDocumentBySourceUrl(
  dataDir: string,
  sourceUrl: string
): RecommendationDocumentInfo | null {
  const wanted = normalizeSourceUrl(sourceUrl);
  if (!wanted) return null;
  const database = openRecommendationDatabase(dataDir);
  try {
    const row = database.prepare(`
      SELECT d.document_id, d.title, d.author, d.source_url, d.revision, d.fingerprint, d.imported_at
      FROM recommendation_documents d
      WHERE d.origin = 'url' AND d.source_url <> '' AND ${currentPipelineDocumentSql}
      ORDER BY d.imported_at DESC, d.document_id
    `).all(recommendationImportPipelineVersion) as Array<Record<string, string>>;
    // 在 JS 侧比而不是 SQL 侧：链接的归一化规则（大小写、末尾斜杠、百分号转义）只有一份实现，
    // SQL 里再写一遍就会漂移。
    const match = row.find((entry) => normalizeSourceUrl(entry.source_url) === wanted);
    if (!match) return null;
    return {
      documentId: match.document_id,
      title: match.title,
      ...(match.author ? { author: match.author } : {}),
      ...(match.source_url ? { sourceUrl: match.source_url } : {}),
      ...(match.revision ? { revision: match.revision } : {}),
      fingerprint: match.fingerprint,
      importedAt: match.imported_at
    };
  } finally {
    database.close();
  }
}

/**
 * 同一条链接可能被写成多种表面形式（大小写、末尾斜杠、`%20` 与空格）。
 * 归一化只做这些**等价改写**，不猜跳转、不补协议。
 */
function normalizeSourceUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    url.hash = "";
    return decodeURIComponent(url.toString()).toLocaleLowerCase().replace(/\/+$/, "");
  } catch {
    return trimmed.toLocaleLowerCase().replace(/\/+$/, "");
  }
}

export function hasRecommendationSources(dataDir: string, kind?: RecommendationSourceKind): boolean {
  const database = openRecommendationDatabase(dataDir);
  try {
    const row = database.prepare(`
      SELECT COUNT(*) AS count
      FROM recommendation_source_instances s
      JOIN recommendation_documents d ON d.document_id = s.document_id
      WHERE ${currentPipelineDocumentSql} AND (? = '' OR s.kind = ?)
    `).get(recommendationImportPipelineVersion, kind ?? "", kind ?? "") as { count?: number } | undefined;
    return Number(row?.count ?? 0) > 0;
  } finally {
    database.close();
  }
}

/**
 * 「有没有可参与判定的事实」——可用性门只看这一件事，不看是哪份文件导入的、
 * 也不看它当初用的是哪种格式。旧口径写下的事实不算数：它们已经在读取路径外被挡掉了，
 * 这里若还认，界面会显示「有推荐来源」而实际上一条都匹配不出来。
 */
export function hasActiveRecommendationRules(dataDir: string): boolean {
  const database = openRecommendationDatabase(dataDir);
  try {
    const row = database.prepare(`
      SELECT COUNT(*) AS count
      FROM recommendation_source_rules r
      JOIN recommendation_source_instances s ON s.source_id = r.source_id
      JOIN recommendation_documents d ON d.document_id = s.document_id
      WHERE s.state = 'active' AND ${currentPipelineDocumentSql}
    `).get(recommendationImportPipelineVersion) as { count?: number } | undefined;
    return Number(row?.count ?? 0) > 0;
  } finally {
    database.close();
  }
}

/**
 * 「这些武器命中了的规则，还各自声明了哪些武器」——定义预取用的查询。
 *
 * 从前这件事由读取件里的两个收集器加 `weaponIdentityRelations` 完成：按名称、发布组、变体
 * 重新推导一遍「规则适用于谁」。身份已经在导入期写进 `item_hashes`，所以这里只问存储一次，
 * 不做任何格式或身份判断。取到启用中规则的 hash 即可，停用 / 移除的规则多带出几个 hash
 * 不影响正确性——定义池本就该是超集，多读几个定义无害。
 *
 * 返回的是**规则声明的 hash 并集**，含入参本身（调用方自行去重）。
 */
export function relatedRecommendationItemHashes(
  dataDir: string,
  itemHashes: readonly number[]
): number[] {
  const requested = [...new Set(
    itemHashes.filter((hash) => Number.isInteger(hash) && hash >= 0 && hash <= 0xffff_ffff)
  )];
  if (!requested.length) return [];
  const database = openRecommendationDatabase(dataDir);
  try {
    const found = new Set<number>();
    // SQLite 的绑定变量有上限，按批查询；批大小与定义读取保持同一数量级。
    const batchSize = 500;
    for (let offset = 0; offset < requested.length; offset += batchSize) {
      const batch = requested.slice(offset, offset + batchSize);
      const placeholders = batch.map(() => "?").join(",");
      const rows = database.prepare(`
        SELECT DISTINCT i.item_hash AS item_hash
        FROM recommendation_source_rule_items i
        JOIN recommendation_source_instances s ON s.source_id = i.source_id
        WHERE s.state = 'active' AND EXISTS (
          SELECT 1 FROM recommendation_source_rule_items seed
          WHERE seed.source_id = i.source_id AND seed.rule_id = i.rule_id
            AND seed.item_hash IN (${placeholders})
        )
      `).all(...batch) as Array<{ item_hash: number | bigint }>;
      for (const row of rows) found.add(Number(row.item_hash));
    }
    return [...found];
  } finally {
    database.close();
  }
}

/**
 * 匹配结果里保存了来源标签，缓存键必须覆盖新模型的全部事实来源，
 * 否则重复导入同一文件时标签不会刷新。
 */
export function recommendationDocumentRevision(dataDir: string): string {
  const database = openRecommendationDatabase(dataDir);
  try {
    const documents = database.prepare(`
      SELECT document_id, fingerprint, revision, imported_at, title, author, import_pipeline_version
      FROM recommendation_documents
      ORDER BY document_id
    `).all() as Array<Record<string, string>>;
    const instances = database.prepare(`
      SELECT source_id, kind, label, revision, state
      FROM recommendation_source_instances
      ORDER BY source_id
    `).all() as Array<Record<string, string>>;
    return JSON.stringify({ documents, instances });
  } finally {
    database.close();
  }
}

/** 不带格式时删除全部文档；带格式时只删「含该格式实例」的文档。 */
export function clearRecommendationDocuments(dataDir: string, kind?: RecommendationSourceKind): number {
  const database = openRecommendationDatabase(dataDir);
  try {
    const result = database.prepare(`
      DELETE FROM recommendation_documents
      WHERE ? = '' OR EXISTS (
        SELECT 1 FROM recommendation_source_instances s
        WHERE s.document_id = recommendation_documents.document_id AND s.kind = ?
      )
    `).run(kind ?? "", kind ?? "");
    return Number(result.changes);
  } finally {
    database.close();
  }
}

function instanceOrigin(origin: "url" | "file" | "paste"): StoredRecommendationInstance["origin"] {
  if (origin === "url") return "community";
  return origin === "paste" ? "paste" : "local-file";
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
