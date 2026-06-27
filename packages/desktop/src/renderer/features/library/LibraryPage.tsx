import type {
  ItemSearchResult,
  LibraryHistory,
  PerkSearchResult,
  VaultItemMatchInfo
} from "../../api/client";
import {
  buildLibraryEquipmentFilterOptions,
  buildLibraryPerkGroupOptions,
  filterLibraryEquipmentItems,
  filterLibraryPerks,
  type LibraryEquipmentFilter,
  type LibraryPerkFilter,
  type LibraryViewMode
} from "../../utils/libraryFilters";

export function LibraryPage(props: {
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
  itemDetailLoadingKey: string;
  onViewModeChange: (mode: LibraryViewMode) => void;
  onEquipmentFiltersChange: (patch: Partial<LibraryEquipmentFilter>) => void;
  onPerkFiltersChange: (patch: Partial<LibraryPerkFilter>) => void;
  onSearch: () => void;
  onClearFilters: () => void;
  onAliasDraftChange: (value: string) => void;
  onAliasTargetDraftChange: (value: string) => void;
  onAliasKindChange: (kind: "item" | "perk") => void;
  onSaveAlias: () => void;
  onOpenItemDetail: (item: ItemSearchResult) => void;
  onAddFavorite: (item: ItemSearchResult | PerkSearchResult) => void;
  onRemoveFavorite: (hash: number) => void;
}) {
  const libraryEquipmentFilter = props.equipmentFilters;
  const equipmentFilterOptions = buildLibraryEquipmentFilterOptions(props.items);
  const perkGroupOptions = buildLibraryPerkGroupOptions(props.perks);
  const visibleItems = filterLibraryEquipmentItems(props.items, libraryEquipmentFilter);
  const visiblePerks = filterLibraryPerks(props.perks, props.perkFilters);
  const hitCount = props.libraryViewMode === "equipment" ? visibleItems.length : visiblePerks.length;
  const searchTouched = props.libraryViewMode === "equipment"
    ? props.equipmentSearchTouched
    : props.perkSearchTouched;

  return (
    <section className="tool-panel">
      <div>
        <h2>资料库搜索</h2>
        <p>按装备和 Perk 分开检索，筛选只基于本地 Manifest 里已经确认的字段。</p>
      </div>
      <div className="segmented-control">
        <button
          type="button"
          value="equipment"
          className={props.libraryViewMode === "equipment" ? "active" : ""}
          onClick={() => props.onViewModeChange("equipment")}
        >
          装备
        </button>
        <button
          type="button"
          value="perks"
          className={props.libraryViewMode === "perks" ? "active" : ""}
          onClick={() => props.onViewModeChange("perks")}
        >
          Perk
        </button>
      </div>
      <div className="library-filter-grid">
        {props.libraryViewMode === "equipment" ? (
          <>
            <label className="compact-field">
              分类
              <select
                value={libraryEquipmentFilter.group}
                onChange={(event) => props.onEquipmentFiltersChange({ group: event.target.value as LibraryEquipmentFilter["group"] })}
              >
                {equipmentFilterOptions.groups.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="compact-field">
              稀有度
              <select
                value={libraryEquipmentFilter.tier}
                onChange={(event) => props.onEquipmentFiltersChange({ tier: event.target.value })}
              >
                {equipmentFilterOptions.tiers.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="compact-field">
              位置
              <select
                value={libraryEquipmentFilter.bucket}
                onChange={(event) => props.onEquipmentFiltersChange({ bucket: event.target.value })}
              >
                {equipmentFilterOptions.buckets.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {libraryEquipmentFilter.group === "weapons" ? (
              <>
                <label className="compact-field">
                  弹药
                  <select
                    value={libraryEquipmentFilter.ammo}
                    onChange={(event) => props.onEquipmentFiltersChange({ ammo: event.target.value as LibraryEquipmentFilter["ammo"] })}
                  >
                    {equipmentFilterOptions.ammo.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <div className="compact-field">
                  <span>框架</span>
                  <div className="segmented-control" aria-label="资料库武器框架筛选">
                    {equipmentFilterOptions.frames.map((option) => (
                      option.value === "all" ? (
                        <button
                          type="button"
                          key={option.value}
                          className={!libraryEquipmentFilter.frame.length ? "active" : ""}
                          onClick={() => props.onEquipmentFiltersChange({ frame: [] })}
                        >
                          {option.label}
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
                          {option.label}
                        </button>
                      )
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </>
        ) : (
          <>
            <label className="compact-field">
              关联分类
              <select
                value={props.perkFilters.relatedGroup}
                onChange={(event) => props.onPerkFiltersChange({ relatedGroup: event.target.value as LibraryPerkFilter["relatedGroup"] })}
              >
                {perkGroupOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="compact-field">
              关联装备
              <select
                value={props.perkFilters.hasRelatedItems}
                onChange={(event) => props.onPerkFiltersChange({ hasRelatedItems: event.target.value as LibraryPerkFilter["hasRelatedItems"] })}
              >
                <option value="all">全部</option>
                <option value="yes">有</option>
                <option value="no">无</option>
              </select>
            </label>
          </>
        )}
      </div>
      <div className="search-row">
        <input
          value={props.libraryViewMode === "equipment" ? props.equipmentFilters.query : props.perkFilters.query}
          onChange={(event) => {
            if (props.libraryViewMode === "equipment") {
              props.onEquipmentFiltersChange({ query: event.target.value });
            } else {
              props.onPerkFiltersChange({ query: event.target.value });
            }
          }}
          placeholder={props.libraryViewMode === "perks" ? "输入 Perk 名称或别名，例如 ff" : "输入装备名称，例如 Riskrunner"}
        />
        <button type="button" disabled={props.isSearching} onClick={props.onSearch}>
          {props.isSearching ? "搜索中..." : "搜索"}
        </button>
        <button type="button" className="secondary-button" onClick={props.onClearFilters}>
          清空筛选
        </button>
      </div>
      <p className="muted-copy">命中 {hitCount} 条。不会补猜来源、分类或关联项，缺字段就按缺字段显示。</p>
      <div className="alias-editor">
        <input value={props.aliasDraft} onChange={(event) => props.onAliasDraftChange(event.target.value)} placeholder="别名，例如 ff" />
        <input value={props.aliasTargetDraft} onChange={(event) => props.onAliasTargetDraftChange(event.target.value)} placeholder="实际名称，例如 喂食狂热" />
        <select value={props.aliasKind} onChange={(event) => props.onAliasKindChange(event.target.value as "item" | "perk")}>
          <option value="item">装备</option>
          <option value="perk">Perk</option>
        </select>
        <button
          type="button"
          className="secondary-button"
          disabled={!props.aliasDraft.trim() || !props.aliasTargetDraft.trim()}
          onClick={props.onSaveAlias}
        >
          保存别名
        </button>
      </div>
      <p className="muted-copy">别名会保存在本机，只影响你自己的搜索。</p>
      {props.aliasMessage ? <p className="status-message status-ready">{props.aliasMessage}</p> : null}
      {props.searchError ? <p className="status-message status-error">{props.searchError}</p> : null}
      <div className="daily-source-grid">
        <div className="daily-source source-ready">
          <strong>最近查看</strong>
          <span>{props.libraryHistory.recent.slice(0, 5).map((item) => item.name).join(" / ") || "暂无"}</span>
        </div>
        <div className="daily-source source-ready">
          <strong>收藏</strong>
          <span>{props.libraryHistory.favorites.slice(0, 5).map((item) => item.name).join(" / ") || "暂无"}</span>
        </div>
      </div>
      <div className="item-results">
        {props.libraryViewMode === "equipment" ? visibleItems.map((item) => (
          <article className="item-result" key={item.hash}>
            {item.icon ? <img alt="" src={item.icon} /> : null}
            <div>
              <h3>{item.name}</h3>
              <p>{[item.tier, item.item_type, item.bucket_name].filter(Boolean).join(" / ")}</p>
              <p>{item.description}</p>
              <p><strong>{item.source.label}：</strong>{item.source.description}</p>
              {item.perks?.length ? (
                <div className="perk-groups">
                  {item.perks.slice(0, 6).map((group) => (
                    <div className="perk-group" key={group.socket_index}>
                      {group.plugs.slice(0, 6).map((plug) => (
                        <span className="perk-chip" key={plug.hash}>{plug.name}</span>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
              {(props.libraryCommunityMatch.get(item.hash)?.available ?? 0) > 0 ? (
                <small className="library-community-match">
                  {`社区推荐 ${props.libraryCommunityMatch.get(item.hash)?.available} 个组合${
                    formatCommunityPerkPreview(props.libraryCommunityMatch.get(item.hash)?.sample_perks)
                      ? ` · ${formatCommunityPerkPreview(props.libraryCommunityMatch.get(item.hash)?.sample_perks)}`
                      : ""
                  }`}
                </small>
              ) : null}
              <button
                type="button"
                className="inline-action"
                aria-busy={getItemKey(item) === props.itemDetailLoadingKey}
                onClick={() => props.onOpenItemDetail(item)}
              >
                查看详情
              </button>
              <button type="button" className="inline-action" onClick={() => props.onAddFavorite(item)}>
                收藏
              </button>
              {props.libraryHistory.favorites.some((favorite) => favorite.hash === item.hash) ? (
                <button type="button" className="inline-action" onClick={() => props.onRemoveFavorite(item.hash)}>
                  取消收藏
                </button>
              ) : null}
            </div>
          </article>
        )) : visiblePerks.map((perk) => (
          <article className="item-result" key={perk.hash}>
            {perk.icon ? <img alt="" src={perk.icon} /> : null}
            <div>
              <h3>{perk.name}</h3>
              <p>{perk.description}</p>
              {perk.related_items?.length ? (
                <>
                  <p>
                    <strong>关联分类：</strong>
                    {[...new Set(perk.related_items.map((item) => formatLibraryGroupLabel(item.group_key)).filter(Boolean))].join(" / ")}
                  </p>
                  <p><strong>可能出现于：</strong>{perk.related_items.map((item) => item.name).join(" / ")}</p>
                </>
              ) : (
                <p>本地 Manifest 里还没有查到关联装备。</p>
              )}
              <button type="button" className="inline-action" onClick={() => props.onAddFavorite(perk)}>
                收藏
              </button>
            </div>
          </article>
        ))}
      </div>
      {searchTouched && !props.isSearching && !props.searchError && !hitCount ? (
        <p className="status-message status-neutral">未找到匹配结果。可以换中文名、英文名，或者先保存一个常用别名再搜。</p>
      ) : null}
    </section>
  );
}

function getItemKey(item: ItemSearchResult): string {
  const possibleInstanceItem = item as ItemSearchResult & { instance_id?: unknown };
  return typeof possibleInstanceItem.instance_id === "string" && possibleInstanceItem.instance_id
    ? possibleInstanceItem.instance_id
    : `hash:${item.hash}`;
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
  group: ItemSearchResult["group_key"] | NonNullable<PerkSearchResult["related_items"]>[number]["group_key"]
) {
  if (group === "weapons") return "武器";
  if (group === "armor") return "护甲";
  if (group === "equipment") return "装备";
  if (group === "other") return "其他";
  return "";
}
