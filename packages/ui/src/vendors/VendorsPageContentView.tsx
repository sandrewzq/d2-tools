import { useState } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale } from "../i18n/types.js";
import {
  ProductWorkspaceCommandBar,
  ProductWorkspaceContentStack,
  ProductWorkspaceEmptyState,
  ProductWorkspaceSideRail,
  ProductWorkspaceSplit
} from "../workspace/ProductWorkspace.js";
import { VendorsPageView } from "./VendorsPageView.js";

export type VendorInventoryItemView = {
  id: string;
  name: string;
  itemType: string;
  summary: string;
  cost: string;
  iconLabel: string;
  iconUrl?: string;
  costIconLabel?: string;
  tone: "exotic" | "weapon" | "armor" | "material";
  status: "owned" | "recommended" | "unknown";
};

export type VendorInventoryGroupView = {
  id: string;
  name: string;
  description: string;
  badge: string;
  source: string;
  resetLabel: string;
  category?: string;
  iconLabel?: string;
  iconUrl?: string;
  statusLabel?: string;
  featured?: boolean;
  items: VendorInventoryItemView[];
};

export type VendorsPageContentViewProps = {
  interfaceLocale?: InterfaceLocale;
  vendors?: VendorInventoryGroupView[];
  updatedLabel?: string;
  sourceLabel?: string;
  nextResetLabel?: string;
  recommendationCount?: number;
  verifiedItemCount?: number;
  showInternalHeading?: boolean;
};

export function VendorsPageContentView(props: VendorsPageContentViewProps) {
  const locale = props.interfaceLocale ?? "zh-CN";
  const copy = getLocaleCopy(locale).vendors;
  const vendors = props.vendors ?? getDefaultVendorInventory(locale);
  const verifiedItemCount = props.verifiedItemCount ?? vendors.reduce((count, vendor) => count + vendor.items.length, 0);
  const recommendationCount = props.recommendationCount ?? vendors.reduce(
    (count, vendor) => count + vendor.items.filter((item) => item.status === "recommended").length,
    0
  );
  const initialVendorId = vendors.find((vendor) => vendor.featured)?.id ?? vendors[0]?.id ?? "";
  const [selectedVendorId, setSelectedVendorId] = useState(initialVendorId);
  const selectedVendor = vendors.find((vendor) => vendor.id === selectedVendorId)
    ?? vendors.find((vendor) => vendor.featured)
    ?? vendors[0]
    ?? null;
  const updatedLabel = props.updatedLabel ?? copy.inline["Prototype mock"] ?? "Prototype mock";
  const sourceLabel = props.sourceLabel ?? copy.inline["Bungie / Manifest / 用户导入推荐"] ?? "Bungie / Manifest / imported recommendations";
  const nextResetLabel = props.nextResetLabel ?? copy.inline["每日或周末重置"] ?? "Daily or weekend reset";
  const vendorCategories = groupVendorsByCategory(vendors);

  return (
    <VendorsPageView
      interfaceLocale={locale}
      updatedLabel={updatedLabel}
      sourceLabel={sourceLabel}
      nextResetLabel={nextResetLabel}
      verifiedItemCount={verifiedItemCount}
      recommendationCount={recommendationCount}
      showInternalHeading={props.showInternalHeading}
    >
      {selectedVendor ? (
        <ProductWorkspaceSplit className="vendor-workbench-layout">
          <ProductWorkspaceSideRail className="vendor-rail" ariaLabel={copy.inline["商人列表"] ?? "Vendor list"}>
            <div className="vendor-rail-head">
              <strong>{copy.inline["商人"] ?? "Vendors"}</strong>
              <span>{vendors.length} {copy.inline["个来源"] ?? "sources"}</span>
            </div>
            {vendorCategories.map((category) => (
              <section className="vendor-rail-group" key={category.name}>
                <span className="vendor-rail-category">{category.name}</span>
                {category.vendors.map((vendor) => (
                  <button
                    type="button"
                    className={vendor.id === selectedVendor.id ? "vendor-rail-item is-active" : "vendor-rail-item"}
                    key={vendor.id}
                    aria-pressed={vendor.id === selectedVendor.id}
                    onClick={() => setSelectedVendorId(vendor.id)}
                  >
                    <VendorAvatar vendor={vendor} />
                    <span>
                      <strong>{vendor.name}</strong>
                      <small>{vendor.statusLabel ?? vendor.badge} · {vendor.items.length} {copy.labels.items}</small>
                    </span>
                  </button>
                ))}
              </section>
            ))}
          </ProductWorkspaceSideRail>

          <ProductWorkspaceContentStack element="section" className="vendor-detail-panel product-workspace-panel">
            <div className="vendor-detail-head">
              <VendorAvatar vendor={selectedVendor} large />
              <div>
                <div className="vendor-detail-title-row">
                  <h3>{selectedVendor.name}</h3>
                  <span className="app-chip status-ready">{selectedVendor.statusLabel ?? selectedVendor.badge}</span>
                </div>
                <p>{selectedVendor.description}</p>
                <div className="vendor-detail-meta">
                  <span>{selectedVendor.source}</span>
                  <span>{selectedVendor.resetLabel}</span>
                  <span>{selectedVendor.items.length} {copy.labels.items}</span>
                </div>
              </div>
            </div>

            {selectedVendor.items.length ? (
              <div className="vendor-inventory-grid">
                {selectedVendor.items.map((item) => (
                  <article className="vendor-stock-card" data-tone={item.tone} key={item.id}>
                    <VendorItemArt item={item} />
                    <div className="vendor-stock-body">
                      <div className="vendor-stock-title">
                        <strong>{item.name}</strong>
                        <span className={`app-chip vendor-status-${item.status}`}>{formatVendorStatus(item.status, copy)}</span>
                      </div>
                      <span>{item.itemType}</span>
                      <p>{item.summary}</p>
                    </div>
                    <div className="vendor-cost-row">
                      <span className="vendor-cost-icon" aria-hidden="true">{item.costIconLabel ?? "¤"}</span>
                      <span>{copy.labels.cost}: {item.cost}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <ProductWorkspaceEmptyState className="vendor-empty-state">
                <strong>{copy.emptyTitle}</strong>
                <span>{selectedVendor.statusLabel ?? copy.emptyBody}</span>
              </ProductWorkspaceEmptyState>
            )}
          </ProductWorkspaceContentStack>

          <ProductWorkspaceCommandBar element="section" className="vendor-evidence-panel">
            <div className="vendor-evidence-grid">
              <div>
                <strong>{copy.labels.evidence}</strong>
                <span>{selectedVendor.source}</span>
              </div>
              <div>
                <strong>{copy.sourceLabel}</strong>
                <span>{selectedVendor.statusLabel ?? sourceLabel}</span>
              </div>
              <div>
                <strong>{copy.verifiedInventory}</strong>
                <span>{selectedVendor.items.length} / {verifiedItemCount} {copy.labels.items} · {recommendationCount} {copy.recommendationsLabel}</span>
              </div>
              <div>
                <strong>{copy.updatedLabel}</strong>
                <span>{updatedLabel}</span>
              </div>
            </div>
          </ProductWorkspaceCommandBar>
        </ProductWorkspaceSplit>
      ) : (
        <ProductWorkspaceEmptyState className="vendor-empty-state">
          <strong>{copy.emptyTitle}</strong>
          <span>{copy.emptyBody}</span>
        </ProductWorkspaceEmptyState>
      )}
    </VendorsPageView>
  );
}

function VendorAvatar(props: { vendor: VendorInventoryGroupView; large?: boolean }) {
  return (
    <span className={props.large ? "vendor-avatar is-large" : "vendor-avatar"} aria-hidden="true">
      <img src={props.vendor.iconUrl ?? createVendorIconUrl(props.vendor)} alt="" />
    </span>
  );
}

function VendorItemArt(props: { item: VendorInventoryItemView }) {
  return (
    <div className="vendor-item-art" data-tone={props.item.tone} aria-hidden="true">
      <img src={props.item.iconUrl ?? createItemIconUrl(props.item)} alt="" />
    </div>
  );
}

function formatVendorStatus(status: VendorInventoryItemView["status"], copy: ReturnType<typeof getLocaleCopy>["vendors"]) {
  if (status === "owned") return copy.labels.owned;
  if (status === "recommended") return copy.labels.recommended;
  return copy.labels.unknown;
}

function groupVendorsByCategory(vendors: VendorInventoryGroupView[]): Array<{ name: string; vendors: VendorInventoryGroupView[] }> {
  const groups = new Map<string, VendorInventoryGroupView[]>();
  for (const vendor of vendors) {
    const category = vendor.category ?? "其他";
    groups.set(category, [...(groups.get(category) ?? []), vendor]);
  }
  return Array.from(groups.entries()).map(([name, groupVendors]) => ({ name, vendors: groupVendors }));
}

function createVendorIconUrl(vendor: VendorInventoryGroupView): string {
  const label = vendor.iconLabel ?? vendor.name.slice(0, 2);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#d8e6f6"/>
          <stop offset="1" stop-color="#8fb0d8"/>
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="18" fill="url(#g)"/>
      <path d="M22 70h52l-7-36-19-10-19 10-7 36Z" fill="#f7fbff" opacity=".42"/>
      <path d="M33 34h30l5 28H28l5-28Z" fill="#153050" opacity=".32"/>
      <text x="48" y="58" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#0f2741">${escapeSvgText(label)}</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createItemIconUrl(item: VendorInventoryItemView): string {
  const color = getToneIconColor(item.tone);
  const accent = getToneIconAccent(item.tone);
  const mark = item.tone === "weapon"
    ? '<path d="M20 57h40l10-10h8v8h-5l-9 9H20v-7Z" fill="#fff" opacity=".82"/><path d="M26 42h28l8 8H26v-8Z" fill="#fff" opacity=".42"/>'
    : item.tone === "armor"
      ? '<path d="M48 16l26 11v20c0 17-10 27-26 34-16-7-26-17-26-34V27l26-11Z" fill="#fff" opacity=".72"/><path d="M36 36h24v26H36V36Z" fill="#000" opacity=".18"/>'
      : item.tone === "material"
        ? '<path d="M48 16l28 32-28 32-28-32 28-32Z" fill="#fff" opacity=".74"/><path d="M48 30l14 18-14 18-14-18 14-18Z" fill="#000" opacity=".16"/>'
        : '<circle cx="48" cy="48" r="29" fill="#fff" opacity=".72"/><path d="M48 24l7 17 18 2-14 12 4 17-15-9-15 9 4-17-14-12 18-2 7-17Z" fill="#000" opacity=".18"/>';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${color}"/>
          <stop offset="1" stop-color="${accent}"/>
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="12" fill="url(#g)"/>
      <path d="M0 72 72 0h24v96H0V72Z" fill="#000" opacity=".14"/>
      ${mark}
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getToneIconColor(tone: VendorInventoryItemView["tone"]): string {
  if (tone === "exotic") return "#d7a33a";
  if (tone === "armor") return "#b7a1e8";
  if (tone === "material") return "#6fc39a";
  return "#8bb8e8";
}

function getToneIconAccent(tone: VendorInventoryItemView["tone"]): string {
  if (tone === "exotic") return "#7b4f15";
  if (tone === "armor") return "#5d408d";
  if (tone === "material") return "#226246";
  return "#235c9d";
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getDefaultVendorInventory(locale: InterfaceLocale): VendorInventoryGroupView[] {
  if (locale === "en-US") {
    return [
      {
        id: "xur",
        name: "Xur",
        description: "Weekend exotic and legendary inventory, clearly separated from unverified guesses.",
        badge: "Weekend",
        source: "Public vendor evidence",
        resetLabel: "Weekend",
        category: "Featured",
        iconLabel: "Xû",
        statusLabel: "Verified",
        featured: true,
        items: [
          { id: "xur-weapon", name: "Exotic pulse rifle", itemType: "Exotic weapon", summary: "Watch item for collection gaps.", cost: "1 Exotic Cipher", iconLabel: "EX", costIconLabel: "◎", tone: "exotic", status: "recommended" },
          { id: "xur-helmet", name: "Hunter helmet roll", itemType: "Exotic armor", summary: "Stat roll needs in-game verification.", cost: "23 Strange Coins", iconLabel: "HE", costIconLabel: "◈", tone: "armor", status: "unknown" },
          { id: "xur-weapon-legendary", name: "Precision hand cannon", itemType: "Legendary weapon", summary: "Overflow / Explosive Payload sample.", cost: "Glimmer", iconLabel: "HC", costIconLabel: "◇", tone: "weapon", status: "owned" },
          { id: "xur-warlock", name: "Warlock chest roll", itemType: "Exotic armor", summary: "Discipline-focused sample, verify total stats in game.", cost: "23 Strange Coins", iconLabel: "CH", costIconLabel: "◈", tone: "armor", status: "recommended" }
        ]
      },
      {
        id: "banshee",
        name: "Banshee-44",
        description: "Daily weapon inventory and perk review targets.",
        badge: "Daily",
        source: "Manifest + vendor sample",
        resetLabel: "Daily",
        category: "Featured",
        iconLabel: "B4",
        statusLabel: "Verified",
        items: [
          { id: "banshee-auto", name: "Rapid-fire auto rifle", itemType: "Legendary weapon", summary: "Subsistence / Target Lock sample.", cost: "Glimmer", iconLabel: "AR", costIconLabel: "◇", tone: "weapon", status: "recommended" },
          { id: "banshee-scout", name: "Legacy scout rifle", itemType: "Legendary weapon", summary: "Low priority unless a target rule matches.", cost: "Glimmer", iconLabel: "SR", costIconLabel: "◇", tone: "weapon", status: "unknown" },
          { id: "banshee-fusion", name: "Adaptive fusion rifle", itemType: "Legendary weapon", summary: "Review perk columns before keeping.", cost: "Glimmer", iconLabel: "FR", costIconLabel: "◇", tone: "weapon", status: "unknown" }
        ]
      },
      { id: "ada", name: "Ada-1", description: "Armor synthesis and cosmetic related stock.", badge: "Weekly", source: "Vendor sample", resetLabel: "Weekly", category: "Featured", iconLabel: "A1", statusLabel: "Verified", items: [{ id: "ada-mod", name: "Armor synthesis bounty", itemType: "Utility", summary: "Keep visible but low priority.", cost: "Glimmer", iconLabel: "AD", costIconLabel: "◇", tone: "material", status: "owned" }] },
      { id: "saint", name: "Saint-14", description: "Trials reputation and weekend rewards.", badge: "Weekend", source: "Trials vendor sample", resetLabel: "Weekend", category: "Tower", iconLabel: "S14", statusLabel: "Prototype sample", items: [
        { id: "saint-engram", name: "Trials engram focus", itemType: "Focused reward", summary: "Weekend focus entry, confirm rank and map in game.", cost: "Engram + Glimmer", iconLabel: "TR", costIconLabel: "◇", tone: "weapon", status: "recommended" },
        { id: "saint-rank", name: "Reputation track reward", itemType: "Rank reward", summary: "Shown as a UI sample until live vendor payload is connected.", cost: "Trials rank", iconLabel: "14", costIconLabel: "◎", tone: "material", status: "unknown" }
      ] },
      { id: "zavala", name: "Zavala", description: "Vanguard rewards and reputation.", badge: "Weekly", source: "Vanguard vendor sample", resetLabel: "Weekly", category: "Tower", iconLabel: "ZV", statusLabel: "Prototype sample", items: [
        { id: "zavala-engram", name: "Vanguard weapon focus", itemType: "Focused reward", summary: "Daily-use reward lane for strike and Nightfall players.", cost: "Vanguard engram", iconLabel: "VG", costIconLabel: "◇", tone: "weapon", status: "recommended" },
        { id: "zavala-rank", name: "Commander reward track", itemType: "Rank reward", summary: "Rank reset and playlist reward placeholder.", cost: "Vanguard rank", iconLabel: "ZV", costIconLabel: "◎", tone: "material", status: "owned" }
      ] },
      { id: "shaxx", name: "Lord Shaxx", description: "Crucible rewards and focused engrams.", badge: "Weekly", source: "Crucible vendor sample", resetLabel: "Weekly", category: "Tower", iconLabel: "SX", statusLabel: "Prototype sample", items: [
        { id: "shaxx-engram", name: "Crucible weapon focus", itemType: "Focused reward", summary: "PvP reward focus lane with perk review priority.", cost: "Crucible engram", iconLabel: "CR", costIconLabel: "◇", tone: "weapon", status: "recommended" },
        { id: "shaxx-armor", name: "Crucible armor sample", itemType: "Playlist armor", summary: "Armor slot placeholder for density and cost display.", cost: "Glimmer", iconLabel: "AR", costIconLabel: "◈", tone: "armor", status: "unknown" }
      ] },
      { id: "drifter", name: "Drifter", description: "Gambit reputation, focusing, and weekly rewards.", badge: "Weekly", source: "Gambit vendor sample", resetLabel: "Weekly", category: "Tower", iconLabel: "Dr", statusLabel: "Prototype sample", items: [
        { id: "drifter-focus", name: "Gambit weapon focus", itemType: "Focused reward", summary: "Focused engram sample for Gambit reward review.", cost: "Gambit engram", iconLabel: "GB", costIconLabel: "◇", tone: "weapon", status: "unknown" },
        { id: "drifter-rank", name: "Infamy rank reward", itemType: "Rank reward", summary: "Rank lane placeholder with reset window visible.", cost: "Infamy rank", iconLabel: "IF", costIconLabel: "◎", tone: "material", status: "owned" }
      ] },
      { id: "rahool", name: "Rahool", description: "Engram decoding and material exchange.", badge: "Always on", source: "Cryptarch vendor sample", resetLabel: "Always on", category: "Tower", iconLabel: "Rh", statusLabel: "Prototype sample", items: [
        { id: "rahool-decode", name: "Exotic engram decoding", itemType: "Decoding service", summary: "Keep decoding cost and eligibility visible in the vendor layout.", cost: "Engram", iconLabel: "EX", costIconLabel: "◎", tone: "exotic", status: "recommended" },
        { id: "rahool-material", name: "Material exchange", itemType: "Exchange", summary: "Material row sample for non-weapon vendor inventory.", cost: "Legendary Shards", iconLabel: "MX", costIconLabel: "◇", tone: "material", status: "unknown" }
      ] },
      { id: "tess", name: "Tess Everis", description: "Eververse cosmetics and Bright Dust rotation.", badge: "Weekly", source: "Eververse vendor sample", resetLabel: "Weekly", category: "Events", iconLabel: "EV", statusLabel: "Prototype sample", items: [
        { id: "tess-bright-dust", name: "Bright Dust cosmetic", itemType: "Cosmetic", summary: "Weekly cosmetic rotation sample, separated from gameplay rewards.", cost: "Bright Dust", iconLabel: "BD", costIconLabel: "◇", tone: "material", status: "unknown" },
        { id: "tess-ornament", name: "Featured ornament", itemType: "Ornament", summary: "Visual item sample for non-power vendor stock.", cost: "Silver", iconLabel: "OR", costIconLabel: "◇", tone: "armor", status: "owned" }
      ] }
    ];
  }

  return [
    {
      id: "xur",
      name: "仄（Xur）",
      description: "异域与传说库存，和未确认猜测分开展示。",
      badge: "周末",
      source: "公共商人证据",
      resetLabel: "周末",
      category: "重点",
      iconLabel: "Xû",
      statusLabel: "已确认",
      featured: true,
      items: [
        { id: "xur-weapon", name: "异域脉冲步枪", itemType: "异域武器", summary: "用于检查收藏缺口和本周重点。", cost: "1 异域密码", iconLabel: "异", costIconLabel: "◎", tone: "exotic", status: "recommended" },
        { id: "xur-helmet", name: "猎人头盔属性卷", itemType: "异域护甲", summary: "属性需要进游戏或真实接口确认。", cost: "23 奇异硬币", iconLabel: "盔", costIconLabel: "◈", tone: "armor", status: "unknown" },
        { id: "xur-weapon-legendary", name: "精准手炮", itemType: "传说武器", summary: "丰盈满溢 / 爆炸载荷样本。", cost: "微光", iconLabel: "手", costIconLabel: "◇", tone: "weapon", status: "owned" },
        { id: "xur-warlock", name: "术士胸甲属性卷", itemType: "异域护甲", summary: "高纪律样本，进游戏确认总属性。", cost: "23 奇异硬币", iconLabel: "胸", costIconLabel: "◈", tone: "armor", status: "recommended" }
      ]
    },
    {
      id: "banshee",
      name: "Banshee-44",
      description: "每日武器库存与关键 perk 复查目标。",
      badge: "日更",
      source: "Manifest + 商人样本",
      resetLabel: "每日",
      category: "重点",
      iconLabel: "B4",
      statusLabel: "已确认",
      items: [
        { id: "banshee-auto", name: "高射速自动步枪", itemType: "传说武器", summary: "维持生计 / 目标锁定样本。", cost: "微光", iconLabel: "自", costIconLabel: "◇", tone: "weapon", status: "recommended" },
        { id: "banshee-scout", name: "旧赛季斥候", itemType: "传说武器", summary: "没有目标规则命中时保持低优先级。", cost: "微光", iconLabel: "侦", costIconLabel: "◇", tone: "weapon", status: "unknown" },
        { id: "banshee-fusion", name: "适配融合步枪", itemType: "传说武器", summary: "看 perk 后决定是否保留。", cost: "微光", iconLabel: "融", costIconLabel: "◇", tone: "weapon", status: "unknown" }
      ]
    },
    { id: "ada", name: "Ada-1", description: "护甲合成与外观相关库存。", badge: "周更", source: "商人样本", resetLabel: "每周", category: "重点", iconLabel: "A1", statusLabel: "已确认", items: [{ id: "ada-mod", name: "护甲合成赏金", itemType: "功能库存", summary: "保留入口，但不挤占首页。", cost: "微光", iconLabel: "织", costIconLabel: "◇", tone: "material", status: "owned" }] },
    { id: "saint", name: "Saint-14", description: "试炼声望、周末奖励和聚焦入口。", badge: "周末", source: "试炼商人样本", resetLabel: "周末", category: "塔楼", iconLabel: "S14", statusLabel: "原型样本", items: [
      { id: "saint-engram", name: "试炼记忆水晶聚焦", itemType: "聚焦奖励", summary: "周末优先查看，地图和购买资格仍以游戏内为准。", cost: "试炼记忆水晶 + 微光", iconLabel: "试", costIconLabel: "◇", tone: "weapon", status: "recommended" },
      { id: "saint-rank", name: "试炼声望轨道", itemType: "声望奖励", summary: "用于展示周末奖励入口和重置状态。", cost: "试炼声望", iconLabel: "14", costIconLabel: "◎", tone: "material", status: "unknown" }
    ] },
    { id: "zavala", name: "萨瓦拉", description: "先锋声望、聚焦和周常奖励。", badge: "周更", source: "先锋商人样本", resetLabel: "每周", category: "塔楼", iconLabel: "ZV", statusLabel: "原型样本", items: [
      { id: "zavala-engram", name: "先锋武器聚焦", itemType: "聚焦奖励", summary: "给日常打击和日落玩家保留的复查入口。", cost: "先锋记忆水晶", iconLabel: "先", costIconLabel: "◇", tone: "weapon", status: "recommended" },
      { id: "zavala-rank", name: "指挥官声望轨道", itemType: "声望奖励", summary: "展示声望重置、周常和聚焦入口的密度。", cost: "先锋声望", iconLabel: "徽", costIconLabel: "◎", tone: "material", status: "owned" }
    ] },
    { id: "shaxx", name: "沙克斯领主", description: "熔炉竞技场声望和聚焦奖励。", badge: "周更", source: "熔炉商人样本", resetLabel: "每周", category: "塔楼", iconLabel: "SX", statusLabel: "原型样本", items: [
      { id: "shaxx-engram", name: "熔炉武器聚焦", itemType: "聚焦奖励", summary: "PVP 奖励入口，命中目标 perk 时提升优先级。", cost: "熔炉记忆水晶", iconLabel: "炉", costIconLabel: "◇", tone: "weapon", status: "recommended" },
      { id: "shaxx-armor", name: "熔炉护甲样本", itemType: "活动护甲", summary: "用于检查非武器库存的图标和价格展示。", cost: "微光", iconLabel: "甲", costIconLabel: "◈", tone: "armor", status: "unknown" }
    ] },
    { id: "drifter", name: "浪客", description: "智谋声望、聚焦和周常奖励。", badge: "周更", source: "智谋商人样本", resetLabel: "每周", category: "塔楼", iconLabel: "Dr", statusLabel: "原型样本", items: [
      { id: "drifter-focus", name: "智谋武器聚焦", itemType: "聚焦奖励", summary: "智谋记忆水晶聚焦入口，低频但需要可发现。", cost: "智谋记忆水晶", iconLabel: "智", costIconLabel: "◇", tone: "weapon", status: "unknown" },
      { id: "drifter-rank", name: "恶名声望轨道", itemType: "声望奖励", summary: "保留声望重置和周常奖励位置。", cost: "恶名声望", iconLabel: "恶", costIconLabel: "◎", tone: "material", status: "owned" }
    ] },
    { id: "rahool", name: "拉乎尔", description: "记忆水晶解码和材料兑换。", badge: "常驻", source: "密码学家样本", resetLabel: "常驻", category: "塔楼", iconLabel: "Rh", statusLabel: "原型样本", items: [
      { id: "rahool-decode", name: "异域记忆水晶解码", itemType: "解码服务", summary: "常驻入口，展示资格、费用和可确认状态。", cost: "记忆水晶", iconLabel: "异", costIconLabel: "◎", tone: "exotic", status: "recommended" },
      { id: "rahool-material", name: "材料兑换", itemType: "兑换库存", summary: "非装备类库存样本，避免商人页只像武器列表。", cost: "传说碎片", iconLabel: "材", costIconLabel: "◇", tone: "material", status: "unknown" }
    ] },
    { id: "tess", name: "苔丝", description: "永恒之诗外观和光尘轮换。", badge: "周更", source: "永恒之诗样本", resetLabel: "每周", category: "特殊 / 活动", iconLabel: "EV", statusLabel: "原型样本", items: [
      { id: "tess-bright-dust", name: "光尘外观轮换", itemType: "外观库存", summary: "和战力奖励分开展示，只保留价格与轮换信号。", cost: "光尘", iconLabel: "尘", costIconLabel: "◇", tone: "material", status: "unknown" },
      { id: "tess-ornament", name: "本周精选皮肤", itemType: "装饰品", summary: "用于验证外观类商人的视觉密度。", cost: "银币", iconLabel: "饰", costIconLabel: "◇", tone: "armor", status: "owned" }
    ] }
  ];
}
