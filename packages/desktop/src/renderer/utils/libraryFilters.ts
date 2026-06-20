import type {
  AmmoTypeKey,
  EquipmentGroupKey,
  ItemSearchResult,
  PerkSearchResult
} from "../api/client";

export type LibraryViewMode = "equipment" | "perks";
export type LibraryEquipmentGroupFilter = EquipmentGroupKey | "all";
export type LibraryRelatedItemsFilter = "all" | "yes" | "no";

export type LibraryEquipmentFilter = {
  query: string;
  group: LibraryEquipmentGroupFilter;
  tier: string;
  bucket: string;
  ammo: AmmoTypeKey | "all";
};

export type LibraryPerkFilter = {
  query: string;
  relatedGroup: LibraryEquipmentGroupFilter;
  hasRelatedItems: LibraryRelatedItemsFilter;
};

export type LibraryFilterOption = {
  value: string;
  label: string;
};

export type LibraryEquipmentFilterOptions = {
  groups: LibraryFilterOption[];
  tiers: LibraryFilterOption[];
  buckets: LibraryFilterOption[];
  ammo: LibraryFilterOption[];
};

const groupLabels: Record<LibraryEquipmentGroupFilter, string> = {
  all: "全部分类",
  weapons: "武器",
  armor: "护甲",
  equipment: "装备",
  other: "其他"
};

const groupOrder: LibraryEquipmentGroupFilter[] = ["all", "weapons", "armor", "equipment", "other"];

const ammoLabels: Record<AmmoTypeKey, string> = {
  primary: "主弹",
  special: "特弹",
  heavy: "重弹"
};

const ammoOrder: AmmoTypeKey[] = ["primary", "special", "heavy"];

export const defaultLibraryEquipmentFilter: LibraryEquipmentFilter = {
  query: "",
  group: "all",
  tier: "all",
  bucket: "all",
  ammo: "all"
};

export const defaultLibraryPerkFilter: LibraryPerkFilter = {
  query: "",
  relatedGroup: "all",
  hasRelatedItems: "all"
};

export function filterLibraryEquipmentItems(
  items: ItemSearchResult[],
  filter: LibraryEquipmentFilter
): ItemSearchResult[] {
  const query = filter.query.trim().toLocaleLowerCase();

  return items.filter((item) => {
    if (filter.group !== "all" && item.group_key !== filter.group) return false;
    if (filter.tier !== "all" && item.tier !== filter.tier) return false;
    if (filter.bucket !== "all" && item.bucket_name !== filter.bucket) return false;
    if (filter.ammo !== "all" && item.ammo_type !== filter.ammo) return false;
    if (!query) return true;

    return [
      item.name,
      item.description,
      item.item_type,
      item.tier,
      item.bucket_name,
      ...(item.perks ?? []).flatMap((group) => group.plugs.map((plug) => plug.name))
    ]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase().includes(query));
  });
}

export function filterLibraryPerks(perks: PerkSearchResult[], filter: LibraryPerkFilter): PerkSearchResult[] {
  const query = filter.query.trim().toLocaleLowerCase();

  return perks.filter((perk) => {
    const relatedItems = perk.related_items ?? [];
    if (filter.hasRelatedItems === "yes" && !relatedItems.length) return false;
    if (filter.hasRelatedItems === "no" && relatedItems.length) return false;
    if (filter.relatedGroup !== "all" && !relatedItems.some((item) => item.group_key === filter.relatedGroup)) {
      return false;
    }
    if (!query) return true;

    return [
      perk.name,
      perk.description,
      ...relatedItems.map((item) => item.name)
    ]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase().includes(query));
  });
}

export function buildLibraryEquipmentFilterOptions(items: ItemSearchResult[]): LibraryEquipmentFilterOptions {
  const groups = groupOrder
    .filter((group) => group === "all" || items.some((item) => item.group_key === group))
    .map((group) => ({ value: group, label: groupLabels[group] }));

  return {
    groups,
    tiers: [
      { value: "all", label: "全部稀有度" },
      ...uniqueSorted(items.map((item) => item.tier)).map((value) => ({ value, label: value }))
    ],
    buckets: [
      { value: "all", label: "全部位置" },
      ...uniqueInOrder(items.map((item) => item.bucket_name)).map((value) => ({ value, label: value }))
    ],
    ammo: [
      { value: "all", label: "全部弹药" },
      ...ammoOrder
        .filter((ammo) => items.some((item) => item.ammo_type === ammo))
        .map((value) => ({ value, label: ammoLabels[value] }))
    ]
  };
}

export function buildLibraryPerkGroupOptions(perks: PerkSearchResult[]): LibraryFilterOption[] {
  const presentGroups = new Set<EquipmentGroupKey>();

  for (const perk of perks) {
    for (const item of perk.related_items ?? []) {
      if (item.group_key) {
        presentGroups.add(item.group_key);
      }
    }
  }

  return groupOrder
    .filter((group): group is LibraryEquipmentGroupFilter => group === "all" || presentGroups.has(group))
    .map((group) => ({ value: group, label: groupLabels[group] }));
}

function uniqueSorted(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
    .sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
}

function uniqueInOrder(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }

  return result;
}
