import { createRoot } from "react-dom/client";
import { useMemo, useState, type ComponentProps, type ReactNode } from "react";
import {
  AccountPageContentView,
  ControlButton,
  ShellSidebarAccountSummary,
  ShellSidebarActions,
  ArmorDetailContent,
  AiAssistantPanelView,
  defaultProductPreferences,
  HomePageContentView,
  KohinataTaskPanelView,
  LibraryPageContentView,
  LoadoutsPageContentView,
  ProductShellHost,
  SettingsPageContentView,
  SharedItemDetailDialog,
  VaultPageContentView,
  VendorsPageContentView,
  WeaponDetailContent,
  type LibraryEquipmentFilter,
  type LibraryPerkFilter,
  type LibraryViewMode,
  type HomeWeeklyActivityReward,
  type ProductPreferences,
  type ShellAssistantMode,
  type ShellPageKey,
  type SettingsAiAdapter,
  type VendorInventoryItemView,
  type VendorOfferContextView,
} from "@d2-tools/ui";
import { createHomeWeeklyActivityRewardDetailTarget } from "@d2-tools/app/home";
import {
  buildArmorDetailViewModel,
  buildWeaponDetailViewModel,
  type ArmorDetailViewModel,
  type WeaponDetailViewModel
} from "@d2-tools/app/items";
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
  const initialTheme = env.VITE_D2_VISUAL_THEME === "light" ? "light" : "dark";
  const initialScenario = isPrototypeScenarioKey(env.VITE_D2_VISUAL_SCENARIO)
    ? env.VITE_D2_VISUAL_SCENARIO
    : defaultPrototypeScenarioKey;
  const initialSettingsSection = isSettingsSectionKey(env.VITE_D2_VISUAL_SETTINGS_SECTION)
    ? env.VITE_D2_VISUAL_SETTINGS_SECTION
    : "overview";
  const [preferences, setPreferences] = useState<ProductPreferences>({
    ...defaultProductPreferences,
    colorMode: initialTheme
  });
  const [activePage, setActivePage] = useState<ShellPageKey>(initialPage);
  const [settingsSection, setSettingsSection] = useState(initialSettingsSection);
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
  const [taskDraft, setTaskDraft] = useState("虚空猎人高难配装，需要反屏障脉冲步枪、奥菲斯钻机，韧性与纪律优先。");
  const [taskMessage, setTaskMessage] = useState("Prototype：攻略文本已准备，可继续解析和对照账号。");
  const [isPrototypeDebugOpen, setIsPrototypeDebugOpen] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState(() => fixture.assistantInitialMessages);
  const [isAssistantSessionDrawerOpen, setIsAssistantSessionDrawerOpen] = useState(false);
  const [isAssistantContextDrawerOpen, setIsAssistantContextDrawerOpen] = useState(false);
  const [vendorDetail, setVendorDetail] = useState<{
    item: VendorInventoryItemView;
    context: VendorOfferContextView;
  } | null>(null);
  const [genericVendorDetail, setGenericVendorDetail] = useState<{
    item: VendorInventoryItemView;
    context: VendorOfferContextView;
  } | null>(null);
  const [isWeaponDetailOpen, setIsWeaponDetailOpen] = useState(false);
  const [armorDetailModel, setArmorDetailModel] = useState<ArmorDetailViewModel | null>(null);
  const [weeklyRewardDetail, setWeeklyRewardDetail] = useState<{
    name: string;
    itemType?: string;
    armor?: ArmorDetailViewModel;
    weapon?: WeaponDetailViewModel;
  } | null>(null);
  const [weaponObjectKind, setWeaponObjectKind] = useState<PrototypeWeaponObjectKind>("account_instance");
  const [weaponRarity, setWeaponRarity] = useState<PrototypeWeaponRarity>("legendary");
  const [selectedWeaponVersionHash, setSelectedWeaponVersionHash] = useState(4401);
  const [selectedWeaponInstanceId, setSelectedWeaponInstanceId] = useState("instance-4401-a");
  const [prototypeInstanceRuntime, setPrototypeInstanceRuntime] = useState<PrototypeInstanceRuntime>(initialPrototypeInstanceRuntime);
  const [prototypeActionCharacter, setPrototypeActionCharacter] = useState<PrototypeCharacter>("泰坦");
  const [prototypeActionMessage, setPrototypeActionMessage] = useState("");
  const [pendingWeaponPerkHash, setPendingWeaponPerkHash] = useState<number | null>(null);
  const [weaponAnalysis, setWeaponAnalysis] = useState<PrototypeWeaponAnalysis>({ status: "idle" });
  const [personalWeaponKnowledge, setPersonalWeaponKnowledge] = useState<PrototypePersonalKnowledge[]>(prototypePersonalKnowledge);
  const scenario = prototypeScenarios[scenarioKey];
  const backgroundTasks = fixture.getBackgroundTasks(scenarioKey);
  const aiSettingsAdapter = useMemo<SettingsAiAdapter>(() => {
    const configured = scenario.key !== "ai-unconfigured";
    const config = configured
      ? { protocol: "openai_responses", provider: "", api_key: "prototype-key", model: "gpt-5-mini", base_url: "https://api.example.com/v1", enable_lightgg: true, force_lightgg: false }
      : { protocol: "", provider: "", api_key: "", model: "", base_url: "", enable_lightgg: false, force_lightgg: false };
    return {
      load: async () => config,
      save: async () => undefined,
      listModels: async () => ({ models: configured ? ["gpt-5-mini", "gpt-5", "claude-sonnet-4"] : [], message: configured ? "Prototype fixture 模型列表。" : "请先选择 API 格式并填写 API Key。" }),
      testConnection: async () => ({ protocol: config.protocol, model: config.model, message: "Prototype fixture 连接成功。" }),
      clearLightggCache: async () => undefined
    };
  }, [scenario.key]);
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
  const vendorsModel = useMemo(
    () => fixture.createVendorsPageModel(scenario, selectedAccountCharacterId),
    [fixture, scenario, selectedAccountCharacterId]
  );
  const platformActions = useMemo(() => ({
    openExternal: (url: string) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    setColorMode: (mode: "light" | "dark") => {
      document.documentElement.dataset.colorMode = mode;
    },
    windowControls: {
      minimize: () => undefined,
      toggleMaximize: () => undefined,
      close: () => undefined
    }
  }), []);
  const assistantContext = useMemo(
    () => fixture.createAssistantContext(activePage, scenario.label, scenario.shellStatus),
    [fixture, activePage, scenario.label, scenario.shellStatus]
  );
  const assistantContextChip = fixture.createAssistantContextChip(assistantContext);
  const prototypeWeaponModel = useMemo(() => createPrototypeWeaponModel({
    kind: weaponObjectKind,
    rarity: weaponRarity,
    selectedVersionHash: selectedWeaponVersionHash,
    selectedInstanceId: selectedWeaponInstanceId,
    instanceRuntime: prototypeInstanceRuntime,
    pendingPerkHash: pendingWeaponPerkHash,
    vendorDetail
  }), [pendingWeaponPerkHash, prototypeInstanceRuntime, selectedWeaponInstanceId, selectedWeaponVersionHash, vendorDetail, weaponObjectKind, weaponRarity]);

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

  function openPrototypeVendorDetail(item: VendorInventoryItemView, context: VendorOfferContextView) {
    if (!isPrototypeWeaponItem(item)) {
      setGenericVendorDetail({ item, context });
      setVendorDetail(null);
      setIsWeaponDetailOpen(false);
      return;
    }
    setGenericVendorDetail(null);
    setVendorDetail({ item, context });
    setWeaponObjectKind("vendor_offer");
    setWeaponRarity(item.tone === "exotic" ? "exotic" : "legendary");
    setIsWeaponDetailOpen(true);
  }

  function openPrototypeWeeklyReward(reward: HomeWeeklyActivityReward) {
    const target = createHomeWeeklyActivityRewardDetailTarget(reward);
    setVendorDetail(null);
    setGenericVendorDetail(null);
    setIsWeaponDetailOpen(false);
    setArmorDetailModel(null);
    setWeeklyRewardDetail(target.group_key === "armor"
      ? { name: target.name, itemType: target.item_type, armor: buildArmorDetailViewModel({ item: target }) }
      : { name: target.name, itemType: target.item_type, weapon: buildWeaponDetailViewModel({ item: target }) });
  }

  return (
    <>
      <ProductShellHost
        activePage={activePage}
        onPageChange={setActivePage}
        assistantMode={assistantMode}
        onAssistantModeChange={setAssistantMode}
        preferences={preferences}
        onPreferencesChange={setPreferences}
        shellStatus={scenario.shellStatus}
        sidebarHeader={(
          <ShellSidebarAccountSummary
            accountName={fixture.accountSummary.account_name}
            characterCount={fixture.accountSummary.characters.length}
            vaultItemCount={vaultModel.vaultItemCount}
            vaultCapacity={fixture.accountSummary.vault.capacity}
          />
        )}
        sidebarFooter={(
          <ShellSidebarActions
            isAiOpen={assistantMode !== null}
            onToggleAi={() => setAssistantMode((current) => current === null ? "ai" : null)}
          />
        )}
        pageHeader={(page) => getPrototypePageHeader(page)}
        assistantPanel={
          assistantMode === "tasks" ? (
              <KohinataTaskPanelView
                pageLabel={assistantContext.pageLabel}
                pageFacts={assistantContext.facts}
                draft={taskDraft}
                statusMessage={taskMessage}
                contextTitle="虚空猎人高难配装"
                recognizedStepCount={4}
                linkedItemCount={3}
                taskGroups={[
                  { title: "解析攻略", items: ["职业：猎人 · 子职业：虚空", "异域护甲：奥菲斯钻机", "武器要求：反屏障脉冲步枪", "属性目标：韧性、纪律优先"] },
                  { title: "账号命中", items: ["奥菲斯钻机：猎人背包，账号实例已确认", "脉冲步枪：仓库 3 件，1 件命中 DIM Wishlist"] },
                  { title: "缺口与待确认", items: ["缺口 0 项", "待确认：攻略未给出具体武器名称和 Perk"] },
                  { title: "配装草稿", items: ["尚未生成草稿"] }
                ]}
                contextGroups={[
                  { title: "攻略要求", items: ["虚空猎人", "高难内容", "反屏障脉冲步枪", "韧性与纪律优先"] },
                  { title: "当前页面证据", items: assistantContext.facts.length ? assistantContext.facts : ["当前页面暂无额外证据"] }
                ]}
                canParse={Boolean(taskDraft.trim())}
                canMatch={Boolean(taskDraft.trim())}
                canCreateDraft
                canSaveDraft
                onDraftChange={setTaskDraft}
                onSaveContext={() => setTaskMessage("Prototype：攻略上下文已保存到本地 mock。")}
                onClearContext={() => {
                  setTaskDraft("");
                  setTaskMessage("Prototype：攻略上下文已清空。");
                }}
                onParse={() => setTaskMessage("Prototype：攻略已解析为 4 项结构化要求。")}
                onMatch={() => setTaskMessage("Prototype：账号对照完成，命中 3 件装备。")}
                onCreateDraft={() => setTaskMessage("Prototype：配装草稿已生成。")}
                onSaveDraft={() => setTaskMessage("Prototype：草稿已发送到配装页保存。")}
                onReviewGaps={() => setTaskMessage("Prototype：缺口 0 项，待确认 1 项。")}
              />
            ) : (
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
              onNavigate={setActivePage}
              onRefreshDiagnostics={() => undefined}
              onOpenWeeklyActivityReward={openPrototypeWeeklyReward}
              onOpenXurOffer={openPrototypeVendorDetail}
            />
          ) : null}
          {activePage === "account" ? (
            <AccountPageContentView
              interfaceLocale={preferences.interfaceLocale}
              viewModel={accountViewModel}
              actions={{
                configureBungie: () => setActivePage("settings"),
                openWriteSettings: () => {
                  setSettingsSection("account");
                  setActivePage("settings");
                },
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
              accountSummary={fixture.accountSummary}
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
                createLocalPlanFromCharacter: () => undefined,
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
              message=""
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
                onOpenItemDetail: (item) => {
                  if (item.group_key === "armor") {
                    setArmorDetailModel(buildArmorDetailViewModel({ item }));
                    setIsWeaponDetailOpen(false);
                    return;
                  }
                  if (item.group_key !== "weapons") return;
                  const exotic = /异域|exotic/i.test(item.tier ?? "");
                  setWeaponObjectKind("definition");
                  setWeaponRarity(exotic ? "exotic" : "legendary");
                  setSelectedWeaponVersionHash(exotic ? 5501 : 4401);
                  setPendingWeaponPerkHash(null);
                  setIsWeaponDetailOpen(true);
                },
                onAddFavorite: () => undefined,
                onRemoveFavorite: () => undefined
              }}
            />
          ) : null}
          {activePage === "vendors" ? (
            <VendorsPageContentView
              interfaceLocale={preferences.interfaceLocale}
               model={vendorsModel}
               actions={{ onOpenItem: openPrototypeVendorDetail }}
            />
          ) : null}
          {activePage === "settings" ? (
            <SettingsPageContentView
              {...fixture.createSettingsPageModel({
                interfaceLocale: preferences.interfaceLocale,
                initialSection: settingsSection,
                scenario,
                backgroundTasks,
                bungieLocale: preferences.bungieLocale,
                followInterfaceLocaleForBungie: preferences.followInterfaceLocaleForBungie
              })}
              aiSettingsAdapter={aiSettingsAdapter}
              colorMode={preferences.colorMode}
              onColorModeChange={(colorMode) => setPreferences((current) => ({ ...current, colorMode }))}
              density={preferences.density}
              onDensityChange={(density) => setPreferences((current) => ({ ...current, density }))}
              onRefreshAccount={() => undefined}
              onReauthorizeAccount={() => undefined}
              onOpenDataDir={() => undefined}
              onWriteActionsEnabledChange={() => undefined}
              onCheckAppUpdate={() => undefined}
              onDownloadAppUpdate={() => undefined}
              onQuitAndInstallAppUpdate={() => undefined}
              onOpenAppUpdateDownloadPage={() => undefined}
              onCopyAppUpdateDiagnostic={() => undefined}
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
                <button type="button" onClick={() => setIsWeaponDetailOpen(true)}>打开武器详情验收</button>
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
           {isWeaponDetailOpen ? (
             <SharedItemDetailDialog
               detail={{ name: prototypeWeaponModel.identity.name }}
               variant="weapon"
               subtitle={`${prototypeWeaponModel.context.entry_label} · ${prototypeWeaponModel.context.object_label}`}
               objectContext={prototypeWeaponModel.context.read_only ? "只读查看" : "可管理实例"}
               closeLabel="关闭装备详情"
               onClose={() => {
                 setIsWeaponDetailOpen(false);
                 setVendorDetail(null);
               }}
               sections={(
                 <>
                   <div className="item-detail-game-card" aria-label="武器详情 Prototype 控制">
                     <div className="button-row">
                     <label>对象
                        <select value={weaponObjectKind} onChange={(event) => {
                          setWeaponObjectKind(event.target.value as PrototypeWeaponObjectKind);
                          setPendingWeaponPerkHash(null);
                          setPrototypeActionMessage("");
                       }}>
                         <option value="definition">资料库定义</option>
                         <option value="vendor_offer">商人售卖</option>
                         <option value="account_instance">账号实例</option>
                       </select>
                     </label>
                     <label>武器
                       <select value={weaponRarity} onChange={(event) => {
                         const rarity = event.target.value as PrototypeWeaponRarity;
                          setWeaponRarity(rarity);
                          setSelectedWeaponVersionHash(rarity === "exotic" ? 5501 : 4401);
                          setSelectedWeaponInstanceId("instance-4401-a");
                          setPendingWeaponPerkHash(null);
                          setPrototypeActionMessage("");
                       }}>
                         <option value="legendary">传说武器</option>
                         <option value="exotic">异域武器</option>
                       </select>
                     </label>
                     </div>
                   </div>
                   <WeaponDetailContent
                     model={prototypeWeaponModel}
                     analysis={weaponAnalysis}
                     personalKnowledge={personalWeaponKnowledge.filter((entry) => entry.weapon_name === prototypeWeaponModel.identity.name)}
                     actions={{
                       selectVersion: setSelectedWeaponVersionHash,
                       openSource: (source) => setWeaponAnalysis({ status: "ready", title: source.label, body: source.description, evidence: [{ label: "来源类型", value: source.kind }] }),
                       stagePerk: (_column, perk) => setPendingWeaponPerkHash(perk.hash),
                       cancelPendingPerks: () => setPendingWeaponPerkHash(null),
                       applyPendingPerks: () => {
                         setPendingWeaponPerkHash(null);
                         setWeaponAnalysis({ status: "ready", title: "配置已应用（Prototype）", body: "已模拟应用当前实例拥有的可切换 Perk。", evidence: [{ label: "对象", value: "账号实例 mock" }] });
                       },
                        selectInstance: (instance) => {
                          setWeaponObjectKind("account_instance");
                          setSelectedWeaponInstanceId(instance.instance_id);
                          setPendingWeaponPerkHash(null);
                          setPrototypeActionMessage("");
                          setWeaponAnalysis({ status: "ready", title: `已选择 ${instance.location} 实例`, body: instance.plug_names.join(" / "), evidence: [{ label: "实例 ID", value: instance.instance_id }] });
                        },
                        runAnalysis: (request) => setWeaponAnalysis({
                          status: "ready",
                          title: `${prototypeWeaponModel.identity.name} 分析`,
                          body: request.prompt.trim() || "当前配置适合高难 PvE：稳定触发增伤，并保留清怪与续航能力。商人对象会额外比较价格和账号已有实例。",
                          evidence: [
                            { label: "分析对象", value: prototypeWeaponModel.context.object_label },
                            { label: "社区推荐", value: prototypeWeaponModel.recommendations[0]?.title ?? "无" },
                            { label: "账号实例", value: `${prototypeWeaponModel.same_hash_instances.length} 件` }
                          ],
                          externalSearchMessage: request.allow_external_search ? "Prototype 已模拟外部知识查询；外部内容保持最低优先级。" : "未请求外部知识。",
                          externalSources: request.allow_external_search ? [{ title: "Bungie 武器设计说明（Prototype）", url: "https://www.bungie.net/7/zh-chs/News", queried_at: new Date().toISOString() }] : []
                        }),
                       saveKnowledge: (draft) => setPersonalWeaponKnowledge((current) => {
                         const now = new Date().toISOString();
                         const next = { ...draft, id: draft.id ?? `prototype-${Date.now()}`, created_at: now, updated_at: now } as PrototypePersonalKnowledge;
                         return [next, ...current.filter((entry) => entry.id !== next.id)];
                       }),
                       setKnowledgeEnabled: (id, enabled) => setPersonalWeaponKnowledge((current) => current.map((entry) => entry.id === id ? { ...entry, enabled, updated_at: new Date().toISOString() } : entry)),
                       deleteKnowledge: (id) => setPersonalWeaponKnowledge((current) => current.filter((entry) => entry.id !== id))
                     }}
                      instanceActions={weaponObjectKind === "account_instance" ? (
                        <section className="item-action-panel">
                          <div><h3>装备操作</h3><p>Prototype 会更新当前实例的位置、装备和锁定状态，不调用 Bungie API。</p></div>
                          <label className="compact-field">目标角色<select value={prototypeActionCharacter} onChange={(event) => setPrototypeActionCharacter(event.target.value as PrototypeCharacter)}><option value="猎人">猎人</option><option value="泰坦">泰坦</option><option value="术士">术士</option></select></label>
                          <div className="button-row">
                            <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => {
                              setPrototypeInstanceRuntime((current) => ({ ...current, [selectedWeaponInstanceId]: { ...current[selectedWeaponInstanceId], locked: !current[selectedWeaponInstanceId].locked } }));
                              setPrototypeActionMessage(prototypeInstanceRuntime[selectedWeaponInstanceId].locked ? "已模拟解锁当前实例。" : "已模拟锁定当前实例。");
                            }}>{prototypeInstanceRuntime[selectedWeaponInstanceId].locked ? "解锁" : "锁定"}</button>
                            <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => {
                              const selected = prototypeInstanceRuntime[selectedWeaponInstanceId];
                              const movingToVault = selected.source_kind !== "vault";
                              setPrototypeInstanceRuntime((current) => ({ ...current, [selectedWeaponInstanceId]: movingToVault
                                ? { ...current[selectedWeaponInstanceId], location: "仓库", source_kind: "vault", source_character_id: undefined, equipped: false }
                                : { ...current[selectedWeaponInstanceId], location: `${prototypeActionCharacter}背包`, source_kind: "inventory", source_character_id: prototypeCharacterIds[prototypeActionCharacter], equipped: false } }));
                              setPrototypeActionMessage(movingToVault ? "已模拟移入仓库。" : `已模拟转移到${prototypeActionCharacter}背包。`);
                            }}>{prototypeInstanceRuntime[selectedWeaponInstanceId].source_kind === "vault" ? "取出到角色" : "移入仓库"}</button>
                            <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => {
                              setPrototypeInstanceRuntime((current) => {
                                const next: PrototypeInstanceRuntime = { ...current };
                                for (const [id, instance] of Object.entries(current)) {
                                  if (id === selectedWeaponInstanceId) {
                                    next[id] = { ...instance, location: `${prototypeActionCharacter}已装备`, source_kind: "equipped", source_character_id: prototypeCharacterIds[prototypeActionCharacter], equipped: true };
                                  } else if (instance.equipped && instance.source_character_id === prototypeCharacterIds[prototypeActionCharacter]) {
                                    next[id] = { ...instance, location: `${prototypeActionCharacter}背包`, source_kind: "inventory", equipped: false };
                                  }
                                }
                                return next;
                              });
                              setPrototypeActionMessage(`已模拟装备到${prototypeActionCharacter}。`);
                            }}>装备到角色</button>
                            <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => setPrototypeActionMessage("已模拟加入配装草稿。")}>加入配装草稿</button>
                          </div>
                          {prototypeActionMessage ? <p className="status-message status-ready">{prototypeActionMessage}</p> : null}
                        </section>
                      ) : undefined}
                   />
                 </>
               )}
             />
            ) : null}
            {armorDetailModel ? (
              <SharedItemDetailDialog
                detail={{ name: armorDetailModel.identity.name }}
                variant="armor"
                subtitle={`${armorDetailModel.context.entry_label} · ${armorDetailModel.context.object_label}`}
                objectContext="只读查看"
                closeLabel="关闭护甲详情"
                onClose={() => setArmorDetailModel(null)}
                sections={<ArmorDetailContent model={armorDetailModel} />}
              />
            ) : null}
            {weeklyRewardDetail ? (
              <SharedItemDetailDialog
                detail={{ name: weeklyRewardDetail.name }}
                variant={weeklyRewardDetail.armor ? "armor" : "weapon"}
                subtitle={`本周活动奖励 · ${weeklyRewardDetail.itemType ?? "装备定义"}`}
                objectContext="资料库定义"
                closeLabel="关闭奖励详情"
                onClose={() => setWeeklyRewardDetail(null)}
                sections={weeklyRewardDetail.armor
                  ? <ArmorDetailContent model={weeklyRewardDetail.armor} />
                  : <WeaponDetailContent model={weeklyRewardDetail.weapon!} />}
              />
            ) : null}
            {genericVendorDetail ? (
             <SharedItemDetailDialog
               detail={{ name: genericVendorDetail.item.name }}
               vendorContext={genericVendorDetail.context}
               closeLabel="关闭装备详情"
               onClose={() => setGenericVendorDetail(null)}
               sections={(
                 <section className="item-detail-game-card">
                   <h3>{genericVendorDetail.item.name}</h3>
                   <p>{genericVendorDetail.item.itemType}</p>
                   <p>{genericVendorDetail.item.summary}</p>
                 </section>
               )}
             />
           ) : null}
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
    || value === "vendor-partial-failure"
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

function isPrototypeWeaponItem(item: VendorInventoryItemView): boolean {
  if (item.tone === "weapon") return true;
  const itemType = item.itemType.toLocaleLowerCase();
  return [
    "自动步枪", "脉冲步枪", "斥候步枪", "手炮", "冲锋枪", "手枪", "弓", "霰弹枪", "狙击枪",
    "融合步枪", "线性融合步枪", "榴弹发射器", "火箭筒", "机枪", "剑", "偃月", "追踪步枪"
  ].some((weaponType) => itemType.includes(weaponType));
}

function getPrototypePageHeader(page: ShellPageKey) {
  const meta: Record<ShellPageKey, { eyebrow: string; title: string; subtitle: string }> = {
    home: { eyebrow: "公开游戏世界", title: "本周情报", subtitle: "只展示 Bungie 公开接口与经过校验的公开机器数据，不猜测缺失内容。" },
    account: { eyebrow: "账号", title: "角色与账号数据", subtitle: "角色装备、背包、活动、材料和邮政官均来自当前 Profile 快照。" },
    vault: { eyebrow: "装备管理", title: "仓库工作台", subtitle: "真实工作流分为筛选列表、清理工作台、同名对比和推荐数据。" },
    loadouts: { eyebrow: "配装", title: "配装工作台", subtitle: "集中处理本地模板和 Bungie 游戏内配装栏的补齐、应用、覆盖与差异。" },
    library: { eyebrow: "资料库", title: "装备与 Perk 查询", subtitle: "使用本地 Manifest 搜索定义、版本、Perk 池、获取来源和账号持有实例。" },
    vendors: { eyebrow: "商人", title: "地点与商人库存", subtitle: "先按地点分组定位商人，再查看库存、子库存、任务、声望和等级奖励。" },
    settings: { eyebrow: "设置", title: "应用与数据", subtitle: "管理界面语言、账号读取、资料库、Bungie 接口、AI、备份和诊断。" }
  };
  const actions: Partial<Record<ShellPageKey, ReactNode>> = {
    home: (
      <>
        <ControlButton variant="primary">重新读取公开情报</ControlButton>
      </>
    ),
    account: <><ControlButton>刷新账号</ControlButton><ControlButton>重新授权</ControlButton></>,
    vault: <ControlButton variant="primary">刷新账号装备</ControlButton>,
    library: <><ControlButton>重新检查资料库</ControlButton><ControlButton variant="primary">修复资料库</ControlButton></>,
    vendors: <ControlButton variant="primary">刷新商人库存</ControlButton>
  };

  return { ...meta[page], actions: actions[page] };
}

type PrototypeWeaponModel = ComponentProps<typeof WeaponDetailContent>["model"];
type PrototypeWeaponAnalysis = NonNullable<ComponentProps<typeof WeaponDetailContent>["analysis"]>;
type PrototypePersonalKnowledge = NonNullable<ComponentProps<typeof WeaponDetailContent>["personalKnowledge"]>[number];
type PrototypeWeaponObjectKind = PrototypeWeaponModel["context"]["kind"];
type PrototypeWeaponRarity = "legendary" | "exotic";
type PrototypeCharacter = "猎人" | "泰坦" | "术士";
type PrototypeInstanceRuntime = Record<string, {
  location: string;
  source_kind: "equipped" | "inventory" | "vault";
  source_character_id?: string;
  locked: boolean;
  equipped: boolean;
}>;

const prototypeCharacterIds: Record<PrototypeCharacter, string> = {
  猎人: "char-hunter",
  泰坦: "char-titan",
  术士: "char-warlock"
};

const initialPrototypeInstanceRuntime: PrototypeInstanceRuntime = {
  "instance-4401-a": { location: "泰坦已装备", source_kind: "equipped", source_character_id: "char-titan", locked: true, equipped: true },
  "instance-4401-b": { location: "仓库", source_kind: "vault", locked: false, equipped: false }
};

const prototypeVendorContext: VendorOfferContextView = {
  vendorName: "枪匠班希-44",
  inventoryPath: "高塔 / 枪匠 / 武器",
  costLabel: "30 枪匠材料 + 7,000 微光",
  affordabilityLabel: "材料充足 · 可以购买",
  characterLabel: "泰坦角色库存",
  refreshLabel: "周三 01:00 刷新",
  purchaseRequirements: [],
  rollLabels: ["箭头制退器", "战术弹匣", "爆破专家", "狂暴"]
};

const prototypePersonalKnowledge: PrototypePersonalKnowledge[] = [{
  id: "prototype-personal-pve",
  weapon_name: "边界裁决",
  weapon_hash: 4401,
  mode: "pve",
  title: "我的高难 PvE 配置",
  perk_options: [
    { column_key: "特性 1", names: ["爆破专家"] },
    { column_key: "特性 2", names: ["狂暴", "斩首武器"] }
  ],
  masterwork_names: ["装填速度"],
  mod_names: ["备用弹匣"],
  reason: "优先保证手雷循环，并在首领阶段保留稳定增伤。",
  enabled: true,
  origin: "user",
  created_at: "2026-07-15T08:00:00.000Z",
  updated_at: "2026-07-16T08:00:00.000Z"
}];

function createPrototypeWeaponModel(input: {
  kind: PrototypeWeaponObjectKind;
  rarity: PrototypeWeaponRarity;
  selectedVersionHash: number;
  selectedInstanceId: string;
  instanceRuntime: PrototypeInstanceRuntime;
  pendingPerkHash: number | null;
  vendorDetail: { item: VendorInventoryItemView; context: VendorOfferContextView } | null;
}): PrototypeWeaponModel {
  const exotic = input.rarity === "exotic";
  const name = exotic ? "裂界回响" : "边界裁决";
  const hash = exotic ? 5501 : input.selectedVersionHash;
  const accountInstance = input.kind === "account_instance";
  const vendorOffer = input.kind === "vendor_offer";
  const selectedInstanceId = input.selectedInstanceId in input.instanceRuntime ? input.selectedInstanceId : "instance-4401-a";
  const selectedInstanceRuntime = input.instanceRuntime[selectedInstanceId];
  const icon = prototypeWeaponIcon(exotic ? "异" : "脉", exotic ? "#c18a24" : "#3f6f8f");
  const barrel = perk(7101, "箭头制退器", "显著控制后坐方向并提高操控。", "管", "#52677a");
  const barrelAlternative = perk(7102, "小口径", "提高射程与稳定性。", "管", "#4b6b5b");
  const magazine = perk(7201, "战术弹匣", "提高稳定性、装填速度和弹匣容量。", "匣", "#5b6470");
  const demolitionist = perk(7301, "爆破专家", "击杀可回复手雷能量，投掷手雷会装填武器。", "爆", "#377a63");
  const frenzy = perk(7401, "狂暴", "长时间处于战斗后提高伤害、操控与装填。", "狂", "#83593d");
  const vorpal = perk(7402, "斩首武器", "对首领、载具和超能状态目标造成额外伤害。", "首", "#79506b");
  const exoticTrait = perk(7501, "裂隙共振", "连续命中会积累共振并释放元素冲击。", "裂", "#9a7423");
  const origin = perk(7601, "前线补给", "击破强敌后短暂提高装填与稳定性。", "源", "#485e76");
  const baseTrait = selectedInstanceId === "instance-4401-b" ? vorpal : frenzy;
  const selectedTrait = input.pendingPerkHash === vorpal.hash
    ? vorpal
    : input.pendingPerkHash === frenzy.hash
      ? frenzy
      : baseTrait;
  const selectedBarrel = selectedInstanceId === "instance-4401-b" ? barrelAlternative : barrel;
  const versions = exotic ? [{ hash: 5501, label: "裂界回响", season_label: "异域档案", is_current: true }] : [
    { hash: 4401, label: "边界裁决", season_label: "当前版本", is_current: hash === 4401 },
    { hash: 4402, label: "边界裁决（专家）", season_label: "专家版本", is_current: hash === 4402 }
  ];

  return {
    identity: {
      hash,
      name: input.vendorDetail?.item.name && vendorOffer ? input.vendorDetail.item.name : name,
      description: exotic
        ? "实验性异域脉冲步枪，以连续命中积累元素共振。"
        : "在漫长边境线上服役的高冲击脉冲步枪。",
      icon: input.vendorDetail?.item.iconUrl && vendorOffer ? input.vendorDetail.item.iconUrl : icon,
      item_type: exotic ? "异域脉冲步枪" : "传说脉冲步枪",
      tier: exotic ? "异域" : "传说",
      slot: "能量武器",
      ammo: { key: "primary", label: "主要弹药" },
      damage: { hash: 3454344768, key: "void", label: "虚空", icon: prototypeWeaponIcon("虚", "#6650a4") },
      frame: { key: exotic ? "exotic" : "high_impact", name: exotic ? "异域框架" : "高冲击框架" },
      champion: { key: "barrier", label: "屏障勇士", effect_label: "贯穿护盾", icon: prototypeWeaponIcon("盾", "#b15b45"), source: exotic ? "frame_perk" : "plug" }
    },
    context: {
      kind: input.kind,
      entry: vendorOffer ? "vendor" : accountInstance ? "vault" : "library",
      entry_label: vendorOffer ? "商人" : accountInstance ? "仓库" : "资料库",
      object_label: vendorOffer ? "商人 Offer" : accountInstance ? selectedInstanceRuntime.location : "装备定义",
      object_id: vendorOffer ? "offer-4401" : accountInstance ? selectedInstanceId : undefined,
      read_only: !accountInstance
    },
    versions,
    stats: prototypeWeaponStats(accountInstance || vendorOffer, input.pendingPerkHash, selectedInstanceId),
    configuration: {
      kind: exotic ? "fixed" : "random_roll",
      intrinsic: exotic ? exoticTrait : perk(7001, "高冲击框架", "静止或缓慢移动时更精准。", "框", "#46515c"),
      selection_columns: accountInstance || vendorOffer ? [
        selectionColumn("barrel", 0, "枪管", "barrel", [selectable(barrel, selectedBarrel.hash === barrel.hash, false, accountInstance), selectable(barrelAlternative, selectedBarrel.hash === barrelAlternative.hash, input.pendingPerkHash === barrelAlternative.hash, accountInstance)]),
        selectionColumn("magazine", 1, "弹匣", "magazine", [selectable(magazine, true, false, false)]),
        selectionColumn("trait-1", 2, "特性 1", "trait", [selectable(demolitionist, true, false, false)]),
        selectionColumn("trait-2", 3, "特性 2", "trait", [selectable(frenzy, selectedTrait.hash === frenzy.hash, input.pendingPerkHash === frenzy.hash, accountInstance), selectable(vorpal, selectedTrait.hash === vorpal.hash, input.pendingPerkHash === vorpal.hash, accountInstance)]),
        selectionColumn("origin", 4, "起源特性", "origin", [selectable(origin, true, false, false)])
      ] : [],
      pool_columns: exotic ? [] : [
        poolColumn("barrel", 0, "枪管", "barrel", [barrel, barrelAlternative]),
        poolColumn("magazine", 1, "弹匣", "magazine", [magazine, perk(7202, "附加弹匣", "大幅提高弹匣容量。", "匣", "#626a72")]),
        poolColumn("trait-1", 2, "特性 1", "trait", [demolitionist, perk(7302, "维持生计", "击杀会部分装填弹匣。", "续", "#426e5f")]),
        poolColumn("trait-2", 3, "特性 2", "trait", [frenzy, vorpal]),
        poolColumn("origin", 4, "起源特性", "origin", [origin])
      ],
      has_pending_changes: accountInstance && input.pendingPerkHash !== null,
      can_apply_changes: accountInstance && input.pendingPerkHash !== null
    },
    sources: {
      status: "ready",
      updated_at: "2026-07-16T09:00:00.000Z",
      entries: [
        { id: "activity-1", kind: "activity_reward", label: exotic ? "异域任务：裂界信号" : "永夜打击任务", description: exotic ? "完成异域任务后获取固定配置。" : "完成活动后有概率掉落。", available_now: true, updated_at: "2026-07-16T09:00:00.000Z" },
        ...(vendorOffer ? [{ id: "vendor-1", kind: "vendor_offer" as const, label: input.vendorDetail?.context.vendorName ?? prototypeVendorContext.vendorName, description: "当前角色库存已确认售卖。", available_now: true, updated_at: "2026-07-16T09:00:00.000Z", offer: { offer_id: "offer-4401", vendor_hash: 672118013, vendor_name: prototypeVendorContext.vendorName, inventory_path: prototypeVendorContext.inventoryPath, price_labels: [prototypeVendorContext.costLabel], refresh_at: prototypeVendorContext.refreshLabel, can_purchase: true, purchase_requirements: prototypeVendorContext.purchaseRequirements ?? [], failure_messages: [] } }] : [])
      ]
    },
    upgrades: exotic ? {
      catalyst: { name: "裂界稳定器", acquired: true, complete: false, progress: 68, objective: "使用裂界回响击败目标", acquisition: "异域任务后续步骤", effects: ["延长共振持续时间", "提高装填速度"] },
      enhanced: false
    } : {
      masterwork: { name: "装填速度", level: 10, complete: true, stat_key: "reload_speed", stat_amount: 10 },
      mod: perk(7901, "备用弹匣", "提高弹匣容量。", "模", "#4f6272"),
      crafting_level: 37,
      enhanced: true
    },
    recommendations: [{
      id: `${exotic ? "exotic" : "legendary"}-builtin-pve`,
      mode: "pve",
      title: exotic ? "共振循环" : "爆破狂暴",
      reason: exotic ? "围绕异域特性维持连续命中。" : "爆破专家负责技能循环，狂暴覆盖持续战斗增伤。",
      source: "builtin",
      source_label: "社区推荐",
      updated_at: "2026-07-16T08:00:00.000Z",
      perk_options: exotic ? [{ column_key: "异域特性", names: ["裂隙共振"] }] : [{ column_key: "特性 1", names: ["爆破专家"] }, { column_key: "特性 2", names: ["狂暴", "斩首武器"] }],
      masterwork_names: exotic ? [] : ["装填速度"],
      mod_names: exotic ? [] : ["备用弹匣"],
      match: accountInstance ? "full" : "not_applicable",
      match_notes: accountInstance ? ["当前实例已选爆破专家。", "特性 2 可在狂暴与斩首武器之间切换。"] : ["当前对象不是账号实例，不执行 Roll 命中判断。"]
    }],
    personal_targets: exotic ? [] : [{
      id: "legendary-dim-target",
      mode: "pve",
      title: "DIM 导入目标",
      reason: "这是用户导入的个人目标，不属于应用默认推荐。",
      source: "dim",
      source_label: "DIM 愿望单",
      perk_options: [{ column_key: "特性 1", names: ["爆破专家"] }, { column_key: "特性 2", names: ["斩首武器"] }],
      masterwork_names: [],
      mod_names: [],
      match: accountInstance && selectedInstanceId === "instance-4401-b" ? "full" : accountInstance ? "partial" : "not_applicable",
      match_notes: accountInstance ? [selectedInstanceId === "instance-4401-b" ? "当前实例命中个人目标。" : "当前实例部分命中个人目标。"] : ["选择账号实例后比较个人目标。"]
    }],
    same_hash_instances: [
      {
        item_key: "instance-4401-a",
        instance_id: "instance-4401-a",
        hash,
        name,
        icon,
        power: 2020,
        location: input.instanceRuntime["instance-4401-a"].location,
        source_kind: input.instanceRuntime["instance-4401-a"].source_kind,
        source_character_id: input.instanceRuntime["instance-4401-a"].source_character_id,
        locked: input.instanceRuntime["instance-4401-a"].locked,
        equipped: input.instanceRuntime["instance-4401-a"].equipped,
        local_tag: "keep",
        note: "高难 PvE 常用实例。",
        upgrade_status: exotic
          ? { catalyst: { name: "裂界稳定器", acquired: true, complete: false, progress: 68, effects: [] }, enhanced: false }
          : { masterwork: { name: "装填速度", level: 10, complete: true }, mod: perk(7901, "备用弹匣", "提高弹匣容量。", "模", "#4f6272"), crafting_level: 37, enhanced: true },
        loadout_references: [{ id: "in-game:char-titan:1", name: "虚空高难", kind: "in_game", character_id: "char-titan", loadout_index: 1 }],
        current: accountInstance && selectedInstanceId === "instance-4401-a",
        plug_names: exotic ? ["裂隙共振"] : ["箭头制退器", "战术弹匣", "爆破专家", "狂暴"]
      },
      {
        item_key: "instance-4401-b",
        instance_id: "instance-4401-b",
        hash,
        name,
        icon,
        power: 2010,
        location: input.instanceRuntime["instance-4401-b"].location,
        source_kind: input.instanceRuntime["instance-4401-b"].source_kind,
        source_character_id: input.instanceRuntime["instance-4401-b"].source_character_id,
        locked: input.instanceRuntime["instance-4401-b"].locked,
        equipped: input.instanceRuntime["instance-4401-b"].equipped,
        local_tag: "review",
        current: accountInstance && selectedInstanceId === "instance-4401-b",
        plug_names: exotic ? ["裂隙共振"] : ["小口径", "战术弹匣", "爆破专家", "斩首武器"]
      }
    ],
    loading: false
  };
}

function prototypeWeaponStats(hasCurrent: boolean, pendingPerkHash: number | null, selectedInstanceId: string): PrototypeWeaponModel["stats"] {
  const pendingBarrel = hasCurrent && pendingPerkHash === 7102;
  const secondInstance = selectedInstanceId === "instance-4401-b";
  return [
    stat("impact", "伤害", 33, hasCurrent ? 33 : undefined),
    stat("range", "射程", 61, hasCurrent ? secondInstance ? 74 : 68 : undefined, secondInstance ? 13 : 7, [{ source: secondInstance ? "小口径与大师杰作" : "枪管与大师杰作", amount: secondInstance ? 13 : 7 }], pendingBarrel ? 76 : undefined),
    stat("stability", "稳定性", 54, hasCurrent ? secondInstance ? 66 : 59 : undefined, secondInstance ? 12 : 5, [{ source: secondInstance ? "小口径与战术弹匣" : "战术弹匣", amount: secondInstance ? 12 : 5 }], pendingBarrel ? 66 : undefined),
    stat("handling", "操控性", 42, hasCurrent ? secondInstance ? 42 : 52 : undefined, secondInstance ? 0 : 10, secondInstance ? [] : [{ source: "箭头制退器", amount: 10 }], pendingBarrel ? 42 : undefined),
    stat("reload_speed", "装填速度", 48, hasCurrent ? 63 : undefined, 15, [{ source: "战术弹匣与大师杰作", amount: 15 }]),
    stat("magazine", "弹匣", 36, hasCurrent ? 39 : undefined, 3, [{ source: "战术弹匣", amount: 3 }]),
    stat("rounds_per_minute", "射速", 340, hasCurrent ? 340 : undefined),
    stat("recoil_direction", "后坐方向", 68, hasCurrent ? 98 : undefined, 30, [{ source: "箭头制退器", amount: 30 }])
  ];
}

function stat(
  key: PrototypeWeaponModel["stats"][number]["key"],
  label: string,
  standard: number,
  current?: number,
  delta?: number,
  modifiers: PrototypeWeaponModel["stats"][number]["current_modifiers"] = [],
  pending?: number
): PrototypeWeaponModel["stats"][number] {
  return {
    key,
    label,
    direction: key === "rounds_per_minute" ? "neutral" : "higher",
    availability: current === undefined ? "definition_only" : "ready",
    standard_value: standard,
    current_value: current,
    current_delta: delta,
    current_modifiers: modifiers,
    pending_value: pending,
    pending_delta: pending !== undefined && current !== undefined ? pending - current : undefined,
    pending_modifiers: pending !== undefined ? [{ source: "待应用枪管", amount: pending - (current ?? pending) }] : []
  };
}

function perk(hash: number, name: string, description: string, symbol: string, color: string) {
  return { hash, name, description, icon: prototypeWeaponIcon(symbol, color) };
}

function selectable(candidate: ReturnType<typeof perk>, selected: boolean, pending: boolean, canApply: boolean) {
  return { ...candidate, selected, pending, can_apply: canApply, unresolved_in_definition_pool: false };
}

function selectionColumn(key: string, socket_index: number, label: string, role: PrototypeWeaponModel["configuration"]["selection_columns"][number]["role"], candidates: PrototypeWeaponModel["configuration"]["selection_columns"][number]["candidates"]): PrototypeWeaponModel["configuration"]["selection_columns"][number] {
  return { key, socket_index, label, role, candidates };
}

function poolColumn(key: string, socket_index: number, label: string, role: PrototypeWeaponModel["configuration"]["pool_columns"][number]["role"], candidates: PrototypeWeaponModel["configuration"]["pool_columns"][number]["candidates"]): PrototypeWeaponModel["configuration"]["pool_columns"][number] {
  return { key, socket_index, label, role, candidates };
}

function prototypeWeaponIcon(symbol: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="8" fill="${color}"/><path d="M18 58h42l12-18h8v28H68l-8-8H18z" fill="#fff" opacity=".28"/><text x="48" y="56" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" fill="#fff">${symbol}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
