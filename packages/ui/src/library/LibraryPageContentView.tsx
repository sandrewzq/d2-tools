import { useMemo, useState } from "react";
import type {
  ItemSearchResult,
  LibraryDropAccessKey,
  LibraryEquipmentFilter,
  LibraryEquipmentResultView,
  LibraryManifestAlertModel,
  LibraryPageModel,
  LibraryPerkFilter,
  LibraryViewMode,
  LiveItemAvailabilityEntry,
  PerkSearchResult,
  VaultItemMatchInfo
} from "@d2-tools/app";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale, LibraryCopy } from "../i18n/types.js";
import {
  ProductWorkspaceCommandBar,
  ProductWorkspaceContentStack,
  ProductWorkspaceEmptyState,
  ProductWorkspaceSideRail,
  ProductWorkspaceSplit
} from "../workspace/ProductWorkspace.js";

type LiveEntry = LiveItemAvailabilityEntry;
type LibraryPerkGroup = NonNullable<ItemSearchResult["perks"]>[number];
type LibraryDefinitionStat = NonNullable<ItemSearchResult["definition_stats"]>[number];
type LibraryWeaponPerkColumn = {
  key: string;
  label: string;
  plugs: LibraryPerkGroup["plugs"];
};
type LibraryEquipmentTag = {
  label: string;
  className?: string;
};

export type LibraryPageActions = {
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
};

export type LibraryPageContentViewProps = {
  interfaceLocale?: InterfaceLocale;
  model: LibraryPageModel;
  actions: LibraryPageActions;
};

function libraryText(copy: LibraryCopy, key: string): string {
  return copy.inline[key] ?? key;
}

export function LibraryPageContentView(props: LibraryPageContentViewProps) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").library;
  const { model, actions } = props;
  const libraryEquipmentFilter = model.queryPanel.equipmentFilters;
  const equipmentFilterOptions = model.queryPanel.equipmentFilterOptions;
  const perkGroupOptions = model.queryPanel.perkGroupOptions;
  const hitCount = model.results.hitCount;
  const liveStats = model.stats.live;
  const dropQueryStats = model.stats.dropQuery;
  const isManifestBlocked = model.queryPanel.isManifestBlocked;
  const manifestAlert = buildManifestAlert(model.manifestAlert, copy);
  const equipmentRows = useMemo(
    () => model.results.equipmentGroups.flatMap((group) => group.items),
    [model.results.equipmentGroups]
  );
  const [selectedDefinitionHash, setSelectedDefinitionHash] = useState<number | null>(null);
  const selectedDefinitionRow = equipmentRows.find((row) => row.item.hash === selectedDefinitionHash);

  const manifestAlertElement = manifestAlert ? (
        <section className={`library-manifest-alert status-message ${manifestAlert.className}`}>
          <div>
            <strong>{manifestAlert.title}</strong>
            <span>{manifestAlert.message}</span>
          </div>
          <div className="library-manifest-actions">
            <button type="button" className="secondary-button" onClick={actions.onRefreshManifestStatus}>
              {libraryText(copy, "重新检查")}
            </button>
            <button
              type="button"
              disabled={model.status.isInitializingManifest}
              onClick={actions.onInitializeManifest}
            >
              {model.status.isInitializingManifest ? libraryText(copy, "更新中...") : libraryText(copy, "后台更新资料库")}
            </button>
          </div>
        </section>
  ) : null;

  return (
    <>
      {manifestAlertElement}
      <ProductWorkspaceSplit className="library-workbench-layout">
      <ProductWorkspaceSideRail element="section" className="library-query-panel" ariaLabel={libraryText(copy, "出处查询")}>
        <ProductWorkspaceCommandBar className="library-search-command">
          <div className="library-search-command-head">
            <div className="library-acquisition-tabs segmented-control">
              <button
                type="button"
                value="equipment"
                className={model.queryPanel.viewMode === "equipment" ? "active" : ""}
                onClick={() => actions.onViewModeChange("equipment")}
              >
                {copy.tabs.equipment}
              </button>
              <button
                type="button"
                value="perks"
                className={model.queryPanel.viewMode === "perks" ? "active" : ""}
                onClick={() => actions.onViewModeChange("perks")}
              >
                {copy.tabs.perks}
              </button>
            </div>
            <span className="library-search-hint">
              {model.queryPanel.viewMode === "equipment"
                ? libraryText(copy, "查装备、来源和 Perk 池")
                : libraryText(copy, "查 Perk 和关联装备")}
            </span>
          </div>
          <div className="search-row library-primary-search">
            <input
              value={model.queryPanel.primaryQuery}
              disabled={isManifestBlocked}
              onChange={(event) => {
                if (model.queryPanel.viewMode === "equipment") {
                  actions.onEquipmentFiltersChange({ query: event.target.value });
                } else {
                  actions.onPerkFiltersChange({ query: event.target.value });
                }
              }}
              placeholder={model.queryPanel.viewMode === "perks" ? libraryText(copy, "输入 Perk 名称或别名，例如 ff") : libraryText(copy, "输入装备名称，例如 Riskrunner")}
            />
            <button type="button" disabled={model.status.isSearching || isManifestBlocked} onClick={actions.onSearch}>
              {model.status.isSearching ? libraryText(copy, "搜索中...") : libraryText(copy, "搜索")}
            </button>
            <button type="button" className="secondary-button" onClick={actions.onClearFilters}>
              {libraryText(copy, "清空")}
            </button>
          </div>
        </ProductWorkspaceCommandBar>
        {isManifestBlocked ? (
          <p className="status-message status-warning">{libraryText(copy, "资料库更新完成前暂不可搜索。请先使用上方按钮启动后台更新。")}</p>
        ) : null}
        <div className="library-quick-filters library-main-filter-row" aria-label={libraryText(copy, "常用筛选")}>
          {model.queryPanel.viewMode === "equipment" ? (
            <>
              <div className="library-quick-filter-row" aria-label={libraryText(copy, "分类")}>
                {equipmentFilterOptions.groups.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={libraryEquipmentFilter.group === option.value ? "active" : ""}
                    onClick={() => actions.onEquipmentFiltersChange({ group: option.value as LibraryEquipmentFilter["group"] })}
                  >
                    {libraryText(copy, option.label)}
                  </button>
                ))}
              </div>
              <label className="compact-field library-select-only">
                <span className="library-field-label-hidden">{libraryText(copy, "稀有度")}</span>
                <select
                  value={libraryEquipmentFilter.tier}
                  onChange={(event) => actions.onEquipmentFiltersChange({ tier: event.target.value })}
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
                  onChange={(event) => actions.onEquipmentFiltersChange({ bucket: event.target.value })}
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
                    className={model.queryPanel.perkFilters.relatedGroup === option.value ? "active" : ""}
                    onClick={() => actions.onPerkFiltersChange({ relatedGroup: option.value as LibraryPerkFilter["relatedGroup"] })}
                  >
                    {libraryText(copy, option.label)}
                  </button>
                ))}
              </div>
              <label className="compact-field library-select-only">
                <span className="library-field-label-hidden">{libraryText(copy, "关联装备")}</span>
                <select
                  value={model.queryPanel.perkFilters.hasRelatedItems}
                  onChange={(event) => actions.onPerkFiltersChange({ hasRelatedItems: event.target.value as LibraryPerkFilter["hasRelatedItems"] })}
                >
                  <option value="all">{libraryText(copy, "全部")}</option>
                  <option value="yes">{libraryText(copy, "有")}</option>
                  <option value="no">{libraryText(copy, "无")}</option>
                </select>
              </label>
            </>
          )}
        </div>
        {model.queryPanel.viewMode === "equipment" ? (
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
              {model.status.liveAvailabilityError ? (
                <p className="status-message status-warning">{model.status.liveAvailabilityError}</p>
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
                        onChange={(event) => actions.onEquipmentFiltersChange({ ammo: event.target.value as LibraryEquipmentFilter["ammo"] })}
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
                              onClick={() => actions.onEquipmentFiltersChange({ frame: [] })}
                            >
                              {libraryText(copy, option.label)}
                            </button>
                          ) : (
                            <button
                              type="button"
                              key={option.value}
                              className={libraryEquipmentFilter.frame.includes(option.value) ? "active" : ""}
                              onClick={() => actions.onEquipmentFiltersChange({
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
                    onChange={(event) => actions.onEquipmentFiltersChange({
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
                    onChange={(event) => actions.onEquipmentFiltersChange({
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
                    onChange={(event) => actions.onEquipmentFiltersChange({
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
                    onChange={(event) => actions.onEquipmentFiltersChange({ perkQuery: event.target.value })}
                    placeholder={libraryText(copy, "例如 kinetic tremors")}
                  />
                </label>
              </div>
              <div className="drop-query-grid live-availability-summary library-source-matrix">
                <div className="drop-query-stat">
                  <span>{libraryText(copy, "查询范围")}</span>
                  <strong>{formatLiveScope(model.stats.live.scope, model.status.isLoadingLiveAvailability, copy)}</strong>
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
              <input value={model.aliasPanel.draft} onChange={(event) => actions.onAliasDraftChange(event.target.value)} placeholder={libraryText(copy, "别名，例如 ff")} />
              <input value={model.aliasPanel.targetDraft} onChange={(event) => actions.onAliasTargetDraftChange(event.target.value)} placeholder={libraryText(copy, "实际名称，例如 喂食狂热")} />
              <select value={model.aliasPanel.kind} onChange={(event) => actions.onAliasKindChange(event.target.value as "item" | "perk")}>
                <option value="item">{libraryText(copy, "装备")}</option>
                <option value="perk">Perk</option>
              </select>
              <button
                type="button"
                className="secondary-button"
                disabled={!model.aliasPanel.draft.trim() || !model.aliasPanel.targetDraft.trim()}
                onClick={actions.onSaveAlias}
              >
                {libraryText(copy, "保存别名")}
              </button>
            </div>
            <p className="muted-copy">{libraryText(copy, "别名会保存在本机，只影响你自己的搜索。")}</p>
            {model.aliasPanel.message ? <p className="status-message status-ready">{model.aliasPanel.message}</p> : null}
            <div className="daily-source-grid">
              <div className="daily-source source-ready">
                <strong>{libraryText(copy, "最近查看")}</strong>
                <span>{model.aliasPanel.history.recent.slice(0, 5).map((item) => item.name).join(" / ") || libraryText(copy, "暂无")}</span>
              </div>
              <div className="daily-source source-ready">
                <strong>{libraryText(copy, "收藏")}</strong>
                <span>{model.aliasPanel.history.favorites.slice(0, 5).map((item) => item.name).join(" / ") || libraryText(copy, "暂无")}</span>
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
      </ProductWorkspaceSideRail>
      <ProductWorkspaceContentStack element="section" className="library-results-panel" ariaLabel={libraryText(copy, "搜索结果")}>
        <div className="library-results-heading">
          <h3>{libraryText(copy, "搜索结果")}</h3>
          <span>{hitCount} {libraryText(copy, model.queryPanel.viewMode === "equipment" ? "条来源线索" : "条 Perk 线索")}</span>
        </div>
        <p className="muted-copy">{libraryText(copy, "不补猜来源、分类或关联项，缺字段就按缺字段显示。")}</p>
        {model.status.searchError ? <p className="status-message status-error">{model.status.searchError}</p> : null}
        {model.queryPanel.viewMode === "equipment" ? (
          <div className="library-equipment-browser">
            <div className="drop-query-groups library-source-groups library-equipment-list" aria-label={libraryText(copy, "装备结果列表")}>
              {model.results.equipmentGroups.map((group) => (
                <section className={"drop-query-group drop-access-" + group.key} key={group.key}>
                  <div className="drop-query-group-heading">
                    <div>
                      <strong>{formatDropAccessLabel(group.key, copy)}</strong>
                      <span>{formatDropAccessDescription(group.key, copy)}</span>
                    </div>
                    <span className={"ui-badge " + getDropAccessBadgeClass(group.key)}>{group.items.length} {libraryText(copy, "件")}</span>
                  </div>
                  <div className="item-results">
                    {group.items.map((item) => renderEquipmentResult(
                      item,
                      () => setSelectedDefinitionHash(item.item.hash),
                      actions.onAddFavorite,
                      actions.onRemoveFavorite,
                      copy
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : (
          <div className="item-results">
            {model.results.perks.map((perk) => (
              <article className="item-result" key={perk.perk.hash}>
                {perk.perk.icon ? <img alt="" src={perk.perk.icon} /> : null}
                <div>
                  <h3>{perk.perk.name}</h3>
                  <p>{perk.perk.description}</p>
                  {perk.hasRelatedItems ? (
                    <>
                      <p>
                        <strong>{libraryText(copy, "关联分类：")}</strong>
                        {perk.relatedGroupKeys.map((group) => formatLibraryGroupLabel(group, copy)).filter(Boolean).join(" / ")}
                      </p>
                      <p><strong>{libraryText(copy, "可能出现于：")}</strong>{perk.relatedItemNames.join(" / ")}</p>
                    </>
                  ) : (
                    <p>{libraryText(copy, "资料库里还没有查到关联装备。")}</p>
                  )}
                  <button type="button" className="inline-action" onClick={() => actions.onAddFavorite(perk.perk)}>
                    {libraryText(copy, "收藏")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {model.emptyState?.kind === "not_searched" ? (
          <ProductWorkspaceEmptyState>
            <strong>{libraryText(copy, "输入装备名或 Perk 名后开始搜索。")}</strong>
            <span>{libraryText(copy, "结果区会展示来源、实时状态、掉落判断和 Perk 池。")}</span>
          </ProductWorkspaceEmptyState>
        ) : null}
        {model.emptyState?.kind === "no_results" ? (
          <ProductWorkspaceEmptyState>
            <strong>{libraryText(copy, "未找到匹配结果。")}</strong>
            <span>{libraryText(copy, "可以换中文名、英文名，或者先保存一个常用别名再搜。")}</span>
          </ProductWorkspaceEmptyState>
        ) : null}
      </ProductWorkspaceContentStack>
      </ProductWorkspaceSplit>
      {selectedDefinitionRow ? (
        <LibraryDefinitionDialog
          row={selectedDefinitionRow}
          copy={copy}
          onClose={() => setSelectedDefinitionHash(null)}
        />
      ) : null}
    </>
  );
}

function buildManifestAlert(
  alert: LibraryManifestAlertModel | null,
  copy: LibraryCopy
): { title: string; message: string; className: string } | null {
  if (!alert) {
    return null;
  }
  if (alert.kind === "error") {
    return {
      title: libraryText(copy, "资料库状态读取失败"),
      message: alert.error ?? libraryText(copy, "未知错误"),
      className: alert.className
    };
  }
  if (alert.kind === "loading") {
    return {
      title: libraryText(copy, "正在检查资料库版本"),
      message: libraryText(copy, "资料库版本检查会在后台运行，切换菜单不会中断。"),
      className: alert.className
    };
  }
  if (alert.kind === "not_initialized") {
    return {
      title: libraryText(copy, "资料库尚未初始化"),
      message: libraryText(copy, "账号页、搜索和详情需要资料库。可以现在启动后台更新，完成后再继续查询。"),
      className: alert.className
    };
  }
  if (alert.kind === "missing_components") {
    return {
      title: libraryText(copy, "缺少必要资料库组件"),
      message: `${libraryText(copy, "缺少")} ${alert.missingComponentCount ?? 0} ${libraryText(copy, "个组件，搜索和详情可能不完整；建议立即后台更新资料库。")}`,
      className: alert.className
    };
  }
  if (alert.kind === "needs_update") {
    return {
      title: libraryText(copy, "资料库不是最新版本"),
      message: `${libraryText(copy, "当前")} ${alert.version ?? libraryText(copy, "未知版本")}，${libraryText(copy, "最新")} ${alert.latestVersion ?? libraryText(copy, "未知版本")}${libraryText(copy, "；旧资料库可能导致来源、Perk 或详情判断错误。")}`,
      className: alert.className
    };
  }
  return null;
}

function renderEquipmentResult(
  row: LibraryEquipmentResultView,
  onOpenDefinition: () => void,
  onAddFavorite: (item: ItemSearchResult | PerkSearchResult) => void,
  onRemoveFavorite: (hash: number) => void,
  copy: LibraryCopy
) {
  const item = row.item;
  const equipmentTags = [
    toLibraryEquipmentTag(item.tier),
    toLibraryEquipmentTag(item.item_type),
    toLibraryEquipmentTag(item.bucket_name),
    toLibraryElementTag(item.damage_type),
    item.is_adept ? toLibraryEquipmentTag(libraryText(copy, "专家")) : undefined,
    toLibraryEquipmentTag(formatLibraryAmmo(item.ammo_type, copy)),
    toLibraryEquipmentTag(item.weapon_frame?.name)
  ].filter((tag): tag is LibraryEquipmentTag => Boolean(tag));
  const versionDescription = item.release?.description ?? libraryText(copy, "暂无已验证版本");
  const sourceDescription = item.source.status === "ready"
    ? item.source.description
    : libraryText(copy, "暂无已验证来源");
  const liveChannelDescription = formatLibraryLiveChannel(row.liveEntry, copy);

  return (
    <article className="item-result library-weapon-card library-reference-card" key={item.hash}>
      <div className="library-result-summary">
        {item.icon ? <img alt="" src={item.icon} /> : null}
        <div className="library-result-identity">
          <div className="library-weapon-card-heading">
            <h3>{item.name}</h3>
          </div>
          {equipmentTags.length ? (
            <div className="library-equipment-tags" aria-label={libraryText(copy, "装备信息")}>
              {equipmentTags.map((tag) => <span className={tag.className} key={tag.label}>{tag.label}</span>)}
            </div>
          ) : null}
          {item.origin_traits?.length ? (
            <p className="library-origin-traits">
              {libraryText(copy, "起源特性：")}{item.origin_traits.map((trait) => trait.name).join("、")}
            </p>
          ) : null}
          {item.description ? <p>{item.description}</p> : null}
        </div>
        <dl className="library-version-source">
          <div>
            <dt>{libraryText(copy, "版本")}</dt>
            <dd>{versionDescription}</dd>
          </div>
          <div>
            <dt>{item.source.label}</dt>
            <dd>{sourceDescription}</dd>
          </div>
          <div>
            <dt>{libraryText(copy, "当前公开渠道")}</dt>
            <dd>{liveChannelDescription}</dd>
          </div>
        </dl>
      </div>
      <div className="library-result-actions">
        <button type="button" className="inline-action" onClick={onOpenDefinition}>
          {libraryText(copy, "查看详情")}
        </button>
        <button type="button" className="inline-action" onClick={() => onAddFavorite(item)}>
          {libraryText(copy, "收藏")}
        </button>
        {row.isFavorite ? (
          <button type="button" className="inline-action" onClick={() => onRemoveFavorite(item.hash)}>
            {libraryText(copy, "取消收藏")}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function LibraryDefinitionDialog(props: {
  row: LibraryEquipmentResultView;
  copy: LibraryCopy;
  onClose: () => void;
}) {
  const row = props.row;
  const item = row.item;
  const copy = props.copy;
  const sourceStatus = item.source.status;
  const liveEntry = row.liveEntry;
  const communityMatch = row.communityMatch;
  const weaponPerkColumns = getLibraryWeaponPerkColumns(item.perks ?? [], item.item_type);
  const meta = [
    item.tier,
    item.item_type,
    item.bucket_name,
    item.weapon_frame?.name
  ].filter(Boolean);

  return (
    <div className="library-definition-modal">
      <button type="button" className="library-definition-backdrop" aria-label={libraryText(copy, "关闭定义详情")} onClick={props.onClose} />
      <section className="library-definition-dialog" role="dialog" aria-modal="true" aria-label={libraryText(copy, "定义详情")}>
        <div className="library-definition-toolbar">
          <div>
            <strong>{libraryText(copy, "定义详情")}</strong>
            <span>{libraryText(copy, "Manifest 定义，不是当前装备实例。")}</span>
          </div>
          <button type="button" className="secondary-button" onClick={props.onClose}>
            {libraryText(copy, "关闭")}
          </button>
        </div>
        <div className="library-definition-head">
          {item.icon ? <img alt="" src={item.icon} /> : null}
          <div>
            <span className={"ui-badge " + getDropAccessBadgeClass(row.dropAccess)}>{formatDropAccessLabel(row.dropAccess, copy)}</span>
            <h3>{item.name}</h3>
            <p>{meta.join(" / ") || libraryText(copy, "装备定义")}</p>
          </div>
        </div>
        <div className="library-definition-body">
          <div className="library-definition-overview">
            <div className="library-definition-meta" aria-label={libraryText(copy, "定义字段")}>
              {meta.map((value) => <span key={value}>{value}</span>)}
              <span>{libraryText(copy, "Hash")} {item.hash}</span>
            </div>
            {item.description ? <p className="library-definition-description">{item.description}</p> : null}
            {item.definition_stats?.length ? (
              <section className="library-definition-stats" aria-label={libraryText(copy, "定义属性")}>
                <div className="library-definition-section-heading">
                  <strong>{libraryText(copy, "定义属性")}</strong>
                  <span>{libraryText(copy, "来自 Manifest 定义数值，不包含已有装备 Roll。")}</span>
                </div>
                <div className="library-definition-stat-list">
                  {item.definition_stats.map((stat) => (
                    <DefinitionStatRow key={stat.hash} stat={stat} />
                  ))}
                </div>
              </section>
            ) : null}
            <div className="library-definition-source-grid">
              <div className="library-definition-source">
                <div className="item-source-heading">
                  <strong>{libraryText(copy, "实时状态")}</strong>
                  <span className={"source-status-badge " + getLiveStatusClass(liveEntry)}>
                    {liveEntry?.label ?? libraryText(copy, "等待实时查询")}
                  </span>
                </div>
                <span>{liveEntry?.description ?? libraryText(copy, "正在结合 Bungie 当前公开数据和登录角色商人数据复查。")}</span>
                {liveEntry?.sources.length ? <small>{liveEntry.sources.map((source) => formatLiveSource(source, copy)).join(" / ")}</small> : null}
              </div>
              <div className="library-definition-source">
                <div className="item-source-heading">
                  <strong>{item.source.label}</strong>
                  <span className={"source-status-badge " + getLibrarySourceStatusClass(sourceStatus)}>
                    {formatLibrarySourceStatus(sourceStatus, copy)}
                  </span>
                </div>
                <span>{item.source.description}</span>
              </div>
              <div className="library-definition-source">
                <strong>{libraryText(copy, "刷取判断")}</strong>
                <span>{formatDropActionHint(row.dropAccess, communityMatch, liveEntry, copy)}</span>
              </div>
              {(communityMatch?.available ?? 0) > 0 ? (
                <div className="library-definition-source">
                  <strong>{libraryText(copy, "社区推荐")}</strong>
                  <span>{`${communityMatch?.available} ${libraryText(copy, "个组合")}${
                    formatCommunityPerkPreview(communityMatch?.sample_perks)
                      ? ` · ${formatCommunityPerkPreview(communityMatch?.sample_perks)}`
                      : ""
                  }`}</span>
                </div>
              ) : null}
            </div>
          </div>
          {weaponPerkColumns.length ? (
            <section className="library-definition-perk-pool" aria-label={libraryText(copy, "武器定义结构")}>
              <div className="library-definition-section-heading">
                <strong>{libraryText(copy, "武器定义结构")}</strong>
                <span>{libraryText(copy, "按玩家可读的武器列展示，不显示大师杰作、模组、专家模组或已有装备实例状态。")}</span>
              </div>
              <div className="library-definition-perk-columns">
                {weaponPerkColumns.map((column) => (
                  <div className="library-definition-perk-column" key={column.key}>
                    <h4>{libraryText(copy, column.label)}</h4>
                    <div className="library-definition-perk-list">
                      {column.plugs.map((plug) => (
                        <article className="library-definition-perk-card" key={plug.hash}>
                          {plug.icon ? <img alt="" src={plug.icon} /> : <span aria-hidden="true" />}
                          <div>
                            <strong>{plug.name}</strong>
                            {plug.description ? <p>{plug.description}</p> : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <p className="muted-copy">{libraryText(copy, "资料库暂未提供可展示的武器定义结构。")}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function DefinitionStatRow(props: { stat: LibraryDefinitionStat }) {
  const stat = props.stat;
  const fillPercent = Math.max(3, Math.min(100, (stat.value / stat.display_maximum) * 100));

  return (
    <div className="library-definition-stat-row">
      <span>{stat.name}</span>
      <b>{stat.value}</b>
      <i style={{ width: `${fillPercent}%` }} aria-hidden="true" />
    </div>
  );
}

export function getLibraryRandomPerkGroups(groups: LibraryPerkGroup[]): LibraryPerkGroup[] {
  return normalizeLibraryWeaponPerkGroups(groups);
}

export function getLibraryWeaponPerkColumns(groups: LibraryPerkGroup[], itemType = ""): LibraryWeaponPerkColumn[] {
  const labels = getLibraryWeaponColumnLabels(itemType);
  return normalizeLibraryWeaponPerkGroups(groups)
    .flatMap((group) => {
      const label = labels[group.socket_index];
      if (!label) {
        return [];
      }

      return [{
        key: `socket-${group.socket_index}`,
        label,
        plugs: group.plugs
      }];
    });
}

function normalizeLibraryWeaponPerkGroups(groups: LibraryPerkGroup[]): LibraryPerkGroup[] {
  return groups
    .filter((group) => group.socket_index >= 0 && group.socket_index <= 5)
    .map((group) => ({
      ...group,
      plugs: group.plugs.filter((plug) => !isLibrarySystemPlug(plug))
    }))
    .filter((group) => group.plugs.length > 0);
}

function isLibrarySystemPlug(plug: LibraryPerkGroup["plugs"][number]): boolean {
  const text = `${plug.name} ${plug.description}`.toLowerCase();
  return [
    "纪念",
    "memento",
    "着色器",
    "shader",
    "配色",
    "外观",
    "ornament",
    "击杀记录",
    "记录器",
    "tracker",
    "kill tracker",
    "kill counter",
    "大师杰作",
    "masterwork",
    "将其铸造为大师杰作",
    "模组",
    "mod",
    "专家",
    "adept"
  ].some((keyword) => text.includes(keyword));
}

function getLibraryWeaponColumnLabels(itemType: string): string[] {
  if (itemType.includes("弓")) {
    return ["框架 / 固有", "弓弦", "箭矢", "第 4 列", "第 5 列", "起源特性"];
  }

  return ["框架 / 固有", "枪管 / 瞄具", "弹匣 / 电池", "第 4 列", "第 5 列", "起源特性"];
}

function formatLiveScope(scope: LibraryPageModel["stats"]["live"]["scope"], isLoading: boolean, copy: LibraryCopy): string {
  if (isLoading) return libraryText(copy, "查询中");
  if (scope === "none") return libraryText(copy, "未查询");
  return scope === "character" ? libraryText(copy, "公共 + 角色") : libraryText(copy, "公共");
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

function formatLibraryAmmo(ammoType: ItemSearchResult["ammo_type"], copy: LibraryCopy): string | undefined {
  if (ammoType === "primary") return libraryText(copy, "主弹药");
  if (ammoType === "special") return libraryText(copy, "特殊弹药");
  if (ammoType === "heavy") return libraryText(copy, "重型弹药");
  return undefined;
}

function toLibraryEquipmentTag(label: string | undefined): LibraryEquipmentTag | undefined {
  return label ? { label } : undefined;
}

function toLibraryElementTag(damageType: string | undefined): LibraryEquipmentTag | undefined {
  const classNameByDamageType: Record<string, string> = {
    "动能伤害": "library-element-tag library-element-kinetic",
    "电弧伤害": "library-element-tag library-element-arc",
    "烈日伤害": "library-element-tag library-element-solar",
    "虚空伤害": "library-element-tag library-element-void",
    "冰影伤害": "library-element-tag library-element-stasis",
    "缚丝伤害": "library-element-tag library-element-strand"
  };
  const className = damageType ? classNameByDamageType[damageType] : undefined;
  return className && damageType ? { label: damageType, className } : toLibraryEquipmentTag(damageType);
}

function formatLibraryLiveChannel(liveEntry: LiveEntry | undefined, copy: LibraryCopy): string {
  if (!liveEntry) return libraryText(copy, "正在查询商人和公共活动。");
  if (liveEntry.status === "manifest_only") {
    return libraryText(copy, "当前商人和公共活动未直接命中。")
  }
  return liveEntry.label;
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

function formatDropAccessDescription(access: LibraryDropAccessKey, copy: LibraryCopy): string {
  if (access === "available") {
    return libraryText(copy, "来源字段可确认，但不等同于当前在线可刷；实时活动或商人轮换接入前只作为刷取线索。");
  }
  if (access === "rotation") {
    return libraryText(copy, "来源说明包含铁旗、试炼、夜幕、每周或轮换类线索，需要结合当前轮换复查。");
  }
  if (access === "archived") {
    return libraryText(copy, "来源说明显示不可获取、传承或下架状态。");
  }
  return libraryText(copy, "资料库暂未提供可确认来源。");
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
