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
import {
  armorStatLabel,
  itemDetailTemplate,
  itemDetailText,
  type ItemDetailCopy
} from "@d2-tools/ui";

export type BuildDesktopArmorDetailInput = {
  copy: ItemDetailCopy;
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
      ? buildEquipmentArmorRecommendations(input.equipmentTargetStore, item, input.currentStats ?? item.armor_stats, input.copy)
      : buildArmorRecommendations(input.localTargetRules, input.currentStats ?? item.armor_stats, input.copy)),
    current_stats: input.currentStats,
    same_hash_instances: input.sameNameItems
  });
}

function buildEquipmentArmorRecommendations(
  store: EquipmentTargetStore | undefined,
  item: SelectedItemDetail,
  stats: ArmorStatSummary | undefined,
  copy: ItemDetailCopy
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
        ...requirements.map(([stat, minimum]) => itemDetailTemplate(copy, "{stat} {value}+", {
          stat: armorStatLabel(copy, stat),
          value: minimum
        })),
        target.minimum_total !== undefined
          ? itemDetailTemplate(copy, "总值 {value}+", { value: target.minimum_total })
          : ""
      ].filter(Boolean).join(" · "),
      reason: target.planner_context
        ? itemDetailTemplate(copy, "{source}；这里仅核对基础属性门槛，{identity}仍需回到 Armor Planner 复核。", {
          source: target.source.label,
          identity: formatPlannerIdentity(target.planner_context, copy)
        })
        : itemDetailTemplate(copy, "{source}；只提供待刷目标证据，不会伪造装备 Hash 或自动修改装备。", {
          source: target.source.label
        }),
      source_label: target.source.label,
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
  context: NonNullable<ArmorAcquisitionTarget["planner_context"]>,
  copy: ItemDetailCopy
): string {
  return [
    context.archetype_name,
    itemDetailTemplate(copy, "{stat}第三属性", { stat: armorStatLabel(copy, context.tertiary_stat) }),
    context.tuning_label,
    context.set_name
  ].filter(Boolean).join(" · ");
}

function buildArmorRecommendations(
  rules: LocalTargetRules | undefined,
  stats: ArmorStatSummary | undefined,
  copy: ItemDetailCopy
): ArmorRecommendation[] {
  return (rules?.armor ?? []).map((rule) => {
    const matchedCount = stats
      ? rule.conditions.filter((condition) => stats[condition.stat] >= condition.min).length
      : 0;
    return {
      id: rule.id,
      title: rule.name,
      value: rule.conditions.map((condition) => itemDetailTemplate(copy, "{stat} {value}+", {
        stat: armorStatLabel(copy, condition.stat),
        value: condition.min
      })).join(" · "),
      reason: itemDetailText(copy, "来自你保存的护甲属性目标，不会自动修改装备。"),
      source_label: itemDetailText(copy, "本地目标规则"),
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
