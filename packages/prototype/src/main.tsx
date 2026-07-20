import { createRoot } from "react-dom/client";
import { useMemo, useState, type ComponentProps } from "react";
import {
  AccountPageContentView,
  AiAssistantPanelView,
  ArmorDetailContent,
  defaultProductPreferences,
  HomePageContentView,
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
  type ShellAssistantMode,
  type ShellPageKey,
  type VendorInventoryItemView,
  type VendorOfferContextView,
} from "@d2-tools/ui";
import { homePageMetaMap } from "@d2-tools/app/home";
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
  const [vendorDetail, setVendorDetail] = useState<{
    item: VendorInventoryItemView;
    context: VendorOfferContextView;
  } | null>(null);
  const [genericVendorDetail, setGenericVendorDetail] = useState<{
    item: VendorInventoryItemView;
    context: VendorOfferContextView;
  } | null>(null);
  const [isWeaponDetailOpen, setIsWeaponDetailOpen] = useState(true);
  const [isArmorDetailOpen, setIsArmorDetailOpen] = useState(false);
  const [weaponObjectKind, setWeaponObjectKind] = useState<PrototypeWeaponObjectKind>("account_instance");
  const [weaponRarity, setWeaponRarity] = useState<PrototypeWeaponRarity>("legendary");
  const [selectedWeaponVersionHash, setSelectedWeaponVersionHash] = useState(4401);
  const [selectedWeaponInstanceId, setSelectedWeaponInstanceId] = useState("instance-4401-a");
  const [prototypeInstanceRuntime, setPrototypeInstanceRuntime] = useState<PrototypeInstanceRuntime>(initialPrototypeInstanceRuntime);
  const [prototypeActionCharacter, setPrototypeActionCharacter] = useState<PrototypeCharacter>("泰坦");
  const [prototypeActionMessage, setPrototypeActionMessage] = useState("");
  const [pendingWeaponPerkHash, setPendingWeaponPerkHash] = useState<number | null>(null);
  const [weaponAnalysis, setWeaponAnalysis] = useState<PrototypeWeaponAnalysis>({ status: "idle" });
  const [armorObjectKind, setArmorObjectKind] = useState<PrototypeArmorObjectKind>("account_instance");
  const [selectedArmorInstanceId, setSelectedArmorInstanceId] = useState("armor-instance-a");
  const [armorAnalysis, setArmorAnalysis] = useState<PrototypeArmorAnalysis>({ status: "idle" });
  const [personalWeaponKnowledge, setPersonalWeaponKnowledge] = useState<PrototypePersonalKnowledge[]>(prototypePersonalKnowledge);
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
  const prototypeArmorModel = useMemo(
    () => createPrototypeArmorModel(armorObjectKind, selectedArmorInstanceId, vendorDetail),
    [armorObjectKind, selectedArmorInstanceId, vendorDetail]
  );

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
                onOpenItemDetail: (item) => {
                  if (item.group_key === "armor") {
                    setArmorObjectKind("definition");
                    setArmorAnalysis({ status: "idle" });
                    setIsWeaponDetailOpen(false);
                    setIsArmorDetailOpen(true);
                    return;
                  }
                  if (item.group_key !== "weapons") return;
                  const exotic = /异域|exotic/i.test(item.tier ?? "");
                  setWeaponObjectKind("definition");
                  setWeaponRarity(exotic ? "exotic" : "legendary");
                  setSelectedWeaponVersionHash(exotic ? 5501 : 4401);
                  setPendingWeaponPerkHash(null);
                  setIsArmorDetailOpen(false);
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
               actions={{ onOpenItem: (item, context) => {
                 if (item.tone === "armor") {
                   setGenericVendorDetail(null);
                   setVendorDetail({ item, context });
                   setArmorObjectKind("vendor_offer");
                   setArmorAnalysis({ status: "idle" });
                   setIsWeaponDetailOpen(false);
                   setIsArmorDetailOpen(true);
                   return;
                 }
                 if (!isPrototypeWeaponItem(item)) {
                   setGenericVendorDetail({ item, context });
                   setVendorDetail(null);
                   setIsWeaponDetailOpen(false);
                   setIsArmorDetailOpen(false);
                   return;
                 }
                 setGenericVendorDetail(null);
                 setVendorDetail({ item, context });
                 setWeaponObjectKind("vendor_offer");
                setWeaponRarity(item.tone === "exotic" ? "exotic" : "legendary");
                setIsArmorDetailOpen(false);
                setIsWeaponDetailOpen(true);
              } }}
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
                <div className="button-row">
                  <button type="button" onClick={() => { setIsArmorDetailOpen(false); setIsWeaponDetailOpen(true); }}>打开武器详情验收</button>
                  <button type="button" onClick={() => { setIsWeaponDetailOpen(false); setIsArmorDetailOpen(true); }}>打开护甲详情验收</button>
                </div>
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
                            { label: "应用推荐", value: prototypeWeaponModel.recommendations[0]?.title ?? "无" },
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
                            <button type="button" className="secondary-button" onClick={() => {
                              setPrototypeInstanceRuntime((current) => ({ ...current, [selectedWeaponInstanceId]: { ...current[selectedWeaponInstanceId], locked: !current[selectedWeaponInstanceId].locked } }));
                              setPrototypeActionMessage(prototypeInstanceRuntime[selectedWeaponInstanceId].locked ? "已模拟解锁当前实例。" : "已模拟锁定当前实例。");
                            }}>{prototypeInstanceRuntime[selectedWeaponInstanceId].locked ? "解锁" : "锁定"}</button>
                            <button type="button" className="secondary-button" onClick={() => {
                              const selected = prototypeInstanceRuntime[selectedWeaponInstanceId];
                              const movingToVault = selected.source_kind !== "vault";
                              setPrototypeInstanceRuntime((current) => ({ ...current, [selectedWeaponInstanceId]: movingToVault
                                ? { ...current[selectedWeaponInstanceId], location: "仓库", source_kind: "vault", source_character_id: undefined, equipped: false }
                                : { ...current[selectedWeaponInstanceId], location: `${prototypeActionCharacter}背包`, source_kind: "inventory", source_character_id: prototypeCharacterIds[prototypeActionCharacter], equipped: false } }));
                              setPrototypeActionMessage(movingToVault ? "已模拟移入仓库。" : `已模拟转移到${prototypeActionCharacter}背包。`);
                            }}>{prototypeInstanceRuntime[selectedWeaponInstanceId].source_kind === "vault" ? "取出到角色" : "移入仓库"}</button>
                            <button type="button" className="secondary-button" onClick={() => {
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
                            <button type="button" className="secondary-button" onClick={() => setPrototypeActionMessage("已模拟加入配装草稿。")}>加入配装草稿</button>
                          </div>
                          {prototypeActionMessage ? <p className="status-message status-ready">{prototypeActionMessage}</p> : null}
                        </section>
                      ) : undefined}
                   />
                 </>
               )}
             />
           ) : null}
           {isArmorDetailOpen ? (
             <SharedItemDetailDialog
               detail={{ name: prototypeArmorModel.identity.name }}
               variant="armor"
               subtitle={`${prototypeArmorModel.context.entry_label} · ${prototypeArmorModel.context.object_label}`}
               objectContext={prototypeArmorModel.context.read_only ? "只读查看" : "可管理实例"}
               closeLabel="关闭装备详情"
               onClose={() => {
                 setIsArmorDetailOpen(false);
                 setVendorDetail(null);
               }}
               sections={(
                 <>
                   <div className="item-detail-game-card" aria-label="护甲详情 Prototype 控制">
                     <div className="button-row">
                       <label>对象
                         <select value={armorObjectKind} onChange={(event) => {
                           setArmorObjectKind(event.target.value as PrototypeArmorObjectKind);
                           setArmorAnalysis({ status: "idle" });
                         }}>
                           <option value="definition">资料库定义</option>
                           <option value="vendor_offer">商人售卖</option>
                           <option value="account_instance">账号实例</option>
                         </select>
                       </label>
                     </div>
                   </div>
                   <ArmorDetailContent
                     model={prototypeArmorModel}
                     analysis={armorAnalysis}
                     actions={{
                       selectInstance: (instance) => {
                         setSelectedArmorInstanceId(instance.instance_id);
                         setArmorObjectKind("account_instance");
                         setArmorAnalysis({ status: "idle" });
                       },
                       runAnalysis: (request) => setArmorAnalysis({
                         status: "ready",
                         title: `${prototypeArmorModel.identity.name} 分析`,
                         body: request.prompt.trim() || "当前实例的生命值与手雷属性较集中，适合继续围绕生存和技能循环构建；是否保留仍应与同 Hash 实例和整套配装目标一起比较。",
                         evidence: [
                           { label: "分析对象", value: prototypeArmorModel.context.object_label },
                           { label: "总属性", value: prototypeArmorModel.stats.total ? String(prototypeArmorModel.stats.total) : "无实际 Roll" },
                           { label: "同名实例", value: `${prototypeArmorModel.same_hash_instances.length} 件` }
                         ],
                         externalSearchMessage: request.allow_external_search ? "Prototype 已模拟外部知识查询；外部内容保持最低优先级。" : "未请求外部知识。"
                       })
                     }}
                     instanceActions={armorObjectKind === "account_instance" ? (
                       <section className="item-action-panel">
                         <div><h3>装备操作</h3><p>Prototype 仅验证真实实例可管理状态，不调用 Bungie API。</p></div>
                         <div className="button-row">
                           <button type="button" className="secondary-button">锁定</button>
                           <button type="button" className="secondary-button">移入仓库</button>
                           <button type="button" className="secondary-button">加入配装草稿</button>
                         </div>
                       </section>
                     ) : undefined}
                   />
                 </>
               )}
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

type PrototypeWeaponModel = ComponentProps<typeof WeaponDetailContent>["model"];
type PrototypeWeaponAnalysis = NonNullable<ComponentProps<typeof WeaponDetailContent>["analysis"]>;
type PrototypeArmorModel = ComponentProps<typeof ArmorDetailContent>["model"];
type PrototypeArmorAnalysis = NonNullable<ComponentProps<typeof ArmorDetailContent>["analysis"]>;
type PrototypeArmorObjectKind = PrototypeArmorModel["context"]["kind"];
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

function createPrototypeArmorModel(
  kind: PrototypeArmorObjectKind,
  selectedInstanceId: string,
  vendorDetail: { item: VendorInventoryItemView; context: VendorOfferContextView } | null
): PrototypeArmorModel {
  const definition = kind === "definition";
  const vendorOffer = kind === "vendor_offer";
  const currentStats = vendorOffer
    ? { health: 22, melee: 8, grenade: 21, super: 7, class: 5, weapon: 4, total: 67 }
    : selectedInstanceId === "armor-instance-b"
      ? { health: 18, melee: 16, grenade: 12, super: 8, class: 7, weapon: 5, total: 66 }
      : { health: 24, melee: 8, grenade: 22, super: 6, class: 5, weapon: 3, total: 68 };
  const baseStats = {
    health: currentStats.health - 10,
    melee: currentStats.melee,
    grenade: currentStats.grenade - 5,
    super: currentStats.super,
    class: currentStats.class,
    weapon: currentStats.weapon
  };
  const statKeys = ["health", "melee", "grenade", "super", "class", "weapon"] as const;
  const statLabels = { health: "生命值", melee: "近战", grenade: "手雷", super: "超能", class: "职业", weapon: "武器" } as const;
  const name = vendorOffer && vendorDetail?.item.tone === "armor" ? vendorDetail.item.name : "风暴导体外衣";

  return {
    identity: {
      hash: 8801,
      name,
      description: "引导电弧能量的泰坦胸部护甲，适合围绕生存与技能循环评估属性。",
      icon: vendorOffer && vendorDetail?.item.tone === "armor" ? vendorDetail.item.iconUrl : undefined,
      item_type: "胸部护甲",
      tier: "异域",
      class_name: "泰坦",
      slot: "胸部护甲"
    },
    context: {
      kind,
      entry: vendorOffer ? "vendor" : definition ? "library" : "vault",
      entry_label: vendorOffer ? "商人" : definition ? "资料库" : "仓库",
      object_label: vendorOffer ? "商人 Offer" : definition ? "装备定义" : selectedInstanceId === "armor-instance-b" ? "仓库实例 B" : "泰坦实例 A",
      object_id: definition ? undefined : vendorOffer ? "offer-8801" : selectedInstanceId,
      read_only: kind !== "account_instance"
    },
    versions: [{ hash: 8801, label: "风暴导体外衣", season_label: "当前版本", is_current: true }],
    stats: {
      available: !definition,
      total: definition ? undefined : currentStats.total,
      base_total: definition ? undefined : currentStats.total - 15,
      mod_total: definition ? undefined : 15,
      masterwork_separable: false,
      tracks: statKeys.map((key) => ({
        key,
        label: statLabels[key],
        available: !definition,
        final_value: definition ? undefined : currentStats[key],
        base_value: definition ? undefined : baseStats[key],
        mod_value: definition ? undefined : currentStats[key] - baseStats[key],
        masterwork_separable: false
      }))
    },
    sources: {
      status: "ready",
      updated_at: "2026-07-20T08:00:00.000Z",
      entries: [
        { id: "armor-source-1", kind: "activity_reward", label: "异域记忆水晶", description: "可从异域护甲奖励池获取。", available_now: true },
        ...(vendorOffer ? [{ id: "armor-vendor-1", kind: "vendor_offer" as const, label: vendorDetail?.context.vendorName ?? "苏尔", description: "当前商人 Offer 已返回实际属性。", available_now: true }] : [])
      ]
    },
    abilities: [{
      id: "trait-armor-1",
      hash: 8811,
      name: "风暴导体",
      description: "电弧能力命中会强化下一次电弧技能循环。",
      kind: "exotic_intrinsic",
      kind_label: "异域固有"
    }],
    upgrades: {
      energy: definition ? undefined : { capacity: 10, used: 7, unused: 3 },
      installed_mods: definition ? [] : [
        { hash: 8821, name: "生命值模组", description: "提高生命值属性。", socket_index: 0 },
        { hash: 8822, name: "手雷模组", description: "提高手雷属性。", socket_index: 1 }
      ],
      special_sockets: [{ id: "socket-artifice", name: "诡计属性插槽", description: "允许安装低成本属性调整模组。", kind: "artifice", kind_label: "诡计护甲" }],
      masterwork: { level: definition ? undefined : 10, complete: !definition, stat_bonus_separable: false }
    },
    recommendations: {
      targets: [{
        id: "armor-target-survival",
        title: "生存与手雷循环",
        source_label: "本地目标",
        reason: definition ? "选择 Offer 或账号实例后比较属性目标。" : "当前对象按实际属性与本地最低值比较。",
        conditions: [
          { stat: "health", label: "生命值", minimum: 20, current: definition ? undefined : currentStats.health, matched: definition ? undefined : currentStats.health >= 20 },
          { stat: "grenade", label: "手雷", minimum: 20, current: definition ? undefined : currentStats.grenade, matched: definition ? undefined : currentStats.grenade >= 20 }
        ],
        match: definition ? "unavailable" : currentStats.health >= 20 && currentStats.grenade >= 20 ? "matched" : "missed"
      }],
      build_fits: definition ? [] : [{ title: "生命值 / 手雷取向", description: `当前最高属性为生命值 ${currentStats.health} 与手雷 ${currentStats.grenade}；需要结合碎片和整套配装目标判断最终可达档位。` }],
      suggested_mods: definition ? [] : currentStats.health < 20 ? ["生命值模组（差 2）"] : currentStats.grenade < 20 ? ["手雷模组（差 8）"] : []
    },
    same_hash_instances: [
      {
        item_key: "armor-instance-a",
        instance_id: "armor-instance-a",
        hash: 8801,
        name: "风暴导体外衣",
        power: 2020,
        location: "泰坦已装备",
        source_kind: "equipped",
        source_character_id: "char-titan",
        locked: true,
        equipped: true,
        local_tag: "keep",
        total: 68,
        stats: { health: 24, melee: 8, grenade: 22, super: 6, class: 5, weapon: 3, total: 68 },
        energy: { capacity: 10, used: 7, unused: 3 },
        plug_names: ["生命值模组", "手雷模组"],
        current: kind === "account_instance" && selectedInstanceId === "armor-instance-a"
      },
      {
        item_key: "armor-instance-b",
        instance_id: "armor-instance-b",
        hash: 8801,
        name: "风暴导体外衣",
        power: 2010,
        location: "仓库",
        source_kind: "vault",
        locked: false,
        equipped: false,
        local_tag: "review",
        total: 66,
        stats: { health: 18, melee: 16, grenade: 12, super: 8, class: 7, weapon: 5, total: 66 },
        energy: { capacity: 8, used: 5, unused: 3 },
        plug_names: ["近战模组"],
        current: kind === "account_instance" && selectedInstanceId === "armor-instance-b"
      }
    ],
    loading: false
  };
}

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
      source_label: "应用推荐",
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
