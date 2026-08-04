import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import { evaluateLocalTargets } from "@d2-tools/core/analysis/targets";
import { evaluateWishlistRoll } from "@d2-tools/core/analysis/wishlist";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { VaultItemMatchInfo } from "@d2-tools/core/community-perks";
import type { SaveVaultTagInput, VaultTags, VaultTagValue } from "@d2-tools/core/vault/tags";
import { matchesLoadoutTemplateItem, type LoadoutTemplateLookup } from "@d2-tools/app/loadouts";
import {
  armorStatLabels,
  ammoFilterLabels,
  buildVaultDuplicateSummary,
  buildVaultContextFacts,
  buildVaultFrameFilters,
  buildVaultGroups,
  buildVaultSections,
  buildVaultSlotFilters,
  classFilterLabels,
  damageFilterLabels,
  defaultVaultGroupTab,
  filterVaultItems,
  gearTierFilterLabels,
  lockFilterLabels,
  normalizeCoreItem,
  rarityFilterLabels,
  sortVaultItems,
  sortLabels,
  type VaultAmmoFilter,
  type VaultArmorStatRule,
  type VaultClassFilter,
  type VaultDamageFilter,
  type VaultFrameFilter,
  type VaultGearTierFilter,
  type VaultGroupFilter,
  type VaultLockFilter,
  type VaultRarityFilter,
  type VaultSlotFilter,
  type VaultSortKey,
  type VaultTagFilter
} from "@d2-tools/app/vault";
import { VaultDuplicateGroups } from "./VaultDuplicateGroups.js";
import { VaultFilterToolbar, type VaultSignalFilter } from "./VaultFilterToolbar.js";
import { VaultItemSections } from "./VaultItemSections.js";
import {
  VaultRecommendationImportPanel,
  type VaultRecommendationImportActions
} from "./VaultRecommendationImportPanel.js";
import {
  VaultTargetRulesPanel,
  type VaultTargetRulesActions
} from "./VaultTargetRulesPanel.js";
import type { VaultCleanupActions } from "./useVaultBatchActions.js";

type VaultWorkspaceTab = "filters" | "duplicates" | "recommendations";

const vaultWorkspaceTabs: Array<{ key: VaultWorkspaceTab; label: string }> = [
  { key: "filters", label: "筛选列表" },
  { key: "duplicates", label: "同名对比" },
  { key: "recommendations", label: "推荐数据" }
];

const emptySelectedKeys = new Set<string>();
const ignoreVaultSelection = () => undefined;

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
  const [signalFilters, setSignalFilters] = useState<VaultSignalFilter[]>([]);
  const [lockFilter, setLockFilter] = useState<VaultLockFilter>("all");
  const [slotFilter, setSlotFilter] = useState<VaultSlotFilter>("all");
  const [ammoFilter, setAmmoFilter] = useState<VaultAmmoFilter>("all");
  const [itemTypeFilter, setItemTypeFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState<VaultRarityFilter>("all");
  const [gearTierFilter, setGearTierFilter] = useState<VaultGearTierFilter>("all");
  const [classFilter, setClassFilter] = useState<VaultClassFilter>("all");
  const [damageFilter, setDamageFilter] = useState<VaultDamageFilter>("all");
  const [armorStatRules, setArmorStatRules] = useState<VaultArmorStatRule[]>([]);
  const [frameFilters, setFrameFilters] = useState<VaultFrameFilter>([]);
  const [activeVaultTab, setActiveVaultTab] = useState<VaultWorkspaceTab>("filters");
  const [batchMessage, setBatchMessage] = useState("");
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const workspaceId = useId();
  const tabIds = useMemo(() => Object.fromEntries(vaultWorkspaceTabs.map((tab) => [tab.key, `${workspaceId}-${tab.key}-tab`])) as Record<VaultWorkspaceTab, string>, [workspaceId]);
  const panelIds = useMemo(() => Object.fromEntries(vaultWorkspaceTabs.map((tab) => [tab.key, `${workspaceId}-${tab.key}-panel`])) as Record<VaultWorkspaceTab, string>, [workspaceId]);

  useEffect(() => {
    if (!props.locateRequest) return;
    setQuery(String(props.locateRequest.hash));
    setGroup("weapons");
    resetFilterState(false);
    setActiveVaultTab("filters");
  }, [props.locateRequest?.requestId]);

  const filteredVaultItems = useMemo(
    () => sortVaultItems(
      filterVaultItems(props.items, {
        group,
        query,
        tag: tagFilter,
        lock: lockFilter,
        slot: slotFilter,
        ammo: ammoFilter,
        itemType: itemTypeFilter,
        rarity: rarityFilter,
        gearTier: gearTierFilter,
        classType: classFilter,
        damageType: damageFilter,
        armorStatRules,
        frames: frameFilters,
        tags: props.tags,
        wishlist: props.wishlist,
        localTargetRules: props.localTargetRules
      }),
      sortKey,
      props.tags
    ),
    [ammoFilter, armorStatRules, classFilter, damageFilter, frameFilters, gearTierFilter, group, itemTypeFilter, lockFilter, props.items, props.localTargetRules, props.tags, props.wishlist, query, rarityFilter, slotFilter, sortKey, tagFilter]
  );
  const filteredItems = useMemo(
    () => filteredVaultItems.filter((item) => matchesSignalFilters(item, signalFilters, props)),
    [filteredVaultItems, props.communityMatch, props.highlightedItemKeys, props.localTargetRules, props.wishlist, signalFilters]
  );
  const filteredSections = useMemo(() => buildVaultSections(filteredItems), [filteredItems]);
  const groups = useMemo(() => buildVaultGroups(props.items), [props.items]);
  const slotFilters = useMemo(
    () => buildVaultSlotFilters(filterVaultItems(props.items, {
      group,
      query: "",
      tag: tagFilter,
      lock: lockFilter,
      slot: "all",
      ammo: ammoFilter,
      itemType: itemTypeFilter,
      rarity: rarityFilter,
      gearTier: gearTierFilter,
      classType: classFilter,
      damageType: damageFilter,
      armorStatRules,
      frames: frameFilters,
      tags: props.tags,
      wishlist: props.wishlist,
      localTargetRules: props.localTargetRules
    })),
    [ammoFilter, armorStatRules, classFilter, damageFilter, frameFilters, gearTierFilter, group, itemTypeFilter, lockFilter, props.items, props.localTargetRules, props.tags, props.wishlist, rarityFilter, tagFilter]
  );
  const availableFrameFilters = useMemo(
    () => buildVaultFrameFilters(filterVaultItems(props.items, {
      group,
      query: "",
      tag: tagFilter,
      lock: lockFilter,
      slot: slotFilter,
      ammo: ammoFilter,
      itemType: itemTypeFilter,
      rarity: rarityFilter,
      gearTier: gearTierFilter,
      classType: classFilter,
      damageType: damageFilter,
      armorStatRules,
      tags: props.tags,
      wishlist: props.wishlist,
      localTargetRules: props.localTargetRules
    })),
    [ammoFilter, armorStatRules, classFilter, damageFilter, gearTierFilter, group, itemTypeFilter, lockFilter, props.items, props.localTargetRules, props.tags, props.wishlist, rarityFilter, slotFilter, tagFilter]
  );
  const itemTypeFilters = useMemo(() => {
    const counts = new Map<string, number>();
    props.items.filter((item) => item.group_key === "weapons" && item.item_type).forEach((item) => {
      const itemType = item.item_type ?? "";
      counts.set(itemType, (counts.get(itemType) ?? 0) + 1);
    });
    return [...counts.entries()]
      .map(([key, count]) => ({ key, label: key, count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-Hans-CN"));
  }, [props.items]);
  const duplicateSummary = useMemo(() => buildVaultDuplicateSummary(props.items, props.tags), [props.items, props.tags]);
  const vaultItemCount = props.vaultItemCount ?? props.items.length;
  const loadoutMatchCount = useMemo(
    () => props.highlightedItemKeys ? filteredItems.filter((item) => matchesLoadoutTemplateItem(item, props.highlightedItemKeys)).length : 0,
    [filteredItems, props.highlightedItemKeys]
  );
  const activeFilterLabels = useMemo(() => buildActiveFilterLabels({
    query,
    sortKey,
    slotFilter,
    itemTypeFilter,
    rarityFilter,
    gearTierFilter,
    ammoFilter,
    damageFilter,
    classFilter,
    lockFilter,
    tagFilter,
    signalFilters,
    frameFilterCount: frameFilters.length,
    armorRuleCount: armorStatRules.length
  }), [ammoFilter, armorStatRules.length, classFilter, damageFilter, frameFilters.length, gearTierFilter, itemTypeFilter, lockFilter, query, rarityFilter, signalFilters, slotFilter, sortKey, tagFilter]);
  const contextFacts = useMemo(() => buildVaultContextFacts({
    group,
    query,
    tagFilter,
    lockFilter,
    slotFilter,
    ammoFilter,
    itemTypeFilter,
    rarityFilter,
    gearTierFilter,
    classFilter,
    damageFilter,
    frameFilters,
    armorStatRules,
    filteredCount: filteredVaultItems.length,
    totalCount: props.items.length
  }), [ammoFilter, armorStatRules, classFilter, damageFilter, filteredVaultItems.length, frameFilters, gearTierFilter, group, itemTypeFilter, lockFilter, props.items.length, query, rarityFilter, slotFilter, tagFilter]);

  useEffect(() => {
    props.onContextFactsChange?.([
      ...contextFacts,
      ...signalFilters.map((signal) => `保护与匹配：${signalLabel(signal)}`),
      `当前结果：${filteredItems.length} 件`
    ]);
  }, [contextFacts, filteredItems.length, props.onContextFactsChange, signalFilters]);

  function resetFilterState(resetQuery = true) {
    if (resetQuery) setQuery("");
    setSortKey("name");
    setTagFilter("all");
    setSignalFilters([]);
    setLockFilter("all");
    setSlotFilter("all");
    setAmmoFilter("all");
    setItemTypeFilter("all");
    setRarityFilter("all");
    setGearTierFilter("all");
    setClassFilter("all");
    setDamageFilter("all");
    setArmorStatRules([]);
    setFrameFilters([]);
    setBatchMessage("");
  }

  function switchVaultFilterMode(nextGroup: VaultGroupFilter) {
    setGroup(nextGroup);
    setSlotFilter("all");
    if (nextGroup !== "weapons") {
      setAmmoFilter("all");
      setItemTypeFilter("all");
      setDamageFilter("all");
      setFrameFilters([]);
    }
    if (nextGroup !== "armor") {
      setClassFilter("all");
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
      const nextStat = (Object.keys(armorStatLabels) as Array<Exclude<VaultArmorStatRule["stat"], "">>).find((stat) => !used.has(stat));
      return nextStat ? [...current, { stat: nextStat, min: 10 }] : current;
    });
  }

  function toggleFrameFilter(key: string) {
    setFrameFilters((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key]);
  }

  function toggleSignalFilter(value: VaultSignalFilter) {
    setSignalFilters((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function switchVaultTab(tab: VaultWorkspaceTab) {
    setActiveVaultTab(tab);
    setBatchMessage("");
  }

  function handleVaultTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = vaultWorkspaceTabs.findIndex((tab) => tab.key === activeVaultTab);
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? vaultWorkspaceTabs.length - 1 : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + vaultWorkspaceTabs.length) % vaultWorkspaceTabs.length;
    const nextTab = vaultWorkspaceTabs[nextIndex]?.key ?? "filters";
    switchVaultTab(nextTab);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  }

  async function applyDuplicateGroupTags(groupName: string, inputs: SaveVaultTagInput[]) {
    setIsBatchSaving(true);
    setBatchMessage(`正在应用 ${groupName} 的整理状态...`);
    try {
      await props.onSaveTagBatch(inputs);
      setBatchMessage(`已应用 ${groupName} 的整理状态。`);
    } catch (error) {
      setBatchMessage(error instanceof Error ? error.message : "同名组整理状态保存失败");
    } finally {
      setIsBatchSaving(false);
    }
  }

  return (
    <div className="vault-page">
      <div className="vault-workflow-bar" data-surface="section">
        <div className="vault-workflow-tabs" data-ui-kind="segmented-control" role="tablist" aria-label="仓库工作台">
          {vaultWorkspaceTabs.map((tab) => (
            <button type="button" data-ui-kind="button" data-control-variant="quiet" role="tab" id={tabIds[tab.key]} aria-controls={panelIds[tab.key]} aria-selected={activeVaultTab === tab.key} tabIndex={activeVaultTab === tab.key ? 0 : -1} key={tab.key} className={activeVaultTab === tab.key ? "active" : ""} onClick={() => switchVaultTab(tab.key)} onKeyDown={handleVaultTabKeyDown}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="vault-workflow-meta">
          <span className="ui-badge status-neutral" data-ui-kind="status-chip">已读取 {vaultItemCount} 件</span>
          <span className="ui-badge status-pending" data-ui-kind="status-chip">当前显示 {filteredItems.length} 件</span>
          {props.highlightedItemKeys ? <span className="ui-badge status-success" data-ui-kind="status-chip">配装命中 {loadoutMatchCount} 件</span> : null}
        </div>
      </div>
      {batchMessage ? <p className={batchMessage.includes("失败") ? "status-message status-error" : "status-message status-ready"}>{batchMessage}</p> : null}

      {activeVaultTab === "filters" ? (
        <div id={panelIds.filters} role="tabpanel" aria-labelledby={tabIds.filters} className="vault-workspace-panel">
          <div className="vault-browse">
            <VaultFilterToolbar
              query={query}
              sortKey={sortKey}
              tagFilter={tagFilter}
              signalFilters={signalFilters}
              armorStatRules={armorStatRules}
              lockFilter={lockFilter}
              slotFilter={slotFilter}
              ammoFilter={ammoFilter}
              itemTypeFilter={itemTypeFilter}
              rarityFilter={rarityFilter}
              gearTierFilter={gearTierFilter}
              classFilter={classFilter}
              damageFilter={damageFilter}
              frameFilters={frameFilters}
              group={group}
              groups={groups}
              slotFilters={slotFilters}
              itemTypeFilters={itemTypeFilters}
              availableFrameFilters={availableFrameFilters}
              onQueryChange={setQuery}
              onSortKeyChange={setSortKey}
              onTagFilterChange={setTagFilter}
              onSignalFilterToggle={toggleSignalFilter}
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
              onGroupChange={switchVaultFilterMode}
              onToggleFrameFilter={toggleFrameFilter}
            />
            <section className="vault-results-column vault-browse-results" data-surface="section" data-contract-id="vault.results">
              <div className="vault-column-head">
                <div><h3>装备矩阵</h3><span>{filteredItems.length} 件 · {sortLabels[sortKey]}</span></div>
                <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!activeFilterLabels.length} onClick={() => resetFilterState()}>重置筛选</button>
              </div>
              <div className="vault-active-filters" aria-label="已生效筛选条件">
                <strong>已生效条件</strong>
                <div>{activeFilterLabels.length ? activeFilterLabels.map((label) => <span className="ui-badge status-neutral" key={label}>{label}</span>) : <span>当前范围没有附加筛选条件。</span>}</div>
              </div>
              <VaultItemSections
                sections={filteredSections}
                highlightedItemKeys={props.highlightedItemKeys}
                tags={props.tags}
                wishlist={props.wishlist}
                localTargetRules={props.localTargetRules}
                communityMatch={props.communityMatch}
                isOrganizing={false}
                isSearchActive={Boolean(query.trim())}
                selectedKeys={emptySelectedKeys}
                openingItemKey={props.openingItemKey}
                emptyMessage="没有匹配的装备。请调整左侧条件或重置筛选。"
                onSelectItem={props.onOpenItem}
                onToggleSelected={ignoreVaultSelection}
              />
            </section>
          </div>
        </div>
      ) : null}

      {activeVaultTab === "duplicates" ? (
        <div id={panelIds.duplicates} role="tabpanel" aria-labelledby={tabIds.duplicates} className="vault-workspace-panel">
          <div className="vault-summary-strip">
            <div><span>待处理同名组</span><strong>{duplicateSummary.total_duplicate_groups} 组</strong></div>
            <div><span>当前实例</span><strong>{duplicateSummary.total_duplicate_items} 件</strong></div>
            <div><span>处理原则</span><strong>状态只由玩家写入</strong></div>
          </div>
          <VaultDuplicateGroups
            duplicateSummary={duplicateSummary}
            items={props.items}
            tags={props.tags}
            wishlist={props.wishlist}
            localTargetRules={props.localTargetRules}
            highlightedItemKeys={props.highlightedItemKeys}
            communityMatch={props.communityMatch}
            openingItemKey={props.openingItemKey}
            isBatchSaving={isBatchSaving}
            onOpenItem={props.onOpenItem}
            onApplyGroupTags={applyDuplicateGroupTags}
          />
        </div>
      ) : null}

      {activeVaultTab === "recommendations" ? (
        <div id={panelIds.recommendations} role="tabpanel" aria-labelledby={tabIds.recommendations} className="vault-recommendations vault-workspace-panel">
          <section><div className="vault-column-head"><h3>推荐数据源</h3><span>本地导入或授权</span></div><p className="status-message status-neutral">推荐只显示数据源匹配，不生成主观 Roll 结论。DIM Wishlist、已授权社区推荐和个人知识分别保留来源。</p><VaultRecommendationImportPanel wishlist={props.wishlist} actions={props.recommendationImportActions} /></section>
          <aside><div className="vault-column-head"><h3>本地目标规则</h3><span>高级</span></div><VaultTargetRulesPanel items={props.items} rules={props.localTargetRules ?? { action_policy: "notify_only", armor: [], weapons: [] }} actions={props.targetRulesActions} /></aside>
        </div>
      ) : null}
    </div>
  );
}

function matchesSignalFilters(item: AccountItemSummary, filters: VaultSignalFilter[], props: {
  wishlist?: DimWishlist | null;
  localTargetRules?: LocalTargetRules | null;
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  communityMatch?: Map<number, VaultItemMatchInfo>;
}): boolean {
  if (!filters.length) return true;
  return filters.every((filter) => {
    if (filter === "wishlist") return evaluateWishlistRoll(normalizeCoreItem(item), props.wishlist ?? undefined).matched;
    if (filter === "target") return evaluateLocalTargets(normalizeCoreItem(item), props.localTargetRules ?? undefined).matched;
    if (filter === "loadout") return matchesLoadoutTemplateItem(item, props.highlightedItemKeys);
    return (props.communityMatch?.get(item.hash)?.matched ?? 0) > 0;
  });
}

function buildActiveFilterLabels(input: {
  query: string;
  sortKey: VaultSortKey;
  slotFilter: VaultSlotFilter;
  itemTypeFilter: string;
  rarityFilter: VaultRarityFilter;
  gearTierFilter: VaultGearTierFilter;
  ammoFilter: VaultAmmoFilter;
  damageFilter: VaultDamageFilter;
  classFilter: VaultClassFilter;
  lockFilter: VaultLockFilter;
  tagFilter: VaultTagFilter;
  signalFilters: VaultSignalFilter[];
  frameFilterCount: number;
  armorRuleCount: number;
}): string[] {
  return [
    input.query.trim() ? `搜索：${input.query.trim()}` : "",
    input.sortKey !== "name" ? sortLabels[input.sortKey] : "",
    input.slotFilter !== "all" ? `位置：${input.slotFilter}` : "",
    input.itemTypeFilter !== "all" ? `类型：${input.itemTypeFilter}` : "",
    input.rarityFilter !== "all" ? `稀有度：${rarityFilterLabels[input.rarityFilter]}` : "",
    input.gearTierFilter !== "all" ? `阶级：${gearTierFilterLabels[input.gearTierFilter]}` : "",
    input.ammoFilter !== "all" ? `弹药：${ammoFilterLabels[input.ammoFilter]}` : "",
    input.damageFilter !== "all" ? `属性：${damageFilterLabels[input.damageFilter]}` : "",
    input.classFilter !== "all" ? `职业：${classFilterLabels[input.classFilter]}` : "",
    input.lockFilter !== "all" ? lockFilterLabels[input.lockFilter] : "",
    input.tagFilter !== "all" ? `整理状态：${input.tagFilter === "untagged" ? "未标记" : input.tagFilter === "keep" ? "保留" : input.tagFilter === "review" ? "待复查" : "可清理"}` : "",
    ...input.signalFilters.map((signal) => signalLabel(signal)),
    input.frameFilterCount ? `武器框架：${input.frameFilterCount} 项` : "",
    input.armorRuleCount ? `护甲属性：${input.armorRuleCount} 条` : ""
  ].filter(Boolean);
}

function signalLabel(signal: VaultSignalFilter): string {
  if (signal === "wishlist") return "愿望单";
  if (signal === "loadout") return "配装引用";
  if (signal === "target") return "目标命中";
  return "社区推荐";
}
