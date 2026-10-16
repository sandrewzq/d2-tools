import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import { getRovingFocusIndex } from "../interaction/rovingFocus.js";
import type { InterfaceLocale } from "../i18n/types.js";
import { GameAssetImage } from "../media/GameAssetImage.js";
import { formatFullDateTime, formatScheduleDateTime } from "../time/formatTime.js";
import {
  ProductWorkspaceEmptyState,
  ProductWorkspaceSideRail,
  ProductWorkspaceSplit
} from "../workspace/ProductWorkspace.js";
import { getVendorEquipmentKind } from "./vendorEquipment.js";
import { vendorsTemplate, vendorsText } from "./vendorCopy.js";
import type { VendorsCopy } from "../i18n/types.js";

/**
 * 文案 token：`key` 是中文原文模板（数字处写 `{count}`），`count` 是取值。
 * app 只产出 key 与值，这里负责查表成句。
 * `values` 放 `count` 之外的占位符取值；其中 `{class}` 会按界面语言查表，其余原样替换。
 */
export type VendorTextTokenView = {
  key: string;
  count?: number;
  values?: Record<string, string | number>;
};

/** token 成句：带取值用模板查表，不带任何取值按整句查表；查不到都退回 key 本身。 */
function vendorTextTokenText(copy: VendorsCopy, token: VendorTextTokenView): string {
  if (token.count === undefined && !token.values) return vendorsText(copy, token.key);
  return vendorsTemplate(copy, token.key, {
    ...token.values,
    ...(token.count === undefined ? {} : { count: token.count })
  });
}

/** 多段 token 之间用跟着语言走的连接符拼。 */
function vendorTextTokensText(copy: VendorsCopy, tokens: VendorTextTokenView[]): string {
  return tokens.map((token) => vendorTextTokenText(copy, token)).join(vendorsText(copy, "；"));
}

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
  status: "owned" | "not_owned" | "partial" | "unknown";
  equipmentKind?: "weapon" | "armor";
  ownership?: {
    state: "owned" | "not_owned" | "partial" | "unknown";
    count: number | null;
    label: string;
    locations: VendorTextTokenView[];
    asOf?: string;
  };
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
  description?: VendorTextTokenView;
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
  detailFailureMessage?: VendorTextTokenView[];
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

export type VendorScopeOptionView = {
  kind: "character" | "account";
  characterId?: string;
  label: string;
  description: string;
};

export type VendorStatusBannerView = {
  tone: "neutral" | "error";
  message: VendorTextTokenView[];
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
  verifiedItemCount: number;
  scopeOptions?: VendorScopeOptionView[];
  selectedScope?: VendorScopeOptionView;
  selectedCharacterContext?: VendorCharacterContextView | null;
  statusBanner?: VendorStatusBannerView;
  resourceStatus?: "unavailable" | "loading" | "refreshing" | "ready" | "stale" | "error";
  resourceSource?: "local" | "remote" | "merged";
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
  ownershipLabel?: string;
  ownershipLocationLabel?: string;
  ownershipAsOfLabel?: string;
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
  availability?: {
    isBungieConfigured: boolean;
    isAccountLoggedIn: boolean;
    onConfigureBungie: () => void;
    onLoginBungie: () => void;
  };
};

export function VendorsPageContentView(props: VendorsPageContentViewProps) {
  const locale = props.interfaceLocale ?? "zh-CN";
  const copy = getLocaleCopy(locale).vendors;
  const text = (key: string) => vendorsText(copy, key);
  const template = (key: string, values: Record<string, string | number>) => vendorsTemplate(copy, key, values);
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
  const bannerMessage = refreshStatus ? vendorTextTokensText(copy, refreshStatus.message) : undefined;
  const [vendorSearchQuery, setVendorSearchQuery] = useState("");
  const [vendorFilters, setVendorFilters] = useState({ affordableOnly: false, unownedOnly: false });
  const accountOwnershipFilterAvailable = selectedVendor
    ? getVendorContentSections(selectedVendor, copy).some((section) => section.groups.some((group) => group.items.some((item) => (
        Boolean(getVendorEquipmentKind(item))
        && item.ownership?.state !== undefined
        && item.ownership.state !== "unknown"
      ))))
    : false;

  if (props.availability && (!props.availability.isBungieConfigured || !props.availability.isAccountLoggedIn)) {
    const isConfigured = props.availability.isBungieConfigured;
    return (
      <ProductWorkspaceEmptyState className="account-unavailable vendor-page-empty product-workspace-empty--page" ariaLabel={text("商人访问状态")} role="status">
        <span className="ui-badge status-warning">{text("未连接 Bungie")}</span>
        <h2>{text(isConfigured ? "账号还没有登录" : "还没有配置 Bungie 应用")}</h2>
        <p>{text(isConfigured ? "先登录 Bungie；登录后会自动同步装备数据并加载角色商人库存。" : "先在设置里完成 Bungie 应用配置，再登录账号加载商人库存。")}</p>
        <div className="button-row">
          {isConfigured ? (
            <button type="button" data-ui-kind="button" data-control-variant="primary" onClick={props.availability.onLoginBungie}>{text("登录 Bungie")}</button>
          ) : (
            <button type="button" data-ui-kind="button" data-control-variant="primary" onClick={props.availability.onConfigureBungie}>{text("去设置 Bungie")}</button>
          )}
        </div>
      </ProductWorkspaceEmptyState>
    );
  }

  if (!selectedVendor) {
    return (
      <ProductWorkspaceEmptyState
        className="vendor-page-empty product-workspace-empty--page"
        ariaLabel={text("商人刷新状态")}
        role="status"
        ariaLive={refreshStatus?.live ?? "polite"}
        ariaBusy={refreshStatus?.busy ?? false}
      >
        <strong>{refreshStatus?.busy ? copy.loadingTitle : copy.emptyTitle}</strong>
        <span>{bannerMessage ?? copy.emptyBody}</span>
        {!refreshStatus?.busy && props.actions.refreshVendors ? <button type="button" data-ui-kind="button" data-control-variant="primary" onClick={props.actions.refreshVendors}>{text("重新加载商人库存")}</button> : null}
      </ProductWorkspaceEmptyState>
    );
  }

  const normalizedVendorSearchQuery = vendorSearchQuery.trim().toLocaleLowerCase(locale);
  const allContentSections = prioritizeVendorSections(getVendorContentSections(selectedVendor, copy));
  const normalizedContentSearchQuery = vendorHasItemMatch(selectedVendor, normalizedVendorSearchQuery, copy)
    ? normalizedVendorSearchQuery
    : "";
  const activeVendorFilters = {
    ...vendorFilters,
    unownedOnly: vendorFilters.unownedOnly && accountOwnershipFilterAvailable
  };
  const contentSections = filterVendorSections(allContentSections, activeVendorFilters, normalizedContentSearchQuery);
  const allItemCount = countSectionItemsFromSections(allContentSections);
  const visibleItemCount = countSectionItemsFromSections(contentSections);
  const hasContentFilter = Boolean(normalizedContentSearchQuery || activeVendorFilters.affordableOnly || activeVendorFilters.unownedOnly);
  const vendorStatus = getVendorStatus(selectedVendor);
  const selectedVendorResetLabel = formatVendorReset(selectedVendor, locale, copy);
  const updatedLabel = formatFullDateTime(props.model.updatedAt, text(props.model.updatedLabel));
  const visibleRailSections = props.model.railSections.flatMap((section) => {
    const vendors = section.vendors.filter((vendor) => vendorMatchesSearch(vendor, normalizedVendorSearchQuery, copy));
    return vendors.length ? [{ ...section, vendors }] : [];
  });
  const visibleVendorIds = new Set(visibleRailSections.flatMap((section) => section.vendors.map((vendor) => vendor.id)));
  const firstVisibleVendorId = visibleRailSections[0]?.vendors[0]?.id;
  const railTabStopId = visibleVendorIds.has(selectedVendor.id) ? selectedVendor.id : firstVisibleVendorId;
  const toolbarMessage = bannerMessage
    ?? (selectedVendor.detailState === "pending"
      ? text("商人详情正在读取；不会回退到旧库存。")
      : selectedVendor.detailState === "partial"
        ? text("商人详情部分可用；缺失范围已在下方标注。")
        : updatedLabel);

  function selectVendor(vendorId: string) {
    setSelectedVendorId(vendorId);
    props.actions.selectVendor?.(vendorId);
  }

  function handleVendorKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const navigation = event.currentTarget.closest("nav");
    const isHorizontalRail = navigation && window.getComputedStyle(navigation).display === "flex";
    if (event.key === "ArrowRight" && !isHorizontalRail) {
      const contentTarget = event.currentTarget.closest<HTMLElement>(".vendor-workbench")
        ?.querySelector<HTMLElement>(".vendor-section-nav button, .vendor-offer-card");
      if (contentTarget instanceof HTMLElement) {
        event.preventDefault();
        contentTarget.focus();
        contentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
        return;
      }
    }
    const buttons = [...(navigation?.querySelectorAll<HTMLButtonElement>("button[data-vendor-id]") ?? [])];
    const currentIndex = buttons.indexOf(event.currentTarget);
    const nextIndex = getRovingFocusIndex({
      key: event.key,
      currentIndex,
      itemCount: buttons.length,
      orientation: isHorizontalRail ? "horizontal" : "vertical"
    });
    if (nextIndex === null) return;
    event.preventDefault();
    const nextButton = buttons[nextIndex];
    const vendorId = nextButton?.dataset.vendorId;
    if (!nextButton || !vendorId) return;
    selectVendor(vendorId);
    nextButton.focus();
  }

  function focusFirstVisibleVendor(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowRight") return;
    const firstButton = event.currentTarget.closest(".vendor-rail")
      ?.querySelector<HTMLButtonElement>("button[data-vendor-id]");
    if (!firstButton) return;
    event.preventDefault();
    firstButton.focus();
  }

  return (
    <ProductWorkspaceSplit className="vendor-workbench-layout vendor-workbench">
      <ProductWorkspaceSideRail className="vendor-rail" ariaLabel={text("商人地点目录")} scrollRegion="pane">
        <div className="vendor-column-head"><strong>{text("地点目录")}</strong><span>{template("{count} 个商人", { count: normalizedVendorSearchQuery ? `${visibleVendorIds.size} / ${props.model.vendors.length}` : props.model.vendors.length })}</span></div>
        <label className="vendor-rail-search">
          <span>{text("搜索商人或库存")}</span>
          <input
            type="search"
            value={vendorSearchQuery}
            placeholder={text("搜索商人、物品或分类")}
            onChange={(event) => setVendorSearchQuery(event.currentTarget.value)}
            onKeyDown={focusFirstVisibleVendor}
          />
        </label>
        <nav aria-label={text("商人列表")} className="vendor-rail-nav">
          {visibleRailSections.map((section) => (
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
                    data-vendor-id={vendor.id}
                    data-status={getVendorStatus(vendor)}
                    tabIndex={vendor.id === railTabStopId ? 0 : -1}
                    onClick={() => selectVendor(vendor.id)}
                    onKeyDown={handleVendorKeyDown}
                  >
                    <span><strong>{text(vendor.name)}</strong><small>{getVendorRailSummary(vendor, copy)}</small></span>
                  </button>
                );
              })}
            </section>
          ))}
          {!visibleRailSections.length ? (
            <div className="vendor-rail-empty" role="status">
              <strong>{text("没有匹配的商人或库存")}</strong>
              <span>{text("换一个名称、物品或分类关键词试试。")}</span>
            </div>
          ) : null}
        </nav>
      </ProductWorkspaceSideRail>

      <section className="vendor-detail-main">
        <header className="vendor-hero">
          <div>
            <span className="vendor-eyebrow">{selectedVendor.location || text("地点待确认")}</span>
            <div className="vendor-heading-line"><h2>{text(selectedVendor.name)}</h2><VendorResourceStatus copy={copy} status={props.model.resourceStatus ?? "ready"} source={props.model.resourceSource ?? "merged"} /></div>
            <p>{text(selectedVendor.description) || text("当前商人没有额外说明")}</p>
            <div className="vendor-hero-meta">
              <span>{text(selectedVendor.source)}</span>
              <span>{selectedVendorResetLabel}</span>
              <span>{visibleItemCount === allItemCount
                ? template("{visible} 个可见条目", { visible: visibleItemCount })
                : template("{visible} / {total} 个可见条目", { visible: visibleItemCount, total: allItemCount })}</span>
              <span>{updatedLabel}</span>
            </div>
          </div>
          <span className="vendor-status-chip" data-status={vendorStatus}>{getVendorDisplayStatusLabel(selectedVendor, copy)}</span>
        </header>

        <div className="vendor-toolbar" role="status" aria-label={text("商人刷新状态")} aria-live={refreshStatus?.live ?? "polite"} aria-busy={refreshStatus?.busy ?? false}>
          <span className="vendor-character-context"><strong>{props.model.selectedScope?.kind === "character" ? localizeVendorScopeLabel(props.model.selectedScope.label, copy) : text("当前角色")}</strong><small>{localizeVendorCharacterContext(props.model.selectedCharacterContext, copy)}</small></span>
          <span data-status={refreshStatus?.tone === "error" ? "error" : vendorStatus}>{toolbarMessage}</span>
          <span className="vendor-toolbar-actions" aria-label={text("库存筛选")}>
            <button
              type="button"
              data-ui-kind="button"
              data-control-variant="quiet"
              data-control-size="compact"
              aria-pressed={vendorFilters.affordableOnly}
              onClick={() => setVendorFilters((current) => ({ ...current, affordableOnly: !current.affordableOnly }))}
            >{text("只看可负担")}</button>
            <button
              type="button"
              data-ui-kind="button"
              data-control-variant="quiet"
              data-control-size="compact"
              aria-pressed={activeVendorFilters.unownedOnly}
              disabled={!accountOwnershipFilterAvailable}
              title={accountOwnershipFilterAvailable ? undefined : text("账号拥有状态读取完成后可用")}
              onClick={() => setVendorFilters((current) => ({ ...current, unownedOnly: !current.unownedOnly }))}
            >{text("账号无同身份实例")}</button>
          </span>
        </div>

        <VendorSectionNavigation sections={contentSections} vendor={selectedVendor} copy={copy} />

        <div className="vendor-detail-flow">
          {selectedVendor.detailFailureMessage?.length ? (
            <div className="vendor-detail-warning" data-ui-kind="callout" data-status="warning" role="status" aria-label={text("商人详情状态")}>
              <strong>{getVendorDisplayStatusLabel(selectedVendor, copy)}</strong>
              <span>{template("{message}。当前仍显示基础销售数据，属性与插槽可能不完整。", { message: vendorTextTokensText(copy, selectedVendor.detailFailureMessage) })}</span>
            </div>
          ) : null}
          <VendorContentSections sections={contentSections} vendor={selectedVendor} actions={props.actions} locale={locale} copy={copy} hasActiveFilters={hasContentFilter} hasSearchQuery={Boolean(normalizedContentSearchQuery)} onClearFilters={() => { setVendorFilters({ affordableOnly: false, unownedOnly: false }); setVendorSearchQuery(""); }} />
        </div>
      </section>

    </ProductWorkspaceSplit>
  );
}

function VendorResourceStatus(props: { copy: VendorsCopy; status: NonNullable<VendorsPageModelView["resourceStatus"]>; source: NonNullable<VendorsPageModelView["resourceSource"]> }) {
  const text = (key: string) => vendorsText(props.copy, key);
  const labels: Record<typeof props.status, string> = { unavailable: text("暂无库存"), loading: text("首次读取"), refreshing: text("后台同步中"), ready: text("已同步"), stale: text("缓存已过期"), error: text("读取失败") };
  const sourceLabels: Record<typeof props.source, string> = { local: text("本地"), remote: text("远端"), merged: text("本地优先") };
  return <span className="app-chip vendor-resource-status" data-ui-kind="status-chip" data-status={props.status} title={vendorsTemplate(props.copy, "来源：{source}", { source: sourceLabels[props.source] })}>{labels[props.status]}</span>;
}

function VendorContentSections(props: {
  sections: VendorContentSectionView[];
  vendor: VendorInventoryGroupView;
  actions: VendorsPageActions;
  locale: InterfaceLocale;
  copy: VendorsCopy;
  hasActiveFilters?: boolean;
  hasSearchQuery?: boolean;
  onClearFilters?: () => void;
}) {
  const text = (key: string) => vendorsText(props.copy, key);
  const template = (key: string, values: Record<string, string | number>) => vendorsTemplate(props.copy, key, values);
  if (!props.sections.length) {
    return (
      <ProductWorkspaceEmptyState className="vendor-empty-section">
        <strong>{props.hasActiveFilters ? text("没有符合筛选条件的库存") : text("当前没有可显示的库存")}</strong>
        <span>{props.hasActiveFilters
          ? props.hasSearchQuery
            ? text("尝试修改搜索词，或关闭“只看可负担 / 账号无同身份实例”。")
            : text("尝试关闭“只看可负担”或“账号无同身份实例”。")
          : getVendorDisplayStatusLabel(props.vendor, props.copy)}</span>
        {props.hasActiveFilters && props.onClearFilters ? <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onClearFilters}>{text("清除筛选")}</button> : null}
      </ProductWorkspaceEmptyState>
    );
  }

  let subinventoryIndex = 0;
  return (
    <div className="vendor-content-sections">
      {props.sections.map((section) => {
        const isSubinventory = section.kind === "subinventory";
        const currentSubinventoryIndex = isSubinventory ? ++subinventoryIndex : 0;
        const itemCount = countSectionItems(section);
        const sectionAnchorId = getVendorSectionAnchorId(section);
        const headingId = `${sectionAnchorId}-heading`;
        const sectionTitle = getVendorSectionTitle(section, props.copy);
        return (
          <section
            className="vendor-content-section"
            id={sectionAnchorId}
            key={section.id}
            aria-labelledby={headingId}
            data-vendor-section-id={section.id}
            data-section-kind={section.kind}
          >
            <header className="vendor-section-heading">
              <div>
                {isSubinventory ? <small>{template("{vendor} · 子库存 {index}", { vendor: props.vendor.name, index: String(currentSubinventoryIndex).padStart(2, "0") })}</small> : null}
                <h3 id={headingId}>{sectionTitle}{getVendorSectionContextLabel(section, props.copy) ? <small className="vendor-section-context">{getVendorSectionContextLabel(section, props.copy)}</small> : null}</h3>
              </div>
              <span>{getVendorSectionMeta(section, itemCount, props.copy)}</span>
            </header>
            {isSubinventory && section.description ? <p className="vendor-section-description">{vendorTextTokenText(props.copy, section.description)}</p> : null}
            {section.kind === "reputation" ? (
              <VendorRankSummary section={section} vendor={props.vendor} copy={props.copy} />
            ) : null}
            {section.groups.map((group) => {
              const compact = shouldUseCompactVendorRows(section, group);
              return (
                <section className="vendor-offer-group" key={group.id} aria-label={group.name ? vendorsText(props.copy, group.name) : sectionTitle}>
                  {section.groups.length > 1 ? <div className="vendor-offer-group-head"><strong>{group.name ? vendorsText(props.copy, group.name) : sectionTitle}</strong><span>{template("{count} 件", { count: group.items.length })}</span></div> : null}
                  <div className={compact ? "vendor-service-list" : "vendor-offer-grid"} onKeyDown={compact ? undefined : handleOfferGridKeyDown}>
                    {group.items.map((item) => compact
                      ? <VendorServiceRow key={item.id} item={item} section={section} copy={props.copy} locale={props.locale} />
                      : <VendorOfferButton key={item.id} item={item} vendor={props.vendor} actions={props.actions} locale={props.locale} copy={props.copy} />)}
                  </div>
                </section>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function handleOfferGridKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || !target.classList.contains("vendor-offer-card")) return;
  const grid = event.currentTarget;
  const buttons = [...grid.querySelectorAll<HTMLButtonElement>("button.vendor-offer-card")];
  const currentIndex = buttons.indexOf(target);
  if (currentIndex < 0) return;
  if (event.key === "ArrowLeft" && currentIndex === 0) {
    const sectionTarget = grid.closest<HTMLElement>(".vendor-content-section")
      ?.closest<HTMLElement>(".vendor-workbench")
      ?.querySelector<HTMLButtonElement>(".vendor-section-nav button[aria-current='location']");
    if (sectionTarget) {
      event.preventDefault();
      sectionTarget.focus();
      sectionTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
      return;
    }
  }
  const columnCount = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length);
  let nextIndex: number | null = null;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = buttons.length - 1;
  if (event.key === "ArrowLeft") nextIndex = Math.max(0, currentIndex - 1);
  if (event.key === "ArrowRight") nextIndex = Math.min(buttons.length - 1, currentIndex + 1);
  if (event.key === "ArrowUp") nextIndex = Math.max(0, currentIndex - columnCount);
  if (event.key === "ArrowDown") nextIndex = Math.min(buttons.length - 1, currentIndex + columnCount);
  if (nextIndex === null || nextIndex === currentIndex) return;
  event.preventDefault();
  const nextButton = buttons[nextIndex];
  nextButton?.focus();
  nextButton?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function VendorSectionNavigation(props: {
  sections: VendorContentSectionView[];
  vendor: VendorInventoryGroupView;
  copy: VendorsCopy;
}) {
  const navRef = useRef<HTMLElement>(null);
  const sectionKey = props.sections.map((section) => section.id).join("|");
  const firstSectionId = props.sections[0]?.id ?? "";
  const [activeSectionId, setActiveSectionId] = useState(firstSectionId);

  useLayoutEffect(() => {
    const workbench = navRef.current?.closest<HTMLElement>(".vendor-workbench");
    const page = navRef.current?.closest<HTMLElement>(".product-workspace-page");
    const pageHeader = page?.querySelector<HTMLElement>(":scope > [data-shell-role='page-header']");
    if (!workbench || !pageHeader) return undefined;

    const updateStickyOffset = () => {
      workbench.style.setProperty("--vendor-sticky-offset", `${Math.ceil(pageHeader.getBoundingClientRect().height)}px`);
    };
    updateStickyOffset();

    if (typeof ResizeObserver === "undefined") {
      return () => workbench.style.removeProperty("--vendor-sticky-offset");
    }
    const observer = new ResizeObserver(updateStickyOffset);
    observer.observe(pageHeader);
    return () => {
      observer.disconnect();
      workbench.style.removeProperty("--vendor-sticky-offset");
    };
  }, [props.vendor.id, sectionKey]);

  useEffect(() => {
    setActiveSectionId(firstSectionId);
    const elements = props.sections
      .map((section) => document.getElementById(getVendorSectionAnchorId(section)))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!elements.length || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver((entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
      const sectionId = visibleEntry?.target.getAttribute("data-vendor-section-id");
      if (sectionId) setActiveSectionId(sectionId);
    }, { rootMargin: "-104px 0px -62% 0px", threshold: [0, 0.1] });

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [firstSectionId, props.vendor.id, sectionKey]);

  function activateSection(section: VendorContentSectionView) {
    setActiveSectionId(section.id);
    document.getElementById(getVendorSectionAnchorId(section))?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
  }

  function handleSectionKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    if (event.key === "ArrowLeft" && currentIndex === 0) {
      const vendorTarget = event.currentTarget.closest<HTMLElement>(".vendor-workbench")
        ?.querySelector<HTMLButtonElement>("button[data-vendor-id][aria-current='page']");
      if (vendorTarget) {
        event.preventDefault();
        vendorTarget.focus();
        vendorTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
        return;
      }
    }
    const nextIndex = getRovingFocusIndex({
      key: event.key,
      currentIndex,
      itemCount: props.sections.length,
      orientation: "horizontal"
    });
    if (nextIndex === null) return;
    event.preventDefault();
    const nextSection = props.sections[nextIndex];
    if (!nextSection) return;
    activateSection(nextSection);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>("button")[nextIndex]
      ?.focus();
  }

  if (!props.sections.length) return null;

  return (
    <nav ref={navRef} className="vendor-section-nav" aria-label={vendorsTemplate(props.copy, "{vendor}内容导航", { vendor: props.vendor.name })}>
      {props.sections.map((section, index) => {
        const itemCount = countSectionItems(section);
        const active = activeSectionId === section.id;
        return (
          <button
            type="button"
            key={section.id}
            aria-current={active ? "location" : undefined}
            tabIndex={active ? 0 : -1}
            onClick={() => activateSection(section)}
            onKeyDown={(event) => handleSectionKeyDown(event, index)}
          >
            <span>{getVendorSectionTitle(section, props.copy)}</span>
            <small>{section.kind === "reputation" && section.progression ? vendorsTemplate(props.copy, "等级 {level}", { level: section.progression.level }) : itemCount}</small>
          </button>
        );
      })}
    </nav>
  );
}

function VendorRankSummary(props: { section: VendorContentSectionView; vendor: VendorInventoryGroupView; copy: VendorsCopy }) {
  const text = (key: string) => vendorsText(props.copy, key);
  const template = (key: string, values: Record<string, string | number>) => vendorsTemplate(props.copy, key, values);
  const progression = props.section.progression;
  if (!progression) return null;
  const rewards = props.section.groups.flatMap((group) => group.items);
  const currentStepProgress = Math.max(0, progression.nextLevelAt - progression.progressToNextLevel);
  const progressPercent = progression.nextLevelAt
    ? Math.min(100, Math.max(0, currentStepProgress / progression.nextLevelAt * 100))
    : 0;
  const atLevelCap = progression.levelCap > 0 && progression.level >= progression.levelCap;
  const claimReady = !atLevelCap && progression.progressToNextLevel <= 0;
  const rankState = atLevelCap
    ? { label: text("已达等级上限"), status: "neutral" }
    : claimReady
      ? { label: text("可领取下一等级奖励"), status: "success" }
      : { label: template("还需 {points} 点声望", { points: progression.progressToNextLevel }), status: "pending" };

  return (
    <div className="vendor-rank-panel" data-rank-state={rankState.status}>
      <div className="vendor-rank-number"><span>{text("当前等级")}</span><strong>{progression.level}</strong><small>{template("{vendor}声望", { vendor: props.vendor.name })}</small></div>
      <dl className="vendor-rank-ledger">
        <div><dt>{text("本级进度")}</dt><dd><strong>{currentStepProgress} / {progression.nextLevelAt}</strong><span className="vendor-rank-progress" role="progressbar" aria-label={template("{vendor}本级声望进度", { vendor: props.vendor.name })} aria-valuemin={0} aria-valuemax={progression.nextLevelAt} aria-valuenow={currentStepProgress}><span style={{ width: `${progressPercent}%` }} /></span><small>{template("累计进度 {progress}", { progress: progression.currentProgress })}</small></dd><span>{Math.round(progressPercent)}%</span></div>
        <div><dt>{text("下一等级奖励")}</dt><dd><strong data-status={rankState.status}>{rankState.label}</strong><small>{atLevelCap ? text("当前声望已完成") : template("达到等级 {level} 后可领取", { level: progression.level + 1 })}</small></dd><span>{template("{count} 个奖励节点", { count: rewards.length })}</span></div>
      </dl>
    </div>
  );
}

function VendorServiceRow(props: {
  item: VendorInventoryItemView;
  section: VendorContentSectionView;
  copy: VendorsCopy;
  locale: InterfaceLocale;
}) {
  const text = (key: string) => vendorsText(props.copy, key);
  const status = getVendorServiceStatus(props.item, props.section, props.copy);
  const hasCost = Boolean(props.item.costs?.length || props.item.cost);
  return (
    <article className="vendor-service-row" data-status={status.status}>
      <VendorItemArt item={props.item} copy={props.copy} />
      <span className="vendor-service-copy">
        <strong>{props.item.name}</strong>
        <span>{props.item.itemType || (props.section.kind === "tasks" ? text("任务") : text("商人服务"))}</span>
        {props.item.summary ? <small>{text(props.item.summary)}</small> : null}
      </span>
      <span className="vendor-service-facts">
        {hasCost ? <VendorCosts item={props.item} fallback={getVendorCostLabel(props.item, props.copy)} copy={props.copy} locale={props.locale} /> : <small>{props.section.kind === "tasks" ? text("任务条目") : text("服务入口")}</small>}
        {props.item.ownership ? (
          <span className="vendor-offer-account" data-status={props.item.ownership.state}>
            {vendorsTemplate(props.copy, props.item.ownership.label, { count: props.item.ownership.count ?? 0 })}
          </span>
        ) : null}
        <strong data-status={status.status}>{status.label}</strong>
      </span>
    </article>
  );
}

function VendorOfferButton(props: {
  item: VendorInventoryItemView;
  vendor: VendorInventoryGroupView;
  actions: VendorsPageActions;
  locale: InterfaceLocale;
  copy: VendorsCopy;
}) {
  const text = (key: string) => vendorsText(props.copy, key);
  const template = (key: string, values: Record<string, string | number>) => vendorsTemplate(props.copy, key, values);
  const availability = getVendorOfferAvailability(props.item, props.copy);
  const costLabel = getVendorCostLabel(props.item, props.copy);
  const equipmentKind = getVendorEquipmentKind(props.item);
  const isInteractive = Boolean(equipmentKind && props.actions.onOpenItem && props.item.itemHash !== undefined);
  const rollLabel = props.item.socketPlugs?.map((plug) => plug.name).filter(Boolean).slice(0, 2).join(" · ");
  const content = <>
    <span className="vendor-offer-header">
      <VendorItemArt item={props.item} copy={props.copy} />
        <span className="vendor-offer-copy">
          <span className="vendor-offer-title"><strong>{props.item.name}</strong>{props.item.quantity && props.item.quantity > 1 ? <em>× {props.item.quantity.toLocaleString(props.locale)}</em> : null}</span>
          <span className="vendor-offer-summary">{props.item.itemType || text("类型待确认")}{props.item.summary ? ` · ${text(props.item.summary)}` : ""}</span>
          {props.item.ownership ? (
            <span className="vendor-offer-account" data-status={props.item.ownership.state}>
              {vendorsTemplate(props.copy, props.item.ownership.label, { count: props.item.ownership.count ?? 0 })}
            </span>
          ) : null}
          {rollLabel ? <span className="vendor-offer-roll">{rollLabel}</span> : null}
        </span>
    </span>
    <span className="vendor-offer-footer">
      <VendorCosts item={props.item} fallback={costLabel} copy={props.copy} locale={props.locale} />
      <span className="vendor-offer-state">
        <span className="vendor-offer-status" data-status={availability.status}>{availability.label}</span>
        {isInteractive ? <small>{text("查看详情")}</small> : null}
      </span>
    </span>
  </>;

  if (!isInteractive) {
    return <article className="vendor-offer-card is-readonly" data-tone={props.item.tone} data-status={availability.status}>{content}</article>;
  }

  return (
    <button
      type="button"
      className="vendor-offer-card"
      data-tone={props.item.tone}
      data-status={availability.status}
      aria-label={template("打开装备详情：{name}", { name: props.item.name })}
      onClick={() => props.actions.onOpenItem?.(props.item, {
        vendorName: props.vendor.name,
        inventoryPath: localizeVendorPath(props.copy, props.item.sourcePath ?? [props.vendor.name, props.item.categoryName].filter(Boolean).join(" / ")),
        costLabel,
        affordabilityLabel: availability.label,
        characterLabel: formatVendorCharacterScope(props.item.characterIds, props.copy),
        refreshLabel: formatVendorReset(props.vendor, props.locale, props.copy),
        purchaseRequirements: props.item.failureMessages ?? [],
        rollLabels: props.item.socketPlugs?.map((plug) => plug.name).filter(Boolean),
        stats: props.item.stats,
        ownershipLabel: props.item.ownership
          ? vendorsTemplate(props.copy, props.item.ownership.label, { count: props.item.ownership.count ?? 0 })
          : undefined,
        ownershipLocationLabel: props.item.ownership?.locations.length
          ? props.item.ownership.locations.map((token) => vendorTextTokenText(props.copy, token)).join(vendorsText(props.copy, " · "))
          : undefined,
        ownershipAsOfLabel: props.item.ownership?.asOf
          ? formatFullDateTime(props.item.ownership.asOf, text("账号数据时间未读取"))
          : undefined
      })}
    >
      {content}
    </button>
  );
}

function VendorCosts(props: { item: VendorInventoryItemView; fallback: string; copy: VendorsCopy; locale: InterfaceLocale }) {
  if (!props.item.costs?.length) return <span className="vendor-offer-cost">{props.fallback}</span>;
  return (
    <span className="vendor-offer-costs">
      {props.item.costs.map((cost, index) => (
        <span key={`${cost.label}-${index}`} data-status={cost.affordable === false ? "warning" : "neutral"}>
          <GameAssetImage src={cost.iconUrl} alt="" />
          <span>{cost.label}</span>
          <small>{cost.owned === null
            ? vendorsTemplate(props.copy, "需要 {count}", { count: cost.required.toLocaleString(props.locale) })
            : vendorsTemplate(props.copy, "持有 {owned} · 需要 {required}", { owned: cost.owned.toLocaleString(props.locale), required: cost.required.toLocaleString(props.locale) })}</small>
        </span>
      ))}
    </span>
  );
}

function VendorItemArt(props: { item: VendorInventoryItemView; copy: VendorsCopy }) {
  return (
    <span className={props.item.iconUrl ? "vendor-item-art" : "vendor-item-art vendor-item-art-missing"} role={props.item.iconUrl ? undefined : "img"} aria-label={props.item.iconUrl ? undefined : vendorsTemplate(props.copy, "{name}图标未读取", { name: props.item.name })}>
      <span className="vendor-item-art-fallback" aria-hidden="true">{props.item.iconLabel.slice(0, 1)}</span>
      <GameAssetImage src={props.item.iconUrl} alt="" />
    </span>
  );
}

function getVendorContentSections(vendor: VendorInventoryGroupView, copy: VendorsCopy): VendorContentSectionView[] {
  if (vendor.contentSections?.length) return vendor.contentSections;
  const sections: VendorContentSectionView[] = [];
  if (vendor.rankRewards?.length || vendor.progression) sections.push({ id: `${vendor.id}-rank`, kind: "reputation", name: "声望与等级", layout: "rank", progression: vendor.progression, groups: [{ id: `${vendor.id}-rank-items`, name: "等级奖励", items: vendor.rankRewards ?? [] }] });
  if (vendor.items.length) sections.push({ id: `${vendor.id}-inventory`, kind: "inventory", name: "库存", layout: "featured", groups: [{ id: `${vendor.id}-inventory-items`, name: "", items: vendor.items }] });
  for (const service of vendor.services ?? []) {
    if (!service.items.length) continue;
    sections.push({ id: service.id, kind: "subinventory", name: service.name, description: service.description ? { key: service.description } : { key: "{count} 件", count: service.items.length }, layout: (service.sections?.length ?? 0) > 1 ? "columns" : "list", groups: service.sections?.length ? service.sections : [{ id: `${service.id}-items`, name: "", items: service.items }] });
  }
  if (vendor.taskItems?.length) sections.push({ id: `${vendor.id}-tasks`, kind: "tasks", name: "任务", layout: "featured", groups: [{ id: `${vendor.id}-task-items`, name: "", items: vendor.taskItems }] });
  return sections;
}

function prioritizeVendorSections(sections: VendorContentSectionView[]): VendorContentSectionView[] {
  return [
    ...sections.filter((section) => section.kind === "reputation"),
    ...sections.filter((section) => section.kind !== "reputation")
  ];
}

function getVendorSectionAnchorId(section: VendorContentSectionView): string {
  return `vendor-section-${section.id.replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
}

function getVendorSectionTitle(section: VendorContentSectionView, copy: VendorsCopy): string {
  const name = section.name.trim();
  if (name === "库存" && isVendorAuxiliaryInventory(section)) return vendorsText(copy, "基础服务");
  if (section.kind === "tasks" && name === "任务") return vendorsText(copy, "任务与悬赏");
  return vendorsText(copy, section.name);
}

function getVendorSectionMeta(section: VendorContentSectionView, itemCount: number, copy: VendorsCopy): string {
  if (section.kind === "reputation") return section.progression
    ? vendorsTemplate(copy, "等级上限 {cap} · {count} 个奖励", { cap: section.progression.levelCap, count: itemCount })
    : vendorsTemplate(copy, "{count} 个等级奖励", { count: itemCount });
  if (section.kind === "subinventory") return vendorsTemplate(copy, "{count} 件 · {groups} 个分类", { count: itemCount, groups: section.groups.length });
  if (section.kind === "tasks") return vendorsTemplate(copy, "{count} 项 · 游戏内领取", { count: itemCount });
  if (isVendorAuxiliaryInventory(section)) return vendorsTemplate(copy, "{count} 项 · 游戏内操作", { count: itemCount });
  return vendorsTemplate(copy, "{count} 件", { count: itemCount });
}

function getVendorSectionContextLabel(section: VendorContentSectionView, copy: VendorsCopy): string {
  const scopeLabel = section.scope === "account" ? vendorsText(copy, "账号") : section.scope === "clan" ? vendorsText(copy, "公会") : section.scope === "character" ? vendorsText(copy, "当前角色") : "";
  const actionLabel = section.action === "purchase" ? vendorsText(copy, "游戏内购买") : section.action === "focus" ? vendorsText(copy, "聚焦") : section.action === "decode" ? vendorsText(copy, "解码") : section.action === "claim" ? vendorsText(copy, "领取") : section.action === "acquire" ? vendorsText(copy, "获取") : section.action === "exchange" ? vendorsText(copy, "兑换") : section.action === "inspect" ? vendorsText(copy, "查看") : "";
  return [scopeLabel, actionLabel].filter(Boolean).join(" · ");
}

function shouldUseCompactVendorRows(section: VendorContentSectionView, group: VendorInventorySectionView): boolean {
  return section.kind === "tasks"
    || (section.kind === "inventory" && group.items.every((item) => !getVendorEquipmentKind(item)));
}

function isVendorAuxiliaryInventory(section: VendorContentSectionView): boolean {
  return section.kind === "inventory"
    && section.groups.every((group) => group.items.every((item) => !getVendorEquipmentKind(item)));
}

function countSectionItems(section: VendorContentSectionView): number {
  return section.groups.reduce((count, group) => count + group.items.length, 0);
}

function countVendorItems(vendor: VendorInventoryGroupView, copy: VendorsCopy): number {
  return getVendorContentSections(vendor, copy).reduce((count, section) => count + countSectionItems(section), 0);
}

function countSectionItemsFromSections(sections: VendorContentSectionView[]): number {
  return sections.reduce((count, section) => count + countSectionItems(section), 0);
}

function filterVendorSections(
  sections: VendorContentSectionView[],
  filters: { affordableOnly: boolean; unownedOnly: boolean },
  query = ""
): VendorContentSectionView[] {
  if (!filters.affordableOnly && !filters.unownedOnly && !query) return sections;
  return sections.flatMap((section) => {
    const groups = section.groups.flatMap((group) => {
      const items = group.items.filter((item) => {
        if (query && !vendorItemMatchesQuery(item, query)) return false;
        if (filters.unownedOnly && (!getVendorEquipmentKind(item) || item.ownership?.state !== "not_owned")) return false;
        if (filters.affordableOnly && !isVendorItemAffordable(item)) return false;
        return true;
      });
      return items.length ? [{ ...group, items }] : [];
    });
    if (!groups.length && section.kind !== "reputation") return [];
    return [{ ...section, groups }];
  });
}

function isVendorItemAffordable(item: VendorInventoryItemView): boolean {
  if (item.canPurchase === true) return true;
  if (item.canPurchase === false) return false;
  const costs = item.costs ?? [];
  return costs.length > 0 && costs.every((cost) => cost.affordable === true);
}

function vendorHasItemMatch(vendor: VendorInventoryGroupView, query: string, copy: VendorsCopy): boolean {
  if (!query) return false;
  return getVendorContentSections(vendor, copy).some((section) => section.groups.some((group) => group.items.some((item) => vendorItemMatchesQuery(item, query))));
}

function vendorItemMatchesQuery(item: VendorInventoryItemView, query: string): boolean {
  return [item.name, item.itemType, item.categoryName, item.summary, item.ownership?.label]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase()
    .includes(query);
}

function getVendorDisplayStatusLabel(vendor: VendorInventoryGroupView, copy: VendorsCopy): string {
  const label = vendor.displayStatusLabel ?? vendor.statusLabel ?? vendor.badge;
  return label ? vendorsText(copy, label) : "";
}

function getVendorRailSummary(vendor: VendorInventoryGroupView, copy: VendorsCopy): string {
  const statusLabel = getVendorDisplayStatusLabel(vendor, copy);
  if (statusLabel) {
    return `${statusLabel} · ${vendorsTemplate(copy, "{count} 件物品", { count: countVendorSaleItems(vendor) })}`;
  }
  const itemCount = countVendorItems(vendor, copy);
  if (vendor.detailState === "failed" || vendor.inventoryState === "unavailable") return vendorsTemplate(copy, "{count} 件 · 读取失败", { count: itemCount });
  if (vendor.detailState === "partial") return vendorsTemplate(copy, "{count} 件 · 部分可用", { count: itemCount });
  if (vendor.featured) return vendorsTemplate(copy, "{count} 件 · 限时", { count: itemCount });
  return vendorsTemplate(copy, "{count} 件", { count: itemCount });
}

function countVendorSaleItems(vendor: VendorInventoryGroupView): number {
  return vendor.items.length
    + (vendor.services ?? []).reduce((count, service) => count + service.items.length, 0)
    + (vendor.taskItems?.length ?? 0);
}

function vendorMatchesSearch(vendor: VendorInventoryGroupView, query: string, copy: VendorsCopy): boolean {
  if (!query) return true;
  const searchableText = [
    vendor.name,
    vendor.location,
    vendor.description,
    ...getVendorContentSections(vendor, copy).flatMap((section) => [
      section.name,
      section.description ? vendorTextTokenText(copy, section.description) : undefined,
      ...section.groups.flatMap((group) => [
        group.name,
        group.description,
        ...group.items.flatMap((item) => [
          item.name,
          item.itemType,
          item.categoryName,
          item.summary,
          item.ownership?.label
        ])
      ])
    ])
  ].filter((value): value is string => Boolean(value)).join(" ").toLocaleLowerCase();
  return searchableText.includes(query);
}

function getVendorStatus(vendor: VendorInventoryGroupView): "neutral" | "pending" | "success" | "warning" | "error" {
  if (vendor.detailState === "ready" || vendor.inventoryState === "loaded") return "success";
  if (vendor.detailState === "pending") return "pending";
  if (vendor.detailState === "partial") return "warning";
  if (vendor.detailState === "failed" || vendor.inventoryState === "unavailable") return "error";
  return "neutral";
}

function getVendorOfferAvailability(item: VendorInventoryItemView, copy: VendorsCopy): { label: string; status: "success" | "warning" | "neutral" } {
  if (item.canPurchase === true) return { label: vendorsText(copy, "游戏内可购买"), status: "success" };
  if (item.canPurchase === false) return { label: item.failureMessages?.[0] || vendorsText(copy, "当前不可购买"), status: "warning" };
  return { label: item.failureMessages?.[0] || vendorsText(copy, "游戏内条件待确认"), status: "neutral" };
}

function getVendorServiceStatus(
  item: VendorInventoryItemView,
  section: VendorContentSectionView,
  copy: VendorsCopy
): { label: string; status: "success" | "warning" | "neutral" } {
  if (item.canPurchase === false) return { label: item.failureMessages?.[0] || vendorsText(copy, "条件未满足"), status: "warning" };
  if (item.canPurchase === true) {
    return { label: section.kind === "tasks" ? vendorsText(copy, "可在游戏内领取") : vendorsText(copy, "可在游戏内使用"), status: "success" };
  }
  return { label: item.failureMessages?.[0] || vendorsText(copy, "游戏内状态待确认"), status: "neutral" };
}

function getVendorCostLabel(item: VendorInventoryItemView, copy: VendorsCopy): string {
  return item.costs?.map((cost) => `${cost.required} ${cost.label}`).join(" · ") ?? item.cost ?? vendorsText(copy, "无费用信息");
}

function formatVendorCharacterScope(characterIds: string[] | undefined, copy: VendorsCopy): string {
  const characterCount = new Set(characterIds ?? []).size;
  if (characterCount > 1) return vendorsTemplate(copy, "{count} 个角色库存", { count: characterCount });
  return characterCount === 1 ? vendorsText(copy, "当前角色库存") : vendorsText(copy, "角色范围待确认");
}

function formatVendorReset(vendor: VendorInventoryGroupView, locale: InterfaceLocale, copy: VendorsCopy): string {
  return formatScheduleDateTime(vendor.resetAt, locale, vendorsText(copy, vendor.resetLabel));
}

function localizeVendorPath(copy: VendorsCopy, path: string): string {
  return path.split(" → ").map((segment) => vendorsText(copy, segment.trim())).join(" → ");
}

function localizeVendorScopeLabel(label: string, copy: VendorsCopy): string {
  const match = /^角色 (\d+)$/u.exec(label.trim());
  return match ? vendorsTemplate(copy, "角色 {index}", { index: match[1] }) : vendorsText(copy, label);
}

function localizeVendorCharacterContext(context: VendorCharacterContextView | null | undefined, copy: VendorsCopy): string {
  if (context?.armorerModName) return vendorsTemplate(copy, "当前机灵：{name}", { name: context.armorerModName });
  return vendorsText(copy, context ? context.label : "当前机灵：未检测到护甲师模组");
}
