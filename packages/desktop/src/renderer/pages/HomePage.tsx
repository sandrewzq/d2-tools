import { Suspense, useEffect, useState } from "react";
import {
  type AccountSummary,
  type StartupState
} from "../api/client";
import { isAiSettingsConfigured } from "../utils/aiSettings";
import { buildDiagnosticRows } from "../components/DiagnosticsPanel";
import { ShellLayout, type ShellPageKey } from "../components/ShellLayout";
import { AccountPage } from "../features/account/AccountPage";
import { useAccountWorkspace } from "../features/account/useAccountWorkspace";
import { AiPage } from "../features/ai/AiPage";
import { useDailySummary } from "../features/daily/useDailySummary";
import { HomeDashboard } from "../features/home/HomeDashboard";
import { LibraryPage } from "../features/library/LibraryPage";
import { useLibraryWorkspace } from "../features/library/useLibraryWorkspace";
import { LoadoutsPage } from "../features/loadouts/LoadoutsPage";
import { useLoadoutActionFeedback } from "../features/loadouts/useLoadoutActionFeedback";
import { useLoadoutTemplateActions } from "../features/loadouts/useLoadoutTemplateActions";
import { useLoadoutTemplates } from "../features/loadouts/useLoadoutTemplates";
import { useLoadoutWriteActions } from "../features/loadouts/useLoadoutWriteActions";
import { buildLoadoutTemplateLookup } from "../shared/domain/loadouts/loadoutLookup";
import { ItemDetailModal } from "../shared/components/ItemDetailModal";
import { useItemDetailWorkspace } from "../shared/hooks/useItemDetailWorkspace";
import { SettingsPage } from "../features/settings/SettingsPage";
import { useDiagnosticsSettings } from "../features/settings/useDiagnosticsSettings";
import { VaultPage } from "../features/vault/VaultPage";
import { useVaultWriteActions } from "../features/vault/useVaultWriteActions";

export function HomePage(props: {
  state: StartupState;
  onConfigure: () => void;
  onConfigChanged: () => void;
  onLoginComplete: () => void;
  onManifestInitialized: () => void;
}) {
  const [activePage, setActivePage] = useState<ShellPageKey>("home");
  const [hasAutoLoadedAccount, setHasAutoLoadedAccount] = useState(false);
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
    importedWishlist,
    setImportedWishlist,
    vaultCommunityMatch,
    loginBungie,
    initializeManifest,
    loadAccountSummary,
    loadPersistedWishlist
  } = useAccountWorkspace({
    state: props.state,
    diagnostics,
    onLoginComplete: props.onLoginComplete,
    onManifestInitialized: props.onManifestInitialized
  });
  const loadoutLibrary = useLoadoutTemplates();
  const [loadoutMessage, setLoadoutMessage] = useState("");
  const loadoutTemplateActions = useLoadoutTemplateActions({
    accountSummary,
    setLoadoutMessage
  });
  const [isRunningItemAction, setIsRunningItemAction] = useState(false);
  const [itemActionMessage, setItemActionMessage] = useState("");
  const loadoutActionFeedback = useLoadoutActionFeedback();
  const itemDetail = useItemDetailWorkspace({
    accountSummary,
    vaultTags,
    setVaultTags,
    importedWishlist,
    diagnostics,
    setAccountError,
    setIsRunningItemAction,
    setItemActionMessage,
    loadAccountSummary,
    onRecentHistoryChanged: library.setLibraryHistory
  });
  const loadoutWriteActions = useLoadoutWriteActions({
    accountSummary,
    loadoutLibrary,
    diagnostics,
    loadoutActionFeedback,
    setLoadoutMessage,
    setItemActionMessage,
    setIsRunningItemAction,
    loadAccountSummary,
    openItemDetail: itemDetail.openItemDetail
  });
  const vaultWriteActions = useVaultWriteActions({
    accountSummary,
    diagnostics,
    setVaultTags,
    setAccountError,
    setIsRunningItemAction,
    setItemActionMessage,
    loadAccountSummary
  });

  useEffect(() => {
    void diagnostics.refreshDiagnostics();
    void daily.loadDailySummary();
    void library.loadLibraryHistory();
    void loadPersistedWishlist();
  }, []);

  useEffect(() => {
    if (hasAutoLoadedAccount || props.state.nextStep !== "home") {
      return;
    }
    setHasAutoLoadedAccount(true);
    void loadAccountSummary();
  }, [hasAutoLoadedAccount, props.state.nextStep]);

  const isAiConfigured = isAiSettingsConfigured(diagnostics.aiSettings);

  const activeLoadoutTemplate = loadoutLibrary.activeTemplate;
  const activeLoadoutLookup = activeLoadoutTemplate
    ? buildLoadoutTemplateLookup(activeLoadoutTemplate)
    : null;
  const diagnosticRows = buildDiagnosticRows({
    state: props.state,
    dataDir: diagnostics.diagnosticDataDir,
    manifestVersion: diagnostics.diagnosticManifestVersion
  });
  return (
    <ShellLayout activePage={activePage} onNavigate={setActivePage}>
      <header className="page-header">
        <div>
          <h2>{pageTitle(activePage)}</h2>
          <p>{pageSubtitle(activePage)}</p>
        </div>
      </header>

      {loginMessage ? <p className="notice">{loginMessage}</p> : null}
      {loginError ? <p className="error">{loginError}</p> : null}
      {manifestMessage ? <p className="notice">{manifestMessage}</p> : null}
      {manifestError ? <p className="error">{manifestError}</p> : null}

      <Suspense fallback={<div className="page-loading">加载中...</div>}>
        {activePage === "home" ? (
        <HomeDashboard
          state={props.state}
          isLoggingIn={isLoggingIn}
          isInitializingManifest={isInitializingManifest}
          isRefreshingDiagnostics={diagnostics.isRefreshingDiagnostics}
          diagnosticRows={diagnosticRows}
          diagnosticError={diagnostics.diagnosticError}
          dailySummary={daily.dailySummary}
          dailyMessage={daily.dailyMessage}
          dailyError={daily.dailyError}
          isLoadingDaily={daily.isLoadingDaily}
          onConfigure={props.onConfigure}
          onLogin={() => void loginBungie()}
          onInitializeManifest={() => void initializeManifest()}
          onConfigureAi={() => setActivePage("settings")}
          onRefreshDiagnostics={() => void diagnostics.refreshDiagnostics()}
          onNavigate={setActivePage}
          onRefreshDaily={() => void daily.loadDailySummary()}
          onCopyDailySummary={() => void daily.copyDailySummary()}
          onCopyWeeklyFocus={() => void daily.copyWeeklyFocus()}
        />
      ) : null}

      {activePage === "account" ? (
        <AccountPage
          accountSummary={accountSummary}
          selectedCharacterId={selectedCharacterId}
          isLoadingAccount={isLoadingAccount}
          accountError={accountError}
          itemDetailError={itemDetail.itemDetailError}
          itemDetailLoadingKey={itemDetail.itemDetailLoadingKey}
          writeActionsEnabled={diagnostics.writeActionsEnabled}
          loadoutMessage={loadoutMessage}
          itemActionMessage={itemActionMessage}
          isRunningItemAction={isRunningItemAction}
          activeLoadoutLookup={activeLoadoutLookup}
          activeLoadoutTemplate={activeLoadoutTemplate}
          onLoadAccount={() => void loadAccountSummary()}
          onSelectCharacter={setSelectedCharacterId}
          onSaveCharacterLoadout={(character) => void loadoutWriteActions.saveCharacterLoadout(character)}
          onEquipHighestPowerItems={(character) => void loadoutWriteActions.equipHighestPowerItems(character)}
          onEquipSavedLoadout={(character, slot) => void loadoutWriteActions.equipSavedLoadout(character, slot)}
          onSnapshotCurrentLoadout={(character, slot) => void loadoutWriteActions.snapshotCurrentLoadout(character, slot)}
          onOpenItem={(item, options) => void itemDetail.openItemDetail(item, options)}
        />
      ) : null}
      {activePage === "loadouts" ? (
        <LoadoutsPage
          accountSummary={accountSummary}
          templates={loadoutLibrary.templates}
          selectedTemplateId={loadoutLibrary.selectedTemplateId}
          compareTemplateId={loadoutLibrary.compareTemplateId}
          renameDraft={loadoutLibrary.renameDraft}
          showDiffOnly={loadoutLibrary.showDiffOnly}
          message={loadoutMessage}
          isRunningItemAction={isRunningItemAction}
          actionFeedback={loadoutActionFeedback.actionFeedback}
          onSelectTemplate={loadoutLibrary.selectTemplate}
          onSelectCompareTemplate={loadoutLibrary.setCompareTemplateId}
          onRenameDraftChange={loadoutLibrary.setRenameDraft}
          onShowDiffOnlyChange={loadoutLibrary.setShowDiffOnly}
          onRenameTemplate={(template) => void loadoutWriteActions.renameLoadoutTemplate(template)}
          onDeleteTemplate={(id) => void loadoutWriteActions.deleteLoadoutTemplate(id)}
          onCreateTransferPlan={(template) => void loadoutTemplateActions.createTemplateTransferPlan(template)}
          onCopyMissingItems={(template, analysis) => void loadoutTemplateActions.copyMissingLoadoutItems(template, analysis)}
          onExecuteMissingTransfer={(template, analysis) => void loadoutWriteActions.executeMissingLoadoutTransfer(template, analysis)}
          onExecuteSingleItemTransfer={(template, item) => void loadoutWriteActions.executeSingleLoadoutItemTransfer(template, item)}
          onEquipSingleItem={(template, item) => void loadoutWriteActions.equipSingleLoadoutItem(template, item)}
          onOpenTemplateSourceItem={(item, characterId) => void loadoutWriteActions.openTemplateSourceItem(item, characterId)}
        />
      ) : null}
      {activePage === "library" ? (
        <LibraryPage
          libraryViewMode={library.libraryViewMode}
          items={library.items}
          perks={library.perks}
          equipmentFilters={library.equipmentFilters}
          perkFilters={library.perkFilters}
          equipmentSearchTouched={library.equipmentSearchTouched}
          perkSearchTouched={library.perkSearchTouched}
          isSearching={library.isSearching}
          searchError={library.searchError}
          aliasDraft={library.aliasDraft}
          aliasTargetDraft={library.aliasTargetDraft}
          aliasKind={library.aliasKind}
          aliasMessage={library.aliasMessage}
          libraryHistory={library.libraryHistory}
          libraryCommunityMatch={library.libraryCommunityMatch}
          itemDetailLoadingKey={itemDetail.itemDetailLoadingKey}
          onViewModeChange={library.setLibraryViewMode}
          onEquipmentFiltersChange={(patch) => library.setEquipmentFilters((current) => ({ ...current, ...patch }))}
          onPerkFiltersChange={(patch) => library.setPerkFilters((current) => ({ ...current, ...patch }))}
          onSearch={() => void library.searchItems()}
          onClearFilters={library.clearLibraryFilters}
          onAliasDraftChange={library.setAliasDraft}
          onAliasTargetDraftChange={library.setAliasTargetDraft}
          onAliasKindChange={library.setAliasKind}
          onSaveAlias={() => void library.saveAlias()}
          onOpenItemDetail={(item) => void itemDetail.openItemDetail(item)}
          onAddFavorite={(item) => void library.addSelectedItemToFavorites(item)}
          onRemoveFavorite={(hash) => void library.removeFavorite(hash)}
        />
      ) : null}
      {activePage === "vault" ? (
        <VaultPage
          account={accountSummary}
          isLoadingAccount={isLoadingAccount}
          accountError={accountError}
          activeLoadoutLookup={activeLoadoutLookup}
          activeLoadoutName={activeLoadoutTemplate?.name}
          selectedCharacterId={selectedCharacterId}
          writeActionsEnabled={diagnostics.writeActionsEnabled}
          tags={vaultTags}
          openingItemKey={itemDetail.itemDetailLoadingKey}
          wishlist={importedWishlist}
          communityMatch={vaultCommunityMatch}
          onWishlistChanged={setImportedWishlist}
          onLoadAccount={() => void loadAccountSummary()}
          onSaveTagBatch={(inputs) => vaultWriteActions.saveVaultTagsBatch(inputs)}
          onBatchUnlock={vaultWriteActions.handleVaultCleanupUnlock}
          onBatchTransferToCharacter={vaultWriteActions.handleVaultCleanupTransfer}
          onOpenItem={(item) => void itemDetail.openItemDetail(item, { is_vault_item: true })}
          onSaveTag={(item, tag) => vaultWriteActions.saveVaultTag(item, tag)}
        />
      ) : null}
      {activePage === "ai" ? (
        <AiPage
          isConfigured={isAiConfigured}
          account={accountSummary}
          daily={daily.dailySummary}
          activity={activitySummary}
          tags={vaultTags}
          isLoadingAccount={isLoadingAccount}
          onLoadAccount={() => void loadAccountSummary()}
          onConfigureAi={() => setActivePage("settings")}
        />
      ) : null}
      {activePage === "settings" ? (
        <SettingsPage
          message={diagnostics.settingsMessage}
          error={diagnostics.settingsError}
          diagnosticDataDir={diagnostics.diagnosticDataDir}
          writeActionsEnabled={diagnostics.writeActionsEnabled}
          actionLog={diagnostics.actionLog}
          actionLogResultFilter={diagnostics.actionLogResultFilter}
          actionLogTypeFilter={diagnostics.actionLogTypeFilter}
          onAiSettingsSaved={diagnostics.handleAiSettingsSaved}
          onOpenConfig={props.onConfigure}
          onWriteActionsEnabledChange={(enabled) => void diagnostics.saveWriteActionsEnabled(enabled)}
          onCopyDiagnosticsExport={() => void diagnostics.copyDiagnosticsExport()}
          onRefreshActionLog={() => void diagnostics.loadActionLog()}
          onActionLogResultFilterChange={diagnostics.setActionLogResultFilter}
          onActionLogTypeFilterChange={diagnostics.setActionLogTypeFilter}
          onCopyActionDiagnostic={(entry) => void diagnostics.copyActionDiagnostic(entry)}
        />
      ) : null}
      </Suspense>

      {itemDetail.selectedItem ? (
        <ItemDetailModal
          accountSummary={accountSummary}
          aiSettingsEnableLightgg={diagnostics.aiSettings.enable_lightgg}
          communityRecommendations={itemDetail.communityRecommendations}
          importedWishlist={importedWishlist}
          isCommunityRecommendationsLoading={itemDetail.isCommunityRecommendationsLoading}
          isGeneratingItemAi={itemDetail.isGeneratingItemAi}
          isRunningItemAction={isRunningItemAction}
          itemAiError={itemDetail.itemAiError}
          itemAiResult={itemDetail.itemAiResult}
          itemNoteDraft={itemDetail.itemNoteDraft}
          itemNoteMessage={itemDetail.itemNoteMessage}
          itemShareMessage={itemDetail.itemShareMessage}
          sameNameItems={itemDetail.selectedSameNameItems}
          selectedActionCharacterId={itemDetail.selectedActionCharacterId}
          selectedItem={itemDetail.selectedItem}
          vaultTags={vaultTags}
          onApplySameNameBatchTags={(items, mode) => void itemDetail.applySameNameBatchTags(items, mode)}
          onApplySameNameCurrentKeepTags={(items, currentItemKey, mode) => void itemDetail.applySameNameCurrentKeepTags(items, currentItemKey, mode)}
          onClose={itemDetail.closeSelectedItemDetail}
          onCopyItemActionPlanText={(input) => void itemDetail.copyItemActionPlanText(input)}
          onCopySameNameLocator={(items) => void itemDetail.copySameNameLocator(items)}
          onCopySelectedItemChatGuide={() => void itemDetail.copySelectedItemChatGuide()}
          onCopySelectedItemSummary={() => void itemDetail.copySelectedItemSummary()}
          onCopyWishlistInsight={() => void itemDetail.copyWishlistInsight()}
          onGenerateItemAiAdvice={() => void itemDetail.generateItemAiAdvice()}
          onOpenBestSameNameItem={(items) => itemDetail.openBestSameNameItem(items)}
          onOpenItemDetail={(item, source) => void itemDetail.openItemDetail(item, source)}
          onRunItemWriteAction={(label, action) => void itemDetail.runItemWriteAction(label, action)}
          onSaveSelectedItemNote={() => void itemDetail.saveSelectedItemNote()}
          onSaveSelectedItemTag={(tag) => void itemDetail.saveSelectedItemTag(tag)}
          onSelectedActionCharacterIdChange={itemDetail.setSelectedActionCharacterId}
          onSetItemNoteDraft={itemDetail.setItemNoteDraft}
        />
      ) : null}
    </ShellLayout>
  );

}

function pageTitle(page: ShellPageKey) {
  const titles: Record<ShellPageKey, string> = {
    home: "首页",
    account: "账号",
    vault: "仓库",
    loadouts: "配装",
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
    loadouts: "管理本地方案、补齐缺失装备并对比不同配装。",
    library: "搜索本地 Manifest 物品定义和 perk。",
    ai: "基于当前账号与仓库数据生成 AI 建议，并支持直接对话提问。",
    settings: "管理 Bungie 配置和本地数据目录。"
  };
  return subtitles[page];
}
