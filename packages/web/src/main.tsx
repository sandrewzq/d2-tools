import { createRoot } from "react-dom/client";
import { useEffect, useMemo, useState } from "react";
import {
  AccountPageContentView,
  AiAssistantPanelView,
  defaultProductPreferences,
  HomePageContentView,
  LibraryPageContentView,
  LoadoutsPageContentView,
  ProductShellHost,
  SettingsPageContentView,
  VaultPageContentView,
  VendorsPageContentView,
  type LibraryEquipmentFilter,
  type LibraryPerkFilter,
  type LibraryViewMode,
  type ShellAssistantMode,
  type ShellPageKey
} from "@d2-tools/ui";
import {
  homePageMetaMap,
} from "@d2-tools/app";
import "@d2-tools/ui/styles.css";
import {
  createWebShellAdapter,
  fallbackHomeSnapshot,
  type WebHomeSnapshot
} from "./webAdapter";
import { useWebFixtureRuntime } from "./fixtures/useWebFixtureRuntime";

function WebApp() {
  const fixture = useWebFixtureRuntime();
  const env = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env) ?? {};
  const initialTheme = env.VITE_D2_VISUAL_THEME === "dark" ? "dark" : "light";
  const adapter = useMemo(() => createWebShellAdapter(), []);
  const [snapshot, setSnapshot] = useState<WebHomeSnapshot>(fallbackHomeSnapshot);
  const [assistantMode, setAssistantMode] = useState<ShellAssistantMode>(null);
  const [activePage, setActivePage] = useState<ShellPageKey>("home");
  const [selectedAccountCharacterId, setSelectedAccountCharacterId] = useState(fixture.accountSummary.characters[0]?.character_id ?? "");
  const [selectedTemplateId, setSelectedTemplateId] = useState(fixture.loadoutTemplates[0]?.id ?? "");
  const [selectedLoadoutEntryId, setSelectedLoadoutEntryId] = useState("");
  const [compareTemplateId, setCompareTemplateId] = useState(fixture.loadoutTemplates[1]?.id ?? "");
  const [renameDraft, setRenameDraft] = useState(fixture.loadoutTemplates[0]?.name ?? "");
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [libraryViewMode, setLibraryViewMode] = useState<LibraryViewMode>("equipment");
  const [equipmentFilters, setEquipmentFilters] = useState<LibraryEquipmentFilter>(fixture.equipmentFilters);
  const [perkFilters, setPerkFilters] = useState<LibraryPerkFilter>(fixture.perkFilters);
  const [aliasDraft, setAliasDraft] = useState("ff");
  const [aliasTargetDraft, setAliasTargetDraft] = useState("喂食狂热");
  const [aliasKind, setAliasKind] = useState<"item" | "perk">("perk");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantMessages, setAssistantMessages] = useState(() => fixture.assistantInitialMessages);
  const [isAssistantSessionDrawerOpen, setIsAssistantSessionDrawerOpen] = useState(false);
  const [isAssistantContextDrawerOpen, setIsAssistantContextDrawerOpen] = useState(false);
  const platformActions = useMemo(() => ({
    openExternal: adapter.openExternal
  }), [adapter]);
  const hasAccountData = snapshot.shellStatus.some((item) => item.key === "account" && item.tone === "ready");
  const accountViewModel = useMemo(
    () => fixture.createAccountPageModel({
      selectedCharacterId: selectedAccountCharacterId,
      selectedTemplateId
    }),
    [fixture, selectedAccountCharacterId, selectedTemplateId]
  );
  const vaultModel = useMemo(
    () => fixture.createVaultPageModel({
      selectedCharacterId: selectedAccountCharacterId,
      selectedTemplateId
    }),
    [fixture, selectedAccountCharacterId, selectedTemplateId]
  );
  const loadoutsModel = useMemo(
    () => fixture.createLoadoutsPageModel({
      selectedTemplateId,
      selectedEntryId: selectedLoadoutEntryId,
      compareTemplateId,
      showDiffOnly
    }),
    [fixture, compareTemplateId, selectedLoadoutEntryId, selectedTemplateId, showDiffOnly]
  );
  const assistantContext = useMemo(
    () => fixture.createAssistantContext(snapshot),
    [fixture, snapshot]
  );
  const assistantContextChip = fixture.createAssistantContextChip(assistantContext);

  function appendAssistantReply(prompt: string) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setAssistantMessages((current) => [
      ...current,
      { role: "user", text: trimmedPrompt },
      {
        role: "assistant",
        text: fixture.createAssistantReply()
      }
    ]);
    setAssistantQuestion("");
  }

  useEffect(() => {
    let isMounted = true;
    void adapter.loadHomeSnapshot().then((nextSnapshot) => {
      if (isMounted) {
        setSnapshot(nextSnapshot);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [adapter]);

  return (
    <ProductShellHost
      activePage={activePage}
      onPageChange={setActivePage}
      initialPreferences={{
        ...defaultProductPreferences,
        colorMode: initialTheme
      }}
      assistantMode={assistantMode}
      onAssistantModeChange={setAssistantMode}
      shellStatus={snapshot.shellStatus}
      backgroundTasks={fixture.backgroundTasks}
      onOpenBackgroundTasks={() => setActivePage("settings")}
      pageHeader={getWebPageHeader}
      assistantPanel={(
        <AiAssistantPanelView
          isConfigured
          sessionTitle="Web mock 会话"
          messages={assistantMessages}
          question={assistantQuestion}
          isSending={false}
          isLoadingAccount={false}
          hasAccountItems={hasAccountData}
          history={[]}
          activeSessionId={null}
          isSessionDrawerOpen={isAssistantSessionDrawerOpen}
          isContextDrawerOpen={isAssistantContextDrawerOpen}
          contextChip={assistantContextChip}
          context={assistantContext}
          quickPrompts={fixture.assistantQuickPrompts}
          onQuestionChange={setAssistantQuestion}
          onSubmit={() => appendAssistantReply(assistantQuestion)}
          onQuickPrompt={appendAssistantReply}
          onLoadAccount={() => undefined}
          onConfigureAi={() => undefined}
          onClose={() => setAssistantMode(null)}
          onStartNewSession={() => {
            setAssistantMessages([]);
            setAssistantQuestion("");
            setIsAssistantSessionDrawerOpen(false);
            setIsAssistantContextDrawerOpen(false);
          }}
          onToggleSessionDrawer={() => {
            setIsAssistantSessionDrawerOpen((current) => !current);
            setIsAssistantContextDrawerOpen(false);
          }}
          onToggleContextDrawer={() => {
            setIsAssistantContextDrawerOpen((current) => !current);
            setIsAssistantSessionDrawerOpen(false);
          }}
          onOpenContextDrawer={() => setIsAssistantContextDrawerOpen(true)}
          onCloseContextDrawer={() => setIsAssistantContextDrawerOpen(false)}
          onClearHistory={() => undefined}
          onSwitchSession={() => undefined}
          onDeleteSession={() => undefined}
        />
      )}
      platformActions={platformActions}
      renderPage={(activePage, preferences) => (
        <>
          {activePage === "home" ? (
            <HomePageContentView
              interfaceLocale={preferences.interfaceLocale}
              {...fixture.createHomePageModel(snapshot)}
              onRefreshDiagnostics={() => undefined}
            />
          ) : null}
          {activePage === "account" ? (
            <AccountPageContentView
              interfaceLocale={preferences.interfaceLocale}
              viewModel={accountViewModel}
              actions={{
                configureBungie: () => setActivePage("settings"),
                loginBungie: () => undefined,
                refreshAccount: () => undefined,
                refreshActivity: () => undefined,
                selectCharacter: setSelectedAccountCharacterId,
                saveCurrentLoadout: () => undefined,
                equipHighestPower: () => undefined,
                openItem: () => undefined
              }}
            />
          ) : null}
          {activePage === "vault" ? (
            <VaultPageContentView
              items={vaultModel.vaultItems}
              vaultItemCount={vaultModel.vaultItemCount}
              highlightedItemKeys={vaultModel.activeLoadoutLookup}
              highlightedLabel={vaultModel.activeLoadoutName}
              tags={vaultModel.tags}
              openingItemKey=""
              wishlist={vaultModel.wishlist}
              localTargetRules={vaultModel.targetRules}
              communityMatch={vaultModel.communityMatch}
              cleanupActions={{
                characters: fixture.accountSummary.characters,
                currentCharacterId: vaultModel.currentCharacterId,
                currentCharacterLabel: vaultModel.currentCharacterLabel,
                writeActionsEnabled: false,
                onBatchUnlock: async () => "Web mock：写操作未开启。",
                onBatchTransferToCharacter: async () => fixture.batchResult
              }}
              onContextFactsChange={() => undefined}
              onOpenItem={() => undefined}
              onSaveTag={() => undefined}
              onSaveTagBatch={() => undefined}
            />
          ) : null}
          {activePage === "loadouts" ? (
            <LoadoutsPageContentView
              interfaceLocale={preferences.interfaceLocale}
              model={loadoutsModel}
              actions={{
                selectEntry: setSelectedLoadoutEntryId,
                selectTemplate: (id) => {
                  setSelectedLoadoutEntryId(`local-template-${id}`);
                  setSelectedTemplateId(id);
                  const template = fixture.findLoadoutTemplate(id);
                  if (template) setRenameDraft(template.name);
                },
                selectCompareTemplate: setCompareTemplateId,
                renameDraftChange: setRenameDraft,
                showDiffOnlyChange: setShowDiffOnly,
                renameTemplate: () => undefined,
                deleteTemplate: () => undefined,
                createTransferPlan: () => undefined,
                copyMissingItems: () => undefined,
                executeMissingTransfer: () => undefined,
                executeSingleItemTransfer: () => undefined,
                equipSingleItem: () => undefined,
                equipSavedLoadout: () => undefined,
                snapshotCurrentLoadout: () => undefined,
                openTemplateSourceItem: () => undefined
              }}
              compareTemplateId={compareTemplateId}
              renameDraft={renameDraft}
              showDiffOnly={showDiffOnly}
              message="Web mock：共享配装页已接入，真实 provider 后续替换数据源。"
              isRunningItemAction={false}
              actionFeedback={{}}
            />
          ) : null}
          {activePage === "library" ? (
            <LibraryPageContentView
              interfaceLocale={preferences.interfaceLocale}
              model={fixture.createLibraryPageModel({
                libraryViewMode,
                equipmentFilters,
                perkFilters,
                aliasDraft,
                aliasTargetDraft,
                aliasKind
              })}
              actions={{
                onViewModeChange: setLibraryViewMode,
                onEquipmentFiltersChange: (patch) => setEquipmentFilters((current) => ({ ...current, ...patch })),
                onPerkFiltersChange: (patch) => setPerkFilters((current) => ({ ...current, ...patch })),
                onSearch: () => undefined,
                onClearFilters: () => {
                  setEquipmentFilters(fixture.equipmentFilters);
                  setPerkFilters(fixture.perkFilters);
                },
                onRefreshManifestStatus: () => undefined,
                onRepairManifest: () => undefined,
                onAliasDraftChange: setAliasDraft,
                onAliasTargetDraftChange: setAliasTargetDraft,
                onAliasKindChange: setAliasKind,
                onSaveAlias: () => undefined,
                onOpenItemDetail: () => undefined,
                onAddFavorite: () => undefined,
                onRemoveFavorite: () => undefined
              }}
            />
          ) : null}
          {activePage === "vendors" ? (
            <VendorsPageContentView
              interfaceLocale={preferences.interfaceLocale}
              model={fixture.vendorsModel}
              actions={{}}
            />
          ) : null}
          {activePage === "settings" ? (
            <SettingsPageContentView
              {...fixture.createSettingsPageModel({
                interfaceLocale: preferences.interfaceLocale,
                initialSection: "overview",
                bungieLocale: preferences.bungieLocale,
                followInterfaceLocaleForBungie: preferences.followInterfaceLocaleForBungie
              })}
              aiSettingsPanel={<WebAiSettingsPanel />}
              onRefreshAccount={() => undefined}
              onReauthorizeAccount={() => undefined}
              onOpenDataDir={() => undefined}
              onWriteActionsEnabledChange={() => undefined}
              onCheckForUpdates={() => undefined}
              onDownloadUpdate={() => undefined}
              onQuitAndInstallUpdate={() => undefined}
              onOpenUpdateDownloadPage={() => undefined}
              onCopyUpdateDiagnostic={() => undefined}
              onRefreshManifestStatus={() => undefined}
              onInitializeManifest={() => undefined}
              onRepairManifest={() => undefined}
              onExportConfig={() => undefined}
              onImportConfig={() => undefined}
              onClearCache={() => undefined}
              onCopyDataBackupGuide={() => undefined}
              onCopyDiagnosticsExport={() => undefined}
              onRefreshDiagnostics={() => undefined}
              onRefreshActionLog={() => undefined}
              onActionLogResultFilterChange={() => undefined}
              onActionLogTypeFilterChange={() => undefined}
              onCopyActionDiagnostic={() => undefined}
              onLanguagePreferencesChange={() => undefined}
              onLoadBungieConfig={async () => fixture.bungieConfig}
              onSaveBungieConfig={async () => undefined}
            />
          ) : null}
        </>
      )}
    />
  );
}

createRoot(document.getElementById("root")!).render(<WebApp />);

function getWebPageHeader(page: ShellPageKey) {
  const meta = homePageMetaMap[page];

  return {
    title: meta.title,
    subtitle: meta.subtitle,
    actions: page === "home" ? (
      <button type="button" className="secondary-button">刷新今日信息</button>
    ) : null
  };
}

function WebAiSettingsPanel() {
  return (
    <div className="app-setting-group">
      <div className="app-setting-row">
        <div>
          <strong>AI Provider</strong>
          <span>Web mock：真实配置由 Web provider 接入。</span>
        </div>
        <select defaultValue="openai">
          <option value="openai">OpenAI Compatible</option>
        </select>
      </div>
    </div>
  );
}
