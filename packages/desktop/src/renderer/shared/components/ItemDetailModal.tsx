import type {
  AccountSummary,
  AccountItemDetail,
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
import { selectedItemToAccountItem, type ArmorDetailViewModel, type WeaponDetailViewModel } from "@d2-tools/app/items";
import { api } from "../../api/client";
import type { SameNameItemSummary, SelectedItemDetail, SelectedItemSource } from "../hooks/useItemDetail";
import type { buildDuplicateGroupBatchTagPlan } from "../domain/vault/vaultCleanup";
import { ArmorDetailContent, DetailInstanceActionPanel, SharedItemDetailDialog, WeaponDetailContent, type WeaponConfigurationWriteFeedback } from "@d2-tools/ui";
import { ItemDetailHeader } from "./item-detail/ItemDetailHeader";
import { ItemDetailStats } from "./item-detail/ItemDetailStats";
import { ItemDetailTools } from "./item-detail/ItemDetailTools";
import { resolveItemTransferCharacterId } from "../../utils/itemActions";
import {
  buildWeaponDetailView,
  buildWeaponPersonalTargetViews,
  buildWeaponRecommendationViews
} from "./item-detail/buildWeaponDetailView";
import { buildArmorDetailView } from "./item-detail/buildArmorDetailView";
import { formatVaultTagLabel } from "./item-detail/itemDetailFormatters";

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
    options?: {
      keepDetailOpen?: boolean;
      feedbackScope?: "global" | "detail";
      onProgress?: (phase: "submitting" | "refreshing", message: string) => void;
      verifyRefreshedItem?: (detail: AccountItemDetail) => boolean;
      refreshMismatchMessage?: string;
    }
  ) => Promise<{ ok: boolean; refreshed: boolean; message: string; cancelled?: boolean }>;
  onRefreshSelectedItemDetail: () => Promise<AccountItemDetail | null>;
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
  const [perkWriteFeedback, setPerkWriteFeedback] = useState<WeaponConfigurationWriteFeedback>({ status: "idle" });
  const [itemToolMessage, setItemToolMessage] = useState("");
  useEffect(() => {
    setPendingPerks({});
    setPerkWriteFeedback({ status: "idle" });
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
  const armorModel = buildArmorDetailView({
    selectedItem,
    sameNameItems: props.sameNameItems,
    localTargetRules: props.localTargetRules,
    sources: buildArmorSources(selectedItem, props.itemAvailability)
  });
  const instanceActions = selectedItem.instance_id ? (
    <ItemDetailInstanceActions
      props={props}
      selectedItem={selectedItem}
      itemToolMessage={itemToolMessage}
      setItemToolMessage={setItemToolMessage}
    />
  ) : undefined;

  return (
    <SharedItemDetailDialog
      detail={{ name: selectedItem.name, isBusy: selectedItem.is_detail_loading }}
      variant={weaponModel ? "weapon" : armorModel ? "armor" : "default"}
      subtitle={weaponModel
        ? `${weaponModel.context.entry_label} · ${weaponModel.context.object_label}`
        : armorModel
          ? `${armorModel.context.entry_label} · ${armorModel.context.object_label}`
          : undefined}
      objectContext={weaponModel
        ? (weaponModel.context.read_only ? "只读查看" : "可管理装备")
        : armorModel
          ? (armorModel.context.read_only ? "只读查看" : "可管理装备")
          : undefined}
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
                if (props.isRunningItemAction) return;
                setPerkWriteFeedback({ status: "idle" });
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
              cancelPendingPerks: () => {
                if (props.isRunningItemAction) return;
                setPendingPerks({});
                setPerkWriteFeedback({ status: "idle" });
              },
              applyPendingPerks: async () => {
                const changes = Object.entries(pendingPerks).map(([socketIndex, plugHash]) => ({
                  socketIndex: Number(socketIndex),
                  plugHash
                }));
                if (!changes.length || !selectedItem.instance_id || !props.selectedActionCharacterId) return;
                setPerkWriteFeedback({ status: "submitting", message: `正在提交 ${changes.length} 项 Perk 更改...` });
                const outcome = await props.onRunItemWriteAction("应用武器配置到", () => api.applySocketPlugs({
                  membership_type: props.accountSummary?.membership_type ?? 0,
                  character_id: selectedItem.source_character_id ?? props.selectedActionCharacterId,
                  item_id: selectedItem.instance_id ?? "",
                  item_name: selectedItem.name,
                  changes: changes.map((change) => ({
                    socket_index: change.socketIndex,
                    plug_hash: change.plugHash,
                    plug_name: selectedItem.sockets
                      ?.find((socket) => socket.socket_index === change.socketIndex)
                      ?.reusable_plugs.find((candidate) => candidate.hash === change.plugHash)?.name
                  }))
                }), {
                  keepDetailOpen: true,
                  feedbackScope: "detail",
                  onProgress: (phase, message) => setPerkWriteFeedback({ status: phase, message }),
                  verifyRefreshedItem: (detail) => hasAppliedPerkChanges(detail, changes),
                  refreshMismatchMessage: "Perk 已写入，但连续自动读取后 Bungie 仍返回旧配置。请稍后重新读取确认。"
                });
                if (outcome.cancelled) {
                  setPerkWriteFeedback({ status: "idle" });
                  return;
                }
                if (!outcome.ok) {
                  setPerkWriteFeedback({ status: "error", message: outcome.message });
                  return;
                }
                if (!outcome.refreshed) {
                  setPerkWriteFeedback({ status: "refresh-error", message: outcome.message });
                  return;
                }
                setPendingPerks({});
                setPerkWriteFeedback({ status: "success", message: outcome.message });
              },
              refreshConfiguration: async () => {
                const clearPendingAfterRefresh = perkWriteFeedback.status === "refresh-error";
                setPerkWriteFeedback({ status: "refreshing", message: "正在读取服务器当前配置..." });
                try {
                  const detail = await props.onRefreshSelectedItemDetail();
                  if (clearPendingAfterRefresh && (!detail || !hasAppliedPerkChanges(
                    detail,
                    Object.entries(pendingPerks).map(([socketIndex, plugHash]) => ({
                      socketIndex: Number(socketIndex),
                      plugHash
                    }))
                  ))) {
                    setPerkWriteFeedback({
                      status: "refresh-error",
                      message: "Bungie 返回的仍是旧配置，请稍后再次读取。"
                    });
                    return;
                  }
                  if (clearPendingAfterRefresh) setPendingPerks({});
                  setPerkWriteFeedback({ status: "success", message: "已读取服务器最新配置。" });
                } catch (error) {
                  setPerkWriteFeedback({
                    status: "refresh-error",
                    message: error instanceof Error ? error.message : "配置刷新失败，请稍后重试。"
                  });
                }
              }
            }}
            configurationWriteFeedback={perkWriteFeedback}
            instanceActions={instanceActions}
          />
        ) : armorModel ? (
          <ArmorDetailContent
            model={armorModel}
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
                    { label: "信息范围", value: "这件护甲、账号属性与当前推荐" }
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
              runAnalysis: (request) => props.onGenerateItemAiAdvice(request.prompt, request.allow_external_search)
            }}
            instanceActions={instanceActions}
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

function hasAppliedPerkChanges(
  detail: AccountItemDetail,
  changes: ReadonlyArray<{ socketIndex: number; plugHash: number }>
): boolean {
  return changes.every((change) => detail.sockets
    .find((socket) => socket.socket_index === change.socketIndex)
    ?.selected_plug?.hash === change.plugHash);
}

function ItemDetailInstanceActions(input: {
  props: ItemDetailModalProps;
  selectedItem: SelectedItemDetail;
  itemToolMessage: string;
  setItemToolMessage: (message: string) => void;
}) {
  const { props, selectedItem } = input;
  const [actionFeedback, setActionFeedback] = useState<{
    status: "idle" | "submitting" | "refreshing" | "success" | "error";
    message?: string;
  }>({ status: "idle" });

  useEffect(() => {
    setActionFeedback({ status: "idle" });
  }, [selectedItem.item_key]);

  const runDetailAction = async (label: string, action: () => Promise<ItemActionResult>) => {
    setActionFeedback({ status: "submitting", message: `${label}正在提交到 Bungie...` });
    try {
      const outcome = await props.onRunItemWriteAction(label, action, {
        keepDetailOpen: true,
        feedbackScope: "detail",
        onProgress: (phase, message) => setActionFeedback({ status: phase, message })
      });
      if (outcome.cancelled) {
        setActionFeedback({ status: "idle" });
        return;
      }
      setActionFeedback({
        status: outcome.ok && outcome.refreshed ? "success" : "error",
        message: outcome.message
      });
    } catch (error) {
      setActionFeedback({
        status: "error",
        message: error instanceof Error ? error.message : `${label}失败，请稍后重试。`
      });
    }
  };

  const characters = props.accountSummary?.characters ?? [];
  const targetCharacter = characters.find((character) => character.character_id === props.selectedActionCharacterId);
  const sourceCharacter = characters.find((character) => character.character_id === selectedItem.source_character_id);
  const localEntry = props.vaultTags.items[selectedItem.item_key]
    ?? (selectedItem.instance_id ? props.vaultTags.items[selectedItem.instance_id] : undefined);
  const currentTag = localEntry?.tag;
  const locationLabel = selectedItem.is_postmaster_item
    ? `${sourceCharacter?.class_name ?? "角色"}邮政官`
    : selectedItem.is_vault_item
      ? "仓库"
      : selectedItem.source_kind === "equipped"
        ? `${sourceCharacter?.class_name ?? "角色"}已装备`
        : `${sourceCharacter?.class_name ?? "角色"}背包`;
  const isAlreadyEquippedToTarget = selectedItem.source_kind === "equipped"
    && selectedItem.source_character_id === props.selectedActionCharacterId;

  const transferItem = () => api.transferItem({
    membership_type: props.accountSummary?.membership_type ?? 0,
    character_id: resolveItemTransferCharacterId({
      selectedCharacterId: props.selectedActionCharacterId,
      sourceCharacterId: selectedItem.source_character_id,
      sourceKind: selectedItem.source_kind,
      transferToVault: !selectedItem.is_vault_item
    }),
    item_id: selectedItem.instance_id ?? "",
    item_reference_hash: selectedItem.hash,
    item_name: selectedItem.name,
    transfer_to_vault: !selectedItem.is_vault_item
  });

  const copyTransferPlan = () => props.onCopyItemActionPlanText({
    action: "transfer",
    item_name: selectedItem.name,
    item_instance_id: selectedItem.instance_id,
    item_reference_hash: selectedItem.hash,
    character_id: selectedItem.is_vault_item
      ? props.selectedActionCharacterId
      : selectedItem.source_character_id ?? props.selectedActionCharacterId,
    transfer_to_vault: !selectedItem.is_vault_item
  });

  const primaryActions = selectedItem.is_postmaster_item
    ? [{
        key: "postmaster-pull",
        label: "取回到角色背包",
        primary: true,
        onClick: () => void runDetailAction("从邮政官取回", () => api.pullFromPostmaster({
          membership_type: props.accountSummary?.membership_type ?? 0,
          character_id: selectedItem.source_character_id ?? props.selectedActionCharacterId,
          item_id: selectedItem.instance_id ?? "",
          item_reference_hash: selectedItem.hash,
          item_name: selectedItem.name
        }))
      }]
    : [
        selectedItem.is_vault_item
          ? {
              key: "transfer-from-vault",
              label: `取出到${targetCharacter?.class_name ?? "角色"}`,
              primary: true,
              onClick: () => void runDetailAction("取出到角色", transferItem)
            }
          : {
              key: "equip",
              label: isAlreadyEquippedToTarget ? `已装备到${targetCharacter?.class_name ?? "角色"}` : `装备到${targetCharacter?.class_name ?? "角色"}`,
              primary: true,
              disabled: isAlreadyEquippedToTarget,
              onClick: () => void runDetailAction("装备到角色", () => api.equipItem({
                membership_type: props.accountSummary?.membership_type ?? 0,
                character_id: props.selectedActionCharacterId,
                item_id: selectedItem.instance_id ?? "",
                item_name: selectedItem.name
              }))
            },
        ...(selectedItem.is_vault_item
          ? [{ key: "copy-transfer", label: "复制转移计划", onClick: copyTransferPlan }]
          : [{
              key: "transfer-to-vault",
              label: "移入仓库",
              onClick: () => void runDetailAction("移入仓库", transferItem)
            }]),
        {
          key: "lock",
          label: selectedItem.locked ? "解锁" : "锁定",
          onClick: () => void runDetailAction(selectedItem.locked ? "解锁" : "锁定", () => api.setItemLockState({
            membership_type: props.accountSummary?.membership_type ?? 0,
            character_id: props.selectedActionCharacterId,
            item_id: selectedItem.instance_id ?? "",
            item_name: selectedItem.name,
            state: !selectedItem.locked
          }))
        }
      ];

  const addToLoadoutDraft = () => {
    const accountItem = selectedItemToAccountItem(selectedItem);
    const character = characters.find((candidate) => candidate.character_id === props.selectedActionCharacterId);
    if (!accountItem || !props.selectedActionCharacterId || !character) {
      input.setItemToolMessage("请先选择用于配装草稿的角色。");
      return;
    }
    void api.createLoadoutTemplate({
      name: `${selectedItem.name} 配装草稿`,
      character_id: props.selectedActionCharacterId,
      class_name: character.class_name,
      equipped_items: [accountItem]
    }).then(() => input.setItemToolMessage("已保存到配装草稿。"))
      .catch((error) => input.setItemToolMessage(error instanceof Error ? error.message : "配装草稿保存失败"));
  };

  return (
    <DetailInstanceActionPanel
      title={`${selectedItem.name} · ${selectedItem.instance_id?.slice(-4) ?? "实例"}`}
      subtitle={`${locationLabel} · ${selectedItem.power ?? "-"} 光等`}
      statusLabels={[
        selectedItem.source_kind === "equipped" ? "已装备" : "未装备",
        selectedItem.locked ? "已锁定" : "未锁定",
        currentTag ? formatVaultTagLabel(currentTag) : "未标记"
      ]}
      targetValue={props.selectedActionCharacterId}
      targetOptions={characters.map((character) => ({
        value: character.character_id,
        label: `${character.class_name} / 光等 ${character.light ?? "-"}`
      }))}
      disabled={props.isRunningItemAction}
      actions={primaryActions}
      tags={(["keep", "review", "farm", "loadout", "junk", "none"] as VaultTagValue[]).map((tag) => ({
        key: tag,
        label: tag === "none" ? "清除标记" : formatVaultTagLabel(tag),
        pressed: tag === "none" ? !currentTag : currentTag === tag,
        onClick: () => props.onSaveSelectedItemTag(tag)
      }))}
      note={props.itemNoteDraft}
      onTargetChange={props.onSelectedActionCharacterIdChange}
      onNoteChange={props.onSetItemNoteDraft}
      noteActions={[
        { key: "save-note", label: "保存备注", primary: true, onClick: props.onSaveSelectedItemNote },
        ...(!selectedItem.is_postmaster_item && !selectedItem.is_vault_item
          ? [{ key: "copy-transfer", label: "复制转移计划", onClick: copyTransferPlan }]
          : []),
        { key: "copy-summary", label: "复制结论", onClick: props.onCopySelectedItemSummary },
        { key: "copy-chat", label: "生成群聊说明", onClick: props.onCopySelectedItemChatGuide },
        { key: "loadout", label: "加入配装草稿", onClick: addToLoadoutDraft }
      ]}
      feedback={actionFeedback.status !== "idle" ? (
        <div
          className={`weapon-detail-operation-feedback is-${actionFeedback.status}`}
          role={actionFeedback.status === "error" ? "alert" : "status"}
          aria-live={actionFeedback.status === "error" ? "assertive" : "polite"}
          aria-busy={actionFeedback.status === "submitting" || actionFeedback.status === "refreshing"}
        >
          <span className="weapon-detail-write-indicator" aria-hidden="true" />
          <div>
            <strong>{actionFeedback.status === "submitting"
              ? "正在提交装备操作"
              : actionFeedback.status === "refreshing"
                ? "操作完成，正在刷新详情"
                : actionFeedback.status === "success"
                  ? "装备状态已更新"
                  : "装备操作未完成"}</strong>
            <p>{actionFeedback.message}</p>
          </div>
        </div>
      ) : undefined}
      messages={[props.itemNoteMessage, props.itemShareMessage, input.itemToolMessage]}
    />
  );
}

function buildArmorSources(
  item: SelectedItemDetail,
  availability: LiveItemAvailabilityEntry | null
): ArmorDetailViewModel["sources"] {
  const entries: ArmorDetailViewModel["sources"]["entries"] = [];
  for (const [index, source] of (availability?.sources ?? []).entries()) {
    entries.push({
      id: `live:${source.offer_id ?? `${source.kind}:${source.label}:${index}`}`,
      label: source.label,
      description: [
        availability?.description,
        source.inventory_path,
        ...(source.price_labels ?? []),
        ...(source.purchase_requirements ?? []),
        source.refresh_at ? `刷新时间：${source.refresh_at}` : undefined,
        ...(source.failure_messages ?? [])
      ].filter((part): part is string => Boolean(part?.trim())).join(" · ") || source.label,
      ...(source.can_purchase !== undefined ? { available_now: source.can_purchase } : {}),
      status_label: source.can_purchase === true
        ? "当前可购买"
        : source.can_purchase === false
          ? source.failure_messages?.join("；") || "当前不可购买"
          : "当前角色库存已检出"
    });
  }
  if (item.source.status === "ready") {
    entries.push({
      id: `source:${item.hash}:${item.source.source_hash ?? "hint"}`,
      label: item.source.label,
      description: item.source.description,
      status_label: "来源已记录"
    });
  }
  return {
    status: entries.length ? availability?.sources.length ? "ready" : "partial" : "unknown",
    entries
  };
}

function buildWeaponSources(
  item: SelectedItemDetail,
  availability: LiveItemAvailabilityEntry | null
): WeaponDetailViewModel["sources"] {
  const entries: WeaponDetailViewModel["sources"]["entries"] = [];
  for (const [index, source] of (availability?.sources ?? []).entries()) {
    const offer = source.kind === "public_activity" ? undefined : {
      offer_id: source.offer_id ?? `live:${source.vendor_hash ?? source.label}:${index}`,
      vendor_hash: source.vendor_hash,
      vendor_name: source.label,
      inventory_path: source.inventory_path,
      price_labels: source.price_labels ?? [],
      refresh_at: source.refresh_at,
      can_purchase: source.can_purchase,
      purchase_requirements: source.purchase_requirements ?? [],
      failure_messages: source.failure_messages ?? []
    };
    entries.push({
      id: `live:${source.offer_id ?? `${source.kind}:${source.label}:${index}`}`,
      kind: source.kind === "public_activity" ? "activity_reward" : "vendor_offer",
      label: source.label,
      description: availability?.description ?? source.label,
      available_now: true,
      offer
    });
  }
  if (!availability || availability.sources.length === 0) {
    entries.push({
      id: `live-status:${item.hash}`,
      kind: "live_status",
      label: availability?.label ?? "实时来源状态未返回",
      description: availability?.description ?? "当前详情未返回可确认的商人、活动或里程碑来源。",
      available_now: availability ? false : undefined
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
