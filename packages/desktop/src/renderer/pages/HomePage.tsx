import { createHomeDashboardWorkspace, createHomeDashboardActions } from "@d2-tools/app";
import { useEffect, useRef, useState } from "react";
import type { StartupState } from "../api/client";
import { GlobalAssistantSidebar } from "../components/GlobalAssistantSidebar";
import { ShellLayout, type ShellAssistantMode, type ShellPageKey } from "../components/ShellLayout";
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

  useEffect(() => {
    if (hasAutoLoadedAccount || props.state.nextStep !== "home") {
      return;
    }
    setHasAutoLoadedAccount(true);
    void loadAccountSummary();
  }, [hasAutoLoadedAccount, props.state.nextStep]);

  useEffect(() => {
    if (props.state.nextStep !== "home") return;

    const id = setInterval(() => {
      void loadAccountRef.current();
    }, 10 * 60 * 1000);

    return () => clearInterval(id);
  }, [props.state.nextStep]);

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

  const homeWorkspace = createHomeDashboardWorkspace({
    state: props.state,
    isLoggingIn,
    isInitializingManifest,
    isRefreshingDiagnostics: diagnostics.isRefreshingDiagnostics,
    diagnosticRows,
    diagnosticError: diagnostics.diagnosticError,
    dailySummary: daily.dailySummary,
    dailyMessage: daily.dailyMessage,
    dailyError: daily.dailyError,
    isLoadingDaily: daily.isLoadingDaily
  });

  const homeActions = createHomeDashboardActions({
    onConfigure: props.onConfigure,
    onLogin: () => void loginBungie(),
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

      <HomePageRoutes
        activePage={activePage}
        home={{ ...homeWorkspace, ...homeActions }}
        account={{
          accountSummary,
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
          itemDetailLoadingKey: itemDetail.itemDetailLoadingKey,
          onViewModeChange: library.setLibraryViewMode,
          onEquipmentFiltersChange: (patch) => library.setEquipmentFilters((current) => ({ ...current, ...patch })),
          onPerkFiltersChange: (patch) => library.setPerkFilters((current) => ({ ...current, ...patch })),
          onSearch: () => void library.searchItems(),
          onClearFilters: library.clearLibraryFilters,
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
          actionLog: diagnostics.actionLog,
          actionLogResultFilter: diagnostics.actionLogResultFilter,
          actionLogTypeFilter: diagnostics.actionLogTypeFilter,
          onAiSettingsSaved: diagnostics.handleAiSettingsSaved,
          onOpenConfig: props.onConfigure,
          onWriteActionsEnabledChange: (enabled) => void diagnostics.saveWriteActionsEnabled(enabled),
          onCheckForUpdates: () => void diagnostics.checkForUpdates(),
          onDownloadUpdate: () => void diagnostics.downloadUpdate(),
          onQuitAndInstallUpdate: () => void diagnostics.quitAndInstallUpdate(),
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
