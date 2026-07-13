import { createHomeDashboardActions, createHomeDashboardWorkspace } from "@d2-tools/app";
import {
  type ProductPreferences,
  type ShellAssistantMode,
  type ShellPageKey,
  type ShellStatusItem
} from "@d2-tools/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import type { AccountSummary, ManifestStatus, StartupState, UpdateSnapshot } from "../api/types";
import { GlobalAssistantSidebar } from "../components/GlobalAssistantSidebar";
import { useAccountWorkspace } from "../features/account/useAccountWorkspace";
import { useDailySummary } from "../features/daily/useDailySummary";
import { useHomePageDerivedState } from "../features/home/useHomePageDerivedState";
import { useLibraryWorkspace } from "../features/library/useLibraryWorkspace";
import { useLoadoutTemplates } from "../features/loadouts/useLoadoutTemplates";
import { useDiagnosticsSettings } from "../features/settings/useDiagnosticsSettings";
import { useVendorsWorkspace } from "../features/vendors/useVendorsWorkspace";
import type { DesktopMenuProviderContextValue } from "./providers/DesktopMenuProviderContext";
import { useDesktopProductWriteActions } from "./useDesktopProductWriteActions";

export function useDesktopProductShell(props: {
  state: StartupState;
  onConfigure: () => void;
  onConfigChanged: () => void;
  onLoginComplete: () => void;
  onManifestInitialized: () => void;
}) {
  const visualEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const visualInitialPage = visualEnv?.VITE_D2_VISUAL_PAGE;
  const visualColorMode = isColorMode(visualEnv?.VITE_D2_VISUAL_THEME) ? visualEnv?.VITE_D2_VISUAL_THEME : undefined;
  const initialPage: ShellPageKey = isShellPageKey(visualInitialPage) ? visualInitialPage : "home";
  const [activePage, setActivePage] = useState<ShellPageKey>(initialPage);
  const [assistantMode, setAssistantMode] = useState<ShellAssistantMode>(null);
  const [hasAutoLoadedAccount, setHasAutoLoadedAccount] = useState(false);
  const [lastAccountLoadedAt, setLastAccountLoadedAt] = useState<Date | null>(null);
  const [vaultFacts, setVaultFacts] = useState<string[]>([]);
  const isVisualCapture = visualEnv?.VITE_D2_VISUAL_CAPTURE === "1";
  const daily = useDailySummary();
  const library = useLibraryWorkspace();
  const diagnostics = useDiagnosticsSettings({
    onConfigChanged: props.onConfigChanged,
    initialColorMode: visualColorMode ?? props.state.colorMode,
    initialLanguagePreferences: props.state.languagePreferences
  });
  const desktopPlatformActions = useMemo(() => ({
    openExternal: (url: string) => window.d2.openExternal(url),
    setColorMode: (mode: "light" | "dark") => window.d2?.setWindowColorMode?.(mode),
    windowControls: {
      minimize: () => window.d2.minimizeWindow(),
      toggleMaximize: () => window.d2.toggleMaximizeWindow(),
      close: () => window.d2.closeWindow()
    }
  }), []);
  const {
    isLoggingIn,
    isInitializingManifest,
    accountSummary,
    vaultTags,
    setVaultTags,
    accountError,
    setAccountError,
    isLoadingAccount,
    selectedCharacterId,
    setSelectedCharacterId,
    activitySummary,
    activityMessage,
    activityError,
    importedWishlist,
    setImportedWishlist,
    localTargetRules,
    setLocalTargetRules,
    vaultCommunityMatch,
    loginBungie,
    initializeManifest,
    loadAccountSummary,
    loadActivitySummary
  } = useAccountWorkspace({
    state: props.state,
    diagnostics,
    onLoginComplete: props.onLoginComplete,
    onManifestInitialized: props.onManifestInitialized
  });
  const loadoutLibrary = useLoadoutTemplates();
  const writeActions = useDesktopProductWriteActions({
    accountSummary,
    diagnostics,
    vaultTags,
    setVaultTags,
    importedWishlist,
    localTargetRules,
    setAccountError,
    loadAccountSummary,
    loadoutLibrary,
    onRecentHistoryChanged: library.setLibraryHistory
  });
  const itemDetail = writeActions.itemDetail;
  const vendorsWorkspace = useVendorsWorkspace({
    accountSummary,
    selectedCharacterId,
    active: activePage === "vendors",
    loadInventory: api.getVendorInventory
  });
  const loadoutMessage = writeActions.loadoutMessage;
  const itemActionMessage = writeActions.itemActionMessage;
  const isRunningItemAction = writeActions.isRunningItemAction;
  const loadoutActionFeedback = writeActions.loadoutActionFeedback;
  const loadoutTemplateActions = writeActions.loadoutTemplateActions;
  const loadoutWriteActions = writeActions.loadoutWriteActions;
  const vaultWriteActions = writeActions.vaultWriteActions;

  useEffect(() => {
    if (isVisualCapture) {
      return;
    }
    void diagnostics.refreshDiagnostics();
    void daily.loadDailySummary();
    void library.loadLibraryHistory();
  }, [isVisualCapture]);

  const loadAccountRef = useRef(loadAccountSummary);
  loadAccountRef.current = loadAccountSummary;
  const canRefreshAccount = props.state.cards.bungieConfig.status === "ready"
    && props.state.cards.account.status === "ready";

  useEffect(() => {
    if (hasAutoLoadedAccount || !canRefreshAccount) {
      return;
    }
    setHasAutoLoadedAccount(true);
    void loadAccountSummary();
  }, [canRefreshAccount, hasAutoLoadedAccount]);

  useEffect(() => {
    if (!canRefreshAccount) return;

    const id = setInterval(() => {
      void loadAccountRef.current();
    }, 10 * 60 * 1000);

    return () => clearInterval(id);
  }, [canRefreshAccount]);

  useEffect(() => {
    if (accountSummary) {
      setLastAccountLoadedAt(new Date());
    }
  }, [accountSummary]);

  const activeLoadoutTemplate = loadoutLibrary.activeTemplate;
  const homeDerivedState = useHomePageDerivedState({
    activePage,
    state: props.state,
    accountSummary,
    selectedCharacterId,
    activeLoadoutTemplate,
    vaultFacts,
    library,
    diagnostics
  });
  const activeLoadoutLookup = homeDerivedState.activeLoadoutLookup;
  const diagnosticRows = homeDerivedState.diagnosticRows;
  const currentPageMeta = homeDerivedState.currentPageMeta;
  const assistantPageContext = homeDerivedState.assistantPageContext;
  const isAiConfigured = homeDerivedState.isAiConfigured;
  const updateSnapshot = diagnostics.updateSnapshot;
  const shellStatus = buildShellStatus({
    manifestStatus: diagnostics.manifestStatus,
    accountSummary,
    lastAccountLoadedAt,
    isLoadingAccount,
    accountError,
    canRefreshAccount,
    isBungieConfigured: props.state.cards.bungieConfig.status === "ready",
    isAiConfigured,
    updateSnapshot,
    onRepairManifest: () => void diagnostics.repairManifest()
  });

  const homeWorkspace = createHomeDashboardWorkspace({
    state: props.state,
    selectedCharacterId,
    isLoggingIn,
    isInitializingManifest,
    isRefreshingDiagnostics: diagnostics.isRefreshingDiagnostics,
    diagnosticRows,
    diagnosticError: diagnostics.diagnosticError,
    accountError,
    hasAccountData: Boolean(accountSummary),
    dailySummary: daily.dailySummary,
    weeklySummary: daily.weeklySummary,
    dailyMessage: daily.dailyMessage,
    dailyError: daily.dailyError,
    isLoadingAccount,
    isLoadingDaily: daily.isLoadingDaily
  });
  const homeActions = createHomeDashboardActions({
    onConfigure: props.onConfigure,
    onLogin: () => void loginBungie(),
    onLoadAccount: () => void loadAccountSummary(),
    onInitializeManifest: () => void initializeManifest(),
    onConfigureAi: () => setActivePage("settings"),
    onRefreshDiagnostics: () => void diagnostics.refreshDiagnostics(),
    onNavigate: setActivePage,
    onRefreshDaily: () => void daily.loadDailySummary()
  });
  const productPreferences: ProductPreferences = {
    ...diagnostics.languagePreferences,
    colorMode: diagnostics.colorMode
  };

  function handleProductPreferencesChange(preferences: ProductPreferences) {
    if (preferences.colorMode !== diagnostics.colorMode) {
      void diagnostics.toggleColorMode();
    }

    if (
      preferences.interfaceLocale !== diagnostics.languagePreferences.interfaceLocale
      || preferences.bungieLocale !== diagnostics.languagePreferences.bungieLocale
      || preferences.followInterfaceLocaleForBungie !== diagnostics.languagePreferences.followInterfaceLocaleForBungie
    ) {
      void diagnostics.saveLanguagePreferences({
        interfaceLocale: preferences.interfaceLocale,
        bungieLocale: preferences.bungieLocale,
        followInterfaceLocaleForBungie: preferences.followInterfaceLocaleForBungie
      });
    }
  }

  const menuContext: DesktopMenuProviderContextValue = {
    home: {
      ...homeWorkspace,
      ...homeActions,
      interfaceLocale: diagnostics.languagePreferences.interfaceLocale
    },
    account: {
      interfaceLocale: diagnostics.languagePreferences.interfaceLocale,
      accountSummary,
      startupState: props.state,
      selectedCharacterId,
      isLoadingAccount,
      accountError,
      itemDetailError: itemDetail.itemDetailError,
      itemDetailLoadingKey: itemDetail.itemDetailLoadingKey,
      writeActionsEnabled: diagnostics.writeActionsEnabled,
      activitySummary,
      activityMessage,
      activityError,
      loadoutMessage,
      itemActionMessage,
      isRunningItemAction,
      activeLoadoutLookup,
      activeLoadoutTemplate,
      onConfigureBungie: props.onConfigure,
      onLoginBungie: () => void loginBungie(),
      onLoadAccount: () => void loadAccountSummary(),
      onRefreshActivity: () => void loadActivitySummary(),
      onSelectCharacter: setSelectedCharacterId,
      onSaveCharacterLoadout: (character) => void loadoutWriteActions.saveCharacterLoadout(character),
      onEquipHighestPowerItems: (character) => void loadoutWriteActions.equipHighestPowerItems(character),
      onOpenItem: (item, options) => void itemDetail.openItemDetail(item, options)
    },
    loadouts: {
      accountSummary,
      templates: loadoutLibrary.templates,
      selectedTemplateId: loadoutLibrary.selectedTemplateId,
      compareTemplateId: loadoutLibrary.compareTemplateId,
      renameDraft: loadoutLibrary.renameDraft,
      showDiffOnly: loadoutLibrary.showDiffOnly,
      message: loadoutMessage,
      isRunningItemAction,
      actionFeedback: loadoutActionFeedback.actionFeedback,
      onSelectTemplate: loadoutLibrary.selectTemplate,
      onSelectCompareTemplate: loadoutLibrary.setCompareTemplateId,
      onRenameDraftChange: loadoutLibrary.setRenameDraft,
      onShowDiffOnlyChange: loadoutLibrary.setShowDiffOnly,
      onRenameTemplate: (template) => void loadoutWriteActions.renameLoadoutTemplate(template),
      onDeleteTemplate: (id) => void loadoutWriteActions.deleteLoadoutTemplate(id),
      onCreateTransferPlan: (template) => void loadoutTemplateActions.createTemplateTransferPlan(template),
      onCopyMissingItems: (template, analysis) => void loadoutTemplateActions.copyMissingLoadoutItems(template, analysis),
      onExecuteMissingTransfer: (template, analysis) => void loadoutWriteActions.executeMissingLoadoutTransfer(template, analysis),
      onExecuteSingleItemTransfer: (template, item) => void loadoutWriteActions.executeSingleLoadoutItemTransfer(template, item),
      onEquipSingleItem: (template, item) => void loadoutWriteActions.equipSingleLoadoutItem(template, item),
      onEquipSavedLoadout: (character, slot) => void loadoutWriteActions.equipSavedLoadout(character, slot),
      onSnapshotCurrentLoadout: (character, slot) => void loadoutWriteActions.snapshotCurrentLoadout(character, slot),
      onOpenTemplateSourceItem: (item, characterId) => void loadoutWriteActions.openTemplateSourceItem(item, characterId)
    },
    library: {
      cache: {
        items: library.items,
        perks: library.perks,
        libraryHistory: library.libraryHistory,
        libraryCommunityMatch: library.libraryCommunityMatch,
        liveAvailability: library.liveAvailability,
        liveAvailabilityError: library.liveAvailabilityError,
        manifestStatus: library.manifestStatus,
        manifestStatusError: library.manifestStatusError
      },
      state: {
        libraryViewMode: library.libraryViewMode,
        equipmentFilters: library.equipmentFilters,
        perkFilters: library.perkFilters,
        equipmentSearchTouched: library.equipmentSearchTouched,
        perkSearchTouched: library.perkSearchTouched,
        isSearching: library.isSearching,
        searchError: library.searchError,
        aliasDraft: library.aliasDraft,
        aliasTargetDraft: library.aliasTargetDraft,
        aliasKind: library.aliasKind,
        aliasMessage: library.aliasMessage,
        isLoadingLiveAvailability: library.isLoadingLiveAvailability,
        isLoadingManifestStatus: library.isLoadingManifestStatus,
        isInitializingManifest: library.isInitializingManifest,
        itemDetailLoadingKey: itemDetail.itemDetailLoadingKey
      },
      actions: {
        onViewModeChange: library.setLibraryViewMode,
        onEquipmentFiltersChange: (patch) => library.setEquipmentFilters((current) => ({ ...current, ...patch })),
        onPerkFiltersChange: (patch) => library.setPerkFilters((current) => ({ ...current, ...patch })),
        onSearch: () => void library.searchItems(),
        onClearFilters: library.clearLibraryFilters,
        onRefreshManifestStatus: () => void library.refreshManifestStatus(),
        onRepairManifest: () => void library.repairManifest(),
        onAliasDraftChange: library.setAliasDraft,
        onAliasTargetDraftChange: library.setAliasTargetDraft,
        onAliasKindChange: library.setAliasKind,
        onSaveAlias: () => void library.saveAlias(),
        onOpenItemDetail: (item) => void itemDetail.openItemDetail(item),
        onAddFavorite: (item) => void library.addSelectedItemToFavorites(item),
        onRemoveFavorite: (hash) => void library.removeFavorite(hash)
      }
    },
    vendors: {
      model: vendorsWorkspace.model,
      actions: {
        selectVendor: vendorsWorkspace.selectVendor,
        refreshVendors: () => void vendorsWorkspace.refresh(),
        onOpenItem: (item, context) => void itemDetail.openVendorItemDetail(item, context)
      },
      interfaceLocale: diagnostics.languagePreferences.interfaceLocale
    },
    vault: {
      account: accountSummary,
      isLoadingAccount,
      accountError,
      activeLoadoutLookup,
      activeLoadoutName: activeLoadoutTemplate?.name,
      selectedCharacterId,
      writeActionsEnabled: diagnostics.writeActionsEnabled,
      tags: vaultTags,
      openingItemKey: itemDetail.itemDetailLoadingKey,
      wishlist: importedWishlist,
      localTargetRules,
      communityMatch: vaultCommunityMatch,
      onContextFactsChange: setVaultFacts,
      onWishlistChanged: setImportedWishlist,
      onLocalTargetRulesChanged: setLocalTargetRules,
      onLoadAccount: () => void loadAccountSummary(),
      onSaveTagBatch: (inputs) => vaultWriteActions.saveVaultTagsBatch(inputs),
      onBatchUnlock: vaultWriteActions.handleVaultCleanupUnlock,
      onBatchTransferToCharacter: vaultWriteActions.handleVaultCleanupTransfer,
      onOpenItem: (item) => void itemDetail.openItemDetail(item, { is_vault_item: true }),
      onSaveTag: (item, tag) => vaultWriteActions.saveVaultTag(item, tag)
    },
    settings: {
      interfaceLocale: diagnostics.languagePreferences.interfaceLocale,
      message: diagnostics.settingsMessage,
      error: diagnostics.settingsError,
      diagnosticDataDir: diagnostics.diagnosticDataDir,
      writeActionsEnabled: diagnostics.writeActionsEnabled,
      updateSnapshot: diagnostics.updateSnapshot,
      manifestStatus: diagnostics.manifestStatus,
      manifestStatusError: diagnostics.manifestStatusError,
      isLoadingManifestStatus: diagnostics.isLoadingManifestStatus,
      isInitializingManifest: diagnostics.isInitializingManifest,
      accountSummary,
      accountError,
      isLoadingAccount,
      lastAccountLoadedAt,
      isAiConfigured,
      onRefreshAccount: () => void loadAccountSummary(),
      onReauthorizeAccount: () => void loginBungie(),
      backgroundTasks: diagnostics.backgroundTasks,
      actionLog: diagnostics.actionLog,
      actionLogResultFilter: diagnostics.actionLogResultFilter,
      actionLogTypeFilter: diagnostics.actionLogTypeFilter,
      onAiSettingsSaved: diagnostics.handleAiSettingsSaved,
      onOpenDataDir: () => void api.openDataDir(),
      onWriteActionsEnabledChange: (enabled) => void diagnostics.saveWriteActionsEnabled(enabled),
      onCheckForUpdates: () => void diagnostics.checkForUpdates(),
      onDownloadUpdate: () => void diagnostics.downloadUpdate(),
      onQuitAndInstallUpdate: () => void diagnostics.quitAndInstallUpdate(),
      onOpenUpdateDownloadPage: () => void diagnostics.openUpdateDownloadPage(),
      onCopyUpdateDiagnostic: () => void diagnostics.copyUpdateDiagnostic(),
      onRefreshManifestStatus: () => void diagnostics.refreshManifestStatus(),
      onInitializeManifest: () => void diagnostics.initializeManifest(),
      onRepairManifest: () => void diagnostics.repairManifest(),
      onExportConfig: () => void diagnostics.exportConfig(),
      onImportConfig: () => void diagnostics.importConfig(),
      onClearCache: () => void diagnostics.clearCache(),
      onCopyDataBackupGuide: () => void diagnostics.copyDataBackupGuide(),
      onCopyDiagnosticsExport: () => void diagnostics.copyDiagnosticsExport(),
      onRefreshDiagnostics: () => void diagnostics.refreshDiagnostics(),
      onRefreshActionLog: () => void diagnostics.loadActionLog(),
      onActionLogResultFilterChange: diagnostics.setActionLogResultFilter,
      onActionLogTypeFilterChange: diagnostics.setActionLogTypeFilter,
      onCopyActionDiagnostic: (entry) => void diagnostics.copyActionDiagnostic(entry),
      languagePreferences: diagnostics.languagePreferences,
      onLanguagePreferencesChange: (preferences) => void diagnostics.saveLanguagePreferences(preferences)
    }
  };

  const assistantPanel = (
    <GlobalAssistantSidebar
      assistantMode={assistantMode}
      activePage={activePage}
      isConfigured={isAiConfigured}
      account={accountSummary}
      daily={daily.dailySummary}
      activity={activitySummary}
      pageContext={assistantPageContext}
      tags={vaultTags}
      isLoadingAccount={isLoadingAccount}
      onLoadAccount={() => void loadAccountSummary()}
      onConfigureAi={() => {
        setActivePage("settings");
        setAssistantMode(null);
      }}
      onSaveGuideDraft={(draft) => void loadoutWriteActions.saveGuideDraft(draft)}
      onClose={() => setAssistantMode(null)}
    />
  );

  return {
    activePage,
    assistantMode,
    assistantPanel,
    backgroundTasks: diagnostics.backgroundTasks,
    handleAssistantModeChange: setAssistantMode,
    handlePageChange: setActivePage,
    handleProductPreferencesChange,
    itemDetailModalProps: {
      accountSummary,
      aiSettingsEnableLightgg: diagnostics.aiSettings.enable_lightgg,
      importedWishlist,
      itemDetail,
      isRunningItemAction,
      localTargetRules,
      vaultTags
    },
    menuContext,
    pageHeader: {
      title: currentPageMeta.title,
      subtitle: currentPageMeta.subtitle,
      actions: activePage === "home" || activePage === "vendors" ? (
        <button
          type="button"
          className="secondary-button"
          disabled={activePage === "vendors" ? vendorsWorkspace.isRefreshing : daily.isLoadingDaily}
          onClick={() => activePage === "vendors" ? void vendorsWorkspace.refresh() : void daily.loadDailySummary()}
        >
          {activePage === "vendors"
            ? vendorsWorkspace.isRefreshing ? "刷新中..." : "刷新商人数据"
            : daily.isLoadingDaily ? "刷新中..." : "刷新本周信息"}
        </button>
      ) : null
    },
    platformActions: desktopPlatformActions,
    productPreferences,
    shellStatus
  };
}

function buildShellStatus(input: {
  manifestStatus: ManifestStatus | null;
  accountSummary: AccountSummary | null;
  lastAccountLoadedAt: Date | null;
  isLoadingAccount: boolean;
  accountError: string;
  canRefreshAccount: boolean;
  isBungieConfigured: boolean;
  isAiConfigured: boolean;
  updateSnapshot: UpdateSnapshot | null;
  onRepairManifest: () => void;
}): ShellStatusItem[] {
  const needsLibraryRepair = Boolean(input.manifestStatus?.missing_required_components?.length);

  return [
    {
      key: "bungie",
      label: "Bungie",
      value: input.isBungieConfigured ? "已配置" : "未配置",
      tone: input.isBungieConfigured ? "ready" : "warning"
    },
    {
      key: "account",
      label: "账号",
      value: formatAccountShellStatus(input.accountSummary, input.lastAccountLoadedAt, input.isLoadingAccount, input.accountError, input.canRefreshAccount),
      tone: getAccountStatusTone(input.accountSummary, input.isLoadingAccount, input.accountError, input.canRefreshAccount)
    },
    {
      key: "library",
      label: "资料库",
      value: needsLibraryRepair ? "修复资料库" : formatManifestShellStatus(input.manifestStatus),
      tone: getManifestStatusTone(input.manifestStatus),
      actionLabel: needsLibraryRepair ? "修复资料库" : undefined,
      onAction: needsLibraryRepair ? input.onRepairManifest : undefined
    },
    {
      key: "ai",
      label: "AI",
      value: input.isAiConfigured ? "已配置" : "未配置",
      tone: input.isAiConfigured ? "ready" : "warning"
    },
    {
      key: "app-version",
      label: "应用版本",
      value: formatUpdateShellStatus(input.updateSnapshot),
      tone: getUpdateStatusTone(input.updateSnapshot)
    },
  ];
}

function formatAccountShellStatus(
  accountSummary: AccountSummary | null,
  lastAccountLoadedAt: Date | null,
  isLoadingAccount: boolean,
  accountError: string,
  canRefreshAccount: boolean
): string {
  if (isLoadingAccount) return "读取中";
  if (accountError) return "读取失败";
  if (accountSummary) return formatTime(lastAccountLoadedAt) ?? "已读取";
  return canRefreshAccount ? "可读取" : "未登录";
}

function getAccountStatusTone(
  accountSummary: AccountSummary | null,
  isLoadingAccount: boolean,
  accountError: string,
  canRefreshAccount: boolean
): ShellStatusItem["tone"] {
  if (accountError) return "error";
  if (isLoadingAccount) return "warning";
  if (accountSummary) return "ready";
  return canRefreshAccount ? "warning" : "neutral";
}

function formatManifestShellStatus(status: ManifestStatus | null): string {
  if (!status) return "读取中";
  if (!status.initialized) return "未准备";
  if (status.missing_required_components?.length) return "需修复";
  if (status.needs_update) return "可更新";
  return formatLibraryVersion(status.version) ?? "可用";
}

function formatUpdateShellStatus(snapshot: UpdateSnapshot | null): string {
  const version = snapshot?.current_version ?? "未读取";
  if (!snapshot) return version;
  if (snapshot.status === "available") return `${version} 有新版`;
  if (snapshot.status === "downloaded") return `${version} 待安装`;
  if (snapshot.status === "downloading") return `${version} 下载中`;
  if (snapshot.status === "error") return `${version} 检查失败`;
  return `${version} 最新`;
}

function isShellPageKey(value: string | undefined): value is ShellPageKey {
  return value === "home" || value === "account" || value === "vault" || value === "loadouts" || value === "library" || value === "vendors" || value === "settings";
}

function isColorMode(value: string | undefined): value is "light" | "dark" {
  return value === "light" || value === "dark";
}

function formatLibraryVersion(version?: string): string | undefined {
  if (!version) return undefined;
  const match = version.match(/(?:^|\.)(\d{2})\.(\d{2})\.(\d{2})(?:\.|-)/);
  if (!match) return undefined;
  const yearNumber = Number(match[1]);
  const fullYear = yearNumber < 80 ? 2000 + yearNumber : 1900 + yearNumber;
  return `${fullYear}/${match[2]}/${match[3]}`;
}

function formatTime(date: Date | null): string | undefined {
  if (!date) return undefined;
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function getManifestStatusTone(status: ManifestStatus | null): ShellStatusItem["tone"] {
  if (!status) return "neutral";
  if (!status.initialized || status.missing_required_components?.length || status.needs_update) return "warning";
  return "ready";
}

function getUpdateStatusTone(snapshot: UpdateSnapshot | null): ShellStatusItem["tone"] {
  if (!snapshot) return "neutral";
  if (snapshot.status === "error") return "error";
  if (snapshot.status === "available" || snapshot.status === "downloaded" || snapshot.status === "downloading") return "warning";
  return "ready";
}
