import type { AccountItemSummary } from "../account/summary.js";
import type { VaultTags } from "../vault/tags.js";
import { scoreVaultItem, type VaultItemScore, type VaultScoreGrade } from "./scoring.js";

export type DuplicateItemRecommendation = VaultScoreGrade;

export type DuplicateItemEntry = {
  item_key: string;
  hash: number;
  name: string;
  instance_id?: string;
  locked?: boolean;
  tag?: string;
  score: VaultItemScore;
  recommendation: DuplicateItemRecommendation;
  roll_text: string;
};

export type DuplicateItemGroup = {
  group_key: string;
  name: string;
  hash?: number;
  count: number;
  items: DuplicateItemEntry[];
};

export type DuplicateAnalysisResult = {
  total_duplicate_groups: number;
  total_duplicate_items: number;
  groups: DuplicateItemGroup[];
};

export function analyzeDuplicateItems(items: AccountItemSummary[], tags: VaultTags): DuplicateAnalysisResult {
  const hashGroups = groupBy(items, (item) => `hash:${item.hash}`);
  const duplicateHashItems = new Set<AccountItemSummary>();
  const groups: DuplicateItemGroup[] = [];

  for (const [key, groupItems] of hashGroups) {
    if (groupItems.length > 1) {
      groupItems.forEach((item) => duplicateHashItems.add(item));
      groups.push(buildGroup(key, groupItems, tags, groupItems[0].hash));
    }
  }

  const remaining = items.filter((item) => !duplicateHashItems.has(item));
  const nameGroups = groupBy(remaining, (item) => `name:${normalizeName(item.name)}`);
  for (const [key, groupItems] of nameGroups) {
    if (groupItems.length > 1) {
      groups.push(buildGroup(key, groupItems, tags));
    }
  }

  const sortedGroups = groups.sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "zh-Hans-CN"));
  return {
    total_duplicate_groups: sortedGroups.length,
    total_duplicate_items: sortedGroups.reduce((sum, group) => sum + group.count, 0),
    groups: sortedGroups
  };
}

function buildGroup(groupKey: string, items: AccountItemSummary[], tags: VaultTags, hash?: number): DuplicateItemGroup {
  const entries = items
    .map((item) => {
      const key = itemKey(item);
      const score = scoreVaultItem(item, tags);
      return {
        item_key: key,
        hash: item.hash,
        name: item.name,
        instance_id: item.instance_id,
        locked: item.locked,
        tag: tags.items[key]?.tag,
        score,
        recommendation: recommendationFor(tags.items[key]?.tag, score.grade),
        roll_text: rollText(item)
      };
    })
    .sort((left, right) => right.score.score - left.score.score || left.name.localeCompare(right.name, "zh-Hans-CN"));

  return {
    group_key: groupKey,
    name: normalizeName(items[0]?.name ?? "未知装备"),
    hash,
    count: entries.length,
    items: entries
  };
}

function recommendationFor(tag: string | undefined, scoreGrade: VaultScoreGrade): DuplicateItemRecommendation {
  if (tag === "keep" || tag === "review" || tag === "junk") {
    return tag;
  }
  return scoreGrade;
}

function groupBy<T>(items: T[], keyFor: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFor(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function itemKey(item: AccountItemSummary): string {
  return item.instance_id ?? `hash:${item.hash}`;
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function rollText(item: AccountItemSummary): string {
  return item.socket_plugs
    .map((plug) => plug.name.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(" / ");
}
