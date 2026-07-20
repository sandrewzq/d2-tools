import {
  buildArmorDetailViewModel,
  type ArmorDetailObjectContext,
  type ArmorDetailSources,
  type ArmorDetailViewModel,
  type ArmorRecommendation
} from "@d2-tools/app/items";
import type { ArmorStatSummary } from "@d2-tools/core/account/summary";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
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
    recommendations: input.recommendations ?? buildArmorRecommendations(input.localTargetRules, input.currentStats ?? item.armor_stats),
    current_stats: input.currentStats,
    same_hash_instances: input.sameNameItems
  });
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
