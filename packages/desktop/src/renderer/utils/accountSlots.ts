import type { AccountItemSummary } from "../api/client";

export type AccountSlotCategoryKey = "weapons" | "armor" | "equipment" | "other";

export type AccountSlotGroup = {
  key: string;
  label: string;
  category: AccountSlotCategoryKey;
  items: AccountItemSummary[];
};

export type AccountSlotCategory = {
  key: AccountSlotCategoryKey;
  label: string;
  groups: AccountSlotGroup[];
  count: number;
};

const categoryLabels: Record<AccountSlotCategoryKey, string> = {
  weapons: "武器",
  armor: "护甲",
  equipment: "装备",
  other: "其他"
};

const categoryOrder: AccountSlotCategoryKey[] = ["weapons", "armor", "equipment", "other"];

const bucketOrder = [
  "动能武器",
  "能量武器",
  "威能武器",
  "头盔",
  "臂铠",
  "胸甲",
  "腿甲",
  "职业物品",
  "职业分支",
  "机灵",
  "飞船",
  "载具",
  "徽标",
  "公会战旗",
  "终结技",
  "动作"
];

const otherGroupOrder = [
  "记忆水晶",
  "任务与追踪",
  "材料与货币",
  "消耗品",
  "模组与外观",
  "收藏与纪念",
  "未识别物品"
];

export function groupAccountItemsBySlot(items: AccountItemSummary[]): AccountSlotCategory[] {
  const groups = new Map<string, AccountSlotGroup>();

  for (const item of items) {
    const label = getAccountItemSlotLabel(item);
    const category = categoryForItem(item);
    const key = `${category}:${label}`;
    const group = groups.get(key) ?? {
      key,
      label,
      category,
      items: []
    };
    group.items.push(item);
    groups.set(key, group);
  }

  const sortedGroups = [...groups.values()].sort(compareSlotGroups);
  return categoryOrder
    .map((key) => {
      const categoryGroups = sortedGroups.filter((group) => group.category === key);
      return {
        key,
        label: categoryLabels[key],
        groups: categoryGroups,
        count: categoryGroups.reduce((sum, group) => sum + group.items.length, 0)
      };
    })
    .filter((category) => category.groups.length > 0);
}

export function getAccountItemSlotLabel(item: AccountItemSummary): string {
  return item.bucket_name?.trim() || inferOtherSlotName(item);
}

function categoryForItem(item: AccountItemSummary): AccountSlotCategoryKey {
  if (item.group_key === "weapons" || item.group_key === "armor" || item.group_key === "equipment") {
    return item.group_key;
  }
  return "other";
}

function compareSlotGroups(left: AccountSlotGroup, right: AccountSlotGroup): number {
  return slotRank(left.label) - slotRank(right.label)
    || categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category)
    || left.label.localeCompare(right.label, "zh-Hans-CN");
}

function slotRank(label: string): number {
  const index = bucketOrder.indexOf(label);
  if (index !== -1) return index;

  const otherIndex = otherGroupOrder.indexOf(label);
  return otherIndex === -1 ? 999 : 100 + otherIndex;
}

function inferOtherSlotName(item: AccountItemSummary): string {
  const type = item.item_type?.trim() ?? "";
  const name = item.name.trim();
  const text = `${type} ${name}`.toLowerCase();

  if (name.includes("记忆水晶") || text.includes("engram")) {
    return "记忆水晶";
  }
  if (includesAny(text, ["任务", "悬赏", "追踪", "证章", "行动", "召唤", "quest", "bounty"])) {
    return "任务与追踪";
  }
  if (includesAny(text, ["货币", "材料", "核心", "硬币", "水晶", "碎片", "currency", "material"])) {
    return "材料与货币";
  }
  if (includesAny(text, ["消耗品", "加成", "礼物", "钥匙", "consumable", "boost", "gift", "key"])) {
    return "消耗品";
  }
  if (includesAny(text, ["模组", "着色器", "皮肤", "投影", "mod", "shader", "ornament", "projection"])) {
    return "模组与外观";
  }
  if (includesAny(text, ["传承", "信条", "纪念", "收藏", "legacy", "collectible", "memento"])) {
    return "收藏与纪念";
  }
  return "未识别物品";
}

function includesAny(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern));
}
