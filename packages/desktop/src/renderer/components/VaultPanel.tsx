import { useMemo, useState } from "react";
import { evaluateWishlistRoll } from "@d2-tools/core/analysis/wishlist";
import type {
  AccountItemSummary,
  DimWishlist,
  SaveVaultTagInput,
  VaultItemMatchInfo,
  VaultTags,
  VaultTagValue
} from "../api/client";
import {
  matchesLoadoutTemplateItem,
  type LoadoutTemplateLookup
} from "../shared/domain/loadouts/loadoutLookup";
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
  ammoFilterLabels,
  armorStatFilterLabels,
  buildVaultFrameFilters,
  buildVaultGroups,
  buildVaultSections,
  buildVaultSlotFilters,
  defaultVaultGroupTab,
  filterVaultItems,
  formatArmorStatsInline,
  lockFilterLabels,
  normalizeCoreItem,
  sortLabels,
  sortVaultItems,
  tagLabels,
  type VaultAmmoFilter,
  type VaultArmorStatFilter,
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
  buildVaultDuplicateSummary,
  countWishlistMatches,
  selectDuplicateGroupItems
} from "../features/vault/vaultCleanup";
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
  defaultVaultGroupTab,
  filterVaultItems,
  formatArmorStatsInline,
  normalizeCoreItem,
  sortVaultItems
} from "../features/vault/vaultFilters";
export type {
  VaultAmmoFilter,
  VaultArmorStatFilter,
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
  buildVaultDuplicateSummary,
  countWishlistMatches,
  selectDuplicateGroupItems
} from "../features/vault/vaultCleanup";
export type {
  DuplicateGroupBatchTagMode
} from "../features/vault/vaultCleanup";
export { buildVaultBulkMoveResultMessage } from "../features/vault/useVaultBatchActions";

export function VaultPanel(props: {
  items: AccountItemSummary[];
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  highlightedLabel?: string;
  tags: VaultTags;
  wishlist?: DimWishlist | null;
  openingItemKey?: string;
  communityMatch?: Map<number, VaultItemMatchInfo>;
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
  const [armorStatFilter, setArmorStatFilter] = useState<VaultArmorStatFilter>("all");
  const [armorStatMin, setArmorStatMin] = useState("");
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
  const armorStatMinValue = armorStatMin.trim() ? Number(armorStatMin) : undefined;
  const groups = useMemo(() => buildVaultGroups(props.items), [props.items]);
  const availableFrameFilters = useMemo(
    () => buildVaultFrameFilters(filterVaultItems(props.items, {
      group,
      query: "",
      tag: tagFilter,
      lock: lockFilter,
      slot: slotFilter,
      ammo: ammoFilter,
      armorStat: armorStatFilter,
      armorStatMin: armorStatMinValue,
      tags: props.tags,
      wishlist: props.wishlist
    })),
    [ammoFilter, armorStatFilter, armorStatMinValue, group, lockFilter, props.items, props.tags, props.wishlist, slotFilter, tagFilter]
  );
  const slotFilters = useMemo(
    () => buildVaultSlotFilters(filterVaultItems(props.items, {
      group,
      query: "",
      tag: tagFilter,
      lock: lockFilter,
      ammo: ammoFilter,
      armorStat: armorStatFilter,
      armorStatMin: armorStatMinValue,
      frames: frameFilters,
      tags: props.tags,
      wishlist: props.wishlist
    })),
    [ammoFilter, armorStatFilter, armorStatMinValue, frameFilters, group, lockFilter, props.items, props.tags, props.wishlist, tagFilter]
  );
  const filteredItems = useMemo(
    () => sortVaultItems(
      filterVaultItems(props.items, {
        group,
        query,
        tag: tagFilter,
        lock: lockFilter,
        slot: slotFilter,
        ammo: ammoFilter,
        armorStat: armorStatFilter,
        armorStatMin: armorStatMinValue,
        frames: frameFilters,
        tags: props.tags,
        wishlist: props.wishlist
      }),
      sortKey,
      props.tags
    ),
    [ammoFilter, armorStatFilter, armorStatMinValue, frameFilters, group, lockFilter, props.items, props.tags, props.wishlist, query, slotFilter, sortKey, tagFilter]
  );
  const filteredSections = useMemo(
    () => buildVaultSections(filteredItems),
    [filteredItems]
  );
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
  const wishlistSummaryCount = useMemo(
    () => countWishlistMatches(props.items, props.wishlist),
    [props.items, props.wishlist]
  );
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

  function setBatchSelection(mode: VaultBatchSelectionMode) {
    setSelectedKeys(new Set(selectVaultBatchItems(filteredItems, mode, props.tags).map(getVaultItemKey)));
    setBatchMessage("");
  }

  function updateVisibleSelection(mode: VaultVisibleSelectionMode) {
    setSelectedKeys((current) => applyVisibleVaultSelection(current, filteredItems, mode));
    setBatchMessage("");
  }

  function toggleSelected(item: AccountItemSummary) {
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
  }

  function clearFilters() {
    setQuery("");
    setGroup(defaultVaultGroupTab);
    setSortKey("name");
    setTagFilter("all");
    setLockFilter("all");
    setSlotFilter("all");
    setAmmoFilter("all");
    setArmorStatFilter("all");
    setArmorStatMin("");
    setFrameFilters([]);
    setActiveBatchAction("");
    setBatchMessage("");
  }

  function toggleFrameFilter(key: string) {
    setFrameFilters((current) => (
      current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key]
    ));
  }

  return (
    <section className="tool-panel">
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
        <p className="notice">
          {props.highlightedLabel ? `${props.highlightedLabel} / ` : ""}
          方案命中 {loadoutMatchCount} 件
        </p>
      ) : null}
      <div className="vault-content-tabs" role="tablist" aria-label="仓库内容标签">
        {groups.map((item) => (
          <button
            className={item.key === group ? "vault-content-tab active" : "vault-content-tab"}
            key={item.key}
            role="tab"
            aria-selected={item.key === group}
            type="button"
            onClick={() => setGroup(item.key)}
          >
            <strong>{item.label}</strong>
            <span>{item.count}</span>
          </button>
        ))}
      </div>
      <div className="vault-organize-bar">
        <button
          type="button"
          className={viewMode === "duplicates" ? "secondary-button active" : "secondary-button"}
          aria-busy={false}
          onClick={() => setViewMode(viewMode === "duplicates" ? "list" : "duplicates")}
        >
          同名对比 {duplicateSummary.total_duplicate_groups}
        </button>
        <button
          type="button"
          className={isOrganizing ? "secondary-button" : ""}
          aria-busy={false}
          onClick={() => {
            setIsOrganizing(!isOrganizing);
            setIsCleanupMode(false);
            setSelectedKeys(new Set());
            setBatchMessage("");
          }}
        >
          {isOrganizing ? "退出整理" : "整理模式"}
        </button>
        <button
          type="button"
          className={isCleanupMode ? "secondary-button active" : "secondary-button"}
          aria-busy={false}
          onClick={() => {
            const nextCleanupMode = !isCleanupMode;
            setIsCleanupMode(nextCleanupMode);
            setIsOrganizing(false);
            setSelectedKeys(nextCleanupMode
              ? new Set(markedCleanupItems.map(getVaultItemKey))
              : new Set());
            setBatchMessage("");
          }}
        >
          {isCleanupMode ? "退出清理" : "清理模式"}
        </button>
        {isOrganizing ? (
          <>
            <button type="button" onClick={() => updateVisibleSelection("replace")}>全选当前结果 {filteredItems.length}</button>
            <button type="button" onClick={() => updateVisibleSelection("append")}>追加当前结果 {filteredItems.length}</button>
            <button type="button" className="secondary-button" onClick={() => updateVisibleSelection("remove")}>移除当前结果</button>
            <button type="button" onClick={() => setBatchSelection("junk")}>选择可清理</button>
            <button type="button" onClick={() => setBatchSelection("review")}>选择复查</button>
            <button type="button" onClick={() => setBatchSelection("untagged")}>选择未标记</button>
            <button type="button" onClick={() => setBatchSelection("noted")}>选择有备注</button>
            <button type="button" className="secondary-button" onClick={() => setSelectedKeys(new Set())}>清空</button>
          </>
        ) : null}
      </div>
      {isOrganizing ? (
        <div className="vault-batch-panel">
          <span>{isBatchSaving && activeBatchAction ? `${activeBatchAction}...` : selectionSummary}</span>
            <button type="button" aria-busy={isBatchSaving} disabled={!selectedItems.length || isBatchSaving} onClick={() => void applyBatchTag("review")}>
            {isBatchSaving && activeBatchAction === "批量关注" ? "处理中..." : "批量关注"}
          </button>
          <button type="button" aria-busy={isBatchSaving} disabled={!selectedItems.length || isBatchSaving} onClick={() => void applyBatchTag("junk")}>
            {isBatchSaving && activeBatchAction === "批量可清理" ? "处理中..." : "批量可清理"}
          </button>
          <button type="button" aria-busy={isBatchSaving} disabled={!selectedItems.length || isBatchSaving} onClick={() => void applyBatchTag("none")}>
            {isBatchSaving && activeBatchAction === "批量清除" ? "处理中..." : "批量清除"}
          </button>
          <button type="button" aria-busy={isBatchSaving} disabled={isBatchSaving} onClick={() => void copyCleanupList()}>
            {isBatchSaving ? "处理中..." : "复制清理清单"}
          </button>
          {props.cleanupActions ? (
            <>
              <label className="compact-field">
                {"\u76ee\u6807\u89d2\u8272"}
                <select value={cleanupTargetCharacterId} onChange={(event) => setCleanupCharacterId(event.target.value)}>
                  {props.cleanupActions.currentCharacterId ? (
                    <option value={props.cleanupActions.currentCharacterId}>
                      {"\u5f53\u524d\u89d2\u8272"}{props.cleanupActions.currentCharacterLabel ? ` / ${props.cleanupActions.currentCharacterLabel}` : ""}
                    </option>
                  ) : null}
                  {cleanupCharacters
                    .filter((character) => character.character_id !== props.cleanupActions?.currentCharacterId)
                    .map((character) => (
                      <option key={character.character_id} value={character.character_id}>
                        {character.class_name} / {"\u5149\u7b49"} {character.light ?? "-"}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                aria-busy={isBatchSaving}
                disabled={!selectedItems.length || !cleanupTargetCharacterId || isBatchSaving || !props.cleanupActions.writeActionsEnabled}
                onClick={() => void runSelectedBulkMove()}
              >
                {isBatchSaving && activeBatchAction === "\u6279\u91cf\u79fb\u52a8" ? "\u5904\u7406\u4e2d..." : "\u6279\u91cf\u79fb\u52a8"}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {isCleanupMode ? (
        <div className="vault-cleanup-panel">
          <div>
            <strong>清理准备</strong>
            <p>
              已标记 {markedCleanupItems.length} 件可清理。不会分解装备，只会把装备解锁并转移到角色背包，最后仍需进游戏手动分解。
            </p>
          </div>
          {cleanupCharacters.length ? (
            <label className="compact-field">
              接收角色
              <select value={cleanupTargetCharacterId} onChange={(event) => setCleanupCharacterId(event.target.value)}>
                {cleanupCharacters.map((character) => (
                  <option key={character.character_id} value={character.character_id}>
                    {character.class_name} / 光等 {character.light ?? "-"}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="notice">请先读取账号角色数据。</p>
          )}
          <div className="vault-cleanup-actions">
            <span>本次处理 {cleanupActionItems.length} 件</span>
            <button type="button" className="secondary-button" aria-busy={isBatchSaving} disabled={isBatchSaving} onClick={() => void copyCleanupList()}>
              {isBatchSaving ? "处理中..." : "复制清理清单"}
            </button>
            <button
              type="button"
              aria-busy={isBatchSaving}
              disabled={!cleanupActionItems.length || !props.cleanupActions?.writeActionsEnabled || !cleanupTargetCharacterId || isBatchSaving}
              onClick={() => void runCleanupAction("unlock")}
            >
              {isBatchSaving ? "处理中..." : "批量解锁"}
            </button>
            <button
              type="button"
              aria-busy={isBatchSaving}
              disabled={!cleanupActionItems.length || !props.cleanupActions?.writeActionsEnabled || !cleanupTargetCharacterId || isBatchSaving}
              onClick={() => void runCleanupAction("transfer")}
            >
              {isBatchSaving ? "处理中..." : "转移到角色背包"}
            </button>
          </div>
          {!props.cleanupActions?.writeActionsEnabled ? (
            <p className="notice">写操作未开启。需要到设置页开启后，才能批量解锁或转移装备。</p>
          ) : null}
          <p className="muted-copy">提示：游戏里看不到 d2-tools 的本地标记；转移到角色背包后，可以按这份清单在游戏里逐件分解。</p>
          {cleanupActionItems.length ? (
            <div className="vault-cleanup-locator">
              <strong>游戏内定位</strong>
              <p>先转移到目标角色背包，再按位置、光等、锁定状态和 Perk 核对。同名装备很多时，这些信息比只看名字更可靠。</p>
              <ul>
                {cleanupActionItems.slice(0, 8).map((item) => {
                  const key = getVaultItemKey(item);
                  const note = props.tags.items[key]?.note;
                  const plugText = item.socket_plugs?.map((plug) => plug.name).filter(Boolean).slice(0, 3).join(" / ");
                  return (
                    <li key={key}>
                      <b>{item.name}</b>
                      <small>{formatVaultItemMeta(item) || "未知位置"}{plugText ? ` / ${plugText}` : ""}</small>
                      {note ? <small>备注：{note}</small> : null}
                    </li>
                  );
                })}
              </ul>
              {cleanupActionItems.length > 8 ? <span>还有 {cleanupActionItems.length - 8} 件，复制清单可查看完整定位信息。</span> : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {batchMessage ? <p className="notice">{batchMessage}</p> : null}
      {duplicateSummary.total_duplicate_groups ? (
        <div className="vault-duplicate-summary">
          <strong>重复组 {duplicateSummary.total_duplicate_groups} 组</strong>
          <span>共 {duplicateSummary.total_duplicate_items} 件同名或同 Hash 装备，可优先检查低分项。</span>
        </div>
      ) : null}
      {props.wishlist ? (
        <div className="vault-duplicate-summary">
          <strong>DIM 愿望单命中 {wishlistSummaryCount} 件</strong>
          <span>当前仓库里命中你已导入 DIM 规则的装备数量，可直接用“DIM 愿望单”筛选查看。</span>
        </div>
      ) : null}
      <div className="vault-toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="自然搜索名称、类型、perk 或备注"
        />
        <label className="compact-field">
          排序
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as VaultSortKey)}>
            {(Object.keys(sortLabels) as VaultSortKey[]).map((key) => (
              <option key={key} value={key}>{sortLabels[key]}</option>
            ))}
          </select>
        </label>
        <label className="compact-field">
          标记
          <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value as VaultTagFilter)}>
            {(Object.keys(tagLabels) as VaultTagFilter[]).map((key) => (
              <option key={key} value={key}>{tagLabels[key]}</option>
            ))}
          </select>
        </label>
        <label className="compact-field">
          护甲属性
          <select value={armorStatFilter} onChange={(event) => setArmorStatFilter(event.target.value as VaultArmorStatFilter)}>
            {(Object.keys(armorStatFilterLabels) as VaultArmorStatFilter[]).map((key) => (
              <option key={key} value={key}>{armorStatFilterLabels[key]}</option>
            ))}
          </select>
        </label>
        <label className="compact-field">
          最低值
          <input
            type="number"
            min="0"
            max="100"
            value={armorStatMin}
            disabled={armorStatFilter === "all"}
            onChange={(event) => setArmorStatMin(event.target.value)}
            placeholder="20"
          />
        </label>
        <label className="compact-field">
          锁定
          <select value={lockFilter} onChange={(event) => setLockFilter(event.target.value as VaultLockFilter)}>
            {(Object.keys(lockFilterLabels) as VaultLockFilter[]).map((key) => (
              <option key={key} value={key}>{lockFilterLabels[key]}</option>
            ))}
          </select>
        </label>
        <label className="compact-field">
          位置
          <select value={slotFilter} onChange={(event) => setSlotFilter(event.target.value)}>
            {slotFilters.map((item) => (
              <option key={item.key} value={item.key}>{item.label} {item.count}</option>
            ))}
          </select>
        </label>
        <label className="compact-field">
          弹药
          <select value={ammoFilter} onChange={(event) => setAmmoFilter(event.target.value as VaultAmmoFilter)}>
            {(Object.keys(ammoFilterLabels) as VaultAmmoFilter[]).map((key) => (
              <option key={key} value={key}>{ammoFilterLabels[key]}</option>
            ))}
          </select>
        </label>
        {availableFrameFilters.length ? (
          <div className="compact-field">
            <span>框架</span>
            <div className="segmented-control" aria-label="仓库武器框架筛选">
              {availableFrameFilters.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  className={frameFilters.includes(item.key) ? "active" : ""}
                  onClick={() => toggleFrameFilter(item.key)}
                >
                  {item.label} <span>{item.count}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="segmented-control" aria-label="仓库分组">
          {groups.map((item) => (
            <button
              className={item.key === group ? "active" : ""}
              key={item.key}
              type="button"
              onClick={() => setGroup(item.key)}
            >
              {item.label} <span>{item.count}</span>
            </button>
          ))}
        </div>
        <button type="button" className="secondary-button" onClick={clearFilters}>
          清空筛选
        </button>
      </div>
      {viewMode === "duplicates" ? (
        duplicateSummary.groups.length ? (
          <div className="duplicate-group-list">
            {duplicateSummary.groups.map((group) => {
              const selectedGroupCount = group.items.filter((entry) => selectedKeys.has(entry.item_key)).length;
              const junkCandidateKeys = selectDuplicateGroupItems(group, "junk");
              const restCandidateKeys = selectDuplicateGroupItems(group, "rest");
              return (
                <section className="duplicate-group" key={group.group_key}>
                <div className="duplicate-group-heading">
                  <h3>{group.name}</h3>
                  <span>{group.count} 件 / 已选候选 {selectedGroupCount}</span>
                </div>
                <div className="vault-batch-panel">
                  <button
                    type="button"
                    aria-busy={isBatchSaving}
                    disabled={isBatchSaving}
                    onClick={() => {
                      const topItem = props.items.find((candidate) => getVaultItemKey(candidate) === group.items[0]?.item_key);
                      if (topItem) props.onOpenItem(topItem);
                    }}
                  >
                    打开最高分
                  </button>
                  <button
                    type="button"
                    aria-busy={isBatchSaving}
                    disabled={isBatchSaving || !restCandidateKeys.length}
                    onClick={() => mergeSelectedKeys(restCandidateKeys)}
                  >
                    选择其余候选
                  </button>
                  <button
                    type="button"
                    aria-busy={isBatchSaving}
                    disabled={isBatchSaving || !junkCandidateKeys.length}
                    onClick={() => mergeSelectedKeys(junkCandidateKeys)}
                  >
                    选择可清理候选
                  </button>
                  <button
                    type="button"
                    aria-busy={isBatchSaving}
                    disabled={isBatchSaving}
                    onClick={() => void applyDuplicateGroupTags(group, "keep-best-review-rest")}
                  >
                    其余标记关注
                  </button>
                  <button
                    type="button"
                    aria-busy={isBatchSaving}
                    disabled={isBatchSaving}
                    onClick={() => void applyDuplicateGroupTags(group, "keep-best-junk-rest")}
                  >
                    其余标记可清理
                  </button>
                  <button
                    type="button"
                    aria-busy={isBatchSaving}
                    disabled={isBatchSaving}
                    onClick={() => void applyDuplicateGroupTags(group, "clear-group-tags")}
                  >
                    清除本组标记
                  </button>
                </div>
                {group.items.map((entry) => {
                  const item = props.items.find((candidate) => getVaultItemKey(candidate) === entry.item_key);
                  const itemMeta = item ? formatVaultItemMeta(item) : "未找到实例信息";
                  const note = item ? props.tags.items[getVaultItemKey(item)]?.note : undefined;
                  const isSelected = selectedKeys.has(entry.item_key);
                  const duplicateTone = entry.tag === "keep" || entry.tag === "review" || entry.tag === "junk"
                    ? entry.tag
                    : "none";
                  return (
                    <article
                      className={item && getVaultItemKey(item) === props.openingItemKey
                        ? `duplicate-row duplicate-${duplicateTone} pending${isSelected ? " selected" : ""}`
                        : `duplicate-row duplicate-${duplicateTone}${isSelected ? " selected" : ""}`}
                      key={entry.item_key}
                    >
                      <button
                        className="duplicate-row-main"
                        type="button"
                        title={itemMeta}
                        disabled={!item}
                        aria-busy={Boolean(item && getVaultItemKey(item) === props.openingItemKey)}
                        onClick={() => item && props.onOpenItem(item)}
                      >
                        <span>{entry.roll_text || "暂无实际 roll"}</span>
                        <small className="duplicate-row-meta">{itemMeta}</small>
                        <small>{entry.locked ? "已锁定" : "未锁定"} / {entry.tag ?? "未标记"}{isSelected ? " / 已选候选" : ""}</small>
                        {note ? <small className="duplicate-row-note">备注：{note}</small> : null}
                      </button>
                      <div className="duplicate-row-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          aria-busy={isBatchSaving}
                          disabled={isBatchSaving || !item}
                          onClick={() => item && void applyDuplicateGroupTags(group, "keep-best-review-rest", entry.item_key)}
                        >
                          保留这件，其余关注
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          aria-busy={isBatchSaving}
                          disabled={isBatchSaving || !item}
                          onClick={() => item && void applyDuplicateGroupTags(group, "keep-best-junk-rest", entry.item_key)}
                        >
                          保留这件，其余可清理
                        </button>
                      </div>
                    </article>
                  );
                })}
                </section>
              );
            })}
          </div>
        ) : (
          <p className="notice">当前仓库没有发现同名重复装备。</p>
        )
      ) : filteredItems.length ? (
        <div className="vault-section-list">
          {filteredSections.map((section) => (
            <section className="vault-slot-section" key={section.key}>
              <div className="vault-slot-heading">
                <h3>{section.label}</h3>
                <span>{section.count} 件</span>
              </div>
              <div className="vault-list">
                {section.items.map((item) => (
                  <VaultListItem
                    item={item}
                    key={`${item.hash}-${item.instance_id ?? ""}`}
                    highlightedItemKeys={props.highlightedItemKeys}
                    tags={props.tags}
                    wishlist={props.wishlist}
                    communityMatch={props.communityMatch?.get(item.hash)}
                    isOrganizing={isOrganizing}
                    isSelected={selectedKeys.has(getVaultItemKey(item))}
                    openingItemKey={props.openingItemKey}
                    onOpenItem={props.onOpenItem}
                    onSaveTag={props.onSaveTag}
                    onToggleSelected={toggleSelected}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="notice">没有匹配的仓库物品。</p>
      )}
    </section>
  );
}

function VaultListItem(props: {
  item: AccountItemSummary;
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  tags: VaultTags;
  wishlist?: DimWishlist | null;
  communityMatch?: VaultItemMatchInfo;
  isOrganizing: boolean;
  isSelected: boolean;
  openingItemKey?: string;
  onOpenItem: (item: AccountItemSummary) => void;
  onSaveTag: (item: AccountItemSummary, tag: VaultTagValue) => void | Promise<void>;
  onToggleSelected: (item: AccountItemSummary) => void;
}) {
  const note = props.tags.items[getVaultItemKey(props.item)]?.note;
  const wishlist = evaluateWishlistRoll(normalizeCoreItem(props.item), props.wishlist ?? undefined);
  const communityMatch = props.communityMatch;
  const isPending = getVaultItemKey(props.item) === props.openingItemKey;
  const isLoadoutMatch = matchesLoadoutTemplateItem(props.item, props.highlightedItemKeys);
  const tagValue = tagValueForItem(props.item, props.tags);
  const tagLabel = tagLabelForItem(props.item, props.tags);

  return (
    <article className="vault-list-item">
      {props.isOrganizing ? (
        <label className="vault-select-row">
          <input
            checked={props.isSelected}
            type="checkbox"
            onChange={() => props.onToggleSelected(props.item)}
          />
          选择
        </label>
      ) : null}
      <button
        type="button"
        className={[
          "vault-list-main",
          isPending ? "pending" : "",
          isLoadoutMatch ? "loadout-highlight" : ""
        ].filter(Boolean).join(" ")}
        aria-busy={isPending}
        onClick={() => props.onOpenItem(props.item)}
      >
        {props.item.icon ? <img alt="" src={props.item.icon} /> : <div className="item-icon-placeholder" />}
        <div>
          <div className="vault-title-row">
            <strong>{props.item.name}</strong>
            <span className={`vault-score-badge score-${tagValue}`}>{tagLabel}</span>
          </div>
          {isLoadoutMatch ? <small className="loadout-template-badge">方案命中</small> : null}
          <span>{formatVaultItemMeta(props.item)}</span>
          {wishlist.matched ? (
            <small className="wishlist-hit">
              <span className="wishlist-hit-badge">DIM 愿望单</span>
              <span>{formatWishlistHint(wishlist.labels)}</span>
            </small>
          ) : null}
          {communityMatch && communityMatch.matched > 0 ? (
            <small className="community-match">
              <span className="community-match-badge">社区推荐</span>
              <span>命中 {communityMatch.matched} 个组合{communityMatch.modes.length ? ` · ${communityMatch.modes.map(formatCommunityMode).join(" / ")}` : ""}</span>
            </small>
          ) : null}
          {communityMatch && communityMatch.matched > 0 && formatCommunityPerkPreview(communityMatch.sample_perks) ? (
            <small className="community-match">
              {formatCommunityPerkPreview(communityMatch.sample_perks)}
            </small>
          ) : null}
          {props.item.socket_plugs?.length ? (
            <small>{props.item.socket_plugs.slice(0, 4).map((plug) => plug.name).join(" / ")}</small>
          ) : null}
          {note ? <small className="vault-note-snippet">备注：{note}</small> : null}
        </div>
      </button>
      <div className="vault-tag-row" aria-label={`${props.item.name} 本地标记`}>
        <span className={`vault-tag-current tag-${tagValueForItem(props.item, props.tags)}`}>
          {tagLabelForItem(props.item, props.tags)}
        </span>
        <div className="vault-tag-actions">
          <button type="button" onClick={() => props.onSaveTag(props.item, "keep")}>保留</button>
          <button type="button" onClick={() => props.onSaveTag(props.item, "review")}>关注</button>
          <button type="button" onClick={() => props.onSaveTag(props.item, "junk")}>可清理</button>
          <button type="button" onClick={() => props.onSaveTag(props.item, "none")}>清除</button>
        </div>
      </div>
    </article>
  );
}

function formatWishlistHint(labels: string[]): string {
  const detailLabels = labels.filter((label) => label !== "DIM Wishlist");
  return detailLabels.length ? detailLabels.join(" / ") : "已命中";
}

function formatCommunityMode(mode: "pve" | "pvp" | "general"): string {
  switch (mode) {
    case "pve": return "PvE";
    case "pvp": return "PvP";
    case "general": return "通用";
    default: return mode;
  }
}

function formatCommunityPerkPreview(perks: VaultItemMatchInfo["sample_perks"]): string {
  if (!perks?.length) {
    return "";
  }

  return perks
    .slice(0, 2)
    .map((perk) => (perk.englishName ? `${perk.name} / ${perk.englishName}` : perk.name))
    .join(" · ");
}

function tagLabelForItem(item: AccountItemSummary, tags: VaultTags): string {
  const tag = tagValueForItem(item, tags);
  return tag === "none" ? "未标记" : tagLabels[tag];
}

function tagValueForItem(item: AccountItemSummary, tags: VaultTags): VaultTagValue {
  const tag = tags.items[getVaultItemKey(item)]?.tag;
  return tag ?? "none";
}

function formatVaultItemMeta(item: AccountItemSummary): string {
  return [
    item.bucket_name,
    item.item_type,
    item.ammo_type ? ammoFilterLabels[item.ammo_type] : undefined,
    item.tier,
    item.power ? `光等 ${item.power}` : undefined,
    formatArmorStatsInline(item),
    item.locked ? "已锁定" : undefined
  ].filter(Boolean).join(" / ");
}
