import type {
  AccountSummary,
  DimWishlist,
  ItemActionPlanInput,
  ItemActionResult,
  ItemAiAdviceResult,
  VaultTags,
  VaultTagValue,
  WeaponRecommendation
} from "../../api/client";
import type {
  SameNameItemSummary,
  SelectedItemDetail,
  SelectedItemSource
} from "../hooks/useItemDetail";
import type { buildDuplicateGroupBatchTagPlan } from "../domain/vault/vaultCleanup";
import { ItemDetailActions } from "./item-detail/ItemDetailActions";
import { ItemDetailAi } from "./item-detail/ItemDetailAi";
import { ItemDetailCommunity } from "./item-detail/ItemDetailCommunity";
import { ItemDetailHeader } from "./item-detail/ItemDetailHeader";
import { ItemDetailPerks } from "./item-detail/ItemDetailPerks";
import { ItemDetailSameName } from "./item-detail/ItemDetailSameName";
import { ItemDetailStats } from "./item-detail/ItemDetailStats";

export type ItemDetailModalProps = {
  accountSummary: AccountSummary | null;
  aiSettingsEnableLightgg: boolean;
  communityRecommendations: WeaponRecommendation | null;
  importedWishlist: DimWishlist | null;
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
    <div className="modal-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="item-modal"
        role="dialog"
        aria-modal="true"
        aria-busy={selectedItem.is_detail_loading ? "true" : "false"}
        onClick={(event) => event.stopPropagation()}
      >
        <ItemDetailHeader selectedItem={selectedItem} onClose={props.onClose} />
        <ItemDetailStats selectedItem={selectedItem} />
        <ItemDetailPerks selectedItem={selectedItem} />
        <ItemDetailCommunity
          aiSettingsEnableLightgg={props.aiSettingsEnableLightgg}
          communityRecommendations={props.communityRecommendations}
          importedWishlist={props.importedWishlist}
          isCommunityRecommendationsLoading={props.isCommunityRecommendationsLoading}
          sameNameItems={props.sameNameItems}
          selectedItem={selectedItem}
          vaultTags={props.vaultTags}
          onApplySameNameCurrentKeepTags={props.onApplySameNameCurrentKeepTags}
          onCopySameNameLocator={props.onCopySameNameLocator}
          onCopyWishlistInsight={props.onCopyWishlistInsight}
          onOpenBestSameNameItem={props.onOpenBestSameNameItem}
          onSaveSelectedItemTag={props.onSaveSelectedItemTag}
        />
        <ItemDetailSameName
          sameNameItems={props.sameNameItems}
          selectedItem={selectedItem}
          vaultTags={props.vaultTags}
          onApplySameNameBatchTags={props.onApplySameNameBatchTags}
          onApplySameNameCurrentKeepTags={props.onApplySameNameCurrentKeepTags}
          onOpenBestSameNameItem={props.onOpenBestSameNameItem}
          onOpenItemDetail={props.onOpenItemDetail}
        />
        <ItemNotePanel
          itemNoteDraft={props.itemNoteDraft}
          itemNoteMessage={props.itemNoteMessage}
          onSaveSelectedItemNote={props.onSaveSelectedItemNote}
          onSetItemNoteDraft={props.onSetItemNoteDraft}
        />
        <ItemDetailActions
          accountSummary={props.accountSummary}
          isRunningItemAction={props.isRunningItemAction}
          selectedActionCharacterId={props.selectedActionCharacterId}
          selectedItem={selectedItem}
          onCopyItemActionPlanText={props.onCopyItemActionPlanText}
          onRunItemWriteAction={props.onRunItemWriteAction}
          onSelectedActionCharacterIdChange={props.onSelectedActionCharacterIdChange}
        />
        <ItemDetailAi
          isGeneratingItemAi={props.isGeneratingItemAi}
          itemAiError={props.itemAiError}
          itemAiResult={props.itemAiResult}
          itemShareMessage={props.itemShareMessage}
          onCopySelectedItemChatGuide={props.onCopySelectedItemChatGuide}
          onCopySelectedItemSummary={props.onCopySelectedItemSummary}
          onGenerateItemAiAdvice={props.onGenerateItemAiAdvice}
        />
      </section>
    </div>
  );
}

function ItemNotePanel(props: {
  itemNoteDraft: string;
  itemNoteMessage: string;
  onSaveSelectedItemNote: () => void;
  onSetItemNoteDraft: (value: string) => void;
}) {
  return (
    <section className="item-note-panel">
      <label htmlFor="item-note-draft">本地备注</label>
      <textarea
        id="item-note-draft"
        value={props.itemNoteDraft}
        onChange={(event) => props.onSetItemNoteDraft(event.target.value)}
        placeholder="例如：留给电猎清杂 / 等队友复查 PVP 手感 / 同名已有更好 roll"
        rows={3}
      />
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={props.onSaveSelectedItemNote}>
          保存备注
        </button>
        {props.itemNoteMessage ? <span className="muted-copy">{props.itemNoteMessage}</span> : null}
      </div>
    </section>
  );
}
