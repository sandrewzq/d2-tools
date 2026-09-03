import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type {
  RecommendationSourceMatch,
  VaultItemInstanceMatchInfo
} from "@d2-tools/core/community-perks";

export type VaultRecommendationSourceSummary = {
  sourceId: string;
  sourceLabel: string;
  shortLabel: string;
  state: "full" | "partial" | "weapon_only" | "different" | "uncheckable";
  matched: number;
  available: number;
  unit: "item" | "combo";
  purposes: Array<"pve" | "pvp" | "general">;
  resultText: string;
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
    .filter((source) => (
      source.state !== "not_covered"
      && source.source_id !== "dim_voltron"
      && source.source_id !== "dim_wishlist"
    ))
    .map(sourceMatchSummary);
  // DIM 必须按完整愿望单组合核对。CSV 中为阅读汇总而展开的 dim_voltron
  // 候选池不能伪装成人工来源栏位，否则会把不同组合错误拼成 x/y。
  const dimSummary = instanceMatch?.dim_wishlist
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
  const missingRequirementCount = Math.max(0, match.best_requirement_count - match.best_matched_requirement_count);
  const isClose = match.matched_combo_count === 0 && match.best_matched_requirement_count > 0 && missingRequirementCount > 0;
  const state = match.matched_combo_count > 0
    ? "full" as const
    : match.uncheckable_combo_count === match.combo_count
      ? "uncheckable" as const
      : isClose
        ? "partial" as const
        : "different" as const;
  const text = match.matched_combo_count > 0
    ? `DIM：符合 ${match.matched_combo_count} 套推荐`
    : state === "uncheckable"
      ? "DIM：数据不完整"
      : isClose
        ? `DIM：接近推荐，还缺 ${missingRequirementCount} 项`
        : "DIM：未符合";
  return {
    sourceId: "dim_wishlist",
    sourceLabel: "DIM社区愿望单",
    shortLabel: "DIM",
    state,
    matched: match.matched_combo_count,
    available: match.combo_count,
    unit: "combo",
    purposes: match.modes,
    resultText: match.matched_combo_count > 0
      ? `符合 ${match.matched_combo_count} 套推荐`
      : state === "uncheckable"
        ? "数据不完整"
        : isClose
          ? `接近推荐 · 缺 ${missingRequirementCount} 项`
          : "未符合",
    text,
    detail: `DIM社区愿望单：${state === "uncheckable" ? "当前武器 Roll 数据不完整，暂时无法核对推荐组合" : match.matched_combo_count > 0 ? `符合 ${match.matched_combo_count} 套推荐组合` : isClose ? `最接近的一套还缺 ${missingRequirementCount} 项` : "当前 Roll 未符合推荐组合"}${state !== "uncheckable" && match.uncheckable_combo_count ? `；另有 ${match.uncheckable_combo_count} 套因 Roll 数据不完整未完成核对` : ""}。`
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
      shortLabel: shortSourceLabel,
      state: "weapon_only",
      matched: 0,
      available: 0,
      unit: "item",
      purposes: source.purposes,
      resultText: "仅推荐武器",
      text: `${shortSourceLabel}：仅推荐武器`,
      detail: `${sourceLabel}：来源推荐这把武器，但没有指定需要核对的 Perk 项。`
    };
  }
  const uncheckable = source.uncheckable_requirement_count
    ?? source.slots.filter((slot) => slot.state === "uncheckable").length;
  if (uncheckable > 0) {
    return {
      sourceId: source.source_id,
      sourceLabel,
      shortLabel: shortSourceLabel,
      state: "uncheckable",
      matched: source.matched_requirement_count,
      available: source.requirement_count,
      unit: "item",
      purposes: source.purposes,
      resultText: "数据不完整",
      text: `${shortSourceLabel}：数据不完整`,
      detail: `${sourceLabel}：当前武器 Roll 数据没有完整读取，暂时无法准确核对推荐项。`
    };
  }
  const isFullMatch = source.requirement_count > 0
    && source.matched_requirement_count === source.requirement_count;
  const hasAnyMatch = source.matched_requirement_count > 0;
  const resultText = isFullMatch
    ? "全部符合"
    : hasAnyMatch
      ? `符合 ${source.matched_requirement_count}/${source.requirement_count}`
      : "未符合";
  return {
    sourceId: source.source_id,
    sourceLabel,
    shortLabel: shortSourceLabel,
    state: isFullMatch ? "full" : hasAnyMatch ? "partial" : "different",
    matched: source.matched_requirement_count,
    available: source.requirement_count,
    unit: "item",
    purposes: source.purposes,
    resultText,
    text: `${shortSourceLabel}：${resultText}`,
    detail: `${sourceLabel}：${source.requirement_count} 项推荐中符合 ${source.matched_requirement_count} 项。`
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
      shortLabel: "DIM",
      state: "weapon_only",
      matched: 0,
      available: 0,
      unit: "combo",
      purposes: [...new Set(weaponOnlyRules.map((rule) => rule.mode))],
      resultText: "仅推荐武器",
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
  const missingRequirementCount = bestRule
    ? Math.max(0, bestRule.requirement_count - bestRule.matched_requirement_count)
    : 0;
  const isClose = Boolean(bestRule && bestRule.matched_requirement_count > 0 && missingRequirementCount > 0);
  const purposes = [...new Set((matchedRules.length ? matchedRules : rules).map((rule) => rule.mode))];
  if (!matched && weaponOnlyRules.length) {
    return {
      sourceId: "dim_voltron",
      sourceLabel: "DIM社区愿望单",
      shortLabel: "DIM",
      state: "weapon_only",
      matched: 0,
      available: comboRules.length,
      unit: "combo",
      purposes,
      resultText: "仅推荐武器",
      text: "DIM：仅推荐武器",
      detail: `DIM社区愿望单：来源推荐这把武器，但没有可用于当前 Roll 核对的完整推荐组合${isClose ? `；最接近的一套还缺 ${missingRequirementCount} 项` : ""}。`
    };
  }
  return {
    sourceId: "dim_voltron",
    sourceLabel: "DIM社区愿望单",
    shortLabel: "DIM",
    state: matched > 0 ? "full" : isClose ? "partial" : "different",
    matched,
    available: comboRules.length,
    unit: "combo",
    purposes,
    resultText: matched > 0 ? `符合 ${matched} 套推荐` : isClose ? `接近推荐 · 缺 ${missingRequirementCount} 项` : "未符合",
    text: matched > 0 ? `DIM：符合 ${matched} 套推荐` : isClose ? `DIM：接近推荐，还缺 ${missingRequirementCount} 项` : "DIM：未符合",
    detail: `DIM社区愿望单：${matched > 0 ? `符合 ${matched} 套推荐组合` : isClose ? `最接近的一套还缺 ${missingRequirementCount} 项` : "当前 Roll 未符合推荐组合"}。`
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
  if (summary.state === "full") return 0;
  if (summary.state === "partial" && summary.matched > 0) return 0;
  if (summary.state === "weapon_only") return 1;
  if (summary.state === "partial" || summary.state === "different") return 2;
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
