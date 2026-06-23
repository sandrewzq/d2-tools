import { evaluateWishlistRoll } from "@d2-tools/core/analysis/wishlist";
import type {
  AccountItemSummary,
  AmmoTypeKey,
  ArmorStatKey,
  DimWishlist,
  EquipmentGroupKey,
  VaultTags,
  VaultTagValue
} from "../../api/client";
import { getAccountItemSlotLabel } from "../../utils/accountSlots";
import { getVaultItemKey } from "./vaultSelection";

export type VaultGroupFilter = EquipmentGroupKey | "all";
export type VaultSlotFilter = string | "all";
export type VaultAmmoFilter = AmmoTypeKey | "all";
export type VaultArmorStatFilter = ArmorStatKey | "total" | "all";
export type VaultSortKey = "name" | "group" | "tier" | "power" | "armor-total" | ArmorStatKey;
export type VaultTagFilter = Exclude<VaultTagValue, "none"> | "all" | "untagged" | "noted" | "wishlist";
export type VaultLockFilter = "all" | "locked" | "unlocked";
export type VaultViewMode = "list" | "duplicates";

export type VaultArmorStatRule = {
  stat: ArmorStatKey | "";
  min: string;
};

export type VaultFilter = {
  group: VaultGroupFilter;
  query: string;
  tag?: VaultTagFilter;
  lock?: VaultLockFilter;
  slot?: VaultSlotFilter;
  ammo?: VaultAmmoFilter;
  armorStatRules?: VaultArmorStatRule[];
  frames?: string[];
  tags?: VaultTags;
  wishlist?: DimWishlist | null;
};

type ParsedVaultQuery = {
  text: string;
  tag?: VaultTagFilter;
  locked?: boolean;
  type?: VaultGroupFilter;
};

export type VaultGroupSummary = {
  key: VaultGroupFilter;
  label: string;
  count: number;
};

export type VaultSlotSummary = {
  key: VaultSlotFilter;
  label: string;
  count: number;
};

export type VaultSection = {
  key: string;
  label: string;
  count: number;
  items: AccountItemSummary[];
};

export const vaultGroupLabels: Record<VaultGroupFilter, string> = {
  all: "全部",
  weapons: "武器",
  armor: "护甲",
  equipment: "装备",
  other: "其他"
};

export const vaultGroupOrder: VaultGroupFilter[] = ["all", "weapons", "armor", "equipment", "other"];
export const defaultVaultGroupTab: VaultGroupFilter = "weapons";
export const tagLabels: Record<VaultTagFilter, string> = {
  all: "全部标记",
  keep: "保留",
  review: "关注",
  junk: "可清理",
  untagged: "未标记",
  noted: "有备注",
  wishlist: "DIM 愿望单"
};
export const sortLabels: Record<VaultSortKey, string> = {
  name: "按名称",
  group: "按分组",
  tier: "按品质",
  power: "按光等",
  "armor-total": "按护甲总值",
  health: "按生命值",
  melee: "按近战",
  grenade: "按手雷",
  super: "按超能",
  class: "按职业",
  weapon: "按武器"
};
export const lockFilterLabels: Record<VaultLockFilter, string> = {
  all: "全部锁定状态",
  locked: "已锁定",
  unlocked: "未锁定"
};
export const ammoFilterLabels: Record<VaultAmmoFilter, string> = {
  all: "全部弹药",
  primary: "主弹",
  special: "特殊",
  heavy: "重弹"
};
export const armorStatLabels: Record<ArmorStatKey, string> = {
  health: "生命值",
  melee: "近战",
  grenade: "手雷",
  super: "超能",
  class: "职业",
  weapon: "武器"
};
export const groupSortOrder: Record<EquipmentGroupKey, number> = {
  weapons: 0,
  armor: 1,
  equipment: 2,
  other: 3
};

export type VaultFrameFilter = string[];

export type VaultFrameOption = {
  key: string;
  label: string;
  count: number;
};

export function filterVaultItems(items: AccountItemSummary[], filter: VaultFilter): AccountItemSummary[] {
  const parsedQuery = parseVaultQuery(filter.query);
  const query = parsedQuery.text.toLocaleLowerCase();
  return items.filter((item) => {
    const entry = (filter.tags ?? { items: {} }).items[getVaultItemKey(item)];
    const matchesGroup = filter.group === "all" || item.group_key === filter.group;
    if (!matchesGroup) return false;
    if (!matchesTag(item, filter.tag ?? "all", filter.tags ?? { items: {} }, filter.wishlist)) return false;
    if (parsedQuery.tag && !matchesTag(item, parsedQuery.tag, filter.tags ?? { items: {} }, filter.wishlist)) return false;
    if (!matchesArmorStatRules(item, filter.armorStatRules ?? [])) return false;
    if (!matchesLock(item, filter.lock ?? "all")) return false;
    if (!matchesSlot(item, filter.slot ?? "all")) return false;
    if (!matchesAmmo(item, filter.ammo ?? "all")) return false;
    if (filter.frames?.length && !filter.frames.includes(item.weapon_frame?.key ?? "")) return false;
    if (parsedQuery.locked !== undefined && item.locked !== parsedQuery.locked) return false;
    if (parsedQuery.type && parsedQuery.type !== "all" && item.group_key !== parsedQuery.type) return false;
    if (!query) return true;

    return [
      item.name,
      item.item_type,
      item.tier,
      item.bucket_name,
      item.weapon_frame?.name,
      formatArmorStatsInline(item),
      tierAlias(item.tier),
      entry?.note
    ]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase().includes(query));
  });
}

export function parseVaultQuery(query: string): ParsedVaultQuery {
  const textParts: string[] = [];
  const parsed: ParsedVaultQuery = { text: "" };
  for (const token of query.trim().split(/\s+/).filter(Boolean)) {
    const lower = token.toLocaleLowerCase();
    if (lower.startsWith("tag:")) {
      const tag = lower.slice("tag:".length);
      if (isVaultTagFilter(tag)) {
        parsed.tag = tag;
        continue;
      }
    }
    if (lower.startsWith("locked:")) {
      const value = lower.slice("locked:".length);
      if (value === "true" || value === "yes" || value === "已锁定") {
        parsed.locked = true;
        continue;
      }
      if (value === "false" || value === "no" || value === "未锁定") {
        parsed.locked = false;
        continue;
      }
    }
    if (lower.startsWith("type:")) {
      const type = typeFilterFor(lower.slice("type:".length));
      if (type) {
        parsed.type = type;
        continue;
      }
    }
    textParts.push(token);
  }
  parsed.text = textParts.join(" ").trim();
  return parsed;
}

export function buildVaultGroups(items: AccountItemSummary[]): VaultGroupSummary[] {
  return vaultGroupOrder.map((key) => ({
    key,
    label: vaultGroupLabels[key],
    count: key === "all" ? items.length : items.filter((item) => item.group_key === key).length
  }));
}

export function buildVaultSlotFilters(items: AccountItemSummary[]): VaultSlotSummary[] {
  const sections = buildVaultSections(items);
  return [
    { key: "all", label: "全部位置", count: items.length },
    ...sections.map((section) => ({
      key: section.key,
      label: section.label,
      count: section.count
    }))
  ];
}

export function buildVaultFrameFilters(items: AccountItemSummary[]): VaultFrameOption[] {
  const frameCounts = new Map<string, VaultFrameOption>();

  for (const item of items) {
    if (!item.weapon_frame) continue;
    const current = frameCounts.get(item.weapon_frame.key) ?? {
      key: item.weapon_frame.key,
      label: item.weapon_frame.name,
      count: 0
    };
    current.count += 1;
    frameCounts.set(item.weapon_frame.key, current);
  }

  return [...frameCounts.values()].sort((left, right) => right.count - left.count || compareText(left.label, right.label));
}

export function buildVaultSections(items: AccountItemSummary[]): VaultSection[] {
  const sectionMap = new Map<string, VaultSection>();
  for (const item of items) {
    const label = getAccountItemSlotLabel(item);
    const key = label;
    const section = sectionMap.get(key) ?? {
      key,
      label,
      count: 0,
      items: []
    };
    section.items.push(item);
    section.count = section.items.length;
    sectionMap.set(key, section);
  }

  return [...sectionMap.values()].sort(compareVaultSections);
}

export function sortVaultItems(
  items: AccountItemSummary[],
  sortKey: VaultSortKey,
  tags: VaultTags = { items: {} }
): AccountItemSummary[] {
  return [...items].sort((left, right) => {
    if (sortKey === "power") {
      return (right.power ?? 0) - (left.power ?? 0)
        || compareText(left.name, right.name);
    }

    if (isArmorStatSortKey(sortKey)) {
      return armorStatValue(right, sortKey) - armorStatValue(left, sortKey)
        || compareText(left.name, right.name);
    }

    if (sortKey === "group") {
      return groupSortOrder[left.group_key] - groupSortOrder[right.group_key]
        || compareText(left.name, right.name);
    }

    if (sortKey === "tier") {
      return tierRank(left.tier) - tierRank(right.tier)
        || compareText(left.name, right.name);
    }

    return compareText(left.name, right.name);
  });
}

function matchesTag(
  item: AccountItemSummary,
  tag: VaultTagFilter,
  tags: VaultTags,
  wishlist?: DimWishlist | null
): boolean {
  if (tag === "all") {
    return true;
  }

  const itemTag = tags.items[getVaultItemKey(item)]?.tag;
  if (tag === "wishlist") {
    return evaluateWishlistRoll(normalizeCoreItem(item), wishlist ?? undefined).matched;
  }
  if (tag === "untagged") {
    return !itemTag;
  }
  if (tag === "noted") {
    return Boolean(tags.items[getVaultItemKey(item)]?.note);
  }

  return itemTag === tag;
}

function matchesArmorStatRules(item: AccountItemSummary, rules: VaultArmorStatRule[]): boolean {
  const activeRules = rules
    .map((rule) => ({ stat: rule.stat, min: Number(rule.min) }))
    .filter((rule): rule is { stat: ArmorStatKey; min: number } =>
      isArmorStatKey(rule.stat) && !Number.isNaN(rule.min)
    );

  if (!activeRules.length) {
    return true;
  }
  if (!item.armor_stats) {
    return false;
  }

  const stats = item.armor_stats;
  return activeRules.every((rule) => stats[rule.stat] >= rule.min);
}

function armorStatValue(item: AccountItemSummary, key: Exclude<VaultArmorStatFilter, "all"> | VaultSortKey): number {
  if (!item.armor_stats) {
    return 0;
  }
  if (key === "armor-total" || key === "total") {
    return item.armor_stats.total;
  }
  if (isArmorStatKey(key)) {
    return item.armor_stats[key];
  }
  return 0;
}

function isArmorStatSortKey(key: VaultSortKey): key is "armor-total" | ArmorStatKey {
  return key === "armor-total" || isArmorStatKey(key);
}

function isArmorStatKey(value: string): value is ArmorStatKey {
  return value === "health"
    || value === "melee"
    || value === "grenade"
    || value === "super"
    || value === "class"
    || value === "weapon";
}

export function formatArmorStatsInline(item: AccountItemSummary): string | undefined {
  if (!item.armor_stats) {
    return undefined;
  }

  return [
    `总值 ${item.armor_stats.total}`,
    `生命值 ${item.armor_stats.health}`,
    `职业 ${item.armor_stats.class}`,
    `手雷 ${item.armor_stats.grenade}`
  ].join(" / ");
}

function isVaultTagFilter(value: string): value is VaultTagFilter {
  return value === "all" || value === "keep" || value === "review" || value === "junk"
    || value === "untagged" || value === "noted" || value === "wishlist";
}

function typeFilterFor(value: string): VaultGroupFilter | undefined {
  if (value === "weapon" || value === "weapons" || value === "武器") return "weapons";
  if (value === "armor" || value === "护甲") return "armor";
  if (value === "equipment" || value === "装备") return "equipment";
  if (value === "other" || value === "其他") return "other";
  if (value === "all" || value === "全部") return "all";
  return undefined;
}

function matchesLock(item: AccountItemSummary, lock: VaultLockFilter): boolean {
  if (lock === "all") {
    return true;
  }
  if (lock === "locked") {
    return item.locked === true;
  }

  return item.locked === false;
}

function matchesSlot(item: AccountItemSummary, slot: VaultSlotFilter): boolean {
  return slot === "all" || getAccountItemSlotLabel(item) === slot;
}

function matchesAmmo(item: AccountItemSummary, ammo: VaultAmmoFilter): boolean {
  return ammo === "all" || item.ammo_type === ammo;
}


function compareVaultSections(left: VaultSection, right: VaultSection): number {
  return slotRank(left.label) - slotRank(right.label)
    || left.label.localeCompare(right.label, "zh-Hans-CN");
}

function slotRank(label: string): number {
  const order = [
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
    "动作",
    "记忆水晶",
    "任务与追踪",
    "材料与货币",
    "消耗品",
    "模组与外观",
    "收藏与纪念",
    "未识别物品"
  ];
  const index = order.indexOf(label);
  return index === -1 ? 999 : index;
}

function tierAlias(tier: string | undefined): string | undefined {
  if (!tier) return undefined;
  if (tier.toLocaleLowerCase() === "exotic") return "异域";
  if (tier.toLocaleLowerCase() === "legendary") return "传说";
  return undefined;
}

function tierRank(tier: string | undefined): number {
  const normalized = tier?.toLocaleLowerCase();
  if (normalized === "exotic") return 0;
  if (normalized === "legendary") return 1;
  if (normalized === "rare") return 2;
  return 3;
}

function compareText(left: string | undefined, right: string | undefined): number {
  return (left ?? "").localeCompare(right ?? "", "zh-Hans-CN");
}

export function normalizeCoreItem(item: AccountItemSummary): AccountItemSummary & { socket_plugs: NonNullable<AccountItemSummary["socket_plugs"]> } {
  return {
    ...item,
    socket_plugs: item.socket_plugs ?? []
  };
}
