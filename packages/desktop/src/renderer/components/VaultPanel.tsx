import { useCallback, useEffect, useMemo, useState } from "react";
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
  type VaultTagFilter,
  type VaultViewMode
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
  VaultTagFilter,
  VaultViewMode
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
  const [viewMode, setViewMode] = useState<VaultViewMode>("list");
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

  return (
    <section className="tool-panel vault-dashboard-panel">
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
      <VaultOrganizePanel
        groups={groups}
        group={group}
        viewMode={viewMode}
        duplicateGroupCount={duplicateSummary.total_duplicate_groups}
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
        onViewModeChange={setViewMode}
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
      {batchMessage ? <p className={batchMessage.includes("失败") ? "status-message status-error" : "status-message status-ready"}>{batchMessage}</p> : null}
      {duplicateSummary.total_duplicate_groups ? (
        <div className="vault-duplicate-summary">
          <strong>重复组 {duplicateSummary.total_duplicate_groups} 组</strong>
          <span>共 {duplicateSummary.total_duplicate_items} 件同名或同 Hash 装备，可优先检查属性或 perk 差异。</span>
        </div>
      ) : null}
      {props.wishlist ? (
        <div className="vault-duplicate-summary">
          <strong>DIM 愿望单命中 {wishlistSummaryCount} 件</strong>
          <span>当前仓库里命中你已导入 DIM 规则的装备数量，可直接用“DIM 愿望单”筛选查看。</span>
        </div>
      ) : null}
      {props.localTargetRules?.armor.length || props.localTargetRules?.weapons?.length ? (
        <div className="vault-duplicate-summary">
          <strong>本地目标命中 {targetSummaryCount} 件</strong>
          <span>按你保存的护甲属性最低值或武器 perk 规则匹配，可直接用“目标命中”筛选查看。</span>
        </div>
      ) : null}
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
        onGroupChange={setGroup}
        onToggleFrameFilter={toggleFrameFilter}
        onClearFilters={clearFilters}
      />
      {viewMode === "duplicates" ? (
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
      ) : (
        <VaultItemSections
          sections={filteredSections}
          highlightedItemKeys={props.highlightedItemKeys}
          tags={props.tags}
          wishlist={props.wishlist}
          localTargetRules={props.localTargetRules}
          communityMatch={props.communityMatch}
          isOrganizing={isOrganizing}
          selectedKeys={selectedKeys}
          openingItemKey={props.openingItemKey}
          onOpenItem={props.onOpenItem}
          onSaveTag={props.onSaveTag}
          onToggleSelected={toggleSelected}
        />
      )}
    </section>
  );
}
