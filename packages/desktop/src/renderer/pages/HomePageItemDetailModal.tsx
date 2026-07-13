import type { AccountSummary, DimWishlist, LocalTargetRules, VaultTags } from "../api/types";
import { getLocaleCopy, LibraryDefinitionDialog } from "@d2-tools/ui";
import type { useVendorDefinitionDetail } from "../features/vendors/useVendorDefinitionDetail";
import { ItemDetailModal } from "../shared/components/ItemDetailModal";
import type { useItemDetailWorkspace } from "../shared/hooks/useItemDetailWorkspace";

type ItemDetailWorkspace = ReturnType<typeof useItemDetailWorkspace>;
type VendorDefinitionDetailWorkspace = ReturnType<typeof useVendorDefinitionDetail>;

export function HomePageItemDetailModal(props: {
  accountSummary: AccountSummary | null;
  aiSettingsEnableLightgg: boolean;
  importedWishlist: DimWishlist | null;
  interfaceLocale: "zh-CN" | "en-US";
  itemDetail: ItemDetailWorkspace;
  isRunningItemAction: boolean;
  localTargetRules: LocalTargetRules;
  vendorDefinitionDetail: VendorDefinitionDetailWorkspace;
  vaultTags: VaultTags;
}) {
  const itemDetail = props.itemDetail;
  const vendorDefinitionState = props.vendorDefinitionDetail.state;

  if (vendorDefinitionState) {
    return (
      <LibraryDefinitionDialog
        item={vendorDefinitionState.item}
        dropAccess="available"
        liveEntry={{
          status: "character_vendor",
          label: "当前商人售卖",
          description: `${vendorDefinitionState.context.vendorName}正在售卖该装备。`,
          sources: [{
            kind: "character_vendor",
            label: vendorDefinitionState.context.vendorName
          }]
        }}
        vendorContext={vendorDefinitionState.context}
        isBusy={vendorDefinitionState.isBusy}
        error={vendorDefinitionState.error}
        copy={getLocaleCopy(props.interfaceLocale).library}
        onClose={props.vendorDefinitionDetail.close}
      />
    );
  }

  return itemDetail.selectedItem ? (
    <ItemDetailModal
      accountSummary={props.accountSummary}
      aiSettingsEnableLightgg={props.aiSettingsEnableLightgg}
      communityRecommendations={itemDetail.communityRecommendations}
      communityRecommendationError={itemDetail.communityRecommendationError}
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
