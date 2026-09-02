import { useEffect, useMemo, useState } from "react";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { VaultItemInstanceMatchInfo } from "@d2-tools/core/community-perks";
import type { VaultTags } from "@d2-tools/core/vault/tags";
import type { LoadoutTemplateLookup } from "@d2-tools/app/loadouts";
import type { VaultSection } from "@d2-tools/app/vault";
import { MemoizedVaultListItem as VaultListItem } from "./VaultListItem.js";
import { getVaultItemKey } from "@d2-tools/app/vault";

export const INITIAL_VAULT_RENDER_LIMIT = 200;
const VAULT_RENDER_INCREMENT = 200;

export function VaultItemSections(props: {
  sections: VaultSection[];
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  tags: VaultTags;
  wishlist?: DimWishlist | null;
  localTargetRules?: LocalTargetRules | null;
  communityInstanceMatch?: Map<string, VaultItemInstanceMatchInfo>;
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
  const effectiveVisibleItemLimit = props.isSearchActive ? totalItemCount : visibleItemLimit;
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
  const renderedItems = renderedSections.flatMap((section) => section.items);

  if (!props.sections.length) {
    return <p className="status-message status-neutral">{props.emptyMessage ?? "没有匹配的仓库物品。"}</p>;
  }

  return (
    <div className="vault-section-list">
      {!props.isSearchActive && totalItemCount > INITIAL_VAULT_RENDER_LIMIT ? (
        <div className="vault-render-limit-message">
          <span>先显示 {renderedItemCount} / {totalItemCount} 件，减少筛选和标记时的界面延迟。</span>
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
      <div className="vault-card-grid">
        {renderedItems.map((item, index) => (
          <VaultListItem
            item={item}
            key={`${item.hash}-${item.instance_id ?? ""}`}
            imagePriority={index < 40}
            highlightedItemKeys={props.highlightedItemKeys}
            tags={props.tags}
            wishlist={props.wishlist}
            localTargetRules={props.localTargetRules}
            communityInstanceMatch={props.communityInstanceMatch?.get(item.instance_id ?? `hash:${item.hash}`)}
            isOrganizing={props.isOrganizing}
            isSelected={props.selectedKeys.has(getVaultItemKey(item))}
            isOpening={props.openingItemKey === getVaultItemKey(item)}
            onSelectItem={props.onSelectItem}
            onToggleSelected={props.onToggleSelected}
          />
        ))}
      </div>
    </div>
  );
}
