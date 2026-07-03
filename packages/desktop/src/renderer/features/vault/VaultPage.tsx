import { createVaultPageWorkspace } from "@d2-tools/app";
import { VaultPageContentView, VaultPageView } from "@d2-tools/ui";
import { useState } from "react";
import type { LoadoutTemplateLookup } from "../../shared/domain/loadouts/loadoutLookup";
import type {
  AccountItemSummary,
  AccountSummary,
  BatchItemActionResult,
  DimWishlist,
  LocalTargetRules,
  LocalCommunityRecommendationTable,
  SaveVaultTagInput,
  VaultItemMatchInfo,
  VaultTags,
  VaultTagValue
} from "../../api/types";
import { api } from "../../api/client";
import { services } from "../../api/services";

export function VaultPage(props: {
  account: AccountSummary | null;
  isLoadingAccount: boolean;
  accountError: string;
  activeLoadoutLookup: LoadoutTemplateLookup | null;
  activeLoadoutName?: string;
  selectedCharacterId: string;
  writeActionsEnabled: boolean;
  tags: VaultTags;
  openingItemKey: string;
  wishlist: DimWishlist | null;
  localTargetRules: LocalTargetRules;
  communityMatch: Map<number, VaultItemMatchInfo>;
  onContextFactsChange?: (facts: string[]) => void;
  onWishlistChanged: (wishlist: DimWishlist | null) => void;
  onLocalTargetRulesChanged: (rules: LocalTargetRules) => void;
  onLoadAccount: () => void;
  onSaveTagBatch: (inputs: SaveVaultTagInput[]) => void | Promise<void>;
  onBatchUnlock: (items: AccountItemSummary[], targetCharacterId: string) => Promise<string>;
  onBatchTransferToCharacter: (items: AccountItemSummary[], targetCharacterId: string) => Promise<BatchItemActionResult>;
  onOpenItem: (item: AccountItemSummary) => void;
  onSaveTag: (item: AccountItemSummary, tag: VaultTagValue) => void | Promise<void>;
}) {
  const [localCommunityTable, setLocalCommunityTable] = useState<LocalCommunityRecommendationTable | null>(null);

  if (!props.account) {
    return (
      <VaultPageView
        accountReady={false}
        accountError={props.accountError}
        isLoadingAccount={props.isLoadingAccount}
        onLoadAccount={props.onLoadAccount}
      />
    );
  }

  const workspace = createVaultPageWorkspace({
    account: props.account,
    selectedCharacterId: props.selectedCharacterId,
    activeLoadoutLookup: props.activeLoadoutLookup,
    activeLoadoutName: props.activeLoadoutName,
    tags: props.tags,
    targetRules: props.localTargetRules,
    wishlist: props.wishlist,
    communityMatch: props.communityMatch
  });

  return (
    <VaultPageView accountReady>
      <VaultPageContentView
        items={workspace.vaultItems}
        highlightedItemKeys={workspace.activeLoadoutLookup}
        highlightedLabel={workspace.activeLoadoutName}
        tags={workspace.tags}
        openingItemKey={props.openingItemKey}
        onSaveTagBatch={props.onSaveTagBatch}
        cleanupActions={{
          characters: props.account.characters,
          currentCharacterId: workspace.currentCharacterId,
          currentCharacterLabel: workspace.currentCharacterLabel,
          writeActionsEnabled: props.writeActionsEnabled,
          onBatchUnlock: props.onBatchUnlock,
          onBatchTransferToCharacter: props.onBatchTransferToCharacter
        }}
        wishlist={workspace.wishlist}
        localTargetRules={workspace.targetRules}
        communityMatch={workspace.communityMatch}
        recommendationImportActions={{
          localCommunityTable,
          onSaveWishlist: async (wishlist) => {
            const saved = await services.localData.saveDimWishlist(wishlist);
            props.onWishlistChanged(saved);
            return saved;
          },
          onClearWishlist: async () => {
            await services.localData.clearDimWishlist();
            props.onWishlistChanged(null);
          },
          onSaveLocalCommunity: async (table) => {
            const saved = await services.localData.saveLocalCommunityRecommendations(table);
            setLocalCommunityTable(saved);
            return saved;
          },
          onClearLocalCommunity: async () => {
            await services.localData.clearLocalCommunityRecommendations();
            setLocalCommunityTable(null);
          }
        }}
        targetRulesActions={{
          onSaveRules: async (rules) => {
            const saved = await services.localData.saveLocalTargetRules(rules);
            props.onLocalTargetRulesChanged(saved);
            return saved;
          },
          onClearRules: async () => {
            const cleared = await services.localData.clearLocalTargetRules();
            props.onLocalTargetRulesChanged(cleared);
            return cleared;
          },
          onSearchPerks: (query) => api.searchPerks(query)
        }}
        onContextFactsChange={props.onContextFactsChange}
        onOpenItem={props.onOpenItem}
        onSaveTag={props.onSaveTag}
      />
    </VaultPageView>
  );
}
