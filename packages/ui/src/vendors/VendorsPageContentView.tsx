import { useMemo, useState } from "react";
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
  vendorItemIndex?: number;
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
  stats?: Record<string, number>;
  sourcePath?: string;
};

export type VendorServiceView = {
  id: string;
  name: string;
  description: string;
  items: VendorInventoryItemView[];
};

export type VendorInventoryGroupView = {
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
  inventoryState?: "loaded" | "empty" | "not_read" | "unavailable";
  inventoryStateLabel?: string;
  railStatusLabel?: string;
  detailToolbar?: VendorDetailToolbarView;
  detailState?: "ready" | "partial" | "failed";
  detailFailureMessage?: string;
  featured?: boolean;
  items: VendorInventoryItemView[];
  services?: VendorServiceView[];
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
  costLabel: string;
  affordabilityLabel: string;
  characterLabel: string;
  refreshLabel: string;
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
  const [query, setQuery] = useState("");
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const selectedVendor = props.model.vendors.find((vendor) => vendor.id === selectedVendorId)
    ?? props.model.selectedVendor
    ?? props.model.vendors[0]
    ?? null;
  const searchGroups = useMemo(
    () => query.trim() ? searchAllVendors(props.model.vendors, query) : [],
    [props.model.vendors, query]
  );
  const refreshStatus = props.model.statusBanner;

  if (!selectedVendor) {
    return (
      <ProductWorkspaceEmptyState className="vendor-empty-state">
        <strong>{copy.emptyTitle}</strong>
        {refreshStatus ? (
          <div
            role="status"
            aria-label="商人刷新状态"
            aria-live={refreshStatus.live}
            aria-busy={refreshStatus.busy}
            className={refreshStatus.tone === "error" ? "vendor-refresh-status is-error" : "vendor-refresh-status"}
          >
            {refreshStatus.message}
          </div>
        ) : <span>{copy.emptyBody}</span>}
      </ProductWorkspaceEmptyState>
    );
  }

  return (
    <ProductWorkspaceSplit className="vendor-workbench-layout">
      <ProductWorkspaceSideRail className="vendor-rail" ariaLabel="商人目录">
        <nav aria-label="商人列表" className="vendor-rail-nav">
          <div className="vendor-rail-head">
            <strong>{copy.inline["商人"] ?? "Vendors"}</strong>
            <span>{props.model.vendors.length} {copy.inline["个来源"] ?? "sources"}</span>
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
                    setQuery("");
                    setExpandedServiceId(null);
                    props.actions.selectVendor?.(vendor.id);
                  }}
                >
                  <span>
                    <strong>{vendor.name}</strong>
                    <small>{vendor.railStatusLabel ?? `${getVendorDisplayStatusLabel(vendor)} · ${vendor.items.length} 件`}</small>
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
              <h3>{selectedVendor.name}</h3>
              <span className={selectedVendor.detailState === "failed" || selectedVendor.detailState === "partial"
                ? "app-chip status-error"
                : "app-chip status-ready"}
              >
                {getVendorDisplayStatusLabel(selectedVendor)}
              </span>
            </div>
            <p>{selectedVendor.description}</p>
            <div className="vendor-detail-meta">
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
          <label className="vendor-search-field">
            <span>搜索全部商人库存</span>
            <input
              type="search"
              name="vendor-search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </label>
          <span className="vendor-armorer-context">
            {props.model.selectedCharacterContext?.label ?? "当前机灵：未检测到护甲师模组"}
          </span>
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

        {query.trim() ? (
          <VendorSearchResults groups={searchGroups} actions={props.actions} />
        ) : (
          <>
            <VendorInventoryGrid vendor={selectedVendor} actions={props.actions} />
            {(selectedVendor.services ?? []).length ? (
              <section className="vendor-services" aria-label="商人服务">
                <h4>服务与兑换</h4>
                {(selectedVendor.services ?? []).map((service) => {
                  const expanded = expandedServiceId === service.id;
                  const contentId = `vendor-service-${service.id}`;
                  return (
                    <div className="vendor-service" key={service.id}>
                      <button
                        type="button"
                        className="vendor-service-trigger"
                        aria-label={expanded ? `收起${service.name}` : `展开${service.name}`}
                        aria-expanded={expanded}
                        aria-controls={contentId}
                        onClick={() => setExpandedServiceId(expanded ? null : service.id)}
                      >
                        <span>{service.name}</span>
                        <small>{service.items.length} 件</small>
                        <span>{expanded ? `收起${service.name}` : `展开${service.name}`}</span>
                      </button>
                      {expanded ? (
                        <div id={contentId}>
                          <ul className="vendor-service-grid" aria-label={`${service.name}兑换库存`}>
                            {service.items.map((item) => (
                              <li key={item.id}>
                                <VendorOfferButton item={item} vendor={selectedVendor} actions={props.actions} compact />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </section>
            ) : null}
          </>
        )}
      </ProductWorkspaceContentStack>
    </ProductWorkspaceSplit>
  );
}

function VendorInventoryGrid(props: { vendor: VendorInventoryGroupView; actions: VendorsPageActions }) {
  if (!props.vendor.items.length) {
    return (
      <ProductWorkspaceEmptyState className="vendor-empty-state vendor-empty-card">
        <strong>当前没有可显示的库存</strong>
        <span>{getVendorDisplayStatusLabel(props.vendor)}</span>
      </ProductWorkspaceEmptyState>
    );
  }
  return (
    <section className="vendor-inventory-section" aria-label={`${props.vendor.name}主库存`}>
      <div className="vendor-section-heading">
        <h4>主库存</h4>
        <span>{props.vendor.items.length} 件</span>
      </div>
      <div className="vendor-inventory-grid">
        {props.vendor.items.map((item) => (
          <VendorOfferButton key={item.id} item={item} vendor={props.vendor} actions={props.actions} />
        ))}
      </div>
    </section>
  );
}

function VendorOfferButton(props: {
  item: VendorInventoryItemView;
  vendor: VendorInventoryGroupView;
  actions: VendorsPageActions;
  compact?: boolean;
}) {
  const costLabel = props.item.costs?.map((cost) => `${cost.required} / ${cost.owned ?? "?"} ${cost.label}`).join(" · ")
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
        costLabel,
        affordabilityLabel: affordable ? "可购买" : "货币不足或未知",
        characterLabel: props.item.characterIds?.join("、") ?? "当前角色",
        refreshLabel: props.vendor.resetLabel
      })}
    >
      <VendorItemArt item={props.item} />
      <span className="vendor-stock-body">
        <span className="vendor-stock-title">
          <strong>{props.item.name}</strong>
          {props.item.decisionLabel ? <span className="app-chip vendor-decision-chip">{props.item.decisionLabel}</span> : null}
        </span>
        <span>{props.item.itemType}</span>
        <span className="vendor-stock-summary">{props.item.summary}</span>
      </span>
      <span className="vendor-cost-row">
        <span>{costLabel}</span>
        <strong>{affordable ? "可购买" : "需确认"}</strong>
      </span>
    </button>
  );
}

function VendorSearchResults(props: {
  groups: Array<{ vendor: VendorInventoryGroupView; items: VendorInventoryItemView[] }>;
  actions: VendorsPageActions;
}) {
  return (
    <section className="vendor-search-results" aria-live="polite">
      <h4>全部商人结果</h4>
      {props.groups.length ? props.groups.map((group) => (
        <section key={group.vendor.id}>
          <h5>
            {group.vendor.name}
            {group.vendor.detailState === "failed" || group.vendor.detailState === "partial"
              ? ` · ${getVendorDisplayStatusLabel(group.vendor)}`
              : ""}
          </h5>
          <div className="vendor-inventory-grid">
            {group.items.map((item) => (
              <div key={`${group.vendor.id}-${item.id}`}>
                <span className="vendor-result-source">{item.sourcePath}</span>
                <VendorOfferButton item={item} vendor={group.vendor} actions={props.actions} compact />
              </div>
            ))}
          </div>
        </section>
      )) : <p>没有匹配的商人库存。</p>}
    </section>
  );
}

function searchAllVendors(vendors: VendorInventoryGroupView[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return vendors.flatMap((vendor) => {
    const direct = vendor.items
      .filter((item) => matchesItem(item, normalized))
      .map((item) => ({ ...item, sourcePath: vendor.name }));
    const services = (vendor.services ?? []).flatMap((service) => service.items
      .filter((item) => matchesItem(item, normalized))
      .map((item) => ({ ...item, sourcePath: `${vendor.name} → ${service.name}` }))
    );
    const items = [...direct, ...services];
    return items.length ? [{ vendor, items }] : [];
  });
}

function matchesItem(item: VendorInventoryItemView, query: string) {
  return `${item.name} ${item.itemType} ${item.summary}`.toLocaleLowerCase().includes(query);
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
