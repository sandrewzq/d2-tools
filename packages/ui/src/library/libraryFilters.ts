export type AmmoTypeKey = "primary" | "special" | "heavy";
export type EquipmentGroupKey = "weapons" | "armor" | "equipment" | "other";
export type ItemSearchResult = {
  hash: number;
  name: string;
  description: string;
  item_type?: string;
  tier?: string;
  group_key?: EquipmentGroupKey;
  bucket_name?: string;
  ammo_type?: AmmoTypeKey;
  weapon_frame?: {
    key: string;
    name: string;
  };
  source: {
    status: "ready" | "missing";
    label: string;
    description: string;
  };
  perks?: Array<{
    socket_index: number;
    plugs: Array<{
      hash: number;
      name: string;
      description: string;
      icon?: string;
    }>;
  }>;
};
export type PerkSearchResult = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  related_items?: Array<{
    hash: number;
    name: string;
    group_key?: EquipmentGroupKey;
  }>;
};

export type LibraryViewMode = "equipment" | "perks";
export type LibraryEquipmentGroupFilter = EquipmentGroupKey | "all";
export type LibraryRelatedItemsFilter = "all" | "yes" | "no";
export type LibrarySourceStatusFilter = ItemSearchResult["source"]["status"] | "all";
export type LibraryPerkPoolFilter = "all" | "yes" | "no";
export type LibraryDropAccessKey = "available" | "rotation" | "archived" | "unknown";
export type LibraryDropAccessFilter = LibraryDropAccessKey | "all";

export type LibraryEquipmentFilter = {
  query: string;
  group: LibraryEquipmentGroupFilter;
  tier: string;
  bucket: string;
  ammo: AmmoTypeKey | "all";
  frame: string[];
  sourceStatus: LibrarySourceStatusFilter;
  perkPool: LibraryPerkPoolFilter;
  dropAccess: LibraryDropAccessFilter;
  perkQuery: string;
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
  frames: LibraryFilterOption[];
};

export type LibraryDropQueryGroup = {
  key: LibraryDropAccessKey;
  label: string;
  description: string;
  items: ItemSearchResult[];
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
  special: "特殊",
  heavy: "重弹"
};

const ammoOrder: AmmoTypeKey[] = ["primary", "special", "heavy"];

export const defaultLibraryEquipmentFilter: LibraryEquipmentFilter = {
  query: "",
  group: "all",
  tier: "all",
  bucket: "all",
  ammo: "all",
  frame: [],
  sourceStatus: "all",
  perkPool: "all",
  dropAccess: "all",
  perkQuery: ""
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
  const sourceStatus = filter.sourceStatus ?? "all";
  const perkPool = filter.perkPool ?? "all";
  const dropAccess = filter.dropAccess ?? "all";
  const perkTokens = splitQueryTokens(filter.perkQuery ?? "");

  return items.filter((item) => {
    if (filter.group !== "all" && item.group_key !== filter.group) return false;
    if (filter.tier !== "all" && item.tier !== filter.tier) return false;
    if (filter.bucket !== "all" && item.bucket_name !== filter.bucket) return false;
    if (filter.ammo !== "all" && item.ammo_type !== filter.ammo) return false;
    if (filter.frame.length && !filter.frame.includes(item.weapon_frame?.key ?? "")) return false;
    if (sourceStatus !== "all" && item.source.status !== sourceStatus) return false;
    if (perkPool === "yes" && !hasDisplayablePerkPool(item)) return false;
    if (perkPool === "no" && hasDisplayablePerkPool(item)) return false;
    if (dropAccess !== "all" && classifyLibraryDropAccess(item) !== dropAccess) return false;
    if (perkTokens.length && !matchesPerkQuery(item, perkTokens)) return false;
    if (!query) return true;

    return [
      item.name,
      item.description,
      item.item_type,
      item.tier,
      item.bucket_name,
      item.weapon_frame?.name,
      item.source.description,
      ...(item.perks ?? []).flatMap((group) => group.plugs.map((plug) => plug.name))
    ]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase().includes(query));
  });
}

export function classifyLibraryDropAccess(item: ItemSearchResult): LibraryDropAccessKey {
  if (item.source.status !== "ready") {
    return "unknown";
  }

  const sourceText = item.source.description.toLocaleLowerCase();
  if (matchesAnyKeyword(sourceText, archivedSourceKeywords)) {
    return "archived";
  }
  if (matchesAnyKeyword(sourceText, rotationSourceKeywords)) {
    return "rotation";
  }
  return "available";
}

export function groupLibraryDropQueryItems(items: ItemSearchResult[]): LibraryDropQueryGroup[] {
  const groupMap: Record<LibraryDropAccessKey, ItemSearchResult[]> = {
    available: [],
    rotation: [],
    archived: [],
    unknown: []
  };

  for (const item of items) {
    groupMap[classifyLibraryDropAccess(item)].push(item);
  }

  return dropAccessGroups
    .map((group) => ({ ...group, items: groupMap[group.key] }))
    .filter((group) => group.items.length);
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
    ],
    frames: [
      { value: "all", label: "全部框架" },
      ...uniqueInOrder(items.map((item) => item.weapon_frame?.key))
        .map((value) => ({
          value,
          label: items.find((item) => item.weapon_frame?.key === value)?.weapon_frame?.name ?? value
        }))
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

const rotationSourceKeywords = [
  "rotation",
  "rotator",
  "iron banner",
  "trials",
  "nightfall",
  "grandmaster",
  "weekly",
  "轮换",
  "每周",
  "铁旗",
  "试炼",
  "夜幕",
  "宗师",
  "活动期间"
];

const archivedSourceKeywords = [
  "no longer",
  "unavailable",
  "legacy",
  "archive",
  "sunset",
  "已下架",
  "不再",
  "不可获取",
  "纪念碑",
  "传承"
];

const dropAccessGroups: Array<Omit<LibraryDropQueryGroup, "items">> = [
  {
    key: "available",
    label: "来源可确认",
    description: "来源字段可确认，但不等同于当前在线可刷；实时活动或商人轮换接入前只作为刷取线索。"
  },
  {
    key: "rotation",
    label: "等轮换",
    description: "来源说明包含铁旗、试炼、夜幕、每周或轮换类线索，需要结合当前轮换复查。"
  },
  {
    key: "archived",
    label: "已下架或待确认",
    description: "来源说明显示不可获取、传承或下架状态。"
  },
  {
    key: "unknown",
    label: "来源待补",
    description: "资料库暂未提供可确认来源。"
  }
];

function hasDisplayablePerkPool(item: ItemSearchResult): boolean {
  return item.perks?.some((group) => group.plugs.length) ?? false;
}

function matchesPerkQuery(item: ItemSearchResult, perkTokens: string[]): boolean {
  const perkNames = (item.perks ?? [])
    .flatMap((group) => group.plugs)
    .map((plug) => plug.name.toLocaleLowerCase())
    .join(" ");

  return perkTokens.every((token) => perkNames.includes(token));
}

function splitQueryTokens(query: string): string[] {
  return query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function matchesAnyKeyword(value: string, keywords: string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword));
}
