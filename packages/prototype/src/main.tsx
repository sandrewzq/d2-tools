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
  type AiAssistantContextView,
  type AiAssistantMessageView,
  type ShellAssistantMode,
  type ShellPageKey,
  type ShellStatusItem,
} from "@d2-tools/ui";
import {
  buildLoadoutTemplateLookup,
  selectLoadoutsPageModel,
  selectVaultPageModel,
  selectVendorsPageModel,
  homePageMetaMap,
  matchesLoadoutTemplateItem,
  selectAccountPageModel,
  selectLibraryPageModel
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
  const [assistantMessages, setAssistantMessages] = useState<AiAssistantMessageView[]>(() => [
    {
      role: "assistant",
      text: "我已经读取当前页面上下文，可以按今日重点、仓库清理、配装缺口或资料库来源给出 mock 建议。"
    }
  ]);
  const [isAssistantSessionDrawerOpen, setIsAssistantSessionDrawerOpen] = useState(false);
  const [isAssistantContextDrawerOpen, setIsAssistantContextDrawerOpen] = useState(false);
  const scenario = prototypeScenarios[scenarioKey];
  const selectedTemplate = fixture.loadoutTemplates.find((template) => template.id === selectedTemplateId)
    ?? fixture.loadoutTemplates[0]
    ?? null;
  const compareTemplate = fixture.loadoutTemplates.find((template) => template.id === compareTemplateId)
    ?? null;
  const activeLoadoutLookup = selectedTemplate ? buildLoadoutTemplateLookup(selectedTemplate) : null;
  const accountSummary = scenario.hasAccountData ? fixture.accountSummary : null;
  const backgroundTasks = fixture.getBackgroundTasks(scenarioKey);
  const isBungieConfigured = scenarioKey !== "account-missing";
  const accountViewModel = useMemo(
    () => selectAccountPageModel({
      cache: {
        accountSummary,
        activitySummary: fixture.activitySummary
      },
      pageState: {
        selectedCharacterId: selectedAccountCharacterId,
        openingItemKey: "",
        isLoadoutMatch: (item) => matchesLoadoutTemplateItem(item, activeLoadoutLookup),
        isBungieConfigured,
        isAccountLoggedIn: scenario.hasAccountData,
        isLoadingAccount: false,
        writeActionsEnabled: false,
        accountStatusLabel: fixture.startupStateForScenario(scenario).cards.account.label,
        accountError: scenario.accountError,
        itemDetailError: "",
        activityMessage: "",
        activityError: "",
        loadoutMessage: "",
        itemActionMessage: "",
        isRunningItemAction: false,
        activeLoadoutTemplateName: selectedTemplate?.name
      }
    }),
    [accountSummary, activeLoadoutLookup, isBungieConfigured, scenario, selectedAccountCharacterId, selectedTemplate?.name]
  );
  const vaultModel = useMemo(
    () => selectVaultPageModel({
      account: fixture.accountSummary,
      selectedCharacterId: selectedAccountCharacterId,
      activeLoadoutLookup,
      activeLoadoutName: selectedTemplate?.name,
      tags: fixture.vaultTags,
      targetRules: fixture.localTargetRules,
      wishlist: fixture.wishlist,
      communityMatch: fixture.vaultCommunityMatch
    }),
    [activeLoadoutLookup, selectedAccountCharacterId, selectedTemplate?.name]
  );
  const loadoutsModel = useMemo(
    () => selectLoadoutsPageModel({
      accountSummary,
      templates: fixture.loadoutTemplates,
      selectedTemplateId,
      selectedEntryId: selectedLoadoutEntryId,
      compareTemplateId,
      showDiffOnly
    }),
    [accountSummary, compareTemplateId, selectedLoadoutEntryId, selectedTemplateId, showDiffOnly]
  );
  const prototypeVendorsWorkspace = useMemo(() => selectVendorsPageModel(null), []);
  const platformActions = useMemo(() => ({
    openExternal: (url: string) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    setColorMode: (mode: "light" | "dark") => {
      document.documentElement.dataset.colorMode = mode;
    }
  }), []);
  const assistantContext = useMemo(
    () => getPrototypeAssistantContext(activePage, scenario.label, scenario.shellStatus),
    [activePage, scenario.label, scenario.shellStatus]
  );
  const assistantContextChip = [
    `当前页面：${assistantContext.pageLabel}`,
    `仓库 ${assistantContext.itemCount} 件`,
    `角色 ${assistantContext.characterCount} 个`,
    assistantContext.dailyLoaded ? "今日信息已载入" : "今日信息未载入"
  ].join(" · ");

  function appendPrototypeAssistantReply(prompt: string) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setAssistantMessages((current) => [
      ...current,
      { role: "user", text: trimmedPrompt },
      {
        role: "assistant",
        text: getPrototypeAssistantReply(trimmedPrompt, activePage)
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
            quickPrompts={prototypeAssistantPrompts}
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
              state={scenario.homeState}
              diagnosticRows={scenario.diagnosticRows}
              accountError={scenario.accountError}
              hasAccountData={scenario.hasAccountData}
              dailySummary={scenario.homeDailySummary}
              isInitializingManifest={scenario.isInitializingManifest}
              isLoadingDaily={scenario.isLoadingDaily}
              isRefreshingDiagnostics={scenario.isRefreshingDiagnostics}
              onCopyDailySummary={() => undefined}
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
                  const template = fixture.loadoutTemplates.find((item) => item.id === id);
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
              model={selectLibraryPageModel({
                items: fixture.libraryItems,
                perks: fixture.libraryPerks,
                libraryHistory: fixture.libraryHistory,
                libraryCommunityMatch: fixture.libraryCommunityMatch,
                liveAvailability: fixture.liveAvailability,
                liveAvailabilityError: "",
                manifestStatus: fixture.manifestStatus,
                manifestStatusError: ""
              }, {
                libraryViewMode,
                equipmentFilters,
                perkFilters,
                equipmentSearchTouched: true,
                perkSearchTouched: true,
                isSearching: false,
                searchError: "",
                aliasDraft,
                aliasTargetDraft,
                aliasKind,
                aliasMessage: "Prototype：别名保存为 mock 状态。",
                isLoadingLiveAvailability: false,
                isLoadingManifestStatus: false,
                isInitializingManifest: false,
                itemDetailLoadingKey: ""
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
                onInitializeManifest: () => undefined,
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
              model={prototypeVendorsWorkspace}
              actions={{}}
            />
          ) : null}
          {activePage === "settings" ? (
            <SettingsPageContentView
              interfaceLocale={preferences.interfaceLocale}
              initialSection={initialSettingsSection}
              message=""
              error=""
              diagnosticDataDir="D:\\Users\\Prototype\\AppData\\Roaming\\d2-tools"
              writeActionsEnabled
              updateSnapshot={fixture.updateSnapshot}
              manifestStatus={fixture.manifestStatus}
              manifestStatusError=""
              isLoadingManifestStatus={false}
              isInitializingManifest={false}
              accountSummary={fixture.accountSummary}
              accountError={scenario.accountError}
              isLoadingAccount={false}
              lastAccountLoadedAt={new Date("2026-07-03T14:18:00+08:00")}
              isAiConfigured={scenarioKey !== "ai-unconfigured"}
              backgroundTasks={backgroundTasks}
              actionLog={fixture.actionLog}
              actionLogResultFilter="all"
              actionLogTypeFilter="all"
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
              languagePreferences={{
                interfaceLocale: preferences.interfaceLocale,
                bungieLocale: preferences.bungieLocale,
                followInterfaceLocaleForBungie: preferences.followInterfaceLocaleForBungie
              }}
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

const prototypeAssistantPrompts = [
  "今天先刷什么",
  "仓库清理建议",
  "这套配装缺什么",
  "资料库来源怎么确认"
];

function getPrototypePageHeader(page: ShellPageKey) {
  const meta = homePageMetaMap[page];

  return {
    title: meta.title,
    subtitle: meta.subtitle,
    actions: page === "home" ? (
      <button type="button" className="secondary-button">刷新今日信息</button>
    ) : null
  };
}

function getPrototypePageLabel(page: ShellPageKey) {
  const labels: Record<ShellPageKey, string> = {
    home: "首页工作台",
    account: "账号摘要",
    vault: "仓库整理",
    loadouts: "配装方案",
    library: "资料库搜索",
    vendors: "商人库存",
    settings: "设置中心"
  };

  return labels[page];
}

function getPrototypeAssistantContext(
  activePage: ShellPageKey,
  scenarioLabel: string,
  shellStatus: ShellStatusItem[]
): AiAssistantContextView {
  const statusValue = (key: NonNullable<ShellStatusItem["key"]>) => {
    const item = shellStatus.find((status) => status.key === key);
    return item ? `${item.label}：${item.value}` : "未提供";
  };

  return {
    pageLabel: getPrototypePageLabel(activePage),
    focus: getPrototypeAssistantFocus(activePage),
    facts: [
      `状态方案：${scenarioLabel}`,
      statusValue("account"),
      statusValue("library")
    ],
    itemCount: 496,
    characterCount: 2,
    materialCount: 28,
    dailyLoaded: true
  };
}

function getPrototypeAssistantFocus(page: ShellPageKey) {
  const focus: Record<ShellPageKey, string> = {
    home: "先看官方可确认的今日 / 本周内容，再处理账号、资料库和应用版本状态。",
    account: "检查角色、仓库和最近活动是否已读取，后续账号切换也应从这里进入。",
    vault: "从重复同名、目标命中、配装占用和清理候选中找出下一步整理动作。",
    loadouts: "确认配装缺口、转移计划和可直接应用的装备，避免把状态藏在页面底部。",
    library: "核对资料库版本、Perk 池、来源状态和公开商人线索。",
    vendors: "只展示可确认的商人、轮换和掉落线索，未确认内容保留复查状态。",
    settings: "只处理低频配置、重新授权、资料库更新、备份迁移和诊断导出。"
  };

  return focus[page];
}

function getPrototypeAssistantReply(prompt: string, page: ShellPageKey) {
  const bullets = getPrototypeAssistantBullets(page);
  const suffix = bullets.length ? `\n\n下一步：${bullets.join("；")}。` : "";
  if (prompt.includes("仓库")) {
    return `先从重复同名和无目标命中的装备开始，保留 DIM 命中、配装占用和当前商人可替代项需要复查的装备。${suffix}`;
  }
  if (prompt.includes("配装")) {
    return `这套 mock 配装有两件需要处理：一件在仓库待取，一件在当前角色背包，真实实现应拆成补齐和应用两个动作。${suffix}`;
  }
  if (prompt.includes("资料库") || prompt.includes("来源")) {
    return `资料库页应优先展示来源状态、Perk 池命中和公开商人线索；版本过期时只提示更新，不把配置细节常驻在首页。${suffix}`;
  }
  if (page === "home") {
    return `首页建议先看今日 / 本周官方可确认内容，再处理账号、资料库、应用版本这类顶部状态异常。${suffix}`;
  }
  return `我会按当前页面上下文给出下一步：先处理高风险状态，再看能直接行动的按钮，最后检查低频设置。${suffix}`;
}

function getPrototypeAssistantBullets(page: ShellPageKey) {
  if (page === "vault") {
    return ["复查同名重复和清理候选", "保留配装占用与目标命中装备", "清理动作先做确认队列"];
  }
  if (page === "loadouts") {
    return ["先补仓库待取装备", "再应用已在背包的装备", "缺失项复制为检查清单"];
  }
  if (page === "library") {
    return ["优先看来源可确认项", "Perk 搜索支持别名", "版本过期时先更新资料库"];
  }
  if (page === "vendors") {
    return ["先看推荐关注项", "费用和拥有状态只做可确认展示", "未接真实库存时保留 mock 标记"];
  }
  if (page === "settings") {
    return ["账号、资料库、AI 和备份都保留操作按钮", "顶部只展示状态，不堆大卡片", "异常时给出明确修复入口"];
  }
  return ["今日重点放在首页", "账号和资料库状态在顶部可见", "AI 抽屉负责解释原因和下一步"];
}
