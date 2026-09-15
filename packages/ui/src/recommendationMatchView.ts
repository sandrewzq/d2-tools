/**
 * 推荐匹配投影层：唯一允许把匹配事实（VaultItemInstanceMatchInfo）派生成界面数字与文案的模块。
 * 仓库卡片、推荐筛选、武器详情、推荐来源和验收报告都从这里取结论；
 * 任何界面都不得自行比较插件 Hash 或名称，也不得自行截断来源列表。
 */

import type { RecommendationSourceSlotMatch } from "@d2-tools/core/community-perks";

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
  label: "符合" | "不符" | "无法判断" | "来源未要求";
  tone: "success" | "error" | "pending" | "neutral";
  instanceOwnedFallback: string;
  currentEnabledFallback: string;
};

export function isDimRecommendationSource(sourceId: string): boolean {
  return sourceId.startsWith("dim:");
}

export function presentRecommendationSlotMatch(
  state: RecommendationSourceSlotMatch["state"],
  facts: { hasInstanceOwned: boolean; hasCurrentEnabled: boolean }
): RecommendationSlotMatchPresentation {
  if (state === "match") {
    return {
      label: "符合",
      tone: "success",
      instanceOwnedFallback: "未返回可核对项",
      currentEnabledFallback: "未返回当前启用项"
    };
  }
  if (state === "different") {
    return {
      label: "不符",
      tone: "error",
      instanceOwnedFallback: facts.hasInstanceOwned ? "未返回可核对项" : "本版本无此栏位",
      currentEnabledFallback: facts.hasInstanceOwned || facts.hasCurrentEnabled
        ? "未返回当前启用项"
        : "本版本无此栏位"
    };
  }
  if (state === "uncheckable") {
    return {
      label: "无法判断",
      tone: "pending",
      instanceOwnedFallback: facts.hasInstanceOwned ? "该栏位数据不完整" : "未读取到该栏位",
      currentEnabledFallback: facts.hasCurrentEnabled ? "该栏位数据不完整" : "该栏位当前项未读取"
    };
  }
  return {
    label: "来源未要求",
    tone: "neutral",
    instanceOwnedFallback: "来源未要求核对",
    currentEnabledFallback: "来源未要求核对"
  };
}

export function presentCuratedRecommendationMatch(
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
      summary: "仅推荐武器 · 未指定 Roll",
      detail: `${sourceLabel}：来源推荐这把武器，但没有指定需要核对的 Roll。`,
      matchedRequirementCount: 0,
      requirementCount: 0,
      matchedPerkCount: 0,
      perkRequirementCount: 0,
      uncheckableRequirementCount: 0
    };
  }

  const perkText = perkSlots.length
    ? `Perk ${matchedPerkCount}/${perkSlots.length}`
    : "Perk 未要求";
  const pendingText = uncheckableRequirementCount > 0
    ? ` · ${uncheckableRequirementCount} 项无法判断`
    : "";
  const summary = `${perkText} · 完整 ${matchedRequirementCount}/${requirementCount}${pendingText}`;
  return {
    summary,
    detail: `${sourceLabel}：${summary}。同栏候选任选其一，不同栏位分别核对。`,
    matchedRequirementCount,
    requirementCount,
    matchedPerkCount,
    perkRequirementCount: perkSlots.length,
    uncheckableRequirementCount
  };
}

import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type {
  RecommendationCardDimSummary,
  RecommendationCardSourceSummary,
  RecommendationCardSummary,
  RecommendationSourceMatch,
  DimWishlistSourceInstanceMatch,
  VaultItemInstanceMatchInfo
} from "@d2-tools/core/community-perks";

export type VaultRecommendationSourceSummary = {
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

const dimRulesByWishlist = new WeakMap<DimWishlist, Map<number, DimWishlist["rules"]>>();
let cachedSummaryIndexInput: {
  instanceMatchMap?: ReadonlyMap<string, VaultItemInstanceMatchInfo>;
  cardSummaryMap?: ReadonlyMap<string, RecommendationCardSummary>;
  wishlist?: DimWishlist | null;
  itemSignatures: Map<string, string>;
  index: Map<string, VaultRecommendationSourceSummary[]>;
} | null = null;

export function getVaultCommunityInstanceKey(item: AccountItemSummary): string {
  return item.instance_id ?? `hash:${item.hash}`;
}

export function buildVaultRecommendationSourceSummaries(
  item: AccountItemSummary,
  instanceMatch?: VaultItemInstanceMatchInfo,
  wishlist?: DimWishlist | null,
  cardSummary?: RecommendationCardSummary
): VaultRecommendationSourceSummary[] {
  // 所有来源（含 DIM）都来自同一份来源事实，卡片不再有 DIM 专属汇总。
  const summaries = cardSummary
    ? cardSummary.sources.map(cardSourceSummary)
    : (instanceMatch?.source_matches ?? []).map(sourceMatchSummary);
  return summaries.sort(compareSourceSummaries);
}

export function buildVaultRecommendationSummaryIndex(
  items: readonly AccountItemSummary[],
  instanceMatchMap?: ReadonlyMap<string, VaultItemInstanceMatchInfo>,
  wishlist?: DimWishlist | null,
  cardSummaryMap?: ReadonlyMap<string, RecommendationCardSummary>
): Map<string, VaultRecommendationSourceSummary[]> {
  const weaponItems = items.filter((item) => item.group_key === "weapons");
  const itemSignatures = new Map(weaponItems.map((item) => {
    const instanceKey = getVaultCommunityInstanceKey(item);
    return [instanceKey, recommendationItemSignature(item)] as const;
  }));
  if (
    cachedSummaryIndexInput !== null
    && cachedSummaryIndexInput.instanceMatchMap === instanceMatchMap
    && cachedSummaryIndexInput.cardSummaryMap === cardSummaryMap
    && cachedSummaryIndexInput.wishlist === wishlist
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
        item,
        instanceMatchMap?.get(instanceKey),
        wishlist,
        cardSummaryMap?.get(instanceKey)
      )
    );
  }
  cachedSummaryIndexInput = { instanceMatchMap, cardSummaryMap, wishlist, itemSignatures, index };
  return index;
}

/**
 * Keep recommendation evidence aligned with the active source registry.
 *
 * The scan/card cache can outlive a source that was removed from management.
 * Callers that have an authoritative registry should filter the cached index
 * before using it for cards, facts, or source counts so a deleted source cannot
 * reappear through stale scan data.
 */
export function filterVaultRecommendationSummaryIndex(
  summaryIndex: VaultRecommendationSummaryIndex,
  allowedSourceIds: ReadonlySet<string>
): Map<string, VaultRecommendationSourceSummary[]> {
  const filtered = new Map<string, VaultRecommendationSourceSummary[]>();
  for (const [instanceKey, summaries] of summaryIndex) {
    const next = summaries.filter((summary) => (
      allowedSourceIds.has(canonicalVaultRecommendationSourceId(summary.sourceId))
    ));
    if (next.length) filtered.set(instanceKey, next);
  }
  return filtered;
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



function selectBestDimCombination<T extends {
  matched_requirement_count: number;
  requirement_count: number;
}>(rules: readonly T[]): T | undefined {
  return rules.reduce<T | undefined>((best, rule) => {
    if (!best) return rule;
    const ruleComplete = rule.requirement_count > 0
      && rule.matched_requirement_count === rule.requirement_count;
    const bestComplete = best.requirement_count > 0
      && best.matched_requirement_count === best.requirement_count;
    if (ruleComplete !== bestComplete) return ruleComplete ? rule : best;
    const ratioDifference = rule.matched_requirement_count * best.requirement_count
      - best.matched_requirement_count * rule.requirement_count;
    if (ratioDifference !== 0) return ratioDifference > 0 ? rule : best;
    if (rule.requirement_count !== best.requirement_count) {
      return rule.requirement_count > best.requirement_count ? rule : best;
    }
    return rule.matched_requirement_count > best.matched_requirement_count ? rule : best;
  }, undefined);
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
  const canonicalSourceId = canonicalVaultRecommendationSourceId(sourceId);
  const sourceSummaries = summaries.filter((candidate) => (
    canonicalVaultRecommendationSourceId(candidate.sourceId) === canonicalSourceId
  ));
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
  summaries: readonly VaultRecommendationSourceSummary[]
): VaultRecommendationSourceSummary[] {
  const summariesBySource = new Map<string, VaultRecommendationSourceSummary>();
  for (const summary of summaries) {
    const sourceId = canonicalVaultRecommendationSourceId(summary.sourceId);
    const current = summariesBySource.get(sourceId);
    if (!current || isBetterSourceSummary(summary, current)) {
      summariesBySource.set(sourceId, summary);
    }
  }
  return [...summariesBySource.values()].sort(compareSourceSummaries);
}

export function buildVaultRecommendationFilterFactIndex(
  summaryIndex: VaultRecommendationSummaryIndex
): Map<string, Map<string, VaultRecommendationFilterFact>> {
  const factIndex = new Map<string, Map<string, VaultRecommendationFilterFact>>();
  for (const [instanceKey, summaries] of summaryIndex) {
    const factsBySource = new Map<string, VaultRecommendationFilterFact>();
    for (const summary of selectVaultRecommendationSourceSummaries(summaries)) {
      const sourceId = canonicalVaultRecommendationSourceId(summary.sourceId);
      factsBySource.set(sourceId, recommendationFilterFactFromSummary(summary));
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
  return factIndex.get(instanceKey)?.get(canonicalVaultRecommendationSourceId(sourceId));
}

export function vaultRecommendationPrimaryFilterLabel(
  filter: VaultRecommendationPrimaryFilter,
  isDim: boolean
): string {
  if (filter === "all") return "全部";
  if (filter === "unrequired") return isDim ? "未指定组合" : "未要求";
  if (filter === "uncheckable") return "无法判断";
  if (filter === "uncovered") return "未收录";
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
  summaryGroups: ReadonlyArray<readonly VaultRecommendationSourceSummary[]>,
  managedSources: readonly VaultRecommendationManagedSourceOptionInput[] = [],
  managedSourcesAuthoritative = false
): VaultRecommendationSourceOption[] {
  const options = new Map<string, VaultRecommendationSourceOption>();
  const managedSourcesById = new Map(managedSources.map((source) => (
    [canonicalVaultRecommendationSourceId(source.source_key), source] as const
  )));
  for (const source of managedSources) {
    if (!source.configured || source.state !== "active") continue;
    const sourceId = canonicalVaultRecommendationSourceId(source.source_key);
    const sourceLabel = isDimRecommendationSource(sourceId)
      ? source.label || "DIM社区愿望单"
      : displayVaultRecommendationSourceLabel(sourceId, source.label);
    options.set(sourceId, {
      sourceId,
      sourceLabel,
      shortLabel: compactVaultRecommendationSourceLabel(sourceId, sourceLabel),
      count: 0
    });
  }
  for (const summaries of summaryGroups) {
    const summariesBySource = new Map(summaries.map((summary) => (
      [canonicalVaultRecommendationSourceId(summary.sourceId), summary] as const
    )));
    for (const summary of summariesBySource.values()) {
      const sourceId = canonicalVaultRecommendationSourceId(summary.sourceId);
      const managedSource = managedSourcesById.get(sourceId);
      if (managedSourcesAuthoritative && !managedSource) continue;
      if (managedSource && (!managedSource.configured || managedSource.state !== "active")) continue;
      const existing = options.get(sourceId);
      if (existing) {
        existing.count += 1;
      } else {
        const displaySourceLabel = displayVaultRecommendationSourceLabel(
          sourceId,
          isDimRecommendationSource(sourceId) ? "DIM社区愿望单" : summary.sourceLabel
        );
        options.set(sourceId, {
          sourceId,
          sourceLabel: displaySourceLabel,
          shortLabel: compactVaultRecommendationSourceLabel(sourceId, displaySourceLabel),
          count: 1
        });
      }
    }
  }
  // 所有来源同级：按来源名排序，不再按来源类型或写死顺序排权重。
  return [...options.values()].sort((left, right) => (
    left.sourceLabel.localeCompare(right.sourceLabel, "zh-Hans-CN")
  ));
}

export function canonicalVaultRecommendationSourceId(sourceId: string): string {
  if (sourceId.startsWith("dim:")) {
    const [, documentKey] = sourceId.split(":");
    return documentKey ? `dim:${documentKey}` : sourceId;
  }
  return sourceId;
}

export function vaultRecommendationResultLabel(result: VaultRecommendationResult): string {
  if (result === "matched") return "符合推荐";
  if (result === "partial") return "部分符合";
  if (result === "not_matched") return "未符合";
  if (result === "uncheckable") return "无法判断";
  return "无推荐";
}

export function vaultSourceRecommendationResultLabel(result: VaultRecommendationResult): string {
  if (result === "matched") return "符合推荐";
  if (result === "partial") return "部分符合";
  if (result === "not_matched") return "未符合";
  if (result === "uncheckable") return "无法判断";
  return "未收录";
}

export function formatRecommendationPurposes(
  purposes: Array<"pve" | "pvp" | "general">
): string {
  const unique = [...new Set(purposes)];
  return unique.length
    ? unique.map((purpose) => purpose === "pve" ? "PVE" : purpose === "pvp" ? "PVP" : "通用").join(" / ")
    : "用途未注明";
}

function sourceMatchSummary(source: RecommendationSourceMatch): VaultRecommendationSourceSummary {
  const sourceLabel = displayVaultRecommendationSourceLabel(source.source_id, source.source_label);
  const shortSourceLabel = compactVaultRecommendationSourceLabel(source.source_id, sourceLabel);
  const presentation = presentCuratedRecommendationMatch(source, sourceLabel);
  return {
    sourceId: source.source_id,
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
    text: `${shortSourceLabel}：${presentation.summary}`,
    detail: presentation.detail
  };
}

function cardSourceSummary(source: RecommendationCardSourceSummary): VaultRecommendationSourceSummary {
  const sourceLabel = displayVaultRecommendationSourceLabel(source.source_id, source.source_label);
  const shortSourceLabel = compactVaultRecommendationSourceLabel(source.source_id, sourceLabel);
  const resultText = source.state === "weapon_only" || source.requirement_count === 0
    ? "仅推荐武器 · 未指定 Roll"
    : `${source.perk_requirement_count > 0
        ? `Perk ${source.matched_perk_count}/${source.perk_requirement_count}`
        : "Perk 未要求"} · 完整 ${source.matched_requirement_count}/${source.requirement_count}${source.uncheckable_requirement_count > 0
          ? ` · ${source.uncheckable_requirement_count} 项无法判断`
          : ""}`;
  return {
    sourceId: source.source_id,
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
    text: `${shortSourceLabel}：${resultText}`,
    detail: source.state === "weapon_only" || source.requirement_count === 0
      ? `${sourceLabel}：来源推荐这把武器，但没有指定需要核对的 Roll。`
      : `${sourceLabel}：${resultText}。同栏候选任选其一，不同栏位分别核对。`
  };
}


function dimRulesForItemHash(wishlist: DimWishlist, itemHash: number): DimWishlist["rules"] {
  let rulesByItemHash = dimRulesByWishlist.get(wishlist);
  if (!rulesByItemHash) {
    rulesByItemHash = new Map<number, DimWishlist["rules"]>();
    wishlist.rules.forEach((rule) => {
      const existing = rulesByItemHash!.get(rule.item_hash);
      if (existing) existing.push(rule);
      else rulesByItemHash!.set(rule.item_hash, [rule]);
    });
    dimRulesByWishlist.set(wishlist, rulesByItemHash);
  }
  return rulesByItemHash.get(itemHash) ?? [];
}

function compareSourceSummaries(
  left: VaultRecommendationSourceSummary,
  right: VaultRecommendationSourceSummary
): number {
  const dimDifference = Number(isDimRecommendationSource(left.sourceId))
    - Number(isDimRecommendationSource(right.sourceId));
  if (dimDifference) return dimDifference;
  const rankDifference = summaryRank(left) - summaryRank(right);
  if (rankDifference) return rankDifference;
  return left.sourceLabel.localeCompare(right.sourceLabel, "zh-Hans-CN");
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

// 来源显示名一律用来源自己的 label（DIM 用愿望单标题，人工来源用导入时的推荐来源名）。
// 这里只做「没有名字时」的兜底，不再按 sourceId 写死具体来源。
export function displayVaultRecommendationSourceLabel(_sourceId: string, sourceLabel?: string): string {
  return sourceLabel?.trim() || "推荐来源";
}

// 卡片上的短名同样来自来源自己的 label，只做长度截断；不同来源必须能分辨。
function compactVaultRecommendationSourceLabel(_sourceId: string, sourceLabel: string): string {
  const compact = sourceLabel.replace(/推荐表|推荐/gu, "").trim() || sourceLabel.trim();
  return compact.length > 14 ? `${compact.slice(0, 14)}…` : compact;
}
