import { selectVaultPageModel } from "@d2-tools/app/vault";
import { ProductWorkspaceEmptyState, VaultPageContentView } from "@d2-tools/ui";
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
  locateRequest?: { hash: number; name: string; requestId: number } | null;
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
      <ProductWorkspaceEmptyState>
        <strong>{props.accountError ? "仓库读取失败" : props.isLoadingAccount ? "正在读取账号" : "还没有账号数据"}</strong>
        <span>{props.accountError || "先读取账号数据，然后查看完整仓库列表。"}</span>
        <button type="button" disabled={props.isLoadingAccount} onClick={props.onLoadAccount}>
          {props.isLoadingAccount ? "读取中..." : "刷新账号"}
        </button>
      </ProductWorkspaceEmptyState>
    );
  }

  const model = selectVaultPageModel({
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
        <VaultPageContentView
        items={model.vaultItems}
        vaultItemCount={model.vaultItemCount}
        highlightedItemKeys={model.activeLoadoutLookup}
        highlightedLabel={model.activeLoadoutName}
        tags={model.tags}
        openingItemKey={props.openingItemKey}
        locateRequest={props.locateRequest}
        onSaveTagBatch={props.onSaveTagBatch}
        cleanupActions={{
          characters: props.account.characters,
          currentCharacterId: model.currentCharacterId,
          currentCharacterLabel: model.currentCharacterLabel,
          writeActionsEnabled: props.writeActionsEnabled,
          onBatchUnlock: props.onBatchUnlock,
          onBatchTransferToCharacter: props.onBatchTransferToCharacter
        }}
        wishlist={model.wishlist}
        localTargetRules={model.targetRules}
        communityMatch={model.communityMatch}
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
  );
}
