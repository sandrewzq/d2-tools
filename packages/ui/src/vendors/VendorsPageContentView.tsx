import { useState } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale } from "../i18n/types.js";
import {
  ProductWorkspaceContentStack,
  ProductWorkspaceEmptyState,
  ProductWorkspaceSideRail,
  ProductWorkspaceSplit
} from "../workspace/ProductWorkspace.js";

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
  location?: string;
  category?: string;
  iconLabel?: string;
  iconUrl?: string;
  statusLabel?: string;
  taskCategory?: string;
  displayStatusLabel?: string;
  inventoryState?: "loaded" | "empty" | "not_read" | "unavailable";
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
  sourceLabel: string;
  nextResetLabel: string;
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
  const contentSections = getVendorContentSections(selectedVendor);
  const displaySections = [...contentSections]
    .sort((left, right) => getVendorSectionOrder(left.kind) - getVendorSectionOrder(right.kind));
  const refreshStatus = props.model.statusBanner;

  if (!selectedVendor) {
    return (
      <ProductWorkspaceEmptyState className="vendor-empty-state">
        <strong>{refreshStatus?.busy ? copy.loadingTitle : copy.emptyTitle}</strong>
        {refreshStatus ? (
          <>
            <div
              role="status"
              aria-label="商人刷新状态"
              aria-live={refreshStatus.live}
              aria-busy={refreshStatus.busy}
              className={refreshStatus.tone === "error" ? "vendor-refresh-status is-error" : "vendor-refresh-status"}
            >
              {refreshStatus.message}
            </div>
            {!refreshStatus.busy && props.actions.refreshVendors ? (
              <button type="button" className="secondary-button" onClick={props.actions.refreshVendors}>
                {copy.inline["重新加载商人库存"] ?? "Reload vendor inventory"}
              </button>
            ) : null}
          </>
        ) : <span>{copy.emptyBody}</span>}
      </ProductWorkspaceEmptyState>
    );
  }

  return (
    <ProductWorkspaceSplit className="vendor-workbench-layout vendor-workbench">
      <ProductWorkspaceSideRail className="vendor-rail" ariaLabel="商人目录" scrollRegion="pane">
        <nav aria-label="商人列表" className="vendor-rail-nav">
          <div className="vendor-rail-head">
            <strong>地点目录</strong>
            <span>按地点优先</span>
          </div>
          {props.model.railSections.map((section) => (
            <section className="vendor-rail-group" key={section.id}>
              <span className="vendor-rail-category">
                <strong>{section.title}</strong>
                <small>{section.vendors.length}</small>
              </span>
              {section.vendors.map((vendor) => (
                <button
                  type="button"
                  className={vendor.id === selectedVendor.id ? "vendor-rail-item is-active" : "vendor-rail-item"}
                  key={vendor.id}
                  aria-pressed={vendor.id === selectedVendor.id}
                  onClick={() => {
                    setSelectedVendorId(vendor.id);
                    props.actions.selectVendor?.(vendor.id);
                  }}
                >
                  <span>
                    <strong>{vendor.name}</strong>
                    <small>{vendor.railStatusLabel ?? `${getVendorDisplayStatusLabel(vendor)} · ${countVendorItems(vendor)} 件`}</small>
                  </span>
                </button>
              ))}
            </section>
          ))}
        </nav>
      </ProductWorkspaceSideRail>

      <ProductWorkspaceContentStack element="section" className="vendor-detail-panel">
        <header className="vendor-detail-head">
          <div className="vendor-detail-heading">
            <div className="vendor-detail-title-row">
              <h1>{selectedVendor.name}</h1>
              <span className={selectedVendor.detailState === "failed" || selectedVendor.detailState === "partial"
                ? "app-chip status-error"
                : selectedVendor.detailState === "pending"
                  ? "app-chip status-pending"
                  : "app-chip status-ready"}
              >
                {getVendorDisplayStatusLabel(selectedVendor)}
              </span>
            </div>
            <p>{selectedVendor.description}</p>
            <div className="vendor-detail-meta">
              {selectedVendor.location ? <span>{selectedVendor.location}</span> : null}
              <span>{selectedVendor.source}</span>
              <span>{selectedVendor.resetLabel}</span>
            </div>
          </div>
          <button
            type="button"
            className="secondary-button vendor-refresh-button"
            onClick={() => props.actions.refreshVendors?.()}
            disabled={refreshStatus?.busy === true}
          >
            {refreshStatus?.busy ? "刷新中" : "刷新"}
          </button>
        </header>

        {selectedVendor.detailFailureMessage ? (
          <div
            className="vendor-detail-warning"
            role="status"
            aria-label="商人详情状态"
            aria-live="polite"
          >
            <strong>{getVendorDisplayStatusLabel(selectedVendor)}</strong>
            <span>{selectedVendor.detailFailureMessage}。当前仍显示基础销售数据，属性与插槽可能不完整。</span>
          </div>
        ) : null}

        <div className="vendor-toolbar">
          <div
            role="status"
            aria-label="商人刷新状态"
            aria-live={refreshStatus?.live ?? "polite"}
            aria-busy={refreshStatus?.busy ?? false}
            className={refreshStatus?.tone === "error" ? "vendor-refresh-status is-error" : "vendor-refresh-status"}
          >
            {refreshStatus?.message ?? "商人数据已就绪"}
          </div>
        </div>

        <VendorContentSections
          sections={displaySections}
          vendor={selectedVendor}
          actions={props.actions}
        />
      </ProductWorkspaceContentStack>
      <ProductWorkspaceSideRail element="aside" className="vendor-context" ariaLabel="当前商人上下文">
          <div className="vendor-context-head"><h3>当前商人上下文</h3><span>{props.model.selectedCharacterContext?.label ?? "当前角色"}</span></div>
          <div className="vendor-ledger">
            <div><strong>库存状态</strong><span><b>{selectedVendor.inventoryStateLabel ?? getVendorDisplayStatusLabel(selectedVendor)}</b><small>属性与插槽按当前响应显示</small></span><em className="ready">最新</em></div>
            <div><strong>来源</strong><span><b>{selectedVendor.source}</b><small>不使用过期库存</small></span><em>官方</em></div>
            <div><strong>刷新</strong><span><b>{selectedVendor.resetLabel}</b><small>{props.model.nextResetLabel}</small></span><em>重置边界</em></div>
            <div><strong>已核验物品</strong><span><b>{props.model.verifiedItemCount} 件</b><small>可打开装备详情核对 Roll 与成本</small></span><em className="ready">{props.model.verifiedItemCount}</em></div>
          </div>
        </ProductWorkspaceSideRail>
    </ProductWorkspaceSplit>
  );
}

function getVendorSectionOrder(kind: VendorContentSectionView["kind"]): number {
  if (kind === "inventory") return 0;
  if (kind === "subinventory") return 1;
  if (kind === "tasks") return 2;
  return 3;
}

function VendorContentSections(props: {
  sections: VendorContentSectionView[];
  vendor: VendorInventoryGroupView;
  actions: VendorsPageActions;
}) {
  if (!props.sections.length) {
    return (
      <ProductWorkspaceEmptyState className="vendor-empty-state vendor-empty-card">
        <strong>当前没有可显示的库存</strong>
        <span>{getVendorDisplayStatusLabel(props.vendor)}</span>
      </ProductWorkspaceEmptyState>
    );
  }

  return (
    <div className="vendor-content-flow">
      {props.sections.map((section) => {
        const isSubinventory = section.kind === "subinventory";
        const subinventoryIndex = isSubinventory
          ? props.sections.filter((candidate) => candidate.kind === "subinventory").findIndex((candidate) => candidate.id === section.id) + 1
          : 0;
        const itemCount = countSectionItems(section);
        const headingId = `vendor-section-${section.id}`;

        return (
          <section
            className={isSubinventory
              ? `vendor-content-section is-${section.layout} is-subinventory`
              : `vendor-content-section is-${section.layout}`}
            key={section.id}
            aria-labelledby={headingId}
          >
            <div className="vendor-section-heading">
              <div className="vendor-section-heading-main">
                {isSubinventory ? (
                  <span className="vendor-section-kicker">
                    {props.vendor.name} · 子库存 {String(subinventoryIndex).padStart(2, "0")}
                  </span>
                ) : null}
                <h2 id={headingId}>{section.name}</h2>
                {isSubinventory && section.description ? <p>{section.description}</p> : null}
              </div>
              {isSubinventory ? (
                <span className="vendor-section-summary">
                  <strong>{itemCount}</strong>
                  <small>{section.groups.length} 个分类</small>
                </span>
              ) : (
                <span className="vendor-section-meta">{section.description ?? `${itemCount} 件`}</span>
              )}
            </div>
            {section.layout === "rank" ? (
              <VendorRankSection section={section} vendor={props.vendor} actions={props.actions} />
            ) : section.layout === "featured" ? (
              <div className="vendor-inventory-grid vendor-featured-grid">
                {section.groups.flatMap((group) => group.items).map((item) => (
                  <VendorOfferButton key={item.id} item={item} vendor={props.vendor} actions={props.actions} />
                ))}
              </div>
            ) : (
              <div className="vendor-category-columns">
                {section.groups.map((group) => {
                  const groupHeadingId = `${headingId}-${group.id}`;
                  return (
                    <section
                      className="vendor-category-column"
                      key={group.id}
                      aria-labelledby={group.name ? groupHeadingId : headingId}
                    >
                      {group.name ? (
                        <div className="vendor-category-heading">
                          <h3 id={groupHeadingId}>{group.name}</h3>
                          <span>{group.items.length} 件</span>
                        </div>
                      ) : null}
                      <div className="vendor-compact-list">
                        {group.items.map((item) => (
                          <VendorOfferButton
                            key={item.id}
                            item={item}
                            vendor={props.vendor}
                            actions={props.actions}
                            compact
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function VendorRankSection(props: {
  section: VendorContentSectionView;
  vendor: VendorInventoryGroupView;
  actions: VendorsPageActions;
}) {
  const progression = props.section.progression;
  const rewardGroup = props.section.groups[0];
  const rewards = props.section.groups.flatMap((group) => group.items);
  const currentStepProgress = progression
    ? Math.max(0, progression.nextLevelAt - progression.progressToNextLevel)
    : 0;
  const progressPercent = progression?.nextLevelAt
    ? Math.min(100, Math.max(0, currentStepProgress / progression.nextLevelAt * 100))
    : 0;

  return (
    <div className="vendor-rank-layout">
      {progression ? (
        <section className="vendor-rank-summary" aria-label="商人声望进度">
          <div className="vendor-rank-level">
            <span>当前等级</span>
            <div>
              <strong>{props.vendor.name}声望</strong>
              <b>{progression.level}</b>
            </div>
          </div>
          <div className="vendor-rank-progress-body">
            <div className="vendor-rank-progress-label">
              <span>本级进度 {currentStepProgress} / {progression.nextLevelAt}</span>
              <span>累计进度 {progression.currentProgress}</span>
            </div>
            <div className="vendor-rank-progress" aria-label={`声望进度 ${Math.round(progressPercent)}%`}>
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <dl className="vendor-rank-metrics">
              <div><dt>距离下一等级</dt><dd>{progression.progressToNextLevel} 点</dd></div>
              <div><dt>等级上限</dt><dd>{progression.levelCap}</dd></div>
              <div><dt>奖励节点</dt><dd>{rewards.length}</dd></div>
            </dl>
          </div>
        </section>
      ) : null}
      <section className="vendor-rank-reward-section" aria-labelledby={`vendor-rank-rewards-${props.section.id}`}>
        <div className="vendor-category-heading vendor-rank-reward-heading">
          <h3 id={`vendor-rank-rewards-${props.section.id}`}>{rewardGroup?.name || "等级奖励"}</h3>
          <span>{rewards.length} 个奖励节点</span>
        </div>
        <div className="vendor-rank-rewards">
          {rewards.map((item) => (
            <button
              type="button"
              className="vendor-rank-reward"
              key={item.id}
              aria-label={`查看${item.name}资料库详情`}
              onClick={() => props.actions.onOpenItem?.(item, {
                vendorName: props.vendor.name,
                costLabel: "等级奖励",
                affordabilityLabel: "随商人等级解锁",
                characterLabel: item.characterIds?.join("、") ?? "当前角色",
                refreshLabel: props.vendor.resetLabel,
                rollLabels: item.socketPlugs?.map((plug) => plug.name).filter(Boolean),
                stats: item.stats
              })}
            >
              <VendorItemArt item={item} />
              <span>
                <strong>{item.name}</strong>
                <small>{item.itemType || "等级奖励"}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function getVendorContentSections(vendor: VendorInventoryGroupView | null): VendorContentSectionView[] {
  if (!vendor) return [];
  if (vendor.contentSections?.length) return vendor.contentSections;

  const sections: VendorContentSectionView[] = [];
  if (vendor.items.length) {
    sections.push({
      id: `${vendor.id}-inventory`,
      kind: "inventory",
      name: "库存",
      layout: "featured",
      groups: [{ id: `${vendor.id}-inventory-items`, name: "", items: vendor.items }]
    });
  }
  for (const service of vendor.services ?? []) {
    if (!service.items.length) continue;
    sections.push({
      id: service.id,
      kind: "subinventory",
      name: service.name,
      description: service.description || `${service.items.length} 件`,
      layout: (service.sections?.length ?? 0) > 1 ? "columns" : "list",
      groups: service.sections?.length ? service.sections : [{
        id: `${service.id}-items`,
        name: "",
        items: service.items
      }]
    });
  }
  if (vendor.rankRewards?.length || vendor.progression) {
    sections.push({
      id: `${vendor.id}-rank`,
      kind: "reputation",
      name: "声望与等级",
      layout: "rank",
      progression: vendor.progression,
      groups: [{ id: `${vendor.id}-rank-items`, name: "等级奖励", items: vendor.rankRewards ?? [] }]
    });
  }
  if (vendor.taskItems?.length) {
    sections.push({
      id: `${vendor.id}-tasks`,
      kind: "tasks",
      name: "任务",
      layout: "featured",
      groups: [{ id: `${vendor.id}-task-items`, name: "", items: vendor.taskItems }]
    });
  }
  return sections;
}

function countSectionItems(section: VendorContentSectionView): number {
  return section.groups.reduce((count, group) => count + group.items.length, 0);
}

function countVendorItems(vendor: VendorInventoryGroupView): number {
  return getVendorContentSections(vendor).reduce((count, section) => count + countSectionItems(section), 0);
}

function VendorOfferButton(props: {
  item: VendorInventoryItemView;
  vendor: VendorInventoryGroupView;
  actions: VendorsPageActions;
  compact?: boolean;
}) {
  const costLabel = props.item.costs?.map((cost) => `${cost.required} ${cost.label}`).join(" · ")
    ?? props.item.cost
    ?? "无费用信息";
  const affordable = props.item.costs?.every((cost) => cost.affordable === true);
  return (
    <button
      type="button"
      className={props.compact ? "vendor-stock-card is-compact" : "vendor-stock-card"}
      data-tone={props.item.tone}
      aria-label={`查看${props.item.name}详情`}
      onClick={() => props.actions.onOpenItem?.(props.item, {
        vendorName: props.vendor.name,
        inventoryPath: props.item.sourcePath ?? [props.vendor.name, props.item.categoryName].filter(Boolean).join(" / "),
        costLabel,
        affordabilityLabel: affordable ? "可购买" : "货币不足或未知",
        characterLabel: props.item.characterIds?.join("、") ?? "当前角色",
        refreshLabel: props.vendor.resetLabel,
        purchaseRequirements: props.item.failureMessages ?? [],
        rollLabels: props.item.socketPlugs?.map((plug) => plug.name).filter(Boolean),
        stats: props.item.stats
      })}
    >
      <VendorItemArt item={props.item} />
      <span className="vendor-stock-body">
        <span className="vendor-stock-title">
          <strong>{props.item.name}</strong>
          {props.item.quantity && props.item.quantity > 1
            ? <span className="vendor-quantity-badge">× {props.item.quantity.toLocaleString("zh-CN")}</span>
            : null}
        </span>
        <span>{props.item.itemType}</span>
      </span>
      <span className="vendor-cost-row">
        <span>{costLabel}</span>
      </span>
    </button>
  );
}

function VendorItemArt(props: { item: VendorInventoryItemView }) {
  return (
    <span className="vendor-item-art" data-tone={props.item.tone} aria-hidden="true">
      {props.item.iconUrl ? (
        <img src={props.item.iconUrl} alt="" width="58" height="58" loading="lazy" />
      ) : (
        <span>{props.item.iconLabel}</span>
      )}
    </span>
  );
}

function getVendorDisplayStatusLabel(vendor: VendorInventoryGroupView): string {
  return vendor.displayStatusLabel ?? vendor.statusLabel ?? vendor.badge;
}
