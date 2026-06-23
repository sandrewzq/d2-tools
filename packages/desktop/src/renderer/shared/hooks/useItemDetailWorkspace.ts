import { useMemo, useState } from "react";
import { evaluateWishlistRoll } from "@d2-tools/core/analysis/wishlist";
import {
  api,
  type AccountItemSummary,
  type AccountSummary,
  type D2Config,
  type DimWishlist,
  type ItemActionResult,
  type ItemAiAdviceResult,
  type LibraryHistory,
  type VaultTags,
  type VaultTagValue,
  type WeaponRecommendation
} from "../../api/client";
import {
  buildDuplicateGroupBatchTagPlan,
  buildVaultCleanupLocatorText,
  buildVaultDuplicateSummary
} from "../domain/vault/vaultCleanup";
import { buildItemChatGuideText, buildItemShareText } from "../../utils/itemShare";
import {
  getAllKnownAccountItemsWithSource
} from "../domain/loadouts/loadoutSources";
import {
  getItemKey,
  selectedItemToAccountItem,
  useItemDetail,
  type SameNameItemSummary
} from "./useItemDetail";

type DiagnosticsBridge = {
  aiSettings: { enable_lightgg: boolean };
  setWriteActionsEnabled: (enabled: boolean) => void;
  loadActionLog: () => Promise<void>;
};

export function useItemDetailWorkspace(input: {
  accountSummary: AccountSummary | null;
  vaultTags: VaultTags;
  setVaultTags: (tags: VaultTags) => void;
  importedWishlist: DimWishlist | null;
  diagnostics: DiagnosticsBridge;
  setAccountError: (message: string) => void;
  setIsRunningItemAction: (isRunning: boolean) => void;
  setItemActionMessage: (message: string) => void;
  loadAccountSummary: () => Promise<void>;
  onRecentHistoryChanged: (history: LibraryHistory) => void;
}) {
  const [communityRecommendations, setCommunityRecommendations] = useState<WeaponRecommendation | null>(null);
  const [isCommunityRecommendationsLoading, setIsCommunityRecommendationsLoading] = useState(false);
  const [itemAiResult, setItemAiResult] = useState<ItemAiAdviceResult | null>(null);
  const [itemAiError, setItemAiError] = useState("");
  const [itemNoteDraft, setItemNoteDraft] = useState("");
  const [itemNoteMessage, setItemNoteMessage] = useState("");
  const [itemShareMessage, setItemShareMessage] = useState("");
  const [isGeneratingItemAi, setIsGeneratingItemAi] = useState(false);
  const [selectedActionCharacterId, setSelectedActionCharacterId] = useState("");

  const {
    selectedItem,
    itemDetailLoadingKey,
    itemDetailError,
    openItemDetail,
    closeSelectedItemDetail: closeItemDetailCore
  } = useItemDetail({
    onOpenStart: ({ item, source, itemKey, isCurrent }) => {
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
      setCommunityRecommendations(null);
      setIsCommunityRecommendationsLoading(true);
      void api.getCommunityPerkRecommendations(item.hash, { item_name: item.name })
        .then((result) => {
          if (!isCurrent()) return;
          setCommunityRecommendations(result);
        })
        .catch((error) => {
          console.warn("社区推荐加载失败：", error);
        })
        .finally(() => {
          if (!isCurrent()) return;
          setIsCommunityRecommendationsLoading(false);
        });
    },
    onRecentHistoryChanged: input.onRecentHistoryChanged
  });

  const selectedAsAccountItem = selectedItem ? selectedItemToAccountItem(selectedItem) : null;
  const selectedSameNameItems: SameNameItemSummary[] = useMemo(() => (
    selectedAsAccountItem && input.accountSummary
      ? getAllKnownAccountItemsWithSource(input.accountSummary)
        .filter((item) => item.name.trim() === selectedAsAccountItem.name.trim())
      : []
  ), [input.accountSummary, selectedAsAccountItem]);

  async function generateItemAiAdvice() {
    if (!selectedItem?.group_key) return;

    setIsGeneratingItemAi(true);
    setItemAiError("");
    setItemShareMessage("");

    try {
      setItemAiResult(await api.generateItemAiAdvice({
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
          socket_plugs: selectedItem.socket_plugs,
          description: selectedItem.description,
          note: selectedItem.item_key ? input.vaultTags.items[selectedItem.item_key]?.note : undefined
        },
        tags: input.vaultTags
      }));
    } catch (error) {
      setItemAiError(error instanceof Error ? error.message : "AI 装备解读失败");
    } finally {
      setIsGeneratingItemAi(false);
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
      const tags = await api.saveVaultNote({
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
    closeItemDetailCore();
    setCommunityRecommendations(null);
    setIsCommunityRecommendationsLoading(false);
  }

  async function saveSelectedItemTag(tag: VaultTagValue) {
    if (!selectedItem) return;

    setItemNoteMessage("");
    setItemShareMessage("");

    try {
      const tags = await api.saveVaultTag({
        item_key: selectedItem.item_key,
        tag
      });
      input.setVaultTags(tags);
      setItemNoteMessage(tag === "none" ? "已清除本地标记" : "已更新本地标记");
    } catch (error) {
      setItemNoteMessage(error instanceof Error ? error.message : "本地标记保存失败");
    }
  }

  async function copyWishlistInsight() {
    if (!selectedItem) return;
    const accountItem = selectedItemToAccountItem(selectedItem);
    if (!accountItem) return;

    const wishlist = evaluateWishlistRoll({
      ...accountItem,
      socket_plugs: accountItem.socket_plugs ?? []
    }, input.importedWishlist ?? undefined);
    if (!wishlist.matched) return;

    const localTag = input.vaultTags.items[selectedItem.item_key]?.tag ?? "none";
    const text = [
      `${selectedItem.name} / DIM 愿望单命中`,
      `标签：${wishlist.labels.join(" / ")}`,
      `本地标记：${formatVaultTagLabel(localTag)}`,
      "",
      "命中原因",
      ...wishlist.reasons.map((reason, index) => `${index + 1}. ${reason}`),
      "",
      `说明：${wishlist.disclaimer}`
    ].join("\n");

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
      input.setVaultTags(await api.saveVaultTagsBatch(inputs));
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
      await saveVaultTagsBatch(buildDuplicateGroupBatchTagPlan(group, mode));
      setItemNoteMessage(
        mode === "keep-best-review-rest"
          ? "已将最高分保留，其余标记为关注。"
          : mode === "keep-best-junk-rest"
            ? "已将最高分保留，其余标记为可清理。"
            : "已清除这组同名装备的本地标记。"
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
      await saveVaultTagsBatch(
        items.map((item) => ({
          item_key: getItemKey(item),
          tag: getItemKey(item) === currentItemKey
            ? "keep"
            : mode === "keep-current-review-rest"
              ? "review"
              : "junk"
        }))
      );
      setItemNoteMessage(
        mode === "keep-current-review-rest"
          ? "已保留当前这件，其余同名装备已标记为关注。"
          : "已保留当前这件，其余同名装备已标记为可清理。"
      );
    } catch (error) {
      setItemNoteMessage(error instanceof Error ? error.message : "同名装备批量标记失败");
    }
  }

  function openBestSameNameItem(items: SameNameItemSummary[]) {
    const bestItem = [...items].sort((left, right) =>
      Number(Boolean(right.locked)) - Number(Boolean(left.locked))
    )[0];
    if (!bestItem) return;

    void openItemDetail(bestItem, {
      source_character_id: bestItem.source_character_id,
      is_vault_item: bestItem.is_vault_item,
      is_postmaster_item: bestItem.is_postmaster_item
    });
  }

  async function runItemWriteAction(
    label: string,
    run: () => Promise<ItemActionResult>
  ) {
    if (!selectedItem || !input.accountSummary) return;

    let latestConfig: D2Config;
    try {
      latestConfig = await api.getConfig();
      input.diagnostics.setWriteActionsEnabled(latestConfig.features.write_actions_enabled);
    } catch (error) {
      input.setItemActionMessage(error instanceof Error ? error.message : "读取写操作配置失败");
      return;
    }

    if (!latestConfig.features.write_actions_enabled) {
      input.setItemActionMessage("d2-tools 本地写操作开关未开启。请到左侧“设置”页开启“允许单件装备写操作”。");
      return;
    }
    if (!selectedItem.instance_id) {
      input.setItemActionMessage("这个物品没有实例 ID，不能执行 Bungie 写操作。");
      return;
    }
    if (!selectedActionCharacterId) {
      input.setItemActionMessage("请先选择目标角色。");
      return;
    }
    if (!window.confirm(`确认要${label}${selectedItem.name}吗？`)) {
      return;
    }

    input.setIsRunningItemAction(true);
    input.setItemActionMessage(`${label}执行中...`);
    setItemShareMessage("");

    try {
      const result = await run();
      input.setItemActionMessage(result.message);
      closeSelectedItemDetail();
      void Promise.all([input.loadAccountSummary(), input.diagnostics.loadActionLog()]).catch((error) => {
        input.setAccountError(error instanceof Error ? error.message : "操作完成，但刷新账号数据失败");
      });
    } catch (error) {
      input.setItemActionMessage(error instanceof Error ? error.message : `${label}失败`);
      await input.diagnostics.loadActionLog();
    } finally {
      input.setIsRunningItemAction(false);
    }
  }

  return {
    selectedItem,
    selectedSameNameItems,
    selectedActionCharacterId,
    itemDetailLoadingKey,
    itemDetailError,
    communityRecommendations,
    isCommunityRecommendationsLoading,
    itemAiResult,
    itemAiError,
    itemNoteDraft,
    itemNoteMessage,
    itemShareMessage,
    isGeneratingItemAi,
    openItemDetail,
    closeSelectedItemDetail,
    setItemNoteDraft,
    setSelectedActionCharacterId,
    generateItemAiAdvice,
    copySelectedItemSummary,
    copySelectedItemChatGuide,
    saveSelectedItemNote,
    saveSelectedItemTag,
    copyWishlistInsight,
    copySameNameLocator,
    copyItemActionPlanText,
    applySameNameBatchTags,
    applySameNameCurrentKeepTags,
    openBestSameNameItem,
    runItemWriteAction
  };
}

function formatVaultTagLabel(tag: VaultTagValue): string {
  if (tag === "keep") return "保留";
  if (tag === "review") return "关注";
  if (tag === "junk") return "可清理";
  return "未标记";
}
