import { useCallback, useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import { buildItemDecision, type ItemDecision } from "@d2-tools/core/evidence/itemDecision";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { VaultItemMatchInfo } from "@d2-tools/core/community-perks";
import type { SaveVaultTagInput, VaultTags, VaultTagValue } from "@d2-tools/core/vault/tags";
import type { LoadoutTemplateLookup } from "@d2-tools/app/loadouts";
import type {
  VaultAmmoFilter,
  VaultArmorStatRule,
  VaultFrameFilter,
  VaultGroupFilter,
  VaultLockFilter,
  VaultSlotFilter,
  VaultSortKey,
  VaultTagFilter
} from "@d2-tools/app/vault";
import {
  armorStatLabels,
  applyVisibleVaultSelection,
  buildVaultDuplicateSummary,
  buildVaultSelectionSummary,
  createVaultListWorkspace,
  defaultVaultGroupTab,
  getVaultItemKey,
  selectMarkedCleanupItems,
  selectVaultBatchItems,
  sortLabels,
  type VaultBatchSelectionMode,
  type VaultVisibleSelectionMode
} from "@d2-tools/app/vault";
import { matchesLoadoutTemplateItem } from "@d2-tools/app/loadouts";
import { VaultDuplicateGroups } from "./VaultDuplicateGroups.js";
import { VaultFilterToolbar } from "./VaultFilterToolbar.js";
import { VaultItemSections } from "./VaultItemSections.js";
import { VaultOrganizePanel } from "./VaultOrganizePanel.js";
import {
  VaultRecommendationImportPanel,
  type VaultRecommendationImportActions
} from "./VaultRecommendationImportPanel.js";
import {
  VaultTargetRulesPanel,
  type VaultTargetRulesActions
} from "./VaultTargetRulesPanel.js";
import {
  useVaultBatchActions,
  type VaultCleanupActions
} from "./useVaultBatchActions.js";
import { ProductWorkspaceCommandBar } from "../workspace/ProductWorkspace.js";

type VaultWorkspaceTab = "filters" | "cleanup" | "duplicates" | "recommendations";

const vaultWorkspaceTabs: Array<{ key: VaultWorkspaceTab; label: string; description: string }> = [
  { key: "filters", label: "筛选列表", description: "按类型、perk、标签和属性快速定位装备" },
  { key: "cleanup", label: "清理工作台", description: "处理已标记可清理装备和批量移动" },
  { key: "duplicates", label: "同名对比", description: "比较同名或同 Hash 装备的 roll 差异" },
  { key: "recommendations", label: "推荐数据", description: "查看 DIM 愿望单和社区推荐命中" }
];

export function VaultPageContentView(props: {
  items: AccountItemSummary[];
  vaultItemCount?: number;
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  highlightedLabel?: string;
  tags: VaultTags;
  wishlist?: DimWishlist | null;
  localTargetRules?: LocalTargetRules | null;
  openingItemKey?: string;
  locateRequest?: { hash: number; name: string; requestId: number } | null;
  communityMatch?: Map<number, VaultItemMatchInfo>;
  recommendationImportActions?: VaultRecommendationImportActions;
  targetRulesActions?: VaultTargetRulesActions;
  onContextFactsChange?: (facts: string[]) => void;
  onOpenItem: (item: AccountItemSummary) => void;
  onSaveTag: (item: AccountItemSummary, tag: VaultTagValue) => void | Promise<void>;
  onSaveTagBatch: (inputs: SaveVaultTagInput[]) => void | Promise<void>;
  cleanupActions?: VaultCleanupActions;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<VaultGroupFilter>(defaultVaultGroupTab);
  const [sortKey, setSortKey] = useState<VaultSortKey>("name");
  const [tagFilter, setTagFilter] = useState<VaultTagFilter>("all");
  const [lockFilter, setLockFilter] = useState<VaultLockFilter>("all");
  const [slotFilter, setSlotFilter] = useState<VaultSlotFilter>("all");
  const [ammoFilter, setAmmoFilter] = useState<VaultAmmoFilter>("all");
  const [armorStatRules, setArmorStatRules] = useState<VaultArmorStatRule[]>([]);
  const [frameFilters, setFrameFilters] = useState<VaultFrameFilter>([]);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [isCleanupMode, setIsCleanupMode] = useState(false);
  const [cleanupCharacterId, setCleanupCharacterId] = useState("");
  const [activeVaultTab, setActiveVaultTab] = useState<VaultWorkspaceTab>("filters");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const workspaceId = useId();
  const tabIds = useMemo(() => Object.fromEntries(vaultWorkspaceTabs.map((tab) => [tab.key, `${workspaceId}-${tab.key}-tab`])) as Record<VaultWorkspaceTab, string>, [workspaceId]);
  const panelIds = useMemo(() => Object.fromEntries(vaultWorkspaceTabs.map((tab) => [tab.key, `${workspaceId}-${tab.key}-panel`])) as Record<VaultWorkspaceTab, string>, [workspaceId]);

  useEffect(() => {
    if (!props.locateRequest) return;
    setQuery(String(props.locateRequest.hash));
    setGroup("all");
    setTagFilter("all");
    setLockFilter("all");
    setSlotFilter("all");
    setAmmoFilter("all");
    setArmorStatRules([]);
    setFrameFilters([]);
    setActiveVaultTab("filters");
    setIsCleanupMode(false);
  }, [props.locateRequest?.requestId]);
  const cleanupCharacters = props.cleanupActions?.characters ?? [];
  const cleanupTargetCharacterId = cleanupCharacterId
    || props.cleanupActions?.currentCharacterId
    || cleanupCharacters[0]?.character_id
    || "";
  const listWorkspace = useMemo(
    () => createVaultListWorkspace({
      items: props.items,
      filter: {
        group,
        query,
        tag: tagFilter,
        lock: lockFilter,
        slot: slotFilter,
        ammo: ammoFilter,
        armorStatRules,
        frames: frameFilters
      },
      sortKey,
      tags: props.tags,
      wishlist: props.wishlist,
      localTargetRules: props.localTargetRules
    }),
    [ammoFilter, armorStatRules, frameFilters, group, lockFilter, props.items, props.localTargetRules, props.tags, props.wishlist, query, slotFilter, sortKey, tagFilter]
  );
  const groups = listWorkspace.groups;
  const availableFrameFilters = listWorkspace.availableFrameFilters;
  const slotFilters = listWorkspace.slotFilters;
  const filteredItems = listWorkspace.filteredItems;
  const filteredSections = listWorkspace.sections;
  const vaultItemCount = props.vaultItemCount ?? props.items.length;
  const selectedItems = useMemo(
    () => props.items.filter((item) => selectedKeys.has(getVaultItemKey(item))),
    [props.items, selectedKeys]
  );
  const markedCleanupItems = useMemo(
    () => selectMarkedCleanupItems(props.items, props.tags),
    [props.items, props.tags]
  );
  const cleanupListWorkspace = useMemo(
    () => createVaultListWorkspace({
      items: markedCleanupItems,
      filter: {
        group,
        query: "",
        tag: "all",
        lock: "all",
        slot: "all",
        ammo: "all",
        armorStatRules: [],
        frames: []
      },
      sortKey,
      tags: props.tags,
      wishlist: props.wishlist,
      localTargetRules: props.localTargetRules
    }),
    [group, markedCleanupItems, props.localTargetRules, props.tags, props.wishlist, sortKey]
  );
  const activeVisibleItems = activeVaultTab === "cleanup"
    ? cleanupListWorkspace.filteredItems
    : filteredItems;
  const selectedVisibleItemCount = useMemo(
    () => activeVisibleItems.filter((item) => selectedKeys.has(getVaultItemKey(item))).length,
    [activeVisibleItems, selectedKeys]
  );
  const selectionSummary = useMemo(
    () => buildVaultSelectionSummary({
      selectedTotalCount: selectedKeys.size,
      selectedVisibleCount: selectedVisibleItemCount
    }),
    [selectedKeys, selectedVisibleItemCount]
  );
  const wishlistSummaryCount = listWorkspace.wishlistMatchCount;
  const targetSummaryCount = listWorkspace.localTargetMatchCount;
  const loadoutMatchCount = useMemo(
    () => props.highlightedItemKeys
      ? filteredItems.filter((item) => matchesLoadoutTemplateItem(item, props.highlightedItemKeys)).length
      : 0,
    [filteredItems, props.highlightedItemKeys]
  );
  const selectedCleanupItems = useMemo(
    () => markedCleanupItems.filter((item) => selectedKeys.has(getVaultItemKey(item))),
    [markedCleanupItems, selectedKeys]
  );
  const cleanupActionItems = selectedCleanupItems.length ? selectedCleanupItems : markedCleanupItems;
  const cleanupTargetCharacterLabel = cleanupCharacters.find((character) => character.character_id === cleanupTargetCharacterId)?.class_name
    ?? props.cleanupActions?.currentCharacterLabel
    ?? "";
  const {
    activeBatchAction,
    applyBatchTag,
    applyDuplicateGroupTags,
    batchMessage,
    copyCleanupList,
    isBatchSaving,
    mergeSelectedKeys,
    runCleanupAction,
    runSelectedBulkMove,
    setActiveBatchAction,
    setBatchMessage
  } = useVaultBatchActions({
    selectedItems,
    cleanupActionItems,
    filteredItems,
    tags: props.tags,
    isCleanupMode,
    cleanupActions: props.cleanupActions,
    cleanupTargetCharacterId,
    cleanupTargetCharacterLabel,
    setSelectedKeys,
    setIsOrganizing,
    setIsCleanupMode,
    onSaveTag: props.onSaveTag,
    onSaveTagBatch: props.onSaveTagBatch
  });
  const duplicateSummary = useMemo(
    () => buildVaultDuplicateSummary(props.items, props.tags),
    [props.items, props.tags]
  );
  const decisionSummary = useMemo(
    () => buildVaultDecisionSummary(props.items, props.tags),
    [props.items, props.tags]
  );
  useEffect(() => {
    props.onContextFactsChange?.(listWorkspace.contextFacts);
  }, [listWorkspace.contextFacts, props.onContextFactsChange]);
  function setBatchSelection(mode: VaultBatchSelectionMode) {
    setSelectedKeys(new Set(selectVaultBatchItems(activeVisibleItems, mode, props.tags, props.localTargetRules).map(getVaultItemKey)));
    setBatchMessage("");
  }

  function updateVisibleSelection(mode: VaultVisibleSelectionMode) {
    setSelectedKeys((current) => applyVisibleVaultSelection(current, activeVisibleItems, mode));
    setBatchMessage("");
  }

  const toggleSelected = useCallback((item: AccountItemSummary) => {
    const itemKey = getVaultItemKey(item);
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(itemKey)) {
        next.delete(itemKey);
      } else {
        next.add(itemKey);
      }
      return next;
    });
    setBatchMessage("");
  }, [setBatchMessage]);

  function clearFilters() {
    setQuery("");
    setGroup(defaultVaultGroupTab);
    setSortKey("name");
    setTagFilter("all");
    setLockFilter("all");
    setSlotFilter("all");
    setAmmoFilter("all");
    setArmorStatRules([]);
    setFrameFilters([]);
    setActiveBatchAction("");
    setBatchMessage("");
  }

  function switchVaultFilterMode(nextGroup: VaultGroupFilter) {
    if (nextGroup === "weapons") {
      setGroup("weapons");
      setArmorStatRules([]);
    } else if (nextGroup === "armor") {
      setGroup("armor");
      setAmmoFilter("all");
      setFrameFilters([]);
    } else {
      setGroup(nextGroup);
      setAmmoFilter("all");
      setArmorStatRules([]);
      setFrameFilters([]);
    }
    setBatchMessage("");
  }

  function addArmorStatRule() {
    setArmorStatRules((current) => {
      const used = new Set(current.map((rule) => rule.stat));
      const nextStat = (Object.keys(armorStatLabels) as Array<Exclude<VaultArmorStatRule["stat"], "">>)
        .find((stat) => !used.has(stat));
      return nextStat ? [...current, { stat: nextStat, min: 10 }] : current;
    });
  }

  function updateArmorStatRule(index: number, rule: VaultArmorStatRule) {
    setArmorStatRules((current) => current.map((item, itemIndex) => itemIndex === index ? rule : item));
  }

  function removeArmorStatRule(index: number) {
    setArmorStatRules((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function toggleFrameFilter(key: string) {
    setFrameFilters((current) => (
      current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key]
    ));
  }

  function toggleOrganizingMode() {
    setIsOrganizing(!isOrganizing);
    setIsCleanupMode(false);
    setSelectedKeys(new Set());
    setBatchMessage("");
  }

  function switchVaultTab(tab: VaultWorkspaceTab) {
    setActiveVaultTab(tab);
    setBatchMessage("");
    if (tab === "cleanup" && !isCleanupMode) {
      setIsCleanupMode(true);
      setIsOrganizing(false);
      setSelectedKeys(new Set(markedCleanupItems.map(getVaultItemKey)));
    }
    if (tab !== "cleanup" && isCleanupMode) {
      setIsCleanupMode(false);
      setSelectedKeys(new Set());
    }
  }

  function handleVaultTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = vaultWorkspaceTabs.findIndex((tab) => tab.key === activeVaultTab);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? vaultWorkspaceTabs.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + vaultWorkspaceTabs.length) % vaultWorkspaceTabs.length;
    const nextTab = vaultWorkspaceTabs[nextIndex]?.key ?? "filters";
    switchVaultTab(nextTab);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  }

  function showCleanupCandidates() {
    setBatchMessage("");
    setTagFilter("junk");
    switchVaultTab("filters");
  }

  function showTargetMatches() {
    setBatchMessage("");
    setTagFilter("target");
    switchVaultTab("filters");
  }

  function renderVaultItems(
    sections = filteredSections,
    searchActive = Boolean(query.trim()),
    emptyMessage?: string
  ) {
    return (
      <VaultItemSections
        sections={sections}
        highlightedItemKeys={props.highlightedItemKeys}
        tags={props.tags}
        wishlist={props.wishlist}
        localTargetRules={props.localTargetRules}
        communityMatch={props.communityMatch}
        isOrganizing={isOrganizing}
        isSearchActive={searchActive}
        selectedKeys={selectedKeys}
        openingItemKey={props.openingItemKey}
        emptyMessage={emptyMessage}
        onSelectItem={props.onOpenItem}
        onToggleSelected={toggleSelected}
      />
    );
  }

  return (
    <div className="vault-page">
        <ProductWorkspaceCommandBar className="vault-workflow-bar">
          <div className="vault-workflow-tabs" role="tablist" aria-label="仓库工作台">
            {vaultWorkspaceTabs.map((tab) => (
              <button
                type="button"
                role="tab"
                id={tabIds[tab.key]}
                aria-controls={panelIds[tab.key]}
                aria-selected={activeVaultTab === tab.key}
                tabIndex={activeVaultTab === tab.key ? 0 : -1}
                key={tab.key}
                className={activeVaultTab === tab.key ? "active" : ""}
                onClick={() => switchVaultTab(tab.key)}
                onKeyDown={handleVaultTabKeyDown}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="vault-workflow-meta">
            <span className="app-chip">已读取 {vaultItemCount} 件</span>
            <span className="app-chip status-pending">当前命中 {filteredItems.length} 件</span>
            {props.highlightedItemKeys ? <span className="app-chip status-ready">配装命中 {loadoutMatchCount} 件</span> : null}
          </div>
        </ProductWorkspaceCommandBar>
        {batchMessage ? <p className={batchMessage.includes("失败") ? "status-message status-error" : "status-message status-ready"}>{batchMessage}</p> : null}

        {activeVaultTab === "filters" ? (
          <div id={panelIds.filters} role="tabpanel" aria-labelledby={tabIds.filters} className="vault-workspace-panel">
            <div className="vault-command-bar vault-filter-command">
              <strong>{groups.find((item) => item.key === group)?.label ?? "全部"}</strong>
              <span>筛选草稿保留在当前页面；护甲属性条件同时成立。</span>
            </div>
            <div className="vault-browse">
              <VaultFilterToolbar
                query={query}
                sortKey={sortKey}
                tagFilter={tagFilter}
                armorStatRules={armorStatRules}
                lockFilter={lockFilter}
                slotFilter={slotFilter}
                ammoFilter={ammoFilter}
                frameFilters={frameFilters}
                group={group}
                groups={groups}
                slotFilters={slotFilters}
                availableFrameFilters={availableFrameFilters}
                onQueryChange={setQuery}
                onSortKeyChange={setSortKey}
                onTagFilterChange={setTagFilter}
                onAddArmorStatRule={addArmorStatRule}
                onClearArmorStatRules={() => setArmorStatRules([])}
                onRemoveArmorStatRule={removeArmorStatRule}
                onUpdateArmorStatRule={updateArmorStatRule}
                onLockFilterChange={setLockFilter}
                onSlotFilterChange={setSlotFilter}
                onAmmoFilterChange={setAmmoFilter}
                onGroupChange={switchVaultFilterMode}
                onToggleFrameFilter={toggleFrameFilter}
                onClearFilters={clearFilters}
              />
              <section className="vault-results-column vault-browse-results">
                <div className="vault-column-head"><h3>当前筛选结果</h3><span>{filteredItems.length} 件 · {sortLabels[sortKey]}</span></div>
                {renderVaultItems()}
              </section>
            </div>
          </div>
        ) : null}

        {activeVaultTab === "cleanup" ? (
          <div id={panelIds.cleanup} role="tabpanel" aria-labelledby={tabIds.cleanup} className="vault-tab-content vault-workspace-panel">
            <div className="vault-summary-strip">
              <div><span>已标记可清理</span><strong>{markedCleanupItems.length} 件</strong></div>
              <div><span>当前已选择</span><strong>{selectedCleanupItems.length} 件</strong></div>
              <div><span>数据边界</span><strong>只使用玩家标签，不自动评价</strong></div>
            </div>
            <VaultOrganizePanel groups={groups} group={group} isOrganizing={isOrganizing} filteredItemCount={cleanupListWorkspace.filteredItems.length} selectedItemCount={selectedCleanupItems.length} selectionSummary={selectionSummary} activeBatchAction={activeBatchAction} isBatchSaving={isBatchSaving} cleanupActions={props.cleanupActions} cleanupCharacters={cleanupCharacters} cleanupTargetCharacterId={cleanupTargetCharacterId} markedCleanupItemCount={markedCleanupItems.length} cleanupActionItems={cleanupActionItems} tags={props.tags} onGroupChange={setGroup} onToggleOrganizing={toggleOrganizingMode} onVisibleSelectionChange={updateVisibleSelection} onBatchSelectionChange={setBatchSelection} onClearSelection={() => setSelectedKeys(new Set())} onCleanupTargetCharacterChange={setCleanupCharacterId} onApplyBatchTag={applyBatchTag} onCopyCleanupList={copyCleanupList} onRunSelectedBulkMove={runSelectedBulkMove} onRunCleanupAction={runCleanupAction} />
            <div className="vault-cleanup-grid">
              <section>
                <div className="vault-column-head"><h3>待处理装备</h3><span>{markedCleanupItems.length ? `已标记 ${markedCleanupItems.length} 件` : "当前没有玩家标记"}</span></div>
                {renderVaultItems(cleanupListWorkspace.sections, false, "当前没有玩家标记的清理候选。不会按未锁定、低光等或系统评分自动生成清理结论。")}
              </section>
              <aside>{renderVaultSideSummary({ activeTab: activeVaultTab, decisionSummary, duplicateSummary, filteredCount: filteredItems.length, totalCount: props.items.length, markedCleanupCount: markedCleanupItems.length, wishlist: props.wishlist, wishlistSummaryCount, localTargetRules: props.localTargetRules, targetSummaryCount, onCleanupClick: showCleanupCandidates, onTargetClick: showTargetMatches, onDuplicatesClick: () => switchVaultTab("duplicates"), onCopyCleanupList: copyCleanupList })}</aside>
            </div>
          </div>
        ) : null}

        {activeVaultTab === "duplicates" ? <div id={panelIds.duplicates} role="tabpanel" aria-labelledby={tabIds.duplicates} className="vault-tab-content vault-workspace-panel"><div className="vault-summary-strip"><div><span>同名重复组</span><strong>{duplicateSummary.total_duplicate_groups} 组</strong></div><div><span>同 Hash 实例</span><strong>{duplicateSummary.total_duplicate_items} 件</strong></div><div><span>当前显示</span><strong>Roll、属性、来源差异</strong></div></div><VaultDuplicateGroups duplicateSummary={duplicateSummary} items={props.items} tags={props.tags} localTargetRules={props.localTargetRules} selectedKeys={selectedKeys} openingItemKey={props.openingItemKey} isBatchSaving={isBatchSaving} onOpenItem={props.onOpenItem} onMergeSelectedKeys={mergeSelectedKeys} onApplyDuplicateGroupTags={applyDuplicateGroupTags} /></div> : null}

        {activeVaultTab === "recommendations" ? <div id={panelIds.recommendations} role="tabpanel" aria-labelledby={tabIds.recommendations} className="vault-recommendations vault-workspace-panel"><section><div className="vault-column-head"><h3>推荐数据源</h3><span>本地导入或授权</span></div><p className="status-message status-neutral">推荐只显示数据源匹配，不生成主观 Roll 结论。DIM Wishlist、已授权社区推荐和个人知识分别保留来源。</p><VaultRecommendationImportPanel wishlist={props.wishlist} actions={props.recommendationImportActions} /></section><aside><div className="vault-column-head"><h3>本地目标规则</h3><span>高级</span></div><VaultTargetRulesPanel items={props.items} rules={props.localTargetRules ?? { action_policy: "notify_only", armor: [], weapons: [] }} actions={props.targetRulesActions} /></aside></div> : null}
      </div>
  );
}

function buildVaultDecisionSummary(
  items: AccountItemSummary[],
  tags: VaultTags
): Record<ItemDecision["decision"], number> {
  return items.reduce<Record<ItemDecision["decision"], number>>(
    (summary, item) => {
      const itemKey = getVaultItemKey(item);
      const decision = buildItemDecision({
        itemKey,
        itemName: item.name,
        locked: item.locked,
        localTag: tags.items[itemKey]?.tag ?? "none"
      });
      summary[decision.decision] += 1;
      return summary;
    },
    {
      keep: 0,
      review: 0,
      cleanup_candidate: 0,
      unknown: 0
    }
  );
}

function renderVaultSideSummary(input: {
  activeTab: VaultWorkspaceTab;
  decisionSummary: Record<ItemDecision["decision"], number>;
  duplicateSummary: ReturnType<typeof buildVaultDuplicateSummary>;
  filteredCount: number;
  totalCount: number;
  markedCleanupCount: number;
  wishlist?: DimWishlist | null;
  wishlistSummaryCount: number;
  localTargetRules?: LocalTargetRules | null;
  targetSummaryCount: number;
  onCleanupClick: () => void;
  onTargetClick: () => void;
  onDuplicatesClick: () => void;
  onCopyCleanupList: () => void | Promise<void>;
}) {
  const activeTabLabel = vaultWorkspaceTabs.find((tab) => tab.key === input.activeTab)?.label ?? "筛选列表";
  const hasLocalTargets = Boolean(input.localTargetRules?.armor.length || input.localTargetRules?.weapons?.length);

  return (
    <div className="vault-side-summary-inner">
      <div className="vault-side-heading">
        <span>当前任务</span>
        <strong>{activeTabLabel}</strong>
        <small>当前筛选命中 {input.filteredCount} / {input.totalCount} 件</small>
      </div>
      <div className="vault-decision-summary" aria-label="仓库整理决策摘要">
        <strong>整理决策</strong>
        <span data-decision="keep">必留 {input.decisionSummary.keep} 件</span>
        <span data-decision="review">复查 {input.decisionSummary.review} 件</span>
        <span data-decision="cleanup">可清理候选 {input.decisionSummary.cleanup_candidate} 件</span>
        <span data-decision="unknown">未知 {input.decisionSummary.unknown} 件</span>
      </div>
      <div className="vault-side-signal-list">
        <div className="vault-side-signal">
          <span>同名重复</span>
          <strong>{input.duplicateSummary.total_duplicate_groups} 组</strong>
          <small>{input.duplicateSummary.total_duplicate_items} 件需要对比 roll、属性或来源。</small>
        </div>
        <div className="vault-side-signal">
          <span>DIM 命中</span>
          <strong>{input.wishlist ? `${input.wishlistSummaryCount} 件` : "未导入"}</strong>
          <small>{input.wishlist ? "只使用你导入的 DIM 规则。" : "导入后可按愿望单命中筛选。"}</small>
        </div>
        {hasLocalTargets ? (
          <button type="button" className="vault-side-signal" onClick={input.onTargetClick}>
            <span>本地目标命中</span>
            <strong>{input.targetSummaryCount} 件</strong>
            <small>来自你保存的护甲阈值或武器规则。</small>
          </button>
        ) : null}
      </div>
      <div className="vault-side-actions">
        <button type="button" onClick={input.onCleanupClick}>查看可清理候选</button>
        <button type="button" className="secondary-button" onClick={input.onDuplicatesClick}>进入同名对比</button>
        <button type="button" className="secondary-button" disabled={!input.markedCleanupCount} onClick={input.onCopyCleanupList}>复制清理清单</button>
      </div>
    </div>
  );
}
