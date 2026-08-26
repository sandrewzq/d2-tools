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
  GuideLibraryPageContentView,
  getLocaleCopy,
  HomePageContentView,
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
  type VaultWishlistActions,
  type VendorInventoryItemView,
  type VendorOfferContextView
} from "@d2-tools/ui";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import { createHomeWeeklyActivityRewardDetailTarget } from "@d2-tools/app/home";
import {
  createEmptyGuideDocumentDraft,
  confirmGuideExtraction as confirmGuideExtractionDraft,
  createGuideExtraction,
  isSupportedGuideSourceUrl,
  selectGuideLibraryWorkspace,
  toGuideDocumentDraft,
  type GuideDocument,
  type GuideDocumentDraft,
  type GuideExtraction,
  type GuideLibraryFilters
} from "@d2-tools/app/guides";
import type { ItemSearchResult } from "@d2-tools/app/library";
import {
  buildArmorDetailViewModel,
  buildWeaponDetailViewModel,
  type ArmorDetailViewModel,
  type WeaponDetailViewModel
} from "@d2-tools/app/items";
import {
  createEmptyLocalLoadoutPlanDraft,
  createLocalLoadoutPlanDraftFromCharacter,
  selectLocalLoadoutPlanWorkbench,
  toLocalLoadoutPlanDraft
} from "@d2-tools/app/loadouts";
import type { CreateLocalLoadoutPlanInput, LocalLoadoutPlan } from "@d2-tools/core/loadouts/plans";
import { createDimLoadoutExport } from "@d2-tools/core/loadouts/dimImport";
import { createGuideSourceSections } from "@d2-tools/core/guides/source";
import "@d2-tools/ui/styles.css";
import {
  createWebShellAdapter,
  unavailableHomeSnapshot,
  type WebHomeSnapshot
} from "./webAdapter";
import { useWebFixtureRuntime } from "./fixtures/useWebFixtureRuntime";

function WebApp() {
  const fixture = useWebFixtureRuntime();
  const env = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env) ?? {};
  const initialTheme = env.VITE_D2_VISUAL_THEME === "light" ? "light" : "dark";
  const adapter = useMemo(() => createWebShellAdapter(), []);
  const [snapshot, setSnapshot] = useState<WebHomeSnapshot>(unavailableHomeSnapshot);
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
  const [localPlans, setLocalPlans] = useState<LocalLoadoutPlan[]>([]);
  const [selectedLocalPlanId, setSelectedLocalPlanId] = useState("");
  const [localPlanEditingId, setLocalPlanEditingId] = useState<string | null>(null);
  const [localPlanDraft, setLocalPlanDraft] = useState<CreateLocalLoadoutPlanInput | null>(null);
  const [localPlanDimExportFeedback, setLocalPlanDimExportFeedback] = useState("");
  const [guideDocuments, setGuideDocuments] = useState<GuideDocument[]>([]);
  const [guideExtractions, setGuideExtractions] = useState<GuideExtraction[]>([]);
  const [guideExtractionPreview, setGuideExtractionPreview] = useState<GuideExtraction | null>(null);
  const [guideFilters, setGuideFilters] = useState<GuideLibraryFilters>({ query: "", status: "active", category: "", favorites_only: false });
  const [selectedGuideDocumentId, setSelectedGuideDocumentId] = useState("");
  const [guideDraft, setGuideDraft] = useState<GuideDocumentDraft | null>(null);
  const [editingGuideDocumentId, setEditingGuideDocumentId] = useState<string | null>(null);
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
  const [assistantMessages, setAssistantMessages] = useState(() => fixture.assistantInitialMessages);
  const [isAssistantSessionDrawerOpen, setIsAssistantSessionDrawerOpen] = useState(false);
  const [isAssistantContextDrawerOpen, setIsAssistantContextDrawerOpen] = useState(false);
  const platformActions = useMemo(() => ({
    openExternal: adapter.openExternal
  }), [adapter]);
  const aiSettingsAdapter = useMemo<SettingsAiAdapter>(() => ({
    load: async () => ({ protocol: "openai_responses", api_key: "web-fixture-key", model: "gpt-5-mini", base_url: "https://api.example.com/v1", enable_lightgg: true, force_lightgg: false }),
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
  const [webRecommendationWishlist, setWebRecommendationWishlist] = useState<DimWishlist | null>(vaultModel.wishlist ?? null);
  const webWishlistActions = useMemo<VaultWishlistActions>(() => ({
    save: async (wishlist) => {
      setWebRecommendationWishlist(wishlist);
      return wishlist;
    },
    clear: async () => setWebRecommendationWishlist(null)
  }), []);
  const loadoutsModel = useMemo(
    () => fixture.createLoadoutsPageModel({
      selectedTemplateId,
      selectedEntryId: selectedLoadoutEntryId,
      compareTemplateId,
      showDiffOnly
    }),
    [fixture, compareTemplateId, selectedLoadoutEntryId, selectedTemplateId, showDiffOnly]
  );
  const localPlanWorkspace = useMemo(() => selectLocalLoadoutPlanWorkbench({
    accountSummary: fixture.accountSummary,
    plans: localPlans,
    selectedPlanId: selectedLocalPlanId
  }), [fixture.accountSummary, localPlans, selectedLocalPlanId]);
  const localPlanDimExport = useMemo(() => localPlanDraft
    ? createDimLoadoutExport({ plan: localPlanDraft, account: fixture.accountSummary })
    : null, [fixture.accountSummary, localPlanDraft]);
  const guideWorkspace = useMemo(() => selectGuideLibraryWorkspace({
    documents: guideDocuments,
    filters: guideFilters,
    selectedDocumentId: selectedGuideDocumentId
  }), [guideDocuments, guideFilters, selectedGuideDocumentId]);
  const confirmedGuideExtraction = useMemo(() => {
    const selected = guideWorkspace.selected_document;
    if (!selected) return null;
    return guideExtractions.find((entry) => entry.guide_document_id === selected.id && entry.source_snapshot_id === selected.current_snapshot_id) ?? null;
  }, [guideExtractions, guideWorkspace.selected_document]);

  useEffect(() => {
    setLocalPlanDimExportFeedback("");
  }, [localPlanDimExport]);

  async function copyLocalPlanDimLink() {
    if (!localPlanDimExport || localPlanDimExport.status !== "ready") return;
    try {
      await navigator.clipboard.writeText(localPlanDimExport.url);
      setLocalPlanDimExportFeedback(`已复制包含 ${localPlanDimExport.item_count} 个真实实例的 DIM 链接。`);
    } catch (error) {
      setLocalPlanDimExportFeedback(`DIM 链接复制失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function selectLocalPlan(id: string) {
    const plan = localPlans.find((candidate) => candidate.id === id);
    if (!plan) return;
    setSelectedLocalPlanId(plan.id);
    setLocalPlanEditingId(plan.id);
    setLocalPlanDraft(toLocalLoadoutPlanDraft(plan));
  }

  function saveLocalPlan() {
    if (!localPlanDraft) return;
    const now = new Date().toISOString();
    const saved: LocalLoadoutPlan = localPlanEditingId
      ? {
        ...localPlanDraft,
        id: localPlanEditingId,
        created_at: localPlans.find((plan) => plan.id === localPlanEditingId)?.created_at ?? now,
        updated_at: now
      }
      : {
        ...localPlanDraft,
        id: `web-local-${Date.now()}`,
        created_at: now
      };
    setLocalPlans((plans) => localPlanEditingId
      ? plans.map((plan) => plan.id === saved.id ? saved : plan)
      : [saved, ...plans]);
    setSelectedLocalPlanId(saved.id);
    setLocalPlanEditingId(saved.id);
    setLocalPlanDraft(toLocalLoadoutPlanDraft(saved));
  }

  function saveWebGuideDraft() {
    if (!guideDraft?.title.trim() || !guideDraft.body.trim() || (guideDraft.source.kind === "url" && !isSupportedGuideSourceUrl(guideDraft.source.url))) return;
    const now = new Date().toISOString();
    const existing = editingGuideDocumentId
      ? guideDocuments.find((document) => document.id === editingGuideDocumentId)
      : null;
    const body = guideDraft.body.trim();
    const previousSnapshot = existing?.snapshots.find((snapshot) => snapshot.id === existing.current_snapshot_id)
      ?? existing?.snapshots.at(-1);
    const bodyChanged = previousSnapshot?.body !== body;
    const snapshot = bodyChanged || !previousSnapshot ? createWebGuideSnapshot(body, now) : previousSnapshot;
    const snapshots = bodyChanged || !existing ? [...(existing?.snapshots ?? []), snapshot].slice(-20) : existing.snapshots;
    const saved: GuideDocument = {
      id: existing?.id ?? `web-guide-${Date.now()}`,
      title: guideDraft.title.trim(),
      category: guideDraft.category.trim() || "未分类",
      tags: [...new Set(guideDraft.tags.map((tag) => tag.trim()).filter(Boolean))],
      favorite: guideDraft.favorite,
      status: guideDraft.status,
      source: {
        ...guideDraft.source,
        label: guideDraft.source.label?.trim() || undefined,
        url: guideDraft.source.kind === "url" ? guideDraft.source.url?.trim() || undefined : undefined
      },
      current_snapshot_id: snapshot.id,
      snapshots,
      created_at: existing?.created_at ?? now,
      ...(existing ? { updated_at: now } : {})
    };
    setGuideDocuments((documents) => existing
      ? documents.map((document) => document.id === saved.id ? saved : document)
      : [saved, ...documents]);
    setSelectedGuideDocumentId(saved.id);
    setGuideDraft(null);
    setEditingGuideDocumentId(null);
    setGuideExtractionPreview(null);
  }

  function updateWebGuide(document: GuideDocument, patch: Partial<GuideDocumentDraft>) {
    const draft = { ...toGuideDocumentDraft(document), ...patch };
    const { body: _body, ...metadata } = draft;
    const now = new Date().toISOString();
    setGuideDocuments((documents) => documents.map((entry) => entry.id === document.id
      ? { ...entry, ...metadata, source: { ...metadata.source }, updated_at: now }
      : entry));
  }
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

  function openWebLibraryDetail(item: ItemSearchResult) {
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
          onOpenArtifact={(artifact) => {
            if (artifact.kind === "guide_capture") {
              setGuideDraft({
                ...createEmptyGuideDocumentDraft(),
                title: artifact.title,
                body: artifact.raw_text,
                source: { kind: "text", label: "AI 工作台整理" }
              });
              setEditingGuideDocumentId(null);
              setActivePage("guides");
              setAssistantMode(null);
            }
          }}
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
                loginBungie: () => undefined,
                refreshAccount: () => undefined,
                refreshActivity: () => undefined,
                selectCharacter: setSelectedAccountCharacterId,
                openItem: (payload) => openWebAccountItem(payload.item, "account")
              }}
            />
          ) : null}
          {activePage === "vault" ? (
            <VaultPageContentView
              items={vaultModel.vaultItems}
              armorSetCatalog={fixture.armorSetCatalog}
              armorSetCatalogStatus="ready"
              vaultItemCount={vaultModel.vaultItemCount}
              highlightedItemKeys={vaultModel.activeLoadoutLookup}
              highlightedLabel={vaultModel.activeLoadoutName}
              tags={vaultModel.tags}
              openingItemKey=""
              wishlist={webRecommendationWishlist}
              localTargetRules={vaultModel.targetRules}
              communityMatch={webRecommendationWishlist ? vaultModel.communityMatch : new Map()}
              recommendationSourceState={{ customRules: null, customRulesLoadState: "ready" }}
              wishlistActions={webWishlistActions}
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
                selectLocalPlan,
                startNewLocalPlan: (character) => {
                  if (!character) return;
                  setSelectedLocalPlanId("");
                  setLocalPlanEditingId(null);
                  setLocalPlanDraft(createEmptyLocalLoadoutPlanDraft({
                    class_name: character.class_name,
                    target_character_id: character.character_id
                  }));
                },
                startLocalPlanFromCharacter: (character) => {
                  if (!character) return;
                  setSelectedLocalPlanId("");
                  setLocalPlanEditingId(null);
                  setLocalPlanDraft(createLocalLoadoutPlanDraftFromCharacter(character));
                },
                startLocalPlanFromInGameLoadout: () => undefined,
                localPlanDraftChange: (draft) => setLocalPlanDraft(draft),
                saveLocalPlan,
                closeLocalPlanEditor: () => {
                  setLocalPlanDraft(null);
                  setLocalPlanEditingId(null);
                },
                deleteLocalPlan: (id) => {
                  setLocalPlans((plans) => plans.filter((plan) => plan.id !== id));
                  setSelectedLocalPlanId("");
                  setLocalPlanDraft(null);
                  setLocalPlanEditingId(null);
                },
                previewDimImport: () => undefined,
                acceptDimImport: () => undefined,
                dismissDimImport: () => undefined,
                copyDimLoadoutLink: () => void copyLocalPlanDimLink(),
                executeLocalPlan: () => undefined,
                importGuideSource: async () => true,
                acceptAssistantEquipmentTargets: () => false,
                acceptGuideLoadoutCandidates: () => false,
                dismissAssistantPrefill: () => undefined,
                createTransferPlan: () => undefined,
                copyMissingItems: () => undefined,
                executeMissingTransfer: () => undefined,
                executeSingleItemTransfer: () => undefined,
                equipSingleItem: () => undefined,
                equipSavedLoadout: () => undefined,
                snapshotCurrentLoadout: () => undefined,
                clearSavedLoadout: () => undefined,
                updateSavedLoadoutIdentifiers: () => undefined,
                openTemplateSourceItem: () => undefined
              }}
              compareTemplateId={compareTemplateId}
              renameDraft={renameDraft}
              showDiffOnly={showDiffOnly}
              message="Web mock：共享配装页已接入，真实 provider 后续替换数据源。"
              isRunningItemAction={false}
              actionFeedback={{}}
              localPlanWorkspace={localPlanWorkspace}
              localPlanDraft={localPlanDraft}
              localPlanEditingId={localPlanEditingId}
              localPlanIsSaving={false}
              localPlanError=""
              dimPreview={null}
              localPlanIsPreviewingDim={false}
              localPlanDimExport={localPlanDimExport}
              localPlanDimExportFeedback={localPlanDimExportFeedback}
              localPlanExecutionPlan={null}
              localPlanExecutionReport={null}
              localPlanIsExecuting={false}
              localPlanIsImportingGuide={false}
              localPlanLegacyGuideText=""
              localPlanAssistantPrefill={null}
            />
          ) : null}
          {activePage === "guides" ? (
            <GuideLibraryPageContentView
              interfaceLocale={preferences.interfaceLocale}
              model={guideWorkspace}
              filters={guideFilters}
              draft={guideDraft}
              editingDocumentId={editingGuideDocumentId}
              isLoading={false}
              isSaving={false}
              error=""
              errorKind=""
              canReadSource={false}
              sourcePreview={null}
              isReadingSource={false}
              sourceError=""
              extractionPreview={guideExtractionPreview}
              confirmedExtraction={confirmedGuideExtraction}
              isExtracting={false}
              isConfirmingExtraction={false}
              extractionError=""
              derivedRelations={[]}
              derivedRelationsError=""
              actions={{
                selectDocument: (id) => {
                  setSelectedGuideDocumentId(id);
                  setGuideDraft(null);
                  setEditingGuideDocumentId(null);
                  setGuideExtractionPreview(null);
                },
                filtersChange: (patch) => setGuideFilters((current) => ({ ...current, ...patch })),
                startImportDocument: () => {
                  setGuideDraft({ ...createEmptyGuideDocumentDraft(), source: { kind: "url" } });
                  setEditingGuideDocumentId(null);
                  setGuideExtractionPreview(null);
                },
                startNewDocument: () => {
                  setGuideDraft(createEmptyGuideDocumentDraft());
                  setEditingGuideDocumentId(null);
                  setGuideExtractionPreview(null);
                },
                startEditingDocument: (document) => {
                  setSelectedGuideDocumentId(document.id);
                  setGuideDraft(toGuideDocumentDraft(document));
                  setEditingGuideDocumentId(document.id);
                  setGuideExtractionPreview(null);
                },
                draftChange: setGuideDraft,
                saveDraft: saveWebGuideDraft,
                cancelEditing: () => {
                  setGuideDraft(null);
                  setEditingGuideDocumentId(null);
                  setGuideExtractionPreview(null);
                },
                toggleFavorite: (document) => updateWebGuide(document, { favorite: !document.favorite }),
                toggleArchive: (document) => updateWebGuide(document, { status: document.status === "archived" ? "active" : "archived" }),
                deleteDocument: (document) => {
                  if (!window.confirm(getLocaleCopy(preferences.interfaceLocale).guides.deleteConfirmation(document.title))) return;
                  setGuideDocuments((documents) => documents.filter((entry) => entry.id !== document.id));
                  setGuideExtractions((entries) => entries.filter((entry) => entry.guide_document_id !== document.id));
                  setGuideExtractionPreview(null);
                  setSelectedGuideDocumentId("");
                },
                openSource: openWebGuideSource,
                reload: () => undefined,
                readSource: () => undefined,
                acceptSourcePreview: () => undefined,
                dismissSourcePreview: () => undefined,
                previewExtraction: (document) => {
                  if (confirmedGuideExtraction?.guide_document_id === document.id
                    && confirmedGuideExtraction.source_snapshot_id === document.current_snapshot_id) {
                    setGuideExtractionPreview(confirmedGuideExtraction);
                    return;
                  }
                  const snapshot = document.snapshots.find((entry) => entry.id === document.current_snapshot_id) ?? document.snapshots.at(-1);
                  if (snapshot) setGuideExtractionPreview(createGuideExtraction({ guideDocumentId: document.id, snapshot }));
                },
                confirmExtraction: (acceptedCandidateIds) => {
                  if (!guideExtractionPreview) return;
                  const confirmed = confirmGuideExtractionDraft(guideExtractionPreview, acceptedCandidateIds);
                  setGuideExtractions((entries) => [confirmed, ...entries.filter((entry) => entry.id !== confirmed.id)]);
                  setGuideExtractionPreview(confirmed);
                },
                dismissExtractionPreview: () => setGuideExtractionPreview(null)
              }}
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
                onOpenItemDetail: openWebLibraryDetail,
                onLoadPerkRelatedEquipment: () => undefined,
                onOpenRelatedItem: (item) => {
                  const definition = fixture.libraryItems.find((candidate) => candidate.hash === item.hash);
                  if (definition) openWebLibraryDetail(definition);
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
              onOpenBungiePortal={() => adapter.openExternal("https://www.bungie.net/en/Application")}
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

function createWebGuideSnapshot(body: string, capturedAt: string): GuideDocument["snapshots"][number] {
  return {
    id: `web-guide-snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    body,
    content_fingerprint: `web-preview-${body.length}-${capturedAt}`,
    captured_at: capturedAt,
    sections: createGuideSourceSections(body)
  };
}

function openWebGuideSource(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;
    window.open(parsed.toString(), "_blank", "noopener,noreferrer");
  } catch {
    // The editor keeps invalid URLs from being saved; this also protects older preview data.
  }
}

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
    home: <ControlButton variant="secondary">刷新公开情报</ControlButton>,
    account: <><ControlButton variant="secondary">重新授权</ControlButton><ControlButton variant="primary">刷新账号</ControlButton></>,
    vault: <ControlButton variant="primary">刷新账号装备</ControlButton>,
    library: <><ControlButton>重新检查资料库</ControlButton><ControlButton variant="primary">修复资料库</ControlButton></>,
    vendors: <ControlButton variant="secondary">刷新商人库存</ControlButton>
  };

  return {
    title: "",
    subtitle: "",
    actions: actions[page]
  };
}
