import {
  createDefaultArmorStatModSlotRules,
  type LoadoutPlanArmorConstraints,
  type LoadoutPlanArmorStatKey
} from "../loadouts/plans.js";
import type {
  BuildGuideLoadoutDraft,
  BuildGuideMatchResult,
  BuildGuideRequirement,
  GuideMatchedItem,
  GuideArmorConstraintDraft
} from "./guideSchema.js";

export function createBuildGuideLoadoutDraft(input: {
  match: BuildGuideMatchResult;
  characterId: string;
  fallbackName: string;
}): BuildGuideLoadoutDraft {
  const armorConstraintDraft = createBuildGuideArmorConstraintDraft(input.match);
  return {
    name: input.fallbackName.trim() || firstGuideLine(input.match.requirement.raw_text),
    character_id: input.characterId,
    class_name: input.match.requirement.class_name?.value,
    raw_text: input.match.requirement.raw_text,
    items: input.match.matched_items.filter((item) => item.status === "matched"),
    missing_requirements: input.match.missing_requirements,
    notes: [
      ...input.match.requirement.notes,
      ...input.match.needs_confirmation.map((item) => `待确认：${item}`)
    ],
    ...(armorConstraintDraft ? { armor_constraint_draft: armorConstraintDraft } : {})
  };
}

export function createBuildGuideArmorConstraintDraft(
  match: BuildGuideMatchResult
): GuideArmorConstraintDraft | undefined {
  return createGuideArmorConstraintDraftFromRequirement({
    requirement: match.requirement,
    matchedItems: match.matched_items,
    alternativeItems: match.alternative_items
  });
}

export function createGuideArmorConstraintDraftFromRequirement(input: {
  requirement: BuildGuideRequirement;
  matchedItems?: readonly GuideMatchedItem[];
  alternativeItems?: readonly GuideMatchedItem[];
}): GuideArmorConstraintDraft | undefined {
  const requirement = input.requirement;
  if (!requirement.armor_stats.length && !requirement.exotic_armor.length) return undefined;

  const statMinimums: Partial<Record<LoadoutPlanArmorStatKey, number>> = {};
  const priorityStats: LoadoutPlanArmorStatKey[] = [];
  const warnings: string[] = [];
  const confirmations: string[] = [];
  for (const target of requirement.armor_stats) {
    const normalized = normalizeGuideArmorStat(target.stat);
    if (!normalized) {
      warnings.push(`无法识别攻略护甲属性：${target.source_label ?? target.stat}`);
      continue;
    }
    const mapping = target.mapping ?? (isLegacyArmorStat(target.stat) ? "legacy-alias" : "direct");
    const sourceLabel = target.source_label ?? String(target.stat);
    statMinimums[normalized] = Math.max(statMinimums[normalized] ?? 0, normalizeMinimum(target.minimum));
    if (!priorityStats.includes(normalized)) priorityStats.push(normalized);
    if (mapping === "legacy-alias") {
      confirmations.push(
        `${sourceLabel} ${target.minimum} 使用旧属性语义，当前仅暂映射为${armorStatLabel(normalized)} ${normalizeMinimum(target.minimum)}`
      );
    } else if (target.confidence !== "high") {
      confirmations.push(`${armorStatLabel(normalized)} ${normalizeMinimum(target.minimum)} 的解析置信度为${confidenceLabel(target.confidence)}`);
    }
  }

  const matchedExotics = [...(input.matchedItems ?? []), ...(input.alternativeItems ?? [])].filter((item) => (
    item.group_key === "armor"
    && item.instance_id
    && requirement.exotic_armor.some((requirementItem) => namesOverlap(item.name, requirementItem.name))
  ));
  const fixedExotic = matchedExotics.length === 1 ? matchedExotics[0] : undefined;
  if (requirement.exotic_armor.length && !fixedExotic) {
    confirmations.push(matchedExotics.length > 1
      ? "攻略命中了多个异域护甲实例，需要在护甲规划中选择一个具体实例"
      : "攻略要求的异域护甲没有匹配到可确认实例，需要手动选择或保留为待刷目标");
  }
  warnings.push("攻略没有提供可确认的逐部位属性模组安排，五个部位保持自动，请在计算前复核。");

  const constraints: LoadoutPlanArmorConstraints = {
    planner_mode: fixedExotic || Object.keys(statMinimums).length ? "owned" : "acquisition",
    stat_minimums: statMinimums,
    priority_stats: priorityStats,
    fragment_stat_bonuses: {},
    five_point_mod_budget: 0,
    ten_point_mod_budget: 0,
    armor_stat_mod_slot_rules: createDefaultArmorStatModSlotRules(),
    ...(fixedExotic ? {
      exotic_item_hash: fixedExotic.hash,
      exotic_instance_id: fixedExotic.instance_id
    } : {}),
    locked_instance_ids: [],
    excluded_instance_ids: [],
    allowed_locations: ["equipped", "inventory", "vault", "postmaster"],
    set_constraint: { mode: "none" }
  };
  return {
    status: confirmations.length || warnings.length ? "needs_confirmation" : "ready",
    constraints,
    warnings,
    confirmations: uniqueStrings(confirmations)
  };
}

function firstGuideLine(rawText: string): string {
  return rawText.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "攻略配装";
}

function normalizeMinimum(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(500, Math.trunc(value)));
}

function armorStatLabel(stat: LoadoutPlanArmorStatKey): string {
  return {
    health: "生命值",
    melee: "近战",
    grenade: "手雷",
    super: "超能",
    class: "职业",
    weapon: "武器"
  }[stat];
}

function confidenceLabel(confidence: "high" | "medium" | "low"): string {
  if (confidence === "medium") return "中";
  if (confidence === "low") return "低";
  return "高";
}

function namesOverlap(left: string, right: string): boolean {
  const normalizedLeft = normalizeName(left);
  const normalizedRight = normalizeName(right);
  return normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeGuideArmorStat(
  stat: BuildGuideMatchResult["requirement"]["armor_stats"][number]["stat"]
): LoadoutPlanArmorStatKey | undefined {
  if (stat === "health" || stat === "melee" || stat === "grenade"
    || stat === "super" || stat === "class" || stat === "weapon") {
    return stat;
  }
  const legacyStatMapping: Record<
    Exclude<typeof stat, LoadoutPlanArmorStatKey>,
    LoadoutPlanArmorStatKey
  > = {
    mobility: "class",
    resilience: "health",
    recovery: "weapon",
    discipline: "grenade",
    intellect: "super",
    strength: "melee"
  };
  return legacyStatMapping[stat];
}

function isLegacyArmorStat(
  stat: BuildGuideMatchResult["requirement"]["armor_stats"][number]["stat"]
): boolean {
  return stat === "mobility" || stat === "resilience" || stat === "recovery"
    || stat === "discipline" || stat === "intellect" || stat === "strength";
}
