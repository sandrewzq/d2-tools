import type {
  AccountItemSummary,
  DimWishlist,
  LocalTargetRules,
  VaultItemMatchInfo,
  VaultTags,
  VaultTagValue
} from "../../api/client";
import type { LoadoutTemplateLookup } from "../../shared/domain/loadouts/loadoutLookup";
import { VaultListItem } from "./VaultListItem";
import type { VaultSection } from "./vaultFilters";
import { getVaultItemKey } from "./vaultSelection";

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
  if (!props.sections.length) {
    return <p className="notice">没有匹配的仓库物品。</p>;
  }

  return (
    <div className="vault-section-list">
      {props.sections.map((section) => (
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
