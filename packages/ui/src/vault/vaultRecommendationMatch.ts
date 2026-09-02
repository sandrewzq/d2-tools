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

const sourceOrder = new Map([
  ["aegis", 0],
  ["lgpig", 1],
  ["yxcrallxy", 2],
  ["sayalarry", 3],
  ["dim_voltron", 4],
  ["dim_wishlist", 4]
]);

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

function buildDimInstanceSummary(
  match: NonNullable<VaultItemInstanceMatchInfo["dim_wishlist"]>
): VaultRecommendationSourceSummary {
  const state = match.uncheckable_combo_count > 0 && match.matched_combo_count === 0
    ? "uncheckable" as const
    : match.matched_combo_count > 0
      ? "matched" as const
      : "different" as const;
  return {
    sourceId: "dim_wishlist",
    sourceLabel: "DIM社区愿望单",
    state,
    matched: match.matched_combo_count,
    available: match.combo_count,
    unit: "combo",
    purposes: match.modes,
    text: state === "uncheckable" ? "DIM社区愿望单 无法核对" : `DIM社区愿望单 ${match.matched_combo_count}/${match.combo_count}组`,
    detail: state === "uncheckable"
      ? `DIM社区愿望单：${match.uncheckable_combo_count}/${match.combo_count} 组因实例 Roll 或特殊插槽无法完整核对。`
      : `DIM社区愿望单：${match.matched_combo_count}/${match.combo_count} 组组合符合${match.partial_combo_count ? `，${match.partial_combo_count} 组部分符合` : ""}。`
  };
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
  if (source.state === "weapon_only") {
    return {
      sourceId: source.source_id,
      sourceLabel,
      state: "weapon_only",
      matched: 0,
      available: 0,
      unit: "item",
      purposes: source.purposes,
      text: `${sourceLabel} 仅推荐武器`,
      detail: `${sourceLabel}：来源推荐这把武器，但没有指定需要核对的 Perk 栏位。`
    };
  }
  if (source.state === "uncheckable") {
    return {
      sourceId: source.source_id,
      sourceLabel,
      state: "uncheckable",
      matched: source.matched_requirement_count,
      available: source.requirement_count,
      unit: "item",
      purposes: source.purposes,
      text: `${sourceLabel} 无法核对`,
      detail: `${sourceLabel}：已确认 ${source.matched_requirement_count}/${source.requirement_count} 项，其余要求存在无法核对的数据。`
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
    text: `${sourceLabel} ${source.matched_requirement_count}/${source.requirement_count}`,
    detail: `${sourceLabel}：${source.matched_requirement_count}/${source.requirement_count} 项符合。`
  };
}

function buildDimWishlistSummary(
  item: AccountItemSummary,
  wishlist?: DimWishlist | null
): VaultRecommendationSourceSummary | undefined {
  if (!wishlist || item.group_key !== "weapons") return undefined;
  const rules = wishlist.rules.filter((rule) => rule.item_hash === item.hash);
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
      text: "DIM社区愿望单 仅推荐武器",
      detail: "DIM社区愿望单：来源推荐这把武器，但没有指定需要核对的 Perk 组合。"
    };
  }
  const ownedHashes = new Set([
    ...(item.weapon_roll?.sockets.flatMap((socket) => socket.owned_plugs.map((plug) => plug.hash)) ?? []),
    ...(item.socket_plugs ?? []).map((plug) => plug.hash)
  ]);
  const matchedRules = comboRules.filter((rule) => rule.perk_hashes.every((hash) => ownedHashes.has(hash)));
  const matched = matchedRules.length;
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
      text: "DIM社区愿望单 仅推荐武器",
      detail: `DIM社区愿望单：来源推荐这把武器；另有 ${comboRules.length} 组 Perk 组合，当前实例均未符合。`
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
    text: `DIM社区愿望单 ${matched}/${comboRules.length}组`,
    detail: `DIM社区愿望单：${matched}/${comboRules.length} 组组合符合。`
  };
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
