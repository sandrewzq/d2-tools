import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import {
  summarizeItemPerks,
  type ItemPlugSummary
} from "@d2-tools/core/items/perks";
import {
  classifyWeaponRollSocket,
  type AccountWeaponRollPlugSummary
} from "@d2-tools/core/account/summary";
import type {
  DefinitionComponentData,
  DefinitionRecord
} from "@d2-tools/core/manifest/definitions";
import type {
  PerkRef,
  RecommendationRequirementSlot,
  WeaponIdentityRelation
} from "@d2-tools/core/community-perks";
import {
  recommendationRequirementSlotLabels,
  recommendationRequirementSlots,
  unspecifiedRequirementSlotLabel
} from "@d2-tools/core/community-perks";
import { recommendationDatabasePath } from "./recommendationDatabase.js";
import {
  escapeDelimitedValue,
  readRecommendationTableText
} from "./recommendationTableFile.js";
import {
  listRecommendationDocuments,
  loadRecommendationSources,
  recommendationDocumentRevision,
  saveRecommendationDocument,
  type RecommendationDocumentWrite,
  type RecommendationImportTarget,
  type RecommendationInstanceWrite,
  type StoredRecommendationInstance
} from "./recommendationDocumentStore.js";
import type {
  RecommendationRuleWrite,
  RecommendationStoredRule
} from "./recommendationRuleStore.js";

const requiredCsvHeaders = [
  "页面", "分类", "武器", "评级", "排名", "来源URL", "页面更新时间", "来源位置",
  "图标", "图标图标URL", "属性", "框架", "赛季", "来源", "勇士", "勇士图标URL",
  "弹药生成", "枪管", "弹匣", "大师", "Perk 1", "Perk 2", "起源特性", "注解",
  "护盾", "充能效率", "武器ID", "英文名称", "版本", "推荐来源", "用途"
] as const;
const playerCsvHeaders = [
  "武器", "武器ID", "英文名称", "推荐来源", "用途", "第一列", "第二列",
  "Perk 1", "Perk 2", "大师", "起源特性", "评级", "备注"
] as const;
// 模板第一列固定为「推荐来源」：来源名允许玩家自定义，导入导出都以这一列为准。
const unifiedChineseCsvHeaders = [
  "推荐来源", "武器", "规则名称", "用途/分类", "枪管/瞄具", "弹匣", "大师",
  "Perk 1", "Perk 2", "起源特性", "评级", "备注"
] as const;
const unifiedEnglishCsvHeaders = [
  "Source", "Weapon", "Rule Name", "Mode / Category", "Barrel / Sight", "Magazine", "Masterwork",
  "Perk 1", "Perk 2", "Origin Trait", "Rating", "Note"
] as const;
// 上一版（v0.0.25 及更早）导出 / 下载的统一模板：没有「推荐来源」列，来源名写在「规则名称」列。
// 界面一直写着兼容这一版，导入就必须真的认得它——否则用户手上那份旧文件会永远导不回来（Bug #89）。
const previousUnifiedChineseCsvHeaders = [
  "武器", "规则名称", "用途/分类", "枪管/瞄具", "弹匣", "大师",
  "Perk 1", "Perk 2", "起源特性", "评级", "备注"
] as const;
const previousUnifiedEnglishCsvHeaders = [
  "Weapon", "Rule Name", "Mode / Category", "Barrel / Sight", "Magazine", "Masterwork",
  "Perk 1", "Perk 2", "Origin Trait", "Rating", "Note"
] as const;

/**
 * 认得的所有表头。列名与列数合起来足以区分，一份文件只会命中一条。
 *
 * 表头是**格式知识**，只在本层用：下游拿到的是行对象，不关心它来自哪种表。
 */
const recommendationTableLayouts: Array<{
  format: "full" | "player" | "template";
  english: boolean;
  headers: readonly string[];
}> = [
  { format: "full", english: false, headers: requiredCsvHeaders },
  { format: "player", english: false, headers: playerCsvHeaders },
  { format: "template", english: false, headers: unifiedChineseCsvHeaders },
  { format: "template", english: true, headers: unifiedEnglishCsvHeaders },
  { format: "template", english: false, headers: previousUnifiedChineseCsvHeaders },
  { format: "template", english: true, headers: previousUnifiedEnglishCsvHeaders }
];
// 来源 key 由来源名派生，不做字典表：玩家自定义的来源名无法穷举。
// 现有四个来源的派生结果与历史 key 完全一致（Aegis推荐 → aegis、LGpig推荐 → lgpig …），无需迁移。
function sourceKeyFromLabel(label: string): string {
  return normalizeName(label.replace(/(推荐表|推荐|社区愿望单)$/u, ""));
}

/**
 * 「库里现在有什么」——全部由三级模型派生，没有一份是被托管文件留下的痕迹。
 *
 * 旧形状里的 `schema_version` / `semantic_validation_version` / `validated_manifest_version` /
 * `validation_state` / `source_fingerprint` / `skipped_row_count` 描述的是
 * 「一份全局托管文件 + 导入期存名字、读取期再解析」这套已不存在的形态（DD2），随形态一起删除：
 * - 严格校验发生在**导入期**，过了才写得进来，所以「复核状态」不再是一个需要持久化的维度；
 * - 身份在导入期已定死成 hash，不再绑定「当时那份资料库」；
 * - 跳行数是**单次导入**的事实，属于导入结果，不属于库的状态。
 */
export type WeaponRecommendationKnowledgeStatus = {
  dataset_revision: string;
  imported_at: string;
  recommendation_count: number;
  weapon_count: number;
  source_count: number;
};

export type WeaponKnowledgeImportPreview = {
  file_name: string;
  recommendation_count: number;
  importable_recommendation_count: number;
  weapon_count: number;
  source_count: number;
  source_labels: string[];
  fingerprint: string;
  blocking_issue_count: number;
  skipped_row_count: number;
  blocking_issues: WeaponKnowledgeImportIssue[];
};

export type WeaponKnowledgeImportIssue = {
  row_number: number;
  weapon_name: string;
  source_label: string;
  field: "推荐来源" | "规则名称" | "武器ID" | "武器" | "枪管" | "弹匣" | "大师" | "Perk 1" | "Perk 2" | "起源特性";
  value: string;
  message: string;
};

export type WeaponKnowledgeSemanticDefinitions = {
  item_definitions: DefinitionComponentData;
  plug_set_definitions: DefinitionComponentData;
  plug_definitions: DefinitionComponentData;
};

export type WeaponKnowledgeValidationContext = {
  manifest_version: string;
  semantic_definitions: WeaponKnowledgeSemanticDefinitions;
  /**
   * 武器身份关系（S3′）：导入期靠它把「这行写了哪些武器」展开成完整 hash 集。
   *
   * 调用方从资料库取（`getWeaponIdentityRelations`，返回的是**整个发布组**，不是只有点名的那几个 hash）。
   * 取不到时传空数组即可——展开会退化成「原样使用声明的 hash」，不会比从前更差。
   */
  weaponIdentityRelations?: WeaponIdentityRelation[];
};

export type WeaponKnowledgeImportResult = WeaponRecommendationKnowledgeStatus & {
  file_name: string;
  imported_row_count: number;
  /** 本次导入被严格校验拦下的行数——单次导入的事实，不落库。 */
  skipped_row_count: number;
};

/** Returns the player-editable column contract for manually maintained knowledge CSV files. */
export function createWeaponRecommendationCsvTemplate(): string {
  return `\uFEFF${unifiedChineseCsvHeaders.join(",")}\r\n`;
}

/** Returns the English player-editable column contract for manually maintained knowledge CSV files. */
export function createWeaponRecommendationEnglishCsvTemplate(): string {
  return `\uFEFF${unifiedEnglishCsvHeaders.join(",")}\r\n`;
}

/**
 * Exports the current curated knowledge as a player-editable CSV\uFF08\u7EDF\u4E00\u63A8\u8350\u6A21\u677F\uFF0C\u53EF\u76F4\u63A5\u56DE\u5BFC\uFF09\u3002
 *
 * DD4\uFF1A\u540D\u5B57\u4E0D\u5728\u5E93\u91CC\u2014\u2014\u4E09\u7EA7\u6A21\u578B\u5B58\u7684\u662F Hash\uFF08\u5BFC\u5165\u671F\u5DF2\u628A\u5B98\u65B9\u540D\u89E3\u6790\u6210 Hash\uFF09\uFF0C\u6240\u4EE5\u540D\u5B57\u5FC5\u987B\u7531
 * \u8C03\u7528\u65B9\u4F20\u5165\u7684\u5B9A\u4E49\u6C60\u53CD\u89E3\u3002\u8C03\u7528\u65B9\u672C\u6765\u5C31\u6709\u88C5\u8F7D\u5B9A\u4E49\u7684\u901A\u9053\uFF08`loadCommunityDefinitions`\uFF09\uFF0C\u4E0D\u65B0\u5F00\u7F51\u7EDC\u8DEF\u5F84\u3002
 *
 * \u6B66\u5668\u540D\u53D6\u8BE5\u89C4\u5219 hash \u96C6\u7684**\u6700\u5C0F hash**\uFF1A\u53D8\u4F53\u53D7\u9650\u7684\u89C4\u5219\u53EA\u6709\u4E00\u4E2A hash\uFF08\u5BFC\u51FA\u5B83\u81EA\u5DF1\u7684\u53D8\u4F53\u540D\uFF0C
 * \u56DE\u5BFC\u540E\u4ECD\u662F\u5B83\uFF09\uFF0C\u4E0D\u53D7\u9650\u7684\u89C4\u5219\u542B\u6574\u7EC4\uFF08\u5BFC\u51FA\u57FA\u7840\u7248\u540D\uFF0C\u56DE\u5BFC\u540E\u653E\u5927\u56DE\u6574\u7EC4\uFF09\u3002\u56E0\u6B64\u300C\u5BFC\u51FA \u2192 \u56DE\u5BFC\u300D
 * \u662F\u4E00\u6B21**\u5E42\u7B49\u6536\u655B**\uFF1A\u7B2C\u4E00\u904D\u53EF\u80FD\u628A\u53EA\u5199\u666E\u901A\u7248\u7684\u89C4\u5219\u653E\u5927\u6210\u540C\u7EC4\u4E09\u7248\u672C\uFF08\u8FD9\u6B63\u662F S3\u2032 \u7684\u53E3\u5F84\uFF09\uFF0C
 * \u518D\u5F80\u540E\u9010\u5B57\u76F8\u540C\u3002
 */
export function exportWeaponRecommendationPlayerCsv(
  dataDir: string,
  definitions: DefinitionComponentData
): string {
  const rows = loadRecommendationSources(dataDir, "csv").flatMap((instance) => (
    instance.rules.map((rule) => csvExportRow(instance, rule, definitions))
  ));
  return `\uFEFF${[unifiedChineseCsvHeaders.join(","), ...rows].join("\r\n")}\r\n`;
}

function csvExportRow(
  instance: StoredRecommendationInstance,
  rule: RecommendationStoredRule,
  definitions: DefinitionComponentData
): string {
  const requirementNames = (slot: RecommendationRequirementSlot): string[] => (
    rule.requirements
      .filter((requirement) => requirement.slot === slot)
      .flatMap((requirement) => requirement.candidates.map((hash) => definitionDisplayName(definitions, hash)))
  );
  return [
    instance.label,
    rule.itemHashes.length ? definitionDisplayName(definitions, rule.itemHashes[0]) : "",
    instance.label,
    rule.purposes.join(" / "),
    requirementNames("barrel").join(" / "),
    requirementNames("magazine").join(" / "),
    requirementNames("masterwork").join(" / "),
    requirementNames("perk1").join(" / "),
    requirementNames("perk2").join(" / "),
    requirementNames("origin").join(" / "),
    rule.rating,
    rule.note
  ].map(escapeDelimitedValue).join(",");
}

function definitionDisplayName(definitions: DefinitionComponentData, hash: number): string {
  return definitions[String(hash)]?.displayProperties?.name?.trim() || String(hash);
}

/** Validates a CSV without changing the active SQLite knowledge database. */
export function previewWeaponRecommendationCsv(
  text: string,
  fileName: string,
  semanticDefinitions?: WeaponKnowledgeSemanticDefinitions
): WeaponKnowledgeImportPreview {
  const rows = prepareWeaponRecommendationRows(
    curatedKnowledgeRows(parseKnowledgeCsv(text)),
    semanticDefinitions
  );
  const blockingIssues = semanticDefinitions
    ? validateWeaponRecommendationRows(rows, semanticDefinitions)
    : [];
  const skippedRows = new Set(blockingIssues.map((issue) => issue.row_number));
  const importableRows = rows.filter((row) => !skippedRows.has(csvRowNumber(row)));
  const sourceLabels = [...new Set(importableRows.map((row) => row["推荐来源"].trim()))].sort((left, right) => (
    left.localeCompare(right, "zh-CN")
  ));
  return {
    file_name: basename(fileName) || "weapon-recommendations.csv",
    recommendation_count: rows.length,
    importable_recommendation_count: importableRows.length,
    weapon_count: new Set(importableRows.map(weaponIdentityKey)).size,
    source_count: sourceLabels.length,
    source_labels: sourceLabels,
    fingerprint: csvFingerprint(text),
    blocking_issue_count: blockingIssues.length,
    skipped_row_count: skippedRows.size,
    blocking_issues: blockingIssues.slice(0, 50)
  };
}

export function collectWeaponRecommendationItemHashes(text: string): number[] {
  return [...new Set(curatedKnowledgeRows(parseKnowledgeCsv(text)).flatMap((row) => (
    splitValues(row["武器ID"] ?? "").map(Number).filter(isUnsignedHash)
  )))];
}

export function collectWeaponRecommendationNamesWithoutItemIds(text: string): string[] {
  return [...new Set(curatedKnowledgeRows(parseKnowledgeCsv(text))
    .filter((row) => !splitValues(row["武器ID"] ?? "").some((value) => isUnsignedHash(Number(value))))
    .map((row) => row["武器"]?.trim() || row["英文名称"]?.trim() || "")
    .filter(Boolean))];
}

/**
 * 装载定义池时要问资料库的两件事：模糊搜一遍，再按精确官方名取全集。
 *
 * 只要 hash，不要完整搜索结果——这条链只关心「这个名字能证明哪些官方定义存在」。
 */
export type WeaponDefinitionLookup = {
  searchItems(input: { query: string; limit?: number }): Promise<Array<{ hash: number }>>;
  getItemHashesByExactName(input: { names: string[] }): Promise<number[]>;
};

/**
 * 一份人工表格要用到的**完整武器定义池**：文件里写了 ID 的照收，只写名字的那部分再补齐。
 *
 * 只写名字的行必须查两遍：
 * - 搜索（有排序、有上限）保留下来，是为了名字写法与官方名对不上时仍能捞到，池子只增不减；
 * - **精确同名**查的是「这个名字对应哪些官方装备」的全集——搜索会按同一把武器的代表版本折叠，
 *   拿它当全集用会漏掉被折叠的版本，人工表格里本来正确的行会被判成异常（见 T56）。
 */
export async function collectWeaponRecommendationDefinitionHashes(
  text: string,
  lookup: WeaponDefinitionLookup
): Promise<number[]> {
  const itemHashes = collectWeaponRecommendationItemHashes(text);
  const namesWithoutItemIds = collectWeaponRecommendationNamesWithoutItemIds(text);
  if (!namesWithoutItemIds.length) {
    return itemHashes;
  }
  const searchedHashes = (await Promise.all(namesWithoutItemIds.map((weaponName) => (
    lookup.searchItems({ query: weaponName, limit: 20 })
  )))).flat().map((item) => item.hash);
  const exactNameHashes = await lookup.getItemHashesByExactName({ names: namesWithoutItemIds });
  return uniqueHashes([...itemHashes, ...searchedHashes, ...exactNameHashes]);
}

export function collectWeaponRecommendationPlugSetHashes(
  itemDefinitions: DefinitionComponentData
): number[] {
  return uniqueHashes(Object.values(itemDefinitions).flatMap((definition) => (
    (definition.sockets?.socketEntries ?? []).flatMap((entry) => [
      entry.reusablePlugSetHash,
      entry.randomizedPlugSetHash
    ])
  )));
}

export function collectWeaponRecommendationPlugHashes(
  itemDefinitions: DefinitionComponentData,
  plugSetDefinitions: DefinitionComponentData
): number[] {
  return uniqueHashes([
    ...Object.values(itemDefinitions).flatMap((definition) => (
      (definition.sockets?.socketEntries ?? []).flatMap((entry) => [
        entry.singleInitialItemHash,
        ...(entry.reusablePlugItems ?? []).map((plug) => plug.plugItemHash)
      ])
    )),
    ...Object.values(plugSetDefinitions).flatMap((definition) => (
      (definition.reusablePlugItems ?? []).map((plug) => plug.plugItemHash)
    ))
  ]);
}

/**
 * 导入一份已预览的 CSV：按用户给定的**名字**与**动作**（新建 / 覆盖）整份写进三级模型。
 *
 * 「没有默认路径」——名字必填，新建与覆盖是两个显式动作，与 DIM 来源共用同一套导入接口
 * （`saveRecommendationDocument`）。格式知识只到本文件为止：每个「推荐来源」列值切一个来源实例、
 * 每行切一条规则；武器身份（展开成完整 hash 集）与要求名（解析成 hash）都在**导入期**定死。
 * 失败由存储层的事务整体回滚，不再有「托管副本要跟着还原」的第二份状态。
 */
export async function importWeaponRecommendationCsv(
  dataDir: string,
  csvPath: string,
  expectedFingerprint: string,
  validation: WeaponKnowledgeValidationContext,
  target: RecommendationImportTarget,
  now = new Date()
): Promise<WeaponKnowledgeImportResult> {
  if (!Number.isFinite(now.getTime())) {
    throw new Error("武器推荐知识库导入时间无效。");
  }
  const csvText = readRecommendationTableText(csvPath);
  const preview = previewWeaponRecommendationCsv(csvText, csvPath, validation.semantic_definitions);
  if (preview.fingerprint !== expectedFingerprint) {
    throw new Error("武器推荐 CSV 在预览后发生了变化，请重新选择文件。");
  }
  if (preview.importable_recommendation_count === 0) {
    throw new Error("武器推荐 CSV 中没有可导入的有效记录，当前数据未更改。");
  }
  saveRecommendationDocument(dataDir, {
    kind: "csv",
    name: target.name,
    mode: target.mode,
    origin: "file",
    fingerprint: preview.fingerprint,
    importedAt: now.toISOString(),
    instances: csvRecommendationInstances(csvText, validation)
  });
  const status = readWeaponRecommendationKnowledgeStatus(dataDir);
  if (!status) throw new Error("武器推荐 CSV 导入失败。");
  return {
    ...status,
    file_name: preview.file_name,
    imported_row_count: preview.importable_recommendation_count,
    skipped_row_count: preview.skipped_row_count
  };
}

/** 「库里现在有什么」——全部由三级模型（`kind='csv'`）派生，不读任何托管文件或元数据键。 */
export function readWeaponRecommendationKnowledgeStatus(
  dataDir: string
): WeaponRecommendationKnowledgeStatus | null {
  if (!existsSync(recommendationDatabasePath(dataDir))) return null;
  const documents = listRecommendationDocuments(dataDir, "csv");
  if (!documents.length) return null;
  const instances = loadRecommendationSources(dataDir, "csv");
  const itemHashes = new Set<number>();
  let recommendationCount = 0;
  for (const instance of instances) {
    for (const rule of instance.rules) {
      recommendationCount += 1;
      for (const hash of rule.itemHashes) itemHashes.add(hash);
    }
  }
  return {
    dataset_revision: recommendationDocumentRevision(dataDir),
    imported_at: documents.reduce((latest, document) => (
      document.importedAt > latest ? document.importedAt : latest
    ), ""),
    recommendation_count: recommendationCount,
    weapon_count: itemHashes.size,
    source_count: instances.length
  };
}

/** 导出用：库里 CSV 实例声明过的全部武器 hash（定义装载的前置查询）。 */
export function collectCsvRecommendationItemHashes(dataDir: string): number[] {
  return uniqueHashes(loadRecommendationSources(dataDir, "csv").flatMap((instance) => (
    instance.rules.flatMap((rule) => rule.itemHashes)
  )));
}

type CuratedRuleContext = {
  identity: RecommendationIdentityExpansion;
  definitions: WeaponKnowledgeSemanticDefinitions;
  /** 「栏位 → 官方名 → 可用 Perk」按武器 hash 集缓存：同一把武器的多行只建一次索引。 */
  slotPerkIndexes: Map<string, SlotPerkIndex>;
};

/**
 * CSV 行 → 来源实例列表（③ 的形状）。
 *
 * 校验在预览期已经跑过一次，这里再跑一次并**丢掉被拦下的行**：导入的永远是「预览里说能导入的那些行」。
 * 被拦下的行不写库，也就没有「半份来源」这种东西——三级模型的覆盖是**整份文档全删全增**。
 */
function csvRecommendationInstances(
  csvText: string,
  validation: WeaponKnowledgeValidationContext
): RecommendationInstanceWrite[] {
  const rows = prepareWeaponRecommendationRows(
    curatedKnowledgeRows(parseKnowledgeCsv(csvText)),
    validation.semantic_definitions
  );
  const blocking = new Set(
    validateWeaponRecommendationRows(rows, validation.semantic_definitions).map((issue) => issue.row_number)
  );
  const validRows = rows.filter((row) => !blocking.has(csvRowNumber(row)));
  if (!validRows.length) throw new Error("武器推荐 CSV 中没有可导入的有效记录，当前数据未更改。");

  const context: CuratedRuleContext = {
    identity: recommendationIdentityExpansion(
      validation.weaponIdentityRelations ?? [],
      validation.semantic_definitions.item_definitions
    ),
    definitions: validation.semantic_definitions,
    slotPerkIndexes: new Map()
  };
  const instances = new Map<string, RecommendationInstanceWrite>();
  for (const row of validRows) {
    const weaponName = row["武器"]?.trim();
    const sourceLabel = row["推荐来源"]?.trim();
    if (!weaponName || !sourceLabel) continue;
    const identityKey = sourceKeyFromLabel(sourceLabel);
    const instance = instances.get(identityKey) ?? { identity: identityKey, label: sourceLabel, rules: [] };
    instances.set(identityKey, instance);
    instance.rules.push(curatedRule(row, context));
  }
  return [...instances.values()];
}

function curatedRule(row: Record<string, string>, context: CuratedRuleContext): RecommendationRuleWrite {
  const weaponName = row["武器"].trim();
  const sourceLabel = row["推荐来源"].trim();
  // S3′：身份在**这里**定死。展开的唯一权威是 `expandRecommendationItemHashes`，读取期只做成员判断。
  const itemHashes = expandRecommendationItemHashes({
    itemHashes: splitValues(row["武器ID"] ?? "").map(Number).filter(isUnsignedHash),
    weaponName,
    englishName: row["英文名称"]?.trim() ?? ""
  }, context.identity.identityRelations, context.identity.nameEntries);
  if (!itemHashes.length) {
    throw new Error(`武器推荐 CSV 的武器 ID 无效：${weaponName} / ${sourceLabel}`);
  }
  // 要求名 → 候选 hash 同样在**导入期**定死：`buildSlotPerkIndex` 是「栏位 → 官方名 → 可用 Perk」
  // 的唯一权威，导入期校验与这里读的是同一张表。读取期拿到的只有 hash，名字由消费方按资料库反解。
  const slotPerkIndex = slotPerkIndexFor(context, itemHashes);
  const requirements = strictRequirementFields.flatMap(([field, slot]) => {
    const names = requirementValues(row[field] ?? "").filter((name) => !isUnspecifiedRequirementName(name));
    const candidates = resolveSlotPerkNames(names, slotPerkIndex[slot]).map((perk) => perk.hash);
    // 候选为空的要求不落库：那是一条「写了但核对不到」的假要求，读取期只会显示成噪声。
    return candidates.length ? [{ slot, candidates }] : [];
  });
  const ruleId = curatedRuleStableId(sourceKeyFromLabel(sourceLabel), row);
  return {
    // 覆盖选择与导出的身份锚：按**声明的**身份算，不随展开 / 候选解析变动，
    // 所以重新导入不会把用户已有的覆盖选择冲掉。
    ruleId,
    // 每条人工规则自成一组：同一来源下写同一把武器的两行是两个独立推荐，不是备选。
    ruleGroupId: ruleId,
    itemHashes,
    purposes: parsePurposes(row["用途"] ?? ""),
    kind: requirements.length ? "roll" : "weapon_only",
    requirements,
    note: row["注解"]?.trim() ?? "",
    rating: row["评级"]?.trim() ?? "",
    ranking: row["排名"]?.trim() ?? "",
    pageUpdatedAt: row["页面更新时间"]?.trim() ?? "",
    version: row["版本"]?.trim() ?? "",
    sourceLocation: row["来源位置"]?.trim() ?? "",
    sourceUrl: row["来源URL"]?.trim() ?? ""
  };
}

/**
 * 这条规则覆盖的武器 → 「栏位 → 官方名 → 可用 Perk」。
 *
 * 定义池取规则的**展开集**：一条普通版的推荐在专家版页面上也要能解析出候选，而某个栏位的
 * 写法可能只出现在另一个版本的定义里。按 hash 集缓存，同一把武器的多行只建一次。
 */
function slotPerkIndexFor(context: CuratedRuleContext, itemHashes: readonly number[]): SlotPerkIndex {
  const cacheKey = [...itemHashes].sort((left, right) => left - right).join("|");
  const cached = context.slotPerkIndexes.get(cacheKey);
  if (cached) return cached;
  const index = buildSlotPerkIndex(
    itemHashes.map((hash) => context.definitions.item_definitions[String(hash)]),
    {
      allDefinitions: {
        ...context.definitions.item_definitions,
        ...context.definitions.plug_definitions
      },
      plugSetDefinitions: context.definitions.plug_set_definitions
    }
  );
  context.slotPerkIndexes.set(cacheKey, index);
  return index;
}

type RecommendationIdentityExpansion = {
  identityRelations: readonly WeaponIdentityRelation[];
  nameEntries: readonly WeaponNameEntry[];
};

/**
 * 导入期的身份展开上下文（S3′）：整批行共用一份名称表，避免每行重建。
 *
 * 名称表只用**当前语言**的官方定义——与导入期自己的 `resolveOfficialWeaponDefinitions` 同一口径
 * （它也是拿行里的「武器 / 英文名称」去比对这一份定义）。英文定义要额外从资料库取，而「只写英文名」
 * 的行本来就会在校验期被拦下（「无法根据官方中文名称找到可核对的武器」），所以不取。
 */
function recommendationIdentityExpansion(
  identityRelations: readonly WeaponIdentityRelation[],
  itemDefinitions: DefinitionComponentData
): RecommendationIdentityExpansion {
  return {
    identityRelations,
    nameEntries: buildWeaponNameEntries(itemDefinitions)
  };
}

/** 栏位 → 官方名（`normalizeName` 之后）→ 该名下可用的 Perk。 */
type SlotPerkIndex = Record<RecommendationRequirementSlot, Map<string, PerkRef[]>>;

/**
 * 「栏位 → 官方名 → 可用 Perk」的**唯一权威**：导入期校验（这个名字在该栏位存在吗）与
 * 运行期投影（这个名字对应哪些 hash）都只读它；L3-3 的 CSV 适配器也从这里取候选池。
 *
 * 从前两处各走一遍 `summarizeItemPerks` + `classifyWeaponRollSocket`，口径已经分叉：
 * 校验按栏位分桶、按 socket 顺序把特性排成 perk1 / perk2，投影却是一张不看栏位的扁平表，
 * 大师杰作的别名归并也只在投影一侧做。同一份定义在两侧因此会得出不同的键集——
 * 校验期放行的名字在投影里解析不出候选，或反之。合并之后这一步不可能再分叉。
 */
function buildSlotPerkIndex(
  itemDefinitions: ReadonlyArray<DefinitionRecord | undefined>,
  options: {
    allDefinitions: DefinitionComponentData;
    plugSetDefinitions: DefinitionComponentData;
    englishItemDefinitions?: DefinitionComponentData;
  }
): SlotPerkIndex {
  const index = Object.fromEntries(
    recommendationRequirementSlots.map((slot) => [slot, new Map<string, PerkRef[]>()])
  ) as SlotPerkIndex;

  for (const itemDefinition of itemDefinitions) {
    if (!itemDefinition) continue;
    let traitIndex = 0;
    const groups = summarizeItemPerks(itemDefinition, options.allDefinitions, {
      plugSetDefinitions: options.plugSetDefinitions,
      maxPlugsPerSocket: null
    });
    // 特性在定义里没有可辨的栏位，只能按 socket 顺序排：第一个是 Perk 1、第二个是 Perk 2，
    // 再多的特性能写出名字也无栏位可核查，不入索引。
    for (const group of groups.sort((left, right) => left.socket_index - right.socket_index)) {
      const role = classifyWeaponRollSocket(group.plugs.map(toRollPlugSummary));
      const slot: RecommendationRequirementSlot | undefined = role === "trait"
        ? (++traitIndex === 1 ? "perk1" : traitIndex === 2 ? "perk2" : undefined)
        : role === "barrel" || role === "magazine" || role === "masterwork" || role === "origin"
          ? role
          : undefined;
      if (!slot) continue;

      const bucket = index[slot];
      for (const plug of group.plugs) {
        addPerkName(bucket, plug.name, plug);
        const englishName = options.englishItemDefinitions?.[String(plug.hash)]?.displayProperties?.name?.trim();
        if (englishName) addPerkName(bucket, englishName, plug, englishName);
      }

      if (slot !== "masterwork") continue;
      // 大师杰作在官方定义里带「3 阶：」「大师杰作：」这类前缀，用户写的是去掉前缀的名字，
      // 所以按前缀归并出别名；同名多个取视觉优先级最高的那个。
      const aliases = new Map<string, ItemPlugSummary>();
      for (const plug of group.plugs) {
        const alias = officialMasterworkName(plug.name);
        if (!alias) continue;
        const existing = aliases.get(alias);
        if (!existing || masterworkVisualPriority(plug.name) > masterworkVisualPriority(existing.name)) {
          aliases.set(alias, plug);
        }
      }
      for (const [alias, plug] of aliases) {
        // 别名是该栏位的另一种官方写法：用户省掉前缀时必须仍然解析得到。
        // 已经有同名完整写法时不覆盖——完整写法在投影里保留更贴近官方的名字。
        const key = normalizeName(alias);
        if (!key || bucket.has(key)) continue;
        bucket.set(key, [{ hash: plug.hash, name: alias, description: plug.description, icon: plug.icon }]);
      }
    }
  }
  return index;
}

function masterworkVisualPriority(value: string): number {
  if (/^\s*大师杰作\s*[：:]/u.test(value)) return 100;
  const level = Number(value.match(/^\s*(\d+)\s*阶\s*[：:]/u)?.[1] ?? 0);
  return Number.isFinite(level) ? level : 0;
}

function toRollPlugSummary(plug: ItemPlugSummary): AccountWeaponRollPlugSummary {
  return {
    hash: plug.hash,
    name: plug.name,
    ...(plug.category_identifier ? { category_identifier: plug.category_identifier } : {}),
    ...(plug.item_type ? { item_type: plug.item_type } : {})
  };
}

function addPerkName(
  bucket: Map<string, PerkRef[]>,
  name: string,
  plug: ItemPlugSummary,
  englishName?: string
): void {
  const key = normalizeName(name);
  if (!key) return;
  const existing = bucket.get(key) ?? [];
  if (!existing.some((entry) => entry.hash === plug.hash)) {
    existing.push({
      hash: plug.hash,
      name: plug.name,
      ...(englishName ? { englishName } : {}),
      description: plug.description,
      icon: plug.icon
    });
  }
  bucket.set(key, existing);
}

/** 名称 → 该栏位下可用的 Perk。解析不出就是空数组——不猜，也不跨栏位兜底。 */
function resolveSlotPerkNames(names: readonly string[], bucket: Map<string, PerkRef[]>): PerkRef[] {
  const resolved = names.flatMap((name) => {
    const key = normalizeName(name);
    return key ? bucket.get(key) ?? [] : [];
  });
  return [...new Map(resolved.map((perk) => [perk.hash, perk])).values()];
}

/**
 * 「这一栏没有要求」的完整写法表。**导入期与读取期共用这一张**。
 *
 * 从前两处各有一份、口径且相反：读取期认 `任意 / 不限 / 不限制 / any`，导入期只认
 * `任意 / 无 / none / n/a / -`。于是写「不限制」的行在导入期被当成一个真实的官方名去核对、
 * 判为阻塞，而读取期又会静默过滤掉它——「不限制」是玩家模板里的常用写法，等于**直接拒导**。
 *
 * 归一化用 `normalizeName`（NFKC + 去标点空白），所以 `N/A`、`Ｎ／Ａ`、`n / a` 都认。
 */
const unspecifiedRequirementNames = new Set(
  ["任意", "不限", "不限制", "无", "any", "none", "n/a"].map(normalizeName)
);

function isUnspecifiedRequirementName(value: string): boolean {
  const normalized = normalizeName(value);
  // 纯标点（`-`、`—`、`/`）会被 normalizeName 抹成空串；那同样是一种「没写要求」。
  return !normalized || unspecifiedRequirementNames.has(normalized);
}

const strictRequirementFields = [
  ["枪管", "barrel"],
  ["弹匣", "magazine"],
  ["大师", "masterwork"],
  ["Perk 1", "perk1"],
  ["Perk 2", "perk2"],
  ["起源特性", "origin"]
] as const;

function validateWeaponRecommendationRows(
  rows: Array<Record<string, string>>,
  definitions: WeaponKnowledgeSemanticDefinitions
): WeaponKnowledgeImportIssue[] {
  const issues: WeaponKnowledgeImportIssue[] = [];
  const allDefinitions = {
    ...definitions.item_definitions,
    ...definitions.plug_definitions
  };

  const seenKeys = new Set<string>();
  rows.forEach((row, index) => {
    const rowNumber = csvRowNumber(row, index + 2);
    const weaponName = row["武器"]?.trim() ?? "";
    const sourceLabel = row["推荐来源"]?.trim() ?? "";
    const playerFormat = isEditableTemplateRow(row);
    const expectedColumnCount = Number(row.__expected_column_count ?? 0);
    if (expectedColumnCount > 0 && Number(row.__column_count ?? expectedColumnCount) !== expectedColumnCount) {
      issues.push({
        row_number: rowNumber,
        weapon_name: weaponName,
        source_label: sourceLabel,
        field: "武器",
        value: weaponName,
        message: `该行有 ${row.__column_count ?? "未知"} 列，与这份文件表头的 ${expectedColumnCount} 列不一致。`
      });
      return;
    }
    if (!weaponName || !sourceLabel) {
      const sourceField = row.__format === "template" ? "规则名称" : "推荐来源";
      issues.push({
        row_number: rowNumber,
        weapon_name: weaponName,
        source_label: sourceLabel,
        field: !weaponName ? "武器" : sourceField,
        value: !weaponName ? weaponName : sourceLabel,
        message: !weaponName ? "缺少武器名称。" : `缺少${sourceField}。`
      });
      return;
    }
    const uniqueKey = `${weaponIdentityKey(row)}\u0000${normalizeName(sourceLabel)}`;
    if (seenKeys.has(uniqueKey)) {
      issues.push({
        row_number: rowNumber,
        weapon_name: weaponName,
        source_label: sourceLabel,
        field: "武器",
        value: weaponName,
        message: "该武器身份与来源在文件前文已经存在。"
      });
      return;
    }
    seenKeys.add(uniqueKey);
    const sourceKey = sourceKeyFromLabel(sourceLabel);
    if (!sourceKey) {
      issues.push({
        row_number: rowNumber,
        weapon_name: weaponName,
        source_label: sourceLabel,
        field: row.__format === "template" ? "规则名称" : "推荐来源",
        value: sourceLabel,
        message: "推荐来源不能为空；来源名可以是任意自定义名称。"
      });
      return;
    }
    if (row.__format === "template") {
      for (const field of ["Perk 1", "Perk 2"] as const) {
        if (requirementValues(row[field] ?? "").length > 0) continue;
        issues.push({
          row_number: rowNumber,
          weapon_name: weaponName,
          source_label: sourceLabel,
          field,
          value: "",
          message: `${field} 是统一推荐模板的必填核心栏位。`
        });
      }
      if (issues.some((issue) => issue.row_number === rowNumber)) return;
    }
    const rawItemHashValues = splitValues(row["武器ID"] ?? "");
    const parsedItemHashes = rawItemHashValues.map(Number);
    const invalidItemHashes = parsedItemHashes.filter((hash) => !isUnsignedHash(hash));
    const itemHashes = parsedItemHashes.filter(isUnsignedHash);
    if (invalidItemHashes.length) {
      issues.push({
        row_number: rowNumber,
        weapon_name: weaponName,
        source_label: sourceLabel,
        field: "武器ID",
        value: rawItemHashValues.join(" / "),
        message: "武器 ID 必须是 0 到 4294967295 的整数。"
      });
      return;
    }
    const itemDefinitions = itemHashes.length
      ? itemHashes
        .filter((hash) => definitions.item_definitions[String(hash)])
        .map((hash) => definitions.item_definitions[String(hash)])
        .filter((definition): definition is DefinitionRecord => Boolean(definition))
      : Object.values(definitions.item_definitions).filter((definition) => (
        normalizeName(definition.displayProperties?.name ?? "") === normalizeName(weaponName)
      ));
    const missingHashes = itemHashes.filter((hash) => !definitions.item_definitions[String(hash)]);
    if ((!itemHashes.length && itemDefinitions.length === 0) || missingHashes.length) {
      issues.push({
        row_number: rowNumber,
        weapon_name: weaponName,
        source_label: sourceLabel,
        field: "武器ID",
        value: missingHashes.length ? missingHashes.join(" / ") : row["武器ID"] ?? "",
        message: missingHashes.length
          ? "武器 ID 不在当前官方资料库中。"
          : "无法根据官方中文名称找到可核对的武器；请补充武器 ID。"
      });
      return;
    }

    const mismatchedWeaponNames = itemDefinitions
      .map((definition) => definition.displayProperties?.name?.trim() ?? "")
      .filter((officialName) => normalizeName(officialName) !== normalizeName(weaponName));
    if (mismatchedWeaponNames.length) {
      issues.push({
        row_number: rowNumber,
        weapon_name: weaponName,
        source_label: sourceLabel,
        field: "武器",
        value: weaponName,
        message: `武器名称与所填武器 ID 的官方名称不一致：${[...new Set(mismatchedWeaponNames)].join(" / ") || "官方名称为空"}。`
      });
      return;
    }

    // 校验用的键集与运行期投影的解析器同源：投影解析不出的名字在这里就会被拦下。
    const officialNames = buildSlotPerkIndex(itemDefinitions, {
      allDefinitions,
      plugSetDefinitions: definitions.plug_set_definitions
    });
    for (const [field, slot] of strictRequirementFields) {
      for (const value of requirementValues(row[field] ?? "")) {
        const key = normalizeName(value);
        if (officialNames[slot].has(key)) continue;
        const otherSlot = strictRequirementFields.find(([, candidateSlot]) => (
          candidateSlot !== slot && officialNames[candidateSlot].has(key)
        ));
        issues.push({
          row_number: rowNumber,
          weapon_name: weaponName,
          source_label: sourceLabel,
          field,
          value,
          message: otherSlot
            ? `该官方名称属于“${otherSlot[0]}”，不属于当前栏位。`
            : "无法在这把武器任一已列版本的对应官方栏位中精确确认。"
        });
      }
    }
  });
  return issues;
}

function officialMasterworkName(value: string): string {
  return value
    .replace(/^\s*\d+\s*阶\s*[：:]\s*/u, "")
    .replace(/^\s*大师杰作\s*[：:]\s*/u, "")
    .trim();
}

// 「无要求」判定表与读取期同源（`isUnspecifiedRequirementName`）：两侧各有一份的
// 后果是写「不限制」的行被导入期拒绝、却被读取期静默过滤。
function requirementValues(value: string): string[] {
  return splitValues(value).filter((candidate) => !isUnspecifiedRequirementName(candidate));
}

function uniqueHashes(values: Array<number | undefined>): number[] {
  return [...new Set(values.filter((value): value is number => isUnsignedHash(Number(value))).map(Number))];
}

function parseKnowledgeCsv(text: string): Array<Record<string, string>> {
  const records = parseCsvRecords(text.replace(/^\uFEFF/, ""));
  const headers = records.shift()?.map((value) => value.trim()) ?? [];
  const layout = recommendationTableLayouts.find((candidate) => (
    candidate.headers.length === headers.length
    && candidate.headers.every((header, index) => headers[index] === header)
  ));
  if (!layout) {
    throw new Error(unsupportedTableHeaderMessage(headers));
  }
  const rows = records
    .map((record, index) => ({ record, rowNumber: index + 2 }))
    .filter(({ record }) => record.some((value) => value.trim()))
    .map(({ record, rowNumber }) => ({
      ...(layout.format === "full"
        ? Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""]))
        : layout.format === "player"
          ? playerRowToKnowledgeRow(Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])) as Record<string, string>)
          : unifiedRowToKnowledgeRow(
              Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])) as Record<string, string>,
              layout.english
            )),
      __row_number: String(rowNumber),
      __column_count: String(record.length),
      // 行宽以**这份文件自己的表头**为准：写死列数会让「兼容上一版模板」在下一处继续失效。
      __expected_column_count: String(layout.headers.length),
      __format: layout.format
    }));
  if (rows.length === 0) {
    throw new Error("武器推荐 CSV 没有可导入的数据行。");
  }
  return rows;
}

/**
 * 表头不受支持时把**实际读到的表头**报出来：这句错误曾经只说「不受支持」，
 * 用户对着几种可能的模板无从下手（Bug #89）。
 */
function unsupportedTableHeaderMessage(headers: string[]): string {
  const observed = headers.slice(0, 6).map((header) => header || "(空)").join(" / ");
  const detail = `${observed}${headers.length > 6 ? " …" : ""}（共 ${headers.length} 列）`;
  return `武器推荐表格的表头不受支持：实际读到「${detail}」。`
    + `支持的表头：当前模板（${unifiedChineseCsvHeaders.length} 列）、上一版模板（${previousUnifiedChineseCsvHeaders.length} 列）、`
    + `旧版玩家模板（${playerCsvHeaders.length} 列）、旧版完整数据包（${requiredCsvHeaders.length} 列）。`
    + "请在界面里下载模板后重新填写，或使用上述旧版文件。";
}

function unifiedRowToKnowledgeRow(row: Record<string, string>, english: boolean): Record<string, string> {
  const value = (chinese: string, englishHeader: string): string => row[english ? englishHeader : chinese] ?? "";
  return {
    页面: "",
    分类: "",
    武器: english ? "" : value("武器", "Weapon"),
    评级: value("评级", "Rating"),
    排名: "",
    来源URL: "",
    页面更新时间: "",
    来源位置: "",
    图标: "",
    图标图标URL: "",
    属性: "",
    框架: "",
    赛季: "",
    来源: "",
    勇士: "",
    勇士图标URL: "",
    弹药生成: "",
    枪管: value("枪管/瞄具", "Barrel / Sight"),
    弹匣: value("弹匣", "Magazine"),
    大师: value("大师", "Masterwork"),
    "Perk 1": value("Perk 1", "Perk 1"),
    "Perk 2": value("Perk 2", "Perk 2"),
    起源特性: value("起源特性", "Origin Trait"),
    注解: value("备注", "Note"),
    护盾: "",
    充能效率: "",
    武器ID: "",
    英文名称: english ? value("英文名称", "Weapon") : "",
    版本: "",
    推荐来源: value("推荐来源", "Source") || value("规则名称", "Rule Name"),
    用途: value("用途/分类", "Mode / Category")
  };
}

function isEditableTemplateRow(row: Record<string, string> | undefined): boolean {
  return row?.__format === "player" || row?.__format === "template";
}

function playerRowToKnowledgeRow(row: Record<string, string>): Record<string, string> {
  return {
    页面: "",
    分类: "",
    武器: row["武器"] ?? "",
    评级: row["评级"] ?? "",
    排名: "",
    来源URL: "",
    页面更新时间: "",
    来源位置: "",
    图标: "",
    图标图标URL: "",
    属性: "",
    框架: "",
    赛季: "",
    来源: "",
    勇士: "",
    勇士图标URL: "",
    弹药生成: "",
    枪管: row["第一列"] ?? "",
    弹匣: row["第二列"] ?? "",
    大师: row["大师"] ?? "",
    "Perk 1": row["Perk 1"] ?? "",
    "Perk 2": row["Perk 2"] ?? "",
    起源特性: row["起源特性"] ?? "",
    注解: row["备注"] ?? "",
    护盾: "",
    充能效率: "",
    武器ID: row["武器ID"] ?? "",
    英文名称: row["英文名称"] ?? "",
    版本: "",
    推荐来源: row["推荐来源"] ?? "",
    用途: row["用途"] ?? ""
  };
}

function prepareWeaponRecommendationRows(
  rows: Array<Record<string, string>>,
  definitions?: WeaponKnowledgeSemanticDefinitions
): Array<Record<string, string>> {
  if (!definitions) return rows;
  return rows.map((row) => enrichWeaponRecommendationRow(row, definitions));
}

function enrichWeaponRecommendationRow(
  row: Record<string, string>,
  definitions: WeaponKnowledgeSemanticDefinitions
): Record<string, string> {
  const resolvedItems = resolveOfficialWeaponDefinitions(row, definitions.item_definitions);
  if (!resolvedItems.length) return row;
  const primary = resolvedItems[0].definition;
  const sourceLabel = row["推荐来源"]?.trim() ?? "";
  const resolvedHashes = uniqueHashes(resolvedItems.map((item) => item.hash));
  return {
    ...row,
    武器: row["武器"]?.trim() || primary.displayProperties?.name?.trim() || "",
    武器ID: row["武器ID"]?.trim() || resolvedHashes.join(" / "),
    页面: row["页面"]?.trim() || sourceLabel,
    分类: row["分类"]?.trim() || primary.itemTypeDisplayName?.trim() || "",
    来源URL: row["来源URL"]?.trim() || "",
    来源位置: row["来源位置"]?.trim() || (isEditableTemplateRow(row) ? "统一推荐模板导入" : ""),
    图标图标URL: row["图标图标URL"]?.trim() || primary.displayProperties?.icon?.trim() || "",
    来源: row["来源"]?.trim() || primary.sourceData?.sourceString?.trim() || ""
  };
}

function resolveOfficialWeaponDefinitions(
  row: Record<string, string>,
  definitions: DefinitionComponentData
): Array<{ hash: number; definition: DefinitionRecord }> {
  const requestedHashes = splitValues(row["武器ID"] ?? "")
    .map(Number)
    .filter(isUnsignedHash);
  if (requestedHashes.length) {
    return requestedHashes.flatMap((hash) => {
      const definition = definitions[String(hash)];
      return definition ? [{ hash, definition }] : [];
    });
  }

  const weaponNames = [row["武器"] ?? "", row["英文名称"] ?? ""]
    .map(normalizeName)
    .filter(Boolean);
  if (!weaponNames.length) return [];
  return Object.entries(definitions).flatMap(([key, definition]) => {
    if (!weaponNames.includes(normalizeName(definition.displayProperties?.name ?? ""))) return [];
    const hash = Number(definition.hash ?? key);
    return isUnsignedHash(hash) ? [{ hash, definition }] : [];
  });
}

function curatedKnowledgeRows(rows: Array<Record<string, string>>): Array<Record<string, string>> {
  return rows.filter((row) => {
    const sourceLabel = row["推荐来源"]?.trim() ?? "";
    return Boolean(sourceKeyFromLabel(sourceLabel));
  });
}

function csvRowNumber(row: Record<string, string>, fallback = 2): number {
  const value = Number(row.__row_number);
  return Number.isInteger(value) && value >= 2 ? value : fallback;
}

function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index++;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (character === "," && !quoted) {
      record.push(value);
      value = "";
      continue;
    }
    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index++;
      record.push(value);
      records.push(record);
      record = [];
      value = "";
      continue;
    }
    value += character;
  }
  if (quoted) {
    throw new Error("武器推荐 CSV 存在未闭合的引号字段。");
  }
  if (value || record.length) {
    record.push(value);
    records.push(record);
  }
  return records;
}

function parsePurposes(value: string): Array<"pve" | "pvp" | "general"> {
  const normalized = value.toLocaleLowerCase();
  const purposes: Array<"pve" | "pvp" | "general"> = [];
  if (normalized.includes("pve")) purposes.push("pve");
  if (normalized.includes("pvp")) purposes.push("pvp");
  if (normalized.includes("通用") || normalized.includes("general") || purposes.length === 0) purposes.push("general");
  return purposes;
}

function splitValues(value: string): string[] {
  return [...new Set(value.split(/\s+\/\s+|[；;\n]+/).map((part) => part.trim()).filter(Boolean))];
}

function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{Z}\s]+/gu, "");
}

type RecommendationVariantConstraint = "adept" | "timelost" | "harrowed" | "holofoil" | "exact_only";

const officialWeaponVariantSuffixPattern = /\s*[（(]\s*(adept|专家|timelost|失时|harrowed|痛苦)\s*[）)]\s*$/iu;
const sourceOnlyWeaponVariantSuffixPattern = /\s*[（(]\s*(holofoil|全息箔|brave(?:\s+version)?|勇者版本|猛攻版本|玖的仪式版本)\s*[）)]\s*$/iu;

type WeaponIdentityRelationIndex = {
  byItemHash: Map<number, WeaponIdentityRelation>;
  byReleaseGroup: Map<string, WeaponIdentityRelation[]>;
  /** 归约结果按调用方给的键缓存：读取期用规则 id，导入期用 hash 集。 */
  recommendationReleaseGroups: Map<string, ReadonlySet<string>>;
};

const weaponIdentityRelationIndexes = new WeakMap<
  readonly WeaponIdentityRelation[],
  WeaponIdentityRelationIndex
>();

function indexWeaponIdentityRelations(
  relations: readonly WeaponIdentityRelation[]
): WeaponIdentityRelationIndex {
  const cached = weaponIdentityRelationIndexes.get(relations);
  if (cached) return cached;
  const byItemHash = new Map<number, WeaponIdentityRelation>();
  const byReleaseGroup = new Map<string, WeaponIdentityRelation[]>();
  for (const relation of relations) {
    byItemHash.set(relation.item_hash, relation);
    const group = byReleaseGroup.get(relation.release_group_key) ?? [];
    group.push(relation);
    byReleaseGroup.set(relation.release_group_key, group);
  }
  const index = {
    byItemHash,
    byReleaseGroup,
    recommendationReleaseGroups: new Map<string, ReadonlySet<string>>()
  };
  weaponIdentityRelationIndexes.set(relations, index);
  return index;
}

/**
 * 一把武器的**精确**名称键：中文名与英文名各自 `normalizeName` 之后的结果。
 *
 * 这里刻意**不做**变体后缀归并。名称相等是「只写名字」的规则唯一的补充依据；
 * 用归并后的键当判据会让它多匹配一圈同名变体，那是比原来更宽的口径。旧读取期的
 * family 归并（把「痛苦」这类后缀抹掉再匹配）随读取期匹配一并删除，不再有第二套名字口径。
 */
export type WeaponNameEntry = {
  item_hash: number;
  exact_name_keys: ReadonlySet<string>;
};

export type RecommendationIdentityInput = {
  /** 规则显式列出的武器 hash（「武器ID」列，导入期已校验过）。空 = 这行只写了武器名。 */
  itemHashes: readonly number[];
  /** 规则写下的武器名，保持原始文本——变体后缀是身份的一部分。 */
  weaponName: string;
  englishName?: string;
};

/**
 * S3′：把「这条规则适用于哪些武器」在**导入期**算成一份完整 hash 集。
 *
 * 从前这件事在读取期做（`collectKnowledgeCandidates` + `selectKnowledgeRecommendations`
 * 的三级匹配）。三级匹配的输入全部在导入期就已确定——规则自己的 hash、武器的发布组与变体、
 * 官方名——读取期重新推导属于分层图 ⑤ 的越权，而且与 S2 是同一类分叉：同一份身份在
 * 两侧各算一次。本函数是它的**唯一权威**，写出结果后读取期只做 `itemHashes.includes(hash)`。
 *
 * 逐级对应：
 * - 零级（补基础集）：规则只写了武器名时，先按官方名精确匹配补出全部同名武器——
 *   与导入期 `resolveOfficialWeaponDefinitions` 同一口径，补完之后的路径完全相同；
 * - 一级：基础集里的 hash 本身就是匹配，但受「只保留最新发布组」的归约约束
 *   （老口径：同名历史复刻一起写入时只认最新的那组）；
 * - 二级：归约后发布组里的**其它版本**（普通 / 专家 / 失时…），按规则的变体约束过滤。
 *
 * 读取期的「只写名字」那一级（`candidate.item_hashes.length === 0`）是死代码：导入校验
 * 要求每行都能落到官方武器上（有 hash，或名字能精确命中官方名），所以库里的规则 hash 永不为空。
 * 对拍网（`packages/services/test/recommendationIdentityExpansion.test.ts`）正是按「补完再归约」
 * 的口径逐武器对拍，S3′-2 可以据此安全删掉读取期的三级匹配。
 *
 * `nameEntries` 由调用方从 manifest 构建（导入期正好有它）。零级是唯一必须依赖 manifest 的一级，
 * 这也是「导入期展开」与「导入期校验」必须同处一步的原因。
 */
/**
 * 从官方定义构建「武器 hash → 精确名称键」表，供三级（规则只写了武器名）展开使用。
 *
 * 英文名来自**英文定义**（读取期 `exactNameKeys` 用的就是 `englishItemDefinitions` 里的名字），
 * 不是规则行里的「英文名称」列——两者是不同的东西，混用会让名称判据对不上。
 */
export function buildWeaponNameEntries(
  definitions: DefinitionComponentData,
  englishDefinitions?: DefinitionComponentData
): WeaponNameEntry[] {
  return Object.values(definitions).flatMap((definition) => {
    const itemHash = Number(definition.hash);
    if (!isUnsignedHash(itemHash)) return [];
    const keys = new Set([
      normalizeName(definition.displayProperties?.name ?? ""),
      normalizeName(englishDefinitions?.[String(itemHash)]?.displayProperties?.name ?? "")
    ].filter(Boolean));
    return keys.size ? [{ item_hash: itemHash, exact_name_keys: keys }] : [];
  });
}

export function expandRecommendationItemHashes(
  input: RecommendationIdentityInput,
  identityRelations: readonly WeaponIdentityRelation[],
  nameEntries: readonly WeaponNameEntry[]
): number[] {
  const index = indexWeaponIdentityRelations(identityRelations);
  const constraint = recommendationVariantConstraint(input);
  // 只写了武器名的规则先按官方名补出基础 hash 集，之后走**完全相同**的一级 / 二级。
  // 这一点是 S3′-0 对拍网逼出来的：导入期 `enrichWeaponRecommendationRow` 也是先把名字补成
  // 「同名武器全体的 hash」，再由读取期做发布组归约——补完就不该再有第二套口径，否则
  // 只写名字的规则会漏掉同发布组的其它版本。
  const base = resolveDeclaredItemHashes(input, nameEntries);
  if (!base.length) return [];
  const groups = releaseGroupKeysForItemHashes(base, index, `hashes:${base.join("|")}`);
  if (!groups.size) return base;
  const expanded = new Set<number>();
  for (const itemHash of base) {
    // 一级不带变体过滤：规则点名了这个 hash 就是匹配。只受发布组归约约束：
    // 归约把「同名历史复刻」收窄到最新发布组，被收窄掉的 hash 从此不再匹配。
    const relation = index.byItemHash.get(itemHash);
    if (!relation || groups.has(relation.release_group_key)) expanded.add(itemHash);
  }
  for (const [releaseGroupKey, relations] of index.byReleaseGroup) {
    if (!groups.has(releaseGroupKey)) continue;
    for (const relation of relations) {
      // 二级按**目标**的变体标签过滤：规则的约束说的是「我只适用于专家的那种」。
      if (appliesToVariant(constraint, new Set(relation.variant_tags))) expanded.add(relation.item_hash);
    }
  }
  return [...expanded];
}

/**
 * 规则声明的身份 → 基础 hash 集。
 *
 * 显式列出的「武器ID」优先；只写了武器名时按**精确**官方名匹配补出全部同名武器
 * （见 `WeaponNameEntry` 的说明）。与导入期 `resolveOfficialWeaponDefinitions` 同一口径：
 * 名称相等是唯一的补充依据，不做家族后缀归并。
 */
function resolveDeclaredItemHashes(
  input: RecommendationIdentityInput,
  nameEntries: readonly WeaponNameEntry[]
): number[] {
  const declared = uniqueHashes([...input.itemHashes]);
  if (declared.length) return declared;
  const ruleKeys = [
    normalizeName(input.weaponName),
    normalizeName(input.englishName ?? "")
  ].filter(Boolean);
  if (!ruleKeys.length) return [];
  return uniqueHashes(nameEntries.flatMap((entry) => (
    ruleKeys.some((key) => entry.exact_name_keys.has(key)) ? [entry.item_hash] : []
  )));
}

function releaseGroupKeysForItemHashes(
  itemHashes: readonly number[],
  index: WeaponIdentityRelationIndex,
  cacheKey: string
): ReadonlySet<string> {
  const cached = index.recommendationReleaseGroups.get(cacheKey);
  if (cached) return cached;
  const groups = new Map<string, WeaponIdentityRelation[]>();
  for (const itemHash of itemHashes) {
    const relation = index.byItemHash.get(itemHash);
    if (!relation) continue;
    const group = groups.get(relation.release_group_key) ?? [];
    group.push(relation);
    groups.set(relation.release_group_key, group);
  }
  if (groups.size <= 1) {
    const resolved = new Set(groups.keys());
    index.recommendationReleaseGroups.set(cacheKey, resolved);
    return resolved;
  }

  // 旧版按名称补 ID 时可能把所有同名历史复刻一起写入。这里不把这些 Hash
  // 当成多条精确规则，而是只保留官方 releases.* 能证明的最新发布组。
  const ranked = [...groups.entries()].map(([releaseGroupKey, relations]) => ({
    releaseGroupKey,
    rank: Math.max(...relations.map(releaseGroupRank))
  }));
  const highestRank = Math.max(...ranked.map((entry) => entry.rank));
  if (!Number.isFinite(highestRank)) {
    const unresolved = new Set<string>();
    index.recommendationReleaseGroups.set(cacheKey, unresolved);
    return unresolved;
  }
  const highestGroups = ranked.filter((entry) => entry.rank === highestRank);
  const resolved = highestGroups.length === 1
    ? new Set([highestGroups[0].releaseGroupKey])
    : new Set<string>();
  index.recommendationReleaseGroups.set(cacheKey, resolved);
  return resolved;
}

/** 规则的变体约束：null = 不限版本；`exact_only` = 只认同版本的精确 hash。 */
function appliesToVariant(
  constraint: RecommendationVariantConstraint | null,
  targetVariantTags: ReadonlySet<string>,
  allowExactOnly = false
): boolean {
  if (!constraint) return true;
  if (constraint === "exact_only") return allowExactOnly;
  return targetVariantTags.has(constraint);
}

function releaseGroupRank(relation: WeaponIdentityRelation): number {
  const matches = [...(relation.release_label ?? "").matchAll(/(?:^|\W)releases\.v(\d+)\./giu)];
  return matches.length
    ? Math.max(...matches.map((match) => Number(match[1])))
    : Number.NEGATIVE_INFINITY;
}

function recommendationVariantConstraint(
  recommendation: RecommendationIdentityInput
): RecommendationVariantConstraint | null {
  for (const value of [recommendation.englishName ?? "", recommendation.weaponName]) {
    const official = value.match(officialWeaponVariantSuffixPattern)?.[1]?.toLocaleLowerCase() ?? "";
    if (official === "timelost" || official === "失时") return "timelost";
    if (official === "harrowed" || official === "痛苦") return "harrowed";
    if (official === "adept" || official === "专家") return "adept";
    const sourceOnly = value.match(sourceOnlyWeaponVariantSuffixPattern)?.[1]?.toLocaleLowerCase() ?? "";
    if (sourceOnly === "holofoil" || sourceOnly === "全息箔") return "holofoil";
    if (sourceOnly) return "exact_only";
  }
  return null;
}

function weaponIdentityKey(row: Record<string, string>): string {
  const englishName = normalizeName(row["英文名称"] ?? "");
  if (englishName) return `en:${englishName}`;
  const itemHashes = splitValues(row["武器ID"] ?? "")
    .map(Number)
    .filter(isUnsignedHash)
    .sort((left, right) => left - right);
  if (itemHashes.length) return `hash:${itemHashes.join("|")}`;
  return `zh:${normalizeName(row["武器"] ?? "")}`;
}

function curatedRuleStableId(sourceKey: string, row: Record<string, string>): string {
  return createHash("sha256").update(JSON.stringify({
    source_key: sourceKey,
    weapon_identity: weaponIdentityKey(row),
    purposes: [...parsePurposes(row["用途"] ?? "")].sort(),
    requirements: Object.fromEntries(strictRequirementFields.map(([field, slot]) => [
      slot,
      requirementValues(row[field] ?? "").map(normalizeName).sort()
    ]))
  })).digest("hex");
}

function isUnsignedHash(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

function csvFingerprint(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
