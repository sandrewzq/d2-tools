import type { AccountItemSummary } from "../account/summary.js";
import type { LoadoutTemplate, LoadoutTemplateItem } from "./templates.js";

export type LoadoutTemplateAnalysis = {
  equipped: LoadoutTemplateItem[];
  missing: LoadoutTemplateItem[];
  warnings: string[];
};

export type ArmorStatKey = "mobility" | "resilience" | "recovery" | "discipline" | "intellect" | "strength";

export type ArmorStatItem = {
  item_key: string;
  name: string;
  bucket_name: string;
  stats: Record<ArmorStatKey, number>;
};

export type ArmorStatSuggestion = {
  score: number;
  total_stats: Record<ArmorStatKey, number>;
  items: ArmorStatItem[];
};

const armorBuckets = ["头盔", "臂铠", "胸甲", "腿甲", "职业物品"];
const statKeys: ArmorStatKey[] = ["mobility", "resilience", "recovery", "discipline", "intellect", "strength"];

export function analyzeLoadoutTemplate(
  template: LoadoutTemplate,
  availableItems: AccountItemSummary[]
): LoadoutTemplateAnalysis {
  const availableKeys = new Set(availableItems.map((item) => item.instance_id ?? `hash:${item.hash}`));
  const equipped = template.items.filter((item) => availableKeys.has(item.instance_id ?? `hash:${item.hash}`));
  const missing = template.items.filter((item) => !availableKeys.has(item.instance_id ?? `hash:${item.hash}`));
  const warnings: string[] = [];

  if (missing.length) {
    warnings.push(`缺失 ${missing.length} 件模板装备，应用前需要先找回或替换。`);
  }

  return {
    equipped,
    missing,
    warnings
  };
}

export function suggestArmorStatSets(
  items: ArmorStatItem[],
  options: { preferred_stats: ArmorStatKey[]; limit?: number }
): ArmorStatSuggestion[] {
  const grouped = armorBuckets.map((bucket) => items.filter((item) => item.bucket_name === bucket));
  if (grouped.some((bucketItems) => bucketItems.length === 0)) {
    return [];
  }

  let suggestions: ArmorStatSuggestion[] = [{ score: 0, total_stats: emptyStats(), items: [] }];
  for (const bucketItems of grouped) {
    const next: ArmorStatSuggestion[] = [];
    for (const suggestion of suggestions) {
      for (const item of bucketItems) {
        const totalStats = addStats(suggestion.total_stats, item.stats);
        next.push({
          items: [...suggestion.items, item],
          total_stats: totalStats,
          score: scoreStats(totalStats, options.preferred_stats)
        });
      }
    }
    suggestions = next
      .sort((left, right) => right.score - left.score)
      .slice(0, Math.max(options.limit ?? 5, 1) * 5);
  }

  return suggestions
    .sort((left, right) => right.score - left.score)
    .slice(0, options.limit ?? 5);
}

function emptyStats(): Record<ArmorStatKey, number> {
  return {
    mobility: 0,
    resilience: 0,
    recovery: 0,
    discipline: 0,
    intellect: 0,
    strength: 0
  };
}

function addStats(
  left: Record<ArmorStatKey, number>,
  right: Record<ArmorStatKey, number>
): Record<ArmorStatKey, number> {
  const result = emptyStats();
  for (const key of statKeys) {
    result[key] = left[key] + right[key];
  }
  return result;
}

function scoreStats(stats: Record<ArmorStatKey, number>, preferredStats: ArmorStatKey[]): number {
  return preferredStats.reduce((sum, key) => sum + stats[key], 0);
}
