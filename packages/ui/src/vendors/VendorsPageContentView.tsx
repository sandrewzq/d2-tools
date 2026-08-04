import { useState } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale } from "../i18n/types.js";
import { GameAssetImage } from "../media/GameAssetImage.js";
import { formatFullDateTime, formatScheduleDateTime } from "../time/formatTime.js";
import {
  ProductWorkspaceEmptyState,
  ProductWorkspaceSideRail,
  ProductWorkspaceSplit
} from "../workspace/ProductWorkspace.js";
import { getVendorEquipmentKind } from "./vendorEquipment.js";

export type VendorCostView = {
  label: string;
  required: number;
  owned: number | null;
  affordable: boolean | null;
  iconUrl?: string;
};

export type VendorInventoryItemView = {
  id: string;
  itemHash?: number;
  quantity?: number;
  vendorItemIndex?: number;
  vendorHash?: number;
  categoryIndex?: number;
  categoryName?: string;
  characterIds?: string[];
  name: string;
  itemType: string;
  summary: string;
  cost?: string;
  costs?: VendorCostView[];
  iconLabel: string;
  iconUrl?: string;
  costIconLabel?: string;
  costIconUrl?: string;
  tone: "exotic" | "weapon" | "armor" | "material";
  status: "owned" | "recommended" | "unknown";
  decisionLabel?: string;
  canPurchase?: boolean;
  failureMessages?: string[];
  stats?: Record<string, number>;
  socketPlugs?: Array<{
    hash: number;
    name: string;
    iconUrl?: string;
    description?: string;
    categoryIdentifier?: string;
    statModifiers?: Record<string, number>;
    itemType?: string;
  }>;
  sourcePath?: string;
};

export type VendorInventorySectionView = {
  id: string;
  name: string;
  description?: string;
  presentation?: "standard" | "featured";
  items: VendorInventoryItemView[];
};

export type VendorProgressionView = {
  currentProgress: number;
  level: number;
  levelCap: number;
  progressToNextLevel: number;
  nextLevelAt: number;
};

export type VendorContentSectionView = {
  id: string;
  kind: "reputation" | "inventory" | "subinventory" | "tasks";
  scope?: "character" | "account" | "clan";
  action?: "purchase" | "exchange" | "focus" | "decode" | "claim" | "acquire" | "inspect";
  condition?: string;
  name: string;
  description?: string;
  layout: "featured" | "columns" | "list" | "rank";
  groups: VendorInventorySectionView[];
  progression?: VendorProgressionView;
};

export type VendorServiceView = {
  id: string;
  name: string;
  description: string;
  items: VendorInventoryItemView[];
  sections?: VendorInventorySectionView[];
};

export type VendorInventoryGroupView = {
  id: string;
  vendorHash?: number;
  name: string;
  description: string;
  badge: string;
  source: string;
  resetLabel: string;
  resetAt?: string;
  location?: string;
  category?: string;
  iconLabel?: string;
  iconUrl?: string;
  statusLabel?: string;
  taskCategory?: string;
  displayStatusLabel?: string;
  inventoryState?: "loaded" | "empty" | "unavailable";
  inventoryStateLabel?: string;
  railStatusLabel?: string;
  detailToolbar?: VendorDetailToolbarView;
  detailState?: "pending" | "ready" | "partial" | "failed";
  detailFailureMessage?: string;
  featured?: boolean;
  items: VendorInventoryItemView[];
  services?: VendorServiceView[];
  rankRewards?: VendorInventoryItemView[];
  taskItems?: VendorInventoryItemView[];
  progression?: VendorProgressionView;
  contentSections?: VendorContentSectionView[];
};

export type VendorRailSectionView = {
  id: string;
  title: string;
  vendors: VendorInventoryGroupView[];
};

export type VendorDetailToolbarView = {
  taskCategory: string;
  inventoryStateLabel: string;
  statusLabel: string;
  itemCountLabel: string;
};

export type VendorCharacterContextView = {
  characterId?: string;
  armorerModHash: number | null;
  armorerModName: string | null;
  label: string;
};

export type VendorStatusBannerView = {
  tone: "neutral" | "error";
  message: string;
  live: "polite";
  busy: boolean;
} | null;

export type VendorsPageModelView = {
  vendors: VendorInventoryGroupView[];
  railSections: VendorRailSectionView[];
  defaultVendorId?: string | null;
  selectedVendor?: VendorInventoryGroupView;
  updatedLabel: string;
  updatedAt?: string;
  sourceLabel: string;
  nextResetLabel: string;
  nextResetAt?: string;
  recommendationCount: number;
  verifiedItemCount: number;
  selectedCharacterContext?: VendorCharacterContextView | null;
  statusBanner?: VendorStatusBannerView;
};

export type VendorOfferContextView = {
  vendorName: string;
  inventoryPath?: string;
  costLabel: string;
  affordabilityLabel: string;
  characterLabel: string;
  refreshLabel: string;
  purchaseRequirements?: string[];
  rollLabels?: string[];
  stats?: Record<string, number>;
};

export type VendorsPageActions = {
  selectVendor?: (vendorId: string) => void;
  refreshVendors?: () => void;
  onOpenItem?: (item: VendorInventoryItemView, context: VendorOfferContextView) => void;
};

export type VendorsPageContentViewProps = {
  interfaceLocale?: InterfaceLocale;
  model: VendorsPageModelView;
  actions: VendorsPageActions;
};

export function VendorsPageContentView(props: VendorsPageContentViewProps) {
  const locale = props.interfaceLocale ?? "zh-CN";
  const copy = getLocaleCopy(locale).vendors;
  const initialVendorId = props.model.defaultVendorId
    ?? props.model.vendors.find((vendor) => vendor.featured)?.id
    ?? props.model.vendors[0]?.id
    ?? "";
  const [selectedVendorId, setSelectedVendorId] = useState(initialVendorId);
  const selectedVendor = props.model.vendors.find((vendor) => vendor.id === selectedVendorId)
    ?? props.model.selectedVendor
    ?? props.model.vendors[0]
    ?? null;
  const refreshStatus = props.model.statusBanner;

  if (!selectedVendor) {
    return (
      <ProductWorkspaceEmptyState
        className="vendor-page-empty"
        ariaLabel="商人刷新状态"
        role="status"
        ariaLive={refreshStatus?.live ?? "polite"}
        ariaBusy={refreshStatus?.busy ?? false}
      >
        <strong>{refreshStatus?.busy ? copy.loadingTitle : copy.emptyTitle}</strong>
        <span>{refreshStatus?.message ?? copy.emptyBody}</span>
        {!refreshStatus?.busy && props.actions.refreshVendors ? <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.actions.refreshVendors}>{copy.inline["重新加载商人库存"] ?? "重新加载商人库存"}</button> : null}
      </ProductWorkspaceEmptyState>
    );
  }

  const contentSections = [...getVendorContentSections(selectedVendor)]
    .sort((left, right) => getVendorSectionOrder(left.kind) - getVendorSectionOrder(right.kind));
  const vendorStatus = getVendorStatus(selectedVendor);
  const selectedVendorResetLabel = formatVendorReset(selectedVendor, locale);
  const updatedLabel = formatFullDateTime(props.model.updatedAt, props.model.updatedLabel);
  const nextResetLabel = formatScheduleDateTime(props.model.nextResetAt, locale, props.model.nextResetLabel);
  const toolbarMessage = refreshStatus?.message
    ?? (selectedVendor.detailState === "pending"
      ? "商人详情正在读取；不会回退到旧库存。"
      : selectedVendor.detailState === "partial"
        ? "商人详情部分可用；缺失范围已在下方标注。"
        : "商人数据已就绪");

  return (
    <ProductWorkspaceSplit className="vendor-workbench-layout vendor-workbench">
      <ProductWorkspaceSideRail className="vendor-rail" ariaLabel="商人地点目录" scrollRegion="pane">
        <div className="vendor-column-head"><strong>地点目录</strong><span>{props.model.vendors.length} 个商人</span></div>
        <nav aria-label="商人列表" className="vendor-rail-nav">
          {props.model.railSections.map((section) => (
            <section className="vendor-location-group" key={section.id} aria-label={section.title}>
              <strong className="vendor-location-title">{section.title}</strong>
              {section.vendors.map((vendor) => {
                const active = vendor.id === selectedVendor.id;
                return (
                  <button
                    type="button"
                    className={active ? "vendor-rail-item is-active" : "vendor-rail-item"}
                    key={vendor.id}
                    aria-current={active ? "page" : undefined}
                    data-status={getVendorStatus(vendor)}
                    onClick={() => {
                      setSelectedVendorId(vendor.id);
                      props.actions.selectVendor?.(vendor.id);
                    }}
                  >
                    <span><strong>{vendor.name}</strong><small>{vendor.railStatusLabel ?? getVendorDisplayStatusLabel(vendor)}</small></span>
                  </button>
                );
              })}
            </section>
          ))}
        </nav>
      </ProductWorkspaceSideRail>

      <section className="vendor-detail-main">
        <header className="vendor-hero">
          <div>
            <span className="vendor-eyebrow">{selectedVendor.location || "地点待确认"}</span>
            <h2>{selectedVendor.name}</h2>
            <p>{selectedVendor.description || "当前商人没有额外说明"}</p>
            <div className="vendor-hero-meta">
              <span>{selectedVendor.source}</span>
              <span>{selectedVendorResetLabel}</span>
              <span>{countVendorItems(selectedVendor)} 个可见条目</span>
            </div>
          </div>
          <span className="vendor-status-chip" data-status={vendorStatus}>{getVendorDisplayStatusLabel(selectedVendor)}</span>
        </header>

        <div className="vendor-toolbar" role="status" aria-label="商人刷新状态" aria-live={refreshStatus?.live ?? "polite"} aria-busy={refreshStatus?.busy ?? false}>
          <span>{props.model.selectedCharacterContext?.label ?? "当前机灵：未检测到护甲师模组"}</span>
          <span data-status={refreshStatus?.tone === "error" ? "error" : vendorStatus}>{toolbarMessage}</span>
        </div>

        <div className="vendor-detail-flow">
          {selectedVendor.detailFailureMessage ? (
            <div className="vendor-detail-warning" data-status="warning" role="status" aria-label="商人详情状态">
              <strong>{getVendorDisplayStatusLabel(selectedVendor)}</strong>
              <span>{selectedVendor.detailFailureMessage}。当前仍显示基础销售数据，属性与插槽可能不完整。</span>
            </div>
          ) : null}
          <VendorContentSections sections={contentSections} vendor={selectedVendor} actions={props.actions} locale={locale} />
        </div>
      </section>

      <ProductWorkspaceSideRail element="aside" className="vendor-context" ariaLabel="当前商人上下文">
        <div className="vendor-column-head"><strong>当前商人上下文</strong><span>{props.model.selectedCharacterContext?.characterId ?? "当前角色"}</span></div>
        <div className="vendor-ledger">
          <div><strong>库存状态</strong><span><b>{selectedVendor.inventoryStateLabel ?? getVendorDisplayStatusLabel(selectedVendor)}</b><small>属性与插槽按当前响应显示</small></span><em data-status={vendorStatus}>{getVendorDisplayStatusLabel(selectedVendor)}</em></div>
          <div><strong>来源</strong><span><b>{selectedVendor.source}</b><small>{updatedLabel}</small></span><em data-status="pending">官方</em></div>
          <div><strong>刷新</strong><span><b>{selectedVendorResetLabel}</b><small>{nextResetLabel}</small></span><em>重置边界</em></div>
          <div><strong>已核验物品</strong><span><b>{props.model.verifiedItemCount.toLocaleString("zh-CN")} 件</b><small>当前快照的全局核验范围</small></span><em data-status="success">{props.model.verifiedItemCount.toLocaleString("zh-CN")}</em></div>
        </div>
      </ProductWorkspaceSideRail>
    </ProductWorkspaceSplit>
  );
}

function VendorContentSections(props: {
  sections: VendorContentSectionView[];
  vendor: VendorInventoryGroupView;
  actions: VendorsPageActions;
  locale: InterfaceLocale;
}) {
  if (!props.sections.length) {
    return <ProductWorkspaceEmptyState className="vendor-empty-section"><strong>当前没有可显示的库存</strong><span>{getVendorDisplayStatusLabel(props.vendor)}</span></ProductWorkspaceEmptyState>;
  }

  let subinventoryIndex = 0;
  return (
    <div className="vendor-content-sections">
      {props.sections.map((section) => {
        const isSubinventory = section.kind === "subinventory";
        const currentSubinventoryIndex = isSubinventory ? ++subinventoryIndex : 0;
        const itemCount = countSectionItems(section);
        const headingId = `vendor-section-${section.id}`;
        return (
          <section className="vendor-content-section" key={section.id} aria-labelledby={headingId}>
            <header className="vendor-section-heading">
              <div>
                {isSubinventory ? <small>{props.vendor.name} · 子库存 {String(currentSubinventoryIndex).padStart(2, "0")}</small> : null}
                <h3 id={headingId}>{section.name}</h3>
              </div>
              <span>{isSubinventory ? `${itemCount} 件 · ${section.groups.length} 个分类` : section.description ?? `${itemCount} 件`}</span>
            </header>
            {isSubinventory && section.description ? <p className="vendor-section-description">{section.description}</p> : null}
            {section.kind === "reputation" ? (
              <VendorRankSummary section={section} vendor={props.vendor} />
            ) : null}
            {section.groups.map((group) => (
              <section className="vendor-offer-group" key={group.id} aria-label={group.name || section.name}>
                {section.groups.length > 1 ? <div className="vendor-offer-group-head"><strong>{group.name || section.name}</strong><span>{group.items.length} 件</span></div> : null}
                <div className="vendor-offer-grid">
                  {group.items.map((item) => <VendorOfferButton key={item.id} item={item} vendor={props.vendor} actions={props.actions} locale={props.locale} />)}
                </div>
              </section>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function VendorRankSummary(props: { section: VendorContentSectionView; vendor: VendorInventoryGroupView }) {
  const progression = props.section.progression;
  if (!progression) return null;
  const rewards = props.section.groups.flatMap((group) => group.items);
  const currentStepProgress = Math.max(0, progression.nextLevelAt - progression.progressToNextLevel);
  const progressPercent = progression.nextLevelAt
    ? Math.min(100, Math.max(0, currentStepProgress / progression.nextLevelAt * 100))
    : 0;

  return (
    <div className="vendor-rank-panel">
      <div className="vendor-rank-number"><span>当前等级</span><strong>{progression.level}</strong><small>{props.vendor.name}声望</small></div>
      <dl className="vendor-rank-ledger">
        <div><dt>本级进度</dt><dd><strong>{currentStepProgress} / {progression.nextLevelAt}</strong><small>累计进度 {progression.currentProgress}</small></dd><span>{Math.round(progressPercent)}%</span></div>
        <div><dt>距离下一等级</dt><dd><strong>{progression.progressToNextLevel} 点</strong><small>等级上限 {progression.levelCap}</small></dd><span>{rewards.length} 个奖励节点</span></div>
      </dl>
    </div>
  );
}

function VendorOfferButton(props: {
  item: VendorInventoryItemView;
  vendor: VendorInventoryGroupView;
  actions: VendorsPageActions;
  locale: InterfaceLocale;
}) {
  const availability = getVendorOfferAvailability(props.item);
  const costLabel = getVendorCostLabel(props.item);
  const equipmentKind = getVendorEquipmentKind(props.item);
  const rollLabel = props.item.socketPlugs?.map((plug) => plug.name).filter(Boolean).slice(0, 2).join(" · ");
  const content = <>
    <span className="vendor-offer-header">
      <VendorItemArt item={props.item} />
      <span className="vendor-offer-copy">
        <span className="vendor-offer-title"><strong>{props.item.name}</strong>{props.item.quantity && props.item.quantity > 1 ? <em>× {props.item.quantity.toLocaleString("zh-CN")}</em> : null}</span>
        <span className="vendor-offer-summary">{props.item.itemType || "类型待确认"}{props.item.summary ? ` · ${props.item.summary}` : ""}</span>
        {rollLabel ? <span className="vendor-offer-roll">{rollLabel}</span> : null}
      </span>
    </span>
    <span className="vendor-offer-footer">
      <VendorCosts item={props.item} fallback={costLabel} />
      <span className="vendor-offer-status" data-status={availability.status}>{availability.label}</span>
    </span>
  </>;

  if (!equipmentKind || !props.actions.onOpenItem || props.item.itemHash === undefined) {
    return <article className="vendor-offer-card is-readonly" data-tone={props.item.tone} data-status={availability.status}>{content}</article>;
  }

  return (
    <button
      type="button"
      className="vendor-offer-card"
      data-tone={props.item.tone}
      data-status={availability.status}
      aria-label={`打开装备详情：${props.item.name}`}
      onClick={() => props.actions.onOpenItem?.(props.item, {
        vendorName: props.vendor.name,
        inventoryPath: props.item.sourcePath ?? [props.vendor.name, props.item.categoryName].filter(Boolean).join(" / "),
        costLabel,
        affordabilityLabel: availability.label,
        characterLabel: props.item.characterIds?.join("、") ?? "当前角色",
        refreshLabel: formatVendorReset(props.vendor, props.locale),
        purchaseRequirements: props.item.failureMessages ?? [],
        rollLabels: props.item.socketPlugs?.map((plug) => plug.name).filter(Boolean),
        stats: props.item.stats
      })}
    >
      {content}
    </button>
  );
}

function VendorCosts(props: { item: VendorInventoryItemView; fallback: string }) {
  if (!props.item.costs?.length) return <span className="vendor-offer-cost">{props.fallback}</span>;
  return (
    <span className="vendor-offer-costs">
      {props.item.costs.map((cost, index) => (
        <span key={`${cost.label}-${index}`} data-status={cost.affordable === false ? "warning" : "neutral"}>
          <GameAssetImage src={cost.iconUrl} alt="" />
          <span>{cost.required.toLocaleString("zh-CN")} {cost.label}</span>
        </span>
      ))}
    </span>
  );
}

function VendorItemArt(props: { item: VendorInventoryItemView }) {
  return (
    <span className={props.item.iconUrl ? "vendor-item-art" : "vendor-item-art vendor-item-art-missing"} role={props.item.iconUrl ? undefined : "img"} aria-label={props.item.iconUrl ? undefined : `${props.item.name}图标未读取`}>
      <span className="vendor-item-art-fallback" aria-hidden="true">{props.item.iconLabel.slice(0, 1)}</span>
      <GameAssetImage src={props.item.iconUrl} alt="" />
    </span>
  );
}

function getVendorContentSections(vendor: VendorInventoryGroupView): VendorContentSectionView[] {
  if (vendor.contentSections?.length) return vendor.contentSections;
  const sections: VendorContentSectionView[] = [];
  if (vendor.items.length) sections.push({ id: `${vendor.id}-inventory`, kind: "inventory", name: "库存", layout: "featured", groups: [{ id: `${vendor.id}-inventory-items`, name: "", items: vendor.items }] });
  for (const service of vendor.services ?? []) {
    if (!service.items.length) continue;
    sections.push({ id: service.id, kind: "subinventory", name: service.name, description: service.description || `${service.items.length} 件`, layout: (service.sections?.length ?? 0) > 1 ? "columns" : "list", groups: service.sections?.length ? service.sections : [{ id: `${service.id}-items`, name: "", items: service.items }] });
  }
  if (vendor.taskItems?.length) sections.push({ id: `${vendor.id}-tasks`, kind: "tasks", name: "任务", layout: "featured", groups: [{ id: `${vendor.id}-task-items`, name: "", items: vendor.taskItems }] });
  if (vendor.rankRewards?.length || vendor.progression) sections.push({ id: `${vendor.id}-rank`, kind: "reputation", name: "声望与等级", layout: "rank", progression: vendor.progression, groups: [{ id: `${vendor.id}-rank-items`, name: "等级奖励", items: vendor.rankRewards ?? [] }] });
  return sections;
}

function getVendorSectionOrder(kind: VendorContentSectionView["kind"]): number {
  if (kind === "inventory") return 0;
  if (kind === "subinventory") return 1;
  if (kind === "tasks") return 2;
  return 3;
}

function countSectionItems(section: VendorContentSectionView): number {
  return section.groups.reduce((count, group) => count + group.items.length, 0);
}

function countVendorItems(vendor: VendorInventoryGroupView): number {
  return getVendorContentSections(vendor).reduce((count, section) => count + countSectionItems(section), 0);
}

function getVendorDisplayStatusLabel(vendor: VendorInventoryGroupView): string {
  return vendor.displayStatusLabel ?? vendor.statusLabel ?? vendor.badge;
}

function getVendorStatus(vendor: VendorInventoryGroupView): "neutral" | "pending" | "success" | "warning" | "error" {
  if (vendor.detailState === "ready" || vendor.inventoryState === "loaded") return "success";
  if (vendor.detailState === "pending") return "pending";
  if (vendor.detailState === "partial") return "warning";
  if (vendor.detailState === "failed" || vendor.inventoryState === "unavailable") return "error";
  return "neutral";
}

function getVendorOfferAvailability(item: VendorInventoryItemView): { label: string; status: "success" | "warning" | "neutral" } {
  if (item.canPurchase === true) return { label: "可购买", status: "success" };
  if (item.canPurchase === false) return { label: item.failureMessages?.[0] || "当前不可购买", status: "warning" };
  return { label: item.failureMessages?.[0] || "条件待确认", status: "neutral" };
}

function getVendorCostLabel(item: VendorInventoryItemView): string {
  return item.costs?.map((cost) => `${cost.required} ${cost.label}`).join(" · ") ?? item.cost ?? "无费用信息";
}

function formatVendorReset(vendor: VendorInventoryGroupView, locale: InterfaceLocale): string {
  return formatScheduleDateTime(vendor.resetAt, locale, vendor.resetLabel);
}
