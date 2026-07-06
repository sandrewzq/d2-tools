import { createRoot } from "react-dom/client";
import { useMemo, useState } from "react";
import {
  AccountPageContentView,
  AiAssistantPanelView,
  defaultProductPreferences,
  HomePageView,
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
  type ShellBackgroundTaskItem,
  type ShellPageKey,
  type ShellStatusItem,
} from "@d2-tools/ui";
import {
  buildLoadoutTemplateLookup,
  createAccountPageWorkspace,
  createLoadoutsPageWorkspace,
  createVaultPageWorkspace,
  createVendorsPageWorkspace,
  findBestTemplateSourceItem,
  formatAccountItemMeta,
  formatLoadoutComparePerks,
  getAccountPageItemKey,
  getLoadoutItemBlockedDetails,
  getLoadoutItemStatus,
  homePageMetaMap,
  matchesLoadoutTemplateItem
} from "@d2-tools/app";
import "@d2-tools/ui/styles.css";
import {
  defaultPrototypeScenarioKey,
  prototypeScenarios,
  type PrototypeScenario,
  type PrototypeScenarioKey
} from "./mock/scenarios";
import "./styles.css";

function PrototypeApp() {
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
  const [selectedTemplateId, setSelectedTemplateId] = useState(prototypeLoadoutTemplates[0]?.id ?? "");
  const [compareTemplateId, setCompareTemplateId] = useState(prototypeLoadoutTemplates[1]?.id ?? "");
  const [selectedAccountCharacterId, setSelectedAccountCharacterId] = useState(prototypeAccountSummary.characters[0]?.character_id ?? "");
  const [renameDraft, setRenameDraft] = useState(prototypeLoadoutTemplates[0]?.name ?? "");
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [libraryViewMode, setLibraryViewMode] = useState<LibraryViewMode>("equipment");
  const [equipmentFilters, setEquipmentFilters] = useState<LibraryEquipmentFilter>(prototypeEquipmentFilters);
  const [perkFilters, setPerkFilters] = useState<LibraryPerkFilter>(prototypePerkFilters);
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
  const selectedTemplate = prototypeLoadoutTemplates.find((template) => template.id === selectedTemplateId)
    ?? prototypeLoadoutTemplates[0]
    ?? null;
  const compareTemplate = prototypeLoadoutTemplates.find((template) => template.id === compareTemplateId)
    ?? null;
  const activeLoadoutLookup = selectedTemplate ? buildLoadoutTemplateLookup(selectedTemplate) : null;
  const accountSummary = scenario.hasAccountData ? prototypeAccountSummary : null;
  const backgroundTasks = getPrototypeBackgroundTasks(scenarioKey);
  const isBungieConfigured = scenarioKey !== "account-missing";
  const accountWorkspace = useMemo(
    () => createAccountPageWorkspace({
      account: accountSummary,
      selectedCharacterId: selectedAccountCharacterId,
      openingItemKey: "",
      isLoadoutMatch: (item) => matchesLoadoutTemplateItem(item, activeLoadoutLookup)
    }),
    [accountSummary, activeLoadoutLookup, selectedAccountCharacterId]
  );
  const vaultWorkspace = useMemo(
    () => createVaultPageWorkspace({
      account: prototypeAccountSummary,
      selectedCharacterId: selectedAccountCharacterId,
      activeLoadoutLookup,
      activeLoadoutName: selectedTemplate?.name,
      tags: prototypeVaultTags,
      targetRules: prototypeLocalTargetRules,
      wishlist: prototypeWishlist,
      communityMatch: prototypeVaultCommunityMatch
    }),
    [activeLoadoutLookup, selectedAccountCharacterId, selectedTemplate?.name]
  );
  const loadoutsWorkspace = useMemo(
    () => createLoadoutsPageWorkspace({
      accountSummary,
      templates: prototypeLoadoutTemplates,
      selectedTemplateId,
      compareTemplateId,
      showDiffOnly
    }),
    [accountSummary, compareTemplateId, selectedTemplateId, showDiffOnly]
  );
  const prototypeVendorsWorkspace = useMemo(() => createVendorsPageWorkspace(null), []);
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
            <HomePageView
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
              accountSummary={accountSummary}
              startupState={prototypeStartupStateForScenario(scenario)}
              accountWorkspace={accountWorkspace}
              selectedCharacter={accountWorkspace.selectedCharacter}
              selectedCharacterId={selectedAccountCharacterId}
              isBungieConfigured
              isAccountLoggedIn={scenario.hasAccountData}
              canLoadAccount={scenario.hasAccountData}
              isLoadingAccount={false}
              accountError={scenario.accountError}
              showInternalHeading={false}
              itemDetailError=""
              itemDetailLoadingKey=""
              writeActionsEnabled={false}
              activitySummary={prototypeActivitySummary}
              activityMessage=""
              activityError=""
              loadoutMessage=""
              itemActionMessage=""
              isRunningItemAction={false}
              activeLoadoutLookup={activeLoadoutLookup}
              activeLoadoutTemplate={selectedTemplate}
              onConfigureBungie={() => setActivePage("settings")}
              onLoginBungie={() => undefined}
              onLoadAccount={() => undefined}
              onRefreshActivity={() => undefined}
              onSelectCharacter={setSelectedAccountCharacterId}
              onSaveCharacterLoadout={() => undefined}
              onEquipHighestPowerItems={() => undefined}
              onOpenItem={() => undefined}
              isLoadoutMatch={matchesLoadoutTemplateItem}
              getAccountPageItemKey={getAccountPageItemKey}
              formatAccountItemMeta={formatAccountItemMeta}
            />
          ) : null}
          {activePage === "vault" ? (
            <VaultPageContentView
              items={vaultWorkspace.vaultItems}
              vaultItemCount={vaultWorkspace.vaultItemCount}
              highlightedItemKeys={vaultWorkspace.activeLoadoutLookup}
              highlightedLabel={vaultWorkspace.activeLoadoutName}
              tags={vaultWorkspace.tags}
              openingItemKey=""
              showInternalHeading={false}
              wishlist={vaultWorkspace.wishlist}
              localTargetRules={vaultWorkspace.targetRules}
              communityMatch={vaultWorkspace.communityMatch}
              cleanupActions={{
                characters: prototypeAccountSummary.characters,
                currentCharacterId: vaultWorkspace.currentCharacterId,
                currentCharacterLabel: vaultWorkspace.currentCharacterLabel,
                writeActionsEnabled: false,
                onBatchUnlock: async () => "Prototype：写操作未开启。",
                onBatchTransferToCharacter: async () => prototypeBatchResult
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
              accountSummary={accountSummary}
              templates={prototypeLoadoutTemplates}
              loadoutEntries={loadoutsWorkspace.loadoutEntries}
              selectedTemplate={loadoutsWorkspace.selectedTemplate}
              compareTemplate={loadoutsWorkspace.compareTemplate}
              selectedAnalysis={loadoutsWorkspace.selectedAnalysis}
              transferPlan={loadoutsWorkspace.transferPlan}
              statusSummary={loadoutsWorkspace.statusSummary}
              visibleCompareRows={loadoutsWorkspace.visibleCompareRows}
              missingCount={loadoutsWorkspace.missingCount}
              readyCount={loadoutsWorkspace.readyCount}
              actionableCount={loadoutsWorkspace.actionableCount}
              compareTemplateId={compareTemplateId}
              renameDraft={renameDraft}
              showDiffOnly={showDiffOnly}
              message="Prototype：已接入共享配装页 View，写操作为 mock。"
              showInternalHeading={false}
              isRunningItemAction={false}
              actionFeedback={{}}
              getItemStatus={(item, template, analysis, plan, summary) => getLoadoutItemStatus({
                item,
                template,
                selectedAnalysis: analysis,
                transferPlan: plan,
                accountSummary: summary
              })}
              getBlockedDetails={getLoadoutItemBlockedDetails}
              getSourceItem={(item, summary, templateCharacterId) => findBestTemplateSourceItem(item, summary, templateCharacterId)}
              getActionFeedbackKey={(templateId, item, action) => `${templateId}:${item.instance_id ?? item.hash}:${action}`}
              formatComparePerks={formatLoadoutComparePerks}
              onSelectTemplate={(id) => {
                setSelectedTemplateId(id);
                const template = prototypeLoadoutTemplates.find((item) => item.id === id);
                if (template) setRenameDraft(template.name);
              }}
              onSelectCompareTemplate={setCompareTemplateId}
              onRenameDraftChange={setRenameDraft}
              onShowDiffOnlyChange={setShowDiffOnly}
              onRenameTemplate={() => undefined}
              onDeleteTemplate={() => undefined}
              onCreateTransferPlan={() => undefined}
              onCopyMissingItems={() => undefined}
              onExecuteMissingTransfer={() => undefined}
              onExecuteSingleItemTransfer={() => undefined}
              onEquipSingleItem={() => undefined}
              onEquipSavedLoadout={() => undefined}
              onSnapshotCurrentLoadout={() => undefined}
              onOpenTemplateSourceItem={() => undefined}
            />
          ) : null}
          {activePage === "library" ? (
            <LibraryPageContentView
              interfaceLocale={preferences.interfaceLocale}
              libraryViewMode={libraryViewMode}
              items={prototypeLibraryItems}
              perks={prototypeLibraryPerks}
              equipmentFilters={equipmentFilters}
              perkFilters={perkFilters}
              equipmentSearchTouched
              perkSearchTouched
              isSearching={false}
              searchError=""
              aliasDraft={aliasDraft}
              aliasTargetDraft={aliasTargetDraft}
              aliasKind={aliasKind}
              aliasMessage="Prototype：别名保存为 mock 状态。"
              libraryHistory={prototypeLibraryHistory}
              libraryCommunityMatch={prototypeLibraryCommunityMatch}
              liveAvailability={prototypeLiveAvailability}
              liveAvailabilityError=""
              isLoadingLiveAvailability={false}
              manifestStatus={prototypeManifestStatus}
              manifestStatusError=""
              isLoadingManifestStatus={false}
              isInitializingManifest={false}
              itemDetailLoadingKey=""
              showInternalHeading={false}
              onViewModeChange={setLibraryViewMode}
              onEquipmentFiltersChange={(patch) => setEquipmentFilters((current) => ({ ...current, ...patch }))}
              onPerkFiltersChange={(patch) => setPerkFilters((current) => ({ ...current, ...patch }))}
              onSearch={() => undefined}
              onClearFilters={() => {
                setEquipmentFilters(prototypeEquipmentFilters);
                setPerkFilters(prototypePerkFilters);
              }}
              onRefreshManifestStatus={() => undefined}
              onInitializeManifest={() => undefined}
              onAliasDraftChange={setAliasDraft}
              onAliasTargetDraftChange={setAliasTargetDraft}
              onAliasKindChange={setAliasKind}
              onSaveAlias={() => undefined}
              onOpenItemDetail={() => undefined}
              onAddFavorite={() => undefined}
              onRemoveFavorite={() => undefined}
            />
          ) : null}
          {activePage === "vendors" ? (
            <VendorsPageContentView
              interfaceLocale={preferences.interfaceLocale}
              vendors={prototypeVendorsWorkspace.vendors}
              updatedLabel={prototypeVendorsWorkspace.updatedLabel}
              sourceLabel={prototypeVendorsWorkspace.sourceLabel}
              nextResetLabel={prototypeVendorsWorkspace.nextResetLabel}
              recommendationCount={prototypeVendorsWorkspace.recommendationCount}
              showInternalHeading={false}
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
              updateSnapshot={prototypeUpdateSnapshot}
              manifestStatus={prototypeManifestStatus}
              manifestStatusError=""
              isLoadingManifestStatus={false}
              isInitializingManifest={false}
              accountSummary={prototypeAccountSummary}
              accountError={scenario.accountError}
              isLoadingAccount={false}
              lastAccountLoadedAt={new Date("2026-07-03T14:18:00+08:00")}
              isAiConfigured={scenarioKey !== "ai-unconfigured"}
              backgroundTasks={backgroundTasks}
              actionLog={prototypeActionLog}
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
              onLoadBungieConfig={async () => prototypeBungieConfig}
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

const prototypeAccountSummary: any = {
  account_name: "Prototype Guardian",
  destiny_membership_id: "4611686018429000000",
  membership_type: 3,
  characters: [
    {
      character_id: "hunter-1",
      class_name: "猎人",
      emblem_url: prototypeEmblem("猎", "#2f7dd1", "#9bd0ff"),
      light: 2022,
      equipped_items: [
        prototypeAccountItem("pulse-equipped", 1001, "快速命中脉冲", "动能武器", "轻质框架", "已装备"),
        prototypeAccountItem("shotgun-equipped", 1003, "终局霰弹枪", "能量武器", "精确框架", "已装备"),
        prototypeAccountItem("rocket-equipped", 1004, "边缘迁移火箭筒", "威能武器", "自适应框架", "已装备"),
        prototypeAccountItem("hunter-helmet-equipped", 1012, "猎人高纪律头盔", "头盔", "护甲", "已装备"),
        prototypeAccountItem("hunter-arms-equipped", 1013, "猎人恢复臂铠", "臂铠", "护甲", "已装备"),
        prototypeAccountItem("hunter-chest-equipped", 1014, "猎人抗性胸甲", "胸甲", "护甲", "已装备"),
        prototypeAccountItem("hunter-legs-equipped", 1015, "猎人机动腿甲", "腿甲", "护甲", "已装备"),
        prototypeAccountItem("hunter-class-equipped", 1016, "猎人职业物品", "职业物品", "护甲", "已装备")
      ],
      equipment_groups: [],
      inventory_items: [
        prototypeAccountItem("handcannon-inventory", 1002, "精准手炮", "能量武器", "精确框架", "背包"),
        prototypeAccountItem("fusion-inventory", 1005, "适配融合步枪", "能量武器", "适配框架", "背包"),
        prototypeAccountItem("sword-inventory", 1006, "连锁反应刀剑", "威能武器", "旋风框架", "背包"),
        prototypeAccountItem("scout-inventory", 1007, "旧赛季斥候", "动能武器", "适配框架", "背包"),
        prototypeAccountItem("hunter-alt-helmet", 1017, "PVP 机动头盔", "头盔", "护甲", "背包"),
        prototypeAccountItem("hunter-alt-arms", 1018, "手雷臂铠", "臂铠", "护甲", "背包"),
        prototypeAccountItem("hunter-alt-chest", 1019, "虚空胸甲", "胸甲", "护甲", "背包"),
        prototypeAccountItem("hunter-alt-legs", 1020, "跑图腿甲", "腿甲", "护甲", "背包")
      ],
      inventory_groups: [],
      postmaster_items: [
        prototypeAccountItem("postmaster-pulse", 1021, "邮政官脉冲", "动能武器", "高冲击力框架", "邮政官"),
        prototypeAccountItem("postmaster-cloak", 1022, "遗落披风", "职业物品", "护甲", "邮政官")
      ],
      loadout_slots: [
        {
          index: 0,
          name: "日落速刷",
          item_count: 8,
          items: [
            { instance_id: "pulse-equipped", name: "快速命中脉冲", bucket_name: "动能武器" },
            { instance_id: "shotgun-inventory", name: "终局霰弹枪", bucket_name: "能量武器" },
            { instance_id: "rocket-equipped", name: "边缘迁移火箭筒", bucket_name: "威能武器" }
          ]
        }
      ]
    },
    {
      character_id: "warlock-1",
      class_name: "术士",
      emblem_url: prototypeEmblem("术", "#8c5bd6", "#e1c7ff"),
      light: 2018,
      equipped_items: [
        prototypeAccountItem("warlock-pulse-equipped", 1030, "术士脉冲步枪", "动能武器", "适配框架", "术士已装备"),
        prototypeAccountItem("warlock-fusion-equipped", 1031, "术士融合步枪", "能量武器", "精确框架", "术士已装备"),
        prototypeAccountItem("warlock-linear-equipped", 1032, "术士线性融合", "威能武器", "线性框架", "术士已装备"),
        prototypeAccountItem("warlock-helmet-equipped", 1033, "术士头盔", "头盔", "护甲", "术士已装备"),
        prototypeAccountItem("warlock-arms-equipped", 1034, "术士臂铠", "臂铠", "护甲", "术士已装备"),
        prototypeAccountItem("warlock-chest-equipped", 1035, "术士胸甲", "胸甲", "护甲", "术士已装备"),
        prototypeAccountItem("warlock-legs-equipped", 1036, "术士腿甲", "腿甲", "护甲", "术士已装备"),
        prototypeAccountItem("warlock-class-equipped", 1037, "术士臂环", "职业物品", "护甲", "术士已装备")
      ],
      equipment_groups: [],
      inventory_items: [
        prototypeAccountItem("fusion-warlock", 1005, "适配融合步枪", "能量武器", "适配框架", "术士背包"),
        prototypeAccountItem("warlock-handcannon", 1038, "术士手炮", "能量武器", "精确框架", "术士背包"),
        prototypeAccountItem("warlock-rocket", 1039, "术士火箭筒", "威能武器", "自适应框架", "术士背包"),
        prototypeAccountItem("warlock-alt-helmet", 1040, "术士备用头盔", "头盔", "护甲", "术士背包"),
        prototypeAccountItem("warlock-alt-chest", 1041, "术士备用胸甲", "胸甲", "护甲", "术士背包"),
        prototypeAccountItem("warlock-alt-legs", 1042, "术士备用腿甲", "腿甲", "护甲", "术士背包")
      ],
      inventory_groups: [],
      postmaster_items: [
        prototypeAccountItem("warlock-postmaster-scout", 1043, "邮政官斥候", "动能武器", "轻质框架", "邮政官")
      ],
      loadout_slots: []
    }
  ],
  vault: {
    item_count: 764,
    items: [
      prototypeAccountItem("handcannon-vault", 1002, "精准手炮", "能量武器", "精确框架", "仓库"),
      prototypeAccountItem("sword-vault", 1006, "连锁反应刀剑", "威能武器", "旋风框架", "仓库"),
      prototypeAccountItem("scout-vault", 1007, "旧赛季斥候", "动能武器", "适配框架", "仓库"),
      prototypeAccountItem("auto-vault", 1008, "高射速自动步枪", "动能武器", "速射框架", "仓库"),
      prototypeAccountItem("sniper-vault", 1009, "精准狙击枪", "能量武器", "攻击型框架", "仓库"),
      {
        ...prototypeAccountItem("helmet-vault", 1010, "高纪律头盔", "头盔", "护甲", "仓库"),
        group_key: "armor",
        item_type: "头盔",
        armor_stats: { total: 66, health: 18, melee: 4, grenade: 22, super: 10, class: 6, weapon: 6 }
      },
      {
        ...prototypeAccountItem("class-vault", 1011, "职业物品目标件", "职业物品", "护甲", "仓库"),
        group_key: "armor",
        item_type: "职业物品",
        armor_stats: { total: 0, health: 0, melee: 0, grenade: 0, super: 0, class: 0, weapon: 0 }
      },
      prototypeAccountItem("boots-vault", 1044, "高恢复腿甲", "腿甲", "护甲", "仓库"),
      prototypeAccountItem("gauntlets-vault", 1045, "近战臂铠", "臂铠", "护甲", "仓库"),
      prototypeAccountItem("glaive-vault", 1046, "实验偃月", "能量武器", "适配框架", "仓库"),
      prototypeAccountItem("machinegun-vault", 1047, "机枪清怪件", "威能武器", "高冲击力框架", "仓库"),
      prototypeAccountItem("sidearm-vault", 1048, "轻质手枪", "能量武器", "轻质框架", "仓库")
    ],
    sample_items: []
  },
  materials: {
    item_count: 28,
    items: [
      { hash: 9001, name: "增强核心", item_count: 126, icon: prototypeItemIcon("核", "#2e835c") },
      { hash: 9002, name: "升级模块", item_count: 18, icon: prototypeItemIcon("升", "#2f7dd1") },
      { hash: 9003, name: "异域密码", item_count: 1, icon: prototypeItemIcon("异", "#c6922e") }
    ]
  }
};

const prototypeLoadoutTemplates: any[] = [
  {
    id: "nightfall-hunter",
    name: "宗师夜幕安全位",
    character_id: "hunter-1",
    class_name: "猎人",
    created_at: "2026-06-18T10:00:00.000Z",
    updated_at: "2026-07-02T14:18:00.000Z",
    items: [
      { hash: 1001, instance_id: "pulse-equipped", name: "快速命中脉冲", bucket_name: "动能武器", weapon_frame_name: "轻质框架", perk_names: ["快速命中", "动能震颤"] },
      { hash: 1002, instance_id: "handcannon-vault", name: "精准手炮", bucket_name: "能量武器", weapon_frame_name: "精确框架", perk_names: ["丰盈满溢", "爆炸载荷"] },
      { hash: 1003, instance_id: "shotgun-inventory", name: "终局霰弹枪", bucket_name: "能量武器", weapon_frame_name: "精确框架", perk_names: ["自动装填", "重组"] },
      { hash: 1004, instance_id: "rocket-equipped", name: "边缘迁移火箭筒", bucket_name: "威能武器", weapon_frame_name: "自适应框架", perk_names: ["追踪模块", "诱导推销"] }
    ]
  },
  {
    id: "raid-warlock",
    name: "突袭输出位",
    character_id: "warlock-1",
    class_name: "术士",
    created_at: "2026-06-24T09:00:00.000Z",
    updated_at: "2026-07-01T21:30:00.000Z",
    items: [
      { hash: 1001, name: "快速命中脉冲", bucket_name: "动能武器", weapon_frame_name: "轻质框架", perk_names: ["快速命中", "动能震颤"] },
      { hash: 1005, instance_id: "fusion-warlock", name: "适配融合步枪", bucket_name: "能量武器", weapon_frame_name: "适配框架", perk_names: ["自填", "控制爆破"] },
      { hash: 1006, instance_id: "sword-vault", name: "连锁反应刀剑", bucket_name: "威能武器", weapon_frame_name: "旋风框架", perk_names: ["无情打击", "连锁反应"] }
    ]
  }
];

const prototypeEquipmentFilters: LibraryEquipmentFilter = {
  query: "",
  group: "all",
  tier: "all",
  bucket: "all",
  ammo: "all",
  frame: [],
  sourceStatus: "all",
  perkPool: "all",
  dropAccess: "all",
  perkQuery: ""
};

const prototypePerkFilters: LibraryPerkFilter = {
  query: "",
  relatedGroup: "all",
  hasRelatedItems: "all"
};

const prototypeLibraryItems: any[] = [
  {
    hash: 1001,
    name: "快速命中脉冲",
    icon: prototypeItemIcon("脉", "#2f7dd1"),
    description: "适合宗师和赛季活动的稳定主手武器。",
    item_type: "脉冲步枪",
    tier: "传说",
    group_key: "weapons",
    bucket_name: "动能武器",
    ammo_type: "primary",
    weapon_frame: { key: "lightweight", name: "轻质框架" },
    source: { status: "ready", label: "来源可确认", description: "夜幕轮换奖励，需要等本周或后续轮换复查。" },
    perks: [{ socket_index: 3, plugs: [{ hash: 2001, name: "快速命中", description: "精准命中提高稳定性和装填速度。" }, { hash: 2002, name: "动能震颤", description: "持续命中会产生冲击波。" }] }]
  },
  {
    hash: 1002,
    name: "精准手炮",
    icon: prototypeItemIcon("手", "#7a4fb3"),
    description: "PVE 清怪和勇士控制都能使用。",
    item_type: "手炮",
    tier: "传说",
    group_key: "weapons",
    bucket_name: "能量武器",
    ammo_type: "primary",
    weapon_frame: { key: "precision", name: "精确框架" },
    source: { status: "ready", label: "来源可确认", description: "当前公开商人库存有售卖线索。" },
    perks: [{ socket_index: 3, plugs: [{ hash: 2003, name: "丰盈满溢", description: "拾取特殊或重弹溢出弹匣。" }, { hash: 2004, name: "爆炸载荷", description: "弹体造成范围爆炸伤害。" }] }]
  },
  {
    hash: 1007,
    name: "旧赛季斥候",
    icon: prototypeItemIcon("侦", "#6b7280"),
    description: "传承来源，当前不作为优先刷取目标。",
    item_type: "斥候步枪",
    tier: "传说",
    group_key: "weapons",
    bucket_name: "动能武器",
    ammo_type: "primary",
    weapon_frame: { key: "adaptive", name: "适配框架" },
    source: { status: "ready", label: "传承来源", description: "已下架或传承来源，需等待官方恢复入口。" },
    perks: []
  },
  {
    hash: 1008,
    name: "高射速自动步枪",
    icon: prototypeItemIcon("自", "#2e835c"),
    description: "适合赛季活动清怪，作为目标规则之外的复查样本。",
    item_type: "自动步枪",
    tier: "传说",
    group_key: "weapons",
    bucket_name: "动能武器",
    ammo_type: "primary",
    weapon_frame: { key: "rapid-fire", name: "速射框架" },
    source: { status: "ready", label: "来源可确认", description: "世界掉落和公开商人池中可复查。" },
    perks: [{ socket_index: 3, plugs: [{ hash: 2005, name: "维持生计", description: "击败目标后部分装填弹匣。" }, { hash: 2006, name: "目标锁定", description: "持续命中提高伤害。" }] }]
  },
  {
    hash: 1010,
    name: "高纪律头盔",
    icon: prototypeItemIcon("盔", "#a87118"),
    description: "用于测试护甲目标规则和属性筛选。",
    item_type: "头盔",
    tier: "传说",
    group_key: "armor",
    bucket_name: "头盔",
    ammo_type: "",
    weapon_frame: { key: "armor", name: "护甲" },
    source: { status: "ready", label: "来源可确认", description: "账号仓库中已有样本，可直接对照本地目标规则。" },
    perks: []
  }
];

const prototypeLibraryPerks: any[] = [
  {
    hash: 2002,
    name: "动能震颤",
    description: "连续命中目标后产生动能冲击波。",
    related_items: [{ hash: 1001, name: "快速命中脉冲", group_key: "weapons" }]
  },
  {
    hash: 2003,
    name: "丰盈满溢",
    description: "拾取弹药时溢出当前武器弹匣。",
    related_items: [{ hash: 1002, name: "精准手炮", group_key: "weapons" }]
  }
];

const prototypeLibraryHistory = {
  recent: [
    { hash: 1001, name: "快速命中脉冲", icon: prototypeItemIcon("脉", "#2f7dd1") },
    { hash: 1002, name: "精准手炮", icon: prototypeItemIcon("手", "#7a4fb3") }
  ],
  favorites: [
    { hash: 1002, name: "精准手炮", icon: prototypeItemIcon("手", "#7a4fb3") }
  ]
};

const prototypeLibraryCommunityMatch = new Map<number, any>([
  [1001, { available: 3, sample_perks: [{ name: "快速命中" }, { name: "动能震颤" }] }],
  [1002, { available: 2, sample_perks: [{ name: "丰盈满溢" }, { name: "爆炸载荷" }] }]
]);

const prototypeLiveAvailability = {
  account_scope: "character" as const,
  items: {
    "1002": {
      status: "public_vendor" as const,
      label: "公开商人售卖",
      description: "Prototype mock：当前公开商人库存命中，需进游戏确认价格和资格。",
      sources: [{ kind: "public_vendor" as const, label: "Banshee-44" }]
    }
  }
};

const prototypeManifestStatus = {
  initialized: true,
  version: "DestinyInventoryItemDefinition.26.06.16.0000",
  latest_version: "DestinyInventoryItemDefinition.26.06.16.0000",
  needs_update: false,
  cached_at: "2026-06-16T17:00:00.000Z",
  checked_at: "2026-07-03T14:18:00+08:00",
  missing_required_components: []
};

const prototypeUpdateSnapshot = {
  status: "not_available",
  current_version: "0.0.10",
  available_version: null,
  downloaded_version: null,
  progress_percent: undefined,
  last_checked_at: "2026-07-03T14:18:00+08:00",
  update_source_label: "GitHub Release",
  user_message: "当前已是最新版本。",
  error: ""
};

function prototypeStartupStateForScenario(scenario: PrototypeScenario): any {
  return {
    cards: {
      bungieConfig: {
        status: scenario.key === "account-missing" ? "missing" : "ready",
        label: scenario.key === "account-missing" ? "需要配置 Bungie" : "Bungie 已配置"
      },
      account: {
        status: scenario.hasAccountData ? "ready" : "missing",
        label: scenario.hasAccountData ? "账号已读取" : "需要登录 Bungie 账号"
      }
    }
  };
}

const prototypeActivitySummary: any = {
  recent: {
    total: 10,
    pve: { total: 7, completed: 6 },
    pvp: { total: 3, completed: 2 },
    latest_period: "2026-07-03T13:42:00+08:00"
  },
  review: {
    completion_rate: 80,
    completions_in_a_row: 3,
    recent_10: [
      { status_label: "已完成", duration_label: "12分 08秒", key_stats: ["击杀 82", "死亡 1"] },
      { status_label: "已完成", duration_label: "10分 31秒", key_stats: ["击杀 64", "助攻 21"] }
    ]
  },
  raids: {
    entries: [
      {
        activity_type: "raid",
        activity_name: "克洛塔的末日",
        completions: 1,
        attempts: 2,
        last_completed_at: "2026-07-02T22:15:00+08:00"
      },
      {
        activity_type: "dungeon",
        activity_name: "战争领主的废墟",
        completions: 2,
        attempts: 2,
        last_completed_at: "2026-07-01T21:05:00+08:00"
      }
    ]
  },
  recent_items: [
    { period: "2026-07-03T13:42:00+08:00", mode: "pve", activity_name: "日落打击", completed: true },
    { period: "2026-07-03T12:18:00+08:00", mode: "pvp", activity_name: "控制", completed: true }
  ]
};

const prototypeVaultTags = {
  items: {
    "handcannon-vault": { tag: "review", note: "同名 2 件，优先看 perk 差异。" },
    "sword-vault": { tag: "loadout", note: "突袭输出位可用。" },
    "scout-vault": { tag: "junk", note: "传承来源，无目标命中。" },
    "helmet-vault": { tag: "keep", note: "纪律目标命中。" }
  }
} as const;

const prototypeLocalTargetRules = {
  action_policy: "notify_only" as const,
  armor: [
    {
      id: "prototype-armor-discipline",
      name: "高纪律护甲",
      conditions: [{ stat: "grenade" as const, min: 20 }]
    }
  ],
  weapons: [
    {
      id: "prototype-weapon-handcannon",
      name: "PVE 手炮",
      item_hash: 1002,
      item_name: "精准手炮",
      conditions: [{ perk_hash: 2004, perk_name: "爆炸载荷" }]
    }
  ]
};

const prototypeWishlist = {
  title: "Prototype DIM Wishlist",
  rules: [
    {
      item_hash: 1002,
      perk_hashes: [2003, 2004],
      mode: "pve" as const,
      note: "PVE 推荐"
    }
  ]
};

const prototypeVaultCommunityMatch = new Map<number, any>([
  [1002, { matched: 2, modes: ["pve"], sample_perks: [{ name: "丰盈满溢" }, { name: "爆炸载荷" }] }],
  [1006, { matched: 1, modes: ["pve"], sample_perks: [{ name: "连锁反应" }] }]
]);

const prototypeBatchResult = {
  success_count: 0,
  failed_count: 0,
  results: []
};

function getPrototypeBackgroundTasks(scenarioKey: PrototypeScenarioKey): ShellBackgroundTaskItem[] {
  if (scenarioKey === "background-running") {
    return [
      {
        id: "prototype-account-sync",
        title: "读取账号数据",
        status: "running",
        message: "正在同步角色、仓库和最近活动。",
        progress_percent: 48,
        updated_at: "2026-07-03T14:18:00+08:00"
      },
      {
        id: "prototype-manifest-check",
        title: "资料库版本检查",
        status: "retrying",
        message: "网络暂时不可用，稍后自动重试。",
        next_retry_at: "2026-07-03T14:22:00+08:00",
        updated_at: "2026-07-03T14:18:00+08:00"
      },
      ...prototypeBackgroundTasks
    ];
  }

  return prototypeBackgroundTasks;
}

const prototypeBackgroundTasks: ShellBackgroundTaskItem[] = [
  {
    id: "manifest-check",
    title: "资料库检查",
    status: "succeeded",
    message: "Prototype mock：资料库已是最新。",
    created_at: "2026-07-03T14:10:00+08:00",
    updated_at: "2026-07-03T14:18:00+08:00"
  }
];

const prototypeActionLog = [
  {
    id: "action-1",
    created_at: "2026-07-03T14:12:00+08:00",
    action: "transfer",
    item_name: "精准手炮",
    ok: true,
    message: "Prototype mock：已生成仓库转移计划。"
  },
  {
    id: "action-2",
    created_at: "2026-07-03T14:13:00+08:00",
    action: "loadout-equip",
    item_name: "宗师夜幕安全位",
    ok: false,
    message: "Prototype mock：缺少仓库待取装备。"
  }
];

const prototypeBungieConfig = {
  bungie: {
    api_key: "prototype-api-key",
    client_id: "prototype-client-id",
    client_secret: "prototype-client-secret",
    redirect_uri: "https://127.0.0.1:28780/oauth/callback"
  }
};

const prototypeVaultItems = [
  {
    name: "快速命中脉冲",
    short: "脉",
    bucket: "动能武器",
    frame: "轻质框架",
    perks: "快速命中 / 动能震颤",
    score: "保留",
    tone: "keep",
    signals: ["DIM 命中", "配装占用"]
  },
  {
    name: "精准手炮",
    short: "手",
    bucket: "能量武器",
    frame: "精确框架",
    perks: "丰盈满溢 / 爆炸载荷",
    score: "复查",
    tone: "review",
    signals: ["商人售卖", "同名 2 件"]
  },
  {
    name: "旧赛季斥候",
    short: "侦",
    bucket: "动能武器",
    frame: "适配框架",
    perks: "边打边劫 / 禅意时刻",
    score: "清理",
    tone: "junk",
    signals: ["传承来源", "无目标命中"]
  }
];

function prototypeAccountItem(instanceId: string, hash: number, name: string, bucketName: string, frameName: string, location: string) {
  const isWeapon = bucketName.includes("武器");
  const sourceKind = location === "仓库"
    ? "vault"
    : location === "邮政官"
      ? "postmaster"
      : location.includes("背包")
        ? "inventory"
        : "equipped";

  return {
    hash,
    instance_id: instanceId,
    name,
    icon: prototypeItemIcon(bucketName.slice(0, 1), isWeapon ? "#2f7dd1" : "#a87118"),
    item_type: isWeapon ? "武器" : bucketName,
    tier: "传说",
    bucket_name: bucketName,
    group_key: isWeapon ? "weapons" : "armor",
    weapon_frame: isWeapon ? { key: frameName, name: frameName } : undefined,
    armor_stats: isWeapon ? undefined : { total: 64, health: 12, melee: 8, grenade: 20, super: 10, class: 6, weapon: 8 },
    socket_plugs: [
      { hash: hash + 10000, name: "快速命中" },
      { hash: hash + 20000, name: "目标锁定" }
    ],
    source_kind: sourceKind,
    source_character_id: location.includes("术士") ? "warlock-1" : "hunter-1"
  };
}

function prototypeEmblem(label: string, bg: string, fg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="14" fill="${bg}"/><path d="M18 70h60L48 16 18 70Z" fill="rgba(255,255,255,.18)"/><text x="48" y="59" text-anchor="middle" font-size="34" font-family="Arial, sans-serif" font-weight="700" fill="${fg}">${label}</text></svg>`)}`;
}

function prototypeItemIcon(label: string, bg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="${bg}"/><rect x="10" y="10" width="44" height="44" rx="6" fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.45)"/><text x="32" y="40" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" font-weight="700" fill="#fff">${label}</text></svg>`)}`;
}
