import { createRoot } from "react-dom/client";
import { useMemo, useState } from "react";
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
  type ShellPageKey,
} from "@d2-tools/ui";
import {
  homePageMetaMap,
} from "@d2-tools/app";
import "@d2-tools/ui/styles.css";
import {
  defaultPrototypeScenarioKey,
  prototypeScenarios,
  type PrototypeScenarioKey
} from "./mock/scenarios";
import { usePrototypeFixtureRuntime } from "./fixtures/usePrototypeFixtureRuntime";
import "./styles.css";

function PrototypeApp() {
  const fixture = usePrototypeFixtureRuntime();
  const env = import.meta.env as Record<string, string | undefined>;
  const initialPage = isShellPageKey(env.VITE_D2_VISUAL_PAGE) ? env.VITE_D2_VISUAL_PAGE : "home";
  const initialTheme = env.VITE_D2_VISUAL_THEME === "dark" ? "dark" : "light";
  const initialScenario = isPrototypeScenarioKey(env.VITE_D2_VISUAL_SCENARIO)
    ? env.VITE_D2_VISUAL_SCENARIO
    : defaultPrototypeScenarioKey;
  const initialSettingsSection = isSettingsSectionKey(env.VITE_D2_VISUAL_SETTINGS_SECTION)
    ? env.VITE_D2_VISUAL_SETTINGS_SECTION
    : "overview";
  const [activePage, setActivePage] = useState<ShellPageKey>(initialPage);
  const [assistantMode, setAssistantMode] = useState<ShellAssistantMode>(null);
  const [scenarioKey, setScenarioKey] = useState<PrototypeScenarioKey>(initialScenario);
  const [selectedTemplateId, setSelectedTemplateId] = useState(fixture.loadoutTemplates[0]?.id ?? "");
  const [selectedLoadoutEntryId, setSelectedLoadoutEntryId] = useState("");
  const [compareTemplateId, setCompareTemplateId] = useState(fixture.loadoutTemplates[1]?.id ?? "");
  const [selectedAccountCharacterId, setSelectedAccountCharacterId] = useState(fixture.accountSummary.characters[0]?.character_id ?? "");
  const [renameDraft, setRenameDraft] = useState(fixture.loadoutTemplates[0]?.name ?? "");
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [libraryViewMode, setLibraryViewMode] = useState<LibraryViewMode>("equipment");
  const [equipmentFilters, setEquipmentFilters] = useState<LibraryEquipmentFilter>(fixture.equipmentFilters);
  const [perkFilters, setPerkFilters] = useState<LibraryPerkFilter>(fixture.perkFilters);
  const [aliasDraft, setAliasDraft] = useState("ff");
  const [aliasTargetDraft, setAliasTargetDraft] = useState("喂食狂热");
  const [aliasKind, setAliasKind] = useState<"item" | "perk">("perk");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [isPrototypeDebugOpen, setIsPrototypeDebugOpen] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState(() => fixture.assistantInitialMessages);
  const [isAssistantSessionDrawerOpen, setIsAssistantSessionDrawerOpen] = useState(false);
  const [isAssistantContextDrawerOpen, setIsAssistantContextDrawerOpen] = useState(false);
  const scenario = prototypeScenarios[scenarioKey];
  const backgroundTasks = fixture.getBackgroundTasks(scenarioKey);
  const accountViewModel = useMemo(
    () => fixture.createAccountPageModel({
      scenario,
      selectedCharacterId: selectedAccountCharacterId,
      selectedTemplateId
    }),
    [fixture, scenario, selectedAccountCharacterId, selectedTemplateId]
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
      scenario,
      selectedTemplateId,
      selectedEntryId: selectedLoadoutEntryId,
      compareTemplateId,
      showDiffOnly
    }),
    [fixture, scenario, compareTemplateId, selectedLoadoutEntryId, selectedTemplateId, showDiffOnly]
  );
  const platformActions = useMemo(() => ({
    openExternal: (url: string) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    setColorMode: (mode: "light" | "dark") => {
      document.documentElement.dataset.colorMode = mode;
    }
  }), []);
  const assistantContext = useMemo(
    () => fixture.createAssistantContext(activePage, scenario.label, scenario.shellStatus),
    [fixture, activePage, scenario.label, scenario.shellStatus]
  );
  const assistantContextChip = fixture.createAssistantContextChip(assistantContext);

  function appendPrototypeAssistantReply(prompt: string) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setAssistantMessages((current) => [
      ...current,
      { role: "user", text: trimmedPrompt },
      {
        role: "assistant",
        text: fixture.createAssistantReply(trimmedPrompt, activePage)
      }
    ]);
    setAssistantQuestion("");
  }

  return (
    <>
      <ProductShellHost
        activePage={activePage}
        onPageChange={setActivePage}
        assistantMode={assistantMode}
        onAssistantModeChange={setAssistantMode}
        initialPreferences={{
          ...defaultProductPreferences,
          colorMode: initialTheme
        }}
        shellStatus={scenario.shellStatus}
        backgroundTasks={backgroundTasks}
        onOpenBackgroundTasks={() => setActivePage("settings")}
        pageHeader={getPrototypePageHeader}
        assistantPanel={(
          <AiAssistantPanelView
            isConfigured={scenarioKey !== "ai-unconfigured"}
            sessionTitle="Prototype mock 会话"
            messages={assistantMessages}
            question={assistantQuestion}
            isSending={false}
            isLoadingAccount={false}
            hasAccountItems={scenario.hasAccountData}
            history={[]}
            activeSessionId={null}
            isSessionDrawerOpen={isAssistantSessionDrawerOpen}
            isContextDrawerOpen={isAssistantContextDrawerOpen}
            contextChip={assistantContextChip}
            context={assistantContext}
            quickPrompts={fixture.assistantQuickPrompts}
            onQuestionChange={setAssistantQuestion}
            onSubmit={() => appendPrototypeAssistantReply(assistantQuestion)}
            onQuickPrompt={appendPrototypeAssistantReply}
            onLoadAccount={() => undefined}
            onConfigureAi={() => {
              setActivePage("settings");
            }}
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
              {...fixture.createHomePageModel(scenario)}
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
                onBatchUnlock: async () => "Prototype：写操作未开启。",
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
              message="Prototype：已接入共享配装页 View，写操作为 mock。"
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
                initialSection: initialSettingsSection,
                scenario,
                backgroundTasks,
                bungieLocale: preferences.bungieLocale,
                followInterfaceLocaleForBungie: preferences.followInterfaceLocaleForBungie
              })}
              aiSettingsPanel={<PrototypeAiSettingsPanel />}
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
          <div className="prototype-debug">
            {isPrototypeDebugOpen ? (
              <section className="prototype-debug-panel" aria-label="Prototype scenario controls">
                <div className="prototype-debug-heading">
                  <strong>Prototype</strong>
                  <button type="button" onClick={() => setIsPrototypeDebugOpen(false)} aria-label="收起 Prototype 调试">
                    ×
                  </button>
                </div>
                <label>
                  <span>场景</span>
                  <select value={scenarioKey} onChange={(event) => setScenarioKey(event.target.value as PrototypeScenarioKey)}>
                    {Object.values(prototypeScenarios).map((item) => (
                      <option key={item.key} value={item.key}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <small>{scenario.description}</small>
              </section>
            ) : null}
            <button
              type="button"
              className="prototype-debug-toggle"
              aria-expanded={isPrototypeDebugOpen}
              onClick={() => setIsPrototypeDebugOpen((current) => !current)}
            >
              Prototype
            </button>
          </div>
          </>
        )}
      />
    </>
  );
}

createRoot(document.getElementById("root")!).render(<PrototypeApp />);

function isShellPageKey(value: string | undefined): value is ShellPageKey {
  return value === "home"
    || value === "account"
    || value === "vault"
    || value === "loadouts"
    || value === "library"
    || value === "vendors"
    || value === "settings";
}

function isPrototypeScenarioKey(value: string | undefined): value is PrototypeScenarioKey {
  return value === "ready"
    || value === "account-missing"
    || value === "manifest-stale"
    || value === "background-running"
    || value === "update-available"
    || value === "ai-unconfigured"
    || value === "account-error"
    || value === "manifest-missing-components";
}

function isSettingsSectionKey(value: string | undefined): value is "overview" | "language" | "account" | "library" | "bungie" | "ai" | "backup" | "diagnostics" {
  return value === "overview"
    || value === "language"
    || value === "account"
    || value === "library"
    || value === "bungie"
    || value === "ai"
    || value === "backup"
    || value === "diagnostics";
}

function PrototypeAiSettingsPanel() {
  return (
    <div className="app-setting-group">
      <div className="app-setting-row">
        <div>
          <strong>AI Provider</strong>
          <span>Prototype mock：用于验证共享设置页的 AI 配置块。</span>
        </div>
        <select defaultValue="openai">
          <option value="openai">OpenAI Compatible</option>
          <option value="none">未配置</option>
        </select>
      </div>
      <div className="app-setting-row">
        <div>
          <strong>模型</strong>
          <span>后续由真实设置页保存到本地配置。</span>
        </div>
        <input defaultValue="gpt-4.1-mini" />
      </div>
    </div>
  );
}

function getPrototypePageHeader(page: ShellPageKey) {
  const meta = homePageMetaMap[page];

  return {
    title: meta.title,
    subtitle: meta.subtitle,
    actions: page === "home" ? (
      <button type="button" className="secondary-button">刷新本周信息</button>
    ) : null
  };
}
