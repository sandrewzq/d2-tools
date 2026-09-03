import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type {
  RecommendationSourceMatch,
  VaultItemInstanceMatchInfo
} from "@d2-tools/core/community-perks";

export type VaultRecommendationSourceSummary = {
  sourceId: string;
  sourceLabel: string;
  state: "matched" | "weapon_only" | "different" | "uncheckable";
  matched: number;
  available: number;
  unit: "item" | "combo";
  purposes: Array<"pve" | "pvp" | "general">;
  text: string;
  detail: string;
};

export type VaultRecommendationSummaryIndex = ReadonlyMap<
  string,
  VaultRecommendationSourceSummary[]
>;

const sourceOrder = new Map([
  ["aegis", 0],
  ["lgpig", 1],
  ["yxcrallxy", 2],
  ["sayalarry", 3],
  ["dim_voltron", 4],
  ["dim_wishlist", 4]
]);
const dimRulesByWishlist = new WeakMap<DimWishlist, Map<number, DimWishlist["rules"]>>();

export function getVaultCommunityInstanceKey(item: AccountItemSummary): string {
  return item.instance_id ?? `hash:${item.hash}`;
}

export function buildVaultRecommendationSourceSummaries(
  item: AccountItemSummary,
  instanceMatch?: VaultItemInstanceMatchInfo,
  wishlist?: DimWishlist | null
): VaultRecommendationSourceSummary[] {
  const summaries = (instanceMatch?.source_matches ?? [])
    .filter((source) => source.state !== "not_covered")
    .map(sourceMatchSummary);
  const dimSummary = summaries.some((summary) => summary.sourceId === "dim_voltron" || summary.sourceId === "dim_wishlist")
    ? undefined
    : instanceMatch?.dim_wishlist
      ? buildDimInstanceSummary(instanceMatch.dim_wishlist)
      : buildDimWishlistSummary(item, wishlist);
  if (dimSummary) summaries.push(dimSummary);
  return summaries.sort(compareSourceSummaries);
}

export function buildVaultRecommendationSummaryIndex(
  items: readonly AccountItemSummary[],
  instanceMatchMap?: ReadonlyMap<string, VaultItemInstanceMatchInfo>,
  wishlist?: DimWishlist | null
): Map<string, VaultRecommendationSourceSummary[]> {
  const index = new Map<string, VaultRecommendationSourceSummary[]>();
  for (const item of items) {
    if (item.group_key !== "weapons") continue;
    const instanceKey = getVaultCommunityInstanceKey(item);
    index.set(
      instanceKey,
      buildVaultRecommendationSourceSummaries(item, instanceMatchMap?.get(instanceKey), wishlist)
    );
  }
  return index;
}

function buildDimInstanceSummary(
  match: NonNullable<VaultItemInstanceMatchInfo["dim_wishlist"]>
): VaultRecommendationSourceSummary {
  const state = match.matched_combo_count > 0
    ? "matched" as const
    : match.uncheckable_combo_count === match.combo_count
      ? "uncheckable" as const
      : "different" as const;
  const bestProgress = match.best_requirement_count > 0
    ? `${match.best_matched_requirement_count}/${match.best_requirement_count} Perk`
    : "无法确认 Perk 数";
  const text = match.matched_combo_count > 0
    ? `DIM：命中 ${match.matched_combo_count} 组`
    : state === "uncheckable"
      ? "DIM：Roll 数据异常"
      : `DIM：未命中 · 最接近 ${bestProgress}`;
  return {
    sourceId: "dim_wishlist",
    sourceLabel: "DIM社区愿望单",
    state,
    matched: match.matched_combo_count,
    available: match.combo_count,
    unit: "combo",
    purposes: match.modes,
    text,
    detail: `DIM社区愿望单：${state === "uncheckable" ? "当前武器 Roll 数据异常，无法完成组合对照" : match.matched_combo_count > 0 ? `命中 ${match.matched_combo_count} 组` : `没有完整命中，最接近组合符合 ${bestProgress}`}${state !== "uncheckable" && match.uncheckable_combo_count ? `；另有 ${match.uncheckable_combo_count} 组因 Roll 数据异常未完成对照` : ""}。`
  };
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
  return summary.state === "weapon_only" || summary.matched > 0;
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
  if (source.state === "weapon_only") {
    return {
      sourceId: source.source_id,
      sourceLabel,
      state: "weapon_only",
      matched: 0,
      available: 0,
      unit: "item",
      purposes: source.purposes,
      text: `${shortSourceLabel}：仅推荐武器`,
      detail: `${sourceLabel}：来源推荐这把武器，但没有指定需要核对的 Perk 栏位。`
    };
  }
  const uncheckable = source.uncheckable_requirement_count
    ?? source.slots.filter((slot) => slot.state === "uncheckable").length;
  if (uncheckable > 0) {
    return {
      sourceId: source.source_id,
      sourceLabel,
      state: "uncheckable",
      matched: source.matched_requirement_count,
      available: source.requirement_count,
      unit: "item",
      purposes: source.purposes,
      text: `${shortSourceLabel}：Roll 数据异常`,
      detail: `${sourceLabel}：当前武器 Roll 数据没有完整读取，暂不显示可能误导的栏位计数。`
    };
  }
  return {
    sourceId: source.source_id,
    sourceLabel,
    state: source.matched_requirement_count > 0 ? "matched" : "different",
    matched: source.matched_requirement_count,
    available: source.requirement_count,
    unit: "item",
    purposes: source.purposes,
    text: `${shortSourceLabel}：${source.matched_requirement_count}/${source.requirement_count} 栏符合`,
    detail: `${sourceLabel}：${source.matched_requirement_count}/${source.requirement_count} 个推荐栏位符合。`
  };
}

function buildDimWishlistSummary(
  item: AccountItemSummary,
  wishlist?: DimWishlist | null
): VaultRecommendationSourceSummary | undefined {
  if (!wishlist || item.group_key !== "weapons") return undefined;
  const rules = dimRulesForItemHash(wishlist, item.hash);
  if (!rules.length) return undefined;
  const comboRules = rules.filter((rule) => rule.perk_hashes.length > 0);
  const weaponOnlyRules = rules.filter((rule) => rule.perk_hashes.length === 0);
  if (!comboRules.length) {
    return {
      sourceId: "dim_voltron",
      sourceLabel: "DIM社区愿望单",
      state: "weapon_only",
      matched: 0,
      available: 0,
      unit: "combo",
      purposes: [...new Set(weaponOnlyRules.map((rule) => rule.mode))],
      text: "DIM：仅推荐武器",
      detail: "DIM社区愿望单：来源推荐这把武器，但没有指定需要核对的 Perk 组合。"
    };
  }
  const ownedHashes = new Set([
    ...(item.weapon_roll?.sockets.flatMap((socket) => socket.owned_plugs.map((plug) => plug.hash)) ?? []),
    ...(item.socket_plugs ?? []).map((plug) => plug.hash)
  ]);
  const ruleProgress = comboRules.map((rule) => ({
    rule,
    matched_requirement_count: rule.perk_hashes.reduce(
      (count, hash) => count + (ownedHashes.has(hash) ? 1 : 0),
      0
    ),
    requirement_count: rule.perk_hashes.length
  }));
  const matchedRules = ruleProgress
    .filter((progress) => progress.matched_requirement_count === progress.requirement_count)
    .map((progress) => progress.rule);
  const matched = matchedRules.length;
  const bestRule = selectBestDimCombination(ruleProgress);
  const bestProgress = bestRule
    ? `${bestRule.matched_requirement_count}/${bestRule.requirement_count} Perk`
    : "无法确认 Perk 数";
  const purposes = [...new Set((matchedRules.length ? matchedRules : rules).map((rule) => rule.mode))];
  if (!matched && weaponOnlyRules.length) {
    return {
      sourceId: "dim_voltron",
      sourceLabel: "DIM社区愿望单",
      state: "weapon_only",
      matched: 0,
      available: comboRules.length,
      unit: "combo",
      purposes,
      text: `DIM：仅推荐武器 · 最接近 ${bestProgress}`,
      detail: `DIM社区愿望单：来源推荐这把武器；当前实例未完整命中 Perk 组合，最接近组合符合 ${bestProgress}。`
    };
  }
  return {
    sourceId: "dim_voltron",
    sourceLabel: "DIM社区愿望单",
    state: matched > 0 ? "matched" : "different",
    matched,
    available: comboRules.length,
    unit: "combo",
    purposes,
    text: matched > 0 ? `DIM：命中 ${matched} 组` : `DIM：未命中 · 最接近 ${bestProgress}`,
    detail: `DIM社区愿望单：${matched > 0 ? `命中 ${matched} 组` : `当前实例未完整命中，最接近组合符合 ${bestProgress}`}。`
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
  const rankDifference = summaryRank(left) - summaryRank(right);
  if (rankDifference) return rankDifference;
  const sourceDifference = (sourceOrder.get(left.sourceId) ?? 99) - (sourceOrder.get(right.sourceId) ?? 99);
  if (sourceDifference) return sourceDifference;
  return left.sourceLabel.localeCompare(right.sourceLabel, "zh-Hans-CN");
}

function summaryRank(summary: VaultRecommendationSourceSummary): number {
  if (summary.state === "matched") return 0;
  if (summary.state === "weapon_only") return 1;
  if (summary.state === "different") return 2;
  return 3;
}

export function displayVaultRecommendationSourceLabel(sourceId: string, sourceLabel?: string): string {
  if (sourceId === "aegis") return "Aegis推荐";
  if (sourceId === "lgpig") return "LGpig推荐";
  if (sourceId === "yxcrallxy") return "YXCRALLXY推荐表";
  if (sourceId === "sayalarry") return "Sayalarry推荐表";
  if (sourceId === "dim_voltron" || sourceId === "dim_wishlist") return "DIM社区愿望单";
  return sourceLabel || sourceId || "推荐来源";
}

function compactVaultRecommendationSourceLabel(sourceId: string, sourceLabel: string): string {
  if (sourceId === "aegis") return "Aegis";
  if (sourceId === "lgpig") return "LGpig";
  if (sourceId === "yxcrallxy") return "YXCRALLXY";
  if (sourceId === "sayalarry") return "Sayalarry";
  if (sourceId === "dim_voltron" || sourceId === "dim_wishlist") return "DIM";
  return sourceLabel.replace(/推荐表|推荐|社区愿望单/gu, "") || sourceLabel;
}
