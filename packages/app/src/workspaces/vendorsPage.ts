import type { DailySummary, DailySummaryItem } from "@d2-tools/core/daily/summary";

export type VendorInventoryTone = "exotic" | "weapon" | "armor" | "material";
export type VendorInventoryStatus = "owned" | "recommended" | "unknown";
export type VendorInventoryState = "loaded" | "empty" | "not_read" | "unavailable";

export type VendorInventoryItemWorkspace = {
  id: string;
  name: string;
  itemType: string;
  summary: string;
  cost?: string;
  iconLabel: string;
  iconUrl?: string;
  costIconLabel?: string;
  costIconUrl?: string;
  tone: VendorInventoryTone;
  status: VendorInventoryStatus;
};

export type VendorInventoryGroupWorkspace = {
  id: string;
  vendorHash?: number;
  name: string;
  description: string;
  badge: string;
  source: string;
  resetLabel: string;
  category?: string;
  iconLabel?: string;
  iconUrl?: string;
  statusLabel?: string;
  taskCategory?: string;
  displayStatusLabel?: string;
  inventoryState?: VendorInventoryState;
  inventoryStateLabel?: string;
  railStatusLabel?: string;
  detailToolbar?: VendorDetailToolbarWorkspace;
  featured?: boolean;
  items: VendorInventoryItemWorkspace[];
};

export type VendorRailSectionWorkspace = {
  id: "featured" | "ritual" | "weekend" | "cosmetic" | "other";
  title: string;
  vendors: VendorInventoryGroupWorkspace[];
};

export type VendorDetailToolbarWorkspace = {
  taskCategory: string;
  inventoryStateLabel: string;
  statusLabel: string;
  itemCountLabel: string;
};

export type VendorsPageModel = {
  vendors: VendorInventoryGroupWorkspace[];
  railSections: VendorRailSectionWorkspace[];
  defaultVendorId: string | null;
  updatedLabel: string;
  sourceLabel: string;
  nextResetLabel: string;
  recommendationCount: number;
  verifiedItemCount: number;
};

export type VendorsPageWorkspace = VendorsPageModel;

const publicVendorSourceLabel = "Bungie 公共商人";

export function selectVendorsPageModel(dailySummary: DailySummary | null): VendorsPageModel {
  const vendorSource = dailySummary?.sources.vendors;
  if (!dailySummary || vendorSource?.status !== "ready") {
    return buildVendorsPageModel({
      vendors: createLocalVendorDirectory(dailySummary?.daily_reset.time_remaining_label ?? "等待每日重置时间"),
      updatedLabel: dailySummary?.date_label ? `更新：${dailySummary.date_label}` : "等待商人数据",
      sourceLabel: "等待 Bungie 公共商人",
      nextResetLabel: dailySummary?.daily_reset.time_remaining_label ?? "等待每日重置时间",
      recommendationCount: 0,
      verifiedItemCount: 0
    });
  }

  const vendorItems = vendorSource.items ?? [];
  const liveVendors = vendorItems
    .filter((item) => item.title.trim())
    .map((item, index) => mapDailyVendorItem(item, dailySummary, index));
  const vendors = mergeLiveVendorsWithDirectory(liveVendors, dailySummary.daily_reset.time_remaining_label);
  const verifiedItemCount = liveVendors.reduce((count, vendor) => count + vendor.items.length, 0);

  return buildVendorsPageModel({
    vendors,
    updatedLabel: dailySummary?.date_label ? `更新：${dailySummary.date_label}` : "等待商人数据",
    sourceLabel: liveVendors[0]?.source ?? publicVendorSourceLabel,
    nextResetLabel: dailySummary?.daily_reset.time_remaining_label ?? "等待每日重置时间",
    recommendationCount: vendors.reduce(
      (count, vendor) => count + vendor.items.filter((item) => item.status === "recommended").length,
      0
    ),
    verifiedItemCount
  });
}

function buildVendorsPageModel(input: {
  vendors: VendorInventoryGroupWorkspace[];
  updatedLabel: string;
  sourceLabel: string;
  nextResetLabel: string;
  recommendationCount: number;
  verifiedItemCount: number;
}): VendorsPageModel {
  const vendors = input.vendors.map(enrichVendorViewModel);
  return {
    ...input,
    vendors,
    railSections: createVendorRailSections(vendors),
    defaultVendorId: vendors.find((vendor) => vendor.featured)?.id ?? vendors[0]?.id ?? null
  };
}

function mergeLiveVendorsWithDirectory(
  liveVendors: VendorInventoryGroupWorkspace[],
  resetLabel: string
): VendorInventoryGroupWorkspace[] {
  const directory = createLocalVendorDirectory(resetLabel);
  const usedLiveIds = new Set<string>();
  const mergedDirectory = directory.map((directoryVendor) => {
    const liveVendorIndex = liveVendors.findIndex((vendor) => isSameVendor(directoryVendor, vendor));
    if (liveVendorIndex < 0) {
      return directoryVendor;
    }

    const liveVendor = liveVendors[liveVendorIndex];
    usedLiveIds.add(liveVendor.id);
    return {
      ...directoryVendor,
      ...liveVendor,
      id: directoryVendor.id,
      name: liveVendor.name,
      category: directoryVendor.category,
      iconLabel: directoryVendor.iconLabel,
      featured: directoryVendor.featured ?? liveVendor.featured
    };
  });

  const unknownLiveVendors = liveVendors.filter((vendor) => !usedLiveIds.has(vendor.id));
  return [...mergedDirectory, ...unknownLiveVendors];
}

function mapDailyVendorItem(item: DailySummaryItem, dailySummary: DailySummary, index: number): VendorInventoryGroupWorkspace {
  const vendorName = item.title.trim();
  const source = item.source?.trim() || publicVendorSourceLabel;

  return {
    id: item.vendorHash !== undefined ? `vendor-${item.vendorHash}` : `vendor-${slugify(vendorName) || index}`,
    vendorHash: item.vendorHash,
    name: vendorName,
    description: item.subtitle?.trim() || "可确认商人库存",
    badge: "已确认",
    source,
    resetLabel: dailySummary.daily_reset.time_remaining_label,
    category: isFeaturedVendor(vendorName, item.vendorHash) ? "重点" : "已确认",
    iconLabel: getIconLabel(vendorName),
    iconUrl: normalizeBungieIconUrl(item.iconUrl ?? item.icon),
    statusLabel: "已确认",
    featured: isFeaturedVendor(vendorName, item.vendorHash),
    items: item.items?.length
      ? item.items.slice(0, 12).map((saleItem, saleIndex) => mapDailySaleItem(saleItem, vendorName, saleIndex, item.vendorHash))
      : parseInventoryDescription(item.description ?? "", vendorName, item.items !== undefined)
  };
}

function mapDailySaleItem(item: DailySummaryItem, vendorName: string, index: number, vendorHash?: number): VendorInventoryItemWorkspace {
  const itemType = item.subtitle?.trim() || inferItemType(item.title);
  const cost = item.description?.trim() || undefined;
  const tone = getInventoryTone(`${item.title} ${itemType}`);
  return {
    id: `${slugify(vendorName)}-${slugify(item.title) || index}`,
    name: item.title.trim(),
    itemType,
    summary: item.source?.trim() || "Bungie 公共商人库存",
    cost,
    iconLabel: item.iconLabel?.trim() || getIconLabel(item.title),
    iconUrl: normalizeBungieIconUrl(item.iconUrl ?? item.icon),
    costIconLabel: cost?.includes("奇异硬币") ? "◈" : "◇",
    costIconUrl: normalizeBungieIconUrl(item.costIconUrl),
    tone,
    status: isFeaturedVendor(vendorName, vendorHash) && tone === "exotic" ? "recommended" : "unknown"
  };
}

function inferItemType(value: string): string {
  return getInventoryTone(value) === "armor" ? "护甲库存" : getInventoryTone(value) === "material" ? "材料库存" : "武器库存";
}

function createLocalVendorDirectory(resetLabel: string): VendorInventoryGroupWorkspace[] {
  return [
    createDirectoryVendor({
      id: "xur",
      vendorHash: 2190858386,
      name: "周末异域商人",
      description: "周末异域商人；库存读取后展示本周售卖和价格。",
      badge: "周末",
      category: "重点",
      iconLabel: "Xû",
      featured: true,
      resetLabel,
      items: []
    }),
    createDirectoryVendor({
      id: "banshee",
      vendorHash: 672118013,
      name: "每日武器商人",
      description: "每日武器库存和声望；后续接入武器 perk 复查。",
      badge: "每日",
      category: "重点",
      iconLabel: "B4",
      resetLabel,
      items: []
    }),
    createDirectoryVendor({
      id: "ada",
      vendorHash: 3500617033,
      name: "护甲合成商人",
      description: "护甲合成和外观相关入口。",
      badge: "常驻",
      category: "重点",
      iconLabel: "A1",
      resetLabel,
      items: []
    }),
    createDirectoryVendor({
      id: "saint",
      vendorHash: 3902439767,
      name: "试炼商人",
      description: "试炼声望、周末奖励和聚焦入口。",
      badge: "周末",
      category: "周末",
      iconLabel: "S14",
      resetLabel,
      items: []
    }),
    createDirectoryVendor({
      id: "zavala",
      name: "先锋商人",
      description: "先锋声望、聚焦和周常奖励。",
      badge: "周更",
      category: "常驻",
      iconLabel: "ZV",
      resetLabel,
      items: []
    }),
    createDirectoryVendor({
      id: "shaxx",
      name: "熔炉商人",
      description: "熔炉竞技场声望和聚焦奖励。",
      badge: "周更",
      category: "常驻",
      iconLabel: "SX",
      resetLabel,
      items: []
    }),
    createDirectoryVendor({
      id: "drifter",
      name: "智谋商人",
      description: "智谋声望、聚焦和周常奖励。",
      badge: "周更",
      category: "常驻",
      iconLabel: "Dr",
      resetLabel,
      items: []
    }),
    createDirectoryVendor({
      id: "rahool",
      vendorHash: 2255782930,
      name: "记忆水晶商人",
      description: "记忆水晶解码和材料兑换。",
      badge: "常驻",
      category: "常驻",
      iconLabel: "Rh",
      resetLabel,
      items: []
    }),
    createDirectoryVendor({
      id: "tess",
      name: "外观商人",
      description: "永恒之诗外观和光尘轮换。",
      badge: "周更",
      category: "特殊 / 活动",
      iconLabel: "EV",
      resetLabel,
      items: []
    })
  ];
}

function createDirectoryVendor(input: {
  id: string;
  vendorHash?: number;
  name: string;
  description: string;
  badge: string;
  category: string;
  iconLabel: string;
  iconUrl?: string;
  resetLabel: string;
  featured?: boolean;
  items: VendorInventoryItemWorkspace[];
}): VendorInventoryGroupWorkspace {
  return {
    id: input.id,
    vendorHash: input.vendorHash,
    name: input.name,
    description: input.description,
    badge: input.badge,
    source: "本地商人目录",
    resetLabel: input.resetLabel,
    category: input.category,
    iconLabel: input.iconLabel,
    iconUrl: input.iconUrl,
    statusLabel: "等待库存读取",
    featured: input.featured,
    items: input.items
  };
}

const vendorRailSectionOrder: Array<Pick<VendorRailSectionWorkspace, "id" | "title">> = [
  { id: "featured", title: "重点库存" },
  { id: "ritual", title: "仪式声望" },
  { id: "weekend", title: "周末活动" },
  { id: "cosmetic", title: "外观 / 服务" },
  { id: "other", title: "其他商人" }
];

function createVendorRailSections(vendors: VendorInventoryGroupWorkspace[]): VendorRailSectionWorkspace[] {
  return vendorRailSectionOrder.map((section) => ({
    ...section,
    vendors: vendors.filter((vendor) => vendor.taskCategory === section.title)
  }));
}

function enrichVendorViewModel(vendor: VendorInventoryGroupWorkspace): VendorInventoryGroupWorkspace {
  const taskCategory = getVendorTaskCategory(vendor);
  const inventoryState = getVendorInventoryState(vendor);
  const displayStatusLabel = getVendorDisplayStatusLabel(vendor, inventoryState);
  const inventoryStateLabel = getVendorInventoryStateLabel(inventoryState);
  const itemCountLabel = `${vendor.items.length} 件物品`;
  return {
    ...vendor,
    taskCategory,
    displayStatusLabel,
    inventoryState,
    inventoryStateLabel,
    railStatusLabel: `${displayStatusLabel} · ${itemCountLabel}`,
    detailToolbar: {
      taskCategory,
      inventoryStateLabel,
      statusLabel: displayStatusLabel,
      itemCountLabel
    }
  };
}

function getVendorInventoryState(vendor: VendorInventoryGroupWorkspace): VendorInventoryState {
  if (vendor.items.length > 0) return "loaded";
  if (vendor.source === "本地商人目录") return "not_read";
  if (vendor.statusLabel === "已确认") return "empty";
  return "unavailable";
}

function getVendorDisplayStatusLabel(vendor: VendorInventoryGroupWorkspace, inventoryState: VendorInventoryState): string {
  if (inventoryState === "not_read") return "未读取";
  if (inventoryState === "empty") return "暂无可读库存";
  if (inventoryState === "unavailable") return "无法确认";
  return vendor.statusLabel ?? vendor.badge;
}

function getVendorInventoryStateLabel(inventoryState: VendorInventoryState): string {
  if (inventoryState === "loaded") return "库存已读取";
  if (inventoryState === "empty") return "暂无可读库存";
  if (inventoryState === "not_read") return "未读取库存";
  return "无法确认库存";
}

function getVendorTaskCategory(vendor: VendorInventoryGroupWorkspace): string {
  const key = vendorMatchKey(`${vendor.id} ${vendor.name} ${vendor.description}`);
  if (key === "xur" || key === "banshee" || key === "rahool") return "重点库存";
  if (key === "zavala" || key === "shaxx" || key === "drifter") return "仪式声望";
  if (key === "saint") return "周末活动";
  if (key === "ada" || key === "tess") return "外观 / 服务";

  const value = `${vendor.id} ${vendor.name} ${vendor.description} ${vendor.category ?? ""}`.toLocaleLowerCase();
  if (/xur|仄|周末异域|banshee|班西|武器商人|rahool|拉乎尔|记忆水晶/.test(value)) return "重点库存";
  if (/zavala|先锋|vanguard|shaxx|熔炉|crucible|drifter|浪客|智谋|gambit/.test(value)) return "仪式声望";
  if (/saint|试炼|trials|周末活动/.test(value)) return "周末活动";
  if (/ada|护甲合成|tess|外观|appearance|eververse|永恒之诗/.test(value)) return "外观 / 服务";
  return "其他商人";
}

function parseInventoryDescription(
  description: string,
  vendorName: string,
  hasStructuredItems = false
): VendorInventoryItemWorkspace[] {
  if (hasStructuredItems || isUnreadableInventoryDescription(description)) {
    return [];
  }

  return description
    .split(/\s+\/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => parseInventoryEntry(entry, vendorName, index));
}

function isUnreadableInventoryDescription(description: string): boolean {
  const normalized = description.trim();
  return normalized === "" || normalized === "库存名称暂不可读";
}

function parseInventoryEntry(entry: string, vendorName: string, index: number): VendorInventoryItemWorkspace {
  const match = entry.match(/^(.+?)（(.+?)）$/);
  const name = (match?.[1] ?? entry).trim();
  const detail = (match?.[2] ?? "").trim();
  const detailParts = detail.split(/[；;]/).map((part) => part.trim()).filter(Boolean);
  const cost = detailParts.length > 1 ? detailParts.at(-1) : undefined;
  const itemType = detailParts.length > 1 ? detailParts.slice(0, -1).join("，") : detail || "库存物品";
  const tone = getInventoryTone(`${name} ${itemType}`);

  return {
    id: `${slugify(vendorName)}-${slugify(name) || index}`,
    name,
    itemType,
    summary: buildItemSummary(tone),
    cost,
    iconLabel: getIconLabel(name),
    tone,
    status: tone === "exotic" ? "recommended" : "unknown"
  };
}

function getInventoryTone(text: string): VendorInventoryTone {
  if (/异域|Exotic/i.test(text)) return "exotic";
  if (/护甲|头盔|臂铠|胸甲|腿甲|职业物品|Armor|Helmet|Gauntlets|Chest|Leg/i.test(text)) return "armor";
  if (/材料|货币|赏金|模组|Material|Currency|Bounty|Mod/i.test(text)) return "material";
  return "weapon";
}

function buildItemSummary(tone: VendorInventoryTone): string {
  if (tone === "exotic") return "异域库存，建议优先检查收藏缺口和属性卷。";
  if (tone === "armor") return "护甲库存，需要结合属性和职业需求确认。";
  if (tone === "material") return "功能或材料库存，按当前资源需求处理。";
  return "武器库存，perk 价值需要结合资料库和目标规则确认。";
}

function getIconLabel(name: string): string {
  const chars = Array.from(name.trim()).filter((char) => char.trim());
  return chars.slice(0, Math.min(chars.length, 2)).join("") || "商";
}

function isFeaturedVendor(name: string, vendorHash?: number): boolean {
  if (vendorHash === 2190858386) return true;
  return /老九|仄|Xur/i.test(name);
}

function isSameVendor(left: VendorInventoryGroupWorkspace, right: VendorInventoryGroupWorkspace): boolean {
  if (left.vendorHash !== undefined && right.vendorHash !== undefined) {
    return left.vendorHash === right.vendorHash;
  }
  const leftKey = vendorMatchKey(`${left.id} ${left.name} ${left.description}`);
  const rightKey = vendorMatchKey(`${right.id} ${right.name} ${right.description}`);
  return leftKey !== "" && leftKey === rightKey;
}

function vendorMatchKey(value: string): string {
  if (/xur|仄|老九/i.test(value)) return "xur";
  if (/banshee|枪匠|班西/i.test(value)) return "banshee";
  if (/ada|艾达/i.test(value)) return "ada";
  if (/saint|试炼|圣-?14|圣人/i.test(value)) return "saint";
  if (/zavala|萨瓦拉|先锋/i.test(value)) return "zavala";
  if (/shaxx|沙克斯|熔炉/i.test(value)) return "shaxx";
  if (/drifter|浪客|智谋/i.test(value)) return "drifter";
  if (/rahool|拉乎尔|密码学家/i.test(value)) return "rahool";
  if (/tess|苔丝|eververse|永恒之诗/i.test(value)) return "tess";
  return "";
}

function normalizeBungieIconUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) return trimmed;
  if (trimmed.startsWith("/")) return `https://www.bungie.net${trimmed}`;
  return trimmed;
}

function slugify(value: string): string {
  return Array.from(value.trim())
    .map((char) => {
      if (/^[a-z0-9]$/i.test(char)) return char.toLowerCase();
      return char.codePointAt(0)?.toString(36) ?? "";
    })
    .filter(Boolean)
    .join("-");
}
