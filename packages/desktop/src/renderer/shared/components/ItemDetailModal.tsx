import type {
  AccountSummary,
  DimWishlist,
  ItemActionPlanInput,
  ItemActionResult,
  ItemAiAdviceResult,
  LocalTargetRules,
  VaultTags,
  VaultTagValue,
  WeaponRecommendation
} from "../../api/types";
import type { SameNameItemSummary, SelectedItemDetail, SelectedItemSource } from "../hooks/useItemDetail";
import type { buildDuplicateGroupBatchTagPlan } from "../domain/vault/vaultCleanup";
import { SharedItemDetailDialog } from "@d2-tools/ui";
import { ItemDetailHeader } from "./item-detail/ItemDetailHeader";
import { ItemDetailStats } from "./item-detail/ItemDetailStats";
import { ItemDetailTools } from "./item-detail/ItemDetailTools";

export type ItemDetailModalProps = {
  accountSummary: AccountSummary | null;
  aiSettingsEnableLightgg: boolean;
  communityRecommendations: WeaponRecommendation | null;
  communityRecommendationError: string;
  importedWishlist: DimWishlist | null;
  localTargetRules: LocalTargetRules;
  isCommunityRecommendationsLoading: boolean;
  isGeneratingItemAi: boolean;
  isRunningItemAction: boolean;
  itemAiError: string;
  itemAiResult: ItemAiAdviceResult | null;
  itemNoteDraft: string;
  itemNoteMessage: string;
  itemShareMessage: string;
  sameNameItems: SameNameItemSummary[];
  selectedActionCharacterId: string;
  selectedItem: SelectedItemDetail;
  vaultTags: VaultTags;
  onApplySameNameBatchTags: (
    items: SameNameItemSummary[],
    mode: Parameters<typeof buildDuplicateGroupBatchTagPlan>[1]
  ) => void;
  onApplySameNameCurrentKeepTags: (
    items: SameNameItemSummary[],
    currentItemKey: string,
    mode: "keep-current-review-rest" | "keep-current-junk-rest"
  ) => void;
  onClose: () => void;
  onCopyItemActionPlanText: (input: ItemActionPlanInput) => void;
  onCopySameNameLocator: (items: SameNameItemSummary[]) => void;
  onCopySelectedItemChatGuide: () => void;
  onCopySelectedItemSummary: () => void;
  onCopyWishlistInsight: () => void;
  onGenerateItemAiAdvice: () => void;
  onOpenBestSameNameItem: (items: SameNameItemSummary[]) => void;
  onOpenItemDetail: (item: SameNameItemSummary, source: SelectedItemSource) => void;
  onRunItemWriteAction: (label: string, action: () => Promise<ItemActionResult>) => void;
  onSaveSelectedItemNote: () => void;
  onSaveSelectedItemTag: (tag: VaultTagValue) => void;
  onSelectedActionCharacterIdChange: (id: string) => void;
  onSetItemNoteDraft: (value: string) => void;
};

export function ItemDetailModal(props: ItemDetailModalProps) {
  const selectedItem = props.selectedItem;

  return (
    <SharedItemDetailDialog
      detail={{ name: selectedItem.name, isBusy: selectedItem.is_detail_loading }}
      closeLabel="关闭装备详情"
      onClose={props.onClose}
      sections={(
        <>
        <section className="item-detail-game-card">
          <ItemDetailHeader selectedItem={selectedItem} onClose={props.onClose} showClose={false} />
          <ItemDetailStats selectedItem={selectedItem} />
        </section>

        <ItemDetailTools
          accountSummary={props.accountSummary}
          aiSettingsEnableLightgg={props.aiSettingsEnableLightgg}
          communityRecommendations={props.communityRecommendations}
          communityRecommendationError={props.communityRecommendationError}
          importedWishlist={props.importedWishlist}
          localTargetRules={props.localTargetRules}
          isCommunityRecommendationsLoading={props.isCommunityRecommendationsLoading}
          isGeneratingItemAi={props.isGeneratingItemAi}
          isRunningItemAction={props.isRunningItemAction}
          itemAiError={props.itemAiError}
          itemAiResult={props.itemAiResult}
          itemNoteDraft={props.itemNoteDraft}
          itemNoteMessage={props.itemNoteMessage}
          itemShareMessage={props.itemShareMessage}
          sameNameItems={props.sameNameItems}
          selectedActionCharacterId={props.selectedActionCharacterId}
          selectedItem={selectedItem}
          vaultTags={props.vaultTags}
          onApplySameNameBatchTags={props.onApplySameNameBatchTags}
          onApplySameNameCurrentKeepTags={props.onApplySameNameCurrentKeepTags}
          onCopyItemActionPlanText={props.onCopyItemActionPlanText}
          onCopySameNameLocator={props.onCopySameNameLocator}
          onCopySelectedItemChatGuide={props.onCopySelectedItemChatGuide}
          onCopySelectedItemSummary={props.onCopySelectedItemSummary}
          onCopyWishlistInsight={props.onCopyWishlistInsight}
          onGenerateItemAiAdvice={props.onGenerateItemAiAdvice}
          onOpenBestSameNameItem={props.onOpenBestSameNameItem}
          onOpenItemDetail={props.onOpenItemDetail}
          onRunItemWriteAction={props.onRunItemWriteAction}
          onSaveSelectedItemNote={props.onSaveSelectedItemNote}
          onSaveSelectedItemTag={props.onSaveSelectedItemTag}
          onSelectedActionCharacterIdChange={props.onSelectedActionCharacterIdChange}
          onSetItemNoteDraft={props.onSetItemNoteDraft}
        />
        </>
      )}
    />
  );
}
