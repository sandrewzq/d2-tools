import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildItemDecision,
  type ItemDecision
} from "@d2-tools/core/evidence/itemDecision";
import type {
  AccountItemSummary,
  DimWishlist,
  LocalTargetRules,
  SaveVaultTagInput,
  VaultItemMatchInfo,
  VaultTags,
  VaultTagValue
} from "../api/client";
import {
  matchesLoadoutTemplateItem,
  type LoadoutTemplateLookup
} from "../shared/domain/loadouts/loadoutLookup";
import { VaultDuplicateGroups } from "../features/vault/VaultDuplicateGroups";
import { VaultFilterToolbar } from "../features/vault/VaultFilterToolbar";
import { VaultItemSections } from "../features/vault/VaultItemSections";
import { VaultOrganizePanel } from "../features/vault/VaultOrganizePanel";
import {
  applyVisibleVaultSelection,
  buildVaultSelectionSummary,
  getVaultItemKey,
  selectMarkedCleanupItems,
  selectVaultBatchItems,
  type VaultBatchSelectionMode,
  type VaultVisibleSelectionMode
} from "../features/vault/vaultSelection";
import {
  createVaultListWorkspace,
  countWishlistMatches,
  defaultVaultGroupTab,
  type VaultAmmoFilter,
  type VaultArmorStatRule,
  type VaultFilter,
  type VaultFrameFilter,
  type VaultFrameOption,
  type VaultGroupFilter,
  type VaultGroupSummary,
  type VaultLockFilter,
  type VaultSection,
  type VaultSlotFilter,
  type VaultSlotSummary,
  type VaultSortKey,
  type VaultTagFilter
} from "../features/vault/vaultFilters";
import {
  buildVaultDuplicateSummary
} from "../shared/domain/vault/vaultCleanup";
import {
  useVaultBatchActions,
  type VaultCleanupActions
} from "../features/vault/useVaultBatchActions";

export {
  applyVisibleVaultSelection,
  buildVaultSelectionSummary,
  getVaultItemKey,
  selectMarkedCleanupItems,
  selectVaultBatchItems
} from "../features/vault/vaultSelection";
export type {
  VaultBatchSelectionMode,
  VaultVisibleSelectionMode
} from "../features/vault/vaultSelection";
export {
  buildVaultFrameFilters,
  buildVaultGroups,
  buildVaultSections,
  buildVaultSlotFilters,
  countLocalTargetMatches,
  defaultVaultGroupTab,
  filterVaultItems,
  formatArmorStatsInline,
  normalizeCoreItem,
  sortVaultItems
} from "../features/vault/vaultFilters";
export type {
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
} from "../features/vault/vaultFilters";
export {
  buildDuplicateGroupBatchTagPlan,
  buildVaultCleanupLocatorText,
  buildVaultCleanupText,
  buildVaultBulkMoveResultMessage,
  buildVaultDuplicateSummary,
  selectDuplicateGroupItems
} from "../shared/domain/vault/vaultCleanup";
export {
  countWishlistMatches
} from "../features/vault/vaultFilters";
export type {
  DuplicateGroupBatchTagMode
} from "../shared/domain/vault/vaultCleanup";

type VaultWorkspaceTab = "filters" | "cleanup" | "duplicates" | "targets" | "recommendations";

const vaultWorkspaceTabs: Array<{ key: VaultWorkspaceTab; label: string; description: string }> = [
  { key: "filters", label: "筛选列表", description: "按类型、perk、标签和属性快速定位装备" },
  { key: "cleanup", label: "清理工作台", description: "处理已标记可清理装备和批量移动" },
  { key: "duplicates", label: "同名对比", description: "比较同名或同 Hash 装备的 roll 差异" },
  { key: "targets", label: "目标规则", description: "查看本地目标命中的武器和护甲" },
  { key: "recommendations", label: "推荐数据", description: "查看 DIM 愿望单和社区推荐命中" }
];

export function VaultPanel(props: {
  items: AccountItemSummary[];
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  highlightedLabel?: string;
  tags: VaultTags;
  wishlist?: DimWishlist | null;
  localTargetRules?: LocalTargetRules | null;
  openingItemKey?: string;
  communityMatch?: Map<number, VaultItemMatchInfo>;
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

  return (
    <section className="tool-panel vault-dashboard-panel vault-product-layout">
      <div className="section-heading">
        <div>
          <h2>仓库</h2>
          <p>查看完整仓库列表，支持按名称、类型、品质和分组筛选。</p>
        </div>
        <div className="vault-count">
          {filteredItems.length} / {props.items.length}
        </div>
      </div>
      {props.highlightedItemKeys ? (
        <p className="status-message status-ready">
          {props.highlightedLabel ? `${props.highlightedLabel} / ` : ""}
          方案命中 {loadoutMatchCount} 件
        </p>
      ) : null}
      <div className="vault-decision-summary product-card" aria-label="仓库整理决策摘要">
        <strong>整理决策</strong>
        <span>必留 {decisionSummary.keep} 件</span>
        <span>复查 {decisionSummary.review} 件</span>
        <span>可清理候选 {decisionSummary.cleanup_candidate} 件</span>
        <span>未知 {decisionSummary.unknown} 件</span>
      </div>
      <div className="vault-workflow-tabs" role="tablist" aria-label="仓库工作流">
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
      {batchMessage ? <p className={batchMessage.includes("失败") ? "status-message status-error" : "status-message status-ready"}>{batchMessage}</p> : null}
      {activeVaultTab === "filters" ? (
        <>
          {renderVaultSummaryCards({
            duplicateSummary,
            wishlist: props.wishlist,
            wishlistSummaryCount,
            localTargetRules: props.localTargetRules,
            targetSummaryCount
          })}
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
          {renderVaultItems()}
        </>
      ) : null}
      {activeVaultTab === "recommendations" ? (
        <>
          <div className="vault-duplicate-summary">
            <strong>DIM 愿望单命中 {wishlistSummaryCount} 件</strong>
            <span>{props.wishlist ? "当前只使用你导入的 DIM 规则和账号匹配结果。" : "还没有导入 DIM 愿望单；不会默认内置未授权社区数据。"}</span>
          </div>
          {renderVaultItems()}
        </>
      ) : null}
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

function renderVaultSummaryCards(input: {
  duplicateSummary: ReturnType<typeof buildVaultDuplicateSummary>;
  wishlist?: DimWishlist | null;
  wishlistSummaryCount: number;
  localTargetRules?: LocalTargetRules | null;
  targetSummaryCount: number;
}) {
  return (
    <>
      {input.duplicateSummary.total_duplicate_groups ? (
        <div className="vault-duplicate-summary">
          <strong>重复组 {input.duplicateSummary.total_duplicate_groups} 组</strong>
          <span>共 {input.duplicateSummary.total_duplicate_items} 件同名或同 Hash 装备，可优先检查属性或 perk 差异。</span>
        </div>
      ) : null}
      {input.wishlist ? (
        <div className="vault-duplicate-summary">
          <strong>DIM 愿望单命中 {input.wishlistSummaryCount} 件</strong>
          <span>当前仓库里命中你已导入 DIM 规则的装备数量，可直接用“DIM 愿望单”筛选查看。</span>
        </div>
      ) : null}
      {input.localTargetRules?.armor.length || input.localTargetRules?.weapons?.length ? (
        <div className="vault-duplicate-summary">
          <strong>本地目标命中 {input.targetSummaryCount} 件</strong>
          <span>按你保存的护甲属性最低值或武器 perk 规则匹配，可直接用“目标命中”筛选查看。</span>
        </div>
      ) : null}
    </>
  );
}
