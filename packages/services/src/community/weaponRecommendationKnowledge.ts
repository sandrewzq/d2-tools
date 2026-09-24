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
import { normalizeLookupText } from "../gameData/lookupText.js";
import { recommendationDatabasePath } from "./recommendationDatabase.js";
import {
  escapeDelimitedValue,
  readRecommendationTableText
} from "./recommendationTableFile.js";
import {
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
  RecommendationStoredRequirement,
  RecommendationStoredRule
} from "./recommendationRuleStore.js";

const requiredCsvHeaders = [
  "页面", "分类", "武器", "评级", "排名", "来源URL", "页面更新时间", "来源位置",
  "图标", "图标图标URL", "属性", "框架", "赛季", "来源", "勇士", "勇士图标URL",
  "弹药生成", "枪管", "弹匣", "大师", "Perk 1", "Perk 2", "起源特性", "注解",
  "护盾", "充能效率", "武器ID", "英文名称", "弹药类型", "版本", "推荐来源", "用途"
] as const;
const playerCsvHeaders = [
  "武器", "武器ID", "英文名称", "弹药类型", "推荐来源", "用途", "第一列", "第二列",
  "Perk 1", "Perk 2", "大师", "起源特性", "评级", "备注"
] as const;
// 模板第一列固定为「推荐来源」：来源名允许玩家自定义，导入导出都以这一列为准。
// 「武器ID」「英文名称」「弹药类型」三列都是**消歧列**，都非必填：名字唯一时全部留空，只有
// 中文名撞译（隐士）、同名只差槽位（真实预言）或同名只差弹药槽（极高反射）时才填。三条判据的
// 优先次序就是列序——写了「武器ID」的行按它定版本，不再看名字，其余行靠英文名或弹药类型分开。
//
// 这几行表头**自带填写说明**：下载模板的人看得到的就是这一行字，说明不写在这里就没有地方写。
// 括号里的说明不是列名，导入时由 `canonicalHeader` 去掉；「用途分类」「枪管瞄具」两个列名也去掉
// 了斜杠——多值分隔符就是 `/`，列名里再夹一个就分不清哪个斜杠是分隔符。
// 改这几行文字等于改格式契约（`recommendationTableLayouts` 按表头精确匹配），旧表头必须继续认。
const unifiedChineseCsvHeaders = [
  "推荐来源（必填，自定义来源名）",
  "武器（必填，官方中文名）",
  "武器ID（同名武器必填）",
  "英文名称（同名武器必填）",
  "弹药类型（同名武器必填）",
  "规则名称（可留空）",
  "用途分类（pve/pvp/通用；多个值用「/」分隔）",
  "枪管瞄具（多个值用「/」分隔）",
  "弹匣（多个值用「/」分隔）",
  "大师（多个值用「/」分隔）",
  "Perk 1（必填，多个值用「/」分隔）",
  "Perk 2（必填，多个值用「/」分隔）",
  "起源特性（多个值用「/」分隔）",
  "评级（如 S、A、B）",
  "备注（自由填写）"
] as const;
const unifiedEnglishCsvHeaders = [
  "Source (required, your own name for this source)",
  "Weapon (required, official English name)",
  "Weapon ID (required when the name is shared)",
  "Ammo Type (required when the name is shared)",
  "Rule Name (optional)",
  "Mode or Category (pve/pvp/general; separate multiple values with a slash)",
  "Barrel or Sight (separate multiple values with a slash)",
  "Magazine (separate multiple values with a slash)",
  "Masterwork (separate multiple values with a slash)",
  "Perk 1 (required, separate multiple values with a slash)",
  "Perk 2 (required, separate multiple values with a slash)",
  "Origin Trait (separate multiple values with a slash)",
  "Rating (e.g. S, A, B)",
  "Note (free text)"
] as const;
// 加「武器ID」列之前的那一版带说明表头（同一天里导出的 14 / 13 列）。表头是精确匹配的格式契约，
// 加列就是另一套表头——这一版照上面的口径留着，从它导出的文件继续能导回来。
const previousAnnotatedUnifiedChineseCsvHeaders = [
  "推荐来源（必填，自定义来源名）",
  "武器（必填，官方中文名）",
  "英文名称（同名武器必填）",
  "弹药类型（同名武器必填）",
  "规则名称（可留空）",
  "用途分类（pve/pvp/通用；多个值用「/」分隔）",
  "枪管瞄具（多个值用「/」分隔）",
  "弹匣（多个值用「/」分隔）",
  "大师（多个值用「/」分隔）",
  "Perk 1（必填，多个值用「/」分隔）",
  "Perk 2（必填，多个值用「/」分隔）",
  "起源特性（多个值用「/」分隔）",
  "评级（如 S、A、B）",
  "备注（自由填写）"
] as const;
const previousAnnotatedUnifiedEnglishCsvHeaders = [
  "Source (required, your own name for this source)",
  "Weapon (required, official English name)",
  "Ammo Type (required when the name is shared)",
  "Rule Name (optional)",
  "Mode or Category (pve/pvp/general; separate multiple values with a slash)",
  "Barrel or Sight (separate multiple values with a slash)",
  "Magazine (separate multiple values with a slash)",
  "Masterwork (separate multiple values with a slash)",
  "Perk 1 (required, separate multiple values with a slash)",
  "Perk 2 (required, separate multiple values with a slash)",
  "Origin Trait (separate multiple values with a slash)",
  "Rating (e.g. S, A, B)",
  "Note (free text)"
] as const;
// 表头不带说明的那一版（v0.0.26 及更早导出的统一模板）。说明文字与列名一样是表头的一部分，
// 加了说明就是另一套表头：旧的那套必须继续认，否则用户手上的文件会直接变成「表头不受支持」。
const unannotatedUnifiedChineseCsvHeaders = [
  "推荐来源", "武器", "英文名称", "弹药类型", "规则名称", "用途/分类", "枪管/瞄具", "弹匣", "大师",
  "Perk 1", "Perk 2", "起源特性", "评级", "备注"
] as const;
const unannotatedUnifiedEnglishCsvHeaders = [
  "Source", "Weapon", "Ammo Type", "Rule Name", "Mode / Category", "Barrel / Sight", "Magazine", "Masterwork",
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
// 加消歧列之前的那一版表头。上面几条按同一口径留着：加列不能把用户手上的旧文件变成
// 「表头不受支持」，那一档的代价是整份文件一行都导不进来（Bug #89 的反面）。
const supersededFullCsvHeaders = [
  "页面", "分类", "武器", "评级", "排名", "来源URL", "页面更新时间", "来源位置",
  "图标", "图标图标URL", "属性", "框架", "赛季", "来源", "勇士", "勇士图标URL",
  "弹药生成", "枪管", "弹匣", "大师", "Perk 1", "Perk 2", "起源特性", "注解",
  "护盾", "充能效率", "武器ID", "英文名称", "版本", "推荐来源", "用途"
] as const;
const supersededPlayerCsvHeaders = [
  "武器", "武器ID", "英文名称", "推荐来源", "用途", "第一列", "第二列",
  "Perk 1", "Perk 2", "大师", "起源特性", "评级", "备注"
] as const;
const supersededUnifiedChineseCsvHeaders = [
  "推荐来源", "武器", "规则名称", "用途/分类", "枪管/瞄具", "弹匣", "大师",
  "Perk 1", "Perk 2", "起源特性", "评级", "备注"
] as const;
const supersededUnifiedEnglishCsvHeaders = [
  "Source", "Weapon", "Rule Name", "Mode / Category", "Barrel / Sight", "Magazine", "Masterwork",
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
  { format: "template", english: false, headers: previousAnnotatedUnifiedChineseCsvHeaders },
  { format: "template", english: true, headers: previousAnnotatedUnifiedEnglishCsvHeaders },
  { format: "template", english: false, headers: unannotatedUnifiedChineseCsvHeaders },
  { format: "template", english: true, headers: unannotatedUnifiedEnglishCsvHeaders },
  { format: "template", english: false, headers: previousUnifiedChineseCsvHeaders },
  { format: "template", english: true, headers: previousUnifiedEnglishCsvHeaders },
  { format: "full", english: false, headers: supersededFullCsvHeaders },
  { format: "player", english: false, headers: supersededPlayerCsvHeaders },
  { format: "template", english: false, headers: supersededUnifiedChineseCsvHeaders },
  { format: "template", english: true, headers: supersededUnifiedEnglishCsvHeaders }
];

/**
 * 带说明的表头 → 行对象用的列名：去掉表头末尾的填写说明，再还原改过名的那两列。
 *
 * 说明是给下载模板的人看的，不是数据；按列名取值的下游（`unifiedRowToKnowledgeRow`、
 * 每一处 `row["…"]`）读到的必须还是原来那套列名，否则一处改名就要改遍全文件。
 * 别名表只有这一份，加列、改名都在这里对齐。
 */
const templateHeaderAliases: Record<string, string> = {
  "用途分类": "用途/分类",
  "枪管瞄具": "枪管/瞄具",
  "Mode or Category": "Mode / Category",
  "Barrel or Sight": "Barrel / Sight"
};

function canonicalHeader(header: string): string {
  const withoutHint = header.trim().replace(/[（(][^（()）]*[）)]\s*$/u, "").trim();
  return templateHeaderAliases[withoutHint] ?? withoutHint;
}

/**
 * 模板自带的示例行的身份：第一列（推荐来源 / Source）写着这个标记。
 *
 * 按标记认，不按行号认——玩家会把示例行删掉、往上往下挪，按行号认会认错行。
 * 标记带一句「导入时自动跳过」，是因为这一行本来就是教格式用的，不该变成一条真规则。
 */
const templateExampleRowLabels = ["示例行（导入时自动跳过）", "Example row (skipped on import)"];

/**
 * 示例行每一格的内容，按**列名**给（中文模板一套、英文模板一套，两张表的 `Perk 1` 同名）。
 *
 * 按列名而不是按下标：列顺序换了，示例行跟着自己的列走，不会整行错位到别的列下面。
 * 值都用**官方名**，中文那份整行能过导入校验：玩家把第一格改成自己的来源名、其余照抄，得到的是
 * 一个能导入的格式样板，不是一串报错。英文那份的栏位名暂时过不了校验，见 Bug #109——栏位名是拿
 * 资料库**当前语言**的定义核对的，中文资料库配上英文栏位名就一个也对不上。
 */
const chineseTemplateExampleValues: Record<string, string> = {
  推荐来源: templateExampleRowLabels[0],
  武器: "隐士",
  // 「武器ID」留空：这一行的英文名已经够定位（示例照的是最常见的情形），它留给「同名的枪」那一档
  // ——填了它就不再看名字。「弹药类型」填一个术语表里的值，是因为这一列只在这张模板里有。
  武器ID: "",
  英文名称: "The Recluse",
  弹药类型: "主弹药",
  规则名称: "",
  用途分类: "pve",
  "枪管/瞄具": "膛线枪管/加长枪管",
  弹匣: "精确弹药/战术弹匣",
  大师: "射程/填装速度",
  "Perk 1": "喂食狂热/冲击支撑",
  "Perk 2": "武器大师/目标锁定",
  起源特性: "不屈不挠",
  评级: "S",
  备注: "整行都是示例：导入时自动跳过。照这个格式把下面几行改成你自己的推荐。"
};
const englishTemplateExampleValues: Record<string, string> = {
  Source: templateExampleRowLabels[1],
  Weapon: "The Recluse",
  "Weapon ID": "",
  "Ammo Type": "Primary",
  "Rule Name": "",
  "Mode / Category": "pve",
  "Barrel / Sight": "Rifled Barrel/Extended Barrel",
  Magazine: "Accurized Rounds/Tactical Mag",
  Masterwork: "Range/Reload Speed",
  "Perk 1": "Feeding Frenzy/Frenzy",
  "Perk 2": "No Distractions/Pugilist",
  "Origin Trait": "One Quiet Moment",
  Rating: "S",
  Note: "This whole row is an example, skipped on import. Replace the rows below with your own recommendations."
};

function templateExampleRow(
  headers: readonly string[],
  values: Record<string, string>
): string {
  // 取不到的格留空：示例行本来就是跳过不导入的，漏一格不值得把导出整个失败掉。
  return headers.map((header) => escapeDelimitedValue(values[canonicalHeader(header)] ?? "")).join(",");
}

function isTemplateExampleRow(row: Record<string, string>): boolean {
  return [row["推荐来源"], row["规则名称"]].some((value) => (
    templateExampleRowLabels.includes((value ?? "").trim())
  ));
}

// 来源 key 由来源名派生，不做字典表：玩家自定义的来源名无法穷举。
// 要去掉的三个后缀来自历史来源名的写法；去掉后派生结果与历史 key 一致，无需迁移。
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
  field:
    | "推荐来源" | "规则名称" | "武器ID" | "武器" | "英文名称" | "弹药类型"
    | "枪管" | "弹匣" | "大师" | "Perk 1" | "Perk 2" | "起源特性";
  value: string;
  message: string;
};

export type WeaponKnowledgeSemanticDefinitions = {
  item_definitions: DefinitionComponentData;
  plug_set_definitions: DefinitionComponentData;
  plug_definitions: DefinitionComponentData;
  /**
   * 英文名定义池：`{ hash: { hash, displayProperties: { name } } }`，只装名字，来源是英文搜索索引
   * （`search-en.sqlite`，按文件名问「这个名字对应哪些官方装备」）。
   *
   * 资料库不以英文存整份物品定义，所以这里装的不是英文清单，而是**这一份文件里出现过的英文名**
   * 对应的那些 hash。两张用途都只读名字：③ 的「有英文名就按英文名匹配」与「中文名撞译时要求补英文名」。
   * 取不到时留空——英文判据整体不启用，行里写的英文名不生效，中文名的歧义也不会被拦下。
   */
  english_item_definitions?: DefinitionComponentData;
};

export type WeaponKnowledgeValidationContext = {
  manifest_version: string;
  semantic_definitions: WeaponKnowledgeSemanticDefinitions;
  /**
   * 武器身份关系（S3′）：导入期靠它把「这行写了哪些武器」展开成完整 hash 集。
   *
   * 调用方从资料库取（`getWeaponIdentityRelations`，返回的是**整个武器家族**——同名同类型同槽的
   * 全部版本，不是只有点名的那几个 hash）。取不到时传空数组即可——展开会退化成
   * 「原样使用声明的 hash」，不会比从前更差。
   */
  weaponIdentityRelations?: WeaponIdentityRelation[];
};

export type WeaponKnowledgeImportResult = WeaponRecommendationKnowledgeStatus & {
  file_name: string;
  imported_row_count: number;
  /** 本次导入被严格校验拦下的行数——单次导入的事实，不落库。 */
  skipped_row_count: number;
};

/**
 * 玩家可编辑的推荐表格模板：表头带填写说明，表头下面跟一行示例数据行。
 *
 * 示例行由导入端按第一列的标记认出来跳过（`isTemplateExampleRow`），不会变成一条真推荐；
 * 拿到模板的人照着一行填就行，不用猜「多个 Perk 怎么分开写」。
 */
export function createWeaponRecommendationCsvTemplate(): string {
  return templateCsvText(unifiedChineseCsvHeaders, chineseTemplateExampleValues);
}

/** 英文模板，与中文模板同形：表头带填写说明 + 一行示例数据行。 */
export function createWeaponRecommendationEnglishCsvTemplate(): string {
  return templateCsvText(unifiedEnglishCsvHeaders, englishTemplateExampleValues);
}

function templateCsvText(headers: readonly string[], values: Record<string, string>): string {
  return `\uFEFF${[csvHeaderLine(headers), templateExampleRow(headers, values)].join("\r\n")}\r\n`;
}

/** 表头里的说明带逗号 / 引号，写出去必须按 CSV 转义——与数据行同一套规则。 */
function csvHeaderLine(headers: readonly string[]): string {
  return headers.map(escapeDelimitedValue).join(",");
}

/**
 * Exports the current curated knowledge as a player-editable CSV（统一推荐模板，可直接回导）。
 *
 * DD4：名字不在库里——三级模型存的是 Hash（导入期已把官方名解析成 Hash），所以名字必须由
 * 调用方传入的定义池反解。调用方本来就有装载定义的通道（`loadCommunityDefinitions`），不新开网络路径。
 *
 * 武器名取该规则 hash 集的**最小 hash**：变体受限的规则只有一个 hash（导出它自己的变体名，
 * 回导后仍是它），不受限的规则含整组（导出基础版名，回导后放大回整组）。因此「导出 → 回导」
 * 是一次**幂等收敛**：第一遍可能把只写普通版的规则放大成同组三版本（这正是 S3′ 的口径），
 * 再往后逐字相同。
 */
export function exportWeaponRecommendationPlayerCsv(
  dataDir: string,
  definitions: DefinitionComponentData
): string {
  const rows = loadRecommendationSources(dataDir, "csv").flatMap((instance) => (
    instance.rules.map((rule) => csvExportRow(instance, rule, definitions))
  ));
  return `\uFEFF${[csvHeaderLine(unifiedChineseCsvHeaders), ...rows].join("\r\n")}\r\n`;
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
    // 「武器ID」写规则实际存下的整组 hash：导出侧知道版本，写出来回导就是同一组版本，
    // 撞译（隐士）与同名只差槽位（真实预言）的行不必再人工补消歧列。写死的版本优先于名字，
    // 用户若把「武器」列改成另一把枪，这一列要一并改掉——所以只有导出会带它，模板留空。
    rule.itemHashes.join("/"),
    // 「英文名称」留空：导出侧只有当前语言的定义，没有英文名可填（英文名池只装导入文件里出现过的
    // 那些名字）。真需要这一列的行——中文名撞译的隐士这类——重新导入时会按缺英文名被拦下。
    "",
    // 弹药类型能填就填：`rule.itemHashes` 的第一个版本就是导出用的那个版本，
    // ⑥ 的行（极高反射）回导时不再要求人工补。
    ammoTypeLabel(rule.itemHashes.length ? ammoTypeOf(rule.itemHashes[0], definitions) : undefined),
    instance.label,
    rule.purposes.join("/"),
    requirementNames("barrel").join("/"),
    requirementNames("magazine").join("/"),
    requirementNames("masterwork").join("/"),
    requirementNames("perk1").join("/"),
    requirementNames("perk2").join("/"),
    requirementNames("origin").join("/"),
    rule.rating,
    rule.note
  ].map(escapeDelimitedValue).join(",");
}

function definitionDisplayName(definitions: DefinitionComponentData, hash: number): string {
  return definitions[String(hash)]?.displayProperties?.name?.trim() || String(hash);
}

/**
 * 导入期身份推导的输入：资料库里的武器身份关系 + 由定义构建的名称表。
 *
 * 校验与落库读**同一份**（`expandRecommendationItemHashes`）：从前校验只按行里写的那几个
 * 武器 ID 建要求索引、落库却按展开集建，两份索引就是两条口径——校验期放行的名字在落库时
 * 解析不出候选，反之亦然。身份关系取不到时传空数组，展开退化成「原样使用声明的 hash」。
 */
export type WeaponKnowledgeIdentityContext = {
  relations: readonly WeaponIdentityRelation[];
  nameEntries: readonly WeaponNameEntry[];
};

/** Validates a CSV without changing the active SQLite knowledge database. */
export function previewWeaponRecommendationCsv(
  text: string,
  fileName: string,
  semanticDefinitions?: WeaponKnowledgeSemanticDefinitions,
  identity?: WeaponKnowledgeIdentityContext
): WeaponKnowledgeImportPreview {
  const rows = prepareWeaponRecommendationRows(
    curatedKnowledgeRows(parseKnowledgeCsv(text)),
    semanticDefinitions
  );
  const blockingIssues = semanticDefinitions
    ? validateWeaponRecommendationRows(rows, semanticDefinitions, identity)
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

/**
 * 只写名字、没写「武器ID」的行上的**全部**名字：中文名与英文名都要查。
 *
 * 两种写法指向的 hash 可能不同（③ 的 `隐士`：中文名指向两把，英文名只指向其中一把），
 * 少查一个，本来正确的行就会被判成「资料库中没有这把武器」。
 */
export function collectWeaponRecommendationNamesWithoutItemIds(text: string): string[] {
  return [...new Set(curatedKnowledgeRows(parseKnowledgeCsv(text))
    .filter((row) => !splitValues(row["武器ID"] ?? "").some((value) => isUnsignedHash(Number(value))))
    .flatMap((row) => [row["武器"]?.trim() ?? "", row["英文名称"]?.trim() ?? ""])
    .filter(Boolean))];
}

/**
 * 文件里「英文名称」列写下的名字（英文模板里武器名本身就落在这一列）：英文名池按它们反查 hash。
 *
 * 与 `collectWeaponRecommendationNamesWithoutItemIds` 分开：那一份决定**定义池**要装哪些 hash，
 * 这一份决定**英文名池**要装哪些名字，两份池子的用途不同（见 `WeaponKnowledgeSemanticDefinitions`）。
 * 过滤条件一致——写了「武器ID」的行以声明为准，名字不参与判定，也就不必为它取英文名。
 */
export function collectWeaponRecommendationEnglishNames(text: string): string[] {
  return [...new Set(curatedKnowledgeRows(parseKnowledgeCsv(text))
    .filter((row) => !splitValues(row["武器ID"] ?? "").some((value) => isUnsignedHash(Number(value))))
    .map((row) => row["英文名称"]?.trim() ?? "")
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
  // 指纹只看文件文本，但「有没有可导入的行」要看身份：与预览期（`previewStrictWeaponKnowledgeCsv`）
  // 和落库期（`csvRecommendationInstances`）读同一份上下文。少一份家族关系，本来靠家族展开装得上的行
  // 会在这里被判成 0 条，用户看到的可导入预览反而导不进来。
  const identity = recommendationIdentityExpansion(
    validation.weaponIdentityRelations ?? [],
    validation.semantic_definitions
  );
  const preview = previewWeaponRecommendationCsv(csvText, csvPath, validation.semantic_definitions, identity);
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

/**
 * 「库里现在有什么」——全部由三级模型（`kind='csv'`）派生，不读任何托管文件或元数据键。
 *
 * 只算**参与匹配的那些导入**（存储层已经把旧口径的挡在读取之外）：旧口径的导入一件都匹配不出来，
 * 这里若照旧报「已导入 N 条」，用户看到的就是「说导了六百多条、仓库里一件没有」。
 * 旧口径那份仍然留在管理面，行上标着「按旧口径导入，需要重新导入」。
 */
export function readWeaponRecommendationKnowledgeStatus(
  dataDir: string
): WeaponRecommendationKnowledgeStatus | null {
  if (!existsSync(recommendationDatabasePath(dataDir))) return null;
  const instances = loadRecommendationSources(dataDir, "csv");
  if (!instances.length) return null;
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
    imported_at: instances.reduce((latest, instance) => (
      instance.importedAt > latest ? instance.importedAt : latest
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
  /** 声明版本优先：本份文件里被任何一行写下的版本 hash。 */
  declaredItemHashes: readonly number[];
  /** 逐 hash 池子自检的单版本插件池缓存：同一版本在多行之间只建一次。 */
  versionPools: VersionPerkPoolCache;
};

/** 导入期解析一条规则要的全部输入；校验与落库共用同一份。 */
function curatedRuleContext(input: {
  definitions: WeaponKnowledgeSemanticDefinitions;
  identity: RecommendationIdentityExpansion;
  declaredItemHashes: readonly number[];
}): CuratedRuleContext {
  return {
    definitions: input.definitions,
    identity: input.identity,
    declaredItemHashes: input.declaredItemHashes,
    slotPerkIndexes: new Map(),
    versionPools: new Map()
  };
}

/**
 * 「声明版本优先」的声明集：**作者在「武器ID」列写下的**版本 hash，整份文件的所有行都算
 * （含后面被拦下的行）。
 *
 * 读的是 `enrichWeaponRecommendationRow` 留下的原始值，不是补完之后的 `武器ID`：只写武器名的行
 * 会被补成「同名全部 hash」，那是本层按名称**推导**出来的身份，不是作者写下的版本。拿推导值当声明，
 * 等于让一次粗略的同名匹配压掉另一条规则本该展开过去的精确声明——又变回漏匹配。真要防「同一版本
 * 叠两条」，由逐 hash 池子自检和 ③ 的撞译判定去收；重复推荐比漏匹配轻一级。
 */
function declaredItemHashesOf(rows: ReadonlyArray<Record<string, string>>): number[] {
  return uniqueHashes(rows.flatMap((row) => (
    splitValues(row.__declared_weapon_ids ?? row["武器ID"] ?? "")
      .map(Number)
      .filter(isUnsignedHash)
  )));
}

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
  // 校验与落库读同一份身份上下文：两条链的输入都是「这份文件 + 资料库」，没有第二份口径。
  const identityContext = recommendationIdentityExpansion(
    validation.weaponIdentityRelations ?? [],
    validation.semantic_definitions
  );
  const blocking = new Set(
    validateWeaponRecommendationRows(rows, validation.semantic_definitions, identityContext)
      .map((issue) => issue.row_number)
  );
  const validRows = rows.filter((row) => !blocking.has(csvRowNumber(row)));
  if (!validRows.length) throw new Error("武器推荐 CSV 中没有可导入的有效记录，当前数据未更改。");

  const context = curatedRuleContext({
    identity: identityContext,
    definitions: validation.semantic_definitions,
    // 声明版本优先：文件里被任何一行写下的版本，不由别的行再展开过去（同一版本上叠两条规则
    // 会把「符合 n 套」从 1 抬到 2）。这里取**全部行**、不是过滤后的行：预览期用的是同一份，
    // 两处取不同的集合就会让同一个版本在一处算「已声明」、在另一处算「可展开」。
    declaredItemHashes: declaredItemHashesOf(rows)
  });
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

/**
 * 一条 CSV 行的解析结果：展开到哪些版本、每栏要哪些候选。
 *
 * 校验（`validateWeaponRecommendationRows`）与落库（`curatedRule`）读**这一份**。
 * 从前校验按行里写的武器 ID 建索引、落库按展开集建，两份索引就是两条口径：校验期放行的
 * 名字在落库时解析不出候选，落库才抛。现在两侧是同一个函数，`issues` 非空时校验期报给用户、
 * 落库期只作断言。
 */
type ResolvedRuleRequirements = {
  /** 家族全展开 + 逐 hash 池子自检之后的版本集；为空表示这条规则一版都装不上。 */
  itemHashes: number[];
  requirements: RecommendationStoredRequirement[];
  issues: Array<{ field: WeaponKnowledgeImportIssue["field"]; value: string; message: string }>;
};

function resolveRuleRequirements(
  row: Record<string, string>,
  context: CuratedRuleContext
): ResolvedRuleRequirements {
  const weaponName = row["武器"]?.trim() ?? "";
  const englishName = row["英文名称"]?.trim() ?? "";
  const declaredValue = row["武器ID"] ?? "";
  const issues: ResolvedRuleRequirements["issues"] = [];
  const identityInput: RecommendationIdentityInput = {
    itemHashes: splitValues(declaredValue).map(Number).filter(isUnsignedHash),
    weaponName,
    englishName
  };
  // 名字 → 基础 hash 集。展开期读的是**同一步**（`expandRecommendationItemHashes` 内部就是它），
  // 这里先算出来，是为了在展开之前判 ③ 的撞译与 ⑥ 的弹药类型——两条判据都只看基础集。
  let baseItemHashes = resolveDeclaredItemHashes(identityInput, context.identity.nameEntries);
  const identityIssue = weaponIdentityAmbiguityIssue(row, baseItemHashes, context);
  if (identityIssue) {
    issues.push(identityIssue);
    return { itemHashes: [], requirements: [], issues };
  }
  const ammo = narrowItemHashesByAmmoType(row, baseItemHashes, context.definitions.item_definitions);
  if (ammo.issue) {
    issues.push(ammo.issue);
    return { itemHashes: [], requirements: [], issues };
  }
  baseItemHashes = ammo.itemHashes;
  // S3′：身份在**这里**定死。展开的唯一权威是 `expandRecommendationItemHashes`，读取期只做成员判断。
  const expanded = expandRecommendationItemHashes(
    { ...identityInput, itemHashes: baseItemHashes },
    context.identity.relations,
    context.identity.nameEntries,
    {
      declaredItemHashes: context.declaredItemHashes,
      definitions: context.definitions.item_definitions
    }
  );
  if (!expanded.length) {
    issues.push(weaponNotFoundIssue(row));
    return { itemHashes: [], requirements: [], issues };
  }
  // 要求名 → 候选 hash 同样在**导入期**定死：`buildSlotPerkIndex` 是「栏位 → 官方名 → 可用 Perk」
  // 的唯一权威。索引取**展开集**的定义：某个栏位的写法可能只出现在另一个版本的定义里，
  // 只按声明版本建索引会把本来装得上的名字判成不存在。
  const slotPerkIndex = slotPerkIndexFor(context, expanded);
  const requirements: RecommendationStoredRequirement[] = [];
  for (const [field, slot] of strictRequirementFields) {
    const names = requirementValues(row[field] ?? "").filter((name) => !isUnspecifiedRequirementName(name));
    for (const name of names) {
      const key = normalizeName(name);
      if (!key || slotPerkIndex[slot].has(key)) continue;
      const otherSlot = strictRequirementFields.find(([, candidateSlot]) => (
        candidateSlot !== slot && slotPerkIndex[candidateSlot].has(key)
      ));
      issues.push({
        field,
        value: name,
        message: otherSlot
          ? `该官方名称属于“${otherSlot[0]}”，不属于当前栏位。`
          : "无法在这把武器任一已列版本的对应官方栏位中精确确认。"
      });
    }
    const candidates = resolveSlotPerkNames(names, slotPerkIndex[slot]).map((perk) => perk.hash);
    if (candidates.length) requirements.push({ slot, candidates });
  }
  if (issues.length) return { itemHashes: expanded, requirements, issues };
  // 逐 hash 池子自检：只看「这版有没有规则里写下的东西」，不看栏位、也不要求每一条都有落点
  // （命中任意一条候选即保留）——覆盖口径必须与愿望单文本那条链一致，否则同一份数据的两条来源
  // 会算出两个覆盖集（见 `filterItemHashesByOwnPerkPool`）。一版都不剩说明这条规则跟展开到的
  // 任何版本都毫无交集，那是数据问题，报出来而不是把它静默写成一条永远不匹配的规则。
  //
  // **「大师杰作」不进判定**：它在插件池里是全量枚举（每一版都能到达），在不在判定里都不回答
  // 「这版跟规则有没有关系」，却会让有这一栏的格式（CSV 模板的「大师」列）比没这一栏的格式
  // （DIM 愿望单文本只有枪管 / 弹匣 / Perk 1 / Perk 2 / 起源特性）多盖几个版本：2026-09-25
  // 实测单这一栏就让两条链差 5 个版本（月之狂嚎 `153979396`、玫瑰 `2429822976`、
  // 最后仪式 `542573208`、突进 `2362471600`、高亢 `1824586582`），跳过后两边都是 1600 个、逐条相同。
  // 要求本身照旧落库，读取期照旧展示与参与匹配——这里只决定**覆盖集**。
  const judgedRequirements = requirements.filter((requirement) => requirement.slot !== "masterwork");
  const itemHashes = filterItemHashesByOwnPerkPool({
    itemHashes: expanded,
    requirements: judgedRequirements,
    // 插件池与 `slotPerkIndexFor` 同源：`allDefinitions` 既要能查出武器定义，也要能查出插件定义。
    allDefinitions: {
      ...context.definitions.item_definitions,
      ...context.definitions.plug_definitions
    },
    plugSetDefinitions: context.definitions.plug_set_definitions,
    poolCache: context.versionPools
  });
  if (!itemHashes.length) {
    issues.push({
      field: "武器ID",
      value: declaredValue,
      message: "展开到的版本没有一个能到达这条规则的任何候选（每个版本都与规则里写下的东西无关）。"
    });
  }
  return { itemHashes, requirements, issues };
}

/**
 * ③ 的撞译判定：**没写**「武器ID」时，中文名解析出的基础集横跨两个以上武器家族
 * （`隐士` = The Recluse / The Eremite），必须补「武器ID」才能导入。
 *
 * 家族键里没有弹药类型（`weaponIdentity.ts` 的 `weaponFamilyKey`），所以「同名同族、只有弹药槽
 * 不同」的 ⑥（`极高反射`）不会走到这里，由 `narrowItemHashesByAmmoType` 单独判。
 *
 * 补「英文名称」也能分开同名武器——但那只在几把枪的英文官方名**不同**时成立（`隐士` 可以，
 * `真实预言` 的两代英文名一样，只能靠「武器ID」）。所以这里点名的是**两种情形都解得开**的那一列。
 *
 * 不判的两种情形，都是「没有判据」而不是「判据说没事」：行里写了「武器ID」（声明版本优先，
 * 见 `declaredItemHashesOf`），或这些 hash 在资料库里没有身份关系（没装这套关系）。
 */
function weaponIdentityAmbiguityIssue(
  row: Record<string, string>,
  baseItemHashes: readonly number[],
  context: CuratedRuleContext
): { field: WeaponKnowledgeImportIssue["field"]; value: string; message: string } | undefined {
  if (!baseItemHashes.length || hasDeclaredWeaponIds(row)) return undefined;
  const index = indexWeaponIdentityRelations(context.identity.relations);
  const families = new Set<string>();
  for (const itemHash of baseItemHashes) {
    const relation = index.byItemHash.get(itemHash);
    if (relation) families.add(relation.family_key);
  }
  if (families.size < 2) return undefined;
  return {
    field: "武器ID",
    // 报的是**作者自己写下的**值（空串就是没写）：只写名字的行会被补成「同名全部 hash」，
    // 拿补出来的那串显示，用户会看到「武器ID『1050806815 / …』：必须先补『武器ID』」这种话。
    value: (row.__declared_weapon_ids ?? row["武器ID"] ?? "").trim(),
    message: `中文名称在资料库中对应 ${families.size} 个不同家族${describeBaseItems(baseItemHashes, context.definitions.item_definitions)}，`
      + "必须先补「武器ID」再导入；这几把枪的英文官方名不同时，补「英文名称」也能分开。"
  };
}

/**
 * ⑥：「弹药类型」列的判定与收窄。三种情形都是阻塞项——
 * 写了个术语表外的词、名字横跨两种弹药类型而这一列空着、写的类型一个都对不上。
 *
 * 与 ③ 同一档：只在**没写**「武器ID」时才参与判定（声明版本优先）；弹药类型取不到
 * （资料库缺这把枪的 `equippingBlock`）时放行不判，与「资料库看不见就不判笔误」同一条口径。
 */
function narrowItemHashesByAmmoType(
  row: Record<string, string>,
  baseItemHashes: readonly number[],
  definitions: DefinitionComponentData
): {
  itemHashes: number[];
  issue?: { field: WeaponKnowledgeImportIssue["field"]; value: string; message: string };
} {
  if (!baseItemHashes.length || hasDeclaredWeaponIds(row)) return { itemHashes: [...baseItemHashes] };
  const rawValue = row["弹药类型"] ?? "";
  const parsed = parseAmmoType(rawValue);
  if (parsed.invalid) {
    return {
      itemHashes: [],
      issue: {
        field: "弹药类型",
        value: rawValue.trim(),
        message: "弹药类型只能写「主弹药」「特殊弹药」「重型弹药」（也可写 primary / special / heavy）。"
      }
    };
  }
  const available = ammoTypesOf(baseItemHashes, definitions);
  if (parsed.ammoType === undefined) {
    if (available.size < 2) return { itemHashes: [...baseItemHashes] };
    return {
      itemHashes: [],
      issue: {
        field: "弹药类型",
        value: "",
        message: `这个名称在资料库中对应 ${available.size} 种弹药类型（${formatAmmoTypes(available)}），必须先补「弹药类型」再导入`
          + "（也可以写「武器ID」把版本定死，那一列写下的行不再看名字）。"
      }
    };
  }
  if (available.size > 0 && !baseItemHashes.some((hash) => ammoTypeOf(hash, definitions) === parsed.ammoType)) {
    return {
      itemHashes: [],
      issue: {
        field: "弹药类型",
        value: rawValue.trim(),
        message: `与这个名称在资料库中的弹药类型不一致（资料库中是 ${formatAmmoTypes(available)}）。`
      }
    };
  }
  return {
    itemHashes: baseItemHashes.filter((hash) => {
      const ammoType = ammoTypeOf(hash, definitions);
      // 取不到弹药类型的版本留着不剔：没有判据说它不是。
      return ammoType === undefined || ammoType === parsed.ammoType;
    })
  };
}

/**
 * 行里是不是**作者自己**写下了「武器ID」。推导出来的那串不算：`enrichWeaponRecommendationRow`
 * 补出 `武器ID` 的同时会把原始值留进 `__declared_weapon_ids`，空串表示这行原本没有 ID。
 * 判据与 `declaredItemHashesOf` 取的是同一个表达式。
 */
function hasDeclaredWeaponIds(row: Record<string, string>): boolean {
  return splitValues(row.__declared_weapon_ids ?? row["武器ID"] ?? "")
    .some((value) => isUnsignedHash(Number(value)));
}

/**
 * 「找不到可核对的武器」这个阻塞项的唯一文案。
 *
 * 写了英文名就按英文名报（③：有英文名只认英文名，找不到时让用户去核对它，而不是悄悄退回中文名）。
 * 报错与校验两处共用，避免同一个失败在预览里换一种说法。
 */
function weaponNotFoundIssue(row: Record<string, string>): {
  field: WeaponKnowledgeImportIssue["field"];
  value: string;
  message: string;
} {
  const englishName = row["英文名称"]?.trim() ?? "";
  if (englishName) {
    return {
      field: "英文名称",
      value: englishName,
      message: "无法根据「英文名称」找到可核对的武器；请检查英文名称是否与官方一致，或直接写「武器ID」。"
    };
  }
  return {
    field: "武器ID",
    value: row["武器ID"] ?? "",
    message: "无法根据官方中文名称找到可核对的武器；请补充「英文名称」或武器 ID。"
  };
}

/** 撞译报错时点名两条候选：型号名能把「隐士」这类中英文都同名的两条区分开。 */
function describeBaseItems(
  baseItemHashes: readonly number[],
  definitions: DefinitionComponentData
): string {
  const types = [...new Set(baseItemHashes.flatMap((hash) => {
    const name = definitions[String(hash)]?.itemTypeDisplayName?.trim();
    return name ? [name] : [];
  }))];
  return types.length ? `（${types.join(" / ")}）` : "";
}

function formatAmmoTypes(values: ReadonlySet<number>): string {
  return [...values].sort((left, right) => left - right).map(ammoTypeLabel).join(" / ");
}

function curatedRule(row: Record<string, string>, context: CuratedRuleContext): RecommendationRuleWrite {
  const weaponName = row["武器"].trim();
  const sourceLabel = row["推荐来源"].trim();
  // 能走到这里说明这一行已经过校验，`issues` 不该再有内容：有就说明两条链又分叉了，直接抛。
  const { itemHashes, requirements, issues } = resolveRuleRequirements(row, context);
  if (issues.length) {
    throw new Error(`武器推荐 CSV 的 ${issues[0].field} 无法解析成这把武器的官方栏位：${issues[0].value}（${weaponName} / ${sourceLabel}）。`);
  }
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

type RecommendationIdentityExpansion = WeaponKnowledgeIdentityContext;

/**
 * 导入期的身份展开上下文（S3′）：整批行共用一份名称表，避免每行重建。
 *
 * 名称表读**当前语言**的官方定义，外加英文名池（`english_item_definitions`，只有行里写过英文名
 * 时才有内容）——与导入期自己的 `resolveOfficialWeaponDefinitions` 同一口径：它也是拿行里的
 * 「武器 / 英文名称」去这两份定义里比对。英文定义要额外从资料库取，取不到就只认中文名。
 */
function recommendationIdentityExpansion(
  relations: readonly WeaponIdentityRelation[],
  definitions: WeaponKnowledgeSemanticDefinitions
): WeaponKnowledgeIdentityContext {
  return {
    relations,
    nameEntries: buildWeaponNameEntries(definitions.item_definitions, definitions.english_item_definitions)
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
    /**
     * 可以缺省：缺了就按「池子里没有这一份插件集合」处理，`summarizeItemPerks` 的口径一样。
     * DIM 侧的定义池本来就是可选的（`SourceOptions.plugSetDefinitions`）。
     */
    plugSetDefinitions?: DefinitionComponentData;
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
  definitions: WeaponKnowledgeSemanticDefinitions,
  identity?: WeaponKnowledgeIdentityContext
): WeaponKnowledgeImportIssue[] {
  const issues: WeaponKnowledgeImportIssue[] = [];
  // 整份文件共用一个解析上下文：索引与插件池的缓存都挂在它上面，逐行只做查表。
  // 声明版本优先的「声明」取**文件里所有行**（含后面被拦下的行），落库期用同一份，
  // 否则同一个版本在预览期算「已被声明」、落库期算「可以展开」，两条链又分家。
  const context = curatedRuleContext({
    definitions,
    // 身份关系取不到时只少了家族展开；名称表照建——落库路径的名称表也是现建的，
    // 两侧的「只写了武器名」行为必须一样。
    identity: identity ?? recommendationIdentityExpansion([], definitions),
    declaredItemHashes: declaredItemHashesOf(rows)
  });

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
      const englishName = row["英文名称"]?.trim() ?? "";
      const notFound = weaponNotFoundIssue(row);
      // 中文名与英文名都空才是「缺列」；写了名字却没解析出官方定义，报的应该是写下的那个名字
      // （英文模板整行的武器名落在「英文名称」列，解析不出时 `武器` 就是空的）。
      issues.push({
        row_number: rowNumber,
        weapon_name: weaponName,
        source_label: sourceLabel,
        field: !weaponName ? (englishName ? notFound.field : "武器") : sourceField,
        value: !weaponName ? (englishName ? notFound.value : weaponName) : sourceLabel,
        message: !weaponName ? (englishName ? notFound.message : "缺少武器名称。") : `缺少${sourceField}。`
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
    // 名字 → 官方定义只走这一处：落库期的 `enrichWeaponRecommendationRow` 读的就是它，
    // 校验期自己再扫一遍池子就是第三条口径（③ 的英文名判据也会在这里漏掉）。
    const resolvedItems = resolveOfficialWeaponDefinitions(
      row,
      definitions.item_definitions,
      definitions.english_item_definitions
    );
    const missingHashes = itemHashes.filter((hash) => !definitions.item_definitions[String(hash)]);
    if (!resolvedItems.length || missingHashes.length) {
      const notFound = weaponNotFoundIssue(row);
      issues.push({
        row_number: rowNumber,
        weapon_name: weaponName,
        source_label: sourceLabel,
        field: missingHashes.length ? "武器ID" : notFound.field,
        value: missingHashes.length ? missingHashes.join(" / ") : notFound.value,
        message: missingHashes.length ? "武器 ID 不在当前官方资料库中。" : notFound.message
      });
      return;
    }

    const mismatchedWeaponNames = resolvedItems
      .map((item) => item.definition.displayProperties?.name?.trim() ?? "")
      .filter((officialName) => normalizeName(officialName) !== normalizeName(weaponName));
    if (mismatchedWeaponNames.length) {
      issues.push({
        row_number: rowNumber,
        weapon_name: weaponName,
        source_label: sourceLabel,
        field: "武器",
        value: weaponName,
        message: `武器名称与解析到的官方名称不一致：${[...new Set(mismatchedWeaponNames)].join(" / ") || "官方名称为空"}。`
      });
      return;
    }

    // 要求名与运行期投影读**同一个解析函数**（`resolveRuleRequirements`）：投影解析不出的
    // 名字在这里就会被拦下，装不上的版本也在这里被剔出去——不能等落库期才抛。
    const { issues: requirementIssues } = resolveRuleRequirements(row, context);
    for (const requirementIssue of requirementIssues) {
      issues.push({
        row_number: rowNumber,
        weapon_name: weaponName,
        source_label: sourceLabel,
        field: requirementIssue.field,
        value: requirementIssue.value,
        message: requirementIssue.message
      });
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
  // 行对象的键一律是**去掉填写说明**的列名：说明只给下载模板的人看，不是数据。
  const recordToObject = (record: string[]): Record<string, string> => Object.fromEntries(
    headers.map((header, index) => [canonicalHeader(header), record[index] ?? ""])
  );
  const parsed = records
    .map((record, index) => ({ record, rowNumber: index + 2 }))
    .filter(({ record }) => record.some((value) => value.trim()))
    .map(({ record, rowNumber }) => ({
      ...(layout.format === "full"
        ? recordToObject(record)
        : layout.format === "player"
          ? playerRowToKnowledgeRow(recordToObject(record))
          : unifiedRowToKnowledgeRow(recordToObject(record), layout.english)),
      __row_number: String(rowNumber),
      __column_count: String(record.length),
      // 行宽以**这份文件自己的表头**为准：写死列数会让「兼容上一版模板」在下一处继续失效。
      __expected_column_count: String(layout.headers.length),
      __format: layout.format
    }));
  // 模板自带的示例行在这里丢掉：预览、校验、落库、定义池收集都走 `parseKnowledgeCsv`，
  // 在这一层丢，五条路看到的就是同一份行——少丢一处，示例行就会以一条真规则的身份进库。
  const rows = parsed.filter((row) => !isTemplateExampleRow(row));
  if (rows.length === 0) {
    throw new Error(parsed.length
      ? "这份文件里只有模板自带的示例行：请把示例行改成你自己的推荐，或删掉它另写一行。"
      : "武器推荐 CSV 没有可导入的数据行。");
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
    + `支持的表头：当前模板（${unifiedChineseCsvHeaders.length} / ${unifiedEnglishCsvHeaders.length} 列，表头带填写说明，`
    + `含「武器ID」「英文名称」「弹药类型」消歧列）、加消歧列前的上一版（${previousAnnotatedUnifiedChineseCsvHeaders.length} / `
    + `${previousAnnotatedUnifiedEnglishCsvHeaders.length} 列，同样带说明）、`
    + `不带说明的再上一版（${unannotatedUnifiedChineseCsvHeaders.length} / `
    + `${unannotatedUnifiedEnglishCsvHeaders.length} 列）、`
    + `再上一版模板（${supersededUnifiedChineseCsvHeaders.length} / ${previousUnifiedChineseCsvHeaders.length} 列）、`
    + `旧版玩家模板（${playerCsvHeaders.length} / ${supersededPlayerCsvHeaders.length} 列）、`
    + `旧版完整数据包（${requiredCsvHeaders.length} / ${supersededFullCsvHeaders.length} 列）。`
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
    武器ID: value("武器ID", "Weapon ID"),
    // 中文模板的「英文名称」是消歧列；英文模板整列都是英文名，武器名即英文名。
    英文名称: value("英文名称", "Weapon"),
    弹药类型: value("弹药类型", "Ammo Type"),
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
    弹药类型: row["弹药类型"] ?? "",
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
  const resolvedItems = resolveOfficialWeaponDefinitions(
    row,
    definitions.item_definitions,
    definitions.english_item_definitions
  );
  if (!resolvedItems.length) return row;
  const primary = resolvedItems[0].definition;
  const sourceLabel = row["推荐来源"]?.trim() ?? "";
  const resolvedHashes = uniqueHashes(resolvedItems.map((item) => item.hash));
  return {
    ...row,
    武器: row["武器"]?.trim() || primary.displayProperties?.name?.trim() || "",
    武器ID: row["武器ID"]?.trim() || resolvedHashes.join(" / "),
    // 只写名字的行，上面的 `武器ID` 会被补成「同名全部 hash」。补出来的这串是推导结果，
    // 「声明版本优先」不能拿它当作者写下过的版本（见 `declaredItemHashesOf`），这里留一份原始值。
    __declared_weapon_ids: row["武器ID"] ?? "",
    页面: row["页面"]?.trim() || sourceLabel,
    分类: row["分类"]?.trim() || primary.itemTypeDisplayName?.trim() || "",
    来源URL: row["来源URL"]?.trim() || "",
    来源位置: row["来源位置"]?.trim() || (isEditableTemplateRow(row) ? "统一推荐模板导入" : ""),
    图标图标URL: row["图标图标URL"]?.trim() || primary.displayProperties?.icon?.trim() || "",
    来源: row["来源"]?.trim() || primary.sourceData?.sourceString?.trim() || ""
  };
}

/**
 * 行里的名字 → 官方定义。这是**唯一**的名字口径，`enrichWeaponRecommendationRow`、校验期、
 * 展开期（`resolveDeclaredItemHashes`）三处同源。
 *
 * ③ 的名字判据（2026-09-24）：**给了英文名就只按英文名匹配**。中文名撞译的 `隐士`
 * （The Recluse / The Eremite）按并集匹配会把两把枪都收进来，规则会落到没写的那把上；
 * 只写中文名、又确实撞译的行由校验期要求补英文名（见 `weaponIdentityAmbiguityIssue`）。
 *
 * 英文名池（`englishDefinitions`）不是英文清单，是「这份文件里出现过的英文名对应的 hash」
 * （见 `WeaponKnowledgeSemanticDefinitions.english_item_definitions`）；只返回中文定义池里
 * 也有的那些——定义池是校验期一切判据的输入，池子里没有的就当找不到。
 */
function resolveOfficialWeaponDefinitions(
  row: Record<string, string>,
  definitions: DefinitionComponentData,
  englishDefinitions?: DefinitionComponentData
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

  const englishKey = normalizeName(row["英文名称"] ?? "");
  if (englishKey) {
    return Object.entries(englishDefinitions ?? {}).flatMap(([key, englishDefinition]) => {
      if (normalizeName(englishDefinition.displayProperties?.name ?? "") !== englishKey) return [];
      const hash = Number(englishDefinition.hash ?? key);
      const definition = isUnsignedHash(hash) ? definitions[String(hash)] : undefined;
      return definition && isWeaponDefinition(definition) ? [{ hash, definition }] : [];
    });
  }

  const chineseKey = normalizeName(row["武器"] ?? "");
  if (!chineseKey) return [];
  return Object.entries(definitions).flatMap(([key, definition]) => {
    if (normalizeName(definition.displayProperties?.name ?? "") !== chineseKey) return [];
    const hash = Number(definition.hash ?? key);
    return isUnsignedHash(hash) && isWeaponDefinition(definition) ? [{ hash, definition }] : [];
  });
}

/**
 * 这个名字展开出来的条目是不是武器（`itemType === 3`）。
 *
 * 只收武器（2026-09-24 定）：推荐功能目前只匹配武器，而同名条目里还混着徽标、载具、护甲。
 * 收进来的话，它们会成为「这个名字的一种身份」——⑥ 把非武器的弹药类型 0 当成第二种弹药类型，
 * 报出「（ / 主弹药）」这种空标签的拦截，一份正常的推荐表导不进来（Aegis 9 行、LGpig 8 行、
 * YXCRALLXY 8 行实测都是这么来的）。
 *
 * 取不到 `itemType` 的定义照收：与「资料库看不见就不判」是同一条口径。
 */
function isWeaponDefinition(definition: { itemType?: number }): boolean {
  return typeof definition.itemType !== "number" || definition.itemType === 3;
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

/**
 * 单元格里写了多个值的写法（多个值 = 满足其中任意一个）。
 *
 * 分隔符是斜杠：模板与导出都写不带空格的（`医治/燃烧野心`），带空格的老写法继续认——
 * 数据源脚本和玩家手上已有的文件都是那一版，只认一种就会变成「同一份文件这次能导、下次不能导」。
 */
function splitValues(value: string): string[] {
  return [...new Set(value.split(/\s*\/\s*|[；;\n]+/u).map((part) => part.trim()).filter(Boolean))];
}

/**
 * 校验期的名字口径与资料库索引查找共用一份实现（见 `normalizeLookupText`）。
 *
 * 从前这里和查找侧各有一份：校验去掉空格和标点、查找只 trim。表格里按页面习惯写
 * `迪凯特 02`、官方名却是 `迪凯特02`，查找侧拿不到定义 hash，这行就会以
 * 「无法根据官方中文名称找到可核对的武器」被拦下——校验口径本身明明是认的。
 *
 * 保留函数声明而不是 `const` 别名：下面 `unspecifiedRequirementNames` 在模块求值期就调用它，
 * 换成 `const` 会落进暂时性死区。
 */
function normalizeName(value: string): string {
  return normalizeLookupText(value);
}

type RecommendationVariantConstraint = "adept" | "timelost" | "harrowed" | "holofoil" | "exact_only";

const officialWeaponVariantSuffixPattern = /\s*[（(]\s*(adept|专家|timelost|失时|harrowed|痛苦)\s*[）)]\s*$/iu;
const sourceOnlyWeaponVariantSuffixPattern = /\s*[（(]\s*(holofoil|全息箔|brave(?:\s+version)?|勇者版本|猛攻版本|玖的仪式版本)\s*[）)]\s*$/iu;

type WeaponIdentityRelationIndex = {
  byItemHash: Map<number, WeaponIdentityRelation>;
  /** 同族版本（`family_key` 相同）：家族全展开读的就是这一张表。 */
  byFamily: Map<string, WeaponIdentityRelation[]>;
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
  const byFamily = new Map<string, WeaponIdentityRelation[]>();
  for (const relation of relations) {
    byItemHash.set(relation.item_hash, relation);
    const family = byFamily.get(relation.family_key) ?? [];
    family.push(relation);
    byFamily.set(relation.family_key, family);
  }
  const index = { byItemHash, byFamily };
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
 * ## 口径（2026-09-24 拍板：推荐跟着武器走，不跟着版本走）
 *
 * - 零级（补基础集）：规则只写了武器名时，先按官方名精确匹配补出全部同名武器——
 *   与导入期 `resolveOfficialWeaponDefinitions` 同一口径，补完之后的路径完全相同；
 * - **家族全展开**：基础集里的每个 hash 都按 `family_key` 放大到整个武器家族
 *   （赛季版本不同、同发布组孪生都一样）。旧口径在这里做的是「只保留最新发布组」的归约，
 *   它让旧版本页面看不到本来是给这把枪写的推荐；归约随本口径一并删除。
 * - **声明版本优先**：文件名里已经被某条规则写下的版本，不由别的规则再展开过去。
 *   不这么收的话同一版本上会叠出两条规则，「符合 n 套」从 1 变 2。
 * - 变体约束照旧：规则写的名字带「（专家）」「（失时）」这类后缀时，只放大到那个变体。
 * - **不跨弹药类型**（⑥）：同名同槽、只有弹药类型不同的版本不互相放大（全库只有
 *   `极高反射` 命中这一条）。任一侧弹药类型取不到时不判。
 *
 * 展开出来的版本还要过 `filterItemHashesByOwnPerkPool` 的逐 hash 自检，但自检只回答
 * 「这版有没有这条规则提到的东西」，不回答「这版能不能整套装出来」（2026-09-24 改判）：
 * 后者按栏位写法判，会让**同一份数据的两条来源**（带栏位的推荐表 / 只有 perk 串的愿望单文本）
 * 算出两个覆盖集。覆盖集只由「这把枪的哪些版本」决定，「这版装不出整套」留给匹配期表达。
 *
 * `nameEntries` 由调用方从 manifest 构建（导入期正好有它）。零级是唯一必须依赖 manifest 的一级，
 * 这也是「导入期展开」与「导入期校验」必须同处一步的原因。
 */
/**
 * 从官方定义构建「武器 hash → 精确名称键」表，供三级（规则只写了武器名）展开使用。
 *
 * 英文名来自**英文定义**（读取期 `exactNameKeys` 用的就是 `englishItemDefinitions` 里的名字），
 * 不是规则行里的「英文名称」列——两者是不同的东西，混用会让名称判据对不上。
 *
 * 只收武器（`isWeaponDefinition`，2026-09-24）：推荐只匹配武器，而同名条目里还混着徽标、载具、
 * 护甲。收进来的话，它们会成为「这个名字的一种身份」，与名字匹配那条链的两个口径就分叉了。
 */
export function buildWeaponNameEntries(
  definitions: DefinitionComponentData,
  englishDefinitions?: DefinitionComponentData
): WeaponNameEntry[] {
  return Object.values(definitions).flatMap((definition) => {
    const itemHash = Number(definition.hash);
    if (!isUnsignedHash(itemHash)) return [];
    if (!isWeaponDefinition(definition)) return [];
    const keys = new Set([
      normalizeName(definition.displayProperties?.name ?? ""),
      normalizeName(englishDefinitions?.[String(itemHash)]?.displayProperties?.name ?? "")
    ].filter(Boolean));
    return keys.size ? [{ item_hash: itemHash, exact_name_keys: keys }] : [];
  });
}

export type RecommendationIdentityOptions = {
  /**
   * 「声明版本优先」：本份导入里被显式写下的版本 hash（文件里所有规则合起来）。
   * 展开只落在这些之外的版本上——写在文件里的版本由它自己那条规则负责。
   */
  declaredItemHashes?: readonly number[];
  /**
   * 判定「家族展开不跨弹药类型」用的定义池（武器定义）。
   * 取不到时不过滤：与导入校验「资料库看不见就不判」同一口径。
   */
  definitions?: DefinitionComponentData;
  /**
   * 规则的变体约束（名字带「（专家）」这类后缀时才非空）。由 `expandRecommendationItemHashes`
   * 从行里的武器名现算；DIM 文本没有名字可算，直接不传 = 不限版本。
   */
  variantConstraint?: RecommendationVariantConstraint | null;
};

export function expandRecommendationItemHashes(
  input: RecommendationIdentityInput,
  identityRelations: readonly WeaponIdentityRelation[],
  nameEntries: readonly WeaponNameEntry[],
  options?: RecommendationIdentityOptions
): number[] {
  // 只写了武器名的规则先按官方名补出基础 hash 集，之后走**完全相同**的家族展开。
  // 这一点是 S3′-0 对拍网逼出来的：导入期 `enrichWeaponRecommendationRow` 也是先把名字补成
  // 「同名武器全体的 hash」，补完就不该再有第二套口径，否则只写名字的规则会漏掉其它版本。
  return expandWeaponFamilyHashes(resolveDeclaredItemHashes(input, nameEntries), identityRelations, {
    ...options,
    variantConstraint: recommendationVariantConstraint(input)
  });
}

/**
 * 家族全展开：把一组基础 hash 放大到它们的整个武器家族（T56 2026-09-24 口径）。
 *
 * 输入不是「行」而是已经定下来的基础 hash 集——人工 CSV 先按名称解析出基础集再进来，
 * DIM 文本则直接拿规则自己那一行写的 hash（写入期没有名字可解析），两条来源共用这一段。
 */
export function expandWeaponFamilyHashes(
  base: readonly number[],
  identityRelations: readonly WeaponIdentityRelation[],
  options?: RecommendationIdentityOptions
): number[] {
  if (!base.length) return [];
  const index = indexWeaponIdentityRelations(identityRelations);
  const constraint = options?.variantConstraint ?? null;
  const declaredSet = new Set(options?.declaredItemHashes ?? []);
  const expanded = new Set(base);
  const baseAmmoTypes = ammoTypesOf(base, options?.definitions);
  for (const itemHash of base) {
    const relation = index.byItemHash.get(itemHash);
    if (!relation) continue;
    for (const member of index.byFamily.get(relation.family_key) ?? []) {
      if (expanded.has(member.item_hash)) continue;
      // 声明版本优先：文件里已经写过规则的版本不在这里放大。
      if (declaredSet.has(member.item_hash)) continue;
      // 变体约束按**目标**的变体标签过滤：规则的约束说的是「我只适用于专家的那种」。
      if (!appliesToVariant(constraint, new Set(member.variant_tags))) continue;
      const memberAmmoType = ammoTypeOf(member.item_hash, options?.definitions);
      if (baseAmmoTypes.size > 0 && memberAmmoType !== undefined && !baseAmmoTypes.has(memberAmmoType)) {
        continue;
      }
      expanded.add(member.item_hash);
    }
  }
  return [...expanded];
}

/** 单版本插件池缓存。键是武器 hash；**一次导入配一个缓存**（换定义池就要换缓存）。 */
export type VersionPerkPoolCache = Map<number, VersionPerkPool | null>;

/**
 * 逐 hash 池子自检（T56 2026-09-24）：展开出来的每一个版本，核对它**有没有**这条规则提到的东西。
 *
 * ## 判据只看「这把枪上任意一栏能到达」，不看栏位（2026-09-24 改判）
 *
 * 自检回答的是「这条规则跟这个版本有没有关系」，不是「这版能不能整套装出来」。两者必须分开：
 * 覆盖集由「这把枪的哪些版本」决定，规则的栏位写法不能影响它——推荐表每格都带栏位，
 * 愿望单文本只有一串 perk，按栏位判会让同一份数据的两条来源算出两个覆盖集
 * （2026-09-24 实测：推荐表 1072、愿望单 1077，差的正是「规则要的两个 perk 抢同一个特性槽」
 * 的那几个旧版本）。两侧同判据之后，覆盖集逐条相同。
 *
 * ## 「有没有」是存在性：命中任意一条候选就留下（2026-09-25 改判）
 *
 * 判据是**任意一条候选**能到达，不是每一栏都得有落点。要求「每一栏都至少命中一条候选」
 * 等于把「这版能不能整套装出来」又当成了覆盖判据，只是换了层皮——**缺任意一栏就整版剔除**。
 * 2026-09-25 实测（Aegis 暗夜魅影，`34731066`）：这版的枪管、弹匣、大师杰作、perk1、perk2
 * **全部命中**（推荐的两个核心 perk `切割` / `幼雏` 都装得上），只有起源特性对不上
 * （规则要 `加速突击`，这版只有 `先锋平反` / `绝路专注`），整条推荐被剔除，用户仓库里
 * 12 件这把枪一件来源都不显示。规模不是个例：Aegis 推荐表 748 条规则里 275 条、
 * 心愿单 6009 条里 1945 条都这样被整版剔除过。
 *
 * 「这版装不出整套」因此不再由覆盖集表达，交给匹配期（各来源按自己的匹配语义判，
 * 缺哪一栏在详情里看得到），否则一个旧版本会因为「Aegis 那套 roll 在它上面不存在」
 * 被整条藏起来——那正是「漏武器」。
 *
 * 判据与读取期同源：**hash 命中或规范化名字命中**（`requirementIsSatisfied` /
 * `findSatisfyingPlug` 读的就是这两样）。名字命中不能省：同一把枪的不同版本里同一个 Perk
 * 常常是不同的 hash（锻造强化、专家版），只比 hash 会把装得上的版本判成装不上，那又变成漏匹配。
 *
 * 池子建不出来时（定义池缺这把枪、或它的定义展不出任何插件）**放行不判**——
 * 与导入校验「资料库看不见就不判笔误」是同一条口径。
 *
 * 调用方可以先把不参与判定的要求摘掉：CSV 那条链把「大师杰作」排除在外（它在插件池里全量枚举、
 * 每一版都能到达，留着会让栏位更多的格式多盖几个版本），理由与实测见调用点。
 */
export function filterItemHashesByOwnPerkPool(input: {
  itemHashes: readonly number[];
  /** 规则的要求；只读候选，不看 `slot`（见上方判据）。 */
  requirements: ReadonlyArray<{ candidates: readonly number[] }>;
  allDefinitions: DefinitionComponentData;
  plugSetDefinitions?: DefinitionComponentData;
  /** 单版本插件池缓存：同一次导入的多条规则共用，同一版本只展开一次插件。 */
  poolCache?: VersionPerkPoolCache;
}): number[] {
  // 没有候选的要求不参与判定：它本来就无从核对，不能因为「一条候选都没有」就把整版判掉。
  const judgeable = input.requirements.filter((requirement) => requirement.candidates.length > 0);
  if (!judgeable.length) return [...input.itemHashes];
  const poolOptions = {
    allDefinitions: input.allDefinitions,
    plugSetDefinitions: input.plugSetDefinitions
  };
  const pools = input.poolCache ?? new Map<number, VersionPerkPool | null>();
  return input.itemHashes.filter((itemHash) => {
    if (!pools.has(itemHash)) pools.set(itemHash, versionPerkPool(itemHash, poolOptions));
    const pool = pools.get(itemHash);
    if (!pool) return true;
    return judgeable.some((requirement) => (
      requirementFitsVersionPool(requirement, pool, input.allDefinitions)
    ));
  });
}

type VersionPerkPool = {
  /** 这把枪定义里能到达的全部 Perk（覆盖自检的唯一判据，不按栏位分）。 */
  everyHash: Set<number>;
  everyName: Set<string>;
};

function versionPerkPool(
  itemHash: number,
  options: { allDefinitions: DefinitionComponentData; plugSetDefinitions?: DefinitionComponentData }
): VersionPerkPool | null {
  const definition = options.allDefinitions[String(itemHash)];
  if (!definition) return null;
  const groups = summarizeItemPerks(definition, options.allDefinitions, {
    plugSetDefinitions: options.plugSetDefinitions,
    maxPlugsPerSocket: null
  });
  if (!groups.length) return null;
  const everyHash = new Set<number>();
  const everyName = new Set<string>();
  for (const group of groups) {
    for (const plug of group.plugs) {
      everyHash.add(plug.hash);
      const name = normalizeName(plug.name);
      if (name) everyName.add(name);
    }
  }
  return { everyHash, everyName };
}

/**
 * 单条要求在这版上「有没有东西可装」：候选按 hash 或规范化名字在**任意一栏**命中即可。
 * 栏位不参与判定（见 `filterItemHashesByOwnPerkPool` 的口径说明）。
 */
function requirementFitsVersionPool(
  requirement: { candidates: readonly number[] },
  pool: VersionPerkPool,
  allDefinitions: DefinitionComponentData
): boolean {
  return requirement.candidates.some((candidate) => {
    if (pool.everyHash.has(candidate)) return true;
    const name = normalizeName(allDefinitions[String(candidate)]?.displayProperties?.name ?? "");
    return Boolean(name) && pool.everyName.has(name);
  });
}

function ammoTypeOf(itemHash: number, definitions?: DefinitionComponentData): number | undefined {
  const value = definitions?.[String(itemHash)]?.equippingBlock?.ammoType;
  return typeof value === "number" ? value : undefined;
}

function ammoTypesOf(itemHashes: readonly number[], definitions?: DefinitionComponentData): Set<number> {
  return new Set(itemHashes.flatMap((itemHash) => {
    const ammoType = ammoTypeOf(itemHash, definitions);
    return ammoType === undefined ? [] : [ammoType];
  }));
}

/**
 * 「弹药类型」列认的写法（⑥）。中英各一套，外加官方枚举值本身。
 *
 * 与界面和攻略脚本里的标签同字（`generate-t20-weapon-knowledge.py` 的 `AMMO_LABELS`、
 * 装备详情的「主弹药 / 特殊弹药 / 重型弹药」）。
 */
const ammoTypeLabels: Record<number, string> = { 1: "主弹药", 2: "特殊弹药", 3: "重型弹药" };
const ammoTypeKeys = new Map<string, number>([
  ["主弹药", 1], ["primary", 1], ["1", 1],
  ["特殊弹药", 2], ["special", 2], ["2", 2],
  ["重型弹药", 3], ["heavy", 3], ["3", 3]
].map(([label, value]) => [normalizeName(String(label)), Number(value)]));

/** 行里写的弹药类型：空 = 这行没填；认不出 = 填了但不在术语表里（要报错，不能当没填）。 */
function parseAmmoType(value: string): { ammoType?: number; invalid: boolean } {
  const trimmed = value.trim();
  if (!trimmed) return { invalid: false };
  const ammoType = ammoTypeKeys.get(normalizeName(trimmed));
  return ammoType === undefined ? { invalid: true } : { ammoType, invalid: false };
}

function ammoTypeLabel(value: number | undefined): string {
  return value === undefined ? "" : ammoTypeLabels[value] ?? "";
}

/**
 * 规则声明的身份 → 基础 hash 集。
 *
 * 显式列出的「武器ID」优先；只写了武器名时按**精确**官方名匹配补出全部同名武器
 * （见 `WeaponNameEntry` 的说明）。与导入期 `resolveOfficialWeaponDefinitions` 同一口径：
 * 名称相等是唯一的补充依据，不做家族后缀归并。
 *
 * ③：**写了英文名就只按英文名匹配**（2026-09-24）。中文名撞译的两把枪（`隐士`）按并集匹配会把
 * 没写的那个版本也收进来，规则就落到了作者没指的枪上。名称表里没有这个英文名时返回空集，
 * 由调用方按「找不到可核对的武器」报错——不悄悄退回中文名，那等于把一次错配藏起来。
 */
function resolveDeclaredItemHashes(
  input: RecommendationIdentityInput,
  nameEntries: readonly WeaponNameEntry[]
): number[] {
  const declared = uniqueHashes([...input.itemHashes]);
  if (declared.length) return declared;
  const englishKey = normalizeName(input.englishName ?? "");
  const ruleKeys = (englishKey ? [englishKey] : [normalizeName(input.weaponName)]).filter(Boolean);
  if (!ruleKeys.length) return [];
  return uniqueHashes(nameEntries.flatMap((entry) => (
    ruleKeys.some((key) => entry.exact_name_keys.has(key)) ? [entry.item_hash] : []
  )));
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
