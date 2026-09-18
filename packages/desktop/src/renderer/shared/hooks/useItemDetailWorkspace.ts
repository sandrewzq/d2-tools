import { useEffect, useMemo, useRef, useState } from "react";
import type { AccountOperationFeedbackView } from "@d2-tools/app/account";
import { api } from "../../api/client";
import type { ActionLogType } from "@d2-tools/core/actions/log";
import type { AcceptedSocketPlugChange } from "@d2-tools/core/account/summary";
import type { AccountItemActionPatch, AccountItemDetail, AccountItemSummary, AccountSummary, ActionDebugTraceInput, ItemActionResult, ItemAiAdviceResult, ItemSearchResult, LibraryHistory, LocalTargetRules, VaultItemInstanceMatchInfo, VaultTags, VaultTagValue, WeaponRecommendation } from "../../api/types";
import type { LiveItemAvailabilityEntry } from "@d2-tools/core/items/liveAvailability";
import {
  buildTargetInsightText,
  collectSelectedSameNameItems,
  getItemKey,
  selectBestSameNameItem,
  selectedItemToAccountItem,
  type SameNameItemSummary
} from "@d2-tools/app/items";
import { protectVaultCleanupTagPlan } from "@d2-tools/app/vault";
import { services } from "../../api/services";
import {
  buildDuplicateGroupBatchTagPlan,
  buildVaultCleanupLocatorText,
  buildVaultDuplicateSummary
} from "../domain/vault/vaultCleanup";
import { buildItemChatGuideText, buildItemShareText } from "../../utils/itemShare";
import {
  useItemDetail
} from "./useItemDetail";
import { buildWeaponAiConfigurationContext } from "../components/item-detail/buildWeaponDetailView";

const ITEM_DETAIL_RECOMMENDATION_IDLE_TIMEOUT_MS = 700;
const ITEM_DETAIL_AUXILIARY_IDLE_TIMEOUT_MS = 1_600;

type RecommendationSectionItem = {
  hash: number;
  name: string;
  instance_id?: string;
  weapon_roll?: AccountItemSummary["weapon_roll"];
  socket_plugs?: AccountItemSummary["socket_plugs"];
};

type DiagnosticsBridge = {
  loadActionLog: () => Promise<void>;
};

/**
 * 一次「写后读回」的逐槽对照。
 *
 * 谓词（`backgroundVerification.verify`）与留痕（`describeAttempt`）都由它派生，这样两者永远
 * 同源，不会出现「判定说不匹配、留痕说都匹配」这种自相矛盾。
 */
export type RefreshedItemVerification = {
  expected_count: number;
  matched_count: number;
  /** 逐槽「期望 vs 读到」。只进 `write-action-debug.json`，不面向用户；全命中时缺省。 */
  message?: string;
};

/**
 * 写响应体里带回的插槽状态**与写入意图不一致**的槽位，写成留痕用的句子。
 *
 * Bungie 的写响应体理论上就是这次写之后服务器认为的装备状态（DIM 直接拿它重建本地 item），
 * 但它在本环境没法用真写验证。所以这里只把**不一致**记下来当证据，不据此改界面 ——
 * 万一响应体回的是写之前的状态，用户选的那一项就被无声吃掉了。
 * 真出现「受理但被静默拒绝」，这些行就是第一手材料（见 T77 §七）。
 */
function describeSocketPlugResponseMismatches(input: {
  intended: readonly AcceptedSocketPlugChange[];
  fromResponse?: readonly { socket_index: number; plug_hash: number }[];
}): string[] {
  if (!input.fromResponse?.length) return [];
  const responded = new Map(input.fromResponse.map((plug) => [plug.socket_index, plug.plug_hash]));
  const mismatches: string[] = [];
  for (const change of input.intended) {
    const actual = responded.get(change.socket_index);
    if (actual === undefined || actual === change.plug_hash) continue;
    mismatches.push(
      `插槽 ${change.socket_index}：写响应体回 ${actual}，意图是 ${change.plug_hash}`
    );
  }
  return mismatches;
}

/**
 * 换 Perk 后后台核对的台阶（累计约 12.5 分钟）。
 *
 * 依据是实测：写入被受理后 26 秒仍读到旧值，3 分 32 秒读到新值（2026-09-18 的留痕，
 * op `04adaf08` 在第 6 次读回才 `reflected: true`），**收敛上界仍然没有测出来** ——
 * 同一天的 op `63e6a903` 在整个窗口里一次都没读到，89 分钟后才证明它其实落地了。
 *
 * 所以这套台阶的作用只是「尽量早地看到服务器跟上」，**不是判据**：
 * 走完还没读到只说明「窗口内没观察到」，不代表写入失败，也绝不据此改界面（见 T80）。
 */
const SOCKET_PLUG_VERIFY_DELAYS = [0, 30_000, 60_000, 120_000, 240_000, 300_000] as const;

/** `runItemWriteAction` 的选项。三处调用方（弹框、动作行、工具区）共用同一份声明。 */
export type ItemWriteActionOptions = {
  keepDetailOpen?: boolean;
  feedbackScope?: "global" | "detail";
  onProgress?: (phase: "submitting" | "refreshing", message: string) => void;
  /**
   * 本次写入要落地的换 Perk 结果。受理即权威：写接口返回成功就把本地状态改掉，
   * **不等写后读回**（实测传播延迟可达几分钟，见 T77）。这与 `expectedAccountPatch`
   * 是同一套语义，只是插槽状态不归账号 store 管，所以走详情这条线。
   */
  acceptedSocketChanges?: { instance_id: string; changes: readonly AcceptedSocketPlugChange[] };
  /**
   * 写入受理后**后台**核对服务器何时跟上。不阻塞返回、不报错、绝不把读到的旧值写回界面。
   *
   * 它只留痕，**不回调改界面文案**：面板没有资格替服务器宣布结果（T78 之前那个回调就是靠
   * 一次读回把「服务器认了」写上屏的）。
   */
  backgroundVerification?: {
    verify: (detail: AccountItemDetail) => boolean;
    describeAttempt?: (detail: AccountItemDetail) => RefreshedItemVerification;
  };
  expectedAccountPatch?: AccountItemActionPatch;
};

export type ItemWriteActionOutcome = {
  ok: boolean;
  refreshed: boolean;
  message: string;
  cancelled?: boolean;
  /**
   * 写没落地，但也不是失败：Bungie 用 ErrorCode 1679 说「这件装备还有变更在处理中」。
   *
   * 单独一条是因为它既不能进红色错误态（会把一次正常写入报成失败，见 T80），
   * 也不能当成功落地（那是在替服务器宣布结果）。调用方走中性态。
   */
  deferred?: boolean;
};

/** 写操作留痕的分组 id。详情弹框的手动重读也用它来单独标记一条读回留痕。 */
export function createWriteActionOperationId(): string {
  return typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `item-action-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useItemDetailWorkspace(input: {
  accountSummary: AccountSummary | null;
  detailCacheScopeKey: string;
  recommendationRevision?: string;
  cleanupProtectionByItemKey?: ReadonlyMap<string, readonly string[]>;
  vaultTags: VaultTags;
  setVaultTags: (tags: VaultTags) => void;
  localTargetRules: LocalTargetRules;
  diagnostics: DiagnosticsBridge;
  setAccountError: (message: string) => void;
  setAccountOperationFeedback: (feedback: AccountOperationFeedbackView | undefined) => void;
  setIsRunningItemAction: (isRunning: boolean) => void;
  setItemActionMessage: (message: string) => void;
  applyAcceptedAccountActionPatches: (patches: readonly AccountItemActionPatch[]) => void;
  onRecentHistoryChanged: (history: LibraryHistory) => void;
}) {
  const [communityRecommendations, setCommunityRecommendations] = useState<WeaponRecommendation | null>(null);
  const [communityInstanceEvidence, setCommunityInstanceEvidence] = useState<VaultItemInstanceMatchInfo | null>(null);
  const [communityRecommendationError, setCommunityRecommendationError] = useState("");
  const [isCommunityRecommendationsLoading, setIsCommunityRecommendationsLoading] = useState(false);
  const [selectedItemAvailability, setSelectedItemAvailability] = useState<LiveItemAvailabilityEntry | null>(null);
  const [selectedItemVersions, setSelectedItemVersions] = useState<ItemSearchResult[]>([]);
  const [isSelectedItemVersionsLoading, setIsSelectedItemVersionsLoading] = useState(false);
  const [itemAiResult, setItemAiResult] = useState<ItemAiAdviceResult | null>(null);
  const [itemAiError, setItemAiError] = useState("");
  const [itemNoteDraft, setItemNoteDraft] = useState("");
  const [itemNoteMessage, setItemNoteMessage] = useState("");
  const [itemShareMessage, setItemShareMessage] = useState("");
  const [isGeneratingItemAi, setIsGeneratingItemAi] = useState(false);
  const [selectedActionCharacterId, setSelectedActionCharacterId] = useState("");
  const workspaceRequestSequenceRef = useRef(0);
  const writeActionDebugQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const communityRecommendationCacheRef = useRef(new Map<string, WeaponRecommendation | null>());
  const communityRecommendationRequestsRef = useRef(new Map<string, Promise<WeaponRecommendation | null>>());
  const activeRecommendationCacheKeyRef = useRef("");
  const detailSectionLoadersRef = useRef<{
    recommendations?: () => void;
    overview?: () => void;
  }>({});
  const activeDetailSectionsRef = useRef(new Set<"recommendations" | "overview">());

  const {
    selectedItem,
    itemDetailLoadingKey,
    itemDetailError,
    openItemDetail,
    loadSelectedItemFullDetail,
    loadSelectedItemDefinition,
    refreshSelectedItemDetail,
    applyAcceptedSocketPlugs: applyAcceptedSocketPlugsToDetail,
    closeSelectedItemDetail: closeItemDetailCore
  } = useItemDetail({
    cacheScopeKey: input.detailCacheScopeKey,
    onOpenStart: ({ item, source, itemKey, isCurrent }) => {
      const workspaceRequestSequence = ++workspaceRequestSequenceRef.current;
      const isCurrentWorkspace = () => (
        workspaceRequestSequenceRef.current === workspaceRequestSequence
        && isCurrent()
      );
      const isWeapon = item.group_key === "weapons";
      const recommendationCacheKey = buildCommunityRecommendationCacheKey(
        input.detailCacheScopeKey,
        input.recommendationRevision,
        item.hash,
        item.name
      );
      const hasCachedRecommendation = isWeapon
        && communityRecommendationCacheRef.current.has(recommendationCacheKey);
      const cachedRecommendation = hasCachedRecommendation
        ? communityRecommendationCacheRef.current.get(recommendationCacheKey) ?? null
        : null;
      activeRecommendationCacheKeyRef.current = isWeapon ? recommendationCacheKey : "";
      activeDetailSectionsRef.current.clear();
      setItemAiResult(null);
      setItemAiError("");
      setItemNoteMessage("");
      setItemShareMessage("");
      input.setItemActionMessage("");
      setItemNoteDraft(input.vaultTags.items[itemKey]?.note ?? "");
      const defaultCharacterId = source.source_character_id
        ?? input.accountSummary?.characters[0]?.character_id
        ?? "";
      setSelectedActionCharacterId(defaultCharacterId);
      setCommunityRecommendations(cachedRecommendation);
      setCommunityInstanceEvidence(null);
      setCommunityRecommendationError("");
      setIsCommunityRecommendationsLoading(false);
      setSelectedItemAvailability(null);
      setSelectedItemVersions(isWeapon && "description" in item && "source" in item ? [item] : []);
      setIsSelectedItemVersionsLoading(false);
      detailSectionLoadersRef.current = isWeapon ? {
        recommendations: createRecommendationSectionLoader(
          item,
          recommendationCacheKey,
          isCurrentWorkspace
        ),
        overview: () => {
          setIsSelectedItemVersionsLoading(true);
          scheduleWhenRendererIdle(() => {
            if (!isCurrentWorkspace()) return;
            const versionsRequest = api.searchItems(item.name)
              .then((results) => {
                if (!isCurrentWorkspace()) return;
                const versions = results
                  .filter((candidate) => candidate.group_key === "weapons" && candidate.name.trim() === item.name.trim())
                  .filter((candidate, index, all) => all.findIndex((entry) => entry.hash === candidate.hash) === index);
                setSelectedItemVersions(versions);
              })
              .catch((error) => {
                if (isCurrentWorkspace()) console.warn("同名版本读取失败：", error);
              })
              .finally(() => {
                if (isCurrentWorkspace()) setIsSelectedItemVersionsLoading(false);
              });
            const availabilityRequest = api.getLiveItemAvailability([item.hash])
              .then((availability) => {
                if (isCurrentWorkspace()) setSelectedItemAvailability(availability.items[String(item.hash)] ?? null);
              })
              .catch((error) => {
                if (isCurrentWorkspace()) console.warn("实时获取状态读取失败：", error);
              });
            void Promise.allSettled([versionsRequest, availabilityRequest]);
          }, ITEM_DETAIL_AUXILIARY_IDLE_TIMEOUT_MS, 180);
        }
      } : {};
    },
    onRecentHistoryChanged: input.onRecentHistoryChanged
  });

  useEffect(() => {
    workspaceRequestSequenceRef.current += 1;
    resetDetailWorkspaceState();
  }, [input.detailCacheScopeKey]);

  const selectedSameNameItems: SameNameItemSummary[] = useMemo(() => (
    selectedItem?.group_key === "weapons"
      ? []
      : collectSelectedSameNameItems(input.accountSummary, selectedItem)
  ), [input.accountSummary, selectedItem]);

  useEffect(() => {
    if (!selectedItem || selectedItem.group_key !== "weapons") return;
    const recommendationCacheKey = buildCommunityRecommendationCacheKey(
      input.detailCacheScopeKey,
      input.recommendationRevision,
      selectedItem.hash,
      selectedItem.name
    );
    if (activeRecommendationCacheKeyRef.current === recommendationCacheKey) return;
    activeRecommendationCacheKeyRef.current = recommendationCacheKey;

    const hasCachedRecommendation = communityRecommendationCacheRef.current.has(recommendationCacheKey);
    setCommunityRecommendations(hasCachedRecommendation
      ? communityRecommendationCacheRef.current.get(recommendationCacheKey) ?? null
      : null);
    setCommunityInstanceEvidence(null);
    setCommunityRecommendationError("");
    setIsCommunityRecommendationsLoading(false);
    const requestSequence = workspaceRequestSequenceRef.current;
    const isCurrentWorkspace = () => (
      workspaceRequestSequenceRef.current === requestSequence
      && activeRecommendationCacheKeyRef.current === recommendationCacheKey
    );
    const loader = createRecommendationSectionLoader(
      selectedItem,
      recommendationCacheKey,
      isCurrentWorkspace
    );
    detailSectionLoadersRef.current.recommendations = loader;
    if (activeDetailSectionsRef.current.has("recommendations")) {
      delete detailSectionLoadersRef.current.recommendations;
      loader();
    }
  }, [
    input.detailCacheScopeKey,
    input.recommendationRevision,
    selectedItem?.group_key,
    selectedItem?.hash,
    selectedItem?.name
  ]);

  async function generateItemAiAdvice(userKnowledge = "", allowExternalSearch = false) {
    if (!selectedItem?.group_key) return;
    const requestSequence = workspaceRequestSequenceRef.current;

    setIsGeneratingItemAi(true);
    setItemAiError("");
    setItemShareMessage("");

    try {
      const result = await api.generateItemAiAdvice({
        item: {
          hash: selectedItem.hash,
          instance_id: selectedItem.instance_id,
          name: selectedItem.name,
          icon: selectedItem.icon,
          item_type: selectedItem.item_type,
          tier: selectedItem.tier,
          bucket_name: selectedItem.bucket_name,
          group_key: selectedItem.group_key,
          power: selectedItem.power,
          locked: selectedItem.locked,
          armor_stats: selectedItem.armor_stats,
          armor_stat_breakdown: selectedItem.armor_stat_breakdown,
          socket_plugs: selectedItem.socket_plugs ?? [],
          description: selectedItem.description,
          note: selectedItem.item_key ? input.vaultTags.items[selectedItem.item_key]?.note : undefined
        },
        tags: input.vaultTags,
        user_knowledge: userKnowledge.trim() || undefined,
        builtin_knowledge: communityRecommendations,
        allow_external_search: allowExternalSearch,
        weapon_context: selectedItem.group_key === "weapons" ? {
          object_kind: selectedItem.instance_id ? "account_instance" : "definition",
          official_sources: [
            ...(selectedItemAvailability?.sources.map((source) => source.label) ?? []),
            ...(selectedItem.source.status === "ready" ? [selectedItem.source.description] : [])
          ],
          definition_stats: Object.fromEntries((selectedItem.definition_stats ?? []).map((stat) => [stat.name, stat.value])),
          current_stats: selectedItem.weapon_stats,
          ...buildWeaponAiConfigurationContext(selectedItem)
        } : undefined
      });
      if (workspaceRequestSequenceRef.current !== requestSequence) return;
      setItemAiResult(result);
    } catch (error) {
      if (workspaceRequestSequenceRef.current !== requestSequence) return;
      setItemAiError(error instanceof Error ? error.message : "AI 装备解读失败");
    } finally {
      if (workspaceRequestSequenceRef.current === requestSequence) {
        setIsGeneratingItemAi(false);
      }
    }
  }

  async function copySelectedItemSummary() {
    if (!selectedItem) return;

    const tag = input.vaultTags.items[selectedItem.item_key]?.tag ?? "none";
    const note = input.vaultTags.items[selectedItem.item_key]?.note ?? itemNoteDraft;
    const text = buildItemShareText({
      item: selectedItem,
      tag,
      note,
      aiText: itemAiResult?.ai?.text
    });

    try {
      await navigator.clipboard.writeText(text);
      setItemShareMessage("已复制装备结论");
    } catch {
      setItemShareMessage("复制失败，请检查系统剪贴板权限");
    }
  }

  async function copySelectedItemChatGuide() {
    if (!selectedItem) return;

    const tag = input.vaultTags.items[selectedItem.item_key]?.tag ?? "none";
    const note = input.vaultTags.items[selectedItem.item_key]?.note ?? itemNoteDraft;
    const text = buildItemChatGuideText({
      item: selectedItem,
      tag,
      note,
      aiText: itemAiResult?.ai?.text
    });

    try {
      await navigator.clipboard.writeText(text);
      setItemShareMessage("已复制群聊说明");
    } catch {
      setItemShareMessage("复制失败，请检查系统剪贴板权限");
    }
  }

  async function saveSelectedItemNote() {
    if (!selectedItem) return;

    setItemNoteMessage("");
    setItemShareMessage("");

    try {
      const tags = await services.localData.saveVaultNote({
        item_key: selectedItem.item_key,
        note: itemNoteDraft
      });
      input.setVaultTags(tags);
      setItemNoteDraft(tags.items[selectedItem.item_key]?.note ?? "");
      setItemNoteMessage("备注已保存");
    } catch (error) {
      setItemNoteMessage(error instanceof Error ? error.message : "备注保存失败");
    }
  }

  function closeSelectedItemDetail() {
    workspaceRequestSequenceRef.current += 1;
    closeItemDetailCore();
    resetDetailWorkspaceState();
  }

  function resetDetailWorkspaceState() {
    detailSectionLoadersRef.current = {};
    activeDetailSectionsRef.current.clear();
    activeRecommendationCacheKeyRef.current = "";
    setCommunityRecommendations(null);
    setCommunityInstanceEvidence(null);
    setCommunityRecommendationError("");
    setIsCommunityRecommendationsLoading(false);
    setSelectedItemAvailability(null);
    setSelectedItemVersions([]);
    setIsSelectedItemVersionsLoading(false);
    setItemAiResult(null);
    setItemAiError("");
    setItemNoteDraft("");
    setItemNoteMessage("");
    setItemShareMessage("");
    setIsGeneratingItemAi(false);
    setSelectedActionCharacterId("");
  }

  function activateItemDetailSection(section: "configuration" | "overview" | "recommendations" | "upgrades" | "analysis") {
    const loaderKey = section === "recommendations" ? "recommendations" : section === "overview" ? "overview" : null;
    if (!loaderKey) return;
    activeDetailSectionsRef.current.add(loaderKey);
    const loader = detailSectionLoadersRef.current[loaderKey];
    if (!loader) return;
    delete detailSectionLoadersRef.current[loaderKey];
    loader();
  }

  function createRecommendationSectionLoader(
    item: RecommendationSectionItem,
    recommendationCacheKey: string,
    isCurrentWorkspace: () => boolean
  ): () => void {
    return () => {
      const hasCachedRecommendation = communityRecommendationCacheRef.current.has(recommendationCacheKey);
      if (hasCachedRecommendation) {
        setCommunityRecommendations(communityRecommendationCacheRef.current.get(recommendationCacheKey) ?? null);
      }
      setCommunityRecommendationError("");
      setIsCommunityRecommendationsLoading(!hasCachedRecommendation);
      scheduleWhenRendererIdle(() => {
        const isCurrentRecommendation = () => (
          isCurrentWorkspace()
          && activeRecommendationCacheKeyRef.current === recommendationCacheKey
        );
        if (!isCurrentRecommendation()) return;
        if (item.instance_id) {
          void api.getCommunityVaultItemMatchEvidence({
            hash: item.hash,
            instance_id: item.instance_id,
            item_name: item.name,
            ...(item.weapon_roll ? { weapon_roll: item.weapon_roll } : {}),
            ...(item.socket_plugs ? {
              socket_plugs: item.socket_plugs.map((plug) => ({
                hash: plug.hash,
                socket_index: plug.socket_index
              }))
            } : {})
          }).then((evidence) => {
            if (isCurrentRecommendation()) setCommunityInstanceEvidence(evidence);
          }).catch((error) => {
            if (isCurrentRecommendation()) console.warn("实例推荐证据读取失败：", error);
          });
        }
        if (hasCachedRecommendation) return;
        const existingRequest = communityRecommendationRequestsRef.current.get(recommendationCacheKey);
        const request = existingRequest
          ?? api.getCommunityPerkRecommendations(item.hash, { item_name: item.name });
        if (!existingRequest) communityRecommendationRequestsRef.current.set(recommendationCacheKey, request);
        void request
          .then((result) => {
            touchBoundedCache(communityRecommendationCacheRef.current, recommendationCacheKey, result, 80);
            if (isCurrentRecommendation()) setCommunityRecommendations(result);
          })
          .catch((error) => {
            if (!isCurrentRecommendation()) return;
            console.warn("社区推荐加载失败：", error);
            setCommunityRecommendationError("社区推荐读取失败，已保留本地来源与目标判断。");
          })
          .finally(() => {
            if (communityRecommendationRequestsRef.current.get(recommendationCacheKey) === request) {
              communityRecommendationRequestsRef.current.delete(recommendationCacheKey);
            }
            if (isCurrentRecommendation()) setIsCommunityRecommendationsLoading(false);
          });
      }, ITEM_DETAIL_RECOMMENDATION_IDLE_TIMEOUT_MS, 120);
    };
  }

  async function saveSelectedItemTag(tag: VaultTagValue) {
    if (!selectedItem) return;

    setItemNoteMessage("");
    setItemShareMessage("");

    const protection = tag === "junk"
      ? input.cleanupProtectionByItemKey?.get(selectedItem.item_key) ?? []
      : [];
    if (protection.length) {
      setItemNoteMessage(`不能标为清理：${protection.join("、")}`);
      return;
    }

    try {
      const tags = await services.localData.saveVaultTag({
        item_key: selectedItem.item_key,
        tag
      });
      input.setVaultTags(tags);
      setItemNoteMessage(tag === "none" ? "已清除本地标记" : "已更新本地标记");
    } catch (error) {
      setItemNoteMessage(error instanceof Error ? error.message : "本地标记保存失败");
    }
  }

  async function copyTargetInsight() {
    if (!selectedItem) return;
    const text = buildTargetInsightText({
      selectedItem,
      vaultTags: input.vaultTags,
      localTargetRules: input.localTargetRules
    });
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setItemShareMessage("已复制命中结论");
    } catch {
      setItemShareMessage("复制失败，请检查系统剪贴板权限");
    }
  }

  async function copySameNameLocator(items: SameNameItemSummary[]) {
    if (!selectedItem || !items.length) return;

    const text = [
      `${selectedItem.name} / 同名定位清单`,
      `总计 ${items.length} 件`,
      "",
      buildVaultCleanupLocatorText(items, input.vaultTags)
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setItemShareMessage("已复制同名定位清单");
    } catch {
      setItemShareMessage("复制失败，请检查系统剪贴板权限");
    }
  }

  async function copyItemActionPlanText(
    actionInput: {
      action: "set-lock" | "equip" | "transfer";
      item_name: string;
      item_instance_id?: string;
      item_reference_hash?: number;
      character_id?: string;
      state?: boolean;
      transfer_to_vault?: boolean;
    }
  ) {
    input.setItemActionMessage("");
    try {
      const plan = await api.createItemActionPlan(actionInput);
      await navigator.clipboard.writeText([
        "d2-tools 装备操作计划",
        plan.title,
        plan.description,
        `需要确认：${plan.requires_confirmation ? "是" : "否"}`,
        "说明：这只是计划，不会执行 Bungie 写操作。"
      ].join("\n"));
      input.setItemActionMessage("已复制操作计划。");
    } catch (error) {
      input.setItemActionMessage(error instanceof Error ? error.message : "操作计划生成失败");
    }
  }

  async function saveVaultTagsBatch(inputs: Array<{ item_key: string; tag: VaultTagValue }>) {
    try {
      input.setVaultTags(await services.localData.saveVaultTagsBatch(inputs));
    } catch (error) {
      input.setAccountError(error instanceof Error ? error.message : "批量标记保存失败");
      throw error;
    }
  }

  async function applySameNameBatchTags(
    items: AccountItemSummary[],
    mode: Parameters<typeof buildDuplicateGroupBatchTagPlan>[1]
  ) {
    const group = buildVaultDuplicateSummary(items, input.vaultTags).groups[0];
    if (!group) return;

    setItemNoteMessage("");
    setItemShareMessage("");

    try {
      const plan = protectVaultCleanupTagPlan(
        buildDuplicateGroupBatchTagPlan(group, mode),
        input.cleanupProtectionByItemKey,
        input.vaultTags
      );
      await saveVaultTagsBatch(plan.inputs);
      setItemNoteMessage(
        `${mode === "keep-best-review-rest"
          ? "已将推荐项保留，其余标记为待定。"
          : mode === "keep-best-junk-rest"
            ? "已将推荐项保留，其余标记为清理。"
            : "已清除这组同名装备的本地标记。"}${plan.protectedCount
              ? ` ${plan.protectedCount} 件受保护，已保持原状态。`
              : ""}`
      );
    } catch (error) {
      setItemNoteMessage(error instanceof Error ? error.message : "同名装备批量标记失败");
    }
  }

  async function applySameNameCurrentKeepTags(
    items: AccountItemSummary[],
    currentItemKey: string,
    mode: "keep-current-review-rest" | "keep-current-junk-rest"
  ) {
    setItemNoteMessage("");
    setItemShareMessage("");

    try {
      const plan = protectVaultCleanupTagPlan(
        items.map((item) => ({
          item_key: getItemKey(item),
          tag: getItemKey(item) === currentItemKey
            ? "keep"
            : mode === "keep-current-review-rest"
              ? "review"
              : "junk"
        })),
        input.cleanupProtectionByItemKey,
        input.vaultTags
      );
      await saveVaultTagsBatch(plan.inputs);
      setItemNoteMessage(
        `${mode === "keep-current-review-rest"
          ? "已保留当前这件，其余同名装备已标记为待定。"
          : "已保留当前这件，其余同名装备已标记为清理。"}${plan.protectedCount
            ? ` ${plan.protectedCount} 件受保护，已保持原状态。`
            : ""}`
      );
    } catch (error) {
      setItemNoteMessage(error instanceof Error ? error.message : "同名装备批量标记失败");
    }
  }

  function openBestSameNameItem(items: SameNameItemSummary[]) {
    const bestItem = selectBestSameNameItem(items);
    if (!bestItem) return;

    void openItemDetail(bestItem, {
      source_character_id: bestItem.source_character_id,
      is_vault_item: bestItem.is_vault_item,
      is_postmaster_item: bestItem.is_postmaster_item
    });
  }

  async function runItemWriteAction(
    label: string,
    run: () => Promise<ItemActionResult>,
    options?: ItemWriteActionOptions
  ): Promise<ItemWriteActionOutcome> {
    const publishMessage = (message: string) => {
      if (options?.feedbackScope !== "detail") {
        input.setItemActionMessage(message);
      }
    };
    const publishProgress = (phase: "submitting" | "refreshing", message: string) => {
      publishMessage(message);
      options?.onProgress?.(phase, message);
    };

    if (!selectedItem || !input.accountSummary) {
      return { ok: false, refreshed: false, message: "装备详情已关闭或账号数据不可用。" };
    }
    if (!selectedItem.instance_id) {
      const message = "这个物品没有实例 ID，不能执行 Bungie 写操作。";
      publishMessage(message);
      return { ok: false, refreshed: false, message };
    }
    if (!selectedActionCharacterId) {
      const message = "请先选择目标角色。";
      publishMessage(message);
      return { ok: false, refreshed: false, message };
    }
    input.setIsRunningItemAction(true);
    const actionStartedAt = performance.now();
    const fallbackOperationId = createWriteActionOperationId();
    const debugAction = resolveWriteActionLogType(options?.expectedAccountPatch, label);
    const debugBase = {
      action: debugAction,
      item_name: selectedItem.name,
      item_instance_id: selectedItem.instance_id,
      character_id: selectedActionCharacterId
    } as const;
    const submittingMessage = `${label}正在提交到 Bungie...`;
    publishProgress("submitting", submittingMessage);
    if (options?.expectedAccountPatch) {
      input.setAccountOperationFeedback({
        tone: "pending",
        phase: "submitting",
        itemInstanceIds: [options.expectedAccountPatch.item_instance_id],
        message: submittingMessage
      });
    }
    setItemShareMessage("");

    try {
      const result = await run();
      const operationId = result.diagnostics?.operation_id ?? fallbackOperationId;
      const accountPatch = result.account_patch ?? options?.expectedAccountPatch;
      if (accountPatch) {
        input.applyAcceptedAccountActionPatches([accountPatch]);
        recordWriteActionDebug({
          ...debugBase,
          operation_id: operationId,
          phase: "account-patch-applied",
          elapsed_ms: performance.now() - actionStartedAt,
          reflected: true,
          message: "Bungie 写接口已受理，账号 Store 已提交单件局部变化"
        });
        const message = result.message;
        publishMessage(message);
        input.setAccountOperationFeedback({
          tone: "success",
          phase: "confirmed",
          itemInstanceIds: [accountPatch.item_instance_id],
          message
        });
        void input.diagnostics.loadActionLog().catch(() => undefined);
        return { ok: true, refreshed: false, message };
      }
      // 换 Perk：受理即权威。本地先落地，服务器什么时候跟上交给后台核对。
      const acceptedChanges = options?.acceptedSocketChanges;
      if (acceptedChanges?.changes.length) {
        const deferredIndexes = new Set(result.deferred_socket_indexes ?? []);
        const acceptedOnly = acceptedChanges.changes.filter(
          (change) => !deferredIndexes.has(change.socket_index)
        );
        if (acceptedOnly.length) {
          applyAcceptedSocketPlugsToDetail(acceptedChanges.instance_id, acceptedOnly);
        }
        const mismatches = describeSocketPlugResponseMismatches({
          intended: acceptedOnly,
          fromResponse: result.accepted_socket_plugs
        });
        if (mismatches.length) {
          recordWriteActionDebug({
            ...debugBase,
            operation_id: operationId,
            phase: "socket-plug-response-mismatch",
            elapsed_ms: performance.now() - actionStartedAt,
            message: mismatches.join("；")
          });
        }
        const message = acceptedOnly.length < acceptedChanges.changes.length
          ? result.message
          : "武器配置更改已提交。";
        if (!acceptedOnly.length) {
          // 一条都没被收下：既不红也不绿。Bungie 只是说这件装备忙，不是判我们失败（见 T80）。
          publishMessage(message);
          input.setAccountOperationFeedback({
            tone: "pending",
            phase: "submitting",
            itemInstanceIds: [acceptedChanges.instance_id],
            message
          });
          void input.diagnostics.loadActionLog().catch(() => undefined);
          return { ok: false, refreshed: false, deferred: true, message };
        }
        // 只说「提交了」。受理之后服务器认没认，这里不知道，面板也不替它说（见 T78）。
        publishMessage(message);
        input.setAccountOperationFeedback({
          tone: "success",
          phase: "confirmed",
          itemInstanceIds: [acceptedChanges.instance_id],
          message
        });
        startSocketPlugBackgroundVerification({
          operationId,
          debugBase,
          verification: options?.backgroundVerification
        });
        void input.diagnostics.loadActionLog().catch(() => undefined);
        return { ok: true, refreshed: true, message };
      }
      closeSelectedItemDetail();
      publishMessage(`${result.message} 页面会在下次账号同步时校准。`);
      void input.diagnostics.loadActionLog().catch(() => undefined);
      return {
        ok: true,
        refreshed: false,
        message: `${result.message} 页面会在下次账号同步时校准。`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : `${label}失败`;
      if (options?.expectedAccountPatch) {
        input.setAccountOperationFeedback({
          tone: "error",
          phase: "failed",
          itemInstanceIds: [options.expectedAccountPatch.item_instance_id],
          message
        });
      }
      if (options?.keepDetailOpen) {
        publishProgress("refreshing", "操作未完成，正在读取服务器当前配置...");
        await refreshSelectedItemDetail().catch(() => undefined);
      }
      publishMessage(message);
      await Promise.allSettled([input.diagnostics.loadActionLog()]);
      return { ok: false, refreshed: false, message };
    } finally {
      input.setIsRunningItemAction(false);
    }
  }

  /**
   * 写入受理之后，在后台看服务器什么时候跟上。
   *
   * **这不是门闸。** 它不阻塞 `runItemWriteAction` 的返回、不报错、也绝不把读到的旧值写回界面
   * （读回走 `refreshSelectedItemDetail({ mode: "probe" })`，不合并、不置加载态）。
   * 实测 Bungie 的写入传播延迟可以超过 26 秒、几分钟才收敛，所以台阶按这个量级铺，
   * 而不是拿十几秒去判人家失败 —— 那是「写入成功，详情同步失败」这条假报的来源（见 T77）。
   *
   * **它也不改界面文案。** 对上、没对上，都只是留痕：面板说的是「已提交」，不是「服务器认了」。
   *
   * 留痕：对上时只有一条 `verification-complete`，不产生噪声；没对上时每次补一条
   * `verification-read`，写清「插槽 2：期望 X，读到 Y」。
   */
  function startSocketPlugBackgroundVerification(input: {
    operationId: string;
    debugBase: { action: ActionLogType; item_name?: string; item_instance_id?: string; character_id?: string };
    verification?: {
      verify: (detail: AccountItemDetail) => boolean;
      describeAttempt?: (detail: AccountItemDetail) => RefreshedItemVerification;
    };
  }): void {
    const verification = input.verification;
    if (!verification) return;
    void refreshItemDetailUntilVerified({
      refresh: () => refreshSelectedItemDetail({ mode: "probe" }),
      verify: verification.verify,
      describeAttempt: verification.describeAttempt,
      // 留痕挂在这次写操作上：读回读到了什么，只有这里知道。
      trace: { operation_id: input.operationId, ...input.debugBase }
    }).catch(() => undefined);
  }

  async function refreshItemDetailUntilVerified(input: {
    refresh: () => Promise<AccountItemDetail | null>;
    verify: (detail: AccountItemDetail) => boolean;
    describeAttempt?: (detail: AccountItemDetail) => RefreshedItemVerification;
    trace?: {
      operation_id: string;
      action: ActionLogType;
      item_name?: string;
      item_instance_id?: string;
      character_id?: string;
    };
  }): Promise<void> {
    const retryDelays = SOCKET_PLUG_VERIFY_DELAYS;
    const totalAttempts = retryDelays.length;
    const traceBase = input.trace;
    for (let index = 0; index < totalAttempts; index += 1) {
      const attempt = index + 1;
      const delay = retryDelays[index];
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      const startedAt = performance.now();
      // 后台探针读失败（断网、限流）不是用户的事：记一条继续等，别把写入说成失败。
      const detail = await input.refresh().catch(() => null);
      const matched = Boolean(detail) && input.verify(detail as AccountItemDetail);
      if (matched) {
        if (traceBase) {
          recordWriteActionDebug({
            ...traceBase,
            phase: "verification-complete",
            attempt,
            total_attempts: totalAttempts,
            duration_ms: performance.now() - startedAt,
            reflected: true,
            ok: true
          });
        }
        return;
      }
      if (traceBase) {
        const description = detail && input.describeAttempt ? input.describeAttempt(detail) : undefined;
        recordWriteActionDebug({
          ...traceBase,
          phase: "verification-read",
          attempt,
          total_attempts: totalAttempts,
          expected_count: description?.expected_count,
          matched_count: description?.matched_count,
          duration_ms: performance.now() - startedAt,
          reflected: false,
          ok: Boolean(detail),
          message: description?.message ?? (detail ? "读回的配置与期望不一致" : "这次读取没有返回详情")
        });
      }
    }
    if (traceBase) {
      recordWriteActionDebug({
        ...traceBase,
        phase: "verification-complete",
        attempt: totalAttempts,
        total_attempts: totalAttempts,
        reflected: false,
        // `ok: false` 只描述**这一次核对**没观察到，不是「写入失败」。同一个窗口里读不到
        // 而写入其实落地了是常态（2026-09-18 的 op `63e6a903` 就是），别拿它当判据。
        ok: false,
        message: `窗口内 ${totalAttempts} 次核对都没有观察到期望的配置（窗口内未观察到，不代表写入失败）`
      });
    }
  }

  function recordWriteActionDebug(event: ActionDebugTraceInput): void {
    writeActionDebugQueueRef.current = writeActionDebugQueueRef.current
      .catch(() => undefined)
      .then(() => api.recordActionDebugTrace(event))
      .catch((error) => {
        console.warn("写操作诊断日志记录失败：", error);
      });
  }

  function resolveWriteActionLogType(
    patch: AccountItemActionPatch | undefined,
    label: string
  ): ActionLogType {
    if (patch?.kind === "equip") return "equip";
    if (patch?.kind === "transfer") return "transfer";
    if (patch?.kind === "postmaster-pull") return "postmaster-pull";
    if (patch?.kind === "lock") return "set-lock";
    return label.includes("Perk") || label.includes("配置")
      ? "insert-socket-plug"
      : "equip";
  }

  return {
    selectedItem,
    selectedSameNameItems,
    selectedActionCharacterId,
    itemDetailLoadingKey,
    itemDetailError,
    communityRecommendations,
    communityInstanceEvidence,
    communityRecommendationError,
    isCommunityRecommendationsLoading,
    selectedItemAvailability,
    selectedItemVersions,
    isSelectedItemVersionsLoading,
    itemAiResult,
    itemAiError,
    itemNoteDraft,
    itemNoteMessage,
    itemShareMessage,
    isGeneratingItemAi,
    openItemDetail,
    loadSelectedItemFullDetail,
    loadSelectedItemDefinition,
    closeSelectedItemDetail,
    setItemNoteDraft,
    setSelectedActionCharacterId,
    generateItemAiAdvice,
    copySelectedItemSummary,
    copySelectedItemChatGuide,
    saveSelectedItemNote,
    saveSelectedItemTag,
    copyTargetInsight,
    copySameNameLocator,
    copyItemActionPlanText,
    applySameNameBatchTags,
    applySameNameCurrentKeepTags,
    openBestSameNameItem,
    refreshSelectedItemDetail,
    activateItemDetailSection,
    runItemWriteAction
  };
}

function buildCommunityRecommendationCacheKey(
  detailScopeKey: string,
  recommendationRevision: string | undefined,
  itemHash: number,
  itemName: string
): string {
  return [
    detailScopeKey,
    recommendationRevision?.trim() || "recommendation-revision-pending",
    itemHash,
    itemName.trim()
  ].join("\u0000");
}

function touchBoundedCache<TKey, TValue>(
  cache: Map<TKey, TValue>,
  key: TKey,
  value: TValue,
  limit: number
): void {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > limit) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) return;
    cache.delete(oldest);
  }
}

function scheduleWhenRendererIdle(
  callback: () => void,
  timeout: number,
  fallbackDelay: number
): void {
  const idleScheduler = (globalThis as typeof globalThis & {
    requestIdleCallback?: (handler: () => void, options?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (idleScheduler) {
    idleScheduler(callback, { timeout });
    return;
  }
  globalThis.setTimeout(callback, fallbackDelay);
}
