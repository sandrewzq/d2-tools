import type { AccountSummary, DimWishlist, LocalTargetRules, VaultTags } from "../api/client";
import { ItemDetailModal } from "../shared/components/ItemDetailModal";
import type { useItemDetailWorkspace } from "../shared/hooks/useItemDetailWorkspace";

type ItemDetailWorkspace = ReturnType<typeof useItemDetailWorkspace>;

export function HomePageItemDetailModal(props: {
  accountSummary: AccountSummary | null;
  aiSettingsEnableLightgg: boolean;
  importedWishlist: DimWishlist | null;
  itemDetail: ItemDetailWorkspace;
  isRunningItemAction: boolean;
  localTargetRules: LocalTargetRules;
  vaultTags: VaultTags;
}) {
  const itemDetail = props.itemDetail;

  return itemDetail.selectedItem ? (
    <ItemDetailModal
      accountSummary={props.accountSummary}
      aiSettingsEnableLightgg={props.aiSettingsEnableLightgg}
      communityRecommendations={itemDetail.communityRecommendations}
      importedWishlist={props.importedWishlist}
      localTargetRules={props.localTargetRules}
      isCommunityRecommendationsLoading={itemDetail.isCommunityRecommendationsLoading}
      isGeneratingItemAi={itemDetail.isGeneratingItemAi}
      isRunningItemAction={props.isRunningItemAction}
      itemAiError={itemDetail.itemAiError}
      itemAiResult={itemDetail.itemAiResult}
      itemNoteDraft={itemDetail.itemNoteDraft}
      itemNoteMessage={itemDetail.itemNoteMessage}
      itemShareMessage={itemDetail.itemShareMessage}
      sameNameItems={itemDetail.selectedSameNameItems}
      selectedActionCharacterId={itemDetail.selectedActionCharacterId}
      selectedItem={itemDetail.selectedItem}
      vaultTags={props.vaultTags}
      onApplySameNameBatchTags={(items, mode) => void itemDetail.applySameNameBatchTags(items, mode)}
      onApplySameNameCurrentKeepTags={(items, currentItemKey, mode) => void itemDetail.applySameNameCurrentKeepTags(items, currentItemKey, mode)}
      onClose={itemDetail.closeSelectedItemDetail}
      onCopyItemActionPlanText={(input) => void itemDetail.copyItemActionPlanText(input)}
      onCopySameNameLocator={(items) => void itemDetail.copySameNameLocator(items)}
      onCopySelectedItemChatGuide={() => void itemDetail.copySelectedItemChatGuide()}
      onCopySelectedItemSummary={() => void itemDetail.copySelectedItemSummary()}
      onCopyWishlistInsight={() => void itemDetail.copyWishlistInsight()}
      onGenerateItemAiAdvice={() => void itemDetail.generateItemAiAdvice()}
      onOpenBestSameNameItem={(items) => itemDetail.openBestSameNameItem(items)}
      onOpenItemDetail={(item, source) => void itemDetail.openItemDetail(item, source)}
      onRunItemWriteAction={(label, action) => void itemDetail.runItemWriteAction(label, action)}
      onSaveSelectedItemNote={() => void itemDetail.saveSelectedItemNote()}
      onSaveSelectedItemTag={(tag) => void itemDetail.saveSelectedItemTag(tag)}
      onSelectedActionCharacterIdChange={itemDetail.setSelectedActionCharacterId}
      onSetItemNoteDraft={itemDetail.setItemNoteDraft}
    />
  ) : null;
}
