/**
 * 推荐匹配投影层：唯一允许把匹配事实（VaultItemInstanceMatchInfo）派生成界面数字与文案的模块。
 * 仓库卡片、推荐筛选、武器详情、推荐来源和验收报告都从这里取结论；
 * 任何界面都不得自行比较插件 Hash 或名称，也不得自行截断来源列表。
 */

import type { RecommendationSourceSlotMatch } from "@d2-tools/core/community-perks";

/**
 * 推荐匹配投影的查表接口。本文件的输出同时被仓库页（VaultCopy）和武器详情（ItemDetailCopy）
 * 消费，所以不绑定某一侧的表：调用方传自己那份 copy 的 `inline` 加界面语言即可。
 * `inline` 传表对象本身（而不是再包一层闭包），模块级缓存才能按引用稳定命中——
 * `copy.inline` 是每语言一份的模块级对象，引用不会每次渲染都变。
 */
export type RecommendationMatchCopy = {
  inline: Record<string, string>;
  /** 来源名排序折叠用的界面语言；不传按历史行为 `zh-Hans-CN`。 */
  locale?: string;
};

/** 同 `vaultText` / `itemDetailText`：zh 侧表空、key 即中文原文，en 侧按原文查英文。 */
function recommendationMatchText(copy: RecommendationMatchCopy, key: string): string {
  return copy.inline[key] ?? key;
}

/** 同 `vaultTemplate` / `itemDetailTemplate`：带 `{占位符}` 的句子走这里。 */
function recommendationMatchTemplate(
  copy: RecommendationMatchCopy,
  key: string,
  values: Record<string, string | number>
): string {
  return recommendationMatchText(copy, key).replace(/\{(\w+)\}/gu, (match, name: string) =>
    name in values ? String(values[name]) : match);
}

function recommendationSortLocale(copy: RecommendationMatchCopy): string {
  return copy.locale ?? "zh-Hans-CN";
}

export type CuratedRecommendationMatchPresentation = {
  summary: string;
  detail: string;
  matchedRequirementCount: number;
  requirementCount: number;
  matchedPerkCount: number;
  perkRequirementCount: number;
  uncheckableRequirementCount: number;
};

export type RecommendationSlotMatchPresentation = {
  label: string;
  tone: "success" | "error" | "pending" | "neutral";
  instanceOwnedFallback: string;
  currentEnabledFallback: string;
};

export function presentRecommendationSlotMatch(
  copy: RecommendationMatchCopy,
  state: RecommendationSourceSlotMatch["state"],
  facts: { hasInstanceOwned: boolean; hasCurrentEnabled: boolean }
): RecommendationSlotMatchPresentation {
  if (state === "match") {
    return {
      label: recommendationMatchText(copy, "符合"),
      tone: "success",
      instanceOwnedFallback: recommendationMatchText(copy, "未返回可核对项"),
      currentEnabledFallback: recommendationMatchText(copy, "未返回当前启用项")
    };
  }
  if (state === "different") {
    return {
      label: recommendationMatchText(copy, "不符"),
      tone: "error",
      instanceOwnedFallback: recommendationMatchText(copy, facts.hasInstanceOwned ? "未返回可核对项" : "本版本无此栏位"),
      currentEnabledFallback: recommendationMatchText(copy, facts.hasInstanceOwned || facts.hasCurrentEnabled
        ? "未返回当前启用项"
        : "本版本无此栏位")
    };
  }
  if (state === "uncheckable") {
    return {
      label: recommendationMatchText(copy, "无法判断"),
      tone: "pending",
      instanceOwnedFallback: recommendationMatchText(copy, facts.hasInstanceOwned ? "该栏位数据不完整" : "未读取到该栏位"),
      currentEnabledFallback: recommendationMatchText(copy, facts.hasCurrentEnabled ? "该栏位数据不完整" : "该栏位当前项未读取")
    };
  }
  return {
    label: recommendationMatchText(copy, "来源未要求"),
    tone: "neutral",
    instanceOwnedFallback: recommendationMatchText(copy, "来源未要求核对"),
    currentEnabledFallback: recommendationMatchText(copy, "来源未要求核对")
  };
}

export function presentCuratedRecommendationMatch(
  copy: RecommendationMatchCopy,
  source: RecommendationSourceMatch,
  sourceLabel = source.source_label
): CuratedRecommendationMatchPresentation {
  const specifiedSlots = source.slots.filter((slot) => slot.state !== "source_not_specified");
  const requirementCount = specifiedSlots.length || source.requirement_count;
  const matchedRequirementCount = specifiedSlots.length
    ? specifiedSlots.filter((slot) => slot.state === "match").length
    : source.matched_requirement_count;
  const uncheckableRequirementCount = specifiedSlots.length
    ? specifiedSlots.filter((slot) => slot.state === "uncheckable").length
    : source.uncheckable_requirement_count;
  const perkSlots = specifiedSlots.filter((slot) => slot.slot === "perk1" || slot.slot === "perk2");
  const matchedPerkCount = perkSlots.filter((slot) => slot.state === "match").length;

  if (source.state === "weapon_only" || requirementCount === 0) {
    return {
      summary: recommendationMatchText(copy, "仅推荐武器 · 未指定 Roll"),
      detail: recommendationMatchTemplate(copy, "{source}：来源推荐这把武器，但没有指定需要核对的 Roll。", { source: sourceLabel }),
      matchedRequirementCount: 0,
      requirementCount: 0,
      matchedPerkCount: 0,
      perkRequirementCount: 0,
      uncheckableRequirementCount: 0
    };
  }

  const perkText = perkSlots.length
    ? recommendationMatchTemplate(copy, "Perk {matched}/{total}", { matched: matchedPerkCount, total: perkSlots.length })
    : recommendationMatchText(copy, "Perk 未要求");
  const pendingText = uncheckableRequirementCount > 0
    ? recommendationMatchTemplate(copy, " · {count} 项无法判断", { count: uncheckableRequirementCount })
    : "";
  const summary = recommendationMatchTemplate(copy, "{perk} · 完整 {matched}/{total}{pending}", {
    perk: perkText,
    matched: matchedRequirementCount,
    total: requirementCount,
    pending: pendingText
  });
  return {
    summary,
    detail: recommendationMatchTemplate(copy, "{source}：{summary}。同栏候选任选其一，不同栏位分别核对。", { source: sourceLabel, summary }),
    matchedRequirementCount,
    requirementCount,
    matchedPerkCount,
    perkRequirementCount: perkSlots.length,
    uncheckableRequirementCount
  };
}

import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type {
  RecommendationCardSourceSummary,
  RecommendationCardSummary,
  RecommendationSourceMatch,
  VaultItemInstanceMatchInfo
} from "@d2-tools/core/community-perks";
import type { VaultCopy } from "./i18n/types.js";
import { vaultText } from "./vault/vaultCopy.js";

export type VaultRecommendationSourceSummary = {
  /**
   * 来源身份。事实层的 `source_group_id`：**一个具名来源 = 一个键 = 一行**，两种导入格式一致
   * （用户 2026-09-16 拍板，不按导入文件合并）。消费层不需要也无法从它反推来源类型。
   */
  sourceId: string;
  sourceLabel: string;
  shortLabel: string;
  state: "full" | "core" | "close" | "key_missing" | "not_matched" | "weapon_only" | "uncheckable";
  matched: number;
  available: number;
  matchedPerkCount: number;
  perkRequirementCount: number;
  uncheckablePerkCount: number;
  matchedRequirementCount: number;
  requirementCount: number;
  uncheckableRequirementCount: number;
  unit: "item" | "combo" | "perk";
  purposes: Array<"pve" | "pvp" | "general">;
  resultText: string;
  text: string;
  detail: string;
};

export type VaultRecommendationSummaryIndex = ReadonlyMap<
  string,
  VaultRecommendationSourceSummary[]
>;

export type VaultRecommendationResult = "matched" | "partial" | "not_matched" | "uncheckable" | "uncovered";

export type VaultRecommendationMetricKey = `${number}/${number}`;
export type VaultRecommendationPrimaryFilter =
  | "all"
  | VaultRecommendationMetricKey
  | "unrequired"
  | "uncheckable"
  | "uncovered";
export type VaultRecommendationCompleteFilter = "all" | VaultRecommendationMetricKey;

export type VaultRecommendationFilterFact = {
  primaryKey: Exclude<VaultRecommendationPrimaryFilter, "all">;
  completeKey?: VaultRecommendationMetricKey;
};

export type VaultRecommendationFilterFactIndex = ReadonlyMap<
  string,
  ReadonlyMap<string, VaultRecommendationFilterFact>
>;

export type VaultRecommendationSourceOption = {
  sourceId: string;
  sourceLabel: string;
  shortLabel: string;
  count: number;
};

export type VaultRecommendationManagedSourceOptionInput = {
  source_key: string;
  label: string;
  configured: boolean;
  state: "active" | "disabled" | "removed";
};

let cachedSummaryIndexInput: {
  copy: RecommendationMatchCopy;
  instanceMatchMap?: ReadonlyMap<string, VaultItemInstanceMatchInfo>;
  cardSummaryMap?: ReadonlyMap<string, RecommendationCardSummary>;
  itemSignatures: Map<string, string>;
  index: Map<string, VaultRecommendationSourceSummary[]>;
} | null = null;

export function getVaultCommunityInstanceKey(item: AccountItemSummary): string {
  return item.instance_id ?? `hash:${item.hash}`;
}

export function buildVaultRecommendationSourceSummaries(
  copy: RecommendationMatchCopy,
  item: AccountItemSummary,
  instanceMatch?: VaultItemInstanceMatchInfo,
  cardSummary?: RecommendationCardSummary
): VaultRecommendationSourceSummary[] {
  // 所有来源（含 DIM）都来自同一份来源事实，卡片不再有 DIM 专属汇总。
  const summaries = cardSummary
    ? cardSummary.sources.map((source) => cardSourceSummary(copy, source))
    : (instanceMatch?.source_matches ?? []).map((source) => sourceMatchSummary(copy, source));
  return summaries.sort((left, right) => compareSourceSummaries(copy, left, right));
}

export function buildVaultRecommendationSummaryIndex(
  copy: RecommendationMatchCopy,
  items: readonly AccountItemSummary[],
  instanceMatchMap?: ReadonlyMap<string, VaultItemInstanceMatchInfo>,
  cardSummaryMap?: ReadonlyMap<string, RecommendationCardSummary>
): Map<string, VaultRecommendationSourceSummary[]> {
  const weaponItems = items.filter((item) => item.group_key === "weapons");
  const itemSignatures = new Map(weaponItems.map((item) => {
    const instanceKey = getVaultCommunityInstanceKey(item);
    return [instanceKey, recommendationItemSignature(item)] as const;
  }));
  // 缓存身份必须含文案表与语言：换了界面语言还命中上一种语言的缓存，会把旧语言的句子留在页面上。
  // `inline` 与 `locale` 都是模块级稳定值，所以即使调用方每次渲染新造 `copy` 对象也能正确比对。
  if (
    cachedSummaryIndexInput !== null
    && cachedSummaryIndexInput.copy.inline === copy.inline
    && cachedSummaryIndexInput.copy.locale === copy.locale
    && cachedSummaryIndexInput.instanceMatchMap === instanceMatchMap
    && cachedSummaryIndexInput.cardSummaryMap === cardSummaryMap
    && sameRecommendationItemSignatures(cachedSummaryIndexInput.itemSignatures, itemSignatures)
  ) {
    return cachedSummaryIndexInput.index;
  }

  const index = new Map<string, VaultRecommendationSourceSummary[]>();
  for (const item of weaponItems) {
    const instanceKey = getVaultCommunityInstanceKey(item);
    index.set(
      instanceKey,
      buildVaultRecommendationSourceSummaries(
        copy,
        item,
        instanceMatchMap?.get(instanceKey),
        cardSummaryMap?.get(instanceKey)
      )
    );
  }
  cachedSummaryIndexInput = { copy, instanceMatchMap, cardSummaryMap, itemSignatures, index };
  return index;
}

/**
 * 把事实层的来源归队到管理面的行上，并丢掉不属于任何一行的事实。
 *
 * 管理面一行 = 一次导入，事实层一条 = 一个具名来源，两者的键天然不等
 * （导入键是文档键，具名来源键是实例键）。`sourceKeyByFactKey` 由管理名册给出
 * 「事实键 → 它属于的那一行」，归队后下游一律用管理面的键看来源：
 * 选项、计数、筛选事实都只认这一个粒度。
 *
 * 名册是权威：不在名册里的事实（已删除的来源留下的旧扫描结果）一律丢掉，
 * 所以传一个空映射就等于「一条都不放行」。
 */
export function attributeVaultRecommendationSummaryIndex(
  summaryIndex: VaultRecommendationSummaryIndex,
  sourceKeyByFactKey: ReadonlyMap<string, string>
): Map<string, VaultRecommendationSourceSummary[]> {
  const attributed = new Map<string, VaultRecommendationSourceSummary[]>();
  for (const [instanceKey, summaries] of summaryIndex) {
    const next: VaultRecommendationSourceSummary[] = [];
    for (const summary of summaries) {
      const managedSourceKey = sourceKeyByFactKey.get(summary.sourceId);
      if (!managedSourceKey) continue;
      next.push(managedSourceKey === summary.sourceId ? summary : { ...summary, sourceId: managedSourceKey });
    }
    if (next.length) attributed.set(instanceKey, next);
  }
  return attributed;
}

function recommendationItemSignature(item: AccountItemSummary): string {
  return [
    item.hash,
    item.weapon_roll?.fingerprint ?? "",
    (item.socket_plugs ?? []).map((plug) => plug.hash).join(",")
  ].join(":");
}

function sameRecommendationItemSignatures(
  previous: ReadonlyMap<string, string>,
  next: ReadonlyMap<string, string>
): boolean {
  if (previous.size !== next.size) return false;
  for (const [instanceKey, signature] of next) {
    if (previous.get(instanceKey) !== signature) return false;
  }
  return true;
}

export function hasPositiveRecommendationSummary(summary: VaultRecommendationSourceSummary): boolean {
  return summary.state === "full" || summary.state === "core";
}

export function inferVaultRecommendationResult(
  summaries: readonly VaultRecommendationSourceSummary[],
  aggregateState?: VaultItemInstanceMatchInfo["recommendation_state"]
): VaultRecommendationResult {
  if (!summaries.length) return "uncovered";
  if (summaries.some((summary) => summary.state === "uncheckable")) return "uncheckable";
  const hasPositive = summaries.some(hasPositiveRecommendationSummary);
  if (hasPositive && aggregateState === "priority") return "matched";
  if (hasPositive && aggregateState === "compare") return "partial";
  const hasNegative = summaries.some((summary) => summary.state === "key_missing" || summary.state === "not_matched");
  if (hasPositive && !hasNegative) return "matched";
  if (hasPositive || summaries.some((summary) => (
    summary.state === "core"
    || summary.state === "close"
    || summary.state === "weapon_only"
    || summary.matched > 0
  ))) return "partial";
  return "not_matched";
}

export function inferVaultRecommendationResultForSource(
  summaries: readonly VaultRecommendationSourceSummary[],
  sourceId: string
): VaultRecommendationResult {
  const sourceSummaries = summaries.filter((candidate) => candidate.sourceId === sourceId);
  if (!sourceSummaries.length) return "uncovered";
  if (sourceSummaries.some((summary) => summary.state === "full" || summary.state === "core")) {
    return "matched";
  }
  if (sourceSummaries.some((summary) => (
    summary.matched > 0
    || summary.state === "close"
    || summary.state === "weapon_only"
  ))) {
    return "partial";
  }
  if (sourceSummaries.some((summary) => summary.state === "uncheckable")) return "uncheckable";
  return "not_matched";
}

export function selectVaultRecommendationSourceSummaries(
  copy: RecommendationMatchCopy,
  summaries: readonly VaultRecommendationSourceSummary[]
): VaultRecommendationSourceSummary[] {
  const summariesBySource = new Map<string, VaultRecommendationSourceSummary>();
  for (const summary of summaries) {
    const sourceId = summary.sourceId;
    const current = summariesBySource.get(sourceId);
    if (!current || isBetterSourceSummary(summary, current)) {
      summariesBySource.set(sourceId, summary);
    }
  }
  return [...summariesBySource.values()].sort((left, right) => compareSourceSummaries(copy, left, right));
}

export function buildVaultRecommendationFilterFactIndex(
  copy: RecommendationMatchCopy,
  summaryIndex: VaultRecommendationSummaryIndex
): Map<string, Map<string, VaultRecommendationFilterFact>> {
  const factIndex = new Map<string, Map<string, VaultRecommendationFilterFact>>();
  for (const [instanceKey, summaries] of summaryIndex) {
    const factsBySource = new Map<string, VaultRecommendationFilterFact>();
    for (const summary of selectVaultRecommendationSourceSummaries(copy, summaries)) {
      factsBySource.set(summary.sourceId, recommendationFilterFactFromSummary(summary));
    }
    if (factsBySource.size) factIndex.set(instanceKey, factsBySource);
  }
  return factIndex;
}

export function getVaultRecommendationFilterFact(
  factIndex: VaultRecommendationFilterFactIndex,
  instanceKey: string,
  sourceId: string
): VaultRecommendationFilterFact | undefined {
  return factIndex.get(instanceKey)?.get(sourceId);
}

export function vaultRecommendationPrimaryFilterLabel(
  copy: VaultCopy,
  filter: VaultRecommendationPrimaryFilter
): string {
  if (filter === "all") return vaultText(copy, "全部");
  if (filter === "unrequired") return vaultText(copy, "未要求");
  if (filter === "uncheckable") return vaultText(copy, "无法判断");
  if (filter === "uncovered") return vaultText(copy, "未收录");
  return filter;
}

export function compareVaultRecommendationMetricKeys(
  left: VaultRecommendationMetricKey,
  right: VaultRecommendationMetricKey
): number {
  const [leftMatched = 0, leftRequired = 1] = left.split("/").map(Number);
  const [rightMatched = 0, rightRequired = 1] = right.split("/").map(Number);
  const ratioDifference = rightMatched * leftRequired - leftMatched * rightRequired;
  return ratioDifference
    || rightRequired - leftRequired
    || rightMatched - leftMatched;
}

// 所有来源共用同一套筛选事实：只看来源事实的形状，不看来源类型（DIM 与人工 CSV 入库后同构）。
function recommendationFilterFactFromSummary(
  summary: VaultRecommendationSourceSummary
): VaultRecommendationFilterFact {
  const primaryKey: VaultRecommendationFilterFact["primaryKey"] = summary.perkRequirementCount === 0
    ? summary.state === "uncheckable" && summary.requirementCount > 0
      ? "uncheckable"
      : "unrequired"
    : summary.uncheckablePerkCount > 0
      ? "uncheckable"
      : `${summary.matchedPerkCount}/${summary.perkRequirementCount}`;
  return {
    primaryKey,
    ...(summary.requirementCount > 0
      ? { completeKey: `${summary.matchedRequirementCount}/${summary.requirementCount}` as VaultRecommendationMetricKey }
      : {})
  };
}

export function buildVaultRecommendationSourceOptions(
  copy: RecommendationMatchCopy,
  summaryGroups: ReadonlyArray<readonly VaultRecommendationSourceSummary[]>,
  managedSources: readonly VaultRecommendationManagedSourceOptionInput[] = [],
  managedSourcesAuthoritative = false
): VaultRecommendationSourceOption[] {
  const options = new Map<string, VaultRecommendationSourceOption>();
  const managedSourcesById = new Map(managedSources.map((source) => (
    [source.source_key, source] as const
  )));
  for (const source of managedSources) {
    if (!source.configured || source.state !== "active") continue;
    const sourceId = source.source_key;
    const sourceLabel = displayVaultRecommendationSourceLabel(copy, source.label);
    options.set(sourceId, {
      sourceId,
      sourceLabel,
      shortLabel: compactVaultRecommendationSourceLabel(sourceLabel),
      count: 0
    });
  }
  for (const summaries of summaryGroups) {
    const summariesBySource = new Map(summaries.map((summary) => (
      [summary.sourceId, summary] as const
    )));
    for (const summary of summariesBySource.values()) {
      const sourceId = summary.sourceId;
      const managedSource = managedSourcesById.get(sourceId);
      if (managedSourcesAuthoritative && !managedSource) continue;
      if (managedSource && (!managedSource.configured || managedSource.state !== "active")) continue;
      const existing = options.get(sourceId);
      if (existing) {
        existing.count += 1;
      } else {
        const displaySourceLabel = displayVaultRecommendationSourceLabel(copy, summary.sourceLabel);
        options.set(sourceId, {
          sourceId,
          sourceLabel: displaySourceLabel,
          shortLabel: compactVaultRecommendationSourceLabel(displaySourceLabel),
          count: 1
        });
      }
    }
  }
  // 所有来源同级：按来源名排序，不再按来源类型或写死顺序排权重。折叠语言跟界面语言走。
  return [...options.values()].sort((left, right) => (
    left.sourceLabel.localeCompare(right.sourceLabel, recommendationSortLocale(copy))
  ));
}

export function vaultRecommendationResultLabel(copy: RecommendationMatchCopy, result: VaultRecommendationResult): string {
  if (result === "matched") return recommendationMatchText(copy, "符合推荐");
  if (result === "partial") return recommendationMatchText(copy, "部分符合");
  if (result === "not_matched") return recommendationMatchText(copy, "未符合");
  if (result === "uncheckable") return recommendationMatchText(copy, "无法判断");
  return recommendationMatchText(copy, "无推荐");
}

export function vaultSourceRecommendationResultLabel(copy: RecommendationMatchCopy, result: VaultRecommendationResult): string {
  if (result === "matched") return recommendationMatchText(copy, "符合推荐");
  if (result === "partial") return recommendationMatchText(copy, "部分符合");
  if (result === "not_matched") return recommendationMatchText(copy, "未符合");
  if (result === "uncheckable") return recommendationMatchText(copy, "无法判断");
  return recommendationMatchText(copy, "未收录");
}

export function formatRecommendationPurposes(
  copy: RecommendationMatchCopy,
  purposes: Array<"pve" | "pvp" | "general">
): string {
  const unique = [...new Set(purposes)];
  return unique.length
    ? unique.map((purpose) => purpose === "pve" ? "PVE" : purpose === "pvp" ? "PVP" : recommendationMatchText(copy, "通用")).join(" / ")
    : recommendationMatchText(copy, "用途未注明");
}

function sourceMatchSummary(copy: RecommendationMatchCopy, source: RecommendationSourceMatch): VaultRecommendationSourceSummary {
  const sourceLabel = displayVaultRecommendationSourceLabel(copy, source.source_label);
  const shortSourceLabel = compactVaultRecommendationSourceLabel(sourceLabel);
  const presentation = presentCuratedRecommendationMatch(copy, source, sourceLabel);
  return {
    sourceId: source.source_group_id,
    sourceLabel,
    shortLabel: shortSourceLabel,
    state: source.state,
    matched: presentation.matchedRequirementCount,
    available: presentation.requirementCount,
    matchedPerkCount: presentation.matchedPerkCount,
    perkRequirementCount: presentation.perkRequirementCount,
    uncheckablePerkCount: source.slots.filter((slot) => (
      (slot.slot === "perk1" || slot.slot === "perk2") && slot.state === "uncheckable"
    )).length,
    matchedRequirementCount: presentation.matchedRequirementCount,
    requirementCount: presentation.requirementCount,
    uncheckableRequirementCount: presentation.uncheckableRequirementCount,
    unit: "item",
    purposes: source.purposes,
    resultText: presentation.summary,
    text: recommendationMatchTemplate(copy, "{source}：{summary}", { source: shortSourceLabel, summary: presentation.summary }),
    detail: withDeclaredLabel(copy, presentation.detail, source.declared_label)
  };
}

function cardSourceSummary(copy: RecommendationMatchCopy, source: RecommendationCardSourceSummary): VaultRecommendationSourceSummary {
  const sourceLabel = displayVaultRecommendationSourceLabel(copy, source.source_label);
  const shortSourceLabel = compactVaultRecommendationSourceLabel(sourceLabel);
  const isWeaponOnly = source.state === "weapon_only" || source.requirement_count === 0;
  const resultText = isWeaponOnly
    ? recommendationMatchText(copy, "仅推荐武器 · 未指定 Roll")
    : recommendationMatchTemplate(copy, "{perk} · 完整 {matched}/{total}{pending}", {
        perk: source.perk_requirement_count > 0
          ? recommendationMatchTemplate(copy, "Perk {matched}/{total}", { matched: source.matched_perk_count, total: source.perk_requirement_count })
          : recommendationMatchText(copy, "Perk 未要求"),
        matched: source.matched_requirement_count,
        total: source.requirement_count,
        pending: source.uncheckable_requirement_count > 0
          ? recommendationMatchTemplate(copy, " · {count} 项无法判断", { count: source.uncheckable_requirement_count })
          : ""
      });
  return {
    sourceId: source.source_group_id,
    sourceLabel,
    shortLabel: shortSourceLabel,
    state: source.state,
    matched: source.matched_requirement_count,
    available: source.requirement_count,
    matchedPerkCount: source.matched_perk_count,
    perkRequirementCount: source.perk_requirement_count,
    uncheckablePerkCount: source.uncheckable_perk_count,
    matchedRequirementCount: source.matched_requirement_count,
    requirementCount: source.requirement_count,
    uncheckableRequirementCount: source.uncheckable_requirement_count,
    unit: "item",
    purposes: source.purposes,
    resultText,
    text: recommendationMatchTemplate(copy, "{source}：{summary}", { source: shortSourceLabel, summary: resultText }),
    detail: withDeclaredLabel(
      copy,
      isWeaponOnly
        ? recommendationMatchTemplate(copy, "{source}：来源推荐这把武器，但没有指定需要核对的 Roll。", { source: sourceLabel })
        : recommendationMatchTemplate(copy, "{source}：{summary}。同栏候选任选其一，不同栏位分别核对。", { source: sourceLabel, summary: resultText }),
      source.declared_label
    )
  };
}

/**
 * 主名是用户给这次导入起的名字；文件里声明的名字只在两者不同时作为副标题跟在说明后面。
 * 副标题只出现在说明文字里——徽标一行放不下两个字。
 */
function withDeclaredLabel(copy: RecommendationMatchCopy, detail: string, declaredLabel?: string): string {
  return declaredLabel
    ? recommendationMatchTemplate(copy, "{detail}（文件内名称：{label}）", { detail, label: declaredLabel })
    : detail;
}

function compareSourceSummaries(
  copy: RecommendationMatchCopy,
  left: VaultRecommendationSourceSummary,
  right: VaultRecommendationSourceSummary
): number {
  // 所有来源同级：只按符合程度排序，平级按来源名。来源类型不参与排序。折叠语言跟界面语言走。
  const rankDifference = summaryRank(left) - summaryRank(right);
  if (rankDifference) return rankDifference;
  return left.sourceLabel.localeCompare(right.sourceLabel, recommendationSortLocale(copy));
}

function summaryRank(summary: VaultRecommendationSourceSummary): number {
  if (summary.state === "full") return 0;
  if (summary.state === "core") return 1;
  if (summary.state === "close" || summary.state === "weapon_only") return 2;
  if (summary.state === "key_missing" || summary.state === "not_matched") return 3;
  return 4;
}

function isBetterSourceSummary(
  candidate: VaultRecommendationSourceSummary,
  current: VaultRecommendationSourceSummary
): boolean {
  const rankDifference = summaryRank(candidate) - summaryRank(current);
  if (rankDifference) return rankDifference < 0;
  if (candidate.matched !== current.matched) return candidate.matched > current.matched;
  if (candidate.available !== current.available) return candidate.available > current.available;
  return candidate.detail.length > current.detail.length;
}

// 来源显示名一律用来源自己的 label（导入时固化的来源名）。
// 这里只做「没有名字时」的兜底，不再按 sourceId 写死具体来源。
export function displayVaultRecommendationSourceLabel(copy: RecommendationMatchCopy, sourceLabel?: string): string {
  return sourceLabel?.trim() || recommendationMatchText(copy, "推荐来源");
}

// 卡片上的短名同样来自来源自己的 label，只做长度截断；不同来源必须能分辨。
function compactVaultRecommendationSourceLabel(sourceLabel: string): string {
  const compact = sourceLabel.replace(/推荐表|推荐/gu, "").trim() || sourceLabel.trim();
  return compact.length > 14 ? `${compact.slice(0, 14)}…` : compact;
}
