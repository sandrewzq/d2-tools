import { useEffect, useRef, useState } from "react";
import { scoreVaultItem } from "@d2-tools/core/analysis/scoring";
import { evaluateWishlistRoll } from "@d2-tools/core/analysis/wishlist";
import { parseDimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import { createTransferQueue } from "@d2-tools/core/actions/transferQueue";
import { createFarmingModePlan } from "@d2-tools/core/actions/farmingMode";
import { analyzeLoadoutTemplate, suggestArmorStatSets } from "@d2-tools/core/loadouts/analysis";
import {
  api,
  type AccountItemSummary,
  type AccountItemPlugSummary,
  type AccountSummary,
  type ActionLogEntry,
  type ActivityHistorySummary,
  type BatchItemActionResult,
  type D2Config,
  type DailySummary,
  type DimWishlist,
  type ItemActionResult,
  type ItemAiAdviceResult,
  type ItemDefinitionDetail,
  type ItemSourceSummary,
  type ItemSearchResult,
  type LibraryHistory,
  type LoadoutTemplate,
  type PerkSearchResult,
  type StartupState,
  type VaultItemMatchInfo,
  type VaultTags,
  type VaultTagValue,
  type WeaponRecommendation
} from "../api/client";
import { AiSettingsPanel } from "../components/AiSettingsPanel";
import { AiAnalysisPanel } from "../components/AiAnalysisPanel";
import { isAiSettingsConfigured } from "../components/aiSettings";
import { buildDiagnosticRows, DiagnosticsPanel } from "../components/DiagnosticsPanel";
import { ShellLayout, type ShellPageKey } from "../components/ShellLayout";
import { StatusOverview } from "../components/StatusOverview";
import {
  buildDuplicateGroupBatchTagPlan,
  buildVaultCleanupLocatorText,
  buildVaultDuplicateSummary,
  VaultPanel
} from "../components/VaultPanel";
import { buildItemChatGuideText, buildItemShareText } from "../utils/itemShare";
import {
  buildDailyShareText,
  buildWeeklyDigestSections,
  buildWeeklyFocusText,
  formatDailySourceStatus
} from "../utils/dailyShare";
import { groupAccountItemsBySlot, type AccountSlotCategory } from "../utils/accountSlots";
import {
  createHighestPowerEquipPlan,
  createHighestPowerExecutionPlan
} from "../utils/highestPower";
import { buildSameNameSourceStats } from "../utils/sameName";
import {
  buildLibraryEquipmentFilterOptions,
  buildLibraryPerkGroupOptions,
  defaultLibraryEquipmentFilter,
  defaultLibraryPerkFilter,
  filterLibraryEquipmentItems,
  filterLibraryPerks,
  type LibraryEquipmentFilter,
  type LibraryPerkFilter,
  type LibraryViewMode
} from "../utils/libraryFilters";
import {
  buildMissingLoadoutTransferPlan,
  describeMissingLoadoutBlockedReason
} from "../utils/loadoutTransfer";
import {
  buildLoadoutItemStatus,
  summarizeLoadoutItemStatuses
} from "../utils/loadoutItemStatus";
import {
  buildLoadoutActionFeedbackKey,
  getLoadoutActionButtonLabel,
  LOADOUT_ACTION_FEEDBACK_TIMEOUT_MS,
  type LoadoutActionFeedbackState
} from "../utils/loadoutActionFeedback";
import { resolveItemTransferCharacterId } from "../utils/itemActions";

function formatCommunityMode(mode: "pve" | "pvp" | "general"): string {
  switch (mode) {
    case "pve": return "PvE";
    case "pvp": return "PvP";
    case "general": return "通用";
    default: return mode;
  }
}

export function HomePage(props: {
  state: StartupState;
  onConfigure: () => void;
  onConfigChanged: () => void;
  onLoginComplete: () => void;
  onManifestInitialized: () => void;
}) {
  const [activePage, setActivePage] = useState<ShellPageKey>("home");
  const [loginMessage, setLoginMessage] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [manifestMessage, setManifestMessage] = useState("");
  const [manifestError, setManifestError] = useState("");
  const [isInitializingManifest, setIsInitializingManifest] = useState(false);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [vaultTags, setVaultTags] = useState<VaultTags>({ items: {} });
  const [accountError, setAccountError] = useState("");
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [hasAutoLoadedAccount, setHasAutoLoadedAccount] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SelectedItemDetail | null>(null);
  const [communityRecommendations, setCommunityRecommendations] = useState<WeaponRecommendation | null>(null);
  const [isCommunityRecommendationsLoading, setIsCommunityRecommendationsLoading] = useState(false);
  const [vaultCommunityMatch, setVaultCommunityMatch] = useState<Map<number, VaultItemMatchInfo>>(new Map());
  const [isVaultCommunityMatchLoading, setIsVaultCommunityMatchLoading] = useState(false);
  const [libraryCommunityMatch, setLibraryCommunityMatch] = useState<Map<number, VaultItemMatchInfo>>(new Map());
  const [itemDetailLoadingKey, setItemDetailLoadingKey] = useState("");
  const [itemDetailError, setItemDetailError] = useState("");
  const itemDetailCacheRef = useRef(new Map<number, ItemDefinitionDetail>());
  const itemDetailRequestKeyRef = useRef("");
  const [itemAiResult, setItemAiResult] = useState<ItemAiAdviceResult | null>(null);
  const [itemAiError, setItemAiError] = useState("");
  const [itemNoteDraft, setItemNoteDraft] = useState("");
  const [itemNoteMessage, setItemNoteMessage] = useState("");
  const [itemShareMessage, setItemShareMessage] = useState("");
  const [isGeneratingItemAi, setIsGeneratingItemAi] = useState(false);
  const [aiSettings, setAiSettings] = useState<D2Config["ai"]>({
    provider: "",
    api_key: "",
    model: "",
    base_url: "",
    enable_lightgg: false
  });
  const [libraryViewMode, setLibraryViewMode] = useState<LibraryViewMode>("equipment");
  const [items, setItems] = useState<ItemSearchResult[]>([]);
  const [perks, setPerks] = useState<PerkSearchResult[]>([]);
  const [equipmentFilters, setEquipmentFilters] = useState<LibraryEquipmentFilter>(defaultLibraryEquipmentFilter);
  const [perkFilters, setPerkFilters] = useState<LibraryPerkFilter>(defaultLibraryPerkFilter);
  const [equipmentSearchTouched, setEquipmentSearchTouched] = useState(false);
  const [perkSearchTouched, setPerkSearchTouched] = useState(false);
  const [libraryHistory, setLibraryHistory] = useState<LibraryHistory>({ recent: [], favorites: [] });
  const [aliasDraft, setAliasDraft] = useState("");
  const [aliasTargetDraft, setAliasTargetDraft] = useState("");
  const [aliasKind, setAliasKind] = useState<"item" | "perk">("item");
  const [aliasMessage, setAliasMessage] = useState("");
  const [loadoutTemplates, setLoadoutTemplates] = useState<LoadoutTemplate[]>([]);
  const [selectedLoadoutTemplateId, setSelectedLoadoutTemplateId] = useState("");
  const [compareLoadoutTemplateId, setCompareLoadoutTemplateId] = useState("");
  const [loadoutRenameDraft, setLoadoutRenameDraft] = useState("");
  const [showLoadoutDiffOnly, setShowLoadoutDiffOnly] = useState(true);
  const [loadoutMessage, setLoadoutMessage] = useState("");
  const [activitySummary, setActivitySummary] = useState<ActivityHistorySummary | null>(null);
  const [activityMessage, setActivityMessage] = useState("");
  const [activityError, setActivityError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [diagnosticDataDir, setDiagnosticDataDir] = useState("");
  const [diagnosticManifestVersion, setDiagnosticManifestVersion] = useState<string | undefined>();
  const [diagnosticError, setDiagnosticError] = useState("");
  const [isRefreshingDiagnostics, setIsRefreshingDiagnostics] = useState(false);
  const [writeActionsEnabled, setWriteActionsEnabled] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [isRunningItemAction, setIsRunningItemAction] = useState(false);
  const [itemActionMessage, setItemActionMessage] = useState("");
  const [loadoutActionFeedback, setLoadoutActionFeedback] = useState<Record<string, LoadoutActionFeedbackState>>({});
  const [selectedActionCharacterId, setSelectedActionCharacterId] = useState("");
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [dailyMessage, setDailyMessage] = useState("");
  const [dailyError, setDailyError] = useState("");
  const [isLoadingDaily, setIsLoadingDaily] = useState(false);
  const [actionLogResultFilter, setActionLogResultFilter] = useState<"all" | "success" | "failed">("all");
  const [actionLogTypeFilter, setActionLogTypeFilter] = useState<ActionLogEntry["action"] | "all">("all");
  const [wishlistImportDraft, setWishlistImportDraft] = useState("");
  const [wishlistImportMessage, setWishlistImportMessage] = useState("");
  const [importedWishlist, setImportedWishlist] = useState<DimWishlist | null>(null);
  const [dimToolsMessage, setDimToolsMessage] = useState("");
  const loadoutActionFeedbackTimersRef = useRef<Record<string, number>>({});

  async function refreshDiagnostics() {
    setIsRefreshingDiagnostics(true);
    setDiagnosticError("");

    try {
      const [config, manifest, log] = await Promise.all([
        api.getConfig(),
        api.getManifestStatus(),
        api.getActionLog()
      ]);
      setDiagnosticDataDir(config.data.data_dir);
      setDiagnosticManifestVersion(manifest.version);
      setAiSettings(config.ai);
      setWriteActionsEnabled(config.features.write_actions_enabled);
      setActionLog(log);
    } catch (error) {
      setDiagnosticError(error instanceof Error ? error.message : "状态诊断失败");
    } finally {
      setIsRefreshingDiagnostics(false);
    }
  }

  useEffect(() => {
    void refreshDiagnostics();
    void loadDailySummary();
    void loadLibraryHistory();
    void loadLoadoutTemplates();
    void loadPersistedWishlist();
  }, []);

  useEffect(() => {
    if (hasAutoLoadedAccount || props.state.nextStep !== "home") {
      return;
    }
    setHasAutoLoadedAccount(true);
    void loadAccountSummary();
  }, [hasAutoLoadedAccount, props.state.nextStep]);

  useEffect(() => () => {
    Object.values(loadoutActionFeedbackTimersRef.current).forEach((timer) => window.clearTimeout(timer));
    loadoutActionFeedbackTimersRef.current = {};
  }, []);

  useEffect(() => {
    if (libraryViewMode !== "equipment" || !items.length) {
      setLibraryCommunityMatch(new Map());
      return;
    }
    const uniqueHashes = [...new Set(items.map((item) => item.hash))];
    const inputs = uniqueHashes.map((hash) => ({ hash, socket_plugs: undefined }));
    api.matchCommunityVaultItems(inputs)
      .then((result) => {
        const map = new Map<number, VaultItemMatchInfo>();
        for (const item of result) {
          map.set(item.hash, { matched: item.matched, modes: item.modes });
        }
        setLibraryCommunityMatch(map);
      })
      .catch((error) => {
        console.warn("资料库社区推荐匹配失败：", error);
      });
  }, [libraryViewMode, items]);

  const isAiConfigured = isAiSettingsConfigured(aiSettings);

  function setSingleLoadoutActionFeedback(key: string, state: LoadoutActionFeedbackState) {
    const existingTimer = loadoutActionFeedbackTimersRef.current[key];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      delete loadoutActionFeedbackTimersRef.current[key];
    }

    setLoadoutActionFeedback((current) => {
      if (state === "idle") {
        if (!(key in current)) {
          return current;
        }
        const next = { ...current };
        delete next[key];
        return next;
      }
      return {
        ...current,
        [key]: state
      };
    });

    if (state === "success") {
      loadoutActionFeedbackTimersRef.current[key] = window.setTimeout(() => {
        setLoadoutActionFeedback((current) => {
          if (!(key in current)) {
            return current;
          }
          const next = { ...current };
          delete next[key];
          return next;
        });
        delete loadoutActionFeedbackTimersRef.current[key];
      }, LOADOUT_ACTION_FEEDBACK_TIMEOUT_MS);
    }
  }

  function handleAiSettingsSaved() {
    props.onConfigChanged();
    void refreshDiagnostics();
  }

  async function loadLibraryHistory() {
    try {
      setLibraryHistory(await api.getLibraryHistory());
    } catch {
      setLibraryHistory({ recent: [], favorites: [] });
    }
  }

  async function loadLoadoutTemplates() {
    try {
      applyLoadoutTemplates(await api.listLoadoutTemplates());
    } catch {
      applyLoadoutTemplates([]);
    }
  }

  function applyLoadoutTemplates(templates: LoadoutTemplate[]) {
    const currentSelectedId = selectedLoadoutTemplateId;
    const currentCompareId = compareLoadoutTemplateId;
    const nextSelected = templates.find((template) => template.id === currentSelectedId) ?? templates[0] ?? null;
    const nextCompare = templates.find((template) =>
      template.id === currentCompareId && template.id !== nextSelected?.id
    ) ?? templates.find((template) => template.id !== nextSelected?.id) ?? null;
    setLoadoutTemplates(templates);
    setSelectedLoadoutTemplateId(nextSelected?.id ?? "");
    setCompareLoadoutTemplateId(nextCompare?.id ?? "");
    setLoadoutRenameDraft(nextSelected?.name ?? "");
  }

  async function loadPersistedWishlist() {
    try {
      setImportedWishlist(await api.getDimWishlist());
    } catch {
      setImportedWishlist(null);
    }
  }

  async function loadDailySummary() {
    setIsLoadingDaily(true);
    setDailyError("");
    try {
      setDailySummary(await api.getDailySummary());
    } catch (error) {
      setDailyError(error instanceof Error ? error.message : "今日面板读取失败");
    } finally {
      setIsLoadingDaily(false);
    }
  }

  async function copyDailySummary() {
    if (!dailySummary) return;
    try {
      await navigator.clipboard.writeText(buildDailyShareText(dailySummary));
      setDailyMessage("已复制今日摘要");
    } catch {
      setDailyMessage("复制失败，请检查系统剪贴板权限");
    }
  }

  async function copyWeeklyFocus() {
    if (!dailySummary) return;
    try {
      await navigator.clipboard.writeText(buildWeeklyFocusText(dailySummary));
      setDailyMessage("已复制本周重点");
    } catch {
      setDailyMessage("复制失败，请检查系统剪贴板权限");
    }
  }

  async function copyActionDiagnostic(entry: ActionLogEntry) {
    try {
      await navigator.clipboard.writeText(buildActionDiagnosticText(entry));
      setSettingsMessage("已复制操作诊断");
    } catch {
      setSettingsError("澶嶅埗澶辫触锛岃妫€鏌ョ郴缁熷壀璐存澘鏉冮檺");
    }
  }

  async function loginBungie() {
    setIsLoggingIn(true);
    setLoginMessage("");
    setLoginError("");

    try {
      const result = await api.loginBungie();
      setLoginMessage(result.message);
      props.onLoginComplete();
      await refreshDiagnostics();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Bungie 登录失败");
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function initializeManifest() {
    setIsInitializingManifest(true);
    setManifestMessage("");
    setManifestError("");

    try {
      const status = await api.initializeManifest();
      setManifestMessage(`资料库已初始化：${status.version ?? "未知版本"}`);
      props.onManifestInitialized();
      await refreshDiagnostics();
    } catch (error) {
      setManifestError(error instanceof Error ? error.message : "资料库初始化失败");
    } finally {
      setIsInitializingManifest(false);
    }
  }

  async function loadAccountSummary() {
    setIsLoadingAccount(true);
    setAccountError("");

    try {
      const [summary, tags] = await Promise.all([api.getAccountSummary(), api.getVaultTags()]);
      setAccountSummary(summary);
      setVaultTags(tags);
      setSelectedCharacterId((current) => {
        if (current && summary.characters.some((character) => character.character_id === current)) {
          return current;
        }
        return summary.characters[0]?.character_id ?? "";
      });
      void loadActivitySummary(summary);
      void loadVaultCommunityMatch(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "账号数据读取失败";
      setAccountError(props.state.nextStep === "home"
        ? `登录可能已失效，请重新登录 Bungie。${message}`
        : message);
      setAccountSummary(null);
    } finally {
      setIsLoadingAccount(false);
    }
  }

  async function loadVaultCommunityMatch(summary: AccountSummary) {
    setIsVaultCommunityMatchLoading(true);
    try {
      const allItems = [
        ...summary.characters.flatMap((character) => [
          ...character.equipped_items,
          ...character.inventory_items,
          ...character.postmaster_items
        ]),
        ...summary.vault.items
      ];
      const inputs = allItems.map((item) => ({
        hash: item.hash,
        socket_plugs: item.socket_plugs?.map((plug) => ({ hash: plug.hash }))
      }));
      const result = await api.matchCommunityVaultItems(inputs);
      const map = new Map<number, VaultItemMatchInfo>();
      for (const item of result) {
        map.set(item.hash, { matched: item.matched, modes: item.modes });
      }
      setVaultCommunityMatch(map);
    } catch (error) {
      console.warn("社区推荐匹配失败：", error);
    } finally {
      setIsVaultCommunityMatchLoading(false);
    }
  }

  async function openItemDetail(item: AccountItemSummary | ItemSearchResult, source: SelectedItemSource = {}) {
    setItemDetailError("");
    setItemAiResult(null);
    setItemAiError("");
    setItemNoteMessage("");
    setItemShareMessage("");
    setItemActionMessage("");
    const itemKey = getItemKey(item);
    setItemNoteDraft(vaultTags.items[itemKey]?.note ?? "");
    const defaultCharacterId = source.source_character_id
      ?? accountSummary?.characters[0]?.character_id
      ?? "";
    setSelectedActionCharacterId(defaultCharacterId);
    itemDetailRequestKeyRef.current = itemKey;
    setItemDetailLoadingKey(itemKey);
    setSelectedItem(createSelectedItemPreview(item, source));
    setCommunityRecommendations(null);
    setIsCommunityRecommendationsLoading(true);
    void api.getCommunityPerkRecommendations(item.hash, { item_name: item.name })
      .then((result) => {
        if (itemDetailRequestKeyRef.current !== itemKey) return;
        setCommunityRecommendations(result);
      })
      .catch((error) => {
        console.warn("社区推荐加载失败：", error);
      })
      .finally(() => {
        if (itemDetailRequestKeyRef.current !== itemKey) return;
        setIsCommunityRecommendationsLoading(false);
      });

    void api.addRecentItem({ hash: item.hash, name: item.name, icon: item.icon })
      .then((history) => {
        setLibraryHistory(history);
      })
      .catch(() => {
        // Recent-item history is a convenience feature; item detail should still open if it cannot be saved.
      });

    const cachedDetail = itemDetailCacheRef.current.get(item.hash);
    if (cachedDetail) {
      setSelectedItem((current) => {
        if (!current || current.item_key !== itemKey) {
          return current;
        }
        return mergeSelectedItemDetail(current, cachedDetail);
      });
      setItemDetailLoadingKey((current) => current === itemKey ? "" : current);
      return;
    }

    try {
      const detail = await api.getItemDetail(item.hash);
      itemDetailCacheRef.current.set(item.hash, detail);
      if (itemDetailRequestKeyRef.current !== itemKey) {
        return;
      }
      setSelectedItem((current) => {
        if (!current || current.item_key !== itemKey) {
          return current;
        }
        return mergeSelectedItemDetail(current, detail);
      });
      setItemDetailLoadingKey((current) => current === itemKey ? "" : current);
    } catch (error) {
      setItemDetailError(error instanceof Error ? error.message : "物品详情读取失败");
    }
  }

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
          socket_plugs: selectedItem.socket_plugs,
          description: selectedItem.description,
          note: selectedItem.item_key ? vaultTags.items[selectedItem.item_key]?.note : undefined
        },
        tags: vaultTags
      }));
    } catch (error) {
      setItemAiError(error instanceof Error ? error.message : "AI 装备解读失败");
    } finally {
      setIsGeneratingItemAi(false);
    }
  }

  async function copySelectedItemSummary(score?: ItemAiAdviceResult["score"] | null) {
    if (!selectedItem) return;

    const tag = vaultTags.items[selectedItem.item_key]?.tag ?? "none";
    const note = vaultTags.items[selectedItem.item_key]?.note ?? itemNoteDraft;

    const text = buildItemShareText({
      item: selectedItem,
      score,
      tag,
      note,
      aiText: itemAiResult?.ai?.text
    });

    try {
      await navigator.clipboard.writeText(text);
      setItemShareMessage("已复制装备结论");
    } catch {
      setItemShareMessage("澶嶅埗澶辫触锛岃妫€鏌ョ郴缁熷壀璐存澘鏉冮檺");
    }
  }

  async function copySelectedItemChatGuide(score?: ItemAiAdviceResult["score"] | null) {
    if (!selectedItem) return;

    const tag = vaultTags.items[selectedItem.item_key]?.tag ?? "none";
    const note = vaultTags.items[selectedItem.item_key]?.note ?? itemNoteDraft;
    const text = buildItemChatGuideText({
      item: selectedItem,
      score,
      tag,
      note,
      aiText: itemAiResult?.ai?.text
    });

    try {
      await navigator.clipboard.writeText(text);
      setItemShareMessage("已复制群聊说明");
    } catch {
      setItemShareMessage("澶嶅埗澶辫触锛岃妫€鏌ョ郴缁熷壀璐存澘鏉冮檺");
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
      setVaultTags(tags);
      setItemNoteDraft(tags.items[selectedItem.item_key]?.note ?? "");
      setItemNoteMessage("备注已保存");
    } catch (error) {
      setItemNoteMessage(error instanceof Error ? error.message : "备注保存失败");
    }
  }

  function closeSelectedItemDetail() {
    itemDetailRequestKeyRef.current = "";
    setItemDetailLoadingKey("");
    setSelectedItem(null);
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
      setVaultTags(tags);
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
    }, importedWishlist ?? undefined);
    if (!wishlist.matched) return;

    const localTag = vaultTags.items[selectedItem.item_key]?.tag ?? "none";
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
      buildVaultCleanupLocatorText(items, vaultTags)
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setItemShareMessage("已复制同名定位清单");
    } catch {
      setItemShareMessage("复制失败，请检查系统剪贴板权限");
    }
  }

  async function searchItems() {
    setIsSearching(true);
    setSearchError("");
    if (libraryViewMode === "perks") {
      setPerkSearchTouched(true);
    } else {
      setEquipmentSearchTouched(true);
    }

    const activeQuery = libraryViewMode === "perks"
      ? perkFilters.query
      : equipmentFilters.query;

    try {
      if (libraryViewMode === "perks") {
        setPerks(await api.searchPerks(activeQuery));
        setItems([]);
      } else {
        setItems(await api.searchItems(activeQuery));
        setPerks([]);
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "搜索失败");
      setItems([]);
      setPerks([]);
    } finally {
      setIsSearching(false);
    }
  }

  async function saveAlias() {
    setAliasMessage("");
    setSearchError("");
    try {
      await api.saveItemAlias({
        alias: aliasDraft,
        target: aliasTargetDraft,
        kind: aliasKind
      });
      setAliasDraft("");
      setAliasTargetDraft("");
      setAliasMessage("别名已保存，下次搜索会自动命中。");
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "别名保存失败");
    }
  }

  async function addSelectedItemToFavorites(item: ItemSearchResult | PerkSearchResult) {
    try {
      setLibraryHistory(await api.addFavoriteItem({ hash: item.hash, name: item.name, icon: item.icon }));
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "收藏失败");
    }
  }

  async function removeFavorite(hash: number) {
    try {
      setLibraryHistory(await api.removeFavoriteItem(hash));
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "取消收藏失败");
    }
  }

  async function saveCharacterLoadout(character: AccountSummary["characters"][number]) {
    setLoadoutMessage("");
    try {
      const template = await api.createLoadoutTemplate({
        name: `${character.class_name} 光等 ${character.light ?? "-"}`,
        character_id: character.character_id,
        class_name: character.class_name,
        equipped_items: character.equipped_items
      });
      applyLoadoutTemplates(await api.listLoadoutTemplates());
      setLoadoutMessage(`宸蹭繚瀛樻湰鍦伴厤瑁呮ā鏉匡細${template.name}`);
    } catch (error) {
      setLoadoutMessage(error instanceof Error ? error.message : "配装模板保存失败");
    }
  }

  async function equipHighestPowerItems(character: AccountSummary["characters"][number]) {
    if (!accountSummary) return;

    const plan = createHighestPowerEquipPlan({
      character,
      vaultItems: accountSummary.vault.items
    });
    const executionPlan = createHighestPowerExecutionPlan(plan);

    setLoadoutMessage("");
    setItemActionMessage("");

    if (!plan.executable_items.length) {
      setLoadoutMessage(`${character.class_name} 当前已经是最高光等组合。`);
      return;
    }

    let latestConfig: D2Config;
    try {
      latestConfig = await api.getConfig();
      setWriteActionsEnabled(latestConfig.features.write_actions_enabled);
    } catch (error) {
      setLoadoutMessage(error instanceof Error ? error.message : "读取写操作配置失败");
      return;
    }

    if (!latestConfig.features.write_actions_enabled) {
      setLoadoutMessage("d2-tools 本地写操作开关未开启。请到左侧“设置”页开启后再执行。");
      return;
    }

    const executionSummary = [plan.summary, executionPlan.summary]
      .filter(Boolean)
      .join("\n");
    const actionPreview = plan.executable_items
      .map((entry) => `${entry.slot_label}：${entry.item.name} / 光等 ${entry.item.power ?? "-"} / ${formatHighestPowerSource(entry.source)}`)
      .join("\n");
    if (!window.confirm([
      `确认给 ${character.class_name} 装备最高光等组合？`,
      executionSummary,
      actionPreview,
      "说明：仓库里的装备会先取出到该角色，再执行装备。不会分解装备。"
    ].join("\n"))) {
      setLoadoutMessage("已取消装备最高光等。");
      return;
    }

    setIsRunningItemAction(true);

    try {
      let transferResult = { success_count: 0, failed_count: 0 };
      let equipResult = { success_count: 0, failed_count: 0 };

      if (executionPlan.transfer_items.length) {
        setItemActionMessage(`正在从仓库取出 ${executionPlan.transfer_items.length} 件最高光等装备...`);
        transferResult = await api.batchTransferItems({
          membership_type: accountSummary.membership_type,
          character_id: character.character_id,
          items: executionPlan.transfer_items.map((entry) => ({
            membership_type: accountSummary.membership_type,
            character_id: character.character_id,
            item_id: entry.item.instance_id ?? "",
            item_reference_hash: entry.item.hash,
            item_name: entry.item.name,
            transfer_to_vault: false
          }))
        });
      }

      if (executionPlan.equip_items.length) {
        setItemActionMessage(`正在装备最高光等 ${executionPlan.equip_items.length} 件装备...`);
        equipResult = await api.batchEquipItems({
          membership_type: accountSummary.membership_type,
          character_id: character.character_id,
          items: executionPlan.equip_items.map((entry) => ({
            membership_type: accountSummary.membership_type,
            character_id: character.character_id,
            item_id: entry.item.instance_id ?? "",
            item_name: entry.item.name
          }))
        });
      }

      const failedSteps = transferResult.failed_count + equipResult.failed_count;
      setLoadoutMessage(failedSteps
        ? `最高光等执行完成：转移成功 ${transferResult.success_count}/${executionPlan.transfer_items.length}，装备成功 ${equipResult.success_count}/${executionPlan.equip_items.length}，失败步骤 ${failedSteps}。可在设置页查看操作日志。`
        : `已给 ${character.class_name} 装备 ${equipResult.success_count} 件最高光等装备。`);
      setItemActionMessage("正在刷新账号数据...");
      void Promise.all([loadAccountSummary(), loadActionLog()]).finally(() => {
        setItemActionMessage("");
      });
    } finally {
      setIsRunningItemAction(false);
    }
  }

  async function runLoadoutWriteAction(
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number],
    label: string,
    run: () => Promise<ItemActionResult>
  ) {
    setLoadoutMessage("");
    setItemActionMessage(`${label}执行中...`);

    let latestConfig: D2Config;
    try {
      latestConfig = await api.getConfig();
      setWriteActionsEnabled(latestConfig.features.write_actions_enabled);
    } catch (error) {
      setLoadoutMessage(error instanceof Error ? error.message : "读取写操作配置失败");
      return;
    }

    if (!latestConfig.features.write_actions_enabled) {
      setLoadoutMessage("d2-tools 本地写操作开关未开启，请先到设置页开启后再执行。");
      return;
    }

    if (!window.confirm([
      `确认要${label}吗？`,
      `角色：${character.class_name}`,
      `配装栏：${slot.name || `槽位 ${slot.index + 1}`}`,
      "说明：这会直接调用 Bungie 的游戏内配装栏接口，并写入本地操作日志。"
    ].join("\n"))) {
      return;
    }

    setIsRunningItemAction(true);
    try {
      const result = await run();
      setLoadoutMessage(result.message);
      await Promise.all([loadAccountSummary(), loadActionLog()]);
    } catch (error) {
      setLoadoutMessage(error instanceof Error ? error.message : `${label}失败`);
      await loadActionLog();
    } finally {
      setIsRunningItemAction(false);
    }
  }

  async function equipSavedLoadout(
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ) {
    await runLoadoutWriteAction(
      character,
      slot,
      `应用游戏内配装栏「${slot.name}」`,
      () => api.equipLoadout({
        membership_type: accountSummary?.membership_type ?? 0,
        character_id: character.character_id,
        loadout_index: slot.index,
        loadout_name: slot.name
      })
    );
  }

  async function snapshotCurrentLoadout(
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ) {
    await runLoadoutWriteAction(
      character,
      slot,
      `用当前装备覆盖游戏内配装栏「${slot.name}」`,
      () => api.snapshotLoadout({
        membership_type: accountSummary?.membership_type ?? 0,
        character_id: character.character_id,
        loadout_index: slot.index,
        loadout_name: slot.name
      })
    );
  }

  async function deleteLoadoutTemplate(id: string) {
    try {
      applyLoadoutTemplates(await api.deleteLoadoutTemplate(id));
      setLoadoutMessage("已删除本地配装模板。");
    } catch (error) {
      setLoadoutMessage(error instanceof Error ? error.message : "删除配装模板失败");
    }
  }

  async function renameLoadoutTemplate(template: LoadoutTemplate) {
    setLoadoutMessage("");
    try {
      const renamed = await api.renameLoadoutTemplate(template.id, loadoutRenameDraft);
      applyLoadoutTemplates(await api.listLoadoutTemplates());
      setSelectedLoadoutTemplateId(renamed.id);
      setLoadoutRenameDraft(renamed.name);
      setLoadoutMessage(`宸查噸鍛藉悕鏈湴鏂规锛?{renamed.name}`);
    } catch (error) {
      setLoadoutMessage(error instanceof Error ? error.message : "鏈湴鏂规閲嶅懡鍚嶅け璐?");
    }
  }

  async function createTemplateTransferPlan(template: LoadoutTemplate) {
    if (!accountSummary) return;

    const targetCharacter = accountSummary.characters.find((character) => character.character_id === template.character_id)
      ?? accountSummary.characters[0];
    if (!targetCharacter) {
      setLoadoutMessage("没有可用角色，无法生成转移计划。");
      return;
    }

    try {
      const plan = await api.createLoadoutTemplateTransferPlan({
        template,
        target_character_id: targetCharacter.character_id,
        available_items: accountSummary.vault.items,
        equipped_items: targetCharacter.equipped_items
      });
      await navigator.clipboard.writeText([
        "d2-tools 閰嶈杞Щ璁″垝",
        plan.summary,
        ...plan.steps.map((step, index) => `${index + 1}. ${step.title}：${step.description}`),
        "说明：这只是计划，不会执行 Bungie 写操作。"
      ].join("\n"));
      setLoadoutMessage(plan.summary || "已复制配装转移计划。");
    } catch (error) {
      setLoadoutMessage(error instanceof Error ? error.message : "配装转移计划生成失败");
    }
  }

  async function copyMissingLoadoutItems(
    template: LoadoutTemplate,
    analysis: ReturnType<typeof analyzeLoadoutTemplate> | null
  ) {
    if (!accountSummary) {
      setLoadoutMessage("请先读取账号数据。");
      return;
    }

    const transferPlan = buildMissingLoadoutTransferPlan({
      template,
      missingItems: template.items,
      accountSummary
    });
    const pendingItems = template.items.filter((item) => !isTemplateItemReadyFromPlan(item, transferPlan));
    if (!pendingItems.length) {
      setLoadoutMessage("当前方案装备已全部就位。");
      return;
    }

    try {
      await navigator.clipboard.writeText(
        buildMissingLoadoutItemsText(template, pendingItems, accountSummary)
      );
      setLoadoutMessage(`已复制待补齐清单，共 ${pendingItems.length} 件。`);
    } catch {
      setLoadoutMessage("复制缺失清单失败，请检查系统剪贴板权限。");
    }
  }

  async function executeMissingLoadoutTransfer(
    template: LoadoutTemplate,
    analysis: ReturnType<typeof analyzeLoadoutTemplate> | null
  ) {
    if (!accountSummary) {
      setLoadoutMessage("请先读取账号数据。");
      return;
    }

    const targetCharacter = accountSummary.characters.find((character) => character.character_id === template.character_id)
      ?? accountSummary.characters[0];
    if (!targetCharacter) {
      setLoadoutMessage("没有可用角色，无法转移缺失件。");
      return;
    }

    const transferPlan = buildMissingLoadoutTransferPlan({
      template,
      missingItems: template.items,
      accountSummary
    });
    const actionableItemCount = new Set(
      transferPlan.steps
        .filter((step) => step.phase !== "equip-swap")
        .flatMap((step) => step.items.map((item) => item.item_id))
    ).size;
    if (!actionableItemCount) {
      if (transferPlan.blocked.length > 0) {
        setLoadoutMessage(`当前没有可自动转移的缺失件，还有 ${transferPlan.blocked.length} 件需要手动处理。`);
      } else {
        setLoadoutMessage("当前方案装备已全部就位。");
      }
      return;
    }

    let latestConfig: D2Config;
    try {
      latestConfig = await api.getConfig();
      setWriteActionsEnabled(latestConfig.features.write_actions_enabled);
    } catch (error) {
      setLoadoutMessage(error instanceof Error ? error.message : "读取写操作配置失败");
      return;
    }

    if (!latestConfig.features.write_actions_enabled) {
      setLoadoutMessage("d2-tools 本地写操作开关未开启。请到左侧“设置”页开启后再执行。");
      return;
    }

    if (!window.confirm([
      `确认给 ${targetCharacter.class_name} 补齐 ${actionableItemCount} 件缺失装备？`,
      transferPlan.steps.some((step) => step.phase === "equip-swap")
        ? "其中一部分会先在来源角色身上装备替代装备，再把目标装备转出。"
        : null,
      transferPlan.steps.some((step) => step.phase === "pull-postmaster")
        ? "其中一部分会先从邮政官取回，再继续后续转移。"
        : null,
      transferPlan.steps.some((step) => step.phase === "to-vault")
        ? "其中一部分会先从其他角色背包移回仓库，再转到当前角色。"
        : "这次可以直接从仓库补齐到当前角色。",
      transferPlan.steps.some((step) => step.phase === "equip-target")
        ? "补齐完成后，会自动把这些方案装备穿到目标角色身上。"
        : null,
      transferPlan.blocked.length > 0
        ? `还有 ${transferPlan.blocked.length} 件暂时不会自动转移，例如其他角色已装备或仍在邮政官。`
        : null
    ].filter(Boolean).join("\n"))) {
      setLoadoutMessage("已取消缺失件转移。");
      return;
    }

    setIsRunningItemAction(true);
    setItemActionMessage(`正在准备 ${actionableItemCount} 件缺失装备...`);

    try {
      let targetTransferCount = 0;
      let autoEquipCount = 0;
      let prepStepCount = 0;
      for (const step of transferPlan.steps) {
        if (step.phase === "equip-swap") {
          setItemActionMessage(`正在在来源角色身上装备 ${step.items.length} 件替代装备...`);
          const equipResult = await api.batchEquipItems({
            membership_type: accountSummary.membership_type,
            character_id: step.character_id,
            items: step.items.map((item) => ({
              membership_type: accountSummary.membership_type,
              character_id: step.character_id,
              item_id: item.item_id,
              item_name: item.item_name
            }))
          });

          if (equipResult.failed_count > 0) {
            throw new Error(equipResult.message || "替代装备装备失败，请检查来源角色装备状态后重试。");
          }
          prepStepCount += equipResult.success_count;
          continue;
        }
        if (step.phase === "pull-postmaster") {
          setItemActionMessage(`正在从邮政官取回 ${step.items.length} 件装备...`);
          for (const item of step.items) {
            await api.pullFromPostmaster({
              membership_type: accountSummary.membership_type,
              character_id: step.character_id,
              item_id: item.item_id,
              item_reference_hash: item.item_reference_hash,
              item_name: item.item_name
            });
          }
          prepStepCount += step.items.length;
          continue;
        }
        if (step.phase === "equip-target") {
          setItemActionMessage(`正在给 ${targetCharacter.class_name} 自动装备 ${step.items.length} 件方案装备...`);
          const equipResult = await api.batchEquipItems({
            membership_type: accountSummary.membership_type,
            character_id: step.character_id,
            items: step.items.map((item) => ({
              membership_type: accountSummary.membership_type,
              character_id: step.character_id,
              item_id: item.item_id,
              item_name: item.item_name
            }))
          });

          autoEquipCount += equipResult.success_count;
          if (equipResult.failed_count > 0) {
            throw new Error(equipResult.message || "方案装备自动穿戴失败，请检查当前角色状态后重试。");
          }
          continue;
        }
        setItemActionMessage(
          step.phase === "to-vault"
            ? `正在从来源角色移回 ${step.items.length} 件装备到仓库...`
            : `正在转入 ${step.items.length} 件装备到 ${targetCharacter.class_name}...`
        );

        const result = await api.batchTransferItems({
          membership_type: accountSummary.membership_type,
          character_id: step.character_id,
          items: step.items.map((item) => ({
            membership_type: accountSummary.membership_type,
            character_id: step.character_id,
            item_id: item.item_id,
            item_reference_hash: item.item_reference_hash,
            item_name: item.item_name,
            transfer_to_vault: step.transfer_to_vault
          }))
        });
        if (step.phase === "to-character") {
          targetTransferCount += result.success_count;
        } else {
          prepStepCount += result.success_count;
        }

        if (result.failed_count > 0) {
          throw new Error(result.message || "缺失件转移未全部成功，请检查物品状态后重试。");
        }
      }
      await Promise.all([loadAccountSummary(), loadActionLog()]);
      const finishedParts = [
        targetTransferCount > 0 ? `转入 ${targetTransferCount} 件` : null,
        autoEquipCount > 0 ? `自动装备 ${autoEquipCount} 件` : null,
        prepStepCount > 0 ? `前置处理 ${prepStepCount} 步` : null,
        transferPlan.blocked.length > 0 ? `仍有 ${transferPlan.blocked.length} 件需手动处理` : null
      ].filter(Boolean);
      setLoadoutMessage(
        finishedParts.length
          ? `方案补齐完成：${finishedParts.join("，")}。`
          : "方案补齐完成。"
      );
    } catch (error) {
      setLoadoutMessage(error instanceof Error ? error.message : "缺失件转移失败");
    } finally {
      setIsRunningItemAction(false);
      setItemActionMessage("");
    }
  }

  async function executeSingleLoadoutItemTransfer(
    template: LoadoutTemplate,
    item: LoadoutTemplate["items"][number]
  ) {
    const feedbackKey = buildLoadoutActionFeedbackKey(template.id, item, "transfer");
    if (!accountSummary) {
      setLoadoutMessage("请先读取账号数据。");
      return;
    }

    const targetCharacter = accountSummary.characters.find((character) => character.character_id === template.character_id)
      ?? accountSummary.characters[0];
    if (!targetCharacter) {
      setLoadoutMessage("没有可用角色，无法补齐这件装备。");
      return;
    }

    const transferPlan = buildMissingLoadoutTransferPlan({
      template: {
        ...template,
        items: [item]
      },
      missingItems: [item],
      accountSummary
    });
    const actionableItemCount = getMissingLoadoutActionableCount(transferPlan);
    if (!actionableItemCount) {
      if (transferPlan.blocked.length > 0) {
        setLoadoutMessage(`这件装备当前无法自动补齐：${item.name}。`);
      } else {
        setLoadoutMessage(`这件装备已经就位：${item.name}。`);
      }
      return;
    }

    let latestConfig: D2Config;
    try {
      latestConfig = await api.getConfig();
      setWriteActionsEnabled(latestConfig.features.write_actions_enabled);
    } catch (error) {
      setSingleLoadoutActionFeedback(feedbackKey, "idle");
      setLoadoutMessage(error instanceof Error ? error.message : "读取写操作配置失败");
      return;
    }

    if (!latestConfig.features.write_actions_enabled) {
      setLoadoutMessage("d2-tools 本地写操作开关未开启。请到左侧“设置”页开启后再执行。");
      return;
    }

    if (!window.confirm(`确认只补齐「${item.name}」吗？`)) {
      setLoadoutMessage("已取消单件补齐。");
      return;
    }

    setIsRunningItemAction(true);
    setSingleLoadoutActionFeedback(feedbackKey, "pending");
    setItemActionMessage(`正在补齐 ${item.name}...`);
    setLoadoutMessage(`正在补齐 ${item.name}...`);
    let actionSucceeded = false;

    try {
      let targetTransferCount = 0;
      let autoEquipCount = 0;
      let prepStepCount = 0;
      for (const step of transferPlan.steps) {
        if (step.phase === "equip-swap") {
          const stepMessage = `正在为来源角色换下 ${item.name}...`;
          setItemActionMessage(stepMessage);
          setLoadoutMessage(stepMessage);
          const equipResult = await api.batchEquipItems({
            membership_type: accountSummary.membership_type,
            character_id: step.character_id,
            items: step.items.map((entry) => ({
              membership_type: accountSummary.membership_type,
              character_id: step.character_id,
              item_id: entry.item_id,
              item_name: entry.item_name
            }))
          });

          if (equipResult.failed_count > 0) {
            throw new Error(equipResult.message || "来源角色替换装备失败，请稍后重试。");
          }
          prepStepCount += equipResult.success_count;
          continue;
        }

        if (step.phase === "pull-postmaster") {
          const stepMessage = `正在从邮政官取回 ${item.name}...`;
          setItemActionMessage(stepMessage);
          setLoadoutMessage(stepMessage);
          for (const entry of step.items) {
            await api.pullFromPostmaster({
              membership_type: accountSummary.membership_type,
              character_id: step.character_id,
              item_id: entry.item_id,
              item_reference_hash: entry.item_reference_hash,
              item_name: entry.item_name
            });
          }
          prepStepCount += step.items.length;
          continue;
        }

        if (step.phase === "equip-target") {
          const stepMessage = `正在给 ${targetCharacter.class_name} 装备 ${item.name}...`;
          setItemActionMessage(stepMessage);
          setLoadoutMessage(stepMessage);
          const equipResult = await api.batchEquipItems({
            membership_type: accountSummary.membership_type,
            character_id: step.character_id,
            items: step.items.map((entry) => ({
              membership_type: accountSummary.membership_type,
              character_id: step.character_id,
              item_id: entry.item_id,
              item_name: entry.item_name
            }))
          });

          autoEquipCount += equipResult.success_count;
          if (equipResult.failed_count > 0) {
            throw new Error(equipResult.message || "目标角色装备失败，请稍后重试。");
          }
          continue;
        }

        const stepMessage = step.phase === "to-vault"
          ? `正在把 ${item.name} 转回仓库...`
          : `正在把 ${item.name} 转入 ${targetCharacter.class_name}...`;
        setItemActionMessage(stepMessage);
        setLoadoutMessage(stepMessage);

        const result = await api.batchTransferItems({
          membership_type: accountSummary.membership_type,
          character_id: step.character_id,
          items: step.items.map((entry) => ({
            membership_type: accountSummary.membership_type,
            character_id: step.character_id,
            item_id: entry.item_id,
            item_reference_hash: entry.item_reference_hash,
            item_name: entry.item_name,
            transfer_to_vault: step.transfer_to_vault
          }))
        });

        if (step.phase === "to-character") {
          targetTransferCount += result.success_count;
        } else {
          prepStepCount += result.success_count;
        }

        if (result.failed_count > 0) {
          throw new Error(result.message || "单件补齐未全部成功，请检查物品状态后重试。");
        }
      }

      await Promise.all([loadAccountSummary(), loadActionLog()]);
      const finishedParts = [
        targetTransferCount > 0 ? `转入 ${targetTransferCount} 件` : null,
        autoEquipCount > 0 ? `自动装备 ${autoEquipCount} 件` : null,
        prepStepCount > 0 ? `前置处理 ${prepStepCount} 步` : null
      ].filter(Boolean);
      setLoadoutMessage(
        finishedParts.length
          ? `单件补齐完成：${item.name}，${finishedParts.join("，")}。`
          : `单件补齐完成：${item.name}。`
      );
      actionSucceeded = true;
      setSingleLoadoutActionFeedback(feedbackKey, "success");
    } catch (error) {
      setLoadoutMessage(error instanceof Error ? error.message : `单件补齐失败：${item.name}`);
    } finally {
      setIsRunningItemAction(false);
      setItemActionMessage("");
      if (!actionSucceeded) {
        setSingleLoadoutActionFeedback(feedbackKey, "idle");
      }
    }
  }

  async function equipSingleLoadoutItem(
    template: LoadoutTemplate,
    item: LoadoutTemplate["items"][number]
  ) {
    const feedbackKey = buildLoadoutActionFeedbackKey(template.id, item, "equip");
    if (!accountSummary) {
      setLoadoutMessage("请先读取账号数据。");
      return;
    }

    const sourceItem = findBestTemplateSourceItem(item, accountSummary, template.character_id);
    if (!sourceItem?.instance_id) {
      setLoadoutMessage(`找不到可直接装备的物品实例：${item.name}。`);
      return;
    }
    if (sourceItem.source_kind !== "inventory" || sourceItem.source_character_id !== template.character_id) {
      setLoadoutMessage(`「${item.name}」当前不在目标角色背包，请先用“只补这一件”。`);
      return;
    }

    let latestConfig: D2Config;
    try {
      latestConfig = await api.getConfig();
      setWriteActionsEnabled(latestConfig.features.write_actions_enabled);
    } catch (error) {
      setSingleLoadoutActionFeedback(feedbackKey, "idle");
      setLoadoutMessage(error instanceof Error ? error.message : "读取写操作配置失败");
      return;
    }

    if (!latestConfig.features.write_actions_enabled) {
      setLoadoutMessage("d2-tools 本地写操作开关未开启。请到左侧“设置”页开启后再执行。");
      return;
    }

    if (!window.confirm(`确认只装备「${item.name}」吗？`)) {
      setLoadoutMessage("已取消单件装备。");
      return;
    }

    setIsRunningItemAction(true);
    setSingleLoadoutActionFeedback(feedbackKey, "pending");
    setItemActionMessage(`正在装备 ${item.name}...`);
    setLoadoutMessage(`正在装备 ${item.name}...`);
    let actionSucceeded = false;

    try {
      const result = await api.equipItem({
        membership_type: accountSummary.membership_type,
        character_id: template.character_id,
        item_id: sourceItem.instance_id,
        item_name: sourceItem.name
      });
      await Promise.all([loadAccountSummary(), loadActionLog()]);
      setLoadoutMessage(result.message);
      actionSucceeded = true;
      setSingleLoadoutActionFeedback(feedbackKey, "success");
    } catch (error) {
      setLoadoutMessage(error instanceof Error ? error.message : `单件装备失败：${item.name}`);
    } finally {
      setIsRunningItemAction(false);
      setItemActionMessage("");
      if (!actionSucceeded) {
        setSingleLoadoutActionFeedback(feedbackKey, "idle");
      }
    }
  }

  function openTemplateSourceItem(
    item: LoadoutTemplate["items"][number],
    templateCharacterId?: string
  ) {
    const matchedItem = findBestTemplateSourceItem(item, accountSummary, templateCharacterId);
    if (!matchedItem) {
      setLoadoutMessage(`没有找到「${item.name}」的可用来源。`);
      return;
    }

    void openItemDetail(matchedItem, {
      source_character_id: matchedItem.source_character_id,
      is_vault_item: matchedItem.is_vault_item,
      is_postmaster_item: matchedItem.is_postmaster_item
    });
  }

  async function loadActivitySummary(summary = accountSummary) {
    if (!summary) return;

    setActivityError("");
    setActivityMessage("");
    try {
      setActivitySummary(await api.getActivitySummary({
        membership_type: summary.membership_type,
        membership_id: summary.destiny_membership_id,
        character_ids: summary.characters.map((character) => character.character_id)
      }));
      setActivityMessage("鏈€杩戞椿鍔ㄥ凡鏇存柊");
    } catch (error) {
      setActivitySummary(null);
      setActivityError(error instanceof Error ? error.message : "最近活动读取失败");
    }
  }

  async function copyDiagnosticsExport() {
    setSettingsMessage("");
    setSettingsError("");
    try {
      await navigator.clipboard.writeText(await api.exportDiagnostics());
      setSettingsMessage("已复制脱敏诊断导出");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "诊断导出失败");
    }
  }

  async function copyItemActionPlanText(
    input: {
      action: "set-lock" | "equip" | "transfer";
      item_name: string;
      item_instance_id?: string;
      item_reference_hash?: number;
      character_id?: string;
      state?: boolean;
      transfer_to_vault?: boolean;
    }
  ) {
    setItemActionMessage("");
    try {
      const plan = await api.createItemActionPlan(input);
      await navigator.clipboard.writeText([
        "d2-tools 瑁呭鎿嶄綔璁″垝",
        plan.title,
        plan.description,
        `需要确认：${plan.requires_confirmation ? "是" : "否"}`,
        "说明：这只是计划，不会执行 Bungie 写操作。"
      ].join("\n"));
      setItemActionMessage("已复制操作计划。");
    } catch (error) {
      setItemActionMessage(error instanceof Error ? error.message : "操作计划生成失败");
    }
  }

  async function copyBatchTransferPlanText(
    input: {
      character_id: string;
      transfer_to_vault: boolean;
      items: AccountItemSummary[];
    }
  ) {
    setDimToolsMessage("");
    try {
      const plan = await api.createBatchTransferPlan(input);
      await navigator.clipboard.writeText([
        "d2-tools 批量转移计划",
        plan.summary,
        ...plan.steps.map((step, index) => `${index + 1}. ${step.title} - ${step.description}`),
        "",
        "说明：这只是计划，不会直接执行 Bungie 写操作。"
      ].join("\n"));
      setDimToolsMessage("已复制批量转移计划。");
    } catch (error) {
      setDimToolsMessage(error instanceof Error ? error.message : "批量转移计划生成失败");
    }
  }

  async function saveVaultTag(item: AccountItemSummary, tag: VaultTagValue) {
    const itemKey = item.instance_id ?? `hash:${item.hash}`;
    try {
      setVaultTags(await api.saveVaultTag({
        item_key: itemKey,
        tag
      }));
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "本地标记保存失败");
    }
  }

  async function saveVaultTagsBatch(inputs: Array<{ item_key: string; tag: VaultTagValue }>) {
    try {
      setVaultTags(await api.saveVaultTagsBatch(inputs));
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "批量标记保存失败");
      throw error;
    }
  }

  async function applySameNameBatchTags(
    items: AccountItemSummary[],
    mode: Parameters<typeof buildDuplicateGroupBatchTagPlan>[1]
  ) {
    const group = buildVaultDuplicateSummary(items, vaultTags).groups[0];
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
      scoreVaultItem(right, vaultTags).score - scoreVaultItem(left, vaultTags).score
      || Number(Boolean(right.locked)) - Number(Boolean(left.locked))
    )[0];
    if (!bestItem) return;

    void openItemDetail(bestItem, {
      source_character_id: bestItem.source_character_id,
      is_vault_item: bestItem.is_vault_item,
      is_postmaster_item: bestItem.is_postmaster_item
    });
  }

  async function saveWriteActionsEnabled(enabled: boolean) {
    setSettingsMessage("");
    setSettingsError("");

    try {
      const config = await api.getConfig();
      const nextConfig: D2Config = {
        ...config,
        features: {
          ...config.features,
          write_actions_enabled: enabled
        }
      };
      const saved = await api.saveConfig(nextConfig);
      setWriteActionsEnabled(saved.features.write_actions_enabled);
      setSettingsMessage(enabled
        ? "写操作已开启。执行前仍会再次确认。"
        : "写操作已关闭。");
      props.onConfigChanged();
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "写操作设置保存失败");
    }
  }

  async function loadActionLog() {
    try {
      setActionLog(await api.getActionLog());
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "操作日志读取失败");
    }
  }

  async function runItemWriteAction(
    label: string,
    run: () => Promise<ItemActionResult>
  ) {
    if (!selectedItem || !accountSummary) return;

    let latestConfig: D2Config;
    try {
      latestConfig = await api.getConfig();
      setWriteActionsEnabled(latestConfig.features.write_actions_enabled);
    } catch (error) {
      setItemActionMessage(error instanceof Error ? error.message : "读取写操作配置失败");
      return;
    }

    if (!latestConfig.features.write_actions_enabled) {
      setItemActionMessage("d2-tools 本地写操作开关未开启。请到左侧“设置”页开启“允许单件装备写操作”。");
      return;
    }
    if (!selectedItem.instance_id) {
      setItemActionMessage("这个物品没有实例 ID，不能执行 Bungie 写操作。");
      return;
    }
    if (!selectedActionCharacterId) {
      setItemActionMessage("请先选择目标角色。");
      return;
    }
    if (!window.confirm(`确认要${label}${selectedItem.name}吗？`)) {
      return;
    }

    setIsRunningItemAction(true);
    setItemActionMessage(`${label}执行中...`);
    setItemShareMessage("");

    try {
      const result = await run();
      setItemActionMessage(result.message);
      closeSelectedItemDetail();
      void Promise.all([loadAccountSummary(), loadActionLog()]).catch((error) => {
        setAccountError(error instanceof Error ? error.message : "操作完成，但刷新账号数据失败");
      });
    } catch (error) {
      setItemActionMessage(error instanceof Error ? error.message : `${label}失败`);
      await loadActionLog();
    } finally {
      setIsRunningItemAction(false);
    }
  }

  async function runVaultCleanupWriteAction(
    label: string,
    items: AccountItemSummary[],
    targetCharacterId: string,
    run: (item: AccountItemSummary) => Promise<ItemActionResult>,
    filterItem: (item: AccountItemSummary) => boolean = () => true
  ): Promise<string> {
    if (!accountSummary) {
      return "请先读取账号数据。";
    }

    let latestConfig: D2Config;
    try {
      latestConfig = await api.getConfig();
      setWriteActionsEnabled(latestConfig.features.write_actions_enabled);
    } catch (error) {
      return error instanceof Error ? error.message : "读取写操作配置失败";
    }

    if (!latestConfig.features.write_actions_enabled) {
      return "d2-tools 本地写操作开关未开启。请到左侧“设置”页开启后再执行。";
    }
    if (!targetCharacterId) {
      return "请先选择目标角色。";
    }

    const actionableItems = items.filter((item) => item.instance_id && filterItem(item));
    if (!actionableItems.length) {
      return "没有可执行的装备。可能已经全部解锁，或缺少实例 ID。";
    }
    if (!window.confirm(`确认要${label} ${actionableItems.length} 件可清理装备吗？这个操作不会分解装备。`)) {
      return "已取消操作。";
    }

    setIsRunningItemAction(true);
    setItemActionMessage("");
    setItemShareMessage("");

    let successCount = 0;
    let failedCount = 0;
    try {
      for (const item of actionableItems) {
        try {
          await run(item);
          successCount += 1;
        } catch {
          failedCount += 1;
        }
      }
      await Promise.all([loadAccountSummary(), loadActionLog()]);
    } finally {
      setIsRunningItemAction(false);
    }

    return failedCount
      ? `${label}完成 ${successCount} 件，失败 ${failedCount} 件。可以在设置页查看操作日志。`
      : `${label}完成 ${successCount} 件。`;
  }
  async function handleVaultCleanupUnlock(items: AccountItemSummary[], targetCharacterId: string): Promise<string> {
    return runVaultCleanupWriteAction(
      "\u6279\u91cf\u89e3\u9501",
      items,
      targetCharacterId,
      (item) => api.setItemLockState({
        membership_type: accountSummary?.membership_type ?? 0,
        character_id: targetCharacterId,
        item_id: item.instance_id ?? "",
        item_name: item.name,
        state: false
      }),
      (item) => item.locked === true
    );
  }

  async function handleVaultCleanupTransfer(items: AccountItemSummary[], targetCharacterId: string): Promise<BatchItemActionResult> {
    // api.batchTransferItems(
    return runVaultBatchTransfer(items, targetCharacterId);
  }

  async function runVaultBatchTransfer(items: AccountItemSummary[], targetCharacterId: string): Promise<BatchItemActionResult> {
    if (!accountSummary) {
      throw new Error("\u8bf7\u5148\u8bfb\u53d6\u8d26\u53f7\u6570\u636e\u3002");
    }

    let latestConfig: D2Config;
    try {
      latestConfig = await api.getConfig();
      setWriteActionsEnabled(latestConfig.features.write_actions_enabled);
    } catch (error) {
      throw error instanceof Error ? error : new Error("\u8bfb\u53d6\u5199\u64cd\u4f5c\u914d\u7f6e\u5931\u8d25");
    }

    if (!latestConfig.features.write_actions_enabled) {
      throw new Error("d2-tools \u672c\u5730\u5199\u64cd\u4f5c\u5f00\u5173\u672a\u5f00\u542f\u3002\u8bf7\u5230\u5de6\u4fa7\u201c\u8bbe\u7f6e\u201d\u9875\u5f00\u542f\u540e\u518d\u6267\u884c\u3002");
    }
    if (!targetCharacterId) {
      throw new Error("\u8bf7\u5148\u9009\u62e9\u76ee\u6807\u89d2\u8272\u3002");
    }

    const actionableItems = items.filter((item) => item.instance_id);
    if (!actionableItems.length) {
      throw new Error("\u6ca1\u6709\u53ef\u6267\u884c\u7684\u88c5\u5907\u3002\u53ef\u80fd\u7f3a\u5c11\u5b9e\u4f8b ID\u3002");
    }
    if (!window.confirm(`\u786e\u8ba4\u8981\u6279\u91cf\u8f6c\u79fb ${actionableItems.length} \u4ef6\u4ed3\u5e93\u88c5\u5907\u5230\u76ee\u6807\u89d2\u8272\u5417\uff1f`)) {
      throw new Error("\u5df2\u53d6\u6d88\u64cd\u4f5c\u3002");
    }

    setIsRunningItemAction(true);
    setItemActionMessage(`\u6b63\u5728\u6279\u91cf\u8f6c\u79fb ${actionableItems.length} \u4ef6\u88c5\u5907...`);
    setItemShareMessage("");

    try {
      const result = await api.batchTransferItems({
        membership_type: accountSummary.membership_type,
        character_id: targetCharacterId,
        items: actionableItems.map((item) => ({
          membership_type: accountSummary.membership_type,
          character_id: targetCharacterId,
          item_id: item.instance_id ?? "",
          item_reference_hash: item.hash,
          item_name: item.name,
          transfer_to_vault: false
        }))
      });
      await Promise.all([loadAccountSummary(), loadActionLog()]);
      return result;
    } catch (error) {
      throw error instanceof Error ? error : new Error("\u6279\u91cf\u8f6c\u79fb\u5931\u8d25");
    } finally {
      setIsRunningItemAction(false);
      setItemActionMessage("");
    }
  }

  const activeLoadoutTemplate = loadoutTemplates.find((template) => template.id === selectedLoadoutTemplateId)
    ?? loadoutTemplates[0]
    ?? null;
  const activeLoadoutLookup = activeLoadoutTemplate
    ? buildLoadoutTemplateLookup(activeLoadoutTemplate)
    : null;
  const diagnosticRows = buildDiagnosticRows({
    state: props.state,
    dataDir: diagnosticDataDir,
    manifestVersion: diagnosticManifestVersion
  });

  return (
    <ShellLayout activePage={activePage} onNavigate={setActivePage}>
      <header className="page-header">
        <div>
          <h2>{pageTitle(activePage)}</h2>
          <p>{pageSubtitle(activePage)}</p>
        </div>
      </header>

      <StatusOverview
        state={props.state}
        isLoggingIn={isLoggingIn}
        isInitializingManifest={isInitializingManifest}
        onConfigure={props.onConfigure}
        onLogin={() => void loginBungie()}
        onInitializeManifest={() => void initializeManifest()}
        onConfigureAi={() => setActivePage("settings")}
      />

      {loginMessage ? <p className="notice">{loginMessage}</p> : null}
      {loginError ? <p className="error">{loginError}</p> : null}
      {manifestMessage ? <p className="notice">{manifestMessage}</p> : null}
      {manifestError ? <p className="error">{manifestError}</p> : null}

      {activePage === "home" ? (
        <>
          <DiagnosticsPanel
            rows={diagnosticRows}
            isRefreshing={isRefreshingDiagnostics}
            onRefresh={() => void refreshDiagnostics()}
          />
          {diagnosticError ? <p className="error">{diagnosticError}</p> : null}
          {renderDailyPanel()}
          <section className="tool-panel">
            <div className="section-heading">
              <div>
                <h2>常用入口</h2>
                <p>先完成状态诊断，再进入账号、资料库或设置页。</p>
              </div>
            </div>
            <div className="quick-actions">
              <button type="button" onClick={() => setActivePage("account")}>查看账号</button>
              <button type="button" onClick={() => setActivePage("library")}>搜索资料库</button>
              <button type="button" className="secondary-button" onClick={() => setActivePage("settings")}>打开设置</button>
            </div>
          </section>
        </>
      ) : null}

      {activePage === "account" ? renderAccountPanel() : null}
      {activePage === "library" ? renderSearchPanel() : null}
      {activePage === "vault" ? renderVaultPanel() : null}
      {activePage === "ai" ? (
        !isAiConfigured ? (
          <section className="tool-panel placeholder-panel">
            <div className="section-heading">
              <div>
                <h2>AI 助手</h2>
                <p>还没有配置 AI。先到设置页填写提供商、模型和 API Key，再回来聊天分析。</p>
              </div>
              <button type="button" onClick={() => setActivePage("settings")}>去设置配置 AI</button>
            </div>
          </section>
        ) : (
          <AiAnalysisPanel
            account={accountSummary}
            daily={dailySummary}
            activity={activitySummary}
            items={accountSummary?.vault.items ?? []}
            tags={vaultTags}
            isLoadingAccount={isLoadingAccount}
            onLoadAccount={() => void loadAccountSummary()}
          />
        )
      ) : null}
      {activePage === "settings" ? (
        <>
          <AiSettingsPanel onSaved={handleAiSettingsSaved} />
          <section className="tool-panel">
          <div className="section-heading">
            <div>
              <h2>设置</h2>
              <p>查看或修改 Bungie 配置、写操作开关和本地日志。</p>
            </div>
            <button type="button" onClick={props.onConfigure}>打开配置</button>
          </div>
          {settingsMessage ? <p className="notice">{settingsMessage}</p> : null}
          {settingsError ? <p className="error">{settingsError}</p> : null}
          <div className="diagnostic-grid">
            <div className="diagnostic-row diagnostic-neutral">
              <span>本地数据目录</span>
              <strong>{diagnosticDataDir || "未读取到配置目录"}</strong>
            </div>
            <div className={writeActionsEnabled ? "diagnostic-row diagnostic-ready" : "diagnostic-row diagnostic-neutral"}>
              <span>装备写操作</span>
              <strong>{writeActionsEnabled ? "已开启" : "已关闭"}</strong>
            </div>
          </div>
          <section className="settings-subsection">
            <div>
              <h3>危险操作保护</h3>
              <p>
                开启后才能锁定、解锁、装备、移入或取出仓库。需要在 Bungie App 勾选
                MoveEquipDestinyItems 权限并重新登录。
              </p>
            </div>
            <label className="switch-row">
              <input
                checked={writeActionsEnabled}
                type="checkbox"
                onChange={(event) => void saveWriteActionsEnabled(event.target.checked)}
              />
              允许单件装备写操作
            </label>
          </section>
          <section className="settings-subsection">
            <div>
              <h3>脱敏诊断导出</h3>
              <p>复制版本、配置状态、Manifest 状态和最近错误，不包含 token、client secret 或 API Key。</p>
            </div>
            <button type="button" className="secondary-button" onClick={() => void copyDiagnosticsExport()}>
              复制脱敏诊断
            </button>
          </section>
          <section className="settings-subsection">
            <div className="section-heading compact-heading">
              <div>
                <h3>最近操作</h3>
                <p>只记录本机操作结果，不上报。</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => void loadActionLog()}>
                刷新日志
              </button>
            </div>
            <div className="action-log-filters">
              <label className="compact-field">
                结果
                <select value={actionLogResultFilter} onChange={(event) => setActionLogResultFilter(event.target.value as typeof actionLogResultFilter)}>
                  <option value="all">全部</option>
                  <option value="success">成功</option>
                  <option value="failed">失败</option>
                </select>
              </label>
              <label className="compact-field">
                类型
                <select value={actionLogTypeFilter} onChange={(event) => setActionLogTypeFilter(event.target.value as typeof actionLogTypeFilter)}>
                  <option value="all">全部</option>
                  <option value="set-lock">锁定状态</option>
                  <option value="equip">装备</option>
                  <option value="transfer">仓库转移</option>
                  <option value="postmaster-pull">邮政官取回</option>
                  <option value="loadout-equip">应用游戏内配装栏</option>
                  <option value="loadout-snapshot">覆盖游戏内配装栏</option>
                </select>
              </label>
            </div>
            {actionLog.length ? (
              <div className="action-log-list">
                {filteredActionLog(actionLog, actionLogResultFilter, actionLogTypeFilter).slice(0, 8).map((entry) => (
                  <div className={`action-log-row ${entry.ok ? "log-ok" : "log-fail"}`} key={entry.id}>
                    <span>{new Date(entry.created_at).toLocaleString("zh-CN")}</span>
                    <strong>{formatActionLogTitle(entry)}</strong>
                    <small>{entry.message ?? "-"}</small>
                    {!entry.ok ? (
                      <button type="button" className="inline-action" onClick={() => void copyActionDiagnostic(entry)}>
                        复制诊断
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="notice">还没有写操作记录。</p>
            )}
          </section>
          </section>
        </>
      ) : null}

      {selectedItem ? renderItemModal() : null}
    </ShellLayout>
  );

  function renderAccountPanel() {
    const selectedCharacter = accountSummary?.characters.find((character) => character.character_id === selectedCharacterId)
      ?? accountSummary?.characters[0]
      ?? null;
    const selectedLoadoutTemplate = activeLoadoutTemplate;
    const availableLoadoutItems = accountSummary
      ? normalizeAccountItemsForCore(getAllKnownAccountItemsWithSource(accountSummary))
      : [];
    const selectedLoadoutAnalysis = selectedLoadoutTemplate
      ? analyzeLoadoutTemplate(selectedLoadoutTemplate, availableLoadoutItems)
      : null;
    const selectedLoadoutTransferPlan = selectedLoadoutTemplate && accountSummary && selectedLoadoutAnalysis
      ? buildMissingLoadoutTransferPlan({
        template: selectedLoadoutTemplate,
        missingItems: selectedLoadoutTemplate.items,
        accountSummary
      })
      : null;
    const selectedLoadoutActionableCount = selectedLoadoutTransferPlan
      ? getMissingLoadoutActionableCount(selectedLoadoutTransferPlan)
      : 0;
    const selectedLoadoutReadyCount = selectedLoadoutTemplate && selectedLoadoutTransferPlan
      ? Math.max(
        selectedLoadoutTemplate.items.length - selectedLoadoutActionableCount - selectedLoadoutTransferPlan.blocked.length,
        0
      )
      : selectedLoadoutAnalysis?.equipped.length ?? 0;
    const selectedLoadoutMissingCount = selectedLoadoutTemplate && selectedLoadoutTransferPlan
      ? selectedLoadoutActionableCount + selectedLoadoutTransferPlan.blocked.length
      : selectedLoadoutAnalysis?.missing.length ?? 0;
    const selectedLoadoutCharacter = selectedLoadoutTemplate
      ? accountSummary?.characters.find((character) => character.character_id === selectedLoadoutTemplate.character_id) ?? null
      : null;
    const selectedLoadoutStatuses = selectedLoadoutTemplate
      ? selectedLoadoutTemplate.items.map((item) => {
        const isReady = selectedLoadoutTransferPlan
          ? isTemplateItemReadyFromPlan(item, selectedLoadoutTransferPlan)
          : isTemplateItemReady(item, selectedLoadoutAnalysis);
        const sourceItem = !isReady
          ? findBestTemplateSourceItem(item, accountSummary, selectedLoadoutTemplate.character_id)
          : null;
        return buildLoadoutItemStatus({
          isReady,
          sourceItem,
          targetCharacterId: selectedLoadoutTemplate.character_id,
          accountSummary
        });
      })
      : [];
    const selectedLoadoutStatusSummary = summarizeLoadoutItemStatuses(selectedLoadoutStatuses);
    const compareLoadoutTemplate = loadoutTemplates.find((template) => template.id === compareLoadoutTemplateId)
      ?? null;
    const loadoutCompareRows = selectedLoadoutTemplate && compareLoadoutTemplate
      ? buildLoadoutCompareRows(selectedLoadoutTemplate, compareLoadoutTemplate)
      : [];
    const visibleLoadoutCompareRows = showLoadoutDiffOnly
      ? loadoutCompareRows.filter((row) => row.changed)
      : loadoutCompareRows;
    const selectedCharacterLoadoutMatchCount = selectedCharacter && activeLoadoutLookup
      ? getCharacterCombinedItems(selectedCharacter)
        .filter((item) => matchesLoadoutTemplateItem(item, activeLoadoutLookup))
        .length
      : 0;

    return (
      <section className="tool-panel">
        <div className="section-heading">
          <div>
            <h2>账号摘要</h2>
            <p>读取当前 Bungie 账号、角色装备和仓库简表。</p>
          </div>
          <button type="button" disabled={isLoadingAccount} onClick={() => void loadAccountSummary()}>
            {isLoadingAccount ? "读取中..." : "读取账号数据"}
          </button>
        </div>
        {accountError ? <p className="error">{accountError}</p> : null}
        {itemDetailError ? <p className="error">{itemDetailError}</p> : null}
        {accountSummary ? (
          <div className="account-summary">
            {selectedCharacter ? (
              <>
            <div>
              <h3>{accountSummary.account_name}</h3>
              <p>
                Membership {accountSummary.membership_type} / {accountSummary.destiny_membership_id}
              </p>
              <p>仓库装备：{accountSummary.vault.item_count} / 材料与消耗品：{accountSummary.materials.item_count}</p>
            </div>
            <div className="character-tabs" role="tablist" aria-label="角色切换">
              {accountSummary.characters.map((character) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCharacter.character_id === character.character_id}
                  className={selectedCharacter.character_id === character.character_id ? "character-tab active" : "character-tab"}
                  key={character.character_id}
                  onClick={() => setSelectedCharacterId(character.character_id)}
                >
                  {character.emblem_url ? <img alt="" src={character.emblem_url} /> : null}
                  <span>{character.class_name}</span>
                  <strong>光等 {character.light ?? "-"}</strong>
                </button>
              ))}
            </div>
            <article className="character-card character-card-focused">
              <div className="character-title">
                {selectedCharacter.emblem_url ? <img alt="" src={selectedCharacter.emblem_url} /> : null}
                <div>
                  <h3>{selectedCharacter.class_name}</h3>
                  <p>
                    光等 {selectedCharacter.light ?? "-"} / 已装备 {selectedCharacter.equipped_items.length} 件 / 背包 {selectedCharacter.inventory_items.length} 件 / 邮政官 {selectedCharacter.postmaster_items.length} 件
                  </p>
                </div>
                <div className="character-actions">
                  <button type="button" className="inline-action" onClick={() => void saveCharacterLoadout(selectedCharacter)}>
                    保存当前装备为模板
                  </button>
                  <button
                    type="button"
                    className="inline-action"
                    disabled={isRunningItemAction}
                    onClick={() => void equipHighestPowerItems(selectedCharacter)}
                  >
                    {isRunningItemAction ? "执行中..." : "装备最高光等"}
                  </button>
                </div>
              </div>
              <div className="equipment-section-heading">
                <h4>当前角色装备</h4>
                <span>
                  {selectedCharacter.equipped_items.length + selectedCharacter.inventory_items.length} 件
                  {selectedLoadoutTemplate ? ` / 方案命中 ${selectedCharacterLoadoutMatchCount}` : ""}
                </span>
              </div>
              <AccountSlotCategories
                categories={groupAccountItemsBySlot(getCharacterCombinedItems(selectedCharacter))}
                highlightedTemplate={activeLoadoutLookup}
                openingItemKey={itemDetailLoadingKey}
                onOpenItem={(item) => void openItemDetail(item, {
                  source_character_id: selectedCharacter.character_id,
                  source_kind: isAccountItemFromSource(item, "equipped") ? "equipped" : "inventory"
                })}
              />
            </article>
            {renderDimToolsPanel(selectedCharacter)}
            <section className="vault-preview">
              <div className="section-heading compact-heading">
                <div>
                  <h3>本地方案库</h3>
                  <p>按方案查看角色装备快照，支持重命名和生成转移计划。</p>
                </div>
              </div>
              {selectedLoadoutTemplate ? (
                <div className="daily-source-grid">
                  <section className="daily-source source-ready">
                    <strong>当前方案</strong>
                    <span>{selectedLoadoutTemplate.name}</span>
                    <div className="action-log-list">
                      {loadoutTemplates.slice(0, 8).map((template) => (
                        <button
                          type="button"
                          key={template.id}
                          className={selectedLoadoutTemplate.id === template.id ? "action-log-row log-ok" : "action-log-row"}
                          onClick={() => {
                            setSelectedLoadoutTemplateId(template.id);
                            setLoadoutRenameDraft(template.name);
                          }}
                        >
                          <strong>{template.name}</strong>
                          <span>{template.class_name} / {template.items.length} 件装备</span>
                          <small>{new Date(template.updated_at ?? template.created_at).toLocaleString("zh-CN")}</small>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="daily-source source-ready">
                    <strong>方案详情</strong>
                    <span>
                      {selectedLoadoutAnalysis
                        ? `已就位 ${selectedLoadoutReadyCount} / 待补齐 ${selectedLoadoutMissingCount}`
                        : `${selectedLoadoutTemplate.items.length} 件装备`}
                    </span>
                    <div className="field-grid">
                      <label>
                        <span>重命名</span>
                        <input
                          value={loadoutRenameDraft}
                          onChange={(event) => setLoadoutRenameDraft(event.target.value)}
                          placeholder="输入方案名称"
                        />
                      </label>
                    </div>
                    <div className="button-row">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void renameLoadoutTemplate(selectedLoadoutTemplate)}
                      >
                        重命名
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void createTemplateTransferPlan(selectedLoadoutTemplate)}
                      >
                        生成转移计划
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void copyMissingLoadoutItems(selectedLoadoutTemplate, selectedLoadoutAnalysis)}
                      >
                        复制缺失清单
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={isRunningItemAction}
                        onClick={() => void executeMissingLoadoutTransfer(selectedLoadoutTemplate, selectedLoadoutAnalysis)}
                      >
                        {isRunningItemAction ? "执行中..." : "转移缺失件"}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void deleteLoadoutTemplate(selectedLoadoutTemplate.id)}
                      >
                        删除
                      </button>
                    </div>
                    {selectedLoadoutAnalysis?.warnings.length ? (
                      selectedLoadoutMissingCount > 0 ? (
                        <p className="notice">
                          当前有 {selectedLoadoutMissingCount} 件方案装备还没在目标角色就位，可用“转移缺失件”自动补齐并穿戴。
                        </p>
                      ) : null
                    ) : null}
                    {selectedLoadoutStatusSummary.length ? (
                      <div className="loadout-status-summary">
                        {selectedLoadoutStatusSummary.map((entry) => (
                          <span className="loadout-status-chip" key={entry.key}>
                            <b>{entry.label}</b>
                            <small>{entry.count} 件</small>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {selectedLoadoutTransferPlan?.blocked.length ? (
                      <p className="notice">
                        有 {selectedLoadoutTransferPlan.blocked.length} 件当前无法自动补齐，下面会显示原因和处理建议。
                      </p>
                    ) : null}
                    <ul className="daily-source-items">
                      {selectedLoadoutTemplate.items.slice(0, 10).map((item, index) => {
                        const isReady = selectedLoadoutTransferPlan
                          ? isTemplateItemReadyFromPlan(item, selectedLoadoutTransferPlan)
                          : isTemplateItemReady(item, selectedLoadoutAnalysis);
                        const blockedEntry = !isReady
                          ? selectedLoadoutTransferPlan?.blocked.find((entry) => {
                            if (item.instance_id && entry.item.instance_id) {
                              return item.instance_id === entry.item.instance_id;
                            }

                            return entry.item.hash === item.hash
                              && entry.item.bucket_name === item.bucket_name;
                          }) ?? null
                          : null;
                        const blockedDetails = blockedEntry
                          ? describeMissingLoadoutBlockedReason(blockedEntry.reason)
                          : null;
                        const sourceItem = !isReady
                          ? findBestTemplateSourceItem(item, accountSummary, selectedLoadoutTemplate.character_id)
                          : null;
                        const status = buildLoadoutItemStatus({
                          isReady,
                          sourceItem,
                          targetCharacterId: selectedLoadoutTemplate.character_id,
                          accountSummary
                        });
                        const transferFeedbackKey = buildLoadoutActionFeedbackKey(
                          selectedLoadoutTemplate.id,
                          item,
                          "transfer"
                        );
                        const equipFeedbackKey = buildLoadoutActionFeedbackKey(
                          selectedLoadoutTemplate.id,
                          item,
                          "equip"
                        );
                        const transferFeedbackState = loadoutActionFeedback[transferFeedbackKey] ?? "idle";
                        const equipFeedbackState = loadoutActionFeedback[equipFeedbackKey] ?? "idle";
                        return (
                          <li
                            className={`loadout-item status-${status.badge_tone}`}
                            key={`${selectedLoadoutTemplate.id}-${item.instance_id ?? item.hash}-${index}`}
                          >
                            <b>{item.name}</b>
                            <span className={`loadout-status-badge ${status.badge_tone}`}>
                              {status.badge_label}
                            </span>
                            <small>
                              {[
                                status.location_label,
                                item.bucket_name,
                                item.weapon_frame_name,
                                item.perk_names?.slice(0, 2).join(" / ")
                              ].filter(Boolean).join(" / ") || "暂无额外信息"}
                            </small>
                            {status.guidance_label && !blockedDetails ? (
                              <>
                                <small className="loadout-blocked-reason">{status.guidance_label}</small>
                                {status.guidance_hint ? (
                                  <small className="loadout-blocked-hint">{status.guidance_hint}</small>
                                ) : null}
                              </>
                            ) : null}
                            {blockedDetails ? (
                              <>
                                <small className="loadout-blocked-reason">无法自动补齐：{blockedDetails.label}</small>
                                <small className="loadout-blocked-hint">{blockedDetails.hint}</small>
                              </>
                            ) : null}
                            {!isReady ? (
                              <div className="button-row compact">
                                {!blockedDetails && status.key !== "current-inventory" && sourceItem?.instance_id ? (
                                  <button
                                    type="button"
                                    className={`secondary-button inline-action ${transferFeedbackState === "pending" ? "is-pending" : ""} ${transferFeedbackState === "success" ? "is-success" : ""}`.trim()}
                                    aria-busy={transferFeedbackState === "pending"}
                                    disabled={isRunningItemAction}
                                    onClick={() => void executeSingleLoadoutItemTransfer(selectedLoadoutTemplate, item)}
                                  >
                                    {getLoadoutActionButtonLabel("transfer", transferFeedbackState)}
                                  </button>
                                ) : null}
                                {!blockedDetails && status.key === "current-inventory" ? (
                                  <button
                                    type="button"
                                    className={`secondary-button inline-action ${equipFeedbackState === "pending" ? "is-pending" : ""} ${equipFeedbackState === "success" ? "is-success" : ""}`.trim()}
                                    aria-busy={equipFeedbackState === "pending"}
                                    disabled={isRunningItemAction}
                                    onClick={() => void equipSingleLoadoutItem(selectedLoadoutTemplate, item)}
                                  >
                                    {getLoadoutActionButtonLabel("equip", equipFeedbackState)}
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => openTemplateSourceItem(item, selectedLoadoutTemplate.character_id)}
                                >
                                  查看来源
                                </button>
                              </div>
                            ) : null}
                          </li>
                        )})}
                    </ul>
                    <div className="field-grid">
                      <label>
                        <span>对比方案</span>
                        <select
                          value={compareLoadoutTemplateId}
                          onChange={(event) => setCompareLoadoutTemplateId(event.target.value)}
                        >
                          <option value="">不对比</option>
                          {loadoutTemplates
                            .filter((template) => template.id !== selectedLoadoutTemplate.id)
                            .map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        <span>差异预览</span>
                        <input
                          type="checkbox"
                          checked={showLoadoutDiffOnly}
                          onChange={(event) => setShowLoadoutDiffOnly(event.target.checked)}
                        />
                        <small>仅看差异</small>
                      </label>
                    </div>
                    {compareLoadoutTemplate ? (
                      <div className="loadout-compare-grid">
                        {visibleLoadoutCompareRows.length ? visibleLoadoutCompareRows.map((row) => (
                          <article
                            className={row.changed ? "loadout-compare-row changed" : "loadout-compare-row"}
                            key={`${selectedLoadoutTemplate.id}-${compareLoadoutTemplate.id}-${row.slot}`}
                          >
                            <b>{row.slot}</b>
                            <section className="loadout-compare-side">
                              <strong>{selectedLoadoutTemplate.name}</strong>
                              <span>{row.left.name}</span>
                              <small>框架：{row.left.frame}</small>
                              <small>Perk：{formatLoadoutComparePerks(row.left.perks)}</small>
                            </section>
                            <section className="loadout-compare-side">
                              <strong>{compareLoadoutTemplate.name}</strong>
                              <span>{row.right.name}</span>
                              <small>框架：{row.right.frame}</small>
                              <small>Perk：{formatLoadoutComparePerks(row.right.perks)}</small>
                            </section>
                          </article>
                        )) : (
                          <article className="loadout-compare-row">
                            <b>差异预览</b>
                            <section className="loadout-compare-side">
                              <span>两个方案当前没有可展示差异。</span>
                            </section>
                          </article>
                        )}
                      </div>
                    ) : null}
                  </section>
                </div>
              ) : (
                <p className="notice">本地方案库还没有内容。</p>
              )}
            </section>
              </>
            ) : null}
            <section className="vault-preview">
              <h3>材料与消耗品</h3>
              {accountSummary.materials.items.length ? (
                <div className="material-grid">
                  {accountSummary.materials.items.map((material) => (
                    <article className="material-item" title={material.name} key={material.hash}>
                      {material.icon ? <img alt="" src={material.icon} /> : <div className="item-icon-placeholder" />}
                      <div>
                        <strong>{material.name}</strong>
                        <span>{material.quantity.toLocaleString("zh-CN")}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted-copy">没有读取到材料或消耗品数量。</p>
              )}
            </section>
            {selectedCharacter ? (
              <>
                <section className="vault-preview">
                  <div className="section-heading compact-heading">
                    <div>
                      <h3>游戏内配装栏</h3>
                      <p>只读显示 Bungie 游戏内已保存的配装槽，先做查看，不直接改名或切换。</p>
                    </div>
                  </div>
                  {selectedCharacter.loadout_slots.length ? (
                    <div className="action-log-list">
                      {selectedCharacter.loadout_slots.map((slot) => (
                        <div className="action-log-row log-ok" key={`${selectedCharacter.character_id}-loadout-${slot.index}`}>
                          <strong>{slot.name}</strong>
                          <span>槽位 {slot.index + 1} / {slot.item_count} 件装备</span>
                          <small>{slot.items.slice(0, 4).map((item) => item.name).join(" / ") || "当前槽位为空"}</small>
                          <div className="button-row">
                            <button
                              type="button"
                              className="secondary-button"
                              disabled={isRunningItemAction}
                              onClick={() => void equipSavedLoadout(selectedCharacter, slot)}
                            >
                              应用到当前角色
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              disabled={isRunningItemAction}
                              onClick={() => void snapshotCurrentLoadout(selectedCharacter, slot)}
                            >
                              用当前装备覆盖
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="notice">当前角色还没有读取到游戏内配装栏。</p>
                  )}
                </section>
                <section className="vault-preview">
                  <div className="section-heading compact-heading">
                    <div>
                      <h3>邮政官</h3>
                      <p>只读显示角色邮政官里的待领取物品，先帮助你发现堆积，不直接执行取回。</p>
                    </div>
                  </div>
                  {selectedCharacter.postmaster_items.length ? (
                    <div className="equipment-grid">
                      {selectedCharacter.postmaster_items.slice(0, 12).map((item) => {
                        const isPending = getItemKey(item) === itemDetailLoadingKey;
                        const isLoadoutMatch = matchesLoadoutTemplateItem(item, activeLoadoutLookup);
                        return (
                          <button
                            type="button"
                            className={[
                              "equipment-item",
                              "inventory",
                              isPending ? "pending" : "",
                              isLoadoutMatch ? "loadout-highlight" : ""
                            ].filter(Boolean).join(" ")}
                            key={`${item.hash}-${item.instance_id ?? "postmaster"}`}
                            aria-busy={isPending}
                            onClick={() => void openItemDetail(item, {
                              source_character_id: selectedCharacter.character_id,
                              is_postmaster_item: true
                            })}
                          >
                            {item.icon ? <img alt="" src={item.icon} /> : <div className="item-icon-placeholder" />}
                            <div>
                              <strong>{item.name}</strong>
                              {isLoadoutMatch ? <small className="loadout-template-badge">方案命中</small> : null}
                              <span>{formatAccountItemMeta(item)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="notice">当前角色邮政官为空。</p>
                  )}
                </section>
              </>
            ) : null}
            <section className="vault-preview">
              <div className="section-heading compact-heading">
                <div>
                  <h3>本地配装模板</h3>
                  <p>只保存当前装备快照，不会自动切换装备。</p>
                </div>
                <button type="button" className="secondary-button" onClick={() => void loadLoadoutTemplates()}>
                  刷新
                </button>
              </div>
              {loadoutMessage ? <p className="notice">{loadoutMessage}</p> : null}
              {loadoutTemplates.length ? (
                <div className="action-log-list">
                  {loadoutTemplates.slice(0, 6).map((template) => (
                    <div className="action-log-row log-ok" key={template.id}>
                      <strong>{template.name}</strong>
                      <span>{template.class_name} / {template.items.length} 件装备</span>
                      <small>{new Date(template.created_at).toLocaleString("zh-CN")}</small>
                      <button type="button" className="inline-action" onClick={() => void createTemplateTransferPlan(template)}>
                        生成转移计划
                      </button>
                      <button type="button" className="inline-action" onClick={() => void deleteLoadoutTemplate(template.id)}>
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="notice">还没有本地配装模板。</p>
              )}
            </section>
            <section className="vault-preview">
              <div className="section-heading compact-heading">
                <div>
                  <h3>最近活动</h3>
                  <p>读取 Bungie 最近活动，汇总 PVE/PVP 和 Raid/Dungeon 进度。</p>
                </div>
                <button type="button" className="secondary-button" onClick={() => void loadActivitySummary()}>
                  刷新活动
                </button>
              </div>
              {activityMessage ? <p className="notice">{activityMessage}</p> : null}
              {activityError ? <p className="error">{activityError}</p> : null}
              {activitySummary ? (
                <>
                  <div className="daily-source-grid">
                    <div className="daily-source source-ready">
                      <strong>PVE</strong>
                      <span>{activitySummary.recent.pve.completed} / {activitySummary.recent.pve.total} 次完成</span>
                    </div>
                    <div className="daily-source source-ready">
                      <strong>PVP</strong>
                      <span>{activitySummary.recent.pvp.completed} / {activitySummary.recent.pvp.total} 次完成</span>
                    </div>
                    <div className="daily-source source-ready">
                      <strong>最后活动</strong>
                      <span>{activitySummary.recent.latest_period ? new Date(activitySummary.recent.latest_period).toLocaleString("zh-CN") : "暂无"}</span>
                    </div>
                  </div>
                  {activitySummary.raids.entries.length ? (
                    <div className="action-log-list">
                      {activitySummary.raids.entries.slice(0, 6).map((entry) => (
                        <div className="action-log-row log-ok" key={`${entry.activity_type}-${entry.activity_name}`}>
                          <strong>{entry.activity_name}</strong>
                          <span>{entry.activity_type === "raid" ? "Raid" : "Dungeon"} / 完成 {entry.completions} 次 / 尝试 {entry.attempts} 次</span>
                          <small>{entry.last_completed_at ? `最后完成：${new Date(entry.last_completed_at).toLocaleString("zh-CN")}` : "暂无完成记录"}</small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="notice">最近记录里还没有 Raid/Dungeon 完成数据。</p>
                  )}
                </>
              ) : (
                <p className="notice">读取账号后可以刷新最近活动。</p>
              )}
            </section>
          </div>
        ) : null}
      </section>
    );
  }

  function importWishlistDraft() {
    const wishlist = parseDimWishlist(wishlistImportDraft);
    setWishlistImportMessage(wishlist.rules.length
      ? `已识别 ${wishlist.rules.length} 条 DIM 愿望单规则：${wishlist.title}`
      : "没有识别到 DIM 愿望单规则。");
  }

  async function saveImportedWishlist() {
    const wishlist = parseDimWishlist(wishlistImportDraft);
    if (!wishlist.rules.length) {
      setWishlistImportMessage("没有识别到 DIM 愿望单规则。");
      return;
    }

    try {
      const saved = await api.saveDimWishlist(wishlist);
      setImportedWishlist(saved);
      setWishlistImportMessage(`已导入 ${saved.rules.length} 条 DIM 愿望单规则：${saved.title}`);
    } catch (error) {
      setWishlistImportMessage(error instanceof Error ? error.message : "DIM 愿望单保存失败");
    }
  }

  async function clearImportedWishlist() {
    try {
      await api.clearDimWishlist();
      setImportedWishlist(null);
      setWishlistImportMessage("已清空 DIM 愿望单。");
    } catch (error) {
      setWishlistImportMessage(error instanceof Error ? error.message : "DIM 愿望单清空失败");
    }
  }

  function renderDimToolsPanel(character: AccountSummary["characters"][number]) {
    const transferQueueItems = normalizeAccountItemsForCore(
      [...character.inventory_items]
        .filter((item) => {
          const localTag = vaultTags.items[getItemKey(item)]?.tag;
          return localTag === "junk" || scoreVaultItem(item, vaultTags).grade === "junk";
        })
        .sort((left, right) =>
          scoreVaultItem(left, vaultTags).score - scoreVaultItem(right, vaultTags).score
          || (left.power ?? 0) - (right.power ?? 0)
        )
        .slice(0, 8)
    );
    const transferQueue = createTransferQueue({
      character_id: character.character_id,
      transfer_to_vault: true,
      items: transferQueueItems
    });
    const farmingPlan = createFarmingModePlan({
      character_id: character.character_id,
      inventory_items: normalizeAccountItemsForCore(character.inventory_items),
      max_inventory_slots: Math.max(character.inventory_items.length, 10),
      keep_free_slots: 3
    });
    const availableItems = accountSummary ? normalizeAccountItemsForCore(getAllKnownAccountItemsWithSource(accountSummary)) : [];
    const loadoutAnalyses = loadoutTemplates.slice(0, 3).map((template) => ({
      template,
      analysis: analyzeLoadoutTemplate(template, availableItems)
    }));
    const armorSuggestions = suggestArmorStatSets([], { preferred_stats: ["resilience", "recovery"], limit: 1 });

    return (
      <section className="vault-preview dim-tools-panel">
        <div className="section-heading compact-heading">
          <div>
            <h3>DIM 整理工具</h3>
            <p>先生成可读计划，涉及转移或装备的动作仍需要你确认后执行。</p>
          </div>
        </div>
        <div className="daily-source-grid">
          <div className="daily-source source-ready">
            <strong>转移队列</strong>
            <span>{transferQueueItems.length ? transferQueue.summary : "当前背包没有低分或可清理候选。"}</span>
            <ul className="daily-source-items">
              {transferQueue.steps.slice(0, 5).map((step) => (
                <li key={step.id}>
                  <b>{step.item_name}</b>
                  <small>{step.transfer_to_vault ? "移入仓库" : "取出到角色"} / {step.status}</small>
                </li>
              ))}
            </ul>
            <div className="button-row">
              <button
                type="button"
                className="secondary-button"
                disabled={!transferQueueItems.length}
                onClick={() => void copyBatchTransferPlanText({
                  character_id: character.character_id,
                  transfer_to_vault: true,
                  items: transferQueueItems
                })}
              >
                复制转移计划
              </button>
              <button
                type="button"
                disabled={!transferQueueItems.length || isRunningItemAction}
                onClick={() => void runVaultCleanupWriteAction(
                  "移入仓库",
                  transferQueueItems,
                  character.character_id,
                  (item) => api.transferItem({
                    membership_type: accountSummary?.membership_type ?? 0,
                    character_id: character.character_id,
                    item_id: item.instance_id ?? "",
                    item_reference_hash: item.hash,
                    item_name: item.name,
                    transfer_to_vault: true
                  })
                ).then(setDimToolsMessage)}
              >
                {isRunningItemAction ? "执行中..." : "执行转移"}
              </button>
            </div>
          </div>
          <div className="daily-source source-ready">
            <strong>Farming Mode</strong>
            <span>{farmingPlan.summary}</span>
            <ul className="daily-source-items">
              {farmingPlan.transfer_items.slice(0, 5).map((item) => (
                <li key={item.instance_id ?? item.hash}>
                  <b>{item.name}</b>
                  <small>{item.bucket_name ?? "未知位置"} / 光等 {item.power ?? "-"}</small>
                </li>
              ))}
            </ul>
            <div className="button-row">
              <button
                type="button"
                className="secondary-button"
                disabled={!farmingPlan.transfer_items.length}
                onClick={() => void copyBatchTransferPlanText({
                  character_id: character.character_id,
                  transfer_to_vault: true,
                  items: farmingPlan.transfer_items
                })}
              >
                复制腾包计划
              </button>
              <button
                type="button"
                disabled={!farmingPlan.transfer_items.length || isRunningItemAction}
                onClick={() => void runVaultCleanupWriteAction(
                  "腾包移入仓库",
                  farmingPlan.transfer_items,
                  character.character_id,
                  (item) => api.transferItem({
                    membership_type: accountSummary?.membership_type ?? 0,
                    character_id: character.character_id,
                    item_id: item.instance_id ?? "",
                    item_reference_hash: item.hash,
                    item_name: item.name,
                    transfer_to_vault: true
                  })
                ).then(setDimToolsMessage)}
              >
                {isRunningItemAction ? "执行中..." : "立即腾包"}
              </button>
            </div>
          </div>
          <div className="daily-source source-ready">
            <strong>Loadout 分析</strong>
            <span>{loadoutAnalyses.length ? "已检查本地模板缺失项。" : "暂无本地配装模板。"}</span>
            <ul className="daily-source-items">
              {loadoutAnalyses.map(({ template, analysis }) => (
                <li key={template.id}>
                  <b>{template.name}</b>
                  <small>已有 {analysis.equipped.length} 件 / 缺失 {analysis.missing.length} 件</small>
                </li>
              ))}
            </ul>
          </div>
          <div className="daily-source source-pending">
            <strong>护甲组合建议</strong>
            <span>{armorSuggestions.length ? `${armorSuggestions[0].score} 分组合` : "暂未接入护甲属性明细，不能猜测组合。"}</span>
          </div>
        </div>
        {dimToolsMessage ? <p className="notice">{dimToolsMessage}</p> : null}
        <div className="wishlist-import-panel">
          <label htmlFor="dim-wishlist-import">导入 DIM 愿望单</label>
          <p className="muted-copy">
            {importedWishlist
              ? `当前已启用 ${importedWishlist.title} / ${importedWishlist.rules.length} 条规则`
              : "当前未启用 DIM 愿望单。导入后，仓库评分和装备详情会一起使用这份愿望单。"}
          </p>
          <textarea
            id="dim-wishlist-import"
            value={wishlistImportDraft}
            onChange={(event) => setWishlistImportDraft(event.target.value)}
            placeholder="粘贴 DIM wishlist 文本，例如 dimwishlist:item=123&perks=11,22#notes:PVE"
            rows={4}
          />
          <div className="button-row">
            <button type="button" className="secondary-button" onClick={importWishlistDraft}>
              解析愿望单
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={!wishlistImportDraft.trim()}
              onClick={() => void saveImportedWishlist()}
            >
              导入并启用
            </button>
            <button type="button" className="secondary-button" disabled={!importedWishlist} onClick={() => void clearImportedWishlist()}>
              清空愿望单
            </button>
            {wishlistImportMessage ? <span className="muted-copy">{wishlistImportMessage}</span> : null}
          </div>
        </div>
      </section>
    );
  }

function renderDailyPanel() {
    return (
      <section className="tool-panel">
        <div className="section-heading">
          <div>
            <h2>今日 / 本周</h2>
            <p>只展示可确认的真实数据；未接入或不可确认的内容不会猜测。</p>
          </div>
          <div className="button-row">
            <button type="button" className="secondary-button" disabled={isLoadingDaily} onClick={() => void loadDailySummary()}>
              {isLoadingDaily ? "刷新中..." : "刷新"}
            </button>
            <button type="button" disabled={!dailySummary} onClick={() => void copyDailySummary()}>
              复制日报
            </button>
            <button type="button" className="secondary-button" disabled={!dailySummary} onClick={() => void copyWeeklyFocus()}>
              复制本周重点
            </button>
          </div>
        </div>
        {dailyError ? <p className="error">{dailyError}</p> : null}
        {dailyMessage ? <p className="notice">{dailyMessage}</p> : null}
        {dailySummary ? (
          <>
            <div className="daily-reset-grid">
              <div>
                <strong>{dailySummary.daily_reset.label}</strong>
                <span>{dailySummary.daily_reset.time_remaining_label}</span>
              </div>
              <div>
                <strong>{dailySummary.weekly_reset.label}</strong>
                <span>{dailySummary.weekly_reset.time_remaining_label}</span>
              </div>
            </div>
            <div className="daily-board">
              <section className="daily-column">
                <div className="daily-brief">
                  <div className="daily-brief-heading">
                    <strong>今日行动</strong>
                    <div className="daily-brief-meta">
                      <span className="daily-date-badge">{dailySummary.date_label}</span>
                      <span className="daily-brief-count">{dailySummary.checklist.length} 条</span>
                    </div>
                  </div>
                  <ol className="daily-action-list">
                    {dailySummary.checklist.slice(0, 5).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                </div>
                {renderDailySourceCard(dailySummary.sources.rotations)}
                {renderDailySourceCard(dailySummary.sources.lost_sector)}
                {renderDailySourceCard(dailySummary.sources.vendors)}
              </section>
              <section className="daily-column">
                <div className="daily-brief weekly-brief">
                  <div className="daily-brief-heading">
                    <strong>本周周报</strong>
                    <span className="daily-brief-count">{dailySummary.recommendations.length} 条</span>
                  </div>
                  <ul className="weekly-focus-list">
                    {dailySummary.recommendations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className="weekly-focus-sections">
                    {buildWeeklyDigestSections(dailySummary).map((section) => (
                      <section className="weekly-focus-section" key={section.key}>
                        <strong>{section.title}</strong>
                        <ul>
                          {section.items.map((item) => (
                            <li key={section.key + item}>{item}</li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </div>
                {renderDailySourceCard(dailySummary.sources.weekly_report)}
                <div className="daily-source source-pending">
                  <strong>掉落地图 / 轮换细节</strong>
                  <span>只展示 Bungie API 或本地资料库能确认的内容；未接入时保持为空，不猜测。</span>
                </div>
              </section>
            </div>
          </>
        ) : (
          <p className="notice">今日面板读取中。</p>
        )}
      </section>
    );
  }

  function renderDailySourceCard(source: DailySummary["sources"][keyof DailySummary["sources"]]) {
    return (
      <div className={"daily-source source-" + source.status} key={source.label}>
        <div className="daily-source-heading">
          <strong>{source.label}</strong>
          <div className="daily-source-meta">
            <span className={"daily-source-status status-" + source.status}>{formatDailySourceStatus(source.status)}</span>
            {source.items?.length ? <span className="daily-source-count">{source.items.length} 条</span> : null}
          </div>
        </div>
        <span>{source.message}</span>
        {source.items?.length ? (
          <ul className="daily-source-items">
            {source.items.map((item) => (
              <li key={"${source.label}-" + item.title}>
                <b>{item.title}</b>
                {item.subtitle ? <small>{item.subtitle}</small> : null}
                {item.description ? <small>{item.description}</small> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  function renderSearchPanel() {
    const libraryEquipmentFilter = equipmentFilters;
    const equipmentFilterOptions = buildLibraryEquipmentFilterOptions(items);
    const perkGroupOptions = buildLibraryPerkGroupOptions(perks);
    const visibleItems = filterLibraryEquipmentItems(items, libraryEquipmentFilter);
    const visiblePerks = filterLibraryPerks(perks, perkFilters);
    const hitCount = libraryViewMode === "equipment" ? visibleItems.length : visiblePerks.length;
    const searchTouched = libraryViewMode === "equipment" ? equipmentSearchTouched : perkSearchTouched;

    function updateEquipmentFilters(patch: Partial<LibraryEquipmentFilter>) {
      setEquipmentFilters((current) => ({ ...current, ...patch }));
    }

    function updatePerkFilters(patch: Partial<LibraryPerkFilter>) {
      setPerkFilters((current) => ({ ...current, ...patch }));
    }

    return (
      <section className="tool-panel">
        <div>
          <h2>资料库搜索</h2>
          <p>按装备和 Perk 分开检索，筛选只基于本地 Manifest 里已经确认的字段。</p>
        </div>
        <div className="segmented-control">
          <button
            type="button"
            value="equipment"
            className={libraryViewMode === "equipment" ? "active" : ""}
            onClick={() => setLibraryViewMode("equipment")}
          >
            装备
          </button>
          <button
            type="button"
            value="perks"
            className={libraryViewMode === "perks" ? "active" : ""}
            onClick={() => setLibraryViewMode("perks")}
          >
            Perk
          </button>
        </div>
        <div className="library-filter-grid">
          {libraryViewMode === "equipment" ? (
            <>
              <label className="compact-field">
                分类
                <select
                  value={libraryEquipmentFilter.group}
                  onChange={(event) => updateEquipmentFilters({ group: event.target.value as LibraryEquipmentFilter["group"] })}
                >
                  {equipmentFilterOptions.groups.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="compact-field">
                稀有度
                <select value={libraryEquipmentFilter.tier} onChange={(event) => updateEquipmentFilters({ tier: event.target.value })}>
                  {equipmentFilterOptions.tiers.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="compact-field">
                位置
                <select value={libraryEquipmentFilter.bucket} onChange={(event) => updateEquipmentFilters({ bucket: event.target.value })}>
                  {equipmentFilterOptions.buckets.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              {libraryEquipmentFilter.group === "weapons" ? (
                <>
                  <label className="compact-field">
                    弹药
                    <select
                      value={libraryEquipmentFilter.ammo}
                      onChange={(event) => updateEquipmentFilters({ ammo: event.target.value as LibraryEquipmentFilter["ammo"] })}
                    >
                      {equipmentFilterOptions.ammo.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <div className="compact-field">
                    <span>框架</span>
                    <div className="segmented-control" aria-label="资料库武器框架筛选">
                      {equipmentFilterOptions.frames.map((option) => (
                        option.value === "all" ? (
                          <button
                            type="button"
                            key={option.value}
                            className={!libraryEquipmentFilter.frame.length ? "active" : ""}
                            onClick={() => updateEquipmentFilters({ frame: [] })}
                          >
                            {option.label}
                          </button>
                        ) : (
                          <button
                            type="button"
                            key={option.value}
                            className={libraryEquipmentFilter.frame.includes(option.value) ? "active" : ""}
                            onClick={() => updateEquipmentFilters({
                              frame: libraryEquipmentFilter.frame.includes(option.value)
                                ? libraryEquipmentFilter.frame.filter((value) => value !== option.value)
                                : [...libraryEquipmentFilter.frame, option.value]
                            })}
                          >
                            {option.label}
                          </button>
                        )
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <>
              <label className="compact-field">
                关联分类
                <select
                  value={perkFilters.relatedGroup}
                  onChange={(event) => updatePerkFilters({ relatedGroup: event.target.value as LibraryPerkFilter["relatedGroup"] })}
                >
                  {perkGroupOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="compact-field">
                关联装备
                <select
                  value={perkFilters.hasRelatedItems}
                  onChange={(event) => updatePerkFilters({ hasRelatedItems: event.target.value as LibraryPerkFilter["hasRelatedItems"] })}
                >
                  <option value="all">全部</option>
                  <option value="yes">有</option>
                  <option value="no">无</option>
                </select>
              </label>
            </>
          )}
        </div>
        <div className="search-row">
          <input
            value={libraryViewMode === "equipment" ? equipmentFilters.query : perkFilters.query}
            onChange={(event) => {
              if (libraryViewMode === "equipment") {
                updateEquipmentFilters({ query: event.target.value });
              } else {
                updatePerkFilters({ query: event.target.value });
              }
            }}
            placeholder={libraryViewMode === "perks" ? "输入 Perk 名称或别名，例如 ff" : "输入装备名称，例如 Riskrunner"}
          />
          <button type="button" disabled={isSearching} onClick={() => void searchItems()}>
            {isSearching ? "搜索中..." : "搜索"}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              if (libraryViewMode === "equipment") {
                setEquipmentFilters(defaultLibraryEquipmentFilter);
                setItems([]);
                setEquipmentSearchTouched(false);
              } else {
                setPerkFilters(defaultLibraryPerkFilter);
                setPerks([]);
                setPerkSearchTouched(false);
              }
            }}
          >
            清空筛选
          </button>
        </div>
        <p className="muted-copy">命中 {hitCount} 条。不会补猜来源、分类或关联项，缺字段就按缺字段显示。</p>
        <div className="alias-editor">
          <input value={aliasDraft} onChange={(event) => setAliasDraft(event.target.value)} placeholder="别名，例如 ff" />
          <input value={aliasTargetDraft} onChange={(event) => setAliasTargetDraft(event.target.value)} placeholder="实际名称，例如 喂食狂热" />
          <select value={aliasKind} onChange={(event) => setAliasKind(event.target.value as typeof aliasKind)}>
            <option value="item">装备</option>
            <option value="perk">Perk</option>
          </select>
          <button
            type="button"
            className="secondary-button"
            disabled={!aliasDraft.trim() || !aliasTargetDraft.trim()}
            onClick={() => void saveAlias()}
          >
            保存别名
          </button>
        </div>
        <p className="muted-copy">别名会保存在本机，只影响你自己的搜索。</p>
        {aliasMessage ? <p className="notice">{aliasMessage}</p> : null}
        {searchError ? <p className="error">{searchError}</p> : null}
        <div className="daily-source-grid">
          <div className="daily-source source-ready">
            <strong>最近查看</strong>
            <span>{libraryHistory.recent.slice(0, 5).map((item) => item.name).join(" / ") || "暂无"}</span>
          </div>
          <div className="daily-source source-ready">
            <strong>收藏</strong>
            <span>{libraryHistory.favorites.slice(0, 5).map((item) => item.name).join(" / ") || "暂无"}</span>
          </div>
        </div>
        <div className="item-results">
          {libraryViewMode === "equipment" ? visibleItems.map((item) => (
            <article className="item-result" key={item.hash}>
              {item.icon ? <img alt="" src={item.icon} /> : null}
              <div>
                <h3>{item.name}</h3>
                <p>{[item.tier, item.item_type, item.bucket_name].filter(Boolean).join(" / ")}</p>
                <p>{item.description}</p>
                <p><strong>{item.source.label}：</strong>{item.source.description}</p>
                {item.perks?.length ? (
                  <div className="perk-groups">
                    {item.perks.slice(0, 6).map((group) => (
                      <div className="perk-group" key={group.socket_index}>
                        {group.plugs.slice(0, 6).map((plug) => (
                          <span className="perk-chip" key={plug.hash}>{plug.name}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}
                {libraryCommunityMatch.get(item.hash)?.matched ? (
                  <small className="library-community-match">
                    社区推荐 {libraryCommunityMatch.get(item.hash)?.matched} 个组合
                  </small>
                ) : null}
                <button
                  type="button"
                  className="inline-action"
                  aria-busy={getItemKey(item) === itemDetailLoadingKey}
                  onClick={() => void openItemDetail(item)}
                >
                  查看详情
                </button>
                <button type="button" className="inline-action" onClick={() => void addSelectedItemToFavorites(item)}>
                  收藏
                </button>
                {libraryHistory.favorites.some((favorite) => favorite.hash === item.hash) ? (
                  <button type="button" className="inline-action" onClick={() => void removeFavorite(item.hash)}>
                    取消收藏
                  </button>
                ) : null}
              </div>
            </article>
          )) : visiblePerks.map((perk) => (
            <article className="item-result" key={perk.hash}>
              {perk.icon ? <img alt="" src={perk.icon} /> : null}
              <div>
                <h3>{perk.name}</h3>
                <p>{perk.description}</p>
                {perk.related_items?.length ? (
                  <>
                    <p>
                      <strong>关联分类：</strong>
                      {[...new Set(perk.related_items.map((item) => formatLibraryGroupLabel(item.group_key)).filter(Boolean))].join(" / ")}
                    </p>
                    <p><strong>可能出现于：</strong>{perk.related_items.map((item) => item.name).join(" / ")}</p>
                  </>
                ) : (
                  <p>本地 Manifest 里还没有查到关联装备。</p>
                )}
                <button type="button" className="inline-action" onClick={() => void addSelectedItemToFavorites(perk)}>
                  收藏
                </button>
              </div>
            </article>
          ))}
        </div>
        {searchTouched && !isSearching && !searchError && !hitCount ? (
          <p className="notice">未找到匹配结果。可以换中文名、英文名，或者先保存一个常用别名再搜。</p>
        ) : null}
      </section>
    );
  }

  function renderVaultPanel() {
    if (!accountSummary) {
      return (
        <section className="tool-panel placeholder-panel">
          <div className="section-heading">
            <div>
              <h2>仓库</h2>
              <p>先读取账号数据，然后查看完整仓库列表。</p>
            </div>
            <button type="button" disabled={isLoadingAccount} onClick={() => void loadAccountSummary()}>
              {isLoadingAccount ? "读取中..." : "读取账号数据"}
            </button>
          </div>
          {accountError ? <p className="error">{accountError}</p> : null}
        </section>
      );
    }

    return (
      <VaultPanel
        items={accountSummary.vault.items}
        highlightedItemKeys={activeLoadoutLookup}
        highlightedLabel={activeLoadoutTemplate?.name}
        tags={vaultTags}
        openingItemKey={itemDetailLoadingKey}
        onSaveTagBatch={(inputs) => saveVaultTagsBatch(inputs)}
        cleanupActions={{
          characters: accountSummary.characters,
          currentCharacterId: selectedCharacterId || accountSummary.characters[0]?.character_id,
          currentCharacterLabel: accountSummary.characters.find((character) => character.character_id === (selectedCharacterId || accountSummary.characters[0]?.character_id))?.class_name,
          writeActionsEnabled,
          onBatchUnlock: handleVaultCleanupUnlock,
          onBatchTransferToCharacter: handleVaultCleanupTransfer
        }}
        wishlist={importedWishlist}
        communityMatch={vaultCommunityMatch}
        onOpenItem={(item) => void openItemDetail(item, { is_vault_item: true })}
        onSaveTag={(item, tag) => saveVaultTag(item, tag)}
      />
    );
  }

  function renderItemModal() {
    if (!selectedItem) return null;
    const itemScore = selectedItem.group_key
      ? scoreVaultItem({
        hash: selectedItem.hash,
        instance_id: selectedItem.instance_id,
        name: selectedItem.name,
        tier: selectedItem.tier,
        group_key: selectedItem.group_key,
        locked: selectedItem.locked,
        socket_plugs: selectedItem.socket_plugs
      }, vaultTags)
      : null;
    const selectedAsAccountItem = selectedItemToAccountItem(selectedItem);
    const wishlist = selectedAsAccountItem ? evaluateWishlistRoll({
      ...selectedAsAccountItem,
      socket_plugs: selectedAsAccountItem.socket_plugs ?? []
    }, importedWishlist ?? undefined) : null;
    const wishlistModeLabels = wishlist ? formatWishlistModeLabels(wishlist.labels) : [];
    const sameNameItems = selectedAsAccountItem && accountSummary
      ? getAllKnownAccountItemsWithSource(accountSummary)
        .filter((item) => item.name.trim() === selectedAsAccountItem.name.trim())
      : [];
    const sameNameSourceStats = buildSameNameSourceStats(sameNameItems);
    const sameNameDuplicateGroup = sameNameItems.length > 1
      ? buildVaultDuplicateSummary(sameNameItems, vaultTags).groups[0]
      : undefined;
    const sortedSameNameItems = [...sameNameItems].sort((left, right) => {
      const leftKey = getItemKey(left);
      const rightKey = getItemKey(right);
      const currentKey = selectedItem.item_key;

      if (leftKey === currentKey && rightKey !== currentKey) return -1;
      if (rightKey === currentKey && leftKey !== currentKey) return 1;

      return scoreVaultItem(right, vaultTags).score - scoreVaultItem(left, vaultTags).score
        || Number(Boolean(right.locked)) - Number(Boolean(left.locked))
        || left.name.localeCompare(right.name, "zh-Hans-CN");
    });

    return (
      <div className="modal-backdrop" role="presentation" onClick={closeSelectedItemDetail}>
        <section
          className="item-modal"
          role="dialog"
          aria-modal="true"
          aria-busy={selectedItem.is_detail_loading ? "true" : "false"}
          onClick={(event) => event.stopPropagation()}
        >
          <button className="modal-close" type="button" onClick={closeSelectedItemDetail}>关闭</button>
          <div className="modal-title">
            {selectedItem.icon ? <img alt="" src={selectedItem.icon} /> : null}
            <div>
              <h2>{selectedItem.name}</h2>
              <p>{[selectedItem.tier, selectedItem.item_type].filter(Boolean).join(" / ")}</p>
              {selectedItem.power ? <p>光等 {selectedItem.power}</p> : null}
              {selectedItem.locked !== undefined ? <p>{selectedItem.locked ? "已锁定" : "未锁定"}</p> : null}
            </div>
          </div>
          {selectedItem.is_detail_loading ? (
            <section className="item-detail-loading" aria-live="polite">
              <strong>正在打开详情...</strong>
              <span>先显示基础信息，来源、perk 和详细说明会继续加载。</span>
            </section>
          ) : null}
          {selectedItem.description ? <p>{selectedItem.description}</p> : null}
          <section className={selectedItem.is_detail_loading ? "daily-source item-detail-loading" : "daily-source source-ready"}>
            <strong>{selectedItem.source.label}</strong>
            <span>{selectedItem.source.description}</span>
          </section>
          {wishlist?.matched ? (
            <section className="wishlist-panel">
              <div className="wishlist-detail-header">
                <div>
                  <h3>{wishlist.labels.includes("DIM Wishlist") ? "DIM 愿望单命中" : "疑似好 roll"}</h3>
                  <p>{wishlistModeLabels.length ? wishlistModeLabels.join(" / ") : wishlist.labels.join(" / ")}</p>
                </div>
                <div className="wishlist-mode-badges">
                  {wishlist.labels.includes("DIM Wishlist") ? <span className="wishlist-detail-badge">DIM 愿望单</span> : null}
                  {wishlistModeLabels.map((label) => (
                    <span className="wishlist-detail-badge secondary" key={label}>{label}</span>
                  ))}
                </div>
              </div>
              <div className="wishlist-local-tag">
                <strong>当前本地标记</strong>
                <span>{formatVaultTagLabel(vaultTags.items[selectedItem.item_key]?.tag ?? "none")}</span>
              </div>
              {sameNameItems.length > 1 ? (
                <div className="wishlist-same-name-summary">
                  <strong>{"同名共 " + sameNameSourceStats.total + " 件"}</strong>
                  <div className="wishlist-same-name-chips">
                    <span className="wishlist-same-name-chip">{"已装备 " + sameNameSourceStats.equipped}</span>
                    <span className="wishlist-same-name-chip">{"背包 " + sameNameSourceStats.inventory}</span>
                    <span className="wishlist-same-name-chip">{"仓库 " + sameNameSourceStats.vault}</span>
                    <span className="wishlist-same-name-chip">{"邮政官 " + sameNameSourceStats.postmaster}</span>
                  </div>
                </div>
              ) : null}
              <ul>
                {wishlist.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
              <div className="button-row wishlist-quick-actions">
                <button type="button" className="secondary-button" onClick={() => void saveSelectedItemTag("keep")}>
                  标记保留
                </button>
                <button type="button" className="secondary-button" onClick={() => void saveSelectedItemTag("review")}>
                  标记关注
                </button>
                <button type="button" className="secondary-button" onClick={() => void saveSelectedItemTag("none")}>
                  清除标记
                </button>
                <button type="button" className="secondary-button" onClick={() => void copyWishlistInsight()}>
                  复制命中结论
                </button>
                {sameNameItems.length > 1 ? (
                  <>
                    <button type="button" className="secondary-button" onClick={() => openBestSameNameItem(sortedSameNameItems)}>
                      打开最佳同名
                    </button>
                    <button type="button" className="secondary-button" onClick={() => void copySameNameLocator(sameNameItems)}>
                      复制同名定位
                    </button>
                    <button type="button" className="secondary-button" onClick={() => void applySameNameCurrentKeepTags(sameNameItems, selectedItem.item_key, "keep-current-review-rest")}>
                      当前保留，其余关注
                    </button>
                    <button type="button" className="secondary-button" onClick={() => void applySameNameCurrentKeepTags(sameNameItems, selectedItem.item_key, "keep-current-junk-rest")}>
                      当前保留，其余可清理
                    </button>
                  </>
                ) : null}
              </div>
              <small>{wishlist.disclaimer}</small>
            </section>
          ) : null}

          {communityRecommendations ? (
            <section className="community-recommendations-panel">
              <div className="community-recommendations-header">
                <div>
                  <h3>社区推荐 Perk 组合</h3>
                  <p>{communityRecommendations.matched_modes.map(formatCommunityMode).join(" / ") || "未标注模式"}</p>
                </div>
                <div className="community-source-badges">
                  {communityRecommendations.combos[0]?.source === "dim_wishlist" ? (
                    <span className="community-source-badge">DIM Wishlist</span>
                  ) : null}
                  {communityRecommendations.combos[0]?.source === "ai_lightgg" ? (
                    <span className="community-source-badge">AI · light.gg</span>
                  ) : null}
                </div>
              </div>
              <ul className="community-combos">
                {communityRecommendations.combos.map((combo, index) => (
                  <li key={index} className={`community-combo mode-${combo.mode}`}>
                    <div className="community-combo-mode">
                      <strong>{formatCommunityMode(combo.mode)}</strong>
                      {combo.popularity ? <small>热度 {combo.popularity.toFixed(1)}%</small> : null}
                    </div>
                    <div className="community-combo-perks">
                      {combo.perks.map((perk) => (
                        <div className="community-perk" key={perk.hash}>
                          {perk.icon ? <img alt="" src={perk.icon} /> : null}
                          <div>
                            <strong>{perk.name}</strong>
                            {perk.description ? <p>{perk.description}</p> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                    {combo.note ? (
                      <small className="community-combo-note">{combo.note}</small>
                    ) : null}
                  </li>
                ))}
              </ul>
              {communityRecommendations.disclaimer ? (
                <small>{communityRecommendations.disclaimer}</small>
              ) : null}
            </section>
          ) : isCommunityRecommendationsLoading ? (
            <section className="community-recommendations-panel loading">
              <p className="notice">正在读取社区推荐...</p>
            </section>
          ) : (
            <section className="community-recommendations-panel empty">
              <h3>社区推荐</h3>
              <p className="notice">
                {aiSettings.enable_lightgg
                  ? "暂无社区推荐。已尝试查询 light.gg 和本地 DIM wishlist，均未命中。"
                  : "暂无社区推荐。导入 DIM wishlist 或在 AI 设置中开启 light.gg 实时分析以获取推荐。"}
              </p>
            </section>
          )}

          <section className="item-note-panel">
            <label htmlFor="item-note-draft">本地备注</label>
            <textarea
              id="item-note-draft"
              value={itemNoteDraft}
              onChange={(event) => setItemNoteDraft(event.target.value)}
              placeholder="例如：留给电猎清杂 / 等队友复查 PVP 手感 / 同名已有更好 roll"
              rows={3}
            />
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={() => void saveSelectedItemNote()}>
                保存备注
              </button>
              {itemNoteMessage ? <span className="muted-copy">{itemNoteMessage}</span> : null}
            </div>
          </section>
          {selectedItem.instance_id ? (
            <section className="item-action-panel">
              <div>
                <h3>装备操作</h3>
                <p>
                  默认关闭。开启后每次操作都会再次确认，并写入本地日志。
                </p>
              </div>
              {accountSummary?.characters.length ? (
                <label className="compact-field">
                  目标角色
                  <select
                    value={selectedActionCharacterId}
                    onChange={(event) => setSelectedActionCharacterId(event.target.value)}
                  >
                    {accountSummary.characters.map((character) => (
                      <option key={character.character_id} value={character.character_id}>
                        {character.class_name} / 光等 {character.light ?? "-"}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <div className="button-row">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={isRunningItemAction}
                  hidden={selectedItem.is_postmaster_item}
                  onClick={() => void runItemWriteAction(
                    selectedItem.locked ? "解锁" : "锁定",
                    () => api.setItemLockState({
                      membership_type: accountSummary?.membership_type ?? 0,
                      character_id: selectedActionCharacterId,
                      item_id: selectedItem.instance_id ?? "",
                      item_name: selectedItem.name,
                      state: !selectedItem.locked
                    })
                  )}
                >
                  {selectedItem.locked ? "解锁" : "锁定"}
                </button>
                {!selectedItem.is_vault_item && !selectedItem.is_postmaster_item ? (
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={isRunningItemAction}
                    onClick={() => void runItemWriteAction(
                      "装备到角色",
                      () => api.equipItem({
                        membership_type: accountSummary?.membership_type ?? 0,
                        character_id: selectedActionCharacterId,
                        item_id: selectedItem.instance_id ?? "",
                        item_name: selectedItem.name
                      })
                    )}
                  >
                    装备到角色
                  </button>
                ) : null}
                {!selectedItem.is_postmaster_item ? (
                  <>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={isRunningItemAction}
                      onClick={() => void copyItemActionPlanText({
                        action: "transfer",
                        item_name: selectedItem.name,
                        item_instance_id: selectedItem.instance_id,
                        item_reference_hash: selectedItem.hash,
                        character_id: selectedItem.is_vault_item
                          ? selectedActionCharacterId
                          : selectedItem.source_character_id ?? selectedActionCharacterId,
                        transfer_to_vault: !selectedItem.is_vault_item
                      })}
                    >
                      复制转移计划
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={isRunningItemAction}
                      onClick={() => void runItemWriteAction(
                        selectedItem.is_vault_item ? "取出到角色" : "移入仓库",
                        () => api.transferItem({
                          membership_type: accountSummary?.membership_type ?? 0,
                          character_id: resolveItemTransferCharacterId({
                            selectedCharacterId: selectedActionCharacterId,
                            sourceCharacterId: selectedItem.source_character_id,
                            sourceKind: selectedItem.source_kind,
                            transferToVault: !selectedItem.is_vault_item
                          }),
                          item_id: selectedItem.instance_id ?? "",
                          item_reference_hash: selectedItem.hash,
                          item_name: selectedItem.name,
                          transfer_to_vault: !selectedItem.is_vault_item
                        })
                      )}
                    >
                      {selectedItem.is_vault_item ? "取出到角色" : "移入仓库"}
                    </button>
                  </>
                ) : null}
                {selectedItem.is_postmaster_item ? (
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={isRunningItemAction}
                    onClick={() => void runItemWriteAction(
                      "从邮政官取回",
                      () => api.pullFromPostmaster({
                        membership_type: accountSummary?.membership_type ?? 0,
                        character_id: selectedItem.source_character_id ?? selectedActionCharacterId,
                        item_id: selectedItem.instance_id ?? "",
                        item_reference_hash: selectedItem.hash,
                        item_name: selectedItem.name
                      })
                    )}
                  >
                    取回到角色背包
                  </button>
                ) : null}
              </div>
              {!writeActionsEnabled ? (
                <p className="notice">d2-tools 本地写操作开关未开启，请先到设置页开启。Bungie 后台权限是另一项设置。</p>
              ) : null}
              {itemActionMessage ? <p className={itemActionMessage.includes("失败") ? "error" : "notice"}>{itemActionMessage}</p> : null}
            </section>
          ) : null}
          {itemScore ? (
            <section className="modal-score-panel">
              <div>
                <h3>本地评分</h3>
                <div className="button-row">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void copySelectedItemSummary(itemScore)}
                  >
                    复制结论
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void copySelectedItemChatGuide(itemScore)}
                  >
                    生成群聊说明
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={isGeneratingItemAi}
                    onClick={() => void generateItemAiAdvice()}
                  >
                    {isGeneratingItemAi ? "AI 解读中..." : "AI 解读"}
                  </button>
                  <span className={`vault-score-badge score-${itemScore.grade}`}>{itemScore.score}</span>
                </div>
              </div>
              {itemShareMessage ? <p className="notice">{itemShareMessage}</p> : null}
              <div className="modal-score-columns">
                <div>
                    <strong>评分原因</strong>
                  <ul>
                    {itemScore.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                </div>
                {itemScore.warnings.length ? (
                  <div>
                    <strong>风险提示</strong>
                    <ul>
                      {itemScore.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
              {itemAiError ? <p className="error">{itemAiError}</p> : null}
              {itemAiResult?.skipped_reason ? <p className="notice">{itemAiResult.skipped_reason}</p> : null}
              {itemAiResult?.ai ? (
                <section className="item-ai-panel">
                  <div>
                    <h3>AI 装备解读</h3>
                    <p>{itemAiResult.ai.provider} / {itemAiResult.ai.model}</p>
                  </div>
                  <ItemAiSections sections={itemAiResult.ai.sections} />
                </section>
              ) : null}
            </section>
          ) : null}
          {sameNameItems.length > 1 ? (
            <section className="modal-perk-group">
              <h3>同名对比</h3>
              {sameNameDuplicateGroup ? (
                <div className="button-row">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => openBestSameNameItem(sortedSameNameItems)}
                  >
                    打开最高分
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void applySameNameCurrentKeepTags(sameNameItems, selectedItem.item_key, "keep-current-review-rest")}
                  >
                    保留当前，其余关注
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void applySameNameCurrentKeepTags(sameNameItems, selectedItem.item_key, "keep-current-junk-rest")}
                  >
                    保留当前，其余可清理
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void applySameNameBatchTags(sameNameItems, "keep-best-review-rest")}
                  >
                    其余标记关注
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void applySameNameBatchTags(sameNameItems, "keep-best-junk-rest")}
                  >
                    其余标记可清理
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void applySameNameBatchTags(sameNameItems, "clear-group-tags")}
                  >
                    清除本组标记
                  </button>
                </div>
              ) : null}
              <div className="same-roll-list">
                {sortedSameNameItems.map((item) => {
                  const score = scoreVaultItem(item, vaultTags);
                  const isCurrent = getItemKey(item) === selectedItem.item_key;
                  return (
                    <button
                      type="button"
                      className={isCurrent ? "same-roll-row current" : "same-roll-row"}
                      key={getItemKey(item)}
                      onClick={() => void openItemDetail(item, {
                        source_character_id: item.source_character_id,
                        is_vault_item: item.is_vault_item,
                        is_postmaster_item: item.is_postmaster_item
                      })}
                    >
                      <strong>{item.name} / {score.score} 分</strong>
                      <span>{item.socket_plugs?.slice(0, 5).map((plug) => plug.name).join(" / ") || "暂无实际 roll"}</span>
                      <small>{formatAccountItemMeta(item)}</small>
                      <small>{item.locked ? "已锁定" : "未锁定"} / {vaultTags.items[getItemKey(item)]?.tag ?? "未标记"}</small>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}
          {selectedItem.socket_plugs?.length ? (
            <section className="modal-perk-group">
              <h3>实际 Roll</h3>
              <div className="modal-plug-grid">
                {selectedItem.socket_plugs.map((plug) => (
                  <div className="modal-plug" key={plug.hash}>
                    {plug.icon ? <img alt="" src={plug.icon} /> : null}
                    <div>
                      <strong>{plug.name}</strong>
                      {plug.description ? <p>{plug.description}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {selectedItem.perks?.length ? (
            <div className="modal-perks">
              {selectedItem.perks.map((group) => (
                <section className="modal-perk-group" key={group.socket_index}>
                  <h3>插槽 {group.socket_index + 1}</h3>
                  <div className="modal-plug-grid">
                    {group.plugs.map((plug) => (
                      <div className="modal-plug" key={plug.hash}>
                        {plug.icon ? <img alt="" src={plug.icon} /> : null}
                        <div>
                          <strong>{plug.name}</strong>
                          {plug.description ? <p>{plug.description}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : selectedItem.is_detail_loading ? (
            <p className="notice">正在读取 perk...</p>
          ) : (
            <p className="notice">暂无可展示 perk。</p>
          )}
        </section>
      </div>
    );
  }
}

type LoadoutCompareRow = {
  slot: string;
  left: LoadoutCompareCell;
  right: LoadoutCompareCell;
  changed: boolean;
};

type LoadoutCompareCell = {
  name: string;
  frame: string;
  perks: string[];
};

function buildLoadoutCompareRows(primary: LoadoutTemplate, secondary: LoadoutTemplate): LoadoutCompareRow[] {
  const primaryItems = new Map(primary.items.map((item) => [loadoutCompareSlotKey(item), item]));
  const secondaryItems = new Map(secondary.items.map((item) => [loadoutCompareSlotKey(item), item]));
  const slots = Array.from(new Set([...primaryItems.keys(), ...secondaryItems.keys()]));

  return slots.map((slot) => {
    const leftItem = primaryItems.get(slot);
    const rightItem = secondaryItems.get(slot);
    const left = formatLoadoutCompareItem(leftItem);
    const right = formatLoadoutCompareItem(rightItem);
    return {
      slot,
      left,
      right,
      changed: left.name !== right.name
        || left.frame !== right.frame
        || formatLoadoutComparePerks(left.perks) !== formatLoadoutComparePerks(right.perks)
    };
  });
}

function loadoutCompareSlotKey(item: LoadoutTemplate["items"][number]): string {
  return item.bucket_name || item.name;
}

function formatLoadoutCompareItem(item: LoadoutTemplate["items"][number] | undefined): LoadoutCompareCell {
  if (!item) {
    return {
      name: "未配置",
      frame: "未配置",
      perks: []
    };
  }

  return {
    name: item.name,
    frame: item.weapon_frame_name || "未标注",
    perks: item.perk_names?.slice(0, 2) ?? []
  };
}

function formatLoadoutComparePerks(perks: string[]): string {
  return perks.length ? perks.join(" / ") : "无";
}

function buildMissingLoadoutItemsText(
  template: LoadoutTemplate,
  missingItems: LoadoutTemplate["items"],
  summary: AccountSummary | null
): string {
  return [
    `d2-tools 缺失清单：${template.name}`,
    `职业：${template.class_name}`,
    `缺失数量：${missingItems.length}`,
    "",
    ...missingItems.map((item, index) => [
      `${index + 1}. ${item.name}`,
      `   来源：${findTemplateItemSourceLabel(item, summary, template.character_id)}`,
      `   槽位：${item.bucket_name ?? "未标注"}`,
      `   框架：${item.weapon_frame_name ?? "未标注"}`,
      `   Perk：${formatLoadoutComparePerks(item.perk_names?.slice(0, 2) ?? [])}`
    ].join("\n")),
    "",
    "说明：这只是本地缺失清单，不会执行 Bungie 写操作。"
  ].join("\n");
}

function selectedItemToAccountItem(item: SelectedItemDetail): AccountItemSummary | null {
  if (!item.group_key) return null;
  return {
    hash: item.hash,
    instance_id: item.instance_id,
    name: item.name,
    icon: item.icon,
    item_type: item.item_type,
    tier: item.tier,
    bucket_name: item.bucket_name,
    group_key: item.group_key,
    power: item.power,
    locked: item.locked,
    socket_plugs: item.socket_plugs ?? []
  };
}

function getAllKnownAccountItemsWithSource(summary: AccountSummary): SameNameItemSummary[] {
  const characterItems = summary.characters.flatMap((character) => [
    ...character.equipped_items.map((item) => ({
      ...item,
      source_character_id: character.character_id,
      source_kind: "equipped" as const,
      source_label: "已装备"
    })),
    ...character.inventory_items.map((item) => ({
      ...item,
      source_character_id: character.character_id,
      source_kind: "inventory" as const,
      source_label: "背包"
    })),
    ...character.postmaster_items.map((item) => ({
      ...item,
      source_character_id: character.character_id,
      is_postmaster_item: true,
      source_kind: "postmaster" as const,
      source_label: "邮政官"
    }))
  ]);

  return [
    ...summary.vault.items.map((item) => ({
      ...item,
      is_vault_item: true,
      source_kind: "vault" as const,
      source_label: "仓库"
    })),
    ...characterItems
  ];
}


function normalizeAccountItemsForCore(
  items: AccountItemSummary[]
): Array<AccountItemSummary & { socket_plugs: NonNullable<AccountItemSummary["socket_plugs"]> }> {
  return items.map((item) => ({
    ...item,
    socket_plugs: item.socket_plugs ?? []
  }));
}

type AccountItemWithSource = AccountItemSummary & {
  account_source: "equipped" | "inventory";
  source_label: string;
};

function getCharacterCombinedItems(character: AccountSummary["characters"][number]): AccountItemWithSource[] {
  return [
    ...character.equipped_items.map((item) => ({
      ...item,
      account_source: "equipped" as const,
      source_label: "已装备"
    })),
    ...character.inventory_items.map((item) => ({
      ...item,
      account_source: "inventory" as const,
      source_label: "背包"
    }))
  ];
}

function isAccountItemFromSource(
  item: AccountItemSummary,
  source: AccountItemWithSource["account_source"]
): item is AccountItemWithSource {
  return "account_source" in item && item.account_source === source;
}

function AccountSlotCategories(props: {
  categories: AccountSlotCategory[];
  highlightedTemplate?: LoadoutTemplateLookup | null;
  openingItemKey?: string;
  onOpenItem: (item: AccountItemSummary) => void;
}) {
  return (
    <div className="account-slot-categories">
      {props.categories.map((category) => (
        <section className="account-slot-category" key={category.key}>
          <div className="account-slot-category-heading">
            <h4>{category.label}</h4>
            <span>{category.count} 件</span>
          </div>
          <div className="account-slot-group-list">
            {category.groups.map((group) => (
              <section className="account-slot-group" key={group.key}>
                <div className="account-slot-heading">
                  <strong>{group.label}</strong>
                  <span>{group.items.length} 件</span>
                </div>
                <AccountSlotSourceCluster
                  label="已装备"
                  items={group.items.filter((item): item is AccountItemWithSource => isAccountItemFromSource(item, "equipped"))}
                  highlightedTemplate={props.highlightedTemplate}
                  openingItemKey={props.openingItemKey}
                  onOpenItem={props.onOpenItem}
                />
                <AccountSlotSourceCluster
                  label="背包"
                  items={group.items.filter((item): item is AccountItemWithSource => isAccountItemFromSource(item, "inventory"))}
                  highlightedTemplate={props.highlightedTemplate}
                  openingItemKey={props.openingItemKey}
                  onOpenItem={props.onOpenItem}
                />
              </section>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function AccountSlotSourceCluster(props: {
  label: "已装备" | "背包";
  highlightedTemplate?: LoadoutTemplateLookup | null;
  items: AccountItemWithSource[];
  openingItemKey?: string;
  onOpenItem: (item: AccountItemSummary) => void;
}) {
  if (!props.items.length) return null;

  const isEquipped = props.label === "已装备";

  return (
    <section className="account-slot-source-cluster">
      <div className="account-slot-source-heading">
        <span className={isEquipped ? "account-slot-source-badge equipped" : "account-slot-source-badge inventory"}>
          {props.label}
        </span>
        <small>{props.items.length} 件</small>
      </div>
      <div className="equipment-grid">
        {props.items.map((item) => {
          const isPending = getItemKey(item) === props.openingItemKey;
          const isLoadoutMatch = matchesLoadoutTemplateItem(item, props.highlightedTemplate);
          return (
            <button
              className={[
                "equipment-item",
                isEquipped ? "equipped" : "inventory",
                isPending ? "pending" : "",
                isLoadoutMatch ? "loadout-highlight" : ""
              ].filter(Boolean).join(" ")}
              key={`${item.hash}-${item.instance_id ?? ""}`}
              type="button"
              aria-busy={isPending}
              onClick={() => props.onOpenItem(item)}
            >
              {item.icon ? <img alt="" src={item.icon} /> : <div className="item-icon-placeholder" />}
              <div>
                <strong>{item.name}</strong>
                {isLoadoutMatch ? <small className="loadout-template-badge">方案命中</small> : null}
                <span>{formatAccountItemMeta(item)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ItemAiSections(props: { sections: NonNullable<ItemAiAdviceResult["ai"]>["sections"] }) {
  const hasSections = props.sections.facts.length
    || props.sections.analysis.length
    || props.sections.suggestions.length
    || props.sections.action_reminders.length;
  if (!hasSections) {
    return <div className="ai-advice-text">{props.sections.raw}</div>;
  }
  return (
    <div className="ai-section-grid">
      <SimpleAiSection title="浜嬪疄" items={props.sections.facts} />
      <SimpleAiSection title="鍒嗘瀽" items={props.sections.analysis} />
      <SimpleAiSection title="寤鸿" items={props.sections.suggestions} />
      <SimpleAiSection title="鎿嶄綔鎻愰啋" items={props.sections.action_reminders} />
    </div>
  );
}

function SimpleAiSection(props: { title: string; items: string[] }) {
  if (!props.items.length) return null;
  return (
    <section className="ai-section-card">
      <h4>{props.title}</h4>
      <ul>
        {props.items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

type SelectedItemDetail = ItemDefinitionDetail & {
  item_key: string;
  instance_id?: string;
  power?: number;
  locked?: boolean;
  socket_plugs?: AccountItemPlugSummary[];
  group_key?: AccountItemSummary["group_key"];
  bucket_name?: string;
  source_character_id?: string;
  source_kind?: SelectedItemSourceKind;
  is_vault_item?: boolean;
  is_postmaster_item?: boolean;
  is_detail_loading?: boolean;
};

type SelectedItemSourceKind = "equipped" | "inventory" | "vault" | "postmaster";

type SelectedItemSource = {
  source_character_id?: string;
  source_kind?: SelectedItemSourceKind;
  is_vault_item?: boolean;
  is_postmaster_item?: boolean;
};

type SameNameItemSummary = AccountItemSummary & SelectedItemSource & {
  source_kind: SelectedItemSourceKind;
  source_label?: string;
};

type LoadoutTemplateLookup = {
  instanceIds: Set<string>;
  bucketHashKeys: Set<string>;
  hashKeys: Set<number>;
};

function buildLoadoutTemplateLookup(template: LoadoutTemplate): LoadoutTemplateLookup {
  return {
    instanceIds: new Set(template.items.map((item) => item.instance_id).filter((item): item is string => Boolean(item))),
    bucketHashKeys: new Set(template.items.map((item) => `${item.bucket_name ?? ""}:${item.hash}`)),
    hashKeys: new Set(template.items.map((item) => item.hash))
  };
}

function matchesLoadoutTemplateItem(
  item: Pick<AccountItemSummary, "hash" | "instance_id" | "bucket_name">,
  lookup?: LoadoutTemplateLookup | null
): boolean {
  if (!lookup) {
    return false;
  }
  if (item.instance_id && lookup.instanceIds.has(item.instance_id)) {
    return true;
  }

  return lookup.bucketHashKeys.has(`${item.bucket_name ?? ""}:${item.hash}`)
    || lookup.hashKeys.has(item.hash);
}

function isTemplateItemReady(
  item: LoadoutTemplate["items"][number],
  analysis: ReturnType<typeof analyzeLoadoutTemplate> | null
): boolean {
  if (!analysis) {
    return false;
  }

  return analysis.equipped.some((equippedItem) => {
    if (item.instance_id && equippedItem.instance_id) {
      return item.instance_id === equippedItem.instance_id;
    }

    return equippedItem.hash === item.hash
      && equippedItem.bucket_name === item.bucket_name;
  });
}

function getMissingLoadoutActionableCount(
  plan: ReturnType<typeof buildMissingLoadoutTransferPlan>
): number {
  return new Set(
    plan.steps
      .filter((step) => step.phase !== "equip-swap")
      .flatMap((step) => step.items.map((entry) => entry.item_id))
  ).size;
}

function isTemplateItemReadyFromPlan(
  item: LoadoutTemplate["items"][number],
  plan: ReturnType<typeof buildMissingLoadoutTransferPlan>
): boolean {
  if (plan.blocked.some((entry) => isMatchingTemplateItem(item, entry.item))) {
    return false;
  }

  return !plan.steps.some((step) =>
    step.phase !== "equip-swap"
    && step.items.some((entry) => isMatchingTemplateItemIdentity(item, entry.item_id, entry.item_reference_hash, entry.bucket_name))
  );
}

function isMatchingTemplateItem(
  left: Pick<LoadoutTemplate["items"][number], "hash" | "instance_id" | "bucket_name">,
  right: Pick<LoadoutTemplate["items"][number], "hash" | "instance_id" | "bucket_name">
): boolean {
  if (left.instance_id && right.instance_id) {
    return left.instance_id === right.instance_id;
  }

  return left.hash === right.hash
    && left.bucket_name === right.bucket_name;
}

function isMatchingTemplateItemIdentity(
  item: Pick<LoadoutTemplate["items"][number], "hash" | "instance_id" | "bucket_name">,
  itemId: string,
  itemHash?: number,
  bucketName?: string
): boolean {
  if (item.instance_id) {
    return item.instance_id === itemId;
  }

  return item.hash === itemHash
    && item.bucket_name === bucketName;
}

function findTemplateItemSourceLabel(
  item: LoadoutTemplate["items"][number],
  summary: AccountSummary | null,
  templateCharacterId?: string
): string {
  const matchedItem = findBestTemplateSourceItem(item, summary, templateCharacterId);
  if (!matchedItem) {
    return "未找到";
  }

  const isCurrentCharacter = Boolean(templateCharacterId && matchedItem.source_character_id === templateCharacterId);
  const characterLabel = summary?.characters.find((character) => character.character_id === matchedItem.source_character_id)?.class_name
    ?? "其他角色";

  if (matchedItem.source_kind === "vault") {
    return "仓库";
  }

  if (matchedItem.source_kind === "postmaster") {
    return isCurrentCharacter ? "当前角色邮政官" : `${characterLabel}邮政官`;
  }

  if (matchedItem.source_kind === "equipped") {
    return isCurrentCharacter ? "当前角色已装备" : `${characterLabel}已装备`;
  }

  return isCurrentCharacter ? "当前角色背包" : `${characterLabel}背包`;
}

function findBestTemplateSourceItem(
  item: LoadoutTemplate["items"][number],
  summary: AccountSummary | null,
  templateCharacterId?: string
): SameNameItemSummary | null {
  if (!summary) {
    return null;
  }

  const candidates = getAllKnownAccountItemsWithSource(summary)
    .filter((candidate) => isTemplateSourceMatch(item, candidate))
    .sort((left, right) => scoreTemplateSourceCandidate(right, item, templateCharacterId)
      - scoreTemplateSourceCandidate(left, item, templateCharacterId));

  return candidates[0] ?? null;
}

function isTemplateSourceMatch(
  item: LoadoutTemplate["items"][number],
  candidate: SameNameItemSummary
): boolean {
  if (item.instance_id && candidate.instance_id) {
    return item.instance_id === candidate.instance_id;
  }

  return candidate.hash === item.hash
    && (!item.bucket_name || candidate.bucket_name === item.bucket_name);
}

function scoreTemplateSourceCandidate(
  candidate: SameNameItemSummary,
  item: LoadoutTemplate["items"][number],
  templateCharacterId?: string
): number {
  let score = 0;

  if (item.instance_id && candidate.instance_id && item.instance_id === candidate.instance_id) {
    score += 100;
  } else if (candidate.hash === item.hash && candidate.bucket_name === item.bucket_name) {
    score += 20;
  } else if (candidate.hash === item.hash) {
    score += 10;
  }

  if (templateCharacterId && candidate.source_character_id === templateCharacterId) {
    score += 8;
  }

  const sourceScores: Record<SameNameItemSummary["source_kind"], number> = {
    equipped: 4,
    inventory: 3,
    vault: 2,
    postmaster: 1
  };

  return score + sourceScores[candidate.source_kind];
}

function createSelectedItemPreview(
  item: AccountItemSummary | ItemSearchResult,
  source: SelectedItemSource
): SelectedItemDetail {
  return {
    hash: item.hash,
    name: item.name,
    description: "description" in item ? item.description : "",
    icon: item.icon,
    item_type: item.item_type,
    tier: item.tier,
    source: "source" in item ? item.source : itemDetailLoadingSource,
    perks: "perks" in item ? item.perks : undefined,
    item_key: getItemKey(item),
    instance_id: "instance_id" in item ? item.instance_id : undefined,
    power: "power" in item ? item.power : undefined,
    locked: "locked" in item ? item.locked : undefined,
    socket_plugs: "socket_plugs" in item ? item.socket_plugs : undefined,
    group_key: "group_key" in item ? item.group_key : undefined,
    bucket_name: "bucket_name" in item ? item.bucket_name : undefined,
    source_character_id: source.source_character_id,
    source_kind: source.source_kind,
    is_vault_item: source.is_vault_item,
    is_postmaster_item: source.is_postmaster_item,
    is_detail_loading: true
  };
}

function mergeSelectedItemDetail(
  current: SelectedItemDetail,
  detail: ItemDefinitionDetail
): SelectedItemDetail {
  return {
    ...current,
    ...detail,
    is_detail_loading: false
  };
}

const itemDetailLoadingSource: ItemSourceSummary = {
  status: "missing",
  label: "详情",
  description: "正在读取来源、perk 和物品说明..."
};

function getItemKey(item: AccountItemSummary | ItemSearchResult): string {
  return "instance_id" in item && item.instance_id ? item.instance_id : `hash:${item.hash}`;
}

function formatActionLogTitle(entry: ActionLogEntry): string {
  const actionLabels: Record<ActionLogEntry["action"], string> = {
    "set-lock": "锁定状态",
    equip: "装备",
    transfer: "仓库转移",
    "postmaster-pull": "邮政官取回",
    "loadout-equip": "应用游戏内配装栏",
    "loadout-snapshot": "覆盖游戏内配装栏"
  };

  return [
    entry.ok ? "成功" : "失败",
    actionLabels[entry.action],
    entry.item_name
  ].filter(Boolean).join(" / ");
}

function filteredActionLog(
  entries: ActionLogEntry[],
  result: "all" | "success" | "failed",
  action: ActionLogEntry["action"] | "all"
): ActionLogEntry[] {
  return entries.filter((entry) => {
    if (result === "success" && !entry.ok) return false;
    if (result === "failed" && entry.ok) return false;
    if (action !== "all" && entry.action !== action) return false;
    return true;
  });
}

function buildActionDiagnosticText(entry: ActionLogEntry): string {
  return [
    "d2-tools 写操作诊断",
    `时间：${entry.created_at}`,
    `操作：${entry.action}`,
    `结果：${entry.ok ? "成功" : "失败"}`,
    `物品：${entry.item_name ?? "-"}`,
    `物品实例：${entry.item_instance_id ?? "-"}`,
    `角色：${entry.character_id ?? "-"}`,
    `信息：${entry.message ?? "-"}`,
    "",
    "说明：这段诊断不会包含 token、client secret 或 API Key。"
  ].join("\n");
}

function formatAccountItemMeta(item: AccountItemSummary): string {
  return [
    "source_label" in item ? `来源：${item.source_label}` : undefined,
    item.bucket_name,
    item.tier,
    item.power ? `光等 ${item.power}` : undefined,
    item.locked ? "已锁定" : undefined
  ].filter(Boolean).join(" / ");
}

function formatHighestPowerSource(source: "equipped" | "inventory" | "vault"): string {
  const labels: Record<typeof source, string> = {
    equipped: "已装备",
    inventory: "角色背包",
    vault: "仓库"
  };
  return labels[source];
}

function formatWishlistModeLabels(labels: string[]): string[] {
  return labels.filter((label) => label !== "DIM Wishlist");
}

function formatLibraryGroupLabel(
  group: ItemSearchResult["group_key"] | NonNullable<PerkSearchResult["related_items"]>[number]["group_key"]
) {
  if (group === "weapons") return "武器";
  if (group === "armor") return "护甲";
  if (group === "equipment") return "装备";
  if (group === "other") return "其他";
  return "";
}

function formatVaultTagLabel(tag: VaultTagValue): string {
  if (tag === "keep") return "保留";
  if (tag === "review") return "关注";
  if (tag === "junk") return "可清理";
  return "未标记";
}

function pageTitle(page: ShellPageKey) {
  const titles: Record<ShellPageKey, string> = {
    home: "首页",
    account: "账号",
    vault: "仓库",
    library: "资料库",
    ai: "AI 助手",
    settings: "设置"
  };
  return titles[page];
}

function pageSubtitle(page: ShellPageKey) {
  const subtitles: Record<ShellPageKey, string> = {
    home: "检查当前状态，快速进入常用功能。",
    account: "读取 Bungie 账号、角色装备、背包和材料数量。",
    vault: "查看完整仓库列表、筛选、排序和实际 roll。",
    library: "搜索本地 Manifest 物品定义和 perk。",
    ai: "基于仓库、实际 roll 和本地标记生成分析建议。",
    settings: "管理 Bungie 配置和本地数据目录。"
  };
  return subtitles[page];
}

function PlaceholderPanel(props: { title: string; children: string }) {
  return (
    <section className="tool-panel placeholder-panel">
      <h2>{props.title}</h2>
      <p>{props.children}</p>
    </section>
  );
}
