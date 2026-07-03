import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildItemDecision,
  type ItemDecision
} from "@d2-tools/core/evidence/itemDecision";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { VaultItemMatchInfo } from "@d2-tools/core/community-perks";
import type { SaveVaultTagInput, VaultTags, VaultTagValue } from "@d2-tools/core/vault/tags";
import type {
  LoadoutTemplateLookup,
  VaultAmmoFilter,
  VaultArmorStatRule,
  VaultFilter,
  VaultFrameFilter,
  VaultFrameOption,
  VaultGroupFilter,
  VaultGroupSummary,
  VaultLockFilter,
  VaultSection,
  VaultSlotFilter,
  VaultSlotSummary,
  VaultSortKey,
  VaultTagFilter
} from "@d2-tools/app";
import {
  applyVisibleVaultSelection,
  buildVaultDuplicateSummary,
  buildVaultSelectionSummary,
  countWishlistMatches,
  createVaultListWorkspace,
  defaultVaultGroupTab,
  getVaultItemKey,
  matchesLoadoutTemplateItem,
  selectMarkedCleanupItems,
  selectVaultBatchItems,
  type VaultBatchSelectionMode,
  type VaultVisibleSelectionMode
} from "@d2-tools/app";
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

type VaultWorkspaceTab = "filters" | "cleanup" | "duplicates" | "targets" | "recommendations";
type VaultQuickFilter = "cleanup" | "wishlist" | "targets" | "untagged" | "locked";

const vaultWorkspaceTabs: Array<{ key: VaultWorkspaceTab; label: string; description: string }> = [
  { key: "filters", label: "筛选列表", description: "按类型、perk、标签和属性快速定位装备" },
  { key: "cleanup", label: "清理工作台", description: "处理已标记可清理装备和批量移动" },
  { key: "duplicates", label: "同名对比", description: "比较同名或同 Hash 装备的 roll 差异" },
  { key: "targets", label: "目标规则", description: "查看本地目标命中的武器和护甲" },
  { key: "recommendations", label: "推荐数据", description: "查看 DIM 愿望单和社区推荐命中" }
];

const vaultQuickFilters: Array<{ key: VaultQuickFilter; label: string }> = [
  { key: "cleanup", label: "可清理候选" },
  { key: "wishlist", label: "DIM 命中" },
  { key: "targets", label: "本地目标" },
  { key: "untagged", label: "未标记" },
  { key: "locked", label: "已锁定" }
];

export function VaultPageContentView(props: {
  items: AccountItemSummary[];
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  highlightedLabel?: string;
  tags: VaultTags;
  wishlist?: DimWishlist | null;
  localTargetRules?: LocalTargetRules | null;
  openingItemKey?: string;
  communityMatch?: Map<number, VaultItemMatchInfo>;
  showInternalHeading?: boolean;
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

  function toggleCleanupMode() {
    const nextCleanupMode = !isCleanupMode;
    setIsCleanupMode(nextCleanupMode);
    setIsOrganizing(false);
    setSelectedKeys(nextCleanupMode
      ? new Set(markedCleanupItems.map(getVaultItemKey))
      : new Set());
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

  function applyVaultQuickFilter(filter: VaultQuickFilter) {
    setBatchMessage("");
    if (filter === "cleanup") {
      setTagFilter("junk");
      switchVaultTab("filters");
      return;
    }
    if (filter === "wishlist") {
      setTagFilter("wishlist");
      switchVaultTab("filters");
      return;
    }
    if (filter === "targets") {
      setTagFilter("target");
      switchVaultTab("filters");
      return;
    }
    if (filter === "untagged") {
      setTagFilter("untagged");
      switchVaultTab("filters");
      return;
    }
    if (filter === "locked") {
      setLockFilter("locked");
      switchVaultTab("filters");
    }
  }

  return (
    <section className="tool-panel vault-dashboard-panel vault-product-layout">
      {(props.showInternalHeading ?? true) ? (
        <div className="section-heading">
          <div>
            <h2>仓库</h2>
            <p>先筛出候选，再用 DIM、目标规则、同名对比和本地标记判断保留或清理。</p>
          </div>
          <div className="vault-count">
            {filteredItems.length} / {props.items.length}
          </div>
        </div>
      ) : (
        <div className="vault-count vault-count-inline">
          {filteredItems.length} / {props.items.length}
        </div>
      )}
      {props.highlightedItemKeys ? (
        <p className="status-message status-ready">
          {props.highlightedLabel ? `${props.highlightedLabel} / ` : ""}
          方案命中 {loadoutMatchCount} 件
        </p>
      ) : null}
      <div className="vault-workbench-layout">
        <div className="vault-workbench-main">
          <div className="vault-workbench-header">
            <div className="vault-workflow-tabs" role="tablist" aria-label="仓库工作台">
              {vaultWorkspaceTabs.map((tab) => (
                <button
                  type="button"
                  role="tab"
                  key={tab.key}
                  className={activeVaultTab === tab.key ? "vault-workflow-tab active" : "vault-workflow-tab"}
                  aria-selected={activeVaultTab === tab.key}
                  onClick={() => switchVaultTab(tab.key)}
                >
                  <strong>{tab.label}</strong>
                  <span>{tab.description}</span>
                </button>
              ))}
            </div>
            <div className="vault-quick-filters" aria-label="仓库快速筛选">
              <span>快速筛选</span>
              {vaultQuickFilters.map((filter) => (
                <button
                  type="button"
                  key={filter.key}
                  className="vault-quick-filter-chip"
                  onClick={() => applyVaultQuickFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          {batchMessage ? <p className={batchMessage.includes("失败") ? "status-message status-error" : "status-message status-ready"}>{batchMessage}</p> : null}
          {activeVaultTab === "filters" ? (
            <>
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
              {renderVaultItems()}
            </>
          ) : null}
          {activeVaultTab === "cleanup" ? (
            <>
              <VaultOrganizePanel
                groups={groups}
                group={group}
                isOrganizing={isOrganizing}
                isCleanupMode={isCleanupMode}
                filteredItemCount={filteredItems.length}
                selectedItemCount={selectedItems.length}
                selectionSummary={selectionSummary}
                activeBatchAction={activeBatchAction}
                isBatchSaving={isBatchSaving}
                cleanupActions={props.cleanupActions}
                cleanupCharacters={cleanupCharacters}
                cleanupTargetCharacterId={cleanupTargetCharacterId}
                markedCleanupItemCount={markedCleanupItems.length}
                cleanupActionItems={cleanupActionItems}
                tags={props.tags}
                onGroupChange={setGroup}
                onToggleOrganizing={toggleOrganizingMode}
                onToggleCleanupMode={toggleCleanupMode}
                onVisibleSelectionChange={updateVisibleSelection}
                onBatchSelectionChange={setBatchSelection}
                onClearSelection={() => setSelectedKeys(new Set())}
                onCleanupTargetCharacterChange={setCleanupCharacterId}
                onApplyBatchTag={applyBatchTag}
                onCopyCleanupList={copyCleanupList}
                onRunSelectedBulkMove={runSelectedBulkMove}
                onRunCleanupAction={runCleanupAction}
              />
              {renderVaultItems()}
            </>
          ) : null}
          {activeVaultTab === "duplicates" ? (
            <>
              <div className="vault-duplicate-summary">
                <strong>重复组 {duplicateSummary.total_duplicate_groups} 组</strong>
                <span>共 {duplicateSummary.total_duplicate_items} 件同名或同 Hash 装备，可优先检查属性或 perk 差异。</span>
              </div>
              <VaultDuplicateGroups
                duplicateSummary={duplicateSummary}
                items={props.items}
                tags={props.tags}
                localTargetRules={props.localTargetRules}
                selectedKeys={selectedKeys}
                openingItemKey={props.openingItemKey}
                isBatchSaving={isBatchSaving}
                onOpenItem={props.onOpenItem}
                onMergeSelectedKeys={mergeSelectedKeys}
                onApplyDuplicateGroupTags={applyDuplicateGroupTags}
              />
            </>
          ) : null}
          {activeVaultTab === "targets" ? (
            <>
              <div className="vault-duplicate-summary">
                <strong>本地目标命中 {targetSummaryCount} 件</strong>
                <span>按你保存的护甲属性最低值或武器 perk 规则匹配；可回到筛选列表用“目标命中”进一步缩小范围。</span>
              </div>
              <VaultTargetRulesPanel
                items={props.items}
                rules={props.localTargetRules ?? { action_policy: "notify_only", armor: [], weapons: [] }}
                actions={props.targetRulesActions}
              />
              {renderVaultItems()}
            </>
          ) : null}
          {activeVaultTab === "recommendations" ? (
            <>
              <div className="vault-duplicate-summary">
                <strong>DIM 愿望单命中 {wishlistSummaryCount} 件</strong>
                <span>{props.wishlist ? "当前只使用你导入的 DIM 规则和账号匹配结果。" : "还没有导入 DIM 愿望单；不会默认内置未授权社区数据。"}</span>
              </div>
              <VaultRecommendationImportPanel
                wishlist={props.wishlist}
                actions={props.recommendationImportActions}
              />
              {renderVaultItems()}
            </>
          ) : null}
        </div>
        <aside className="vault-side-summary" aria-label="仓库当前整理摘要">
          {renderVaultSideSummary({
            activeTab: activeVaultTab,
            decisionSummary,
            duplicateSummary,
            filteredCount: filteredItems.length,
            totalCount: props.items.length,
            markedCleanupCount: markedCleanupItems.length,
            wishlist: props.wishlist,
            wishlistSummaryCount,
            localTargetRules: props.localTargetRules,
            targetSummaryCount,
            onCleanupClick: () => applyVaultQuickFilter("cleanup"),
            onDuplicatesClick: () => switchVaultTab("duplicates"),
            onCopyCleanupList: copyCleanupList
          })}
        </aside>
      </div>
    </section>
  );

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
        openingItemKey={props.openingItemKey}
        onOpenItem={props.onOpenItem}
        onSaveTag={props.onSaveTag}
        onToggleSelected={toggleSelected}
      />
    );
  }
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
        <div className="vault-side-signal">
          <span>本地目标</span>
          <strong>{hasLocalTargets ? `${input.targetSummaryCount} 件` : "未配置"}</strong>
          <small>{hasLocalTargets ? "来自你保存的护甲阈值或武器规则。" : "可在目标规则中保存个人筛选条件。"}</small>
        </div>
      </div>
      <div className="vault-side-actions">
        <button type="button" onClick={input.onCleanupClick}>查看可清理候选</button>
        <button type="button" className="secondary-button" onClick={input.onDuplicatesClick}>进入同名对比</button>
        <button type="button" className="secondary-button" disabled={!input.markedCleanupCount} onClick={input.onCopyCleanupList}>复制清理清单</button>
      </div>
    </div>
  );
}
