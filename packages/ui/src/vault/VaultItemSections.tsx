import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { VaultTags } from "@d2-tools/core/vault/tags";
import { matchesLoadoutTemplateItem, type LoadoutTemplateLookup } from "@d2-tools/app/loadouts";
import type { VaultSection } from "@d2-tools/app/vault";
import { MemoizedVaultListItem as VaultListItem } from "./VaultListItem.js";
import { getVaultItemKey } from "@d2-tools/app/vault";
import type { VaultRecommendationSummaryIndex } from "./vaultRecommendationMatch.js";
import { VaultVirtualWeaponGrid } from "./VaultVirtualWeaponGrid.js";

export const INITIAL_VAULT_RENDER_LIMIT = 200;
const VAULT_RENDER_INCREMENT = 200;

export function VaultItemSections(props: {
  sections: VaultSection[];
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  tags: VaultTags;
  recommendationSummaryByInstance?: VaultRecommendationSummaryIndex;
  isOrganizing: boolean;
  isSearchActive: boolean;
  selectedKeys: Set<string>;
  openingItemKey?: string;
  emptyMessage?: string;
  onSelectItem: (item: AccountItemSummary) => void;
  onToggleSelected: (item: AccountItemSummary) => void;
}) {
  const totalItemCount = useMemo(
    () => props.sections.reduce((total, section) => total + section.items.length, 0),
    [props.sections]
  );
  const [visibleItemLimit, setVisibleItemLimit] = useState(INITIAL_VAULT_RENDER_LIMIT);
  useEffect(() => {
    setVisibleItemLimit(INITIAL_VAULT_RENDER_LIMIT);
  }, [props.sections]);
  const effectiveVisibleItemLimit = visibleItemLimit;
  const renderedSections = useMemo(() => {
    let remaining = effectiveVisibleItemLimit;
    return props.sections.flatMap((section) => {
      if (remaining <= 0) {
        return [];
      }
      const items = section.items.slice(0, remaining);
      remaining -= items.length;
      return items.length ? [{ ...section, items }] : [];
    });
  }, [props.sections, effectiveVisibleItemLimit]);
  const renderedItemCount = Math.min(effectiveVisibleItemLimit, totalItemCount);
  const allItems = useMemo(
    () => props.sections.flatMap((section) => section.items),
    [props.sections]
  );
  const isWeaponOnly = allItems.length > 0 && allItems.every((item) => item.group_key === "weapons");
  const renderedItems = useMemo(
    () => renderedSections.flatMap((section) => section.items),
    [renderedSections]
  );
  const buildCardItem = useCallback((item: AccountItemSummary) => {
    const allSourceSummaries = item.group_key === "weapons"
      ? props.recommendationSummaryByInstance?.get(item.instance_id ?? `hash:${item.hash}`) ?? []
      : [];
    return {
      item,
      tagValue: props.tags.items[getVaultItemKey(item)]?.tag ?? "none",
      isLoadoutMatch: matchesLoadoutTemplateItem(item, props.highlightedItemKeys),
      sourceSummaries: allSourceSummaries.slice(0, 2),
      additionalSourceCount: Math.max(0, allSourceSummaries.length - 2)
    };
  }, [props.highlightedItemKeys, props.recommendationSummaryByInstance, props.tags]);
  const onSelectItemRef = useRef(props.onSelectItem);
  const onToggleSelectedRef = useRef(props.onToggleSelected);
  onSelectItemRef.current = props.onSelectItem;
  onToggleSelectedRef.current = props.onToggleSelected;
  const handleSelectItem = useCallback((item: AccountItemSummary) => onSelectItemRef.current(item), []);
  const handleToggleSelected = useCallback((item: AccountItemSummary) => onToggleSelectedRef.current(item), []);
  const renderCard = useCallback((item: AccountItemSummary, index: number) => {
    const { tagValue, isLoadoutMatch, sourceSummaries, additionalSourceCount } = buildCardItem(item);
    return (
      <VaultListItem
        item={item}
        key={`${item.hash}-${item.instance_id ?? ""}`}
        imagePriority={index < 40}
        tagValue={tagValue}
        isLoadoutMatch={isLoadoutMatch}
        sourceSummaries={sourceSummaries}
        additionalSourceCount={additionalSourceCount}
        isOrganizing={props.isOrganizing}
        isSelected={props.selectedKeys.has(getVaultItemKey(item))}
        isOpening={props.openingItemKey === getVaultItemKey(item)}
        onSelectItem={handleSelectItem}
        onToggleSelected={handleToggleSelected}
      />
    );
  }, [buildCardItem, handleSelectItem, handleToggleSelected, props.isOrganizing, props.openingItemKey, props.selectedKeys]);

  if (!props.sections.length) {
    return <p className="status-message status-neutral">{props.emptyMessage ?? "没有匹配的仓库物品。"}</p>;
  }

  return (
    <div className="vault-section-list">
      {!isWeaponOnly && totalItemCount > INITIAL_VAULT_RENDER_LIMIT ? (
        <div className="vault-render-limit-message">
          <span>{props.isSearchActive ? "搜索结果" : "当前范围"}先显示 {renderedItemCount} / {totalItemCount} 件，避免一次挂载全部装备。</span>
          {renderedItemCount < totalItemCount ? (
            <button
              data-ui-kind="button" data-control-variant="secondary"
              type="button"
              onClick={() => setVisibleItemLimit((current) => current + VAULT_RENDER_INCREMENT)}
            >
              加载更多
            </button>
          ) : null}
        </div>
      ) : null}
      {isWeaponOnly ? (
        <VaultVirtualWeaponGrid
          items={allItems}
          className="vault-card-grid-weapons"
          renderItem={renderCard}
        />
      ) : (
        <div className={`vault-card-grid ${vaultGridClass(renderedItems)}`}>
          {renderedItems.map(renderCard)}
        </div>
      )}
    </div>
  );
}

function vaultGridClass(items: AccountItemSummary[]): string {
  if (items.length && items.every((item) => item.group_key === "weapons")) return "vault-card-grid-weapons";
  if (items.length && items.every((item) => item.group_key === "armor")) return "vault-card-grid-armor";
  return "vault-card-grid-mixed";
}
