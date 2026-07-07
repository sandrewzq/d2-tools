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

export type VendorInventoryItemView = {
  id: string;
  name: string;
  itemType: string;
  summary: string;
  cost?: string;
  iconLabel: string;
  iconUrl?: string;
  costIconLabel?: string;
  costIconUrl?: string;
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
  taskCategory?: string;
  displayStatusLabel?: string;
  inventoryState?: "loaded" | "empty" | "not_read" | "unavailable";
  inventoryStateLabel?: string;
  railStatusLabel?: string;
  detailToolbar?: VendorDetailToolbarView;
  featured?: boolean;
  items: VendorInventoryItemView[];
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

export type VendorsPageModelView = {
  vendors: VendorInventoryGroupView[];
  railSections: VendorRailSectionView[];
  defaultVendorId?: string | null;
  updatedLabel: string;
  sourceLabel: string;
  nextResetLabel: string;
  recommendationCount: number;
  verifiedItemCount: number;
};

export type VendorsPageActions = {
  selectVendor?: (vendorId: string) => void;
  refreshVendors?: () => void;
};

export type VendorsPageContentViewProps = {
  interfaceLocale?: InterfaceLocale;
  model: VendorsPageModelView;
  actions: VendorsPageActions;
};

export function VendorsPageContentView(props: VendorsPageContentViewProps) {
  const locale = props.interfaceLocale ?? "zh-CN";
  const copy = getLocaleCopy(locale).vendors;
  const model = props.model;
  const actions = props.actions;
  const vendors = model.vendors;
  const railSections = model.railSections;
  const verifiedItemCount = model.verifiedItemCount;
  const recommendationCount = model.recommendationCount;
  const initialVendorId = model.defaultVendorId ?? vendors.find((vendor) => vendor.featured)?.id ?? vendors[0]?.id ?? "";
  const [selectedVendorId, setSelectedVendorId] = useState(initialVendorId);
  const selectedVendor = vendors.find((vendor) => vendor.id === selectedVendorId)
    ?? vendors.find((vendor) => vendor.featured)
    ?? vendors[0]
    ?? null;
  const updatedLabel = model.updatedLabel;
  const sourceLabel = model.sourceLabel;
  const selectedVendorStatusLabel = selectedVendor ? getVendorDisplayStatusLabel(selectedVendor) : "";
  const selectedVendorToolbar = selectedVendor ? getVendorDetailToolbar(selectedVendor, copy) : null;

  return (
    <>
      {selectedVendor ? (
        <ProductWorkspaceSplit className="vendor-workbench-layout">
          <ProductWorkspaceSideRail className="vendor-rail" ariaLabel={copy.inline["商人列表"] ?? "Vendor list"}>
            <div className="vendor-rail-head">
              <strong>{copy.inline["商人"] ?? "Vendors"}</strong>
              <span>{vendors.length} {copy.inline["个来源"] ?? "sources"}</span>
            </div>
            {railSections.map((category) => (
              <section className="vendor-rail-group" key={category.id}>
                <span className="vendor-rail-category">
                  <strong>{category.title}</strong>
                  <small>{category.vendors.length}</small>
                </span>
                {category.vendors.map((vendor) => (
                  <button
                    type="button"
                    className={vendor.id === selectedVendor.id ? "vendor-rail-item is-active" : "vendor-rail-item"}
                    key={vendor.id}
                    aria-pressed={vendor.id === selectedVendor.id}
                    onClick={() => {
                      setSelectedVendorId(vendor.id);
                      actions.selectVendor?.(vendor.id);
                    }}
                  >
                    <VendorAvatar vendor={vendor} />
                    <span>
                      <strong>{vendor.name}</strong>
                      <small>{vendor.railStatusLabel ?? formatVendorRailStatus(vendor, copy)}</small>
                    </span>
                  </button>
                ))}
              </section>
            ))}
          </ProductWorkspaceSideRail>

          <ProductWorkspaceContentStack element="section" className="vendor-detail-panel">
            <div className="vendor-detail-head">
              <VendorAvatar vendor={selectedVendor} large />
              <div>
                <div className="vendor-detail-title-row">
                  <h3>{selectedVendor.name}</h3>
                  <span className={selectedVendor.inventoryState === "loaded" || selectedVendor.items.length ? "app-chip status-ready" : "app-chip status-neutral"}>
                    {selectedVendorStatusLabel}
                  </span>
                </div>
                <p>{selectedVendor.description}</p>
                <div className="vendor-detail-meta">
                  <span>{selectedVendor.source}</span>
                  <span>{selectedVendor.resetLabel}</span>
                  <span>{selectedVendor.items.length} {copy.labels.items}</span>
                </div>
              </div>
            </div>
            <div className="vendor-detail-toolbar" aria-label="商人库存状态">
              <span>{selectedVendorToolbar?.taskCategory}</span>
              <span>{selectedVendorToolbar?.inventoryStateLabel}</span>
              <span>{selectedVendorToolbar?.itemCountLabel}</span>
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
                    {item.cost ? (
                      <div className="vendor-cost-row">
                        <VendorCostIcon item={item} />
                        <span>{copy.labels.cost}: {item.cost}</span>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <ProductWorkspaceEmptyState className="vendor-empty-state vendor-empty-card">
                <strong>{copy.emptyTitle}</strong>
                <span>{selectedVendorStatusLabel || copy.emptyBody}</span>
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
                <span>{selectedVendorStatusLabel || sourceLabel}</span>
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
    </>
  );
}

function VendorAvatar(props: { vendor: VendorInventoryGroupView; large?: boolean }) {
  return (
    <span className={props.large ? "vendor-avatar is-large" : "vendor-avatar"} aria-hidden="true">
      <img
        src={props.vendor.iconUrl ?? createVendorIconUrl(props.vendor)}
        alt=""
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = createVendorIconUrl(props.vendor);
        }}
      />
    </span>
  );
}

function VendorItemArt(props: { item: VendorInventoryItemView }) {
  return (
    <div className="vendor-item-art" data-tone={props.item.tone} aria-hidden="true">
      <img
        src={props.item.iconUrl ?? createItemIconUrl(props.item)}
        alt=""
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = createItemIconUrl(props.item);
        }}
      />
    </div>
  );
}

function VendorCostIcon(props: { item: VendorInventoryItemView }) {
  return (
    <span className="vendor-cost-icon" aria-hidden="true">
      {props.item.costIconUrl ? <img src={props.item.costIconUrl} alt="" /> : props.item.costIconLabel ?? "¤"}
    </span>
  );
}

function formatVendorStatus(status: VendorInventoryItemView["status"], copy: ReturnType<typeof getLocaleCopy>["vendors"]) {
  if (status === "owned") return copy.labels.owned;
  if (status === "recommended") return copy.labels.recommended;
  return copy.labels.unknown;
}

function formatVendorRailStatus(vendor: VendorInventoryGroupView, copy: ReturnType<typeof getLocaleCopy>["vendors"]): string {
  return `${getVendorDisplayStatusLabel(vendor)} · ${vendor.items.length} ${copy.labels.items}`;
}

function getVendorDisplayStatusLabel(vendor: VendorInventoryGroupView): string {
  return vendor.displayStatusLabel ?? vendor.statusLabel ?? vendor.badge;
}

function getVendorDetailToolbar(
  vendor: VendorInventoryGroupView,
  copy: ReturnType<typeof getLocaleCopy>["vendors"]
): VendorDetailToolbarView {
  return vendor.detailToolbar ?? {
    taskCategory: vendor.taskCategory ?? "其他商人",
    inventoryStateLabel: vendor.inventoryStateLabel ?? (vendor.items.length ? "库存已读取" : "未读取库存"),
    statusLabel: getVendorDisplayStatusLabel(vendor),
    itemCountLabel: `${vendor.items.length} ${copy.labels.items}`
  };
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
