import { createHomeDashboardWorkspace, createHomeDashboardActions } from "@d2-tools/app";
import { useEffect, useRef, useState } from "react";
import type { ManifestStatus, StartupState, UpdateSnapshot } from "../api/client";
import { GlobalAssistantSidebar } from "../components/GlobalAssistantSidebar";
import { ShellLayout, type ShellAssistantMode, type ShellPageKey, type ShellStatusItem } from "../components/ShellLayout";
import { useAccountWorkspace } from "../features/account/useAccountWorkspace";
import { useDailySummary } from "../features/daily/useDailySummary";
import { useHomePageDerivedState } from "../features/home/useHomePageDerivedState";
import { useLibraryWorkspace } from "../features/library/useLibraryWorkspace";
import { useLoadoutTemplates } from "../features/loadouts/useLoadoutTemplates";
import { useDiagnosticsSettings } from "../features/settings/useDiagnosticsSettings";
import { HomePageItemDetailModal } from "./HomePageItemDetailModal";
import { HomePageRoutes } from "./HomePageRoutes";
import { useHomePageWriteActions } from "./useHomePageWriteActions";

export function HomePage(props: {
  state: StartupState;
  onConfigure: () => void;
  onConfigChanged: () => void;
  onLoginComplete: () => void;
  onManifestInitialized: () => void;
}) {
  const [activePage, setActivePage] = useState<ShellPageKey>("home");
  const [assistantMode, setAssistantMode] = useState<ShellAssistantMode>(null);
  const [hasAutoLoadedAccount, setHasAutoLoadedAccount] = useState(false);
  const [vaultFacts, setVaultFacts] = useState<string[]>([]);
  const daily = useDailySummary();
  const library = useLibraryWorkspace();
  const diagnostics = useDiagnosticsSettings({
    onConfigChanged: props.onConfigChanged
  });
  const {
    loginMessage,
    loginError,
    isLoggingIn,
    manifestMessage,
    manifestError,
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
  const writeActions = useHomePageWriteActions({
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
  const loadoutMessage = writeActions.loadoutMessage;
  const itemActionMessage = writeActions.itemActionMessage;
  const isRunningItemAction = writeActions.isRunningItemAction;
  const loadoutActionFeedback = writeActions.loadoutActionFeedback;
  const loadoutTemplateActions = writeActions.loadoutTemplateActions;
  const loadoutWriteActions = writeActions.loadoutWriteActions;
  const vaultWriteActions = writeActions.vaultWriteActions;

  useEffect(() => {
    void diagnostics.refreshDiagnostics();
    void daily.loadDailySummary();
    void library.loadLibraryHistory();
  }, []);

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
  const visibleBackgroundTask = diagnostics.activeBackgroundTasks[0] ?? null;
  const activeBackgroundTaskCount = diagnostics.activeBackgroundTasks.length;
  const shouldShowUpdateBanner = updateSnapshot?.status === "available"
    || updateSnapshot?.status === "downloading"
    || updateSnapshot?.status === "downloaded"
    || updateSnapshot?.status === "error";
  const shellStatus = buildShellStatus({
    updateSnapshot,
    manifestStatus: diagnostics.manifestStatus,
    activeTaskCount: activeBackgroundTaskCount
  });

  const homeWorkspace = createHomeDashboardWorkspace({
    state: props.state,
    isLoggingIn,
    isInitializingManifest,
    isRefreshingDiagnostics: diagnostics.isRefreshingDiagnostics,
    diagnosticRows,
    diagnosticError: diagnostics.diagnosticError,
    accountError,
    hasAccountData: Boolean(accountSummary),
    dailySummary: daily.dailySummary,
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
    onRefreshDaily: () => void daily.loadDailySummary(),
    onCopyDailySummary: () => void daily.copyDailySummary(),
    onCopyWeeklyFocus: () => void daily.copyWeeklyFocus()
  });

  return (
    <ShellLayout
      activePage={activePage}
      assistantMode={assistantMode}
      onNavigate={setActivePage}
      onAssistantModeChange={setAssistantMode}
      shellStatus={shellStatus}
      assistantPanel={(
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
      )}
    >
      <header className="page-header">
        <div>
          <h2>{currentPageMeta.title}</h2>
          <p>{currentPageMeta.subtitle}</p>
        </div>
      </header>

      {loginMessage ? <p className="status-message status-ready">{loginMessage}</p> : null}
      {loginError ? <p className="status-message status-error">{loginError}</p> : null}
      {manifestMessage ? <p className="status-message status-ready">{manifestMessage}</p> : null}
      {manifestError ? <p className="status-message status-error">{manifestError}</p> : null}
      {shouldShowUpdateBanner && updateSnapshot ? (
        <section className={`global-update-banner update-${updateSnapshot.status}`}>
          <div>
            <strong>{updateSnapshot.status === "downloaded" ? "更新已准备好" : "应用更新"}</strong>
            <span>{updateSnapshot.user_message ?? updateSnapshot.error ?? "有新的更新状态。"}</span>
          </div>
          <div className="global-update-actions">
            {updateSnapshot.status === "available" ? (
              <button type="button" onClick={() => void diagnostics.downloadUpdate()}>下载更新</button>
            ) : null}
            {updateSnapshot.status === "downloaded" ? (
              <button type="button" onClick={() => void diagnostics.quitAndInstallUpdate()}>重启并安装</button>
            ) : null}
            {updateSnapshot.status === "error" ? (
              <button type="button" className="secondary-button" onClick={() => void diagnostics.openUpdateDownloadPage()}>
                打开下载页
              </button>
            ) : null}
            <button type="button" className="secondary-button" onClick={() => setActivePage("settings")}>
              查看更新
            </button>
          </div>
        </section>
      ) : null}
      {visibleBackgroundTask ? (
        <section className={`global-background-task-banner task-${visibleBackgroundTask.status}`}>
          <div>
            <strong>{formatVisibleBackgroundTaskTitle(visibleBackgroundTask.title, activeBackgroundTaskCount)}</strong>
            <span>
              {visibleBackgroundTask.next_retry_at
                ? `等待后台重试：${new Date(visibleBackgroundTask.next_retry_at).toLocaleString("zh-CN")}`
                : visibleBackgroundTask.message ?? "任务正在后台运行，切换菜单不会中断。"}
            </span>
          </div>
          <button type="button" className="secondary-button" onClick={() => setActivePage("settings")}>
            查看任务
          </button>
        </section>
      ) : null}

      <HomePageRoutes
        activePage={activePage}
        home={{ ...homeWorkspace, ...homeActions }}
        account={{
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
        }}
        loadouts={{
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
        }}
        library={{
          libraryViewMode: library.libraryViewMode,
          items: library.items,
          perks: library.perks,
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
          libraryHistory: library.libraryHistory,
          libraryCommunityMatch: library.libraryCommunityMatch,
          liveAvailability: library.liveAvailability,
          liveAvailabilityError: library.liveAvailabilityError,
          isLoadingLiveAvailability: library.isLoadingLiveAvailability,
          manifestStatus: library.manifestStatus,
          manifestStatusError: library.manifestStatusError,
          isLoadingManifestStatus: library.isLoadingManifestStatus,
          isInitializingManifest: library.isInitializingManifest,
          itemDetailLoadingKey: itemDetail.itemDetailLoadingKey,
          onViewModeChange: library.setLibraryViewMode,
          onEquipmentFiltersChange: (patch) => library.setEquipmentFilters((current) => ({ ...current, ...patch })),
          onPerkFiltersChange: (patch) => library.setPerkFilters((current) => ({ ...current, ...patch })),
          onSearch: () => void library.searchItems(),
          onClearFilters: library.clearLibraryFilters,
          onRefreshManifestStatus: () => void library.refreshManifestStatus(),
          onInitializeManifest: () => void library.initializeManifest(),
          onAliasDraftChange: library.setAliasDraft,
          onAliasTargetDraftChange: library.setAliasTargetDraft,
          onAliasKindChange: library.setAliasKind,
          onSaveAlias: () => void library.saveAlias(),
          onOpenItemDetail: (item) => void itemDetail.openItemDetail(item),
          onAddFavorite: (item) => void library.addSelectedItemToFavorites(item),
          onRemoveFavorite: (hash) => void library.removeFavorite(hash)
        }}
        vault={{
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
        }}
        settings={{
          message: diagnostics.settingsMessage,
          error: diagnostics.settingsError,
          diagnosticDataDir: diagnostics.diagnosticDataDir,
          writeActionsEnabled: diagnostics.writeActionsEnabled,
          updateSnapshot: diagnostics.updateSnapshot,
          manifestStatus: diagnostics.manifestStatus,
          manifestStatusError: diagnostics.manifestStatusError,
          isLoadingManifestStatus: diagnostics.isLoadingManifestStatus,
          isInitializingManifest: diagnostics.isInitializingManifest,
          backgroundTasks: diagnostics.backgroundTasks,
          actionLog: diagnostics.actionLog,
          actionLogResultFilter: diagnostics.actionLogResultFilter,
          actionLogTypeFilter: diagnostics.actionLogTypeFilter,
          onAiSettingsSaved: diagnostics.handleAiSettingsSaved,
          onOpenConfig: props.onConfigure,
          onWriteActionsEnabledChange: (enabled) => void diagnostics.saveWriteActionsEnabled(enabled),
          onCheckForUpdates: () => void diagnostics.checkForUpdates(),
          onDownloadUpdate: () => void diagnostics.downloadUpdate(),
          onQuitAndInstallUpdate: () => void diagnostics.quitAndInstallUpdate(),
          onOpenUpdateDownloadPage: () => void diagnostics.openUpdateDownloadPage(),
          onCopyUpdateDiagnostic: () => void diagnostics.copyUpdateDiagnostic(),
          onRefreshManifestStatus: () => void diagnostics.refreshManifestStatus(),
          onInitializeManifest: () => void diagnostics.initializeManifest(),
          onCopyDataBackupGuide: () => void diagnostics.copyDataBackupGuide(),
          onCopyDiagnosticsExport: () => void diagnostics.copyDiagnosticsExport(),
          onRefreshActionLog: () => void diagnostics.loadActionLog(),
          onActionLogResultFilterChange: diagnostics.setActionLogResultFilter,
          onActionLogTypeFilterChange: diagnostics.setActionLogTypeFilter,
          onCopyActionDiagnostic: (entry) => void diagnostics.copyActionDiagnostic(entry)
        }}
      />

      <HomePageItemDetailModal
        accountSummary={accountSummary}
        aiSettingsEnableLightgg={diagnostics.aiSettings.enable_lightgg}
        importedWishlist={importedWishlist}
        itemDetail={itemDetail}
        isRunningItemAction={isRunningItemAction}
        localTargetRules={localTargetRules}
        vaultTags={vaultTags}
      />
    </ShellLayout>
  );
}

function formatVisibleBackgroundTaskTitle(title: string, activeBackgroundTaskCount: number): string {
  if (activeBackgroundTaskCount > 1) {
    return `后台任务：${activeBackgroundTaskCount} 个运行中 · ${title}`;
  }

  return `后台任务：${title}`;
}

function buildShellStatus(input: {
  updateSnapshot: UpdateSnapshot | null;
  manifestStatus: ManifestStatus | null;
  activeTaskCount: number;
}): ShellStatusItem[] {
  return [
    {
      label: "应用版本",
      value: formatAppUpdateStatus(input.updateSnapshot),
      tone: getUpdateStatusTone(input.updateSnapshot)
    },
    {
      label: "资料库",
      value: formatManifestShellStatus(input.manifestStatus),
      tone: getManifestStatusTone(input.manifestStatus)
    },
    {
      label: "后台任务",
      value: input.activeTaskCount ? `${input.activeTaskCount} 个运行中` : "空闲",
      tone: input.activeTaskCount ? "warning" : "neutral"
    }
  ];
}

function formatAppUpdateStatus(snapshot: UpdateSnapshot | null): string {
  if (!snapshot) return "读取中";
  if (snapshot.status === "available") return `可更新 ${snapshot.available_version ?? ""}`.trim();
  if (snapshot.status === "downloaded") return "待重启";
  if (snapshot.status === "downloading") return `${snapshot.progress_percent ?? 0}%`;
  if (snapshot.status === "error") return "检查失败";
  return snapshot.current_version;
}

function getUpdateStatusTone(snapshot: UpdateSnapshot | null): ShellStatusItem["tone"] {
  if (!snapshot) return "neutral";
  if (snapshot.status === "available" || snapshot.status === "downloaded") return "ready";
  if (snapshot.status === "downloading" || snapshot.status === "checking") return "warning";
  if (snapshot.status === "error") return "error";
  return "neutral";
}

function formatManifestShellStatus(status: ManifestStatus | null): string {
  if (!status) return "读取中";
  if (!status.initialized) return "未初始化";
  if (status.missing_required_components?.length) return "组件缺失";
  if (status.needs_update) return "需要更新";
  if (status.cached_at) {
    const date = new Date(status.cached_at);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
    }
  }
  return status.version ?? "可用";
}

function getManifestStatusTone(status: ManifestStatus | null): ShellStatusItem["tone"] {
  if (!status) return "neutral";
  if (!status.initialized || status.missing_required_components?.length || status.needs_update) return "warning";
  return "ready";
}
