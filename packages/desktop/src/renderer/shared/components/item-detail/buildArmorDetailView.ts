import {
  buildArmorDetailViewModel,
  type ArmorDetailObjectContext,
  type ArmorDetailSources,
  type ArmorDetailViewModel,
  type ArmorRecommendation
} from "@d2-tools/app/items";
import type { ArmorStatSummary } from "@d2-tools/core/account/summary";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type {
  ArmorAcquisitionTarget,
  EquipmentTargetStore
} from "@d2-tools/core/targets/equipmentTargets";
import type { ArmorStatKey } from "@d2-tools/core/loadouts/analysis";
import type { SameNameItemSummary, SelectedItemDetail } from "../../hooks/useItemDetail";

export type BuildDesktopArmorDetailInput = {
  selectedItem: SelectedItemDetail;
  sameNameItems?: SameNameItemSummary[];
  context?: Partial<ArmorDetailObjectContext>;
  sources?: ArmorDetailSources;
  recommendations?: ArmorRecommendation[];
  currentStats?: ArmorStatSummary;
  localTargetRules?: LocalTargetRules;
  equipmentTargetStore?: EquipmentTargetStore;
};

export function buildArmorDetailView(input: BuildDesktopArmorDetailInput): ArmorDetailViewModel | null {
  const item = input.selectedItem;
  if (item.group_key !== "armor") return null;
  return buildArmorDetailViewModel({
    item,
    context: {
      kind: input.context?.kind ?? (item.instance_id ? "account_item" : "definition"),
      entry: input.context?.entry ?? (item.is_vault_item ? "vault" : item.instance_id ? "account" : "library"),
      ...input.context
    },
    sources: input.sources,
    recommendations: input.recommendations ?? (input.equipmentTargetStore
      ? buildEquipmentArmorRecommendations(input.equipmentTargetStore, item, input.currentStats ?? item.armor_stats)
      : buildArmorRecommendations(input.localTargetRules, input.currentStats ?? item.armor_stats)),
    current_stats: input.currentStats,
    same_hash_instances: input.sameNameItems
  });
}

function buildEquipmentArmorRecommendations(
  store: EquipmentTargetStore | undefined,
  item: SelectedItemDetail,
  stats: ArmorStatSummary | undefined
): ArmorRecommendation[] {
  return (store?.targets ?? []).flatMap((target) => {
    if (!target.enabled || target.kind !== "armor_acquisition") return [];
    if (target.class_type !== undefined && item.class_type !== target.class_type) return [];
    if (target.bucket_hash !== undefined && item.bucket_hash !== target.bucket_hash) return [];
    if (target.bucket_hash === undefined && target.bucket_name && item.bucket_name !== target.bucket_name) return [];
    const targetStats = target.stat_basis === "base"
      ? buildBaseArmorStats(item)
      : stats;
    const requirements = Object.entries(target.stat_requirements) as Array<[ArmorStatKey, number]>;
    const matchedCount = targetStats
      ? requirements.filter(([stat, minimum]) => targetStats[stat] >= minimum).length
      : 0;
    const totalMatched = target.minimum_total === undefined || Boolean(targetStats && targetStats.total >= target.minimum_total);
    const conditionCount = requirements.length + (target.minimum_total === undefined ? 0 : 1);
    const satisfiedCount = matchedCount + (target.minimum_total !== undefined && totalMatched ? 1 : 0);
    return [{
      id: target.id,
      title: target.name,
      value: [
        ...requirements.map(([stat, minimum]) => `${armorStatLabels[stat]} ${minimum}+`),
        target.minimum_total !== undefined ? `总值 ${target.minimum_total}+` : ""
      ].filter(Boolean).join(" · "),
      reason: target.planner_context
        ? `${target.source.label}；这里仅核对基础属性门槛，${formatPlannerIdentity(target.planner_context)}仍需回到 Armor Planner 复核。`
        : `${target.source.label}；只提供待刷目标证据，不会伪造装备 Hash 或自动修改装备。`,
      source_label: "我的推荐" as const,
      match: !targetStats
        ? undefined
        : satisfiedCount === conditionCount
          ? "full" as const
          : satisfiedCount > 0
            ? "partial" as const
            : "none" as const
    }];
  });
}

function buildBaseArmorStats(item: SelectedItemDetail): ArmorStatSummary | undefined {
  if (!item.armor_stat_breakdown) return undefined;
  return {
    health: item.armor_stat_breakdown.health.base,
    melee: item.armor_stat_breakdown.melee.base,
    grenade: item.armor_stat_breakdown.grenade.base,
    super: item.armor_stat_breakdown.super.base,
    class: item.armor_stat_breakdown.class.base,
    weapon: item.armor_stat_breakdown.weapon.base,
    total: item.armor_stat_breakdown.total.base
  };
}

function formatPlannerIdentity(
  context: NonNullable<ArmorAcquisitionTarget["planner_context"]>
): string {
  return [
    context.archetype_name,
    `${armorStatLabels[context.tertiary_stat]}第三属性`,
    context.tuning_label,
    context.set_name
  ].filter(Boolean).join(" · ");
}

function buildArmorRecommendations(
  rules: LocalTargetRules | undefined,
  stats: ArmorStatSummary | undefined
): ArmorRecommendation[] {
  return (rules?.armor ?? []).map((rule) => {
    const matchedCount = stats
      ? rule.conditions.filter((condition) => stats[condition.stat] >= condition.min).length
      : 0;
    return {
      id: rule.id,
      title: rule.name,
      value: rule.conditions.map((condition) => `${armorStatLabels[condition.stat]} ${condition.min}+`).join(" · "),
      reason: "来自你保存的护甲属性目标，不会自动修改装备。",
      source_label: "我的推荐" as const,
      match: !stats
        ? undefined
        : matchedCount === rule.conditions.length
          ? "full" as const
          : matchedCount > 0
            ? "partial" as const
            : "none" as const
    };
  });
}

const armorStatLabels: Record<ArmorStatKey, string> = {
  health: "生命值",
  melee: "近战",
  grenade: "手雷",
  super: "超能",
  class: "职业",
  weapon: "武器"
};
