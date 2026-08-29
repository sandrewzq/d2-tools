import type { AccountItemSummary } from "../account/summary.js";
import type { VaultTags } from "../vault/tags.js";

export type DuplicateItemEntry = {
  item_key: string;
  hash: number;
  name: string;
  instance_id?: string;
  locked?: boolean;
  tag?: string;
  roll_text: string;
};

export type DuplicateGroupKind = "same_definition" | "same_display_name" | "same_armor_context";

export type DuplicateGroupItemType = "weapons" | "armor" | "equipment" | "other" | "mixed";

export type DuplicateItemGroup = {
  group_key: string;
  name: string;
  group_kind: DuplicateGroupKind;
  item_group: DuplicateGroupItemType;
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
      groups.push(buildGroup(key, groupItems, tags, groupItems[0].hash, "same_definition"));
    }
  }

  const remaining = items.filter((item) => !duplicateHashItems.has(item));
  const nameGroups = groupBy(remaining, (item) => `name:${normalizeName(item.name)}`);
  for (const [key, groupItems] of nameGroups) {
    if (groupItems.length > 1) {
      const sameArmorContext = groupItems.every((item) => item.group_key === "armor")
        && groupItems.every((item) => armorContextKey(item) === armorContextKey(groupItems[0]));
      groups.push(buildGroup(
        key,
        groupItems,
        tags,
        undefined,
        sameArmorContext ? "same_armor_context" : "same_display_name"
      ));
    }
  }

  const sortedGroups = groups.sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "zh-Hans-CN"));
  return {
    total_duplicate_groups: sortedGroups.length,
    total_duplicate_items: sortedGroups.reduce((sum, group) => sum + group.count, 0),
    groups: sortedGroups
  };
}

function buildGroup(
  groupKey: string,
  items: AccountItemSummary[],
  tags: VaultTags,
  hash?: number,
  groupKind: DuplicateGroupKind = hash === undefined ? "same_display_name" : "same_definition"
): DuplicateItemGroup {
  const entries = items
    .map((item) => {
      const key = itemKey(item);
      return {
        item_key: key,
        hash: item.hash,
        name: item.name,
        instance_id: item.instance_id,
        locked: item.locked,
        tag: tags.items[key]?.tag,
        roll_text: rollText(item)
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"));

  return {
    group_key: groupKey,
    name: normalizeName(items[0]?.name ?? "未知装备"),
    group_kind: groupKind,
    item_group: groupItemType(items),
    hash,
    count: entries.length,
    items: entries
  };
}

function groupItemType(items: AccountItemSummary[]): DuplicateGroupItemType {
  const groups = new Set(items.map((item) => item.group_key));
  return groups.size === 1 ? (items[0]?.group_key ?? "other") : "mixed";
}

function armorContextKey(item: AccountItemSummary): string {
  return [
    item.class_type === undefined ? "unknown-class" : String(item.class_type),
    item.bucket_hash === undefined ? "unknown-slot" : String(item.bucket_hash),
    item.armor_set?.hash === undefined ? "unknown-set" : String(item.armor_set.hash)
  ].join(":");
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
  if (item.group_key === "armor" && item.armor_stats) {
    return [
      `总值 ${item.armor_stats.total}`,
      `生命值 ${item.armor_stats.health}`,
      `职业 ${item.armor_stats.class}`,
      `手雷 ${item.armor_stats.grenade}`
    ].join(" / ");
  }

  return item.socket_plugs
    .map((plug) => plug.name.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(" / ");
}
