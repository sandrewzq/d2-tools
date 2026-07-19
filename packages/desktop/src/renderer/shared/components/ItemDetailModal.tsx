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
import type { ItemSearchResult } from "../../api/types";
import type { LiveItemAvailabilityEntry } from "@d2-tools/core/items/liveAvailability";
import type {
  PersonalWeaponKnowledgeEntry,
  SavePersonalWeaponKnowledgeInput
} from "@d2-tools/core/community-perks/personalWeaponKnowledge";
import { useEffect, useState } from "react";
import { selectedItemToAccountItem, type WeaponDetailViewModel } from "@d2-tools/app/items";
import { api } from "../../api/client";
import type { SameNameItemSummary, SelectedItemDetail, SelectedItemSource } from "../hooks/useItemDetail";
import type { buildDuplicateGroupBatchTagPlan } from "../domain/vault/vaultCleanup";
import { SharedItemDetailDialog, WeaponDetailContent } from "@d2-tools/ui";
import { ItemDetailHeader } from "./item-detail/ItemDetailHeader";
import { ItemDetailStats } from "./item-detail/ItemDetailStats";
import { ItemDetailTools } from "./item-detail/ItemDetailTools";
import { ItemDetailActions } from "./item-detail/ItemDetailActions";
import {
  buildWeaponDetailView,
  buildWeaponPersonalTargetViews,
  buildWeaponRecommendationViews
} from "./item-detail/buildWeaponDetailView";

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
  itemAvailability: LiveItemAvailabilityEntry | null;
  itemVersions: ItemSearchResult[];
  personalWeaponKnowledge: PersonalWeaponKnowledgeEntry[];
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
  onGenerateItemAiAdvice: (userKnowledge?: string, allowExternalSearch?: boolean) => void;
  onOpenBestSameNameItem: (items: SameNameItemSummary[]) => void;
  onOpenItemDetail: (item: SameNameItemSummary | ItemSearchResult, source: SelectedItemSource) => void;
  onRunItemWriteAction: (
    label: string,
    action: () => Promise<ItemActionResult>,
    options?: { keepDetailOpen?: boolean }
  ) => void;
  onSaveSelectedItemNote: () => void;
  onSaveSelectedItemTag: (tag: VaultTagValue) => void;
  onSelectedActionCharacterIdChange: (id: string) => void;
  onSetItemNoteDraft: (value: string) => void;
  onSavePersonalWeaponKnowledge: (draft: SavePersonalWeaponKnowledgeInput["entry"]) => void;
  onSetPersonalWeaponKnowledgeEnabled: (id: string, enabled: boolean) => void;
  onDeletePersonalWeaponKnowledge: (id: string) => void;
};

export function ItemDetailModal(props: ItemDetailModalProps) {
  const selectedItem = props.selectedItem;
  const [pendingPerks, setPendingPerks] = useState<Record<number, number>>({});
  const [itemToolMessage, setItemToolMessage] = useState("");
  useEffect(() => {
    setPendingPerks({});
    setItemToolMessage("");
  }, [selectedItem.item_key]);
  const weaponModel = buildWeaponDetailView({
    selectedItem,
    accountSummary: props.accountSummary,
    sameNameItems: props.sameNameItems,
    recommendations: buildWeaponRecommendationViews(
      props.communityRecommendations,
      props.personalWeaponKnowledge,
      selectedItem
    ),
    personalTargets: buildWeaponPersonalTargetViews(props.communityRecommendations, selectedItem),
    vaultTags: props.vaultTags,
    pendingPerks,
    versions: props.itemVersions,
    sources: buildWeaponSources(selectedItem, props.itemAvailability)
  });

  return (
    <SharedItemDetailDialog
      detail={{ name: selectedItem.name, isBusy: selectedItem.is_detail_loading }}
      variant={weaponModel ? "weapon" : "default"}
      subtitle={weaponModel ? `${weaponModel.context.entry_label} · ${weaponModel.context.object_label}` : undefined}
      objectContext={weaponModel ? (weaponModel.context.read_only ? "只读查看" : "可管理实例") : undefined}
      closeLabel="关闭装备详情"
      onClose={props.onClose}
      sections={(
        weaponModel ? (
          <WeaponDetailContent
            model={weaponModel}
            personalKnowledge={props.personalWeaponKnowledge}
            analysis={{
              status: props.isGeneratingItemAi
                ? "running"
                : props.itemAiError
                  ? "error"
                  : props.itemAiResult?.ai
                    ? "ready"
                    : "idle",
              title: props.itemAiResult?.ai ? `${selectedItem.name}分析` : undefined,
              body: props.itemAiResult?.ai?.text,
              message: props.itemAiError || props.itemAiResult?.skipped_reason || undefined,
              evidence: props.itemAiResult?.ai
                ? [
                    { label: "模型", value: props.itemAiResult.ai.model },
                    { label: "知识范围", value: "当前对象、官方数据与本地知识库" }
                  ]
                : undefined,
              externalSources: props.itemAiResult?.ai?.external_search?.sources,
              externalSearchMessage: props.itemAiResult?.ai?.external_search?.message
            }}
            actions={{
              selectInstance: (instance) => {
                const item = props.sameNameItems.find((candidate) => candidate.instance_id === instance.instance_id);
                if (!item) return;
                props.onOpenItemDetail(item, {
                  source_character_id: item.source_character_id,
                  source_kind: item.source_kind,
                  is_vault_item: item.is_vault_item,
                  is_postmaster_item: item.is_postmaster_item
                });
              },
              selectVersion: (hash) => {
                const version = props.itemVersions.find((candidate) => candidate.hash === hash);
                if (version) props.onOpenItemDetail(version, {});
              },
              runAnalysis: (request) => props.onGenerateItemAiAdvice(request.prompt, request.allow_external_search),
              saveKnowledge: props.onSavePersonalWeaponKnowledge,
              setKnowledgeEnabled: props.onSetPersonalWeaponKnowledgeEnabled,
              deleteKnowledge: props.onDeletePersonalWeaponKnowledge,
              stagePerk: (column, perk) => {
                setPendingPerks((current) => {
                  const selected = column.candidates.find((candidate) => candidate.hash === perk.hash)?.selected;
                  const next = { ...current };
                  if (selected || next[column.socket_index] === perk.hash) {
                    delete next[column.socket_index];
                  } else {
                    next[column.socket_index] = perk.hash;
                  }
                  return next;
                });
              },
              cancelPendingPerks: () => setPendingPerks({}),
              applyPendingPerks: () => {
                const changes = Object.entries(pendingPerks).map(([socketIndex, plugHash]) => ({
                  socketIndex: Number(socketIndex),
                  plugHash
                }));
                if (!changes.length || !selectedItem.instance_id || !props.selectedActionCharacterId) return;
                props.onRunItemWriteAction("应用武器配置到", async () => {
                  for (const change of changes) {
                    const plug = selectedItem.sockets
                      ?.find((socket) => socket.socket_index === change.socketIndex)
                      ?.reusable_plugs.find((candidate) => candidate.hash === change.plugHash);
                    await api.insertSocketPlug({
                      membership_type: props.accountSummary?.membership_type ?? 0,
                      character_id: selectedItem.source_character_id ?? props.selectedActionCharacterId,
                      item_id: selectedItem.instance_id ?? "",
                      item_name: selectedItem.name,
                      socket_index: change.socketIndex,
                      plug_hash: change.plugHash,
                      plug_name: plug?.name
                    });
                    setPendingPerks((current) => {
                      const next = { ...current };
                      delete next[change.socketIndex];
                      return next;
                    });
                  }
                  return { ok: true, message: `已应用 ${changes.length} 个 Perk 更改。` };
                }, { keepDetailOpen: true });
              }
            }}
            instanceActions={selectedItem.instance_id ? (
              <>
                <ItemDetailActions
                  accountSummary={props.accountSummary}
                  isRunningItemAction={props.isRunningItemAction}
                  selectedActionCharacterId={props.selectedActionCharacterId}
                  selectedItem={selectedItem}
                  onCopyItemActionPlanText={props.onCopyItemActionPlanText}
                  onRunItemWriteAction={props.onRunItemWriteAction}
                  onSelectedActionCharacterIdChange={props.onSelectedActionCharacterIdChange}
                />
                <section className="item-action-panel weapon-detail-local-tools">
                  <div>
                    <h3>本地整理</h3>
                    <p>标记和备注只保存在本地，不会修改游戏内物品。</p>
                  </div>
                  <div className="button-row">
                    {(["keep", "review", "farm", "loadout", "junk", "none"] as VaultTagValue[]).map((tag) => (
                      <button key={tag} type="button" className="secondary-button" onClick={() => props.onSaveSelectedItemTag(tag)}>
                        {tag === "keep" ? "保留" : tag === "review" ? "关注" : tag === "farm" ? "待刷" : tag === "loadout" ? "配装用" : tag === "junk" ? "可清理" : "清除标记"}
                      </button>
                    ))}
                  </div>
                  <label className="compact-field">
                    本地备注
                    <textarea value={props.itemNoteDraft} onChange={(event) => props.onSetItemNoteDraft(event.target.value)} />
                  </label>
                  <div className="button-row">
                    <button type="button" className="secondary-button" onClick={props.onSaveSelectedItemNote}>保存备注</button>
                    <button type="button" className="secondary-button" onClick={props.onCopySelectedItemSummary}>复制结论</button>
                    <button type="button" className="secondary-button" onClick={props.onCopySelectedItemChatGuide}>生成群聊说明</button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        const accountItem = selectedItemToAccountItem(selectedItem);
                        const character = props.accountSummary?.characters.find((candidate) => candidate.character_id === props.selectedActionCharacterId);
                        if (!accountItem || !props.selectedActionCharacterId || !character) {
                          setItemToolMessage("请先选择用于配装草稿的角色。");
                          return;
                        }
                        void api.createLoadoutTemplate({
                          name: `${selectedItem.name} 配装草稿`,
                          character_id: props.selectedActionCharacterId,
                          class_name: character.class_name,
                          equipped_items: [accountItem]
                        }).then(() => setItemToolMessage("已保存到配装草稿。"))
                          .catch((error) => setItemToolMessage(error instanceof Error ? error.message : "配装草稿保存失败"));
                      }}
                    >加入配装草稿</button>
                  </div>
                  {props.itemNoteMessage ? <p className="status-message status-ready">{props.itemNoteMessage}</p> : null}
                  {props.itemShareMessage ? <p className="status-message status-ready">{props.itemShareMessage}</p> : null}
                  {itemToolMessage ? <p className="status-message status-ready">{itemToolMessage}</p> : null}
                </section>
              </>
            ) : undefined}
          />
        ) : (
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
        )
      )}
    />
  );
}

function buildWeaponSources(
  item: SelectedItemDetail,
  availability: LiveItemAvailabilityEntry | null
): WeaponDetailViewModel["sources"] {
  const entries: WeaponDetailViewModel["sources"]["entries"] = [];
  for (const [index, source] of (availability?.sources ?? []).entries()) {
    entries.push({
      id: `live:${source.kind}:${source.label}:${index}`,
      kind: source.kind === "public_activity" ? "activity_reward" : "vendor_offer",
      label: source.label,
      description: availability?.description ?? source.label,
      available_now: true
    });
  }
  if (item.source.status === "ready") {
    entries.push({
      id: `manifest:${item.hash}:${item.source.source_hash ?? "hint"}`,
      kind: "manifest_hint",
      label: item.source.label,
      description: item.source.description
    });
  }
  return {
    status: entries.length ? availability?.sources.length ? "ready" : "partial" : "unknown",
    entries
  };
}
