import { createRoot } from "react-dom/client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  getVendorEquipmentKind,
  type HomeWeeklyActivityReward,
  type LibraryEquipmentFilter,
  type LibraryPerkFilter,
  type LibraryViewMode,
  type ProductPreferences,
  type ShellAssistantMode,
  type ShellPageKey,
  type SettingsAiAdapter,
  type VendorInventoryItemView,
  type VendorOfferContextView
} from "@d2-tools/ui";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import { createHomeWeeklyActivityRewardDetailTarget } from "@d2-tools/app/home";
import {
  buildArmorDetailViewModel,
  buildWeaponDetailViewModel,
  type ArmorDetailViewModel,
  type WeaponDetailViewModel
} from "@d2-tools/app/items";
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
  const initialTheme = env.VITE_D2_VISUAL_THEME === "light" ? "light" : "dark";
  const adapter = useMemo(() => createWebShellAdapter(), []);
  const [snapshot, setSnapshot] = useState<WebHomeSnapshot>(fallbackHomeSnapshot);
  const [assistantMode, setAssistantMode] = useState<ShellAssistantMode>(null);
  const [activePage, setActivePage] = useState<ShellPageKey>("home");
  const [preferences, setPreferences] = useState<ProductPreferences>({
    ...defaultProductPreferences,
    colorMode: initialTheme
  });
  const [settingsSection, setSettingsSection] = useState<"overview" | "account">("overview");
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
  const [armorDetailModel, setArmorDetailModel] = useState<ArmorDetailViewModel | null>(null);
  const [weaponDetailModel, setWeaponDetailModel] = useState<WeaponDetailViewModel | null>(null);
  const [weeklyRewardDetail, setWeeklyRewardDetail] = useState<{
    name: string;
    itemType?: string;
    armor?: ArmorDetailViewModel;
    weapon?: WeaponDetailViewModel;
  } | null>(null);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [taskDraft, setTaskDraft] = useState("虚空猎人高难配装，需要反屏障脉冲步枪、奥菲斯钻机，韧性与纪律优先。");
  const [taskMessage, setTaskMessage] = useState("Web mock：攻略文本已准备，可继续解析和对照账号。");
  const [assistantMessages, setAssistantMessages] = useState(() => fixture.assistantInitialMessages);
  const [isAssistantSessionDrawerOpen, setIsAssistantSessionDrawerOpen] = useState(false);
  const [isAssistantContextDrawerOpen, setIsAssistantContextDrawerOpen] = useState(false);
  const platformActions = useMemo(() => ({
    openExternal: adapter.openExternal
  }), [adapter]);
  const aiSettingsAdapter = useMemo<SettingsAiAdapter>(() => ({
    load: async () => ({ protocol: "openai_responses", provider: "", api_key: "web-fixture-key", model: "gpt-5-mini", base_url: "https://api.example.com/v1", enable_lightgg: true, force_lightgg: false }),
    save: async () => undefined,
    listModels: async () => ({ models: ["gpt-5-mini", "gpt-5", "claude-sonnet-4"], message: "Web fixture 模型列表。" }),
    testConnection: async () => ({ protocol: "openai_responses", model: "gpt-5-mini", message: "Web fixture 连接成功。" }),
    clearLightggCache: async () => undefined
  }), []);
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

  function openWeeklyReward(reward: HomeWeeklyActivityReward) {
    const target = createHomeWeeklyActivityRewardDetailTarget(reward);
    setArmorDetailModel(null);
    setWeaponDetailModel(null);
    setWeeklyRewardDetail(target.group_key === "armor"
      ? { name: target.name, itemType: target.item_type, armor: buildArmorDetailViewModel({ item: target }) }
      : { name: target.name, itemType: target.item_type, weapon: buildWeaponDetailViewModel({ item: target }) });
  }

  function openWebAccountItem(item: AccountItemSummary, entry: "account" | "vault") {
    if (item.group_key !== "weapons" && item.group_key !== "armor") return;
    const entryLabel = entry === "vault" ? "仓库" : "账号";
    const target = createAccountItemDetailTarget(item, entryLabel);

    setWeeklyRewardDetail(null);
    if (item.group_key === "armor") {
      setWeaponDetailModel(null);
      setArmorDetailModel(buildArmorDetailViewModel({
        item: target,
        context: {
          kind: "account_item",
          entry,
          entry_label: entryLabel,
          object_label: "账号护甲实例",
          object_id: item.instance_id,
          read_only: true
        }
      }));
      return;
    }

    setArmorDetailModel(null);
    setWeaponDetailModel(buildWeaponDetailViewModel({
      item: target,
      context: {
        kind: "account_instance",
        entry,
        entry_label: entryLabel,
        object_label: "账号武器实例",
        object_id: item.instance_id,
        read_only: true
      }
    }));
  }

  function openWebVendorDetail(item: VendorInventoryItemView, context: VendorOfferContextView) {
    const equipmentKind = getVendorEquipmentKind(item);
    if (!equipmentKind || item.itemHash === undefined) return;
    const target = createVendorDetailTarget(item, context);

    setWeeklyRewardDetail(null);
    if (equipmentKind === "armor") {
      setWeaponDetailModel(null);
      setArmorDetailModel(buildArmorDetailViewModel({
        item: target,
        context: {
          kind: "vendor_offer",
          entry: "vendor",
          entry_label: context.vendorName,
          object_label: "商人售卖护甲",
          object_id: String(item.itemHash),
          read_only: true
        }
      }));
      return;
    }

    setArmorDetailModel(null);
    setWeaponDetailModel(buildWeaponDetailViewModel({
      item: target,
      context: {
        kind: "vendor_offer",
        entry: "vendor",
        entry_label: context.vendorName,
        object_label: "商人售卖武器",
        object_id: String(item.itemHash),
        read_only: true
      }
    }));
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
    <>
    <ProductShellHost
      activePage={activePage}
      onPageChange={setActivePage}
      preferences={preferences}
      onPreferencesChange={setPreferences}
      assistantMode={assistantMode}
      onAssistantModeChange={setAssistantMode}
      shellStatus={snapshot.shellStatus}
      sidebarHeader={(
        <ShellSidebarAccountSummary
          accountName={fixture.accountSummary.account_name}
          characterCount={fixture.accountSummary.characters.length}
          vaultItemCount={vaultModel.vaultItemCount}
          vaultCapacity={fixture.accountSummary.vault.capacity}
        />
      )}
      sidebarFooter={<ShellSidebarActions isAiOpen={assistantMode !== null} onToggleAi={() => setAssistantMode((current) => current === null ? "ai" : null)} />}
      pageHeader={(page) => getWebPageHeader(page)}
      assistantPanel={(
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
              { title: "解析攻略", items: ["职业：猎人 · 子职业：虚空", "异域护甲：奥菲斯钻机", "武器要求：反屏障脉冲步枪"] },
              { title: "账号命中", items: ["奥菲斯钻机：账号实例已确认", "脉冲步枪：仓库 3 件"] },
              { title: "缺口与待确认", items: ["缺口 0 项", "待确认 1 项"] }
            ]}
            contextGroups={[{ title: "当前页面证据", items: assistantContext.facts }]}
            canParse={Boolean(taskDraft.trim())}
            canMatch={Boolean(taskDraft.trim())}
            canCreateDraft
            canSaveDraft
            onDraftChange={setTaskDraft}
            onSaveContext={() => setTaskMessage("Web mock：攻略上下文已保存。")}
            onClearContext={() => { setTaskDraft(""); setTaskMessage("Web mock：攻略上下文已清空。"); }}
            onParse={() => setTaskMessage("Web mock：攻略已解析。")}
            onMatch={() => setTaskMessage("Web mock：账号对照完成。")}
            onCreateDraft={() => setTaskMessage("Web mock：配装草稿已生成。")}
            onSaveDraft={() => setTaskMessage("Web mock：配装草稿已保存。")}
            onReviewGaps={() => setTaskMessage("Web mock：缺口 0 项，待确认 1 项。")}
          />
        ) : <AiAssistantPanelView
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
              onNavigate={setActivePage}
              onRefreshDiagnostics={() => undefined}
              onOpenWeeklyActivityReward={openWeeklyReward}
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
                openItem: (payload) => openWebAccountItem(payload.item, "account")
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
              onOpenItem={(item) => openWebAccountItem(item, "vault")}
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
                onOpenItemDetail: (item) => {
                  setWeeklyRewardDetail(null);
                  if (item.group_key === "armor") {
                    setWeaponDetailModel(null);
                    setArmorDetailModel(buildArmorDetailViewModel({ item }));
                    return;
                  }
                  if (item.group_key === "weapons") {
                    setArmorDetailModel(null);
                    setWeaponDetailModel(buildWeaponDetailViewModel({ item }));
                  }
                },
                onAddFavorite: () => undefined,
                onRemoveFavorite: () => undefined
              }}
            />
          ) : null}
          {activePage === "vendors" ? (
            <VendorsPageContentView
              interfaceLocale={preferences.interfaceLocale}
              model={fixture.vendorsModel}
              actions={{ onOpenItem: openWebVendorDetail }}
            />
          ) : null}
          {activePage === "settings" ? (
            <SettingsPageContentView
              {...fixture.createSettingsPageModel({
                interfaceLocale: preferences.interfaceLocale,
                initialSection: settingsSection,
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
        </>
      )}
    />
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
    {weaponDetailModel ? (
      <SharedItemDetailDialog
        detail={{ name: weaponDetailModel.identity.name }}
        variant="weapon"
        subtitle={`${weaponDetailModel.context.entry_label} · ${weaponDetailModel.context.object_label}`}
        objectContext="只读查看"
        closeLabel="关闭武器详情"
        onClose={() => setWeaponDetailModel(null)}
        sections={<WeaponDetailContent model={weaponDetailModel} />}
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
    </>
  );
}

createRoot(document.getElementById("root")!).render(<WebApp />);

function createAccountItemDetailTarget(item: AccountItemSummary, entryLabel: string) {
  return {
    ...item,
    description: "",
    source: {
      status: "ready" as const,
      label: entryLabel,
      description: `${entryLabel}中的账号装备实例。`
    }
  };
}

function createVendorDetailTarget(item: VendorInventoryItemView, context: VendorOfferContextView) {
  const equipmentKind = getVendorEquipmentKind(item);
  return {
    hash: item.itemHash ?? 0,
    name: item.name,
    description: item.summary,
    icon: item.iconUrl,
    item_type: item.itemType,
    tier: item.tone === "exotic" ? "异域" : undefined,
    group_key: equipmentKind === "armor" ? "armor" : "weapons",
    source: {
      status: "ready" as const,
      label: "商人售卖",
      description: context.inventoryPath ?? context.vendorName
    }
  };
}

function getWebPageHeader(page: ShellPageKey) {
  const actions: Partial<Record<ShellPageKey, ReactNode>> = {
    home: <ControlButton variant="primary">重新读取公开情报</ControlButton>,
    account: <><ControlButton>刷新账号</ControlButton><ControlButton>重新授权</ControlButton></>,
    vault: <ControlButton variant="primary">刷新账号装备</ControlButton>,
    library: <><ControlButton>重新检查资料库</ControlButton><ControlButton variant="primary">修复资料库</ControlButton></>,
    vendors: <ControlButton variant="primary">刷新商人库存</ControlButton>
  };

  return {
    title: "",
    subtitle: "",
    actions: actions[page]
  };
}
