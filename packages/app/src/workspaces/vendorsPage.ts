import type { DailySummary, DailySummaryItem } from "@d2-tools/core/daily/summary";

export type VendorInventoryTone = "exotic" | "weapon" | "armor" | "material";
export type VendorInventoryStatus = "owned" | "recommended" | "unknown";

export type VendorInventoryItemWorkspace = {
  id: string;
  name: string;
  itemType: string;
  summary: string;
  cost: string;
  iconLabel: string;
  iconUrl?: string;
  costIconLabel?: string;
  tone: VendorInventoryTone;
  status: VendorInventoryStatus;
};

export type VendorInventoryGroupWorkspace = {
  id: string;
  name: string;
  description: string;
  badge: string;
  source: string;
  resetLabel: string;
  category?: string;
  iconLabel?: string;
  statusLabel?: string;
  featured?: boolean;
  items: VendorInventoryItemWorkspace[];
};

export type VendorsPageWorkspace = {
  vendors: VendorInventoryGroupWorkspace[];
  updatedLabel: string;
  sourceLabel: string;
  nextResetLabel: string;
  recommendationCount: number;
  verifiedItemCount: number;
};

const publicVendorSourceLabel = "Bungie 公共商人";

export function createVendorsPageWorkspace(dailySummary: DailySummary | null): VendorsPageWorkspace {
  const vendorSource = dailySummary?.sources.vendors;
  if (!dailySummary || vendorSource?.status !== "ready") {
    return {
      vendors: createLocalVendorDirectory(dailySummary?.daily_reset.time_remaining_label ?? "等待每日重置时间"),
      updatedLabel: dailySummary?.date_label ? `更新：${dailySummary.date_label}` : "等待商人数据",
      sourceLabel: "等待 Bungie 公共商人",
      nextResetLabel: dailySummary?.daily_reset.time_remaining_label ?? "等待每日重置时间",
      recommendationCount: 0,
      verifiedItemCount: 0
    };
  }

  const vendorItems = vendorSource.items ?? [];
  const liveVendors = vendorItems
    .filter((item) => item.title.trim())
    .map((item, index) => mapDailyVendorItem(item, dailySummary, index))
    .filter((vendor) => vendor.items.length > 0);
  const vendors = mergeLiveVendorsWithDirectory(liveVendors, dailySummary.daily_reset.time_remaining_label);
  const verifiedItemCount = liveVendors.reduce((count, vendor) => count + vendor.items.length, 0);

  return {
    vendors,
    updatedLabel: dailySummary?.date_label ? `更新：${dailySummary.date_label}` : "等待商人数据",
    sourceLabel: liveVendors[0]?.source ?? publicVendorSourceLabel,
    nextResetLabel: dailySummary?.daily_reset.time_remaining_label ?? "等待每日重置时间",
    recommendationCount: vendors.reduce(
      (count, vendor) => count + vendor.items.filter((item) => item.status === "recommended").length,
      0
    ),
    verifiedItemCount
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
      name: directoryVendor.name,
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
    id: `vendor-${slugify(vendorName) || index}`,
    name: vendorName,
    description: item.subtitle?.trim() || "可确认商人库存",
    badge: "已确认",
    source,
    resetLabel: dailySummary.daily_reset.time_remaining_label,
    category: isFeaturedVendor(vendorName) ? "重点" : "实时",
    iconLabel: getIconLabel(vendorName),
    statusLabel: "已确认",
    featured: isFeaturedVendor(vendorName),
    items: item.items?.length
      ? item.items.slice(0, 12).map((saleItem, saleIndex) => mapDailySaleItem(saleItem, vendorName, saleIndex))
      : parseInventoryDescription(item.description ?? "", vendorName)
  };
}

function mapDailySaleItem(item: DailySummaryItem, vendorName: string, index: number): VendorInventoryItemWorkspace {
  const itemType = item.subtitle?.trim() || inferItemType(item.title);
  const cost = item.description?.trim() || "费用待确认";
  const tone = getInventoryTone(`${item.title} ${itemType}`);
  return {
    id: `${slugify(vendorName)}-${slugify(item.title) || index}`,
    name: item.title.trim(),
    itemType,
    summary: item.source?.trim() || "Bungie 公共商人库存",
    cost,
    iconLabel: item.iconLabel?.trim() || getIconLabel(item.title),
    iconUrl: normalizeBungieIconUrl(item.iconUrl ?? item.icon),
    costIconLabel: cost.includes("奇异硬币") ? "◈" : "◇",
    tone,
    status: isFeaturedVendor(vendorName) && tone === "exotic" ? "recommended" : "unknown"
  };
}

function inferItemType(value: string): string {
  return getInventoryTone(value) === "armor" ? "护甲库存" : getInventoryTone(value) === "material" ? "材料库存" : "武器库存";
}

function createLocalVendorDirectory(resetLabel: string): VendorInventoryGroupWorkspace[] {
  return [
    createDirectoryVendor({
      id: "xur",
      name: "仄（Xur）",
      description: "周末异域商人；实时库存接入后展示本周售卖和价格。",
      badge: "周末",
      category: "重点",
      iconLabel: "Xû",
      featured: true,
      resetLabel,
      items: [
        createDirectoryItem("xur-exotic", "周末异域库存", "异域与传说库存", "等待 Bungie 公共商人数据后显示具体装备。", "异", "exotic"),
        createDirectoryItem("xur-armor", "职业异域护甲", "异域护甲", "后续按职业展示属性卷和拥有状态。", "甲", "armor"),
        createDirectoryItem("xur-legendary", "传说武器轮换", "传说武器", "接入后复查 perk 组合和值得购买的武器。", "武", "weapon")
      ]
    }),
    createDirectoryVendor({
      id: "banshee",
      name: "Banshee-44",
      description: "每日武器和枪匠声望；后续接入武器 perk 复查。",
      badge: "每日",
      category: "重点",
      iconLabel: "B4",
      resetLabel,
      items: [
        createDirectoryItem("banshee-weapons", "枪匠武器库存", "武器库存", "等待可确认武器、费用和 perk 线索。", "枪", "weapon"),
        createDirectoryItem("banshee-rank", "枪匠声望奖励", "声望奖励", "用于后续展示声望轨道和重置状态。", "徽", "material")
      ]
    }),
    createDirectoryVendor({
      id: "ada",
      name: "Ada-1",
      description: "护甲合成和外观相关入口。",
      badge: "常驻",
      category: "重点",
      iconLabel: "A1",
      resetLabel,
      items: [
        createDirectoryItem("ada-synthesis", "护甲合成入口", "功能库存", "用于保留幻化和护甲合成相关入口。", "织", "material"),
        createDirectoryItem("ada-bounty", "合成赏金", "赏金库存", "后续展示赏金状态和兑换需求。", "赏", "material")
      ]
    }),
    createDirectoryVendor({
      id: "saint",
      name: "Saint-14",
      description: "试炼声望、周末奖励和聚焦入口。",
      badge: "周末",
      category: "塔楼",
      iconLabel: "S14",
      resetLabel,
      items: [
        createDirectoryItem("saint-trials", "试炼聚焦入口", "聚焦奖励", "周末开启后再确认地图、奖励和购买资格。", "试", "weapon"),
        createDirectoryItem("saint-rank", "试炼声望轨道", "声望奖励", "展示周末奖励和重置提示。", "14", "material")
      ]
    }),
    createDirectoryVendor({
      id: "zavala",
      name: "萨瓦拉",
      description: "先锋声望、聚焦和周常奖励。",
      badge: "周更",
      category: "塔楼",
      iconLabel: "ZV",
      resetLabel,
      items: [
        createDirectoryItem("zavala-vanguard", "先锋聚焦入口", "聚焦奖励", "等待先锋奖励和聚焦数据。", "先", "weapon"),
        createDirectoryItem("zavala-rank", "先锋声望轨道", "声望奖励", "展示声望重置和周常奖励入口。", "徽", "material")
      ]
    }),
    createDirectoryVendor({
      id: "shaxx",
      name: "沙克斯领主",
      description: "熔炉竞技场声望和聚焦奖励。",
      badge: "周更",
      category: "塔楼",
      iconLabel: "SX",
      resetLabel,
      items: [
        createDirectoryItem("shaxx-crucible", "熔炉聚焦入口", "聚焦奖励", "等待熔炉奖励和聚焦数据。", "炉", "weapon"),
        createDirectoryItem("shaxx-armor", "熔炉护甲入口", "活动护甲", "用于后续展示护甲库存和费用。", "甲", "armor")
      ]
    }),
    createDirectoryVendor({
      id: "drifter",
      name: "浪客",
      description: "智谋声望、聚焦和周常奖励。",
      badge: "周更",
      category: "塔楼",
      iconLabel: "Dr",
      resetLabel,
      items: [
        createDirectoryItem("drifter-gambit", "智谋聚焦入口", "聚焦奖励", "等待智谋奖励和聚焦数据。", "智", "weapon"),
        createDirectoryItem("drifter-rank", "恶名声望轨道", "声望奖励", "保留声望重置和周常奖励位置。", "恶", "material")
      ]
    }),
    createDirectoryVendor({
      id: "rahool",
      name: "拉乎尔",
      description: "记忆水晶解码和材料兑换。",
      badge: "常驻",
      category: "塔楼",
      iconLabel: "Rh",
      resetLabel,
      items: [
        createDirectoryItem("rahool-decode", "记忆水晶解码", "解码服务", "后续展示解码、聚焦和材料兑换状态。", "晶", "exotic"),
        createDirectoryItem("rahool-material", "材料兑换", "兑换库存", "非装备类库存会和武器、护甲分开标记。", "材", "material")
      ]
    }),
    createDirectoryVendor({
      id: "tess",
      name: "苔丝",
      description: "永恒之诗外观和光尘轮换。",
      badge: "周更",
      category: "特殊 / 活动",
      iconLabel: "EV",
      resetLabel,
      items: [
        createDirectoryItem("tess-eververse", "永恒之诗轮换", "外观库存", "外观类库存只作入口提示，不作为战力推荐。", "饰", "material"),
        createDirectoryItem("tess-bright-dust", "光尘轮换", "外观库存", "后续展示光尘价格和本周外观。", "尘", "material")
      ]
    })
  ];
}

function createDirectoryVendor(input: {
  id: string;
  name: string;
  description: string;
  badge: string;
  category: string;
  iconLabel: string;
  resetLabel: string;
  featured?: boolean;
  items: VendorInventoryItemWorkspace[];
}): VendorInventoryGroupWorkspace {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    badge: input.badge,
    source: "本地商人目录",
    resetLabel: input.resetLabel,
    category: input.category,
    iconLabel: input.iconLabel,
    statusLabel: "等待实时库存",
    featured: input.featured,
    items: input.items
  };
}

function createDirectoryItem(
  id: string,
  name: string,
  itemType: string,
  summary: string,
  iconLabel: string,
  tone: VendorInventoryTone
): VendorInventoryItemWorkspace {
  return {
    id,
    name,
    itemType,
    summary,
    cost: "待确认",
    iconLabel,
    costIconLabel: "◇",
    tone,
    status: "unknown"
  };
}

function parseInventoryDescription(description: string, vendorName: string): VendorInventoryItemWorkspace[] {
  return description
    .split(/\s+\/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => parseInventoryEntry(entry, vendorName, index));
}

function parseInventoryEntry(entry: string, vendorName: string, index: number): VendorInventoryItemWorkspace {
  const match = entry.match(/^(.+?)（(.+?)）$/);
  const name = (match?.[1] ?? entry).trim();
  const detail = (match?.[2] ?? "").trim();
  const detailParts = detail.split(/[；;]/).map((part) => part.trim()).filter(Boolean);
  const cost = detailParts.length > 1 ? detailParts.at(-1) ?? "待确认" : "待确认";
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

function isFeaturedVendor(name: string): boolean {
  return /老九|仄|Xur/i.test(name);
}

function isSameVendor(left: VendorInventoryGroupWorkspace, right: VendorInventoryGroupWorkspace): boolean {
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
