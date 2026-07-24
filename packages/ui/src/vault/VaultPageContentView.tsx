import { useCallback, useEffect, useMemo, useState } from "react";
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
  VaultFilter,
  VaultFrameFilter,
  VaultGroupFilter,
  VaultLockFilter,
  VaultSlotFilter,
  VaultSlotSummary,
  VaultSortKey,
  VaultTagFilter
} from "@d2-tools/app/vault";
import {
  ammoFilterLabels,
  applyVisibleVaultSelection,
  buildVaultDuplicateSummary,
  buildVaultSelectionSummary,
  createVaultListWorkspace,
  defaultVaultGroupTab,
  getVaultItemKey,
  lockFilterLabels,
  selectMarkedCleanupItems,
  selectVaultBatchItems,
  sortLabels,
  tagLabels,
  type VaultBatchSelectionMode,
  type VaultVisibleSelectionMode
} from "@d2-tools/app/vault";
import { matchesLoadoutTemplateItem } from "@d2-tools/app/loadouts";
import { VaultDuplicateGroups } from "./VaultDuplicateGroups.js";
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
    () => filteredItems.filter((item) => selectedKeys.has(getVaultItemKey(item))),
    [filteredItems, selectedKeys]
  );
  const selectionSummary = useMemo(
    () => buildVaultSelectionSummary({
      selectedTotalCount: selectedKeys.size,
      selectedVisibleCount: selectedItems.length
    }),
    [selectedItems.length, selectedKeys]
  );
  const markedCleanupItems = useMemo(
    () => selectMarkedCleanupItems(props.items, props.tags),
    [props.items, props.tags]
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
    setSelectedKeys(new Set(selectVaultBatchItems(filteredItems, mode, props.tags, props.localTargetRules).map(getVaultItemKey)));
    setBatchMessage("");
  }

  function updateVisibleSelection(mode: VaultVisibleSelectionMode) {
    setSelectedKeys((current) => applyVisibleVaultSelection(current, filteredItems, mode));
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
      setGroup("all");
    }
    setBatchMessage("");
  }

  function addArmorStatRule() {
    setArmorStatRules((current) => [...current, { stat: "", min: 0 }]);
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

  function renderVaultItems() {
    return (
      <VaultItemSections
        sections={filteredSections}
        highlightedItemKeys={props.highlightedItemKeys}
        tags={props.tags}
        wishlist={props.wishlist}
        localTargetRules={props.localTargetRules}
        communityMatch={props.communityMatch}
        isOrganizing={isOrganizing}
        isSearchActive={Boolean(query.trim())}
        selectedKeys={selectedKeys}
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
              <button type="button" role="tab" key={tab.key} className={activeVaultTab === tab.key ? "active" : ""} onClick={() => switchVaultTab(tab.key)}>{tab.label}</button>
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
          <>
            <div className="vault-command-bar">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索装备名称、Perk、标签或属性" aria-label="搜索仓库" />
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value as VaultSortKey)} aria-label="排序">
                {(Object.keys(sortLabels) as VaultSortKey[]).map((key) => <option key={key} value={key}>{sortLabels[key]}</option>)}
              </select>
              <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value as VaultTagFilter)} aria-label="本地标签">
                {(Object.keys(tagLabels) as VaultTagFilter[]).map((key) => <option key={key} value={key}>{tagLabels[key]}</option>)}
              </select>
              <button type="button" className="secondary-button" onClick={clearFilters}>清空</button>
            </div>
            <div className="vault-browse">
              <aside className="vault-filter-column">
                <div className="vault-column-head"><h3>筛选条件</h3><span>组合筛选</span></div>
                <div className="vault-filter-stack">
                  <label>分类<select value={group} onChange={(event) => switchVaultFilterMode(event.target.value as VaultGroupFilter)}>{groups.map((item) => <option key={item.key} value={item.key}>{item.label} {item.count}</option>)}</select></label>
                  <label>槽位<select value={slotFilter} onChange={(event) => setSlotFilter(event.target.value)}>{slotFilters.map((item) => <option key={item.key} value={item.key}>{item.label} {item.count}</option>)}</select></label>
                  <label>弹药<select value={ammoFilter} disabled={group === "armor"} onChange={(event) => setAmmoFilter(event.target.value as VaultAmmoFilter)}>{(Object.keys(ammoFilterLabels) as VaultAmmoFilter[]).map((key) => <option key={key} value={key}>{ammoFilterLabels[key]}</option>)}</select></label>
                  <label>锁定状态<select value={lockFilter} onChange={(event) => setLockFilter(event.target.value as VaultLockFilter)}>{(Object.keys(lockFilterLabels) as VaultLockFilter[]).map((key) => <option key={key} value={key}>{lockFilterLabels[key]}</option>)}</select></label>
                  {availableFrameFilters.length ? (
                    <div className="vault-frame-filter"><span>武器框架</span>{availableFrameFilters.map((item) => <button type="button" className={frameFilters.includes(item.key) ? "active" : ""} key={item.key} onClick={() => toggleFrameFilter(item.key)}>{item.label}<small>{item.count}</small></button>)}</div>
                  ) : null}
                  {group === "armor" ? <button type="button" className="secondary-button" onClick={addArmorStatRule}>添加护甲属性规则</button> : null}
                  {armorStatRules.map((rule, index) => (
                    <div className="vault-armor-rule" key={`${rule.stat}-${index}`}><input value={rule.stat} placeholder="属性" onChange={(event) => updateArmorStatRule(index, { ...rule, stat: event.target.value as VaultArmorStatRule["stat"] })} /><input type="number" value={rule.min} onChange={(event) => updateArmorStatRule(index, { ...rule, min: Number(event.target.value) })} /><button type="button" onClick={() => removeArmorStatRule(index)}>×</button></div>
                  ))}
                </div>
              </aside>
              <section className="vault-results-column">
                <div className="vault-column-head"><h3>当前筛选结果</h3><span>{filteredItems.length} 件 · {sortLabels[sortKey]}</span></div>
                {renderVaultItems()}
              </section>
            </div>
          </>
        ) : null}

        {activeVaultTab === "cleanup" ? (
          <div className="vault-tab-content">
            <div className="vault-summary-strip">
              <div><span>已标记可清理</span><strong>{markedCleanupItems.length} 件</strong></div>
              <div><span>当前已选择</span><strong>{selectedItems.length} 件</strong></div>
              <div><span>数据边界</span><strong>只使用玩家标签，不自动评价</strong></div>
            </div>
            <VaultOrganizePanel groups={groups} group={group} isOrganizing={isOrganizing} filteredItemCount={filteredItems.length} selectedItemCount={selectedItems.length} selectionSummary={selectionSummary} activeBatchAction={activeBatchAction} isBatchSaving={isBatchSaving} cleanupActions={props.cleanupActions} cleanupCharacters={cleanupCharacters} cleanupTargetCharacterId={cleanupTargetCharacterId} markedCleanupItemCount={markedCleanupItems.length} cleanupActionItems={cleanupActionItems} tags={props.tags} onGroupChange={setGroup} onToggleOrganizing={toggleOrganizingMode} onVisibleSelectionChange={updateVisibleSelection} onBatchSelectionChange={setBatchSelection} onClearSelection={() => setSelectedKeys(new Set())} onCleanupTargetCharacterChange={setCleanupCharacterId} onApplyBatchTag={applyBatchTag} onCopyCleanupList={copyCleanupList} onRunSelectedBulkMove={runSelectedBulkMove} onRunCleanupAction={runCleanupAction} />
            <div className="vault-cleanup-grid">
              <section>
                <div className="vault-column-head"><h3>待处理装备</h3><span>{markedCleanupItems.length ? `已标记 ${markedCleanupItems.length} 件` : "当前没有玩家标记"}</span></div>
                {renderVaultItems()}
              </section>
              <aside>{renderVaultSideSummary({ activeTab: activeVaultTab, decisionSummary, duplicateSummary, filteredCount: filteredItems.length, totalCount: props.items.length, markedCleanupCount: markedCleanupItems.length, wishlist: props.wishlist, wishlistSummaryCount, localTargetRules: props.localTargetRules, targetSummaryCount, onCleanupClick: showCleanupCandidates, onTargetClick: showTargetMatches, onDuplicatesClick: () => switchVaultTab("duplicates"), onCopyCleanupList: copyCleanupList })}</aside>
            </div>
          </div>
        ) : null}

        {activeVaultTab === "duplicates" ? <div className="vault-tab-content"><div className="vault-summary-strip"><div><span>同名重复组</span><strong>{duplicateSummary.total_duplicate_groups} 组</strong></div><div><span>同 Hash 实例</span><strong>{duplicateSummary.total_duplicate_items} 件</strong></div><div><span>当前显示</span><strong>Roll、属性、来源差异</strong></div></div><VaultDuplicateGroups duplicateSummary={duplicateSummary} items={props.items} tags={props.tags} localTargetRules={props.localTargetRules} selectedKeys={selectedKeys} openingItemKey={props.openingItemKey} isBatchSaving={isBatchSaving} onOpenItem={props.onOpenItem} onMergeSelectedKeys={mergeSelectedKeys} onApplyDuplicateGroupTags={applyDuplicateGroupTags} /></div> : null}

        {activeVaultTab === "recommendations" ? <div className="vault-recommendations"><section><div className="vault-column-head"><h3>推荐数据源</h3><span>本地导入或授权</span></div><p className="status-message status-neutral">推荐只显示数据源匹配，不生成主观 Roll 结论。DIM Wishlist、已授权社区推荐和个人知识分别保留来源。</p><VaultRecommendationImportPanel wishlist={props.wishlist} actions={props.recommendationImportActions} /></section><aside><div className="vault-column-head"><h3>本地目标规则</h3><span>高级</span></div><VaultTargetRulesPanel items={props.items} rules={props.localTargetRules ?? { action_policy: "notify_only", armor: [], weapons: [] }} actions={props.targetRulesActions} /></aside></div> : null}
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
