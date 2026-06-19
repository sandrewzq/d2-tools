import { useEffect, useState } from "react";
import { scoreVaultItem } from "@d2-service/core/analysis/scoring";
import { evaluateWishlistRoll } from "@d2-service/core/analysis/wishlist";
import {
  api,
  type AccountItemSummary,
  type AccountItemPlugSummary,
  type AccountSummary,
  type ActionLogEntry,
  type ActivityHistorySummary,
  type D2Config,
  type DailySummary,
  type ItemActionResult,
  type ItemAiAdviceResult,
  type ItemDefinitionDetail,
  type ItemSearchResult,
  type LibraryHistory,
  type LoadoutTemplate,
  type PerkSearchResult,
  type StartupState,
  type VaultTags,
  type VaultTagValue
} from "../api/client";
import { AiSettingsPanel } from "../components/AiSettingsPanel";
import { AiAnalysisPanel } from "../components/AiAnalysisPanel";
import { buildDiagnosticRows, DiagnosticsPanel } from "../components/DiagnosticsPanel";
import { ShellLayout, type ShellPageKey } from "../components/ShellLayout";
import { StatusOverview } from "../components/StatusOverview";
import { VaultPanel } from "../components/VaultPanel";
import { buildItemChatGuideText, buildItemShareText } from "../utils/itemShare";
import { buildDailyShareText } from "../utils/dailyShare";
import { groupAccountItemsBySlot, type AccountSlotCategory } from "../utils/accountSlots";
import { createHighestPowerEquipPlan } from "../utils/highestPower";

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
  const [selectedItem, setSelectedItem] = useState<SelectedItemDetail | null>(null);
  const [itemDetailError, setItemDetailError] = useState("");
  const [itemAiResult, setItemAiResult] = useState<ItemAiAdviceResult | null>(null);
  const [itemAiError, setItemAiError] = useState("");
  const [itemNoteDraft, setItemNoteDraft] = useState("");
  const [itemNoteMessage, setItemNoteMessage] = useState("");
  const [itemShareMessage, setItemShareMessage] = useState("");
  const [isGeneratingItemAi, setIsGeneratingItemAi] = useState(false);
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"items" | "perks">("items");
  const [items, setItems] = useState<ItemSearchResult[]>([]);
  const [perks, setPerks] = useState<PerkSearchResult[]>([]);
  const [searchTouched, setSearchTouched] = useState(false);
  const [libraryHistory, setLibraryHistory] = useState<LibraryHistory>({ recent: [], favorites: [] });
  const [aliasDraft, setAliasDraft] = useState("");
  const [aliasTargetDraft, setAliasTargetDraft] = useState("");
  const [aliasKind, setAliasKind] = useState<"item" | "perk">("item");
  const [aliasMessage, setAliasMessage] = useState("");
  const [loadoutTemplates, setLoadoutTemplates] = useState<LoadoutTemplate[]>([]);
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
  const [selectedActionCharacterId, setSelectedActionCharacterId] = useState("");
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [dailyMessage, setDailyMessage] = useState("");
  const [dailyError, setDailyError] = useState("");
  const [actionLogResultFilter, setActionLogResultFilter] = useState<"all" | "success" | "failed">("all");
  const [actionLogTypeFilter, setActionLogTypeFilter] = useState<ActionLogEntry["action"] | "all">("all");

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
  }, []);

  async function loadLibraryHistory() {
    try {
      setLibraryHistory(await api.getLibraryHistory());
    } catch {
      setLibraryHistory({ recent: [], favorites: [] });
    }
  }

  async function loadLoadoutTemplates() {
    try {
      setLoadoutTemplates(await api.listLoadoutTemplates());
    } catch {
      setLoadoutTemplates([]);
    }
  }

  async function loadDailySummary() {
    setDailyError("");
    try {
      setDailySummary(await api.getDailySummary());
    } catch (error) {
      setDailyError(error instanceof Error ? error.message : "今日面板读取失败");
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

  async function copyActionDiagnostic(entry: ActionLogEntry) {
    try {
      await navigator.clipboard.writeText(buildActionDiagnosticText(entry));
      setSettingsMessage("已复制操作诊断");
    } catch {
      setSettingsError("复制失败，请检查系统剪贴板权限");
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
      void loadActivitySummary(summary);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "账号数据读取失败");
      setAccountSummary(null);
    } finally {
      setIsLoadingAccount(false);
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

    try {
      const detail = await api.getItemDetail(item.hash);
      try {
        setLibraryHistory(await api.addRecentItem({ hash: detail.hash, name: detail.name, icon: detail.icon }));
      } catch {
        // Recent-item history is a convenience feature; item detail should still open if it cannot be saved.
      }
      setSelectedItem({
        ...detail,
        item_key: itemKey,
        instance_id: "instance_id" in item ? item.instance_id : undefined,
        power: "power" in item ? item.power : undefined,
        locked: "locked" in item ? item.locked : undefined,
        socket_plugs: "socket_plugs" in item ? item.socket_plugs : undefined,
        group_key: "group_key" in item ? item.group_key : undefined,
        bucket_name: "bucket_name" in item ? item.bucket_name : undefined,
        source_character_id: source.source_character_id,
        is_vault_item: source.is_vault_item
      });
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
      setItemShareMessage("复制失败，请检查系统剪贴板权限");
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
      setVaultTags(tags);
      setItemNoteDraft(tags.items[selectedItem.item_key]?.note ?? "");
      setItemNoteMessage("备注已保存");
    } catch (error) {
      setItemNoteMessage(error instanceof Error ? error.message : "备注保存失败");
    }
  }

  async function searchItems() {
    setIsSearching(true);
    setSearchError("");
    setSearchTouched(true);

    try {
      if (searchMode === "perks") {
        setPerks(await api.searchPerks(query));
        setItems([]);
      } else {
        setItems(await api.searchItems(query));
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
      setLoadoutTemplates(await api.listLoadoutTemplates());
      setLoadoutMessage(`已保存本地配装模板：${template.name}`);
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

    setLoadoutMessage("");
    setItemActionMessage("");

    if (!plan.executable_items.length) {
      setLoadoutMessage(`${character.class_name} 当前已是最高光等组合。`);
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
      setLoadoutMessage("d2-service 本地写操作开关未开启。请到左侧“设置”页开启后再执行。");
      return;
    }

    const actionPreview = plan.executable_items
      .map((entry) => `${entry.slot_label}：${entry.item.name} / 光等 ${entry.item.power ?? "-"} / ${formatHighestPowerSource(entry.source)}`)
      .join("\n");
    if (!window.confirm([
      `确认给 ${character.class_name} 装备最高光等组合？`,
      plan.summary,
      actionPreview,
      "说明：仓库里的装备会先取出到该角色，再执行装备。不会分解装备。"
    ].join("\n"))) {
      setLoadoutMessage("已取消装备最高光等。");
      return;
    }

    setIsRunningItemAction(true);
    let successCount = 0;
    let failedCount = 0;

    try {
      for (const entry of plan.executable_items) {
        try {
          if (entry.needs_transfer) {
            await api.transferItem({
              membership_type: accountSummary.membership_type,
              character_id: character.character_id,
              item_id: entry.item.instance_id ?? "",
              item_reference_hash: entry.item.hash,
              item_name: entry.item.name,
              transfer_to_vault: false
            });
          }
          if (entry.needs_equip) {
            await api.equipItem({
              membership_type: accountSummary.membership_type,
              character_id: character.character_id,
              item_id: entry.item.instance_id ?? "",
              item_name: entry.item.name
            });
          }
          successCount += 1;
        } catch {
          failedCount += 1;
        }
      }

      await Promise.all([loadAccountSummary(), loadActionLog()]);
      setLoadoutMessage(failedCount
        ? `最高光等装备完成 ${successCount} 件，失败 ${failedCount} 件。可以在设置页查看操作日志。`
        : `已给 ${character.class_name} 装备 ${successCount} 件最高光等装备。`);
    } finally {
      setIsRunningItemAction(false);
    }
  }

  async function deleteLoadoutTemplate(id: string) {
    try {
      setLoadoutTemplates(await api.deleteLoadoutTemplate(id));
      setLoadoutMessage("已删除本地配装模板");
    } catch (error) {
      setLoadoutMessage(error instanceof Error ? error.message : "删除配装模板失败");
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
        "d2-service 配装转移计划",
        plan.summary,
        ...plan.steps.map((step, index) => `${index + 1}. ${step.title}：${step.description}`),
        "说明：这只是计划，不会执行 Bungie 写操作。"
      ].join("\n"));
      setLoadoutMessage(plan.summary || "已复制配装转移计划");
    } catch (error) {
      setLoadoutMessage(error instanceof Error ? error.message : "配装转移计划生成失败");
    }
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
      setActivityMessage("最近活动已更新");
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
        "d2-service 装备操作计划",
        plan.title,
        plan.description,
        `需要确认：${plan.requires_confirmation ? "是" : "否"}`,
        "说明：这只是计划，不会执行 Bungie 写操作。"
      ].join("\n"));
      setItemActionMessage("已复制操作计划");
    } catch (error) {
      setItemActionMessage(error instanceof Error ? error.message : "操作计划生成失败");
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
      setItemActionMessage("d2-service 本地写操作开关未开启。请到左侧“设置”页开启“允许单件装备写操作”。");
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
    if (!window.confirm(`确认要${label}：${selectedItem.name}？`)) {
      return;
    }

    setIsRunningItemAction(true);
    setItemActionMessage("");
    setItemShareMessage("");

    try {
      const result = await run();
      setItemActionMessage(result.message);
      await Promise.all([loadAccountSummary(), loadActionLog()]);
      setSelectedItem(null);
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
      return "d2-service 本地写操作开关未开启。请到左侧“设置”页开启后再执行。";
    }
    if (!targetCharacterId) {
      return "请先选择目标角色。";
    }

    const actionableItems = items.filter((item) => item.instance_id && filterItem(item));
    if (!actionableItems.length) {
      return "没有可执行的装备。可能已经全部解锁，或缺少实例 ID。";
    }
    if (!window.confirm(`确认要${label} ${actionableItems.length} 件可清理装备？这个操作不会分解装备。`)) {
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
      "批量解锁",
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

  async function handleVaultCleanupTransfer(items: AccountItemSummary[], targetCharacterId: string): Promise<string> {
    return runVaultCleanupWriteAction(
      "转移到角色背包",
      items,
      targetCharacterId,
      (item) => api.transferItem({
        membership_type: accountSummary?.membership_type ?? 0,
        character_id: targetCharacterId,
        item_id: item.instance_id ?? "",
        item_reference_hash: item.hash,
        item_name: item.name,
        transfer_to_vault: false
      })
    );
  }

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
        onConfigureAi={() => setActivePage("ai")}
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
                <p>先完成状态诊断，再进入账号、资料库或设置。</p>
              </div>
            </div>
            <div className="quick-actions">
              <button type="button" onClick={() => setActivePage("account")}>查看账号</button>
              <button type="button" onClick={() => setActivePage("library")}>搜索物品</button>
              <button type="button" className="secondary-button" onClick={() => setActivePage("settings")}>打开设置</button>
            </div>
          </section>
        </>
      ) : null}

      {activePage === "account" ? renderAccountPanel() : null}
      {activePage === "library" ? renderSearchPanel() : null}
      {activePage === "vault" ? renderVaultPanel() : null}
      {activePage === "ai" ? (
        <>
          <AiSettingsPanel onSaved={props.onConfigChanged} />
          <AiAnalysisPanel
            items={accountSummary?.vault.items ?? []}
            tags={vaultTags}
            isLoadingAccount={isLoadingAccount}
            onLoadAccount={() => void loadAccountSummary()}
          />
        </>
      ) : null}
      {activePage === "settings" ? (
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
                开启后才能锁定/解锁、装备、移入或取出仓库。需要 Bungie App 勾选
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
                <p>只记录本机操作结果，不上传。</p>
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
      ) : null}

      {selectedItem ? renderItemModal() : null}
    </ShellLayout>
  );

  function renderAccountPanel() {
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
            <div>
              <h3>{accountSummary.account_name}</h3>
              <p>
                Membership {accountSummary.membership_type} / {accountSummary.destiny_membership_id}
              </p>
              <p>仓库装备：{accountSummary.vault.item_count} / 材料与消耗品：{accountSummary.materials.item_count}</p>
            </div>
            <div className="character-grid">
              {accountSummary.characters.map((character) => (
                <article className="character-card" key={character.character_id}>
                  <div className="character-title">
                    {character.emblem_url ? <img alt="" src={character.emblem_url} /> : null}
                    <div>
                      <h3>{character.class_name}</h3>
                      <p>光等 {character.light ?? "-"}</p>
                    </div>
                    <button type="button" className="inline-action" onClick={() => void saveCharacterLoadout(character)}>
                      保存当前装备为模板
                    </button>
                    <button
                      type="button"
                      className="inline-action"
                      disabled={isRunningItemAction}
                      onClick={() => void equipHighestPowerItems(character)}
                    >
                      装备最高光等
                    </button>
                  </div>
                  <div className="equipment-section-heading">
                    <h4>已装备</h4>
                    <span>{character.equipped_items.length} 件</span>
                  </div>
                  <AccountSlotCategories
                    categories={groupAccountItemsBySlot(character.equipped_items)}
                    onOpenItem={(item) => void openItemDetail(item, { source_character_id: character.character_id })}
                  />
                  <div className="equipment-section-heading">
                    <h4>背包</h4>
                    <span>{character.inventory_items.length} 件</span>
                  </div>
                  {character.inventory_items.length ? (
                    <AccountSlotCategories
                      categories={groupAccountItemsBySlot(character.inventory_items)}
                      onOpenItem={(item) => void openItemDetail(item, { source_character_id: character.character_id })}
                    />
                  ) : (
                    <p className="muted-copy">背包暂无未装备物品。</p>
                  )}
                </article>
              ))}
            </div>
            <section className="vault-preview">
              <h3>材料与消耗品</h3>
              {accountSummary.materials.items.length ? (
                <div className="material-grid">
                  {accountSummary.materials.items.slice(0, 40).map((material) => (
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

  function renderDailyPanel() {
    return (
      <section className="tool-panel">
        <div className="section-heading">
          <div>
            <h2>今日 / 本周</h2>
            <p>只展示玩家能看懂的真实信息；看不到名称的 Bungie 原始数据会被隐藏。</p>
          </div>
          <div className="button-row">
            <button type="button" className="secondary-button" onClick={() => void loadDailySummary()}>
              刷新
            </button>
            <button type="button" disabled={!dailySummary} onClick={() => void copyDailySummary()}>
              复制日报
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
            <div className="daily-brief">
              <strong>建议先做</strong>
              <div>
                {dailySummary.checklist.slice(0, 3).map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
            <div className="daily-source-grid">
              {Object.values(dailySummary.sources).map((source) => (
                <div className={`daily-source source-${source.status}`} key={source.label}>
                  <strong>{source.label}</strong>
                  <span>{source.message}</span>
                  {source.items?.length ? (
                    <ul className="daily-source-items">
                      {source.items.map((item) => (
                        <li key={`${source.label}-${item.title}`}>
                          <b>{item.title}</b>
                          {item.subtitle ? <small>{item.subtitle}</small> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
            <ul className="compact-list">
              {dailySummary.recommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="notice">今日面板读取中。</p>
        )}
      </section>
    );
  }

  function renderSearchPanel() {
    return (
      <section className="tool-panel">
        <div>
          <h2>资料库搜索</h2>
          <p>搜索本地 Manifest 物品定义、perk，并支持你自己的中文别名。</p>
        </div>
        <div className="action-log-filters">
          <button
            type="button"
            className={searchMode === "items" ? "secondary-button active-filter" : "secondary-button"}
            onClick={() => setSearchMode("items")}
          >
            物品
          </button>
          <button
            type="button"
            className={searchMode === "perks" ? "secondary-button active-filter" : "secondary-button"}
            onClick={() => setSearchMode("perks")}
          >
            Perk
          </button>
        </div>
        <div className="search-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchMode === "perks" ? "例如：爆破专家 / ff" : "例如：风险管理者 / Riskrunner"}
          />
          <button type="button" disabled={isSearching} onClick={() => void searchItems()}>
            {isSearching ? "搜索中..." : "搜索"}
          </button>
        </div>
        <div className="alias-editor">
          <input value={aliasDraft} onChange={(event) => setAliasDraft(event.target.value)} placeholder="别名，例如 ff" />
          <input value={aliasTargetDraft} onChange={(event) => setAliasTargetDraft(event.target.value)} placeholder="实际名称，例如 喂食狂热" />
          <select value={aliasKind} onChange={(event) => setAliasKind(event.target.value as typeof aliasKind)}>
            <option value="item">物品</option>
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
        <p className="muted-copy">别名会保存在本机，只影响你自己的搜索，不会上传。</p>
        {aliasMessage ? <p className="notice">{aliasMessage}</p> : null}
        {searchError ? <p className="error">{searchError}</p> : null}
        <div className="daily-source-grid">
          <div className="daily-source source-ready">
            <strong>最近查看</strong>
            <span>{libraryHistory.recent.slice(0, 5).map((item) => item.name).join("、") || "暂无"}</span>
          </div>
          <div className="daily-source source-ready">
            <strong>收藏</strong>
            <span>{libraryHistory.favorites.slice(0, 5).map((item) => item.name).join("、") || "暂无"}</span>
          </div>
        </div>
        <div className="item-results">
          {searchMode === "items" ? items.map((item) => (
            <article className="item-result" key={item.hash}>
              {item.icon ? <img alt="" src={item.icon} /> : null}
              <div>
                <h3>{item.name}</h3>
                <p>{[item.tier, item.item_type].filter(Boolean).join(" / ")}</p>
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
                <button type="button" className="inline-action" onClick={() => void openItemDetail(item)}>
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
          )) : perks.map((perk) => (
            <article className="item-result" key={perk.hash}>
              {perk.icon ? <img alt="" src={perk.icon} /> : null}
              <div>
                <h3>{perk.name}</h3>
                <p>{perk.description}</p>
                {perk.related_items?.length ? (
                  <p><strong>可能出现于：</strong>{perk.related_items.map((item) => item.name).join("、")}</p>
                ) : (
                  <p>暂未从本地 Manifest 反查到关联武器。</p>
                )}
                <button type="button" className="inline-action" onClick={() => void addSelectedItemToFavorites(perk)}>
                  收藏
                </button>
              </div>
            </article>
          ))}
        </div>
        {searchTouched && !isSearching && !searchError && !items.length && !perks.length ? (
          <p className="notice">未找到匹配结果。可以换个中文名、英文名，或者先保存一个常用别名。</p>
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
        tags={vaultTags}
        cleanupActions={{
          characters: accountSummary.characters,
          writeActionsEnabled,
          onBatchUnlock: handleVaultCleanupUnlock,
          onBatchTransferToCharacter: handleVaultCleanupTransfer
        }}
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
    }) : null;
    const sameNameItems = selectedAsAccountItem && accountSummary
      ? getAllKnownAccountItems(accountSummary)
        .filter((item) => item.name.trim() === selectedAsAccountItem.name.trim())
      : [];

    return (
      <div className="modal-backdrop" role="presentation" onClick={() => setSelectedItem(null)}>
        <section className="item-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
          <button className="modal-close" type="button" onClick={() => setSelectedItem(null)}>关闭</button>
          <div className="modal-title">
            {selectedItem.icon ? <img alt="" src={selectedItem.icon} /> : null}
            <div>
              <h2>{selectedItem.name}</h2>
              <p>{[selectedItem.tier, selectedItem.item_type].filter(Boolean).join(" / ")}</p>
              {selectedItem.power ? <p>光等 {selectedItem.power}</p> : null}
              {selectedItem.locked !== undefined ? <p>{selectedItem.locked ? "已锁定" : "未锁定"}</p> : null}
            </div>
          </div>
          {selectedItem.description ? <p>{selectedItem.description}</p> : null}
          <section className="daily-source source-ready">
            <strong>{selectedItem.source.label}</strong>
            <span>{selectedItem.source.description}</span>
          </section>
          {wishlist?.matched ? (
            <section className="wishlist-panel">
              <h3>疑似好 roll</h3>
              <p>{wishlist.labels.join(" / ")}</p>
              <ul>
                {wishlist.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
              <small>{wishlist.disclaimer}</small>
            </section>
          ) : null}
          <section className="item-note-panel">
            <label htmlFor="item-note-draft">本地备注</label>
            <textarea
              id="item-note-draft"
              value={itemNoteDraft}
              onChange={(event) => setItemNoteDraft(event.target.value)}
              placeholder="例如：留给电猎清怪 / 等队友复查 PVP 手感 / 同名已有更好 roll"
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
                {!selectedItem.is_vault_item ? (
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
                      character_id: selectedItem.is_vault_item
                        ? selectedActionCharacterId
                        : selectedItem.source_character_id ?? selectedActionCharacterId,
                      item_id: selectedItem.instance_id ?? "",
                      item_reference_hash: selectedItem.hash,
                      item_name: selectedItem.name,
                      transfer_to_vault: !selectedItem.is_vault_item
                    })
                  )}
                >
                  {selectedItem.is_vault_item ? "取出到角色" : "移入仓库"}
                </button>
              </div>
              {!writeActionsEnabled ? (
                <p className="notice">d2-service 本地写操作开关未开启，请先到设置页开启。Bungie 后台权限是另一项设置。</p>
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
              <div className="same-roll-list">
                {sameNameItems.map((item) => {
                  const score = scoreVaultItem(item, vaultTags);
                  const isCurrent = getItemKey(item) === selectedItem.item_key;
                  return (
                    <button
                      type="button"
                      className={isCurrent ? "same-roll-row current" : "same-roll-row"}
                      key={getItemKey(item)}
                      onClick={() => void openItemDetail(item, { is_vault_item: true })}
                    >
                      <strong>{item.name} / {score.score} 分</strong>
                      <span>{item.socket_plugs?.slice(0, 5).map((plug) => plug.name).join(" / ") || "暂无实际 roll"}</span>
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
          ) : (
            <p className="notice">暂无可展示 perk。</p>
          )}
        </section>
      </div>
    );
  }
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

function getAllKnownAccountItems(summary: AccountSummary): AccountItemSummary[] {
  const characterItems = summary.characters.flatMap((character) => [
    ...character.equipped_items,
    ...character.inventory_items
  ]);

  return [...summary.vault.items, ...characterItems];
}

function AccountSlotCategories(props: {
  categories: AccountSlotCategory[];
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
                <div className="equipment-grid">
                  {group.items.map((item) => (
                    <button
                      className="equipment-item"
                      key={`${item.hash}-${item.instance_id ?? ""}`}
                      type="button"
                      onClick={() => props.onOpenItem(item)}
                    >
                      {item.icon ? <img alt="" src={item.icon} /> : <div className="item-icon-placeholder" />}
                      <div>
                        <strong>{item.name}</strong>
                        <span>{formatAccountItemMeta(item)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      ))}
    </div>
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
      <SimpleAiSection title="事实" items={props.sections.facts} />
      <SimpleAiSection title="分析" items={props.sections.analysis} />
      <SimpleAiSection title="建议" items={props.sections.suggestions} />
      <SimpleAiSection title="操作提醒" items={props.sections.action_reminders} />
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
  is_vault_item?: boolean;
};

type SelectedItemSource = {
  source_character_id?: string;
  is_vault_item?: boolean;
};

function getItemKey(item: AccountItemSummary | ItemSearchResult): string {
  return "instance_id" in item && item.instance_id ? item.instance_id : `hash:${item.hash}`;
}

function formatActionLogTitle(entry: ActionLogEntry): string {
  const actionLabels: Record<ActionLogEntry["action"], string> = {
    "set-lock": "锁定状态",
    equip: "装备",
    transfer: "仓库转移"
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
    "d2-service 写操作诊断",
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
