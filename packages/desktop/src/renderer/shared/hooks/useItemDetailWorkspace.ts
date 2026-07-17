import { useMemo, useState } from "react";
import { api } from "../../api/client";
import type { AccountItemSummary, AccountSummary, D2Config, DimWishlist, ItemActionResult, ItemAiAdviceResult, ItemSearchResult, LibraryHistory, LocalTargetRules, VaultTags, VaultTagValue, WeaponRecommendation } from "../../api/types";
import type { LiveItemAvailabilityEntry } from "@d2-tools/core/items/liveAvailability";
import type {
  PersonalWeaponKnowledgeEntry,
  SavePersonalWeaponKnowledgeInput
} from "@d2-tools/core/community-perks/personalWeaponKnowledge";
import {
  buildWishlistInsightText,
  collectSelectedSameNameItems,
  getItemKey,
  selectBestSameNameItem,
  selectedItemToAccountItem,
  type SameNameItemSummary
} from "@d2-tools/app/items";
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
  localTargetRules: LocalTargetRules;
  diagnostics: DiagnosticsBridge;
  setAccountError: (message: string) => void;
  setIsRunningItemAction: (isRunning: boolean) => void;
  setItemActionMessage: (message: string) => void;
  loadAccountSummary: () => Promise<void>;
  onRecentHistoryChanged: (history: LibraryHistory) => void;
}) {
  const [communityRecommendations, setCommunityRecommendations] = useState<WeaponRecommendation | null>(null);
  const [communityRecommendationError, setCommunityRecommendationError] = useState("");
  const [isCommunityRecommendationsLoading, setIsCommunityRecommendationsLoading] = useState(false);
  const [personalWeaponKnowledge, setPersonalWeaponKnowledge] = useState<PersonalWeaponKnowledgeEntry[]>([]);
  const [selectedItemAvailability, setSelectedItemAvailability] = useState<LiveItemAvailabilityEntry | null>(null);
  const [selectedItemVersions, setSelectedItemVersions] = useState<ItemSearchResult[]>([]);
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
      setCommunityRecommendationError("");
      setIsCommunityRecommendationsLoading(true);
      setPersonalWeaponKnowledge([]);
      setSelectedItemAvailability(null);
      setSelectedItemVersions("description" in item && "source" in item ? [item] : []);
      void api.getCommunityPerkRecommendations(item.hash, { item_name: item.name })
        .then((result) => {
          if (!isCurrent()) return;
          setCommunityRecommendations(result);
        })
        .catch((error) => {
          if (!isCurrent()) return;
          console.warn("社区推荐加载失败：", error);
          setCommunityRecommendationError("社区推荐读取失败，已保留 DIM 愿望单和本地目标判断。");
        })
        .finally(() => {
          if (!isCurrent()) return;
          setIsCommunityRecommendationsLoading(false);
        });
      void api.getPersonalWeaponKnowledge(item.name)
        .then((table) => {
          if (!isCurrent()) return;
          setPersonalWeaponKnowledge(table.entries);
        })
        .catch((error) => {
          if (!isCurrent()) return;
          console.warn("我的推荐读取失败：", error);
        });
      void api.getLiveItemAvailability([item.hash])
        .then((availability) => {
          if (!isCurrent()) return;
          setSelectedItemAvailability(availability.items[String(item.hash)] ?? null);
        })
        .catch((error) => {
          if (!isCurrent()) return;
          console.warn("实时获取状态读取失败：", error);
        });
      void api.searchItems(item.name)
        .then((results) => {
          if (!isCurrent()) return;
          const versions = results
            .filter((candidate) => candidate.group_key === "weapons" && candidate.name.trim() === item.name.trim())
            .filter((candidate, index, all) => all.findIndex((entry) => entry.hash === candidate.hash) === index);
          setSelectedItemVersions(versions);
        })
        .catch((error) => {
          if (!isCurrent()) return;
          console.warn("同名版本读取失败：", error);
        });
    },
    onRecentHistoryChanged: input.onRecentHistoryChanged
  });

  const selectedSameNameItems: SameNameItemSummary[] = useMemo(() => (
    collectSelectedSameNameItems(input.accountSummary, selectedItem)
  ), [input.accountSummary, selectedItem]);

  async function generateItemAiAdvice(userKnowledge = "", allowExternalSearch = false) {
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
          armor_stat_breakdown: selectedItem.armor_stat_breakdown,
          socket_plugs: selectedItem.socket_plugs ?? [],
          description: selectedItem.description,
          note: selectedItem.item_key ? input.vaultTags.items[selectedItem.item_key]?.note : undefined
        },
        tags: input.vaultTags,
        user_knowledge: userKnowledge.trim() || undefined,
        personal_knowledge: personalWeaponKnowledge,
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
          perk_pool: (selectedItem.perks ?? []).map((group) => ({
            socket_index: group.socket_index,
            names: group.plugs.map((plug) => plug.name)
          })),
          same_hash_instances: selectedSameNameItems.map((item) => ({
            location: item.source_label ?? item.source_kind,
            power: item.power,
            plugs: item.socket_plugs.map((plug) => plug.name)
          }))
        } : undefined
      }));
    } catch (error) {
      setItemAiError(error instanceof Error ? error.message : "AI 装备解读失败");
    } finally {
      setIsGeneratingItemAi(false);
    }
  }

  async function saveConfirmedPersonalWeaponKnowledge(
    draft: SavePersonalWeaponKnowledgeInput["entry"]
  ): Promise<boolean> {
    if (!selectedItem) return false;
    const summary = [
      `武器：${draft.weapon_name || selectedItem.name}`,
      `模式：${draft.mode.toUpperCase()}`,
      `推荐：${draft.title}`,
      draft.perk_options.length
        ? `Perk：${draft.perk_options.flatMap((option) => option.names).join(" / ")}`
        : "",
      draft.masterwork_names.length ? `大师杰作：${draft.masterwork_names.join(" / ")}` : "",
      draft.mod_names.length ? `模组：${draft.mod_names.join(" / ")}` : "",
      draft.reason ? `理由：${draft.reason}` : "",
      draft.external_url ? `外部依据：${draft.external_url}` : "",
      "",
      "确认保存到我的推荐吗？保存后将优先于应用推荐。"
    ].filter(Boolean).join("\n");
    if (!window.confirm(summary)) return false;

    try {
      const table = await api.savePersonalWeaponKnowledge({
        confirmed: true,
        entry: {
          ...draft,
          weapon_name: draft.weapon_name || selectedItem.name,
          weapon_hash: draft.weapon_hash ?? selectedItem.hash
        }
      });
      setPersonalWeaponKnowledge(table.entries.filter((entry) => (
        entry.weapon_name.trim().toLocaleLowerCase() === selectedItem.name.trim().toLocaleLowerCase()
      )));
      setItemNoteMessage("已保存到我的推荐。");
      return true;
    } catch (error) {
      setItemAiError(error instanceof Error ? error.message : "我的推荐保存失败");
      return false;
    }
  }

  async function setPersonalWeaponKnowledgeEnabled(id: string, enabled: boolean): Promise<void> {
    try {
      const table = await api.setPersonalWeaponKnowledgeEnabled(id, enabled);
      setPersonalWeaponKnowledge(table.entries.filter((entry) => (
        selectedItem && entry.weapon_name.trim().toLocaleLowerCase() === selectedItem.name.trim().toLocaleLowerCase()
      )));
    } catch (error) {
      setItemAiError(error instanceof Error ? error.message : "我的推荐更新失败");
    }
  }

  async function deletePersonalWeaponKnowledge(id: string): Promise<void> {
    if (!window.confirm("确认删除这条我的推荐吗？删除后将恢复使用应用推荐。")) return;
    try {
      const table = await api.deletePersonalWeaponKnowledge(id);
      setPersonalWeaponKnowledge(table.entries.filter((entry) => (
        selectedItem && entry.weapon_name.trim().toLocaleLowerCase() === selectedItem.name.trim().toLocaleLowerCase()
      )));
    } catch (error) {
      setItemAiError(error instanceof Error ? error.message : "我的推荐删除失败");
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
    closeItemDetailCore();
    setCommunityRecommendations(null);
    setCommunityRecommendationError("");
    setIsCommunityRecommendationsLoading(false);
    setPersonalWeaponKnowledge([]);
    setSelectedItemAvailability(null);
    setSelectedItemVersions([]);
  }

  async function saveSelectedItemTag(tag: VaultTagValue) {
    if (!selectedItem) return;

    setItemNoteMessage("");
    setItemShareMessage("");

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

  async function copyWishlistInsight() {
    if (!selectedItem) return;
    const text = buildWishlistInsightText({
      selectedItem,
      vaultTags: input.vaultTags,
      importedWishlist: input.importedWishlist,
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
      await saveVaultTagsBatch(buildDuplicateGroupBatchTagPlan(group, mode));
      setItemNoteMessage(
        mode === "keep-best-review-rest"
          ? "已将推荐项保留，其余标记为关注。"
          : mode === "keep-best-junk-rest"
            ? "已将推荐项保留，其余标记为可清理。"
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
      await Promise.allSettled([input.diagnostics.loadActionLog(), input.loadAccountSummary()]);
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
    communityRecommendationError,
    isCommunityRecommendationsLoading,
    personalWeaponKnowledge,
    selectedItemAvailability,
    selectedItemVersions,
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
    saveConfirmedPersonalWeaponKnowledge,
    setPersonalWeaponKnowledgeEnabled,
    deletePersonalWeaponKnowledge,
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
