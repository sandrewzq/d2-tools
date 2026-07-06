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
  type AiAssistantMessageView,
  type ShellAssistantMode,
  type ShellBackgroundTaskItem,
  type ShellPageKey
} from "@d2-tools/ui";
import {
  buildLoadoutTemplateLookup,
  createAccountPageWorkspace,
  createVaultPageWorkspace,
  createVendorsPageWorkspace,
  formatAccountItemMeta,
  getAccountPageItemKey,
  homePageMetaMap,
  matchesLoadoutTemplateItem
} from "@d2-tools/app";
import "@d2-tools/ui/styles.css";
import {
  createWebShellAdapter,
  fallbackHomeSnapshot,
  type WebHomeSnapshot
} from "./webAdapter";

function WebApp() {
  const env = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env) ?? {};
  const initialTheme = env.VITE_D2_VISUAL_THEME === "dark" ? "dark" : "light";
  const adapter = useMemo(() => createWebShellAdapter(), []);
  const [snapshot, setSnapshot] = useState<WebHomeSnapshot>(fallbackHomeSnapshot);
  const [assistantMode, setAssistantMode] = useState<ShellAssistantMode>(null);
  const [activePage, setActivePage] = useState<ShellPageKey>("home");
  const [selectedAccountCharacterId, setSelectedAccountCharacterId] = useState(webAccountSummary.characters[0]?.character_id ?? "");
  const [selectedTemplateId, setSelectedTemplateId] = useState(webLoadoutTemplates[0]?.id ?? "");
  const [compareTemplateId, setCompareTemplateId] = useState(webLoadoutTemplates[1]?.id ?? "");
  const [renameDraft, setRenameDraft] = useState(webLoadoutTemplates[0]?.name ?? "");
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [libraryViewMode, setLibraryViewMode] = useState<LibraryViewMode>("equipment");
  const [equipmentFilters, setEquipmentFilters] = useState<LibraryEquipmentFilter>(webEquipmentFilters);
  const [perkFilters, setPerkFilters] = useState<LibraryPerkFilter>(webPerkFilters);
  const [aliasDraft, setAliasDraft] = useState("ff");
  const [aliasTargetDraft, setAliasTargetDraft] = useState("喂食狂热");
  const [aliasKind, setAliasKind] = useState<"item" | "perk">("perk");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<AiAssistantMessageView[]>(() => [
    {
      role: "assistant",
      text: "Web 入口已接入共享 AI 助手界面。当前使用首页 snapshot 作为上下文，后续由 Web provider 提供真实账号和 AI 服务。"
    }
  ]);
  const [isAssistantSessionDrawerOpen, setIsAssistantSessionDrawerOpen] = useState(false);
  const [isAssistantContextDrawerOpen, setIsAssistantContextDrawerOpen] = useState(false);
  const platformActions = useMemo(() => ({
    openExternal: adapter.openExternal
  }), [adapter]);
  const hasAccountData = snapshot.shellStatus.some((item) => item.key === "account" && item.tone === "ready");
  const isBungieConfigured = true;
  const isAccountLoggedIn = true;
  const canLoadAccount = true;
  const isAiConfigured = true;
  const selectedTemplate = webLoadoutTemplates.find((template) => template.id === selectedTemplateId)
    ?? webLoadoutTemplates[0]
    ?? null;
  const compareTemplate = webLoadoutTemplates.find((template) => template.id === compareTemplateId) ?? null;
  const activeLoadoutLookup = selectedTemplate ? buildLoadoutTemplateLookup(selectedTemplate) : null;
  const accountWorkspace = useMemo(
    () => createAccountPageWorkspace({
      account: webAccountSummary,
      selectedCharacterId: selectedAccountCharacterId,
      openingItemKey: "",
      isLoadoutMatch: (item) => matchesLoadoutTemplateItem(item, activeLoadoutLookup)
    }),
    [activeLoadoutLookup, selectedAccountCharacterId]
  );
  const vaultWorkspace = useMemo(
    () => createVaultPageWorkspace({
      account: webAccountSummary,
      selectedCharacterId: selectedAccountCharacterId,
      activeLoadoutLookup,
      activeLoadoutName: selectedTemplate?.name,
      tags: webVaultTags,
      targetRules: webLocalTargetRules,
      wishlist: webWishlist,
      communityMatch: webVaultCommunityMatch
    }),
    [activeLoadoutLookup, selectedAccountCharacterId, selectedTemplate?.name]
  );
  const webVendorsWorkspace = useMemo(() => createVendorsPageWorkspace(null), []);
  const assistantContext = useMemo(() => ({
    pageLabel: "首页工作台",
    focus: "先看官方可确认的今日 / 本周内容，再处理账号、资料库和应用版本状态。",
    facts: snapshot.shellStatus.map((item) => `${item.label}：${item.value}`),
    itemCount: 496,
    characterCount: hasAccountData ? 2 : 0,
    materialCount: 28,
    dailyLoaded: true
  }), [hasAccountData, snapshot.shellStatus]);

  function appendAssistantReply(prompt: string) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setAssistantMessages((current) => [
      ...current,
      { role: "user", text: trimmedPrompt },
      {
        role: "assistant",
        text: "这是 Web adapter 的 mock 回复：当前页面使用共享 AI 助手 View，真实回答会在 Web provider 接入账号和 AI 服务后替换。"
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
      backgroundTasks={webBackgroundTasks}
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
          contextChip={[
            `当前页面：${assistantContext.pageLabel}`,
            `仓库 ${assistantContext.itemCount} 件`,
            `角色 ${assistantContext.characterCount} 个`,
            assistantContext.dailyLoaded ? "今日信息已载入" : "今日信息未载入"
          ].join(" · ")}
          context={assistantContext}
          quickPrompts={["今天先刷什么", "仓库清理建议", "资料库状态怎么处理", "首页哪些状态需要优先看"]}
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
              state={snapshot.homeState}
              accountError=""
              diagnosticRows={[{ tone: "warning" }]}
              dailySummary={snapshot.homeDailySummary}
              onCopyDailySummary={() => undefined}
              onRefreshDiagnostics={() => undefined}
            />
          ) : null}
          {activePage === "account" ? (
            <AccountPageContentView
              interfaceLocale={preferences.interfaceLocale}
              accountSummary={webAccountSummary}
              startupState={webStartupState}
              accountWorkspace={accountWorkspace}
              selectedCharacter={accountWorkspace.selectedCharacter}
              selectedCharacterId={selectedAccountCharacterId}
              isBungieConfigured
              isAccountLoggedIn
              canLoadAccount
              isLoadingAccount={false}
              accountError=""
              itemDetailError=""
              itemDetailLoadingKey=""
              writeActionsEnabled={false}
              activitySummary={webActivitySummary}
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
              wishlist={vaultWorkspace.wishlist}
              localTargetRules={vaultWorkspace.targetRules}
              communityMatch={vaultWorkspace.communityMatch}
              cleanupActions={{
                characters: webAccountSummary.characters,
                currentCharacterId: vaultWorkspace.currentCharacterId,
                currentCharacterLabel: vaultWorkspace.currentCharacterLabel,
                writeActionsEnabled: false,
                onBatchUnlock: async () => "Web mock：写操作未开启。",
                onBatchTransferToCharacter: async () => webBatchResult
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
              accountSummary={webAccountSummary}
              templates={webLoadoutTemplates}
              selectedTemplate={selectedTemplate}
              compareTemplate={compareTemplate}
              selectedAnalysis={webSelectedAnalysis}
              transferPlan={webTransferPlan}
              statusSummary={webLoadoutStatusSummary}
              visibleCompareRows={webCompareRows}
              missingCount={1}
              readyCount={2}
              actionableCount={1}
              compareTemplateId={compareTemplateId}
              renameDraft={renameDraft}
              showDiffOnly={showDiffOnly}
              message="Web mock：共享配装页已接入，真实 provider 后续替换数据源。"
              isRunningItemAction={false}
              actionFeedback={{}}
              getItemStatus={getWebLoadoutItemStatus}
              getBlockedDetails={() => null}
              getSourceItem={getWebSourceItem}
              getActionFeedbackKey={(templateId, item, action) => `${templateId}:${item.instance_id ?? item.hash}:${action}`}
              formatComparePerks={(perks) => perks.length ? perks.join(" / ") : "无"}
              onSelectTemplate={(id) => {
                setSelectedTemplateId(id);
                const template = webLoadoutTemplates.find((item) => item.id === id);
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
              items={webLibraryItems}
              perks={webLibraryPerks}
              equipmentFilters={equipmentFilters}
              perkFilters={perkFilters}
              equipmentSearchTouched
              perkSearchTouched
              isSearching={false}
              searchError=""
              aliasDraft={aliasDraft}
              aliasTargetDraft={aliasTargetDraft}
              aliasKind={aliasKind}
              aliasMessage="Web mock：别名保存待接 provider。"
              libraryHistory={webLibraryHistory}
              libraryCommunityMatch={webLibraryCommunityMatch}
              liveAvailability={webLiveAvailability}
              liveAvailabilityError=""
              isLoadingLiveAvailability={false}
              manifestStatus={webManifestStatus}
              manifestStatusError=""
              isLoadingManifestStatus={false}
              isInitializingManifest={false}
              itemDetailLoadingKey=""
              onViewModeChange={setLibraryViewMode}
              onEquipmentFiltersChange={(patch) => setEquipmentFilters((current) => ({ ...current, ...patch }))}
              onPerkFiltersChange={(patch) => setPerkFilters((current) => ({ ...current, ...patch }))}
              onSearch={() => undefined}
              onClearFilters={() => {
                setEquipmentFilters(webEquipmentFilters);
                setPerkFilters(webPerkFilters);
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
              vendors={webVendorsWorkspace.vendors}
              updatedLabel={webVendorsWorkspace.updatedLabel}
              sourceLabel={webVendorsWorkspace.sourceLabel}
              nextResetLabel={webVendorsWorkspace.nextResetLabel}
              recommendationCount={webVendorsWorkspace.recommendationCount}
            />
          ) : null}
          {activePage === "settings" ? (
            <SettingsPageContentView
              interfaceLocale={preferences.interfaceLocale}
              initialSection="overview"
              message=""
              error=""
              diagnosticDataDir="Web mock storage"
              writeActionsEnabled={false}
              updateSnapshot={webUpdateSnapshot}
              manifestStatus={webManifestStatus}
              manifestStatusError=""
              isLoadingManifestStatus={false}
              isInitializingManifest={false}
              accountSummary={webAccountSummary}
              accountError=""
              isLoadingAccount={false}
              lastAccountLoadedAt={new Date("2026-07-03T14:18:00+08:00")}
              isAiConfigured
              backgroundTasks={webBackgroundTasks}
              actionLog={webActionLog}
              actionLogResultFilter="all"
              actionLogTypeFilter="all"
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
              languagePreferences={{
                interfaceLocale: preferences.interfaceLocale,
                bungieLocale: preferences.bungieLocale,
                followInterfaceLocaleForBungie: preferences.followInterfaceLocaleForBungie
              }}
              onLanguagePreferencesChange={() => undefined}
              onLoadBungieConfig={async () => webBungieConfig}
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

const webAccountSummary: any = {
  account_name: "Web Guardian",
  destiny_membership_id: "4611686018429100000",
  membership_type: 3,
  characters: [
    {
      character_id: "web-hunter",
      class_name: "猎人",
      light: 2022,
      equipped_items: [
        webAccountItem("web-pulse-equipped", 3001, "快速命中脉冲", "动能武器", "轻质框架", "已装备"),
        webAccountItem("web-rocket-equipped", 3004, "边缘迁移火箭筒", "威能武器", "自适应框架", "已装备")
      ],
      equipment_groups: [],
      inventory_items: [
        webAccountItem("web-shotgun-inventory", 3003, "终局霰弹枪", "能量武器", "精确框架", "背包")
      ],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    },
    {
      character_id: "web-warlock",
      class_name: "术士",
      light: 2018,
      equipped_items: [],
      equipment_groups: [],
      inventory_items: [webAccountItem("web-fusion-warlock", 3005, "适配融合步枪", "能量武器", "适配框架", "术士背包")],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    }
  ],
  vault: {
    item_count: 485,
    items: [
      webAccountItem("web-handcannon-vault", 3002, "精准手炮", "能量武器", "精确框架", "仓库"),
      webAccountItem("web-sword-vault", 3006, "连锁反应刀剑", "威能武器", "旋风框架", "仓库"),
      webAccountItem("web-scout-vault", 3007, "旧赛季斥候", "动能武器", "适配框架", "仓库")
    ],
    sample_items: []
  },
  materials: { item_count: 0, items: [] }
};

const webStartupState = {
  cards: {
    bungieConfig: { status: "ready", label: "Bungie 已配置" },
    account: { status: "ready", label: "账号已读取" }
  }
};

const webActivitySummary: any = {
  recent: { total: 10, pve: { total: 7, completed: 6 }, pvp: { total: 3, completed: 2 }, latest_period: "2026-07-03T14:18:00+08:00" },
  review: { completion_rate: 80, completions_in_a_row: 3, recent_10: [] },
  raids: { entries: [] },
  recent_items: []
};

const webLoadoutTemplates: any[] = [
  {
    id: "web-nightfall",
    name: "Web 夜幕模板",
    character_id: "web-hunter",
    class_name: "猎人",
    created_at: "2026-07-01T10:00:00.000Z",
    updated_at: "2026-07-03T14:18:00.000Z",
    items: [
      { hash: 3001, instance_id: "web-pulse-equipped", name: "快速命中脉冲", bucket_name: "动能武器", weapon_frame_name: "轻质框架", perk_names: ["快速命中", "动能震颤"] },
      { hash: 3002, instance_id: "web-handcannon-vault", name: "精准手炮", bucket_name: "能量武器", weapon_frame_name: "精确框架", perk_names: ["丰盈满溢", "爆炸载荷"] }
    ]
  },
  {
    id: "web-raid",
    name: "Web 突袭模板",
    character_id: "web-warlock",
    class_name: "术士",
    created_at: "2026-07-01T10:00:00.000Z",
    updated_at: "2026-07-03T14:18:00.000Z",
    items: [
      { hash: 3005, instance_id: "web-fusion-warlock", name: "适配融合步枪", bucket_name: "能量武器", weapon_frame_name: "适配框架", perk_names: ["自填", "控制爆破"] }
    ]
  }
];

const webSelectedAnalysis = { equipped: [webLoadoutTemplates[0].items[0]], missing: [webLoadoutTemplates[0].items[1]] };
const webTransferPlan = { steps: [], blocked: [] };
const webLoadoutStatusSummary = [
  { key: "equipped", label: "已装备", count: 1 },
  { key: "vault", label: "仓库", count: 1 }
];
const webCompareRows = [
  {
    slot: "能量武器",
    changed: true,
    left: { name: "精准手炮", frame: "精确框架", perks: ["丰盈满溢", "爆炸载荷"] },
    right: { name: "适配融合步枪", frame: "适配框架", perks: ["自填", "控制爆破"] }
  }
];

const webEquipmentFilters: LibraryEquipmentFilter = {
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

const webPerkFilters: LibraryPerkFilter = {
  query: "",
  relatedGroup: "all",
  hasRelatedItems: "all"
};

const webLibraryItems: any[] = [
  {
    hash: 3001,
    name: "快速命中脉冲",
    description: "Web mock 装备。",
    item_type: "脉冲步枪",
    tier: "传说",
    group_key: "weapons",
    bucket_name: "动能武器",
    ammo_type: "primary",
    weapon_frame: { key: "lightweight", name: "轻质框架" },
    source: { status: "ready", label: "来源可确认", description: "Web provider 后续接真实来源。" },
    perks: []
  }
];
const webLibraryPerks: any[] = [{ hash: 4001, name: "动能震颤", description: "连续命中目标后产生动能冲击波。", related_items: [] }];
const webLibraryHistory = { recent: [{ hash: 3001, name: "快速命中脉冲" }], favorites: [] };
const webLibraryCommunityMatch = new Map<number, any>([[3001, { available: 1, sample_perks: [{ name: "快速命中" }] }]]);
const webLiveAvailability = { account_scope: "character" as const, items: {} };

const webManifestStatus = {
  initialized: true,
  version: "DestinyInventoryItemDefinition.26.06.16.0000",
  latest_version: "DestinyInventoryItemDefinition.26.06.16.0000",
  needs_update: false,
  cached_at: "2026-06-16T17:00:00.000Z",
  checked_at: "2026-07-03T14:18:00+08:00",
  missing_required_components: []
};

const webUpdateSnapshot = {
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

const webVaultTags = { items: { "web-handcannon-vault": { tag: "review", note: "Web mock 同名复查。" }, "web-scout-vault": { tag: "junk" } } } as const;
const webLocalTargetRules = { action_policy: "notify_only" as const, armor: [], weapons: [] };
const webWishlist = { title: "Web DIM Wishlist", rules: [{ item_hash: 3002, perk_hashes: [4001], mode: "pve" as const, note: "Web 推荐" }] };
const webVaultCommunityMatch = new Map<number, any>([[3002, { matched: 1, modes: ["pve"], sample_perks: [{ name: "爆炸载荷" }] }]]);
const webBatchResult = { success_count: 0, failed_count: 0, results: [] };
const webBackgroundTasks: ShellBackgroundTaskItem[] = [{ id: "web-task", title: "Web snapshot", status: "succeeded", message: "Web mock 已载入。", created_at: "2026-07-03T14:18:00+08:00", updated_at: "2026-07-03T14:18:00+08:00" }];
const webActionLog = [{ id: "web-action", created_at: "2026-07-03T14:18:00+08:00", action: "mock", item_name: "Web mock", ok: true, message: "共享设置页操作日志 mock。" }];
const webBungieConfig = { bungie: { api_key: "web-api-key", client_id: "web-client-id", client_secret: "web-client-secret", redirect_uri: "https://127.0.0.1:28780/oauth/callback" } };

function webAccountItem(instanceId: string, hash: number, name: string, bucketName: string, frameName: string, location: string) {
  return {
    hash,
    instance_id: instanceId,
    name,
    item_type: bucketName.includes("武器") ? "武器" : "装备",
    tier: "传说",
    bucket_name: bucketName,
    group_key: bucketName.includes("武器") ? "weapons" : "armor",
    weapon_frame: { key: frameName, name: frameName },
    socket_plugs: [{ hash: 4001, name: "快速命中" }, { hash: 4002, name: "爆炸载荷" }],
    source_kind: location === "仓库" ? "vault" : location.includes("背包") ? "inventory" : "equipped",
    source_character_id: location === "术士背包" ? "web-warlock" : "web-hunter"
  };
}

function getWebLoadoutItemStatus(item: any) {
  if (item.instance_id === "web-pulse-equipped") {
    return { key: "equipped", badge_label: "已装备", badge_tone: "ready", location_label: "当前角色已装备" };
  }
  return { key: "vault", badge_label: "仓库待取", badge_tone: "info", location_label: "仓库", guidance_label: "可自动补齐", guidance_hint: "Web mock 暂不执行写操作。" };
}

function getWebSourceItem(item: any) {
  return item.instance_id ? { instance_id: item.instance_id, source_kind: item.instance_id.includes("vault") ? "vault" : "inventory", source_character_id: "web-hunter" } : null;
}
