import { useCallback, useDeferredValue, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { AccountCharacterTab } from "@d2-tools/app/account";
import type { ArmorSetCatalogItem } from "@d2-tools/core/items/equipableItemSet";
import type { RecommendationCardSummary, VaultItemInstanceMatchInfo } from "@d2-tools/core/community-perks";
import type { SaveVaultTagInput, VaultTags, VaultTagValue } from "@d2-tools/core/vault/tags";
import { matchesLoadoutTemplateItem, type LoadoutTemplateLookup } from "@d2-tools/app/loadouts";
import {
  buildVaultArmorSetFilters,
  buildVaultContextFacts,
  buildVaultFrameFilters,
  buildVaultGroups,
  buildVaultLocationFilters,
  buildVaultSections,
  buildVaultSlotFilters,
  applyVisibleVaultSelection,
  buildVaultSelectionSummary,
  defaultVaultGroupTab,
  filterVaultItems,
  getVaultSelectionItemKey,
  selectMarkedCleanupItems,
  sortVaultItems,
  type VaultAmmoFilter,
  type VaultArmorSetFilter,
  type VaultArmorStatRule,
  type VaultClassFilter,
  type VaultChampionFilter,
  type VaultCraftingFilter,
  type VaultDamageFilter,
  type VaultFrameFilter,
  type VaultGearTierFilter,
  type VaultGroupFilter,
  type VaultLockFilter,
  type VaultLocationFilter,
  type VaultRarityFilter,
  type VaultSlotFilter,
  type VaultSortKey,
  type VaultTagFilter
} from "@d2-tools/app/vault";
import {
  VaultFilterToolbar,
  type VaultArmorSetCatalogStatus
} from "./VaultFilterToolbar.js";
import { VaultItemSections } from "./VaultItemSections.js";
import {
  VaultRecommendationEvidencePanel,
  type VaultRecommendationSourceState
} from "./VaultRecommendationEvidencePanel.js";
import type {
  VaultRecommendationManagedSource,
  VaultWishlistActions
} from "./VaultWishlistManager.js";
import type { VaultBatchMessage, VaultCleanupActions } from "./useVaultBatchActions.js";
import { useVaultBatchActions } from "./useVaultBatchActions.js";
import { VaultOrganizePanel } from "./VaultOrganizePanel.js";
import { getRovingFocusIndex } from "../interaction/rovingFocus.js";
import { ContextSwitcher, type ContextSwitcherItem } from "../control/ContextSwitcher.js";
import {
  buildVaultRecommendationFilterFactIndex,
  buildVaultRecommendationSourceOptions,
  buildVaultRecommendationSummaryIndex,
  compareVaultRecommendationMetricKeys,
  attributeVaultRecommendationSummaryIndex,
  getVaultRecommendationFilterFact,
  getVaultCommunityInstanceKey,
  vaultRecommendationPrimaryFilterLabel,
  type VaultRecommendationCompleteFilter,
  type VaultRecommendationFilterFact,
  type VaultRecommendationFilterFactIndex,
  type VaultRecommendationMetricKey,
  type VaultRecommendationPrimaryFilter
} from "../recommendationMatchView.js";
import { buildVaultCleanupProtectionIndex } from "./vaultCleanupProtection.js";
import { createVaultItemCollectionStore } from "./vaultItemCollectionStore.js";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale, VaultCopy } from "../i18n/types.js";
import { vaultContextFactLine, vaultItemLocationLabel, vaultSelectionSummaryText, vaultSlotLabel, vaultTemplate, vaultText } from "./vaultCopy.js";
import {
  createVaultQuickActionStore,
  type VaultQuickAction
} from "./vaultQuickActionStore.js";
import { VaultQueryIndex, type VaultIndexedQuery } from "./vaultQueryIndex.js";

type VaultWorkspaceTab = "filters" | "recommendations";
type VaultAccountResourceStatus = "unavailable" | "cached" | "stale" | "loading" | "refreshing" | "ready" | "error";
type VaultRecommendationSourceSelection = {
  sourceId: string;
  primaryFilter: VaultRecommendationPrimaryFilter;
  completeFilter: VaultRecommendationCompleteFilter;
};

/** 标签随界面语言变，所以按 copy 现算，不再做模块级常量。 */
function buildVaultWorkspaceTabs(copy: VaultCopy): Array<{ key: VaultWorkspaceTab; label: string }> {
  return [
    { key: "filters", label: vaultText(copy, "1 浏览装备") },
    { key: "recommendations", label: vaultText(copy, "2 推荐来源") }
  ];
}
const emptyCleanupProtection = new Map<string, string[]>();
export function VaultPageContentView(props: {
  interfaceLocale?: InterfaceLocale;
  items: AccountItemSummary[];
  currentCharacterId?: string;
  /** 当前角色条目，由 @d2-tools/app 的共享 builder 生成，与账号页同源。 */
  characterTabs?: readonly AccountCharacterTab[];
  onSelectCharacter?: (characterId: string) => void;
  armorSetCatalog: ArmorSetCatalogItem[];
  armorSetCatalogStatus: VaultArmorSetCatalogStatus;
  accountResourceStatus?: VaultAccountResourceStatus;
  accountResourceMessage?: string;
  accountResourceError?: string;
  vaultItemCount?: number;
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  cleanupProtectedItemKeys?: LoadoutTemplateLookup | null;
  highlightedLabel?: string;
  tags: VaultTags;
  openingItemKey?: string;
  locateRequest?: { hash: number; name: string; requestId: number } | null;
  recommendationCardSummary?: ReadonlyMap<string, RecommendationCardSummary>;
  recommendationSourceState?: VaultRecommendationSourceState;
  wishlistActions?: VaultWishlistActions;
  onCopyRecommendationAudit?: () => void | Promise<void>;
  onContextFactsChange?: (facts: string[]) => void;
  onLoadItemDetail?: (item: AccountItemSummary) => Promise<AccountItemSummary>;
  onLoadRecommendationEvidence?: (items: AccountItemSummary[]) => Promise<VaultItemInstanceMatchInfo[]>;
  onOpenItem: (item: AccountItemSummary) => void;
  onSaveTag: (item: AccountItemSummary, tag: VaultTagValue) => void | Promise<void>;
  onSaveTagBatch: (inputs: SaveVaultTagInput[]) => void | Promise<void>;
  cleanupActions?: VaultCleanupActions;
}) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").vault;
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [group, setGroup] = useState<VaultGroupFilter>(defaultVaultGroupTab);
  const [sortKey, setSortKey] = useState<VaultSortKey>("name");
  const [tagFilter, setTagFilter] = useState<VaultTagFilter>("all");
  const [recommendationSourceSelections, setRecommendationSourceSelections] = useState<VaultRecommendationSourceSelection[]>([]);
  const [lockFilter, setLockFilter] = useState<VaultLockFilter>("all");
  const [slotFilter, setSlotFilter] = useState<VaultSlotFilter>("all");
  const [locationFilter, setLocationFilter] = useState<VaultLocationFilter>("vault");
  const [ammoFilter, setAmmoFilter] = useState<VaultAmmoFilter>("all");
  const [itemTypeFilter, setItemTypeFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState<VaultRarityFilter>("all");
  const [gearTierFilter, setGearTierFilter] = useState<VaultGearTierFilter>("all");
  const [classFilter, setClassFilter] = useState<VaultClassFilter>("all");
  const [damageFilter, setDamageFilter] = useState<VaultDamageFilter>("all");
  const [championFilter, setChampionFilter] = useState<VaultChampionFilter>("all");
  const [craftingFilter, setCraftingFilter] = useState<VaultCraftingFilter>("all");
  const [armorSetFilter, setArmorSetFilter] = useState<VaultArmorSetFilter>("all");
  const [armorStatRules, setArmorStatRules] = useState<VaultArmorStatRule[]>([]);
  const [frameFilter, setFrameFilter] = useState<VaultFrameFilter>("all");
  const [activeVaultTab, setActiveVaultTab] = useState<VaultWorkspaceTab>("filters");
  const [batchMessage, setBatchMessage] = useState<VaultBatchMessage | null>(null);
  /** 本页快捷操作的回执。空文本沿用原来的「清空后回落到批量面板回执」。 */
  function reportBatchMessage(text: string, tone: VaultBatchMessage["tone"] = "ready") {
    setBatchMessage(text ? { text, tone } : null);
  }
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [cleanupTargetCharacterId, setCleanupTargetCharacterId] = useState("");
  const quickActionStore = useMemo(createVaultQuickActionStore, []);
  const [quickActionFocusRequest, setQuickActionFocusRequest] = useState<{ itemKey: string; requestId: number } | null>(null);
  const [managedRecommendationSources, setManagedRecommendationSources] = useState<VaultRecommendationManagedSource[]>([]);
  const [managedRecommendationSourcesLoadState, setManagedRecommendationSourcesLoadState] = useState<"idle" | "loading" | "ready" | "error" | "unsupported">("idle");
  const workspaceScrollPositionsRef = useRef<Record<VaultWorkspaceTab, number>>({
    filters: 0,
    recommendations: 0
  });
  const filterScrollPositionRef = useRef(0);
  const workspaceId = useId();
  const workspaceTabs = useMemo(() => buildVaultWorkspaceTabs(copy), [copy]);
  const tabIds = useMemo(() => Object.fromEntries(workspaceTabs.map((tab) => [tab.key, `${workspaceId}-${tab.key}-tab`])) as Record<VaultWorkspaceTab, string>, [workspaceId, workspaceTabs]);
  const panelIds = useMemo(() => Object.fromEntries(workspaceTabs.map((tab) => [tab.key, `${workspaceId}-${tab.key}-panel`])) as Record<VaultWorkspaceTab, string>, [workspaceId, workspaceTabs]);
  const recommendationWorkflowStatus = vaultRecommendationWorkflowStatus(copy, props.recommendationSourceState?.recommendationScan);
  const itemCollectionStore = useMemo(() => createVaultItemCollectionStore(props.items), []);
  const vaultQueryIndex = useMemo(() => new VaultQueryIndex(), []);
  const vaultQueryRevision = vaultQueryIndex.replaceItems(props.items, props.currentCharacterId);
  const staticCatalogItems = useStableVaultCatalogItems(props.items);
  useLayoutEffect(() => {
    itemCollectionStore.replaceItems(props.items);
  }, [itemCollectionStore, props.items]);
  const rawRecommendationSummaryByInstance = useMemo(
    () => buildVaultRecommendationSummaryIndex(
      props.items,
      undefined,
      props.recommendationCardSummary
    ),
    [props.items, props.recommendationCardSummary]
  );
  // 管理名册是权威来源名册：它一行一次导入，事实层一条一个具名来源。
  // 这里把「事实键 → 它属于的那一行」摊平，下游就能统一用管理面的键看来源。
  const managedSourceKeyByFactKey = useMemo(() => {
    if (!props.wishlistActions?.getRecommendationManagement) return null;
    if (managedRecommendationSourcesLoadState !== "ready") return new Map<string, string>();
    const byFactKey = new Map<string, string>();
    for (const source of managedRecommendationSources) {
      if (!source.configured || source.state !== "active") continue;
      for (const factKey of source.fact_keys) byFactKey.set(factKey, source.source_key);
    }
    return byFactKey;
  }, [managedRecommendationSources, managedRecommendationSourcesLoadState, props.wishlistActions?.getRecommendationManagement]);
  const recommendationSummaryByInstance = useMemo(() => (
    managedSourceKeyByFactKey
      ? attributeVaultRecommendationSummaryIndex(rawRecommendationSummaryByInstance, managedSourceKeyByFactKey)
      : rawRecommendationSummaryByInstance
  ), [managedSourceKeyByFactKey, rawRecommendationSummaryByInstance]);
  const recommendationFilterFactByInstance = useMemo(
    () => buildVaultRecommendationFilterFactIndex(recommendationSummaryByInstance),
    [recommendationSummaryByInstance]
  );

  useEffect(() => {
    const getRecommendationManagement = props.wishlistActions?.getRecommendationManagement;
    if (!getRecommendationManagement) {
      setManagedRecommendationSources([]);
      setManagedRecommendationSourcesLoadState("unsupported");
      return;
    }
    let active = true;
    setManagedRecommendationSourcesLoadState("loading");
    void getRecommendationManagement().then(
      (snapshot) => {
        if (!active) return;
        setManagedRecommendationSources((current) => (
          sameManagedRecommendationSources(current, snapshot.sources) ? current : snapshot.sources
        ));
        setManagedRecommendationSourcesLoadState("ready");
      },
      () => {
        if (!active) return;
        // 管理接口失败时不能回退到旧的推荐摘要，否则已删除来源会重新出现。
        setManagedRecommendationSources([]);
        setManagedRecommendationSourcesLoadState("error");
      }
    );
    return () => {
      active = false;
    };
  }, [props.recommendationSourceState?.recommendationScan.recommendation_revision, props.wishlistActions?.getRecommendationManagement]);

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    const scrollRoot = getVaultWorkspaceScrollRoot(panelIds, activeVaultTab);
    if (!scrollRoot) return;
    const frame = requestAnimationFrame(() => {
      scrollRoot.scrollTo({ top: workspaceScrollPositionsRef.current[activeVaultTab] ?? 0 });
      if (activeVaultTab === "filters") {
        document.querySelector<HTMLElement>(".vault-page .vault-filter-workbench")
          ?.scrollTo({ top: filterScrollPositionRef.current });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [activeVaultTab, panelIds]);

  useEffect(() => {
    if (!props.locateRequest) return;
    setQuery(String(props.locateRequest.hash));
    setGroup("weapons");
    resetFilterState(false, "all");
    setActiveVaultTab("filters");
  }, [props.locateRequest?.requestId]);

  useEffect(() => {
    const characters = props.cleanupActions?.characters ?? [];
    if (characters.some((character) => character.character_id === cleanupTargetCharacterId)) return;
    setCleanupTargetCharacterId(props.cleanupActions?.currentCharacterId ?? characters[0]?.character_id ?? "");
  }, [cleanupTargetCharacterId, props.cleanupActions?.characters, props.cleanupActions?.currentCharacterId]);

  const indexedFilter = useMemo<VaultIndexedQuery>(() => ({
    group,
    lock: lockFilter,
    slot: slotFilter,
    location: locationFilter,
    ammo: ammoFilter,
    itemType: itemTypeFilter,
    rarity: rarityFilter,
    gearTier: gearTierFilter,
    classType: classFilter,
    damageType: damageFilter,
    championType: championFilter,
    crafting: craftingFilter,
    armorSet: armorSetFilter,
    frame: frameFilter
  }), [ammoFilter, armorSetFilter, championFilter, classFilter, craftingFilter, damageFilter, frameFilter, gearTierFilter, group, itemTypeFilter, locationFilter, lockFilter, rarityFilter, slotFilter]);
  const queryIndexedItems = useCallback((
    overrides: Partial<VaultIndexedQuery> = {},
    allowedItemKeys?: ReadonlySet<string>
  ) => {
    const nextIndexedFilter = { ...indexedFilter, ...overrides };
    return filterVaultItems(vaultQueryIndex.query(nextIndexedFilter, { allowedItemKeys }), {
        group,
        query: deferredQuery,
        tag: tagFilter,
        lock: lockFilter,
        slot: slotFilter,
        location: locationFilter,
        currentCharacterId: props.currentCharacterId,
        ammo: ammoFilter,
        itemType: itemTypeFilter,
        rarity: rarityFilter,
        gearTier: gearTierFilter,
        classType: classFilter,
        damageType: damageFilter,
        championType: championFilter,
        crafting: craftingFilter,
        armorSet: armorSetFilter,
        armorStatRules,
        frame: frameFilter,
        tags: props.tags,
        ...overrides
      });
  }, [armorStatRules, championFilter, deferredQuery, group, indexedFilter, props.currentCharacterId, props.tags, tagFilter, vaultQueryIndex, vaultQueryRevision]);
  const filteredVaultItems = useMemo(
    () => sortVaultItems(
      queryIndexedItems(),
      sortKey,
      props.tags,
      props.recommendationCardSummary
    ),
    [props.items, props.recommendationCardSummary, props.tags, queryIndexedItems, sortKey]
  );
  const championIcons = useMemo(() => {
    const icons: Partial<Record<Exclude<VaultChampionFilter, "all">, string>> = {};
    for (const item of props.items) {
      const type = item.breaker_type?.champion_type;
      const icon = item.breaker_type?.icon;
      if (type && icon && !icons[type]) icons[type] = icon;
    }
    return icons;
  }, [props.items]);
  const availableRecommendationSources = useMemo(() => buildVaultRecommendationSourceOptions(
    staticCatalogItems.filter((item) => item.group_key === "weapons").map((item) => (
      recommendationSummaryByInstance.get(getVaultCommunityInstanceKey(item)) ?? []
    )),
    managedRecommendationSources,
    Boolean(props.wishlistActions?.getRecommendationManagement)
  ), [managedRecommendationSources, props.wishlistActions?.getRecommendationManagement, recommendationSummaryByInstance, staticCatalogItems]);
  const recommendationSourceOptions = useMemo(() => {
    const contextualCounts = new Map(buildVaultRecommendationSourceOptions(
      filteredVaultItems.map((item) => (
        recommendationSummaryByInstance.get(getVaultCommunityInstanceKey(item)) ?? []
      )),
      managedRecommendationSources,
      Boolean(props.wishlistActions?.getRecommendationManagement)
    ).map((option) => [option.sourceId, option.count]));
    return availableRecommendationSources.map((option) => ({
      ...option,
      count: contextualCounts.get(option.sourceId) ?? 0
    }));
  }, [availableRecommendationSources, filteredVaultItems, managedRecommendationSources, props.wishlistActions?.getRecommendationManagement, recommendationSummaryByInstance]);
  const selectedRecommendationSourceIds = recommendationSourceSelections.map((selection) => selection.sourceId);
  const firstRecommendationSelection = recommendationSourceSelections[0];
  const recommendationPrimaryFilter = firstRecommendationSelection?.primaryFilter ?? "all";
  const recommendationCompleteFilter = firstRecommendationSelection?.completeFilter ?? "all";

  function toggleRecommendationSource(sourceId: string) {
    const isSelected = recommendationSourceSelections.some((selection) => selection.sourceId === sourceId);
    if (isSelected && recommendationSourceSelections.length === 1) setSortKey("name");
    if (!isSelected) setSortKey("recommendation");
    setRecommendationSourceSelections((current) => {
      if (current.some((selection) => selection.sourceId === sourceId)) {
        return current.filter((selection) => selection.sourceId !== sourceId);
      }
      const nextSelection: VaultRecommendationSourceSelection = {
        sourceId,
        primaryFilter: "all",
        completeFilter: "all"
      };
      return [...current, nextSelection];
    });
  }

  function updateRecommendationSourceSelection(
    sourceId: string,
    patch: Partial<Pick<VaultRecommendationSourceSelection, "primaryFilter" | "completeFilter">>
  ) {
    setRecommendationSourceSelections((current) => current.map((selection) => {
      if (selection.sourceId !== sourceId) return selection;
      // 分段按钮是开关：重新点已经生效的那一段，整条不动。
      // 「完整」是用户另外挑的条件，只有换了 perk 命中档才需要退回「不限」——
      // 点开关把同行另一个条件的用户选择清掉，用户只会当成点坏了。
      if (patch.primaryFilter !== undefined && patch.primaryFilter === selection.primaryFilter) return selection;
      return { ...selection, ...patch };
    }));
  }

  useEffect(() => {
    if (!recommendationSourceSelections.length) return;
    const available = new Set(availableRecommendationSources.map((option) => option.sourceId));
    const next = recommendationSourceSelections.filter((selection) => available.has(selection.sourceId));
    if (next.length === recommendationSourceSelections.length) return;
    setRecommendationSourceSelections(next);
  }, [availableRecommendationSources, recommendationSourceSelections]);

  const recommendationFilterState = useMemo(() => buildVaultRecommendationFilterState({
    copy,
    contextualItems: filteredVaultItems,
    factIndex: recommendationFilterFactByInstance,
    selections: recommendationSourceSelections,
    sourceIds: availableRecommendationSources.map((source) => source.sourceId),
    recommendationCardSummary: props.recommendationCardSummary,
    recommendationScanComplete: props.recommendationSourceState?.recommendationScan.phase === "complete"
  }), [availableRecommendationSources, copy, filteredVaultItems, props.recommendationCardSummary, props.recommendationSourceState?.recommendationScan.phase, recommendationFilterFactByInstance, recommendationSourceSelections]);
  const recommendationAllowedItemKeys = useMemo(() => buildVaultRecommendationAllowedItemKeys({
    catalogItems: staticCatalogItems,
    factIndex: recommendationFilterFactByInstance,
    selections: recommendationSourceSelections,
    recommendationCardSummary: props.recommendationCardSummary,
    recommendationScanComplete: props.recommendationSourceState?.recommendationScan.phase === "complete"
  }), [props.recommendationCardSummary, props.recommendationSourceState?.recommendationScan.phase, recommendationFilterFactByInstance, recommendationSourceSelections, staticCatalogItems]);
  const filteredItems = recommendationFilterState.items;
  const recommendationSourceFilterStates = recommendationFilterState.sources;
  useEffect(() => {
    setRecommendationSourceSelections((current) => {
      let changed = false;
      const next = current.map((selection) => {
        const state = recommendationSourceFilterStates.find((item) => item.sourceId === selection.sourceId);
        if (!state) return selection;
        const primaryValid = selection.primaryFilter === "all"
          || state.primaryOptions.some((option) => option.key === selection.primaryFilter);
        const completeValid = selection.completeFilter === "all"
          || state.completeOptions.some((option) => option.key === selection.completeFilter);
        if (primaryValid && completeValid) return selection;
        changed = true;
        return {
          ...selection,
          primaryFilter: primaryValid ? selection.primaryFilter : "all",
          completeFilter: completeValid && primaryValid ? selection.completeFilter : "all"
        };
      });
      return changed ? next : current;
    });
  }, [recommendationSourceFilterStates]);
  const recommendationSelectionLabels = useMemo(() => recommendationSourceSelections.flatMap((selection) => {
    const source = recommendationSourceOptions.find((option) => option.sourceId === selection.sourceId);
    const sourceState = recommendationSourceFilterStates.find((state) => state.sourceId === selection.sourceId);
    if (!source || !sourceState) return [];
    const labels = [vaultTemplate(copy, "推荐来源：{label}", { label: source.sourceLabel })];
    if (selection.primaryFilter !== "all") {
      labels.push(vaultTemplate(copy, "perk 命中：{filter}", { filter: vaultRecommendationPrimaryFilterLabel(copy, selection.primaryFilter) }));
    }
    if (selection.completeFilter !== "all") {
      labels.push(vaultTemplate(copy, "完整命中：{filter}", { filter: selection.completeFilter }));
    }
    return labels;
  }), [copy, recommendationSourceFilterStates, recommendationSourceOptions, recommendationSourceSelections]);
  const selectedItems = useMemo(
    () => props.items.filter((item) => selectedKeys.has(getVaultSelectionItemKey(item))),
    [props.items, selectedKeys]
  );
  const selectedVaultItems = useMemo(
    () => selectedItems.filter((item) => getItemSourceKind(item) === "vault"),
    [selectedItems]
  );
  const selectedLockableItems = useMemo(
    () => selectedItems.filter((item) => Boolean(item.instance_id) && !item.locked),
    [selectedItems]
  );
  const selectedVisibleCount = useMemo(
    () => filteredItems.reduce((count, item) => count + (selectedKeys.has(getVaultSelectionItemKey(item)) ? 1 : 0), 0),
    [filteredItems, selectedKeys]
  );
  const needsCleanupProtection = isOrganizing;
  const cleanupActionItems = useMemo(
    () => needsCleanupProtection ? (selectedItems.length
      ? selectMarkedCleanupItems(selectedItems, props.tags)
      : selectMarkedCleanupItems(props.items, props.tags))
      .filter((item) => getItemSourceKind(item) === "vault") : [],
    [needsCleanupProtection, props.items, props.tags, selectedItems]
  );
  const cleanupProtectionByItemKey = useMemo(() => needsCleanupProtection
    ? buildVaultCleanupProtectionIndex({
        copy,
        items: props.items,
        tags: props.tags,
        highlightedItemKeys: props.cleanupProtectedItemKeys ?? props.highlightedItemKeys,
        recommendationCardSummary: props.recommendationCardSummary,
        recommendationReady: props.recommendationSourceState?.recommendationScan.phase === "complete"
      })
    : emptyCleanupProtection,
  [copy, needsCleanupProtection, props.cleanupProtectedItemKeys, props.highlightedItemKeys, props.items, props.recommendationCardSummary, props.recommendationSourceState?.recommendationScan.phase, props.tags]);
  const safeCleanupActionItems = useMemo(() => cleanupActionItems.filter((item) => (
    (cleanupProtectionByItemKey.get(getVaultCommunityInstanceKey(item))?.length ?? 0) === 0
  )), [cleanupActionItems, cleanupProtectionByItemKey]);
  const selectedProtectedCount = useMemo(() => selectedItems.filter((item) => (
    (cleanupProtectionByItemKey.get(getVaultCommunityInstanceKey(item))?.length ?? 0) > 0
  )).length, [cleanupProtectionByItemKey, selectedItems]);
  const cleanupTargetCharacterLabel = useMemo(
    () => props.cleanupActions?.characters.find((character) => character.character_id === cleanupTargetCharacterId)?.class_name ?? vaultText(copy, "目标角色"),
    [cleanupTargetCharacterId, copy, props.cleanupActions?.characters]
  );
  const selectionSummary = useMemo(
    () => vaultSelectionSummaryText(copy, buildVaultSelectionSummary({ selectedTotalCount: selectedItems.length, selectedVisibleCount })),
    [copy, selectedItems.length, selectedVisibleCount]
  );
  const batchActions = useVaultBatchActions({
    copy,
    selectedItems,
    vaultActionItems: selectedVaultItems,
    cleanupActionItems: safeCleanupActionItems,
    cleanupActions: props.cleanupActions,
    cleanupTargetCharacterId,
    cleanupTargetCharacterLabel,
    cleanupProtectionByItemKey,
    setSelectedKeys,
    onSaveTagBatch: props.onSaveTagBatch
  });
  // 两条来源只显示一条：本页快捷操作的回执优先，其次才是批量面板的回执。
  const activeBatchMessage = batchMessage ?? batchActions.batchMessage;
  const filteredSections = useMemo(() => buildVaultSections(filteredItems), [filteredItems]);
  const groups = useMemo(() => buildVaultGroups(staticCatalogItems), [staticCatalogItems]);
  const slotFilters = useMemo(() => {
    const candidates = queryIndexedItems({ slot: "all" }, recommendationAllowedItemKeys);
    return buildVaultSlotFilters(candidates);
  }, [queryIndexedItems, recommendationAllowedItemKeys]);
  const locationFilters = useMemo(() => {
    const candidates = queryIndexedItems({ group: "weapons", location: "all" }, recommendationAllowedItemKeys);
    return buildVaultLocationFilters(candidates, props.currentCharacterId);
  }, [props.currentCharacterId, queryIndexedItems, recommendationAllowedItemKeys]);
  const characterSwitcherItems = useMemo<ContextSwitcherItem[]>(
    () => (props.characterTabs ?? []).map((tab) => ({
      key: tab.key,
      className: tab.className,
      emblemUrl: tab.emblemUrl,
      isSelected: tab.isSelected,
      title: vaultTemplate(copy, "切换到{className}", { className: tab.className }),
      meta: tab.power.currentLabel
    })),
    [copy, props.characterTabs]
  );
  const availableFrameFilters = useMemo(() => {
    const candidates = queryIndexedItems({ frame: "all" }, recommendationAllowedItemKeys);
    return buildVaultFrameFilters(candidates);
  }, [queryIndexedItems, recommendationAllowedItemKeys]);
  const armorSetFilters = useMemo(
    () => buildVaultArmorSetFilters(props.armorSetCatalog, staticCatalogItems),
    [props.armorSetCatalog, staticCatalogItems]
  );
  const armorSetLabel = useMemo(
    () => armorSetFilters.find((option) => option.key === armorSetFilter)?.label,
    [armorSetFilter, armorSetFilters]
  );
  useEffect(() => {
    if (armorSetFilter === "all") return;
    if (props.armorSetCatalogStatus !== "ready"
      || !armorSetFilters.some((option) => option.key === armorSetFilter)) {
      setArmorSetFilter("all");
    }
  }, [armorSetFilter, armorSetFilters, props.armorSetCatalogStatus]);
  const itemTypeFilters = useMemo(() => {
    const counts = new Map<string, number>();
    const candidates = queryIndexedItems({ group: "weapons", itemType: "all" }, recommendationAllowedItemKeys);
    candidates.filter((item) => item.item_type).forEach((item) => {
      const itemType = item.item_type ?? "";
      counts.set(itemType, (counts.get(itemType) ?? 0) + 1);
    });
    return [...counts.entries()]
      .map(([key, count]) => ({ key, label: key, count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-Hans-CN"));
  }, [queryIndexedItems, recommendationAllowedItemKeys]);
  const loadoutMatchCount = useMemo(
    () => props.highlightedItemKeys ? filteredItems.filter((item) => matchesLoadoutTemplateItem(item, props.highlightedItemKeys)).length : 0,
    [filteredItems, props.highlightedItemKeys]
  );
  const activeFilterLabels = useMemo(() => buildActiveFilterLabels({
    copy,
    group,
    query,
    sortKey,
    slotFilter,
    slotLabel: slotFilter === "all"
      ? undefined
      : vaultSlotLabel(copy, slotFilter, slotFilters.find((item) => item.key === slotFilter)?.label),
    locationFilter,
    itemTypeFilter,
    rarityFilter,
    gearTierFilter,
    ammoFilter,
    damageFilter,
    championFilter,
    craftingFilter,
    classFilter,
    armorSetFilter,
    armorSetLabel,
    lockFilter,
    tagFilter,
    recommendationSelectionLabels,
    frameFilter,
    frameLabel: availableFrameFilters.find((option) => option.key === frameFilter)?.label,
    armorRuleCount: armorStatRules.length
  }), [ammoFilter, armorSetFilter, armorSetLabel, armorStatRules.length, championFilter, classFilter, copy, craftingFilter, damageFilter, frameFilter, gearTierFilter, group, itemTypeFilter, locationFilter, lockFilter, query, rarityFilter, recommendationSelectionLabels, slotFilter, slotFilters, sortKey, tagFilter]);
  const contextFacts = useMemo(() => buildVaultContextFacts({
    group,
    query,
    tagFilter,
    lockFilter,
    slotFilter,
    slotLabel: slotFilter === "all"
      ? undefined
      : vaultSlotLabel(copy, slotFilter, slotFilters.find((item) => item.key === slotFilter)?.label),
    locationFilter,
    ammoFilter,
    itemTypeFilter,
    rarityFilter,
    gearTierFilter,
    classFilter,
    damageFilter,
    craftingFilter,
    armorSetFilter,
    armorSetLabel,
    frameFilter,
    frameLabel: availableFrameFilters.find((option) => option.key === frameFilter)?.label,
    armorStatRules
  }), [ammoFilter, armorSetFilter, armorSetLabel, armorStatRules, championFilter, classFilter, copy, craftingFilter, damageFilter, frameFilter, gearTierFilter, group, itemTypeFilter, locationFilter, lockFilter, query, rarityFilter, slotFilter, slotFilters, tagFilter]);
  const contextFactLine = useMemo(() => vaultContextFactLine(copy, contextFacts, {
    filteredCount: filteredVaultItems.length,
    totalCount: props.items.length
  }), [contextFacts, copy, filteredVaultItems.length, props.items.length]);

  useEffect(() => {
    props.onContextFactsChange?.([
      contextFactLine,
      ...recommendationSelectionLabels,
      vaultTemplate(copy, "当前结果：{count} 件", { count: filteredItems.length })
    ]);
  }, [contextFactLine, copy, filteredItems.length, props.onContextFactsChange, recommendationSelectionLabels]);

  function resetFilterState(
    resetQuery = true,
    nextLocation: VaultLocationFilter = group === "weapons" ? "vault" : "all"
  ) {
    if (resetQuery) setQuery("");
    setSortKey("name");
    setTagFilter("all");
    setRecommendationSourceSelections([]);
    setLockFilter("all");
    setSlotFilter("all");
    setLocationFilter(nextLocation);
    setAmmoFilter("all");
    setItemTypeFilter("all");
    setRarityFilter("all");
    setGearTierFilter("all");
    setClassFilter("all");
    setDamageFilter("all");
    setChampionFilter("all");
    setCraftingFilter("all");
    setArmorSetFilter("all");
    setArmorStatRules([]);
    setFrameFilter("all");
    reportBatchMessage("");
  }

  function switchVaultFilterMode(nextGroup: VaultGroupFilter) {
    setGroup(nextGroup);
    setSlotFilter("all");
    setLocationFilter(nextGroup === "weapons" ? "vault" : "all");
    if (nextGroup !== "weapons") {
      setRecommendationSourceSelections([]);
      if (sortKey === "recommendation") setSortKey("name");
      setAmmoFilter("all");
      setItemTypeFilter("all");
      setDamageFilter("all");
      setChampionFilter("all");
      setCraftingFilter("all");
      setFrameFilter("all");
    }
    if (nextGroup !== "armor") {
      setClassFilter("all");
      setArmorSetFilter("all");
      setArmorStatRules([]);
    }
    if (nextGroup === "equipment") {
      setRarityFilter("all");
      setGearTierFilter("all");
    }
  }

  function addArmorStatRule() {
    setArmorStatRules((current) => {
      const used = new Set(current.map((rule) => rule.stat));
      // 这里只借 copy.labels.armorStats 的属性名枚举属性键（六条与 app 的那张表同序同键），
      // 显示名不从这里出——属性名由 VaultFilterToolbar 查同一张表。
      const nextStat = (Object.keys(copy.labels.armorStats) as Array<Exclude<VaultArmorStatRule["stat"], "">>).find((stat) => !used.has(stat));
      return nextStat ? [...current, { stat: nextStat, min: 10 }] : current;
    });
  }

  function switchVaultTab(tab: VaultWorkspaceTab) {
    if (typeof document !== "undefined") {
      const scrollRoot = getVaultWorkspaceScrollRoot(panelIds, activeVaultTab);
      if (scrollRoot) workspaceScrollPositionsRef.current[activeVaultTab] = scrollRoot.scrollTop;
      if (activeVaultTab === "filters") {
        filterScrollPositionRef.current = document.querySelector<HTMLElement>(".vault-page .vault-filter-workbench")?.scrollTop ?? 0;
      }
    }
    setActiveVaultTab(tab);
    reportBatchMessage("");
  }

  function handleVaultTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = workspaceTabs.findIndex((tab) => tab.key === activeVaultTab);
    const nextIndex = getRovingFocusIndex({
      key: event.key,
      currentIndex,
      itemCount: workspaceTabs.length,
      orientation: "horizontal"
    });
    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = workspaceTabs[nextIndex]?.key ?? "filters";
    switchVaultTab(nextTab);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  }

  function toggleSelectedItem(item: AccountItemSummary) {
    const key = getVaultSelectionItemKey(item);
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectVisibleItems(mode: "replace" | "append" | "remove") {
    setSelectedKeys((current) => applyVisibleVaultSelection(current, filteredItems, mode));
    setIsOrganizing(true);
  }

  function toggleOrganizing() {
    if (isOrganizing) setSelectedKeys(new Set());
    setIsOrganizing((current) => !current);
  }

  function requestQuickActionFocus(itemKey: string) {
    setQuickActionFocusRequest((current) => ({
      itemKey,
      requestId: (current?.requestId ?? 0) + 1
    }));
  }

  async function runSelectedBulkLock() {
    if (!props.cleanupActions || !selectedLockableItems.length || isBatchSaving) return;
    setIsBatchSaving(true);
    batchActions.setActiveBatchAction(vaultText(copy, "批量加锁"));
    reportBatchMessage(vaultTemplate(copy, "正在加锁 {count} 件装备...", { count: selectedLockableItems.length }));
    let successCount = 0;
    const failures: string[] = [];
    for (const item of selectedLockableItems) {
      const targetCharacterId = getQuickActionCharacterId(
        item,
        props.cleanupActions.currentCharacterId ?? cleanupTargetCharacterId
      );
      if (!targetCharacterId) {
        failures.push(vaultTemplate(copy, "{item}：没有可用角色", { item: item.name }));
        continue;
      }
      try {
        await props.cleanupActions.onLockItem(item, targetCharacterId);
        successCount += 1;
      } catch (error) {
        failures.push(vaultTemplate(copy, "{item}：{reason}", {
          item: item.name,
          reason: error instanceof Error ? error.message : vaultText(copy, "加锁失败")
        }));
      }
    }
    const failureText = failures.length
      ? `${vaultTemplate(copy, "{count} 件失败：{list}", { count: failures.length, list: failures.slice(0, 3).join(vaultText(copy, "；")) })}${failures.length > 3 ? vaultText(copy, "；其余失败请查看应用日志") : ""}`
      : "";
    reportBatchMessage([
      successCount ? vaultTemplate(copy, "已加锁 {count} 件装备。", { count: successCount }) : vaultText(copy, "没有装备成功加锁。"),
      failureText
    ].filter(Boolean).join(" "), failures.length ? "error" : "ready");
    batchActions.setActiveBatchAction("");
    setIsBatchSaving(false);
  }

  async function runQuickAction(item: AccountItemSummary, action: VaultQuickAction) {
    if (!props.cleanupActions || quickActionStore.getActive()) return;
    const itemKey = getVaultSelectionItemKey(item);
    const itemIndex = filteredItems.findIndex((candidate) => getVaultSelectionItemKey(candidate) === itemKey);
    const lockState = action === "lock" ? true : action === "unlock" ? false : undefined;
    const actionLabel = action === "transfer" ? vaultText(copy, "取出") : lockState ? vaultText(copy, "加锁") : vaultText(copy, "解锁");
    const itemWillLeaveResults = (action === "transfer" && locationFilter === "vault")
      || (lockState !== undefined && lockFilter !== "all");
    const fallbackItem = itemWillLeaveResults
      ? filteredItems[itemIndex + 1] ?? filteredItems[itemIndex - 1]
      : item;
    const targetCharacterId = getQuickActionCharacterId(item, props.cleanupActions.currentCharacterId);
    if (!targetCharacterId) {
      reportBatchMessage(vaultTemplate(copy, "{action}失败：当前没有可用角色。", { action: actionLabel }), "error");
      requestQuickActionFocus(itemKey);
      return;
    }

    quickActionStore.setActive({ itemKey, action });
    reportBatchMessage(action === "transfer"
      ? vaultTemplate(copy, "正在取出到{target}：{item}", { target: props.cleanupActions.currentCharacterLabel ?? vaultText(copy, "当前角色"), item: item.name })
      : vaultTemplate(copy, "正在{action}：{item}", { action: actionLabel, item: item.name }));
    try {
      if (lockState !== undefined) {
        await props.cleanupActions.onLockItem(item, targetCharacterId, lockState);
        reportBatchMessage(vaultTemplate(copy, "已{action}：{item}", { action: actionLabel, item: item.name }));
      } else {
        const result = await props.cleanupActions.onBatchTransferToCharacter([item], targetCharacterId);
        if (!result.success_count) {
          throw new Error(result.failure_messages?.[0] || result.message || vaultText(copy, "Bungie 未接受这次取出操作"));
        }
        reportBatchMessage(vaultTemplate(copy, "已取出到{target}：{item}", { target: props.cleanupActions.currentCharacterLabel ?? vaultText(copy, "当前角色"), item: item.name }));
      }
      if (fallbackItem) requestQuickActionFocus(getVaultSelectionItemKey(fallbackItem));
    } catch (error) {
      reportBatchMessage(vaultTemplate(copy, "{action}失败：{reason}", {
        action: actionLabel,
        reason: error instanceof Error ? error.message : vaultText(copy, "操作未完成")
      }), "error");
      requestQuickActionFocus(itemKey);
    } finally {
      quickActionStore.setActive(null);
    }
  }

  return (
    <div className="vault-page">
      <div className="vault-sticky-zone">
        <div className="vault-workflow-bar" data-surface="section">
          <div className="vault-workflow-tabs" data-ui-kind="segmented-control" role="tablist" aria-label={vaultText(copy, "仓库工作台")}>
            {workspaceTabs.map((tab) => (
              <button type="button" data-ui-kind="button" data-control-variant="quiet" role="tab" id={tabIds[tab.key]} aria-controls={panelIds[tab.key]} aria-selected={activeVaultTab === tab.key} tabIndex={activeVaultTab === tab.key ? 0 : -1} key={tab.key} className={activeVaultTab === tab.key ? "active" : ""} onClick={() => switchVaultTab(tab.key)} onKeyDown={handleVaultTabKeyDown}>
                {tab.label}
              </button>
            ))}
          </div>
          {props.onSelectCharacter && characterSwitcherItems.length > 0 ? (
            <ContextSwitcher
              variant="compact"
              label={vaultText(copy, "当前角色")}
              items={characterSwitcherItems}
              onSelect={props.onSelectCharacter}
            />
          ) : null}
          <div className="vault-workflow-meta">
            {props.accountResourceStatus && props.accountResourceStatus !== "ready" ? <span className={`ui-badge ${vaultResourceStatusTone(props.accountResourceStatus)}`} data-ui-kind="status-chip" data-status={props.accountResourceStatus}>{vaultResourceStatusLabel(copy, props.accountResourceStatus)}</span> : null}
            <button type="button" className={`ui-badge vault-recommendation-status-link status-${recommendationWorkflowStatus.tone}`} data-ui-kind="status-chip" data-status={recommendationWorkflowStatus.tone} onClick={() => switchVaultTab("recommendations")}>{recommendationWorkflowStatus.label}</button>
            {props.highlightedItemKeys ? <span className="ui-badge status-success" data-ui-kind="status-chip">{vaultTemplate(copy, "配装命中 {count} 件", { count: loadoutMatchCount })}</span> : null}
          </div>
        </div>
        {props.accountResourceError ? <p className="status-message status-error" role="alert">{props.accountResourceError}</p> : props.accountResourceMessage ? <p className={`status-message ${props.accountResourceStatus === "cached" || props.accountResourceStatus === "refreshing" ? "status-warning" : "status-ready"}`} role="status">{props.accountResourceMessage}</p> : null}
        {activeBatchMessage ? <p className={`status-message status-${activeBatchMessage.tone === "error" ? "error" : "ready"}`}>{activeBatchMessage.text}</p> : null}
      </div>

      {activeVaultTab === "filters" ? (
        <div id={panelIds.filters} role="tabpanel" aria-labelledby={tabIds.filters} className="vault-workspace-panel vault-browse-panel">
          <div className="vault-browse">
            <VaultFilterToolbar
              copy={copy}
              query={query}
              sortKey={sortKey}
              tagFilter={tagFilter}
              armorStatRules={armorStatRules}
              lockFilter={lockFilter}
              slotFilter={slotFilter}
              ammoFilter={ammoFilter}
              itemTypeFilter={itemTypeFilter}
              rarityFilter={rarityFilter}
              gearTierFilter={gearTierFilter}
              classFilter={classFilter}
              damageFilter={damageFilter}
              championFilter={championFilter}
              championIcons={championIcons}
              craftingFilter={craftingFilter}
              armorSetFilter={armorSetFilter}
              frameFilter={frameFilter}
              group={group}
              groups={groups}
              slotFilters={slotFilters}
              itemTypeFilters={itemTypeFilters}
              armorSetFilters={armorSetFilters}
              armorSetCatalogStatus={props.armorSetCatalogStatus}
              availableFrameFilters={availableFrameFilters}
              activeFilterCount={activeFilterLabels.length}
              onQueryChange={setQuery}
              onResetFilters={resetFilterState}
              onSortKeyChange={setSortKey}
              onTagFilterChange={setTagFilter}
              onAddArmorStatRule={addArmorStatRule}
              onClearArmorStatRules={() => setArmorStatRules([])}
              onRemoveArmorStatRule={(index) => setArmorStatRules((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              onUpdateArmorStatRule={(index, rule) => setArmorStatRules((current) => current.map((item, itemIndex) => itemIndex === index ? rule : item))}
              onLockFilterChange={setLockFilter}
              onSlotFilterChange={setSlotFilter}
              onAmmoFilterChange={setAmmoFilter}
              onItemTypeFilterChange={setItemTypeFilter}
              onRarityFilterChange={setRarityFilter}
              onGearTierFilterChange={setGearTierFilter}
              onClassFilterChange={setClassFilter}
              onDamageFilterChange={setDamageFilter}
              onChampionFilterChange={setChampionFilter}
              onCraftingFilterChange={setCraftingFilter}
              onArmorSetFilterChange={setArmorSetFilter}
              onGroupChange={switchVaultFilterMode}
              onFrameFilterChange={setFrameFilter}
            />
            <section className="vault-results-column vault-browse-results" data-surface="section" data-contract-id="vault.results" data-vault-scroll-pane="filters">
              <div className="vault-results-command-row">
                {group === "weapons" ? (
                  <div className="vault-recommendation-filter" role="group" aria-label={vaultText(copy, "按推荐来源筛选")}>
                    <div className="vault-recommendation-source-list" role="group" aria-label={vaultText(copy, "推荐来源多选")}>
                      {recommendationSourceOptions.map((option) => {
                        const selection = recommendationSourceSelections.find((item) => item.sourceId === option.sourceId);
                        const sourceState = recommendationSourceFilterStates.find((state) => state.sourceId === option.sourceId);
                        const active = Boolean(selection && sourceState);
                        if (!sourceState) return null;
                        const directOptions = sourceState.primaryOptions.filter((item) => item.key === "all" || isVaultRecommendationMetricKey(item.key));
                        const otherOptions = sourceState.primaryOptions.filter((item) => item.key !== "all" && !isVaultRecommendationMetricKey(item.key));
                        return (
                          <div className={`vault-recommendation-source-row${active ? " is-active" : ""}`} key={option.sourceId}>
                            <div className="vault-recommendation-source-head">
                              <button
                                type="button"
                                className="vault-recommendation-source-toggle"
                                aria-pressed={active}
                                aria-expanded={active}
                                aria-label={`${vaultTemplate(copy, "{label}，覆盖 {count} 件", { label: option.sourceLabel, count: option.count })}${active ? vaultText(copy, "，已选中") : ""}`}
                                title={vaultTemplate(copy, "{label} · 覆盖 {count} 件", { label: option.sourceLabel, count: option.count })}
                                onClick={() => toggleRecommendationSource(option.sourceId)}
                              >
                                <span className="vault-recommendation-source-check" aria-hidden="true">{active ? "✓" : ""}</span>
                                <span>{option.sourceLabel}</span>
                                <small className="vault-recommendation-option-count">{option.count}</small>
                              </button>
                            </div>
                            {active && selection ? (
                              <div className="vault-recommendation-source-conditions" role="group" aria-label={vaultTemplate(copy, "{label}命中筛选", { label: option.sourceLabel })}>
                                <div className="vault-recommendation-primary-filter" role="group" aria-label={vaultTemplate(copy, "{label}perk 命中筛选", { label: option.sourceLabel })}>
                                  <span>
                                    <span className="vault-recommendation-primary-filter-label" aria-hidden="true">{vaultText(copy, "perk 命中")}</span>
                                    {directOptions.map((filterOption) => (
                                      <button
                                        type="button"
                                        key={filterOption.key}
                                        disabled={filterOption.count === 0}
                                        aria-pressed={selection.primaryFilter === filterOption.key}
                                        aria-label={`${option.sourceLabel}${formatVaultRecommendationMetricOptionDescription(copy, filterOption.key, filterOption.count)}`}
                                        title={formatVaultRecommendationMetricOptionDescription(copy, filterOption.key, filterOption.count)}
                                        onClick={() => updateRecommendationSourceSelection(option.sourceId, { primaryFilter: filterOption.key, completeFilter: "all" })}
                                      >
                                        <span>{filterOption.key === "all" ? vaultText(copy, "全部") : filterOption.key}</span>
                                        <small className="vault-recommendation-option-count" aria-hidden="true">{filterOption.count}</small>
                                      </button>
                                    ))}
                                  </span>
                                </div>
                                {otherOptions.length ? (
                                  <label className="vault-recommendation-other-filter">
                                    <span className="sr-only">{vaultTemplate(copy, "{label}其他推荐状态", { label: option.sourceLabel })}</span>
                                    <select
                                      aria-label={vaultTemplate(copy, "{label}其他推荐状态", { label: option.sourceLabel })}
                                      value={selection.primaryFilter === "all" || isVaultRecommendationMetricKey(selection.primaryFilter) ? "" : selection.primaryFilter}
                                      onChange={(event) => updateRecommendationSourceSelection(option.sourceId, { primaryFilter: (event.target.value || "all") as VaultRecommendationPrimaryFilter, completeFilter: "all" })}
                                    >
                                      <option value="">{vaultText(copy, "其他状态")}</option>
                                      {otherOptions.map((filterOption) => (
                                        <option key={filterOption.key} value={filterOption.key} disabled={filterOption.count === 0}>{filterOption.label} · {filterOption.count}</option>
                                      ))}
                                    </select>
                                  </label>
                                ) : null}
                                {sourceState.completeOptions.length > 1 ? (
                                  <label className="vault-recommendation-complete-filter">
                                    <span className="sr-only">{vaultTemplate(copy, "{label}完整命中筛选", { label: option.sourceLabel })}</span>
                                    <select
                                      aria-label={vaultTemplate(copy, "{label}完整命中筛选", { label: option.sourceLabel })}
                                      value={selection.completeFilter}
                                      onChange={(event) => updateRecommendationSourceSelection(option.sourceId, { completeFilter: event.target.value as VaultRecommendationCompleteFilter })}
                                    >
                                      {sourceState.completeOptions.map((filterOption) => (
                                        <option key={filterOption.key} value={filterOption.key} disabled={filterOption.count === 0}>{filterOption.key === "all" ? vaultText(copy, "完整：不限") : vaultTemplate(copy, "完整 {filter}", { filter: filterOption.key })} · {filterOption.count}</option>
                                      ))}
                                    </select>
                                  </label>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <div className="vault-results-command-summary" aria-live="polite">
                  <span>{group === "weapons" ? copy.labels.locations[locationFilter] : vaultText(copy, "仓库装备")}</span>
                  <strong>{vaultTemplate(copy, "{count} 件", { count: filteredItems.length })}</strong>
                  <span>{vaultTemplate(copy, "{count} 项条件", { count: activeFilterLabels.length })}</span>
                </div>
                {group === "weapons" ? (
                  <div className="vault-results-location-filter" role="group" aria-label={vaultText(copy, "武器查看位置")}>
                    {locationFilters.map((item) => (
                      <button
                        type="button"
                        key={item.key}
                        aria-pressed={locationFilter === item.key}
                        onClick={() => setLocationFilter(item.key)}
                      >
                        <span>{copy.labels.locations[item.key]}</span>
                        <small aria-hidden="true">{item.count}</small>
                      </button>
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="vault-batch-toggle"
                  data-ui-kind="button"
                  data-control-variant="secondary"
                  aria-expanded={isOrganizing}
                  onClick={toggleOrganizing}
                >
                  {isOrganizing ? vaultText(copy, "退出批量") : vaultText(copy, "批量选择")}
                </button>
              </div>
              <VaultOrganizePanel
                copy={copy}
                isOrganizing={isOrganizing}
                filteredItemCount={filteredItems.length}
                selectedItemCount={selectedItems.length}
                selectedVaultItemCount={selectedVaultItems.length}
                selectedLockableItemCount={selectedLockableItems.length}
                selectedProtectedCount={selectedProtectedCount}
                selectionSummary={selectionSummary}
                activeBatchAction={batchActions.activeBatchAction}
                isBatchSaving={isBatchSaving || batchActions.isBatchSaving}
                cleanupActions={props.cleanupActions}
                cleanupCharacters={props.cleanupActions?.characters ?? []}
                cleanupTargetCharacterId={cleanupTargetCharacterId}
                markedCleanupItemCount={cleanupActionItems.length}
                protectedCleanupItemCount={cleanupActionItems.length - safeCleanupActionItems.length}
                cleanupActionItems={safeCleanupActionItems}
                tags={props.tags}
                onVisibleSelectionChange={selectVisibleItems}
                onClearSelection={() => setSelectedKeys(new Set())}
                onCleanupTargetCharacterChange={setCleanupTargetCharacterId}
                onApplyBatchTag={batchActions.applyBatchTag}
                onRunSelectedBulkLock={runSelectedBulkLock}
                onRunSelectedBulkMove={batchActions.runSelectedBulkMove}
                onRunCleanupAction={batchActions.runCleanupAction}
              />
              <VaultItemSections
                copy={copy}
                sections={filteredSections}
                itemCollectionStore={itemCollectionStore}
                highlightedItemKeys={props.highlightedItemKeys}
                tags={props.tags}
                recommendationSummaryByInstance={recommendationSummaryByInstance}
                preferredRecommendationSourceId={selectedRecommendationSourceIds[0] || undefined}
                isOrganizing={isOrganizing}
                isSearchActive={Boolean(query.trim())}
                selectedKeys={selectedKeys}
                openingItemKey={props.openingItemKey}
                currentCharacterId={props.cleanupActions?.currentCharacterId}
                currentCharacterLabel={props.cleanupActions?.currentCharacterLabel}
                quickActionStore={quickActionStore}
                quickActionsDisabled={isBatchSaving || batchActions.isBatchSaving}
                focusRequest={quickActionFocusRequest}
                emptyMessage={vaultText(copy, "没有匹配的装备。请调整左侧条件或重置筛选。")}
                onSelectItem={props.onOpenItem}
                onToggleSelected={toggleSelectedItem}
                onQuickAction={runQuickAction}
              />
            </section>
          </div>
        </div>
      ) : null}

      {activeVaultTab === "recommendations" ? (
        <div id={panelIds.recommendations} role="tabpanel" aria-labelledby={tabIds.recommendations} className="vault-recommendations vault-workspace-panel" data-vault-scroll-pane="recommendations">
          <div className="vault-recommendation-view-panel">
              <VaultRecommendationEvidencePanel
                interfaceLocale={props.interfaceLocale}
                sourceState={props.recommendationSourceState}
                wishlistActions={props.wishlistActions}
                onCopyAuditReport={props.onCopyRecommendationAudit}
                onManagedSourcesChange={(sources) => {
                  setManagedRecommendationSources([...sources]);
                  setManagedRecommendationSourcesLoadState("ready");
                }}
              />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getVaultWorkspaceScrollRoot(
  panelIds: Record<VaultWorkspaceTab, string>,
  tab: VaultWorkspaceTab
): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const page = document.querySelector<HTMLElement>(".vault-page");
  const pane = tab === "filters"
    ? page?.querySelector<HTMLElement>('[data-vault-scroll-pane="filters"]') ?? null
    : document.getElementById(panelIds[tab]);
  if (pane && getComputedStyle(pane).overflowY !== "visible") return pane;
  return page;
}

function vaultResourceStatusLabel(copy: VaultCopy, status: VaultAccountResourceStatus): string {
  switch (status) {
    case "cached": return vaultText(copy, "本地缓存");
    case "stale": return vaultText(copy, "缓存已过期");
    case "refreshing": return vaultText(copy, "正在同步装备数据");
    case "loading": return vaultText(copy, "正在读取装备数据");
    case "ready": return vaultText(copy, "装备数据已同步");
    case "error": return vaultText(copy, "读取失败");
    default: return vaultText(copy, "装备数据不可用");
  }
}

function vaultResourceStatusTone(status: VaultAccountResourceStatus): string {
  switch (status) {
    case "cached":
    case "ready": return "status-success";
    case "stale": return "status-warning";
    case "refreshing":
    case "loading": return "status-pending";
    case "error": return "status-error";
    default: return "status-neutral";
  }
}

function vaultRecommendationWorkflowStatus(copy: VaultCopy, scan?: VaultRecommendationSourceState["recommendationScan"]): { label: string; tone: "neutral" | "pending" | "success" | "error" } {
  if (scan?.blocking_reason === "recommendation_unavailable"
    || scan?.issues?.some((issue) => issue.code === "recommendation_unavailable")) {
    return { label: vaultText(copy, "推荐数据未准备"), tone: "pending" };
  }
  if (scan?.phase === "scanning") return { label: vaultText(copy, "正在核对推荐"), tone: "pending" };
  if (scan?.phase === "partial") return { label: vaultText(copy, "部分核对完成"), tone: "pending" };
  if (scan?.phase === "error") return { label: vaultText(copy, "推荐核对失败"), tone: "error" };
  if (scan?.phase === "complete") return { label: vaultTemplate(copy, "已核对 {count} 件", { count: scan.scanned_weapon_count }), tone: "success" };
  return { label: vaultText(copy, "尚未核对"), tone: "neutral" };
}

type VaultRecommendationFilterOption<T extends string> = {
  key: T;
  label: string;
  count: number;
};

type VaultRecommendationSourceFilterState = {
  sourceId: string;
  primaryOptions: Array<VaultRecommendationFilterOption<VaultRecommendationPrimaryFilter>>;
  completeOptions: Array<VaultRecommendationFilterOption<VaultRecommendationCompleteFilter>>;
};

function buildVaultRecommendationFilterState(input: {
  copy: VaultCopy;
  contextualItems: readonly AccountItemSummary[];
  factIndex: VaultRecommendationFilterFactIndex;
  selections: readonly VaultRecommendationSourceSelection[];
  sourceIds: readonly string[];
  recommendationCardSummary?: ReadonlyMap<string, RecommendationCardSummary>;
  recommendationScanComplete: boolean;
}): {
  items: AccountItemSummary[];
  sources: VaultRecommendationSourceFilterState[];
} {
  const sourceIds = input.sourceIds.length
    ? input.sourceIds
    : input.selections.map((selection) => selection.sourceId);
  if (!sourceIds.length) return { items: [...input.contextualItems], sources: [] };
  const sourceStates: VaultRecommendationSourceFilterState[] = sourceIds.map((sourceId) => {
    const selection = input.selections.find((item) => item.sourceId === sourceId) ?? { sourceId, primaryFilter: "all", completeFilter: "all" };
    const candidates = input.contextualItems.filter((item) => input.selections.every((other) => (
      other.sourceId === sourceId || matchesSourceSelection(item, other, input)
    )));
    const primaryCounts = new Map<Exclude<VaultRecommendationPrimaryFilter, "all">, number>();
    const completeCounts = new Map<VaultRecommendationMetricKey, number>();
    const metricKeys = new Set<VaultRecommendationMetricKey>();
    const completeKeys = new Set<VaultRecommendationMetricKey>();
    for (const item of candidates) {
      const fact = getSourceFact(item, sourceId, input);
      if (!fact) continue;
      primaryCounts.set(fact.primaryKey, (primaryCounts.get(fact.primaryKey) ?? 0) + 1);
      if (isVaultRecommendationMetricKey(fact.primaryKey)) metricKeys.add(fact.primaryKey);
      // 所有来源都有完整口径：完整键不再按来源类型过滤。
      if (fact.completeKey) completeKeys.add(fact.completeKey);
    }
    const primaryOptions: Array<VaultRecommendationFilterOption<VaultRecommendationPrimaryFilter>> = [
      { key: "all", label: vaultText(input.copy, "全部"), count: candidates.filter((item) => hasSourceRecord(item, sourceId, input.factIndex)).length },
      ...[...metricKeys].sort(compareVaultRecommendationMetricKeys).map((key) => ({ key, label: key, count: primaryCounts.get(key) ?? 0 })),
      ...(["unrequired", "uncheckable", "uncovered"] as const).map((key) => ({ key, label: vaultRecommendationPrimaryFilterLabel(input.copy, key), count: primaryCounts.get(key) ?? 0 }))
    ];
    const completeBase = candidates.filter((item) => {
      const fact = getSourceFact(item, sourceId, input);
      return selection.primaryFilter === "all"
        ? hasSourceRecord(item, sourceId, input.factIndex)
        : Boolean(fact && fact.primaryKey === selection.primaryFilter);
    });
    for (const item of completeBase) {
      const completeKey = getSourceFact(item, sourceId, input)?.completeKey;
      if (completeKey) completeCounts.set(completeKey, (completeCounts.get(completeKey) ?? 0) + 1);
    }
    return {
      sourceId,
      primaryOptions,
      completeOptions: [
        { key: "all", label: vaultText(input.copy, "不限"), count: completeBase.length },
        ...[...completeKeys].sort(compareVaultRecommendationMetricKeys).map((key) => ({ key, label: key, count: completeCounts.get(key) ?? 0 }))
      ]
    };
  });
  const items = input.contextualItems.filter((item) => input.selections.every((selection) => matchesSourceSelection(item, selection, input)));
  return { items, sources: sourceStates };
}

function getSourceFact(item: AccountItemSummary, sourceId: string, input: {
  factIndex: VaultRecommendationFilterFactIndex;
  recommendationCardSummary?: ReadonlyMap<string, RecommendationCardSummary>;
  recommendationScanComplete: boolean;
}): VaultRecommendationFilterFact | undefined {
  const fact = getVaultRecommendationFilterFact(input.factIndex, getVaultCommunityInstanceKey(item), sourceId);
  if (fact) return fact;
  if (input.recommendationScanComplete || input.recommendationCardSummary?.has(getVaultCommunityInstanceKey(item))) {
    return { primaryKey: "uncovered" };
  }
  return undefined;
}

function hasSourceRecord(item: AccountItemSummary, sourceId: string, factIndex: VaultRecommendationFilterFactIndex): boolean {
  return Boolean(getVaultRecommendationFilterFact(factIndex, getVaultCommunityInstanceKey(item), sourceId));
}

function matchesSourceSelection(item: AccountItemSummary, selection: VaultRecommendationSourceSelection, input: {
  factIndex: VaultRecommendationFilterFactIndex;
  recommendationCardSummary?: ReadonlyMap<string, RecommendationCardSummary>;
  recommendationScanComplete: boolean;
}): boolean {
  const fact = getSourceFact(item, selection.sourceId, input);
  if (!fact) return false;
  return (selection.primaryFilter === "all"
    ? hasSourceRecord(item, selection.sourceId, input.factIndex)
    : fact.primaryKey === selection.primaryFilter)
    && (selection.completeFilter === "all" || fact.completeKey === selection.completeFilter);
}

function buildVaultRecommendationAllowedItemKeys(input: {
  catalogItems: readonly AccountItemSummary[];
  factIndex: VaultRecommendationFilterFactIndex;
  selections: readonly VaultRecommendationSourceSelection[];
  recommendationCardSummary?: ReadonlyMap<string, RecommendationCardSummary>;
  recommendationScanComplete: boolean;
}): ReadonlySet<string> | undefined {
  if (!input.selections.length) {
    return undefined;
  }
  const allowed = new Set<string>();
  for (const item of input.catalogItems) {
    if (input.selections.every((selection) => matchesSourceSelection(item, selection, input))) {
      allowed.add(getVaultSelectionItemKey(item));
    }
  }
  return allowed;
}

function isVaultRecommendationMetricKey(
  value: Exclude<VaultRecommendationPrimaryFilter, "all">
): value is VaultRecommendationMetricKey {
  return value.includes("/");
}

function useStableVaultCatalogItems(items: AccountItemSummary[]): AccountItemSummary[] {
  const cachedRef = useRef<{ signatures: string[]; items: AccountItemSummary[] }>({
    signatures: [],
    items: []
  });
  return useMemo(() => {
    const signatures = items.map(vaultCatalogItemSignature).sort();
    if (sameStringList(cachedRef.current.signatures, signatures)) {
      return cachedRef.current.items;
    }
    cachedRef.current = { signatures, items };
    return items;
  }, [items]);
}

function vaultCatalogItemSignature(item: AccountItemSummary): string {
  return [
    getVaultSelectionItemKey(item),
    item.hash,
    item.group_key,
    item.item_type ?? "",
    item.class_type ?? "",
    item.ammo_type ?? "",
    item.equipment_bucket_hash ?? "",
    item.armor_set?.hash ?? "",
    item.weapon_frame?.key ?? ""
  ].join(":");
}

function sameStringList(previous: readonly string[], next: readonly string[]): boolean {
  return previous.length === next.length
    && previous.every((value, index) => value === next[index]);
}

/**
 * 分段按钮的完整说法，只用于悬停与读屏。
 *
 * 可见文字是裸的命中档（`2/2`）加独立数量徽标：分段组左边已经挂着可见标签「perk 命中」，
 * 组内再写一遍「命中 2/2」是重复，而加上「命中」前缀又不带说法就会拼出「perk 命中 命中 1/2」。
 * 这句话要说清的是**来源要求的项数与其中命中的项数**（分子分母）。
 */
function formatVaultRecommendationMetricOptionDescription(
  copy: VaultCopy,
  key: VaultRecommendationPrimaryFilter,
  count: number
): string {
  if (key === "all") return vaultTemplate(copy, "全部：有本来源记录的候选，{count} 件", { count });
  if (key === "unrequired") return vaultTemplate(copy, "未要求：来源没提要求，{count} 件", { count });
  if (key === "uncheckable") return vaultTemplate(copy, "无法判断：有要求核对不了，{count} 件", { count });
  if (key === "uncovered") return vaultTemplate(copy, "未收录：本来源没有这些武器的记录，{count} 件", { count });
  const [matched, required] = key.split("/");
  return vaultTemplate(copy, "要求 {required} 项，命中 {matched} 项，{count} 件", { required, matched, count });
}

function buildActiveFilterLabels(input: {
  copy: VaultCopy;
  group: VaultGroupFilter;
  query: string;
  sortKey: VaultSortKey;
  slotFilter: VaultSlotFilter;
  slotLabel?: string;
  locationFilter: VaultLocationFilter;
  itemTypeFilter: string;
  rarityFilter: VaultRarityFilter;
  gearTierFilter: VaultGearTierFilter;
  ammoFilter: VaultAmmoFilter;
  damageFilter: VaultDamageFilter;
  championFilter: VaultChampionFilter;
  craftingFilter: VaultCraftingFilter;
  classFilter: VaultClassFilter;
  armorSetFilter: VaultArmorSetFilter;
  armorSetLabel?: string;
  lockFilter: VaultLockFilter;
  tagFilter: VaultTagFilter;
  recommendationSelectionLabels: readonly string[];
  frameFilter: string;
  frameLabel?: string;
  armorRuleCount: number;
}): string[] {
  const copy = input.copy;
  return [
    input.query.trim() ? vaultTemplate(copy, "搜索：{query}", { query: input.query.trim() }) : "",
    input.sortKey !== "name" ? copy.labels.sorts[input.sortKey] : "",
    input.slotFilter !== "all" ? vaultTemplate(copy, "槽位：{slot}", { slot: input.slotLabel ?? input.slotFilter }) : "",
    input.locationFilter !== (input.group === "weapons" ? "vault" : "all")
      ? vaultTemplate(copy, "所在位置：{location}", { location: copy.labels.locations[input.locationFilter] })
      : "",
    input.itemTypeFilter !== "all" ? vaultTemplate(copy, "类型：{type}", { type: input.itemTypeFilter }) : "",
    input.rarityFilter !== "all" ? vaultTemplate(copy, "稀有度：{rarity}", { rarity: copy.labels.rarity[input.rarityFilter] }) : "",
    input.gearTierFilter !== "all" ? vaultTemplate(copy, "阶级：{tier}", { tier: copy.labels.gearTiers[input.gearTierFilter] }) : "",
    input.ammoFilter !== "all" ? vaultTemplate(copy, "弹药：{ammo}", { ammo: copy.labels.ammo[input.ammoFilter] }) : "",
    input.damageFilter !== "all" ? vaultTemplate(copy, "属性：{damage}", { damage: copy.labels.damage[input.damageFilter] }) : "",
    input.championFilter !== "all" ? vaultTemplate(copy, "反勇士：{champion}", { champion: copy.labels.champions[input.championFilter] }) : "",
    input.craftingFilter !== "all" ? vaultTemplate(copy, "锻造状态：{crafting}", { crafting: copy.labels.crafting[input.craftingFilter] }) : "",
    input.classFilter !== "all" ? vaultTemplate(copy, "职业：{className}", { className: copy.labels.classes[input.classFilter] }) : "",
    input.armorSetFilter !== "all" ? vaultTemplate(copy, "护甲套装：{set}", { set: input.armorSetLabel ?? input.armorSetFilter }) : "",
    input.lockFilter !== "all" ? copy.labels.locks[input.lockFilter] : "",
    input.tagFilter !== "all"
      ? vaultTemplate(copy, "整理状态：{tag}", {
          tag: input.tagFilter === "untagged"
            ? input.group === "weapons" ? vaultText(copy, "未整理") : vaultText(copy, "未标记")
            : copy.labels.tags[input.tagFilter]
        })
      : "",
    ...input.recommendationSelectionLabels,
    input.frameFilter && input.frameFilter !== "all" ? vaultTemplate(copy, "武器框架：{frame}", { frame: input.frameLabel ?? input.frameFilter }) : "",
    input.armorRuleCount ? vaultTemplate(copy, "护甲属性：{count} 条", { count: input.armorRuleCount }) : ""
  ].filter(Boolean);
}

function sameManagedRecommendationSources(
  left: readonly VaultRecommendationManagedSource[],
  right: readonly VaultRecommendationManagedSource[]
): boolean {
  return left.length === right.length && left.every((source, index) => {
    const candidate = right[index];
    return candidate?.source_key === source.source_key
      && candidate.label === source.label
      && candidate.state === source.state
      && candidate.configured === source.configured
      && candidate.rule_count === source.rule_count
      && candidate.weapon_count === source.weapon_count
      && candidate.revision === source.revision
      && candidate.imported_at === source.imported_at
      && candidate.affected_instance_count === source.affected_instance_count
      // 仓库那一半必须单独比：把一把枪从邮政官挪进仓库，全账号数不动、仓库数变了，
      // 只比全账号数就会判成「没变」而把旧的仓库数留在屏幕上。
      && candidate.vault_instance_count === source.vault_instance_count
      // 事实键决定了哪些事实算这一行的：它变了就必须让下游重算，否则会留下上一次的归队结果。
      && candidate.fact_keys.length === source.fact_keys.length
      && candidate.fact_keys.every((key, keyIndex) => key === source.fact_keys[keyIndex]);
  });
}

function getQuickActionCharacterId(item: AccountItemSummary, currentCharacterId?: string): string {
  const locatedItem = item as AccountItemSummary & { source_character_id?: string };
  return getItemSourceKind(item) === "vault"
    ? currentCharacterId ?? ""
    : locatedItem.source_character_id ?? currentCharacterId ?? "";
}

function getItemSourceKind(item: AccountItemSummary): "equipped" | "inventory" | "vault" | "postmaster" {
  if ("source_kind" in item) {
    const sourceKind = item.source_kind;
    if (sourceKind === "equipped" || sourceKind === "inventory" || sourceKind === "postmaster") {
      return sourceKind;
    }
  }
  return "vault";
}
