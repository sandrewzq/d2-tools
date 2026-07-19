import type { AccountSummary, DimWishlist, LocalTargetRules, VaultTags } from "../api/types";
import type { WeaponStatKey, WeaponStatSummary } from "@d2-tools/core/account/summary";
import { getLocaleCopy, LibraryDefinitionDialog, SharedItemDetailDialog, WeaponDetailContent } from "@d2-tools/ui";
import { buildLibraryDefinitionDetailView, buildLibraryOwnership } from "@d2-tools/app/library";
import { collectSelectedSameNameItems, createSelectedItemPreview, type WeaponDetailSources } from "@d2-tools/app/items";
import type { useVendorDefinitionDetail } from "../features/vendors/useVendorDefinitionDetail";
import { ItemDetailModal } from "../shared/components/ItemDetailModal";
import {
  buildWeaponDetailView,
  buildWeaponPersonalTargetViews,
  buildWeaponRecommendationViews
} from "../shared/components/item-detail/buildWeaponDetailView";
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
  onLocateOwnedItem: (item: { hash: number; name: string }) => void;
  vendorDefinitionDetail: VendorDefinitionDetailWorkspace;
  vaultTags: VaultTags;
}) {
  const itemDetail = props.itemDetail;
  const vendorDefinitionState = props.vendorDefinitionDetail.state;

  if (vendorDefinitionState) {
    const vendorSelectedItem = {
      ...createSelectedItemPreview(vendorDefinitionState.item, {}),
      socket_plugs: (vendorDefinitionState.offerItem.socketPlugs ?? []).map((plug) => ({
          hash: plug.hash,
          name: plug.name,
          icon: plug.iconUrl,
          description: plug.description,
          category_identifier: plug.categoryIdentifier,
          stat_modifiers: plug.statModifiers,
          item_type: plug.itemType
      })),
      is_detail_loading: vendorDefinitionState.isBusy
    };
    const vendorSameNameItems = collectSelectedSameNameItems(props.accountSummary, vendorSelectedItem);
    const vendorWeaponModel = buildWeaponDetailView({
      selectedItem: vendorSelectedItem,
      accountSummary: props.accountSummary,
      vaultTags: props.vaultTags,
      context: {
        kind: "vendor_offer",
        entry: "vendor",
        entry_label: "商人",
        object_label: "商人 Offer",
        object_id: vendorDefinitionState.offerItem.id,
        read_only: true
      },
      sources: buildVendorWeaponSources(vendorDefinitionState),
      selectionNames: vendorDefinitionState.context.rollLabels,
      currentStats: buildVendorWeaponStats(vendorDefinitionState.context.stats),
      sameNameItems: vendorSameNameItems,
      recommendations: buildWeaponRecommendationViews(
        vendorDefinitionState.recommendations ?? null,
        vendorDefinitionState.personalKnowledge,
        vendorSelectedItem
      ),
      personalTargets: buildWeaponPersonalTargetViews(
        vendorDefinitionState.recommendations ?? null,
        vendorSelectedItem
      )
    });
    if (vendorWeaponModel) {
      return (
        <SharedItemDetailDialog
          detail={{ name: vendorWeaponModel.identity.name, isBusy: vendorDefinitionState.isBusy }}
          variant="weapon"
          subtitle={`${vendorWeaponModel.context.entry_label} · ${vendorWeaponModel.context.object_label}`}
          objectContext={vendorWeaponModel.context.read_only ? "只读查看" : "可管理实例"}
          closeLabel="关闭武器详情"
          onClose={props.vendorDefinitionDetail.close}
          sections={(
            <>
              {vendorDefinitionState.error ? (
                <p className="status-message status-error" role="status">{vendorDefinitionState.error}</p>
              ) : null}
              <WeaponDetailContent
                model={vendorWeaponModel}
                personalKnowledge={vendorDefinitionState.personalKnowledge}
                analysis={{
                  status: vendorDefinitionState.isGeneratingAi
                    ? "running"
                    : vendorDefinitionState.aiError
                      ? "error"
                      : vendorDefinitionState.aiResult?.ai
                        ? "ready"
                        : "idle",
                  title: vendorDefinitionState.aiResult?.ai ? `${vendorWeaponModel.identity.name}售卖分析` : undefined,
                  body: vendorDefinitionState.aiResult?.ai?.text,
                  message: vendorDefinitionState.aiError || vendorDefinitionState.aiResult?.skipped_reason,
                  externalSources: vendorDefinitionState.aiResult?.ai?.external_search?.sources,
                  externalSearchMessage: vendorDefinitionState.aiResult?.ai?.external_search?.message
                }}
                actions={{
                  selectInstance: (instance) => {
                    const item = vendorSameNameItems.find((candidate) => candidate.instance_id === instance.instance_id);
                    if (!item) return;
                    props.vendorDefinitionDetail.close();
                    void props.itemDetail.openItemDetail(item, {
                      source_character_id: item.source_character_id,
                      source_kind: item.source_kind,
                      is_vault_item: item.is_vault_item,
                      is_postmaster_item: item.is_postmaster_item
                    });
                  },
                  runAnalysis: (request) => void props.vendorDefinitionDetail.generateAi(request.prompt, request.allow_external_search),
                  saveKnowledge: (draft) => void props.vendorDefinitionDetail.saveKnowledge(draft),
                  setKnowledgeEnabled: (id, enabled) => void props.vendorDefinitionDetail.setKnowledgeEnabled(id, enabled),
                  deleteKnowledge: (id) => void props.vendorDefinitionDetail.deleteKnowledge(id)
                }}
              />
            </>
          )}
        />
      );
    }

    const ownership = buildLibraryOwnership(props.accountSummary).get(vendorDefinitionState.item.hash);
    const detail = buildLibraryDefinitionDetailView({
      item: vendorDefinitionState.item,
      liveEntry: vendorDefinitionState.liveEntry,
      communityMatch: vendorDefinitionState.communityMatch,
      ownership,
      ownershipAvailable: Boolean(props.accountSummary)
    });
    return (
      <LibraryDefinitionDialog
        item={detail.item}
        dropAccess={detail.dropAccess}
        liveEntry={detail.liveEntry}
        acquisitionStatus={detail.acquisitionStatus}
        ownership={detail.ownership}
        communityMatch={detail.communityMatch}
        vendorContext={vendorDefinitionState.context}
        isBusy={vendorDefinitionState.isBusy}
        error={vendorDefinitionState.error}
        copy={getLocaleCopy(props.interfaceLocale).library}
        onClose={props.vendorDefinitionDetail.close}
        onLocateOwnedItem={detail.ownership.vaultCount > 0
          ? () => props.onLocateOwnedItem(detail.item)
          : undefined}
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
      itemAvailability={itemDetail.selectedItemAvailability}
      itemVersions={itemDetail.selectedItemVersions}
      personalWeaponKnowledge={itemDetail.personalWeaponKnowledge}
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
      onGenerateItemAiAdvice={(userKnowledge, allowExternalSearch) => void itemDetail.generateItemAiAdvice(userKnowledge, allowExternalSearch)}
      onOpenBestSameNameItem={(items) => itemDetail.openBestSameNameItem(items)}
      onOpenItemDetail={(item, source) => void itemDetail.openItemDetail(item, source)}
      onRunItemWriteAction={(label, action, options) => void itemDetail.runItemWriteAction(label, action, options)}
      onSaveSelectedItemNote={() => void itemDetail.saveSelectedItemNote()}
      onSaveSelectedItemTag={(tag) => void itemDetail.saveSelectedItemTag(tag)}
      onSelectedActionCharacterIdChange={itemDetail.setSelectedActionCharacterId}
      onSetItemNoteDraft={itemDetail.setItemNoteDraft}
      onSavePersonalWeaponKnowledge={(draft) => void itemDetail.saveConfirmedPersonalWeaponKnowledge(draft)}
      onSetPersonalWeaponKnowledgeEnabled={(id, enabled) => void itemDetail.setPersonalWeaponKnowledgeEnabled(id, enabled)}
      onDeletePersonalWeaponKnowledge={(id) => void itemDetail.deletePersonalWeaponKnowledge(id)}
    />
  ) : null;
}

function buildVendorWeaponSources(
  state: NonNullable<VendorDefinitionDetailWorkspace["state"]>
): WeaponDetailSources {
  const entries: WeaponDetailSources["entries"] = [{
    id: `vendor:${state.context.vendorName}:${state.item.hash}`,
    kind: "vendor_offer",
    label: state.context.vendorName,
    description: [
      state.context.costLabel,
      state.context.affordabilityLabel,
      state.context.characterLabel,
      state.context.refreshLabel
    ].filter(Boolean).join(" · "),
    available_now: true,
    offer: {
      offer_id: state.offerItem.id,
      vendor_hash: state.offerItem.vendorHash,
      vendor_name: state.context.vendorName,
      inventory_path: state.context.inventoryPath ?? state.offerItem.sourcePath,
      price_labels: (state.offerItem.costs ?? []).map((cost) => `${cost.required} ${cost.label}`),
      refresh_at: state.context.refreshLabel,
      can_purchase: state.offerItem.canPurchase,
      purchase_requirements: state.context.purchaseRequirements ?? [],
      failure_messages: state.offerItem.failureMessages ?? []
    }
  }];

  for (const [index, source] of (state.liveEntry?.sources ?? []).entries()) {
    if (entries.some((entry) => entry.label === source.label)) continue;
    entries.push({
      id: `live:${source.kind}:${index}:${source.label}`,
      kind: source.kind === "public_activity" ? "activity_reward" : "vendor_offer",
      label: source.label,
      description: state.liveEntry?.description ?? state.context.vendorName,
      available_now: true
    });
  }

  if (state.item.source.status === "ready") {
    entries.push({
      id: `manifest:${state.item.hash}`,
      kind: "manifest_hint",
      label: state.item.source.label,
      description: state.item.source.description
    });
  }

  return { status: "ready", entries };
}

function buildVendorWeaponStats(stats: Record<string, number> | undefined): WeaponStatSummary | undefined {
  if (!stats) return undefined;
  const result: WeaponStatSummary = {};
  for (const [label, value] of Object.entries(stats)) {
    const key = vendorStatKeys[label.trim().toLowerCase()] ?? vendorStatHashKeys[Number(label)];
    if (key) result[key] = value;
  }
  return Object.keys(result).length ? result : undefined;
}

const vendorStatKeys: Record<string, WeaponStatKey> = {
  "伤害": "impact",
  impact: "impact",
  "射程": "range",
  range: "range",
  "稳定性": "stability",
  stability: "stability",
  "操控性": "handling",
  handling: "handling",
  "装填速度": "reload_speed",
  "换弹速度": "reload_speed",
  "reload speed": "reload_speed",
  "弹匣": "magazine",
  magazine: "magazine",
  "射速": "rounds_per_minute",
  rpm: "rounds_per_minute",
  "蓄力时间": "charge_time",
  "charge time": "charge_time",
  "拉弓时间": "draw_time",
  "draw time": "draw_time",
  "后坐方向": "recoil_direction",
  "recoil direction": "recoil_direction"
};

const vendorStatHashKeys: Partial<Record<number, WeaponStatKey>> = {
  4043523819: "impact",
  1240592695: "range",
  155624089: "stability",
  943549884: "handling",
  4188031367: "reload_speed",
  3871231066: "magazine",
  4284893193: "rounds_per_minute",
  2961396640: "charge_time",
  447667954: "draw_time",
  2714457168: "recoil_direction"
};
