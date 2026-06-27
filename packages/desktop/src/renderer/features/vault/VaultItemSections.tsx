import { useEffect, useMemo, useState } from "react";
import type {
  AccountItemSummary,
  DimWishlist,
  LocalTargetRules,
  VaultItemMatchInfo,
  VaultTags,
  VaultTagValue
} from "../../api/client";
import type { LoadoutTemplateLookup } from "../../shared/domain/loadouts/loadoutLookup";
import { MemoizedVaultListItem as VaultListItem } from "./VaultListItem";
import type { VaultSection } from "./vaultFilters";
import { getVaultItemKey } from "./vaultSelection";

export const INITIAL_VAULT_RENDER_LIMIT = 120;
const VAULT_RENDER_INCREMENT = 120;

export function VaultItemSections(props: {
  sections: VaultSection[];
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  tags: VaultTags;
  wishlist?: DimWishlist | null;
  localTargetRules?: LocalTargetRules | null;
  communityMatch?: Map<number, VaultItemMatchInfo>;
  isOrganizing: boolean;
  selectedKeys: Set<string>;
  openingItemKey?: string;
  onOpenItem: (item: AccountItemSummary) => void;
  onSaveTag: (item: AccountItemSummary, tag: VaultTagValue) => void | Promise<void>;
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
  const renderedSections = useMemo(() => {
    let remaining = visibleItemLimit;
    return props.sections.flatMap((section) => {
      if (remaining <= 0) {
        return [];
      }
      const items = section.items.slice(0, remaining);
      remaining -= items.length;
      return items.length ? [{ ...section, items }] : [];
    });
  }, [props.sections, visibleItemLimit]);
  const renderedItemCount = Math.min(visibleItemLimit, totalItemCount);

  if (!props.sections.length) {
    return <p className="status-message status-neutral">没有匹配的仓库物品。</p>;
  }

  return (
    <div className="vault-section-list">
      {totalItemCount > INITIAL_VAULT_RENDER_LIMIT ? (
        <div className="vault-render-limit-message">
          <span>先显示 {renderedItemCount} / {totalItemCount} 件，减少筛选和标记时的界面延迟。</span>
          {renderedItemCount < totalItemCount ? (
            <button
              className="secondary-button"
              type="button"
              onClick={() => setVisibleItemLimit((current) => current + VAULT_RENDER_INCREMENT)}
            >
              加载更多
            </button>
          ) : null}
        </div>
      ) : null}
      {renderedSections.map((section) => (
        <section className="vault-slot-section" key={section.key}>
          <div className="vault-slot-heading">
            <h3>{section.label}</h3>
            <span>{section.count} 件</span>
          </div>
          <div className="vault-card-grid">
            {section.items.map((item) => (
              <VaultListItem
                item={item}
                key={`${item.hash}-${item.instance_id ?? ""}`}
                highlightedItemKeys={props.highlightedItemKeys}
                tags={props.tags}
                wishlist={props.wishlist}
                localTargetRules={props.localTargetRules}
                communityMatch={props.communityMatch?.get(item.hash)}
                isOrganizing={props.isOrganizing}
                isSelected={props.selectedKeys.has(getVaultItemKey(item))}
                openingItemKey={props.openingItemKey}
                onOpenItem={props.onOpenItem}
                onSaveTag={props.onSaveTag}
                onToggleSelected={props.onToggleSelected}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
