import { LibraryPageView } from "./LibraryPageView.js";
import {
  buildLibraryEquipmentFilterOptions,
  buildLibraryPerkGroupOptions,
  classifyLibraryDropAccess,
  filterLibraryEquipmentItems,
  filterLibraryPerks,
  groupLibraryDropQueryItems,
  type LibraryDropAccessKey,
  type LibraryEquipmentFilter,
  type LibraryPerkFilter,
  type LibraryViewMode
} from "./libraryFilters.js";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale, LibraryCopy } from "../i18n/types.js";

type ItemSearchResult = import("./libraryFilters.js").ItemSearchResult & {
  icon?: string;
};
type PerkSearchResult = import("./libraryFilters.js").PerkSearchResult;
type LibraryHistory = {
  recent: Array<{ hash: number; name: string; icon?: string }>;
  favorites: Array<{ hash: number; name: string; icon?: string }>;
};
type ManifestStatus = {
  initialized: boolean;
  version?: string;
  latest_version?: string;
  needs_update?: boolean;
  missing_required_components?: string[];
};
type LiveItemAvailability = {
  account_scope: "public" | "character";
  items: Record<string, {
    status: "character_vendor" | "public_vendor" | "public_activity" | "manifest_only" | "unknown";
    label: string;
    description: string;
    sources: Array<{
      kind: "character_vendor" | "public_vendor" | "public_activity";
      label: string;
      character_id?: string;
    }>;
  }>;
};
type VaultItemMatchInfo = {
  available?: number;
  sample_perks?: Array<{
    name: string;
    englishName?: string;
  }>;
};

type LiveEntry = LiveItemAvailability["items"][string];

function libraryText(copy: LibraryCopy, key: string): string {
  return copy.inline[key] ?? key;
}

export function LibraryPageContentView(props: {
  interfaceLocale?: InterfaceLocale;
  libraryViewMode: LibraryViewMode;
  items: ItemSearchResult[];
  perks: PerkSearchResult[];
  equipmentFilters: LibraryEquipmentFilter;
  perkFilters: LibraryPerkFilter;
  equipmentSearchTouched: boolean;
  perkSearchTouched: boolean;
  isSearching: boolean;
  searchError: string;
  aliasDraft: string;
  aliasTargetDraft: string;
  aliasKind: "item" | "perk";
  aliasMessage: string;
  libraryHistory: LibraryHistory;
  libraryCommunityMatch: Map<number, VaultItemMatchInfo>;
  liveAvailability: LiveItemAvailability | null;
  liveAvailabilityError: string;
  isLoadingLiveAvailability: boolean;
  manifestStatus: ManifestStatus | null;
  manifestStatusError: string;
  isLoadingManifestStatus: boolean;
  isInitializingManifest: boolean;
  itemDetailLoadingKey: string;
  showInternalHeading?: boolean;
  onViewModeChange: (mode: LibraryViewMode) => void;
  onEquipmentFiltersChange: (patch: Partial<LibraryEquipmentFilter>) => void;
  onPerkFiltersChange: (patch: Partial<LibraryPerkFilter>) => void;
  onSearch: () => void;
  onClearFilters: () => void;
  onRefreshManifestStatus: () => void;
  onInitializeManifest: () => void;
  onAliasDraftChange: (value: string) => void;
  onAliasTargetDraftChange: (value: string) => void;
  onAliasKindChange: (kind: "item" | "perk") => void;
  onSaveAlias: () => void;
  onOpenItemDetail: (item: ItemSearchResult) => void;
  onAddFavorite: (item: ItemSearchResult | PerkSearchResult) => void;
  onRemoveFavorite: (hash: number) => void;
}) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").library;
  const libraryEquipmentFilter = props.equipmentFilters;
  const equipmentFilterOptions = buildLibraryEquipmentFilterOptions(props.items);
  const perkGroupOptions = buildLibraryPerkGroupOptions(props.perks);
  const visibleItems = filterLibraryEquipmentItems(props.items, libraryEquipmentFilter);
  const visiblePerks = filterLibraryPerks(props.perks, props.perkFilters);
  const dropQueryGroups = groupLibraryDropQueryItems(visibleItems);
  const hitCount = props.libraryViewMode === "equipment" ? visibleItems.length : visiblePerks.length;
  const searchTouched = props.libraryViewMode === "equipment"
    ? props.equipmentSearchTouched
    : props.perkSearchTouched;
  const liveStats = buildLiveAvailabilityStats(props.liveAvailability, visibleItems);
  const dropQueryStats = {
    total: visibleItems.length,
    sourced: visibleItems.filter((item) => item.source.status === "ready").length,
    perkPools: visibleItems.filter((item) => item.perks?.some((group) => group.plugs.length)).length
  };
  const isManifestBlocked = Boolean(
    props.manifestStatus && (!props.manifestStatus.initialized || props.manifestStatus.missing_required_components?.length)
  );
  const manifestAlert = buildManifestAlert(props.manifestStatus, props.manifestStatusError, props.isLoadingManifestStatus, copy);

  const manifestAlertElement = manifestAlert ? (
        <section className={`library-manifest-alert status-message ${manifestAlert.className}`}>
          <div>
            <strong>{manifestAlert.title}</strong>
            <span>{manifestAlert.message}</span>
          </div>
          <div className="library-manifest-actions">
            <button type="button" className="secondary-button" onClick={props.onRefreshManifestStatus}>
              {libraryText(copy, "重新检查")}
            </button>
            <button
              type="button"
              disabled={props.isInitializingManifest}
              onClick={props.onInitializeManifest}
            >
              {props.isInitializingManifest ? libraryText(copy, "更新中...") : libraryText(copy, "后台更新资料库")}
            </button>
          </div>
        </section>
  ) : null;

  return (
    <LibraryPageView
      interfaceLocale={props.interfaceLocale}
      manifestVersionLabel={formatManifestDataDate(props.manifestStatus, copy)}
      manifestNeedsUpdate={props.manifestStatus?.needs_update}
      viewMode={props.libraryViewMode}
      showInternalHeading={props.showInternalHeading}
      onViewModeChange={props.onViewModeChange}
      manifestAlert={manifestAlertElement}
    >
      <section className="library-query-panel" aria-label={libraryText(copy, "出处查询")}>
        <div className="library-search-command">
          <div className="library-search-command-head">
            <div className="library-acquisition-tabs segmented-control">
              <button
                type="button"
                value="equipment"
                className={props.libraryViewMode === "equipment" ? "active" : ""}
                onClick={() => props.onViewModeChange("equipment")}
              >
                {copy.tabs.equipment}
              </button>
              <button
                type="button"
                value="perks"
                className={props.libraryViewMode === "perks" ? "active" : ""}
                onClick={() => props.onViewModeChange("perks")}
              >
                {copy.tabs.perks}
              </button>
            </div>
            <span className="library-search-hint">
              {props.libraryViewMode === "equipment"
                ? libraryText(copy, "查装备、来源和 Perk 池")
                : libraryText(copy, "查 Perk 和关联装备")}
            </span>
          </div>
          <div className="search-row library-primary-search">
            <input
              value={props.libraryViewMode === "equipment" ? props.equipmentFilters.query : props.perkFilters.query}
              disabled={isManifestBlocked}
              onChange={(event) => {
                if (props.libraryViewMode === "equipment") {
                  props.onEquipmentFiltersChange({ query: event.target.value });
                } else {
                  props.onPerkFiltersChange({ query: event.target.value });
                }
              }}
              placeholder={props.libraryViewMode === "perks" ? libraryText(copy, "输入 Perk 名称或别名，例如 ff") : libraryText(copy, "输入装备名称，例如 Riskrunner")}
            />
            <button type="button" disabled={props.isSearching || isManifestBlocked} onClick={props.onSearch}>
              {props.isSearching ? libraryText(copy, "搜索中...") : libraryText(copy, "搜索")}
            </button>
            <button type="button" className="secondary-button" onClick={props.onClearFilters}>
              {libraryText(copy, "清空")}
            </button>
          </div>
        </div>
        {isManifestBlocked ? (
          <p className="status-message status-warning">{libraryText(copy, "资料库更新完成前暂不可搜索。请先使用上方按钮启动后台更新。")}</p>
        ) : null}
        <div className="library-quick-filters library-main-filter-row" aria-label={libraryText(copy, "常用筛选")}>
          {props.libraryViewMode === "equipment" ? (
            <>
              <div className="library-quick-filter-row" aria-label={libraryText(copy, "分类")}>
                {equipmentFilterOptions.groups.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={libraryEquipmentFilter.group === option.value ? "active" : ""}
                    onClick={() => props.onEquipmentFiltersChange({ group: option.value as LibraryEquipmentFilter["group"] })}
                  >
                    {libraryText(copy, option.label)}
                  </button>
                ))}
              </div>
              <label className="compact-field library-select-only">
                <span className="library-field-label-hidden">{libraryText(copy, "稀有度")}</span>
                <select
                  value={libraryEquipmentFilter.tier}
                  onChange={(event) => props.onEquipmentFiltersChange({ tier: event.target.value })}
                >
                  {equipmentFilterOptions.tiers.map((option) => (
                    <option key={option.value} value={option.value}>{libraryText(copy, option.label)}</option>
                  ))}
                </select>
              </label>
              <label className="compact-field library-select-only">
                <span className="library-field-label-hidden">{libraryText(copy, "位置")}</span>
                <select
                  value={libraryEquipmentFilter.bucket}
                  onChange={(event) => props.onEquipmentFiltersChange({ bucket: event.target.value })}
                >
                  {equipmentFilterOptions.buckets.map((option) => (
                    <option key={option.value} value={option.value}>{libraryText(copy, option.label)}</option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <div className="library-quick-filter-row" aria-label={libraryText(copy, "关联分类")}>
                {perkGroupOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={props.perkFilters.relatedGroup === option.value ? "active" : ""}
                    onClick={() => props.onPerkFiltersChange({ relatedGroup: option.value as LibraryPerkFilter["relatedGroup"] })}
                  >
                    {libraryText(copy, option.label)}
                  </button>
                ))}
              </div>
              <label className="compact-field library-select-only">
                <span className="library-field-label-hidden">{libraryText(copy, "关联装备")}</span>
                <select
                  value={props.perkFilters.hasRelatedItems}
                  onChange={(event) => props.onPerkFiltersChange({ hasRelatedItems: event.target.value as LibraryPerkFilter["hasRelatedItems"] })}
                >
                  <option value="all">{libraryText(copy, "全部")}</option>
                  <option value="yes">{libraryText(copy, "有")}</option>
                  <option value="no">{libraryText(copy, "无")}</option>
                </select>
              </label>
            </>
          )}
        </div>
        {props.libraryViewMode === "equipment" ? (
          <>
            <section className="drop-query-panel library-drop-summary source-status-card source-status-neutral" aria-label={libraryText(copy, "掉落查询")}>
              <div className="drop-query-heading">
                <div>
                  <span className="source-status-badge source-status-neutral">{libraryText(copy, "掉落查询")}</span>
                  <strong>{libraryText(copy, "先看能不能刷，再看值不值得刷")}</strong>
                </div>
                <small>{libraryText(copy, "实时商人与公共活动优先；没有证据时明确标记为待补。")}</small>
              </div>
              <div className="drop-query-grid">
                <div className="drop-query-stat">
                  <span>{libraryText(copy, "当前命中")}</span>
                  <strong>{dropQueryStats.total}</strong>
                </div>
                <div className="drop-query-stat">
                  <span>{libraryText(copy, "可确认来源")}</span>
                  <strong>{dropQueryStats.sourced}</strong>
                </div>
                <div className="drop-query-stat">
                  <span>{libraryText(copy, "Perk 池")}</span>
                  <strong>{dropQueryStats.perkPools}</strong>
                </div>
                <div className="drop-query-stat">
                  <span>{libraryText(copy, "实时命中")}</span>
                  <strong>{liveStats.characterVendor + liveStats.publicVendor + liveStats.publicActivity}</strong>
                </div>
              </div>
              {props.liveAvailabilityError ? (
                <p className="status-message status-warning">{props.liveAvailabilityError}</p>
              ) : null}
            </section>
            <details className="library-advanced-disclosure">
              <summary>{libraryText(copy, "高级筛选")}</summary>
              <div className="drop-query-advanced">
                {libraryEquipmentFilter.group === "weapons" ? (
                  <>
                    <label className="compact-field">
                      {libraryText(copy, "弹药")}
                      <select
                        value={libraryEquipmentFilter.ammo}
                        onChange={(event) => props.onEquipmentFiltersChange({ ammo: event.target.value as LibraryEquipmentFilter["ammo"] })}
                      >
                        {equipmentFilterOptions.ammo.map((option) => (
                          <option key={option.value} value={option.value}>{libraryText(copy, option.label)}</option>
                        ))}
                      </select>
                    </label>
                    <div className="compact-field">
                      <span>{libraryText(copy, "框架")}</span>
                      <div className="segmented-control" aria-label={libraryText(copy, "资料库武器框架筛选")}>
                        {equipmentFilterOptions.frames.map((option) => (
                          option.value === "all" ? (
                            <button
                              type="button"
                              key={option.value}
                              className={!libraryEquipmentFilter.frame.length ? "active" : ""}
                              onClick={() => props.onEquipmentFiltersChange({ frame: [] })}
                            >
                              {libraryText(copy, option.label)}
                            </button>
                          ) : (
                            <button
                              type="button"
                              key={option.value}
                              className={libraryEquipmentFilter.frame.includes(option.value) ? "active" : ""}
                              onClick={() => props.onEquipmentFiltersChange({
                                frame: libraryEquipmentFilter.frame.includes(option.value)
                                  ? libraryEquipmentFilter.frame.filter((value) => value !== option.value)
                                  : [...libraryEquipmentFilter.frame, option.value]
                              })}
                            >
                              {libraryText(copy, option.label)}
                            </button>
                          )
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
                <label className="compact-field">
                  {libraryText(copy, "来源状态筛选")}
                  <select
                    value={libraryEquipmentFilter.sourceStatus}
                    onChange={(event) => props.onEquipmentFiltersChange({
                      sourceStatus: event.target.value as LibraryEquipmentFilter["sourceStatus"]
                    })}
                  >
                    <option value="all">{libraryText(copy, "全部来源状态")}</option>
                    <option value="ready">{libraryText(copy, "可确认来源")}</option>
                    <option value="missing">{libraryText(copy, "来源待补")}</option>
                  </select>
                </label>
                <label className="compact-field">
                  {libraryText(copy, "来源线索")}
                  <select
                    value={libraryEquipmentFilter.dropAccess}
                    onChange={(event) => props.onEquipmentFiltersChange({
                      dropAccess: event.target.value as LibraryEquipmentFilter["dropAccess"]
                    })}
                  >
                    <option value="all">{libraryText(copy, "全部来源线索")}</option>
                    <option value="available">{libraryText(copy, "来源可确认")}</option>
                    <option value="rotation">{libraryText(copy, "等轮换")}</option>
                    <option value="archived">{libraryText(copy, "已下架或待确认")}</option>
                    <option value="unknown">{libraryText(copy, "来源待补")}</option>
                  </select>
                </label>
                <label className="compact-field">
                  {libraryText(copy, "Perk 池")}
                  <select
                    value={libraryEquipmentFilter.perkPool}
                    onChange={(event) => props.onEquipmentFiltersChange({
                      perkPool: event.target.value as LibraryEquipmentFilter["perkPool"]
                    })}
                  >
                    <option value="all">{libraryText(copy, "全部 Perk 池状态")}</option>
                    <option value="yes">{libraryText(copy, "只看有 Perk 池")}</option>
                    <option value="no">{libraryText(copy, "只看无 Perk 池")}</option>
                  </select>
                </label>
                <label className="compact-field">
                  {libraryText(copy, "Perk AND 条件")}
                  <input
                    value={libraryEquipmentFilter.perkQuery}
                    onChange={(event) => props.onEquipmentFiltersChange({ perkQuery: event.target.value })}
                    placeholder={libraryText(copy, "例如 kinetic tremors")}
                  />
                </label>
              </div>
              <div className="drop-query-grid live-availability-summary library-source-matrix">
                <div className="drop-query-stat">
                  <span>{libraryText(copy, "查询范围")}</span>
                  <strong>{formatLiveScope(props.liveAvailability, props.isLoadingLiveAvailability, copy)}</strong>
                </div>
                <div className="drop-query-stat">
                  <span>{libraryText(copy, "当前角色商人售卖")}</span>
                  <strong>{liveStats.characterVendor}</strong>
                </div>
                <div className="drop-query-stat">
                  <span>{libraryText(copy, "当前公开商人售卖")}</span>
                  <strong>{liveStats.publicVendor}</strong>
                </div>
                <div className="drop-query-stat">
                  <span>{libraryText(copy, "公共活动线索")}</span>
                  <strong>{liveStats.publicActivity}</strong>
                </div>
              </div>
            </details>
          </>
        ) : null}
        <div className="library-side-utilities">
          <details>
            <summary>{libraryText(copy, "别名与收藏")}</summary>
            <div className="alias-editor">
              <input value={props.aliasDraft} onChange={(event) => props.onAliasDraftChange(event.target.value)} placeholder={libraryText(copy, "别名，例如 ff")} />
              <input value={props.aliasTargetDraft} onChange={(event) => props.onAliasTargetDraftChange(event.target.value)} placeholder={libraryText(copy, "实际名称，例如 喂食狂热")} />
              <select value={props.aliasKind} onChange={(event) => props.onAliasKindChange(event.target.value as "item" | "perk")}>
                <option value="item">{libraryText(copy, "装备")}</option>
                <option value="perk">Perk</option>
              </select>
              <button
                type="button"
                className="secondary-button"
                disabled={!props.aliasDraft.trim() || !props.aliasTargetDraft.trim()}
                onClick={props.onSaveAlias}
              >
                {libraryText(copy, "保存别名")}
              </button>
            </div>
            <p className="muted-copy">{libraryText(copy, "别名会保存在本机，只影响你自己的搜索。")}</p>
            {props.aliasMessage ? <p className="status-message status-ready">{props.aliasMessage}</p> : null}
            <div className="daily-source-grid">
              <div className="daily-source source-ready">
                <strong>{libraryText(copy, "最近查看")}</strong>
                <span>{props.libraryHistory.recent.slice(0, 5).map((item) => item.name).join(" / ") || libraryText(copy, "暂无")}</span>
              </div>
              <div className="daily-source source-ready">
                <strong>{libraryText(copy, "收藏")}</strong>
                <span>{props.libraryHistory.favorites.slice(0, 5).map((item) => item.name).join(" / ") || libraryText(copy, "暂无")}</span>
              </div>
            </div>
          </details>
          <details className="library-source-guide-details">
            <summary>{libraryText(copy, "来源说明")}</summary>
            <div className="library-source-guide-list">
              <div>
                <strong>{libraryText(copy, "Bungie 公共数据")}</strong>
                <span>{libraryText(copy, "解析活动、商人和来源线索。")}</span>
              </div>
              <div>
                <strong>{libraryText(copy, "本地资料库")}</strong>
                <span>{libraryText(copy, "提供名称、图标、Perk 和收藏品来源。")}</span>
              </div>
              <div>
                <strong>{libraryText(copy, "社区证据")}</strong>
                <span>{libraryText(copy, "只使用用户导入或授权来源。")}</span>
              </div>
              <div>
                <strong>{libraryText(copy, "未知来源")}</strong>
                <span>{libraryText(copy, "不确定时明确标记，不伪装成结论。")}</span>
              </div>
            </div>
          </details>
        </div>
      </section>
      <section className="library-results-panel" aria-label={libraryText(copy, "搜索结果")}>
        <div className="library-results-heading">
          <h3>{libraryText(copy, "搜索结果")}</h3>
          <span>{hitCount} {libraryText(copy, props.libraryViewMode === "equipment" ? "条来源线索" : "条 Perk 线索")}</span>
        </div>
        <p className="muted-copy">{libraryText(copy, "不补猜来源、分类或关联项，缺字段就按缺字段显示。")}</p>
        {props.searchError ? <p className="status-message status-error">{props.searchError}</p> : null}
        {props.libraryViewMode === "equipment" ? (
          <div className="drop-query-groups library-source-groups">
            {dropQueryGroups.map((group) => (
              <section className={"drop-query-group drop-access-" + group.key} key={group.key}>
                <div className="drop-query-group-heading">
                  <div>
                    <strong>{group.label}</strong>
                    <span>{group.description}</span>
                  </div>
                  <span className={"ui-badge " + getDropAccessBadgeClass(group.key)}>{group.items.length} {libraryText(copy, "件")}</span>
                </div>
                <div className="item-results">
                  {group.items.map((item) => renderEquipmentResult(
                    item,
                    props.libraryCommunityMatch,
                    props.liveAvailability,
                    props.itemDetailLoadingKey,
                    props.libraryHistory,
                    props.onOpenItemDetail,
                    props.onAddFavorite,
                    props.onRemoveFavorite,
                    copy
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="item-results">
            {visiblePerks.map((perk) => (
              <article className="item-result" key={perk.hash}>
                {perk.icon ? <img alt="" src={perk.icon} /> : null}
                <div>
                  <h3>{perk.name}</h3>
                  <p>{perk.description}</p>
                  {perk.related_items?.length ? (
                    <>
                      <p>
                        <strong>{libraryText(copy, "关联分类：")}</strong>
                        {[...new Set(perk.related_items.map((item) => formatLibraryGroupLabel(item.group_key, copy)).filter(Boolean))].join(" / ")}
                      </p>
                      <p><strong>{libraryText(copy, "可能出现于：")}</strong>{perk.related_items.map((item) => item.name).join(" / ")}</p>
                    </>
                  ) : (
                    <p>{libraryText(copy, "资料库里还没有查到关联装备。")}</p>
                  )}
                  <button type="button" className="inline-action" onClick={() => props.onAddFavorite(perk)}>
                    {libraryText(copy, "收藏")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {searchTouched && !props.isSearching && !props.searchError && !hitCount ? (
          <p className="status-message status-neutral">{libraryText(copy, "未找到匹配结果。可以换中文名、英文名，或者先保存一个常用别名再搜。")}</p>
        ) : null}
      </section>
    </LibraryPageView>
  );
}

function buildManifestAlert(
  status: ManifestStatus | null,
  error: string,
  isLoading: boolean,
  copy: LibraryCopy
): { title: string; message: string; className: string } | null {
  if (error) {
    return {
      title: libraryText(copy, "资料库状态读取失败"),
      message: error,
      className: "status-error"
    };
  }
  if (isLoading && !status) {
    return {
      title: libraryText(copy, "正在检查资料库版本"),
      message: libraryText(copy, "资料库版本检查会在后台运行，切换菜单不会中断。"),
      className: "status-pending"
    };
  }
  if (!status) {
    return null;
  }
  const missingComponents = status.missing_required_components ?? [];
  if (!status.initialized) {
    return {
      title: libraryText(copy, "资料库尚未初始化"),
      message: libraryText(copy, "账号页、搜索和详情需要资料库。可以现在启动后台更新，完成后再继续查询。"),
      className: "status-warning"
    };
  }
  if (missingComponents.length) {
    return {
      title: libraryText(copy, "缺少必要资料库组件"),
      message: `${libraryText(copy, "缺少")} ${missingComponents.length} ${libraryText(copy, "个组件，搜索和详情可能不完整；建议立即后台更新资料库。")}`,
      className: "status-warning"
    };
  }
  if (status.needs_update) {
    return {
      title: libraryText(copy, "资料库不是最新版本"),
      message: `${libraryText(copy, "当前")} ${status.version ?? libraryText(copy, "未知版本")}，${libraryText(copy, "最新")} ${status.latest_version ?? libraryText(copy, "未知版本")}${libraryText(copy, "；旧资料库可能导致来源、Perk 或详情判断错误。")}`,
      className: "status-warning"
    };
  }
  return null;
}

function formatManifestDataDate(status: ManifestStatus | null, copy: LibraryCopy): string {
  if (!status) return libraryText(copy, "检查中");
  return formatLibraryVersion(status.version) ?? libraryText(copy, "可用");
}

function formatLibraryVersion(version?: string): string | undefined {
  if (!version) return undefined;
  const match = version.match(/(?:^|\.)(\d{2})\.(\d{2})\.(\d{2})(?:\.|-)/);
  if (!match) return undefined;
  const yearNumber = Number(match[1]);
  const fullYear = yearNumber < 80 ? 2000 + yearNumber : 1900 + yearNumber;
  return `${fullYear}/${match[2]}/${match[3]}`;
}

function renderEquipmentResult(
  item: ItemSearchResult,
  libraryCommunityMatch: Map<number, VaultItemMatchInfo>,
  liveAvailability: LiveItemAvailability | null,
  itemDetailLoadingKey: string,
  libraryHistory: LibraryHistory,
  onOpenItemDetail: (item: ItemSearchResult) => void,
  onAddFavorite: (item: ItemSearchResult | PerkSearchResult) => void,
  onRemoveFavorite: (hash: number) => void,
  copy: LibraryCopy
) {
  const sourceStatus = item.source.status;
  const dropAccess = classifyLibraryDropAccess(item);
  const communityMatch = libraryCommunityMatch.get(item.hash);
  const liveEntry = liveAvailability?.items[String(item.hash)];

  return (
    <article className="item-result library-weapon-card library-reference-card" key={item.hash}>
      {item.icon ? <img alt="" src={item.icon} /> : null}
      <div>
        <div className="library-weapon-card-heading">
          <div>
            <h3>{item.name}</h3>
            <p>{[item.tier, item.item_type, item.bucket_name].filter(Boolean).join(" / ")}</p>
          </div>
          <span className={"ui-badge " + getDropAccessBadgeClass(dropAccess)}>{formatDropAccessLabel(dropAccess, copy)}</span>
        </div>
        <p>{item.description}</p>
        <div className="item-source-panel">
          <div className="item-source-heading">
            <strong>{libraryText(copy, "实时状态")}</strong>
            <span className={"source-status-badge " + getLiveStatusClass(liveEntry)}>
              {liveEntry?.label ?? libraryText(copy, "等待实时查询")}
            </span>
          </div>
          <span>{liveEntry?.description ?? libraryText(copy, "正在结合 Bungie 当前公开数据和登录角色商人数据复查。")}</span>
          {liveEntry?.sources.length ? (
            <small>{liveEntry.sources.map((source) => formatLiveSource(source, copy)).join(" / ")}</small>
          ) : null}
        </div>
        <div className="item-source-panel">
          <div className="item-source-heading">
            <strong>{libraryText(copy, "掉落来源")}</strong>
            <span className={"source-status-badge " + getLibrarySourceStatusClass(sourceStatus)}>
              {libraryText(copy, "来源状态：")}{formatLibrarySourceStatus(sourceStatus, copy)}
            </span>
          </div>
          <span>{item.source.description}</span>
        </div>
        <div className="item-source-panel">
          <strong>{libraryText(copy, "刷取判断")}</strong>
          <span>{formatDropActionHint(dropAccess, communityMatch, liveEntry, copy)}</span>
        </div>
        {item.perks?.length ? (
          <div className="library-perk-pool">
            <strong>{libraryText(copy, "Perk 池")}</strong>
            <div className="perk-groups">
              {item.perks.slice(0, 6).map((group) => (
                <div className="perk-group" key={group.socket_index}>
                  {group.plugs.slice(0, 6).map((plug) => (
                    <span className="perk-chip" key={plug.hash}>{plug.name}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="muted-copy">{libraryText(copy, "资料库暂未提供可展示的 Perk 池。")}</p>
        )}
        {(communityMatch?.available ?? 0) > 0 ? (
          <small className="library-community-match">
            {`${libraryText(copy, "社区推荐")} ${communityMatch?.available} ${libraryText(copy, "个组合")}${
              formatCommunityPerkPreview(communityMatch?.sample_perks)
                ? ` · ${formatCommunityPerkPreview(communityMatch?.sample_perks)}`
                : ""
            }`}
          </small>
        ) : null}
        <button
          type="button"
          className="inline-action"
          aria-busy={getItemKey(item) === itemDetailLoadingKey}
          onClick={() => onOpenItemDetail(item)}
        >
          {libraryText(copy, "查看详情")}
        </button>
        <button type="button" className="inline-action" onClick={() => onAddFavorite(item)}>
          {libraryText(copy, "收藏")}
        </button>
        {libraryHistory.favorites.some((favorite) => favorite.hash === item.hash) ? (
          <button type="button" className="inline-action" onClick={() => onRemoveFavorite(item.hash)}>
            {libraryText(copy, "取消收藏")}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function getItemKey(item: ItemSearchResult): string {
  const possibleInstanceItem = item as ItemSearchResult & { instance_id?: unknown };
  return typeof possibleInstanceItem.instance_id === "string" && possibleInstanceItem.instance_id
    ? possibleInstanceItem.instance_id
    : `hash:${item.hash}`;
}

function buildLiveAvailabilityStats(liveAvailability: LiveItemAvailability | null, visibleItems: ItemSearchResult[]) {
  const visibleHashes = new Set(visibleItems.map((item) => String(item.hash)));
  const entries = Object.entries(liveAvailability?.items ?? {})
    .filter(([hash]) => visibleHashes.has(hash))
    .map(([, entry]) => entry);

  return {
    characterVendor: entries.filter((entry) => entry.status === "character_vendor").length,
    publicVendor: entries.filter((entry) => entry.status === "public_vendor").length,
    publicActivity: entries.filter((entry) => entry.status === "public_activity").length
  };
}

function formatLiveScope(liveAvailability: LiveItemAvailability | null, isLoading: boolean, copy: LibraryCopy): string {
  if (isLoading) return libraryText(copy, "查询中");
  if (!liveAvailability) return libraryText(copy, "未查询");
  return liveAvailability.account_scope === "character" ? libraryText(copy, "公共 + 角色") : libraryText(copy, "公共");
}

function formatLiveSource(source: LiveEntry["sources"][number], copy: LibraryCopy): string {
  if (source.kind === "character_vendor") {
    return source.character_id ? `${source.label}（${libraryText(copy, "角色")} ${source.character_id}）` : source.label;
  }
  return source.label;
}

function formatCommunityPerkPreview(perks: VaultItemMatchInfo["sample_perks"]): string {
  if (!perks?.length) {
    return "";
  }

  return perks
    .slice(0, 2)
    .map((perk) => (perk.englishName ? `${perk.name} / ${perk.englishName}` : perk.name))
    .join(" · ");
}

function formatLibraryGroupLabel(
  group: ItemSearchResult["group_key"] | NonNullable<PerkSearchResult["related_items"]>[number]["group_key"],
  copy: LibraryCopy
) {
  if (group === "weapons") return libraryText(copy, "武器");
  if (group === "armor") return libraryText(copy, "护甲");
  if (group === "equipment") return libraryText(copy, "装备");
  if (group === "other") return libraryText(copy, "其他");
  return "";
}

function formatLibrarySourceStatus(status: ItemSearchResult["source"]["status"], copy: LibraryCopy): string {
  return status === "ready" ? libraryText(copy, "可确认") : libraryText(copy, "待补充");
}

function getLibrarySourceStatusClass(status: ItemSearchResult["source"]["status"]): string {
  return status === "ready" ? "source-status-ready" : "source-status-pending";
}

function getLiveStatusClass(entry: LiveEntry | undefined): string {
  if (!entry) return "source-status-pending";
  if (entry.status === "character_vendor" || entry.status === "public_vendor") return "source-status-ready";
  if (entry.status === "public_activity") return "source-status-warning";
  return "source-status-neutral";
}

function formatDropAccessLabel(access: LibraryDropAccessKey, copy: LibraryCopy): string {
  if (access === "available") return libraryText(copy, "来源可确认");
  if (access === "rotation") return libraryText(copy, "等轮换");
  if (access === "archived") return libraryText(copy, "已下架或待确认");
  return libraryText(copy, "来源待补");
}

function formatDropActionHint(
  access: LibraryDropAccessKey,
  communityMatch: VaultItemMatchInfo | undefined,
  liveEntry: LiveEntry | undefined,
  copy: LibraryCopy
): string {
  if (liveEntry?.status === "character_vendor") {
    return libraryText(copy, "优先复查：当前登录角色商人库存已命中，可以进游戏确认购买资格和价格。");
  }
  if (liveEntry?.status === "public_vendor") {
    return libraryText(copy, "优先复查：当前公开商人库存已命中，可以进游戏确认购买资格和价格。");
  }
  if (liveEntry?.status === "public_activity") {
    return libraryText(copy, "当前公共活动有直接奖励线索，但仍需要进游戏确认活动入口和掉落规则。");
  }

  const hasCommunityRolls = (communityMatch?.available ?? 0) > 0;

  if (access === "available") {
    return hasCommunityRolls
      ? libraryText(copy, "优先复查：来源字段可确认，且已有社区推荐组合；仍需以当前游戏内入口为准。")
      : libraryText(copy, "来源字段可确认；建议先核对当前游戏内入口，再决定是否刷取。");
  }
  if (access === "rotation") {
    return libraryText(copy, "等待轮换：来源字段提示周期活动或周常内容，先关注本周轮换再投入时间。");
  }
  if (access === "archived") {
    return libraryText(copy, "谨慎投入：来源线索显示下架、传承或不可获取，除非游戏内有新入口恢复。");
  }
  return libraryText(copy, "先补来源：当前 Manifest 没有足够来源信息，不把它列为可刷目标。");
}

function getDropAccessBadgeClass(access: LibraryDropAccessKey): string {
  if (access === "available") return "status-ready";
  if (access === "rotation") return "status-warning";
  if (access === "archived") return "status-neutral";
  return "status-neutral";
}
