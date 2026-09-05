import type {
  RecommendationSourceMatch,
  RecommendationSourceSlotMatch
} from "@d2-tools/core/community-perks";

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
  return sourceId === "dim_voltron" || sourceId === "dim_wishlist";
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
