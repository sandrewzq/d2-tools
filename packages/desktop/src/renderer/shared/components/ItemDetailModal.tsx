import type {
  AccountItemActionPatch,
  AccountItemSummary,
  AccountSummary,
  AccountItemDetail,
  EquipmentTargetStore,
  ItemActionPlanInput,
  ItemActionResult,
  ItemAiAdviceResult,
  LocalTargetRules,
  VaultItemInstanceMatchInfo,
  VaultTags,
  VaultTagValue,
  WeaponRecommendation
} from "../../api/types";
import type { AccountOperationFeedbackView } from "@d2-tools/app/account";
import type { VaultRecommendationScanState } from "@d2-tools/app/account";
import type { ItemSearchResult } from "../../api/types";
import type { LiveItemAvailabilityEntry } from "@d2-tools/core/items/liveAvailability";
import {
  acceptedSocketPlugsReflected,
  summarizeAcceptedSocketPlugs,
  type AcceptedSocketPlugChange
} from "@d2-tools/core/account/summary";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getItemKey, selectedItemToAccountItem, type ArmorDetailViewModel, type WeaponDetailViewModel } from "@d2-tools/app/items";
import { api } from "../../api/client";
import type { SameNameItemSummary, SelectedItemDetail, SelectedItemSource } from "../hooks/useItemDetail";
import { createWriteActionOperationId, type ItemWriteActionOptions, type ItemWriteActionOutcome } from "../hooks/useItemDetailWorkspace";
import type { buildDuplicateGroupBatchTagPlan } from "../domain/vault/vaultCleanup";
import { ArmorDetailContent, DetailInstanceActionPanel, SharedItemDetailDialog, SharedItemDetailLoading, WeaponDetailContent, type WeaponConfigurationWriteFeedback } from "@d2-tools/ui";
import { ItemDetailHeader } from "./item-detail/ItemDetailHeader";
import { ItemDetailStats } from "./item-detail/ItemDetailStats";
import { ItemDetailTools } from "./item-detail/ItemDetailTools";
import { resolveItemTransferCharacterId } from "../../utils/itemActions";
import {
  buildWeaponDetailView,
  buildWeaponRecommendationViews
} from "./item-detail/buildWeaponDetailView";
import { buildArmorDetailView } from "./item-detail/buildArmorDetailView";
import { formatVaultTagLabel } from "./item-detail/itemDetailFormatters";
import { resolveAccountItemViewLocation } from "../domain/account/itemActionState";
import { completeRendererPerformanceInteraction } from "../performance/rendererPerformanceDiagnostics";

type ItemDetailReadyProps = {
  accountSummary: AccountSummary | null;
  accountOperationFeedback?: AccountOperationFeedbackView;
  communityRecommendations: WeaponRecommendation | null;
  communityRecommendationError: string;
  communityInstanceMatch?: VaultItemInstanceMatchInfo;
  recommendationScan: VaultRecommendationScanState;
  localTargetRules: LocalTargetRules;
  equipmentTargetStore: EquipmentTargetStore;
  isCommunityRecommendationsLoading: boolean;
  isGeneratingItemAi: boolean;
  isRunningItemAction: boolean;
  itemActionMessage?: string;
  itemAiError: string;
  itemAiResult: ItemAiAdviceResult | null;
  itemNoteDraft: string;
  itemNoteMessage: string;
  itemShareMessage: string;
  itemAvailability: LiveItemAvailabilityEntry | null;
  itemVersions: ItemSearchResult[];
  isItemVersionsLoading: boolean;
  sameNameItems: SameNameItemSummary[];
  selectedActionCharacterId: string;
  selectedItem: SelectedItemDetail;
  itemDetailError?: string;
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
  onCopyTargetInsight: () => void;
  onGenerateItemAiAdvice: (userKnowledge?: string, allowExternalSearch?: boolean) => void;
  onOpenBestSameNameItem: (items: SameNameItemSummary[]) => void;
  onOpenItemDetail: (item: SameNameItemSummary | ItemSearchResult, source: SelectedItemSource) => void;
  onRunItemWriteAction: (
    label: string,
    action: () => Promise<ItemActionResult>,
    options?: ItemWriteActionOptions
  ) => Promise<ItemWriteActionOutcome>;
  onLoadSelectedItemFullDetail: () => Promise<void>;
  /** 只补读物品定义（不读完整实例 Roll、不动整份详情的加载态）；给「固有能力」这类只能来自定义的格子用。 */
  onLoadSelectedItemDefinition: () => Promise<boolean>;
  onRefreshSelectedItemDetail: () => Promise<AccountItemDetail | null>;
  onActivateItemDetailSection: (section: "configuration" | "overview" | "recommendations" | "upgrades" | "analysis") => void;
  onSaveSelectedItemNote: () => void;
  onSaveSelectedItemTag: (tag: VaultTagValue) => void;
  onSelectedActionCharacterIdChange: (id: string) => void;
  onSetItemNoteDraft: (value: string) => void;
};

export type ItemDetailModalProps = Omit<ItemDetailReadyProps, "selectedItem"> & {
  selectedItem: SelectedItemDetail | null;
  openingItem: AccountItemSummary | ItemSearchResult;
  isReady: boolean;
};

export function ItemDetailModal(props: ItemDetailModalProps) {
  const { openingItem, isReady, selectedItem, ...readyProps } = props;
  const readyCloseHandlerRef = useRef<(() => void) | null>(null);
  const onCloseRef = useRef(props.onClose);
  onCloseRef.current = props.onClose;
  const showReadyContent = Boolean(isReady && selectedItem);
  const registerReadyCloseHandler = useCallback((handler: () => void) => {
    readyCloseHandlerRef.current = handler;
    return () => {
      if (readyCloseHandlerRef.current === handler) readyCloseHandlerRef.current = null;
    };
  }, []);
  const requestClose = useCallback(() => {
    (readyCloseHandlerRef.current ?? onCloseRef.current)();
  }, []);

  useLayoutEffect(() => {
    completeRendererPerformanceInteraction(
      "item-detail-open",
      getItemKey(openingItem),
      "overlay-commit",
      { group: openingItem.group_key }
    );
  }, [openingItem]);

  useLayoutEffect(() => {
    if (!showReadyContent) readyCloseHandlerRef.current = null;
  }, [openingItem, showReadyContent]);

  const activeItem = selectedItem ?? openingItem;
  const variant = activeItem.group_key === "weapons"
    ? "weapon"
    : activeItem.group_key === "armor" ? "armor" : "loading";
  const loadingError = !selectedItem ? props.itemDetailError : "";

  return (
    <SharedItemDetailDialog
      detail={{
        name: activeItem.name,
        isBusy: (!showReadyContent && !loadingError) || Boolean(selectedItem?.is_detail_loading)
      }}
      variant={variant}
      closeLabel="关闭装备详情"
      onClose={requestClose}
      sections={showReadyContent && selectedItem ? (
        <ItemDetailReadyContent
          {...readyProps}
          selectedItem={selectedItem}
          registerCloseHandler={registerReadyCloseHandler}
        />
      ) : loadingError ? (
        <div className="shared-item-detail-loading-state" role="alert">
          <p className="status-message status-error">{loadingError}</p>
          <p>装备详情暂时无法读取，可以关闭后重试。</p>
        </div>
      ) : <SharedItemDetailLoading />}
    />
  );
}

function ItemDetailReadyContent(
  props: ItemDetailReadyProps & { registerCloseHandler: (handler: () => void) => () => void }
) {
  const selectedItem = props.selectedItem;
  const selectedItemLocation = resolveAccountItemViewLocation(props.accountSummary, selectedItem.instance_id);
  const selectedItemCharacterId = selectedItemLocation && "characterId" in selectedItemLocation
    ? selectedItemLocation.characterId
    : selectedItem.source_character_id;
  const selectedItemLocationLabel = formatSelectedItemLocation(
    props.accountSummary,
    selectedItemLocation?.kind
      ?? selectedItem.source_kind
      ?? (selectedItem.is_vault_item ? "vault" : selectedItem.is_postmaster_item ? "postmaster" : undefined),
    selectedItemCharacterId
  );
  const [pendingPerks, setPendingPerks] = useState<Record<number, number>>({});
  const [perkWriteFeedback, setPerkWriteFeedback] = useState<WeaponConfigurationWriteFeedback>({ status: "idle" });
  const [itemToolMessage, setItemToolMessage] = useState("");
  useEffect(() => {
    setPendingPerks({});
    setPerkWriteFeedback({ status: "idle" });
    setItemToolMessage("");
  }, [selectedItem.item_key]);
  const isWeapon = selectedItem.group_key === "weapons";
  // 推荐项只有一条来源路径：统一推荐模型产出的来源事实。
  // 装备目标不再挤进推荐区（它有「目标命中」这一处独立展示，也在装备目标库面板里管理）。
  const weaponRecommendations = useMemo(
    () => isWeapon ? buildWeaponRecommendationViews(props.communityRecommendations, selectedItem) : [],
    [isWeapon, props.communityRecommendations, selectedItem]
  );
  const weaponSources = useMemo(
    () => buildWeaponSources(selectedItem, props.itemAvailability),
    [props.itemAvailability, selectedItem]
  );
  const weaponBaseModel = useMemo(() => buildWeaponDetailView({
    selectedItem,
    pendingPerks,
    versions: props.itemVersions,
    versionsLoading: props.isItemVersionsLoading,
    sources: weaponSources,
    context: selectedItemLocationLabel ? { location_label: selectedItemLocationLabel } : undefined
  }), [pendingPerks, props.isItemVersionsLoading, props.itemVersions, selectedItem, selectedItemLocationLabel, weaponSources]);
  const weaponModel = useMemo(() => weaponBaseModel ? {
    ...weaponBaseModel,
    recommendations: weaponRecommendations,
    recommendation_disclaimer: props.communityRecommendations?.disclaimer
  } : null, [weaponBaseModel, weaponRecommendations, props.communityRecommendations?.disclaimer]);
  const armorSources = useMemo(
    () => buildArmorSources(selectedItem, props.itemAvailability),
    [props.itemAvailability, selectedItem]
  );
  const armorModel = useMemo(() => buildArmorDetailView({
    selectedItem,
    sameNameItems: props.sameNameItems,
    localTargetRules: props.localTargetRules,
    equipmentTargetStore: props.equipmentTargetStore,
    sources: armorSources
  }), [armorSources, props.equipmentTargetStore, props.localTargetRules, props.sameNameItems, selectedItem]);
  // 所有来源同级：不再排除 DIM 来源，详情与仓库卡片使用同一份来源事实。
  const recommendationSourceMatches = useMemo(() => isWeapon ? mergeRecommendationSourceDetails(
    props.communityInstanceMatch?.source_matches ?? [],
    props.communityRecommendations?.source_records ?? []
  ) : [], [isWeapon, props.communityInstanceMatch?.source_matches, props.communityRecommendations?.source_records]);
  const persistedNote = props.vaultTags.items[selectedItem.item_key]?.note ?? "";
  const noteDirty = Boolean(selectedItem.instance_id) && props.itemNoteDraft !== persistedNote;
  const hasPendingPerks = Object.keys(pendingPerks).length > 0;
  const confirmLeaveItemDetail = useCallback(() => {
    if (!weaponModel && !armorModel) return true;
    if ((!weaponModel || !hasPendingPerks) && !noteDirty) return true;
    const subject = weaponModel ? "武器" : armorModel ? "护甲" : "装备";
    const pendingMessages = [
      weaponModel && hasPendingPerks ? `${Object.keys(pendingPerks).length} 项 Perk 更改尚未应用` : undefined,
      noteDirty ? "装备备注尚未保存" : undefined
    ].filter((message): message is string => Boolean(message));
    return window.confirm([
      `当前${subject}还有未提交的内容：`,
      ...pendingMessages.map((message) => `• ${message}`),
      "继续将放弃这些内容。"
    ].join("\n"));
  }, [armorModel, hasPendingPerks, noteDirty, weaponModel]);
  const requestClose = useCallback(() => {
    if (confirmLeaveItemDetail()) props.onClose();
  }, [confirmLeaveItemDetail, props.onClose]);
  useLayoutEffect(
    () => props.registerCloseHandler(requestClose),
    [props.registerCloseHandler, requestClose]
  );
  const openItemDetail = (item: SameNameItemSummary | ItemSearchResult, source: SelectedItemSource) => {
    if (!confirmLeaveItemDetail()) return false;
    props.onOpenItemDetail(item, source);
    return true;
  };
  const instanceActions = selectedItem.instance_id ? (
    <ItemDetailInstanceActions
      props={props}
      selectedItem={selectedItem}
      noteDirty={noteDirty}
      itemToolMessage={itemToolMessage}
      setItemToolMessage={setItemToolMessage}
    />
  ) : undefined;

  return weaponModel ? (
    <>
      {props.itemDetailError || props.itemActionMessage ? (
        <p className={`status-message ${props.itemDetailError ? "status-error" : ""}`} role="status">
          {props.itemDetailError || props.itemActionMessage}
        </p>
      ) : null}
      <WeaponDetailContent
        key={selectedItem.item_key}
        model={weaponModel}
        recommendationEvidence={{
              sourceMatches: recommendationSourceMatches,
              status: resolveRecommendationEvidenceStatus(
                props.isCommunityRecommendationsLoading,
                props.communityRecommendationError,
                props.recommendationScan
              ),
              message: props.communityRecommendationError || props.recommendationScan.message
            }}
            actions={{
              activateSection: props.onActivateItemDetailSection,
              selectVersion: (hash) => {
                const version = props.itemVersions.find((candidate) => candidate.hash === hash);
                if (version) return openItemDetail(version, {});
                return false;
              },
              loadConfiguration: selectedItem.detail_loaded?.definition && selectedItem.detail_loaded?.instance
                ? undefined
                : props.onLoadSelectedItemFullDetail,
              // 固有能力这类「只能来自定义」的格子走后台补读：不读完整 Roll、不把整份详情退回全屏骨架。
              loadDefinition: selectedItem.detail_loaded?.definition
                ? undefined
                : props.onLoadSelectedItemDefinition,
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
                // 重入闸：一次只能有一个写操作在飞。少了它，用户在一件装备已有变更在 Bungie
                // 那边处理时再点一次「应用」，第二次必然吃 ErrorCode 1679（2026-09-18 那次
                // 「武器配置未更新 / 需要处理」就是这么来的，见 T80）。
                if (props.isRunningItemAction) return;
                const changes = Object.entries(pendingPerks).map(([socketIndex, plugHash]) => ({
                  socketIndex: Number(socketIndex),
                  plugHash
                }));
                if (!changes.length || !selectedItem.instance_id || !props.selectedActionCharacterId) return;
                const instanceId = selectedItem.instance_id;
                // 同一份 payload 既是发给写接口的请求，也是受理后落到本地的依据：两处永远一致。
                const pluginChanges = toAcceptedSocketPlugChanges(changes, selectedItem.sockets);
                const outcome = await props.onRunItemWriteAction("应用武器配置", () => api.applySocketPlugs({
                  membership_type: props.accountSummary?.membership_type ?? 0,
                  character_id: selectedItemCharacterId ?? props.selectedActionCharacterId,
                  item_id: selectedItem.instance_id ?? "",
                  item_name: selectedItem.name,
                  changes: pluginChanges
                }), {
                  keepDetailOpen: true,
                  feedbackScope: "detail",
                  onProgress: (phase, message) => setPerkWriteFeedback({ status: phase, message }),
                  // 受理即权威：写接口返回成功就把本地配置改成新选的 Perk，不等服务器读回。
                  acceptedSocketChanges: { instance_id: instanceId, changes: pluginChanges },
                  // 后台看服务器什么时候跟上。它不阻塞、不报错、也不会把旧配置弹回来；对没对上
                  // 都只留痕，**不据此改面板文案** —— 面板没有资格替服务器说「已确认」（见 T78）。
                  backgroundVerification: {
                    verify: (detail) => acceptedSocketPlugsReflected(detail, pluginChanges),
                    describeAttempt: (detail) => summarizeAcceptedSocketPlugs(detail, pluginChanges)
                  }
                });
                if (outcome.cancelled) {
                  setPerkWriteFeedback({ status: "idle" });
                  return;
                }
                if (outcome.deferred) {
                  // 中性态：没提交成功，但也不是失败。保留待应用选择，用户可以稍后重试。
                  setPerkWriteFeedback({ status: "deferred", message: outcome.message });
                  return;
                }
                if (!outcome.ok) {
                  setPerkWriteFeedback({ status: "error", message: outcome.message });
                  return;
                }
                setPendingPerks({});
                setPerkWriteFeedback({ status: "submitted", message: outcome.message });
              },
              refreshConfiguration: async () => {
                const pendingChanges = toAcceptedSocketPlugChanges(
                  Object.entries(pendingPerks).map(([socketIndex, plugHash]) => ({
                    socketIndex: Number(socketIndex),
                    plugHash
                  })),
                  selectedItem.sockets
                );
                setPerkWriteFeedback({ status: "refreshing", message: "正在读取服务器当前配置..." });
                try {
                  const startedAt = performance.now();
                  const detail = await props.onRefreshSelectedItemDetail();
                  const verification = detail
                    ? summarizeAcceptedSocketPlugs(detail, pendingChanges)
                    : undefined;
                  const reflected = detail
                    ? acceptedSocketPlugsReflected(detail, pendingChanges)
                    : false;
                  // 用户手动重读也留一条痕：截图里那两次失败就是走的这条路，
                  // 没有这条留痕就看不出当时究竟读到了什么。
                  void api.recordActionDebugTrace({
                    operation_id: createWriteActionOperationId(),
                    action: "insert-socket-plug",
                    phase: "verification-read",
                    item_name: selectedItem.name,
                    item_instance_id: selectedItem.instance_id ?? undefined,
                    character_id: props.selectedActionCharacterId ?? undefined,
                    expected_count: verification?.expected_count ?? pendingChanges.length,
                    matched_count: verification?.matched_count ?? 0,
                    duration_ms: performance.now() - startedAt,
                    reflected,
                    ok: Boolean(detail),
                    message: verification?.message ?? (detail ? undefined : "手动重读没有返回详情")
                  }).catch((error) => {
                    console.warn("写操作诊断日志记录失败：", error);
                  });
                  // 读到的是旧值不等于读取失败 —— 实测传播延迟可以到几分钟。这里只如实说
                  // 「读到了服务器当前配置」，不对「有没有换成新的」下任何断言（见 T78）。
                  if (reflected) setPendingPerks({});
                  setPerkWriteFeedback({ status: "reloaded", message: "已读取服务器当前配置。" });
                } catch (error) {
                  setPerkWriteFeedback({
                    status: "error",
                    message: error instanceof Error ? error.message : "配置刷新失败，请稍后重试。"
                  });
                }
              }
            }}
        configurationWriteFeedback={perkWriteFeedback}
        instanceActions={instanceActions}
      />
    </>
  ) : armorModel ? (
    <>
      {props.itemDetailError || props.itemActionMessage ? (
        <p className={`status-message ${props.itemDetailError ? "status-error" : ""}`} role="status">
          {props.itemDetailError || props.itemActionMessage}
        </p>
      ) : null}
      <ArmorDetailContent
        key={selectedItem.item_key}
        model={armorModel}
            actions={{
              selectInstance: (instance) => {
                const item = props.sameNameItems.find((candidate) => candidate.instance_id === instance.instance_id);
                if (!item) return;
                return openItemDetail(item, {
                  source_character_id: item.source_character_id,
                  source_kind: item.source_kind,
                  is_vault_item: item.is_vault_item,
                  is_postmaster_item: item.is_postmaster_item
                });
              }
        }}
        instanceActions={instanceActions}
      />
    </>
  ) : (
    <>
      {props.itemDetailError || props.itemActionMessage ? (
        <p className={`status-message ${props.itemDetailError ? "status-error" : ""}`} role="status">
          {props.itemDetailError || props.itemActionMessage}
        </p>
      ) : null}
      <section className="item-detail-game-card">
        <ItemDetailHeader selectedItem={selectedItem} onClose={props.onClose} showClose={false} />
        <ItemDetailStats selectedItem={selectedItem} />
      </section>

      <ItemDetailTools
              accountSummary={props.accountSummary}
              localTargetRules={props.localTargetRules}
              equipmentTargetStore={props.equipmentTargetStore}
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
              onCopyTargetInsight={props.onCopyTargetInsight}
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
  );
}

function mergeRecommendationSourceDetails(
  matches: NonNullable<VaultItemInstanceMatchInfo["source_matches"]>,
  records: NonNullable<WeaponRecommendation["source_records"]>
): NonNullable<VaultItemInstanceMatchInfo["source_matches"]> {
  const recordsBySource = new Map(records.map((record) => [record.source_id, record]));
  return matches.map((match) => {
    const record = recordsBySource.get(match.source_id);
    if (!record) return match;
    return {
      ...match,
      source_label: record.source_label || match.source_label,
      source_url: record.source_url ?? match.source_url,
      purposes: record.purposes.length ? record.purposes : match.purposes,
      rating: record.rating ?? match.rating,
      ranking: record.ranking ?? match.ranking,
      note: record.note ?? match.note,
      page_updated_at: record.page_updated_at ?? match.page_updated_at,
      version: record.version ?? match.version,
      source_location: record.source_location ?? match.source_location
    };
  });
}

function formatSelectedItemLocation(
  account: AccountSummary | null,
  kind: SelectedItemDetail["source_kind"] | undefined,
  characterId: string | undefined
): string | undefined {
  if (!kind) return undefined;
  if (kind === "vault") return "仓库";
  const characterName = account?.characters.find((character) => (
    character.character_id === characterId
  ))?.class_name ?? "角色";
  const place = kind === "equipped" ? "已装备" : kind === "postmaster" ? "邮政官" : "背包";
  return `${characterName} · ${place}`;
}

function resolveRecommendationEvidenceStatus(
  isDetailLoading: boolean,
  detailError: string,
  scan: VaultRecommendationScanState
): "idle" | "loading" | "partial" | "ready" | "error" {
  if (isDetailLoading || scan.phase === "scanning") return "loading";
  if (scan.phase === "partial") return "partial";
  if (detailError || scan.phase === "error") return "error";
  if (scan.phase === "idle") return "idle";
  return "ready";
}

/** 待选项（`pendingPerks` 的形状）转成受理变更。写接口请求与本地核对必须发同一份，别再各拼一遍。 */
function toAcceptedSocketPlugChanges(
  changes: ReadonlyArray<{ socketIndex: number; plugHash: number }>,
  sockets: SelectedItemDetail["sockets"]
): AcceptedSocketPlugChange[] {
  return changes.map((change) => ({
    socket_index: change.socketIndex,
    plug_hash: change.plugHash,
    plug_name: sockets
      ?.find((socket) => socket.socket_index === change.socketIndex)
      ?.reusable_plugs.find((candidate) => candidate.hash === change.plugHash)?.name
  }));
}

function ItemDetailInstanceActions(input: {
  props: ItemDetailReadyProps;
  selectedItem: SelectedItemDetail;
  noteDirty: boolean;
  itemToolMessage: string;
  setItemToolMessage: (message: string) => void;
}) {
  const { props, selectedItem } = input;
  const [actionFeedback, setActionFeedback] = useState<{
    status: "idle" | "submitting" | "refreshing" | "syncing" | "success" | "error";
    message?: string;
  }>({ status: "idle" });

  useEffect(() => {
    setActionFeedback({ status: "idle" });
  }, [selectedItem.item_key]);

  useEffect(() => {
    const feedback = props.accountOperationFeedback;
    if (!selectedItem.instance_id || !feedback?.itemInstanceIds?.includes(selectedItem.instance_id)) return;
    if (feedback.phase === "confirmed" || feedback.phase === "partial-confirmed") {
      setActionFeedback({ status: "success", message: feedback.message });
      return;
    }
    if (feedback.phase === "failed" || feedback.phase === "paused" || feedback.phase === "superseded") {
      setActionFeedback({ status: "error", message: feedback.message });
      return;
    }
    if (feedback.phase === "submitting") {
      setActionFeedback({ status: "submitting", message: feedback.message });
      return;
    }
    if (feedback.phase === "syncing" || feedback.phase === "delayed" || feedback.phase === "partial") {
      setActionFeedback({ status: "syncing", message: feedback.message });
    }
  }, [props.accountOperationFeedback, selectedItem.instance_id]);

  const runDetailAction = async (
    label: string,
    action: () => Promise<ItemActionResult>,
    expectedAccountPatch: AccountItemActionPatch
  ) => {
    setActionFeedback({ status: "submitting", message: `${label}正在提交到 Bungie...` });
    try {
      const outcome = await props.onRunItemWriteAction(label, action, {
        keepDetailOpen: true,
        feedbackScope: "detail",
        onProgress: (phase, message) => setActionFeedback({ status: phase, message }),
        expectedAccountPatch
      });
      if (outcome.cancelled) {
        setActionFeedback({ status: "idle" });
        return;
      }
      setActionFeedback({
        status: outcome.ok ? outcome.refreshed ? "success" : "syncing" : "error",
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
  const liveLocation = resolveAccountItemViewLocation(props.accountSummary, selectedItem.instance_id);
  const sourceKind = liveLocation?.kind ?? selectedItem.source_kind;
  const sourceCharacterId = liveLocation && "characterId" in liveLocation
    ? liveLocation.characterId
    : selectedItem.source_character_id;
  const isVaultItem = sourceKind === "vault" || (!liveLocation && Boolean(selectedItem.is_vault_item));
  const isPostmasterItem = sourceKind === "postmaster" || (!liveLocation && Boolean(selectedItem.is_postmaster_item));
  const sourceCharacter = characters.find((character) => character.character_id === sourceCharacterId);
  const liveAccountItem = props.accountSummary
    ? [
        ...props.accountSummary.vault.items,
        ...props.accountSummary.characters.flatMap((character) => [
          ...character.equipped_items,
          ...character.inventory_items,
          ...character.postmaster_items
        ])
      ].find((item) => item.instance_id === selectedItem.instance_id)
    : undefined;
  const effectiveLocked = liveAccountItem?.locked ?? selectedItem.locked;
  const localEntry = props.vaultTags.items[selectedItem.item_key]
    ?? (selectedItem.instance_id ? props.vaultTags.items[selectedItem.instance_id] : undefined);
  const currentTag = localEntry?.tag;
  const locationLabel = isPostmasterItem
    ? `${sourceCharacter?.class_name ?? "角色"} · 邮政官`
    : isVaultItem
      ? "仓库"
      : sourceKind === "equipped"
        ? `${sourceCharacter?.class_name ?? "角色"} · 已装备`
        : `${sourceCharacter?.class_name ?? "角色"} · 背包`;
  const isAlreadyEquippedToTarget = sourceKind === "equipped"
    && sourceCharacterId === props.selectedActionCharacterId;

  const transferToVault = !isVaultItem;
  const transferCharacterId = isVaultItem
    ? props.selectedActionCharacterId
    : sourceCharacterId ?? props.selectedActionCharacterId;

  const transferItem = () => api.transferItem({
    membership_type: props.accountSummary?.membership_type ?? 0,
    character_id: resolveItemTransferCharacterId({
      selectedCharacterId: props.selectedActionCharacterId,
      sourceCharacterId,
      sourceKind,
      transferToVault
    }),
    item_id: selectedItem.instance_id ?? "",
    item_reference_hash: selectedItem.hash,
    item_name: selectedItem.name,
    transfer_to_vault: transferToVault
  });

  const copyTransferPlan = () => props.onCopyItemActionPlanText({
    action: "transfer",
    item_name: selectedItem.name,
    item_instance_id: selectedItem.instance_id,
    item_reference_hash: selectedItem.hash,
    character_id: isVaultItem
      ? props.selectedActionCharacterId
      : sourceCharacterId ?? props.selectedActionCharacterId,
    transfer_to_vault: transferToVault
  });

  const primaryActions = isPostmasterItem
    ? [{
        key: "postmaster-pull",
        label: "取回到角色背包",
        primary: true,
        onClick: () => void runDetailAction("从邮政官取回", () => api.pullFromPostmaster({
          membership_type: props.accountSummary?.membership_type ?? 0,
          character_id: sourceCharacterId ?? props.selectedActionCharacterId,
          item_id: selectedItem.instance_id ?? "",
          item_reference_hash: selectedItem.hash,
          source_bucket_hash: selectedItem.bucket_hash,
          item_name: selectedItem.name
        }), {
          kind: "postmaster-pull",
          item_instance_id: selectedItem.instance_id ?? "",
          character_id: sourceCharacterId ?? props.selectedActionCharacterId,
          source_bucket_hash: selectedItem.bucket_hash
        })
      }]
    : [
        isVaultItem
          ? {
              key: "transfer-from-vault",
              label: `取出到${targetCharacter?.class_name ?? "角色"}`,
              primary: true,
              onClick: () => void runDetailAction("取出到角色", transferItem, {
                kind: "transfer",
                item_instance_id: selectedItem.instance_id ?? "",
                character_id: transferCharacterId,
                target: "character-inventory"
              })
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
              }), {
                kind: "equip",
                item_instance_id: selectedItem.instance_id ?? "",
                character_id: props.selectedActionCharacterId
              })
            },
        ...(isVaultItem
          ? [{ key: "copy-transfer", label: "复制转移计划", onClick: copyTransferPlan }]
          : [{
              key: "transfer-to-vault",
              label: "移入仓库",
              onClick: () => void runDetailAction("移入仓库", transferItem, {
                kind: "transfer",
                item_instance_id: selectedItem.instance_id ?? "",
                character_id: transferCharacterId,
                target: "vault"
              })
            }]),
        {
          key: "lock",
          label: effectiveLocked === undefined
            ? "锁定状态未知"
            : effectiveLocked
              ? "解锁"
              : "锁定",
          disabled: effectiveLocked === undefined,
          onClick: () => void runDetailAction(effectiveLocked ? "解锁" : "锁定", () => api.setItemLockState({
            membership_type: props.accountSummary?.membership_type ?? 0,
            character_id: props.selectedActionCharacterId,
            item_id: selectedItem.instance_id ?? "",
            item_name: selectedItem.name,
            state: !effectiveLocked
          }), {
            kind: "lock",
            item_instance_id: selectedItem.instance_id ?? "",
            locked: !effectiveLocked
          })
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
      title={selectedItem.name}
      subtitle={`${locationLabel} · ${selectedItem.power ?? "-"} 光等`}
      eyebrow="当前装备"
      currentBadge="正在查看"
      statusLabels={[
        sourceKind === "equipped" ? "已装备" : "未装备",
        effectiveLocked === undefined
          ? "锁定状态未知"
          : effectiveLocked
            ? "已锁定"
            : "未锁定",
        currentTag ? formatVaultTagLabel(currentTag) : "未整理"
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
      noteLabel="装备备注"
      noteDirty={input.noteDirty}
      collapseAuxiliary
      onTargetChange={props.onSelectedActionCharacterIdChange}
      onNoteChange={props.onSetItemNoteDraft}
      noteActions={[
        { key: "save-note", label: "保存备注", primary: true, disabled: !input.noteDirty, onClick: props.onSaveSelectedItemNote },
        ...(!isPostmasterItem && !isVaultItem
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
                ? "Bungie 已受理，正在同步"
                : actionFeedback.status === "syncing"
                  ? "同步中"
                : actionFeedback.status === "success"
                  ? "游戏内状态已更新"
                  : "操作未完成"}</strong>
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
      id: `live:${source.kind}:${source.offer_id ?? `${source.label}:${index}`}`,
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
      description: source.kind === "public_activity"
        ? availability?.description ?? source.label
        : `当前在“${source.label}”中发现这件武器的获取入口。`,
      available_now: true,
      offer
    });
  }
  if (!availability || availability.sources.length === 0) {
    entries.push({
      id: `live-status:${item.hash}`,
      kind: "live_status",
      label: "当前获取状态",
      description: availability?.description ?? "当前没有返回商人库存或活动奖励数据，暂时无法判断是否有获取入口。",
      available_now: availability ? false : undefined
    });
  }
  if (item.source.status === "ready") {
    entries.push({
      id: `manifest:${item.hash}:${item.source.source_hash ?? "hint"}`,
      kind: "manifest_hint",
      label: "历史获取途径",
      description: item.source.description
    });
  }
  return {
    status: entries.length ? availability?.sources.length ? "ready" : "partial" : "unknown",
    entries
  };
}
