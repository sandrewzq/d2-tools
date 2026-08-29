import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  classifyWeaponSocketPlugs,
  isWeaponSystemPlug,
  weaponSocketColumnLabel,
  type WeaponPerkColumnRole
} from "@d2-tools/app/items";
import type {
  AccountItemPlugSummary,
  AccountItemReusablePlugSummary,
  AccountItemSummary
} from "@d2-tools/core/account/summary";
import type { ArmorStatKey } from "@d2-tools/core/loadouts/analysis";
import type { DuplicateAnalysisResult, DuplicateItemGroup } from "@d2-tools/core/analysis/duplicates";
import { evaluateLocalTargets } from "@d2-tools/core/analysis/targets";
import { evaluateWishlistRoll } from "@d2-tools/core/analysis/wishlist";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import { evaluateEquipmentTargets, type EquipmentTargetStore } from "@d2-tools/core/targets/equipmentTargets";
import type { VaultItemMatchInfo } from "@d2-tools/core/community-perks";
import type { SaveVaultTagInput } from "@d2-tools/core/vault/tags";
import type { LoadoutTemplateLookup } from "@d2-tools/app/loadouts";
import { getVaultItemKey, normalizeCoreItem } from "@d2-tools/app/vault";
import { GameAssetImage } from "../media/GameAssetImage.js";
import { getRovingFocusIndex } from "../interaction/rovingFocus.js";
import { useNavigationGuard } from "../navigation/NavigationGuard.js";
import { ConfirmationDialog } from "../overlay/ConfirmationDialog.js";
import { formatVaultItemMeta } from "./VaultListItem.js";

type DuplicateDisposition = "none" | "keep" | "review" | "junk";
type DuplicateTypeFilter = "all" | "weapons" | "armor";
type DuplicateProgressFilter = "all" | "pending" | "complete" | "protected";

type DuplicateEvidence = {
  protection: string[];
  matches: string[];
  targetHint?: string;
};

type DuplicateRollOption = {
  key: string;
  text: string;
  icon?: string;
  selected: boolean;
  canSwitch: boolean;
};

type DuplicateComparisonValue = {
  kind: "scalar";
  key: string;
  text: string;
} | {
  kind: "roll";
  key: string;
  options: DuplicateRollOption[];
};

type DuplicateComparisonColumn = {
  key: string;
  label: string;
  kind: DuplicateComparisonValue["kind"];
  valueFor: (item: AccountItemSummary) => DuplicateComparisonValue;
};

type DuplicateRollSocket = {
  socketIndex: number;
  plugs: AccountItemPlugSummary[];
  options: DuplicateRollOption[];
};

const DUPLICATE_DETAIL_CONCURRENCY = 3;

const dispositionOptions: Array<{ key: DuplicateDisposition; label: string }> = [
  { key: "none", label: "未标记" },
  { key: "keep", label: "保留" },
  { key: "review", label: "待复查" },
  { key: "junk", label: "待处理" }
];

export function VaultDuplicateGroups(props: {
  duplicateSummary: DuplicateAnalysisResult;
  items: AccountItemSummary[];
  wishlist?: DimWishlist | null;
  localTargetRules?: LocalTargetRules | null;
  equipmentTargetStore?: EquipmentTargetStore | null;
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  communityMatch?: Map<number, VaultItemMatchInfo>;
  openingItemKey?: string;
  isBatchSaving: boolean;
  onLoadItemDetail?: (item: AccountItemSummary) => Promise<AccountItemSummary>;
  onOpenItem: (item: AccountItemSummary) => void;
  onApplyGroupTags: (groupName: string, inputs: SaveVaultTagInput[]) => void | Promise<void>;
}) {
  const groups = props.duplicateSummary.groups;
  const itemByKey = useMemo(() => new Map(props.items.map((item) => [getVaultItemKey(item), item])), [props.items]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<DuplicateTypeFilter>("all");
  const [progressFilter, setProgressFilter] = useState<DuplicateProgressFilter>("all");
  const [hideLowValueGroups, setHideLowValueGroups] = useState(false);
  const [activeGroupKey, setActiveGroupKey] = useState(groups[0]?.group_key ?? "");
  const [referenceByGroup, setReferenceByGroup] = useState<Record<string, string>>({});
  const [pendingDispositionByGroup, setPendingDispositionByGroup] = useState<Record<string, Record<string, DuplicateDisposition>>>({});
  const [detailByItemKey, setDetailByItemKey] = useState<Record<string, AccountItemSummary>>({});
  const [detailLoadStatusByItemKey, setDetailLoadStatusByItemKey] = useState<Record<string, "loading" | "ready" | "error">>({});
  // 同一实例可能同时从仓库行、详情弹层或切换后的同名组触发读取。
  // 在菜单层保留请求表，既能避免重复 IPC，也能把批量读取限制在可控并发内。
  const detailRequestByItemKeyRef = useRef(new Map<string, Promise<AccountItemSummary>>());
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);
  const pendingChangeCount = useMemo(() => groups.reduce((count, group) => (
    count + group.items.filter((entry) => (
      (pendingDispositionByGroup[group.group_key]?.[entry.item_key] ?? dispositionFromTag(entry.tag)) !== dispositionFromTag(entry.tag)
    )).length
  ), 0), [groups, pendingDispositionByGroup]);
  const evidenceSummaryByGroup = useMemo(() => new Map(groups.map((group) => [
    group.group_key,
    summarizeGroupEvidence(group, itemByKey, props)
  ])), [groups, itemByKey, props.communityMatch, props.equipmentTargetStore, props.highlightedItemKeys, props.localTargetRules, props.wishlist]);

  useNavigationGuard(pendingChangeCount > 0 ? {
    title: "离开仓库并放弃待应用状态？",
    description: `当前有 ${pendingChangeCount} 件装备的整理状态尚未应用。离开仓库后这些临时选择会丢失，已应用的本地标签不会改变。`,
    confirmLabel: "放弃并离开",
    cancelLabel: "继续整理"
  } : null);

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return groups.filter((group) => {
      const firstItem = group.items[0] ? itemByKey.get(group.items[0].item_key) : undefined;
      if (typeFilter !== "all" && firstItem?.group_key !== typeFilter) return false;
      if (normalizedQuery && !group.name.toLocaleLowerCase().includes(normalizedQuery)) return false;

      const isComplete = isGroupPersistedComplete(group);
      const evidence = evidenceSummaryByGroup.get(group.group_key) ?? { protectedItems: 0, matchedItems: 0 };
      if (hideLowValueGroups && isLowDecisionGroup(group, itemByKey, evidence)) return false;
      if (progressFilter === "pending" && isComplete) return false;
      if (progressFilter === "complete" && !isComplete) return false;
      if (progressFilter === "protected" && evidence.protectedItems === 0) return false;
      return true;
    }).sort((left, right) => compareDuplicateGroups(left, right, evidenceSummaryByGroup));
  }, [evidenceSummaryByGroup, groups, hideLowValueGroups, itemByKey, progressFilter, query, typeFilter]);

  useEffect(() => {
    if (!filteredGroups.some((group) => group.group_key === activeGroupKey)) {
      setActiveGroupKey(filteredGroups[0]?.group_key ?? "");
    }
  }, [activeGroupKey, filteredGroups]);

  const activeGroup = filteredGroups.find((group) => group.group_key === activeGroupKey) ?? filteredGroups[0];

  useEffect(() => {
    const loadItemDetail = props.onLoadItemDetail;
    if (!loadItemDetail || !activeGroup) return;
    const groupItems = activeGroup.items.flatMap((entry) => {
      const item = itemByKey.get(entry.item_key);
      return item?.group_key === "weapons" ? [{ key: entry.item_key, item }] : [];
    });
    const pendingItems = groupItems.filter(({ key, item }) => (
      item.instance_id
      && item.sockets === undefined
      && detailByItemKey[key]?.sockets === undefined
      && detailLoadStatusByItemKey[key] === undefined
    ));
    if (!pendingItems.length) return;

    setDetailLoadStatusByItemKey((current) => ({
      ...current,
      ...Object.fromEntries(pendingItems.map(({ key }) => [key, "loading" as const]))
    }));
    void runWithConcurrency(pendingItems, DUPLICATE_DETAIL_CONCURRENCY, async ({ key, item }) => {
      try {
        let request = detailRequestByItemKeyRef.current.get(key);
        if (!request) {
          request = loadItemDetail(item);
          detailRequestByItemKeyRef.current.set(key, request);
          void request.then(() => {
            if (detailRequestByItemKeyRef.current.get(key) === request) {
              detailRequestByItemKeyRef.current.delete(key);
            }
          }, () => {
            if (detailRequestByItemKeyRef.current.get(key) === request) {
              detailRequestByItemKeyRef.current.delete(key);
            }
          });
        }
        const detail = await request;
        if (detail.sockets === undefined) throw new Error("完整 Roll 数据未返回");
        if (!mountedRef.current) return;
        setDetailByItemKey((current) => ({ ...current, [key]: detail }));
        setDetailLoadStatusByItemKey((current) => ({ ...current, [key]: "ready" }));
      } catch {
        if (!mountedRef.current) return;
        setDetailLoadStatusByItemKey((current) => ({ ...current, [key]: "error" }));
      }
    });
  }, [activeGroup, detailByItemKey, detailLoadStatusByItemKey, itemByKey, props.onLoadItemDetail]);

  if (!groups.length) {
    return <p className="status-message status-neutral">当前仓库没有发现同名重复装备。</p>;
  }

  const storedReferenceKey = activeGroup ? referenceByGroup[activeGroup.group_key] : undefined;
  const explicitReferenceKey = activeGroup?.items.some((entry) => entry.item_key === storedReferenceKey) ? storedReferenceKey : undefined;
  const referenceKey = activeGroup ? explicitReferenceKey ?? defaultReferenceKey(activeGroup) : "";
  const activeRollDataStatus = getGroupRollDataStatus(
    activeGroup,
    itemByKey,
    detailByItemKey,
    detailLoadStatusByItemKey,
    Boolean(props.onLoadItemDetail)
  );
  const activeRollProgress = getGroupRollDataProgress(activeGroup, itemByKey, detailByItemKey);
  const comparisonItemByKey = activeRollDataStatus === "ready"
    ? new Map<string, AccountItemSummary>([...itemByKey].map(([key, item]) => [key, detailByItemKey[key] ?? item] as const))
    : itemByKey;

  function retryActiveGroupRollDetails() {
    if (!activeGroup) return;
    const groupKeys = new Set(activeGroup.items.map((entry) => entry.item_key));
    setDetailLoadStatusByItemKey((current) => Object.fromEntries(
      Object.entries(current).filter(([key, status]) => !groupKeys.has(key) || status !== "error")
    ));
  }

  function handleGroupKeyDown(event: KeyboardEvent<HTMLButtonElement>, groupKey: string) {
    const currentIndex = filteredGroups.findIndex((group) => group.group_key === groupKey);
    const nextIndex = getRovingFocusIndex({
      key: event.key,
      currentIndex,
      itemCount: filteredGroups.length,
      orientation: "both"
    });
    if (nextIndex === null) return;
    event.preventDefault();
    const nextGroup = filteredGroups[nextIndex];
    const nextButton = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(".duplicate-group-link")[nextIndex];
    if (!nextGroup || !nextButton) return;
    setActiveGroupKey(nextGroup.group_key);
    nextButton.focus();
    nextButton.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  return (
    <div className="duplicate-workspace">
      <aside className="duplicate-group-browser" aria-label="同名装备组">
        <div className="duplicate-browser-head"><strong>同名整理</strong><span>{groups.length} 组重复装备</span></div>
        <div className="duplicate-browser-tools">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索装备名称" aria-label="搜索同名装备组" />
          <div className="duplicate-type-filter" role="group" aria-label="同名装备类型">
            {(["all", "weapons", "armor"] as DuplicateTypeFilter[]).map((value) => (
              <button type="button" key={value} aria-pressed={typeFilter === value} onClick={() => setTypeFilter(value)}>{value === "all" ? "全部" : value === "weapons" ? "武器" : "护甲"}</button>
            ))}
          </div>
          <select value={progressFilter} onChange={(event) => setProgressFilter(event.target.value as DuplicateProgressFilter)} aria-label="筛选同名组整理进度">
            <option value="all">全部整理进度</option>
            <option value="pending">仍有未标记</option>
            <option value="complete">已完成整理</option>
            <option value="protected">包含实例保护</option>
          </select>
          <label className="duplicate-low-value-toggle">
            <input type="checkbox" checked={hideLowValueGroups} onChange={(event) => setHideLowValueGroups(event.target.checked)} />
            <span>隐藏当前无明显差异</span>
          </label>
        </div>
        <nav className="duplicate-group-nav">
          {filteredGroups.map((group) => {
            const pendingDisposition = pendingDispositionByGroup[group.group_key];
            const dispositionSummary = summarizeGroupDisposition(group, pendingDisposition);
            const evidence = evidenceSummaryByGroup.get(group.group_key) ?? { protectedItems: 0, matchedItems: 0 };
            const firstItem = group.items[0] ? itemByKey.get(group.items[0].item_key) : undefined;
            const hasPendingChanges = hasGroupPendingChanges(group, pendingDisposition);
            const isLowValue = isLowDecisionGroup(group, itemByKey, evidence);
            return (
              <button type="button" className="duplicate-group-link" key={group.group_key} aria-pressed={activeGroup?.group_key === group.group_key} tabIndex={activeGroup?.group_key === group.group_key ? 0 : -1} onClick={() => setActiveGroupKey(group.group_key)} onKeyDown={(event) => handleGroupKeyDown(event, group.group_key)}>
                <GameAssetImage src={firstItem?.icon} alt="" loading="eager" fallback={<span className="duplicate-thumb-fallback">{firstItem?.group_key === "armor" ? "甲" : "武"}</span>} />
                <span className="duplicate-group-copy">
                  <span className="duplicate-group-title-line"><strong>{group.name}</strong>{hasPendingChanges ? <em>待应用</em> : null}</span>
                  <span>{groupTypeLabel(group)} · {groupKindLabel(group)} · {group.count} 件 · 未标记 {dispositionSummary.none}</span>
                  <small>{groupDecisionHint(group, evidence)}{isLowValue ? " · 当前无明显差异" : ""} · 保护 {evidence.protectedItems} · 已决定 {group.count - dispositionSummary.none}</small>
                </span>
              </button>
            );
          })}
        </nav>
        {!filteredGroups.length ? <p className="duplicate-browser-empty">没有符合当前搜索和进度条件的同名组。</p> : null}
      </aside>

      {activeGroup ? (
        <DuplicateComparePanel
          key={activeGroup.group_key}
          group={activeGroup}
          itemByKey={comparisonItemByKey}
          wishlist={props.wishlist}
          localTargetRules={props.localTargetRules}
          equipmentTargetStore={props.equipmentTargetStore}
          highlightedItemKeys={props.highlightedItemKeys}
          communityMatch={props.communityMatch}
          referenceKey={referenceKey}
          referenceIsAutomatic={!explicitReferenceKey}
          hasNextPendingGroup={filteredGroups.some((group) => group.group_key !== activeGroup.group_key && !isGroupPersistedComplete(group))}
          pendingDisposition={pendingDispositionByGroup[activeGroup.group_key]}
          openingItemKey={props.openingItemKey}
          isBatchSaving={props.isBatchSaving}
          rollDataStatus={activeRollDataStatus}
          rollDataProgress={activeRollProgress}
          onReferenceChange={(itemKey) => setReferenceByGroup((current) => ({ ...current, [activeGroup.group_key]: itemKey }))}
          onPendingDispositionChange={(nextDisposition) => setPendingDispositionByGroup((current) => ({ ...current, [activeGroup.group_key]: nextDisposition }))}
          onOpenItem={props.onOpenItem}
          onRetryRollDetails={retryActiveGroupRollDetails}
          onApplyGroupTags={props.onApplyGroupTags}
          onNextGroup={() => {
            const currentIndex = filteredGroups.findIndex((group) => group.group_key === activeGroup.group_key);
            const followingGroups = [...filteredGroups.slice(currentIndex + 1), ...filteredGroups.slice(0, currentIndex)];
            const nextGroup = followingGroups.find((group) => !isGroupPersistedComplete(group));
            if (nextGroup) setActiveGroupKey(nextGroup.group_key);
          }}
        />
      ) : <section className="duplicate-compare-panel"><p className="status-message status-neutral">选择左侧同名组开始整理。</p></section>}
    </div>
  );
}

function DuplicateComparePanel(props: {
  group: DuplicateItemGroup;
  itemByKey: Map<string, AccountItemSummary>;
  wishlist?: DimWishlist | null;
  localTargetRules?: LocalTargetRules | null;
  equipmentTargetStore?: EquipmentTargetStore | null;
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  communityMatch?: Map<number, VaultItemMatchInfo>;
  referenceKey: string;
  referenceIsAutomatic: boolean;
  hasNextPendingGroup: boolean;
  pendingDisposition?: Record<string, DuplicateDisposition>;
  openingItemKey?: string;
  isBatchSaving: boolean;
  rollDataStatus: "ready" | "loading" | "error" | "unavailable";
  rollDataProgress: { ready: number; total: number };
  onReferenceChange: (itemKey: string) => void;
  onPendingDispositionChange: (disposition: Record<string, DuplicateDisposition>) => void;
  onOpenItem: (item: AccountItemSummary) => void;
  onRetryRollDetails: () => void;
  onApplyGroupTags: (groupName: string, inputs: SaveVaultTagInput[]) => void | Promise<void>;
  onNextGroup: () => void;
}) {
  const rows = props.group.items.flatMap((entry) => {
    const item = props.itemByKey.get(entry.item_key);
    return item ? [{ entry, item }] : [];
  });
  const savedDisposition = Object.fromEntries(props.group.items.map((entry) => [entry.item_key, dispositionFromTag(entry.tag)]));
  const pendingDisposition = props.pendingDisposition ?? savedDisposition;
  // 首屏保持稳定的“当前启用”视图；完整 Roll 只在详情齐全后由用户主动开启。
  const [rollViewMode, setRollViewMode] = useState<"full" | "active">("active");
  const [showProcessingList, setShowProcessingList] = useState(false);
  const [protectionConflictCount, setProtectionConflictCount] = useState(0);
  useEffect(() => {
    if (props.rollDataStatus !== "ready") setRollViewMode("active");
  }, [props.rollDataStatus]);
  const referenceRow = rows.find((row) => row.entry.item_key === props.referenceKey);
  const referenceIndex = Math.max(0, rows.findIndex((row) => row.entry.item_key === props.referenceKey));
  const columns = useMemo(() => buildComparisonColumns(rows.map((row) => row.item)), [props.group.group_key, props.itemByKey]);
  const hasRollColumns = columns.some((column) => column.kind === "roll");
  const effectiveRollViewMode = hasRollColumns && props.rollDataStatus === "ready" ? rollViewMode : "active";
  const referenceValues = referenceRow ? columns.map((column) => column.valueFor(referenceRow.item)) : [];
  const summary = summarizeGroupDisposition(props.group, pendingDisposition);
  const changedCount = props.group.items.filter((entry) => (pendingDisposition[entry.item_key] ?? "none") !== dispositionFromTag(entry.tag)).length;
  const processingRows = rows.filter(({ entry }) => (pendingDisposition[entry.item_key] ?? "none") === "junk");

  function updateDisposition(itemKey: string, disposition: DuplicateDisposition) {
    props.onPendingDispositionChange({ ...pendingDisposition, [itemKey]: disposition });
  }

  function keepReferenceReviewRest() {
    if (!props.referenceKey) return;
    props.onPendingDispositionChange(Object.fromEntries(props.group.items.map((entry) => [entry.item_key, entry.item_key === props.referenceKey ? "keep" : "review"])));
  }

  function requestApplyPendingDisposition() {
    if (!changedCount) return;
    const conflicts = rows.filter(({ entry, item }) => {
      const evidence = itemEvidence(item, props);
      return (pendingDisposition[entry.item_key] ?? "none") === "junk" && (evidence.protection.length > 0 || evidence.matches.length > 0);
    });
    if (conflicts.length) {
      setProtectionConflictCount(conflicts.length);
      return;
    }
    void persistPendingDisposition();
  }

  async function persistPendingDisposition() {
    await props.onApplyGroupTags(props.group.name, props.group.items.map((entry) => ({ item_key: entry.item_key, tag: pendingDisposition[entry.item_key] ?? "none" })));
  }

  return (
    <section className="duplicate-compare-panel">
      <header className="duplicate-compare-head">
        <div className="duplicate-compare-title">
          <h2>{props.group.name}</h2>
          <p>{groupTypeLabel(props.group)} · {groupKindLabel(props.group)} · {props.group.count} 件 · 整理状态仅保存在本地</p>
          <div className="duplicate-group-statline" aria-label="本组整理概览">
            <span>保留 {summary.keep}</span><span>待复查 {summary.review}</span><span>待处理 {summary.junk}</span><span>未标记 {summary.none}</span>
          </div>
        </div>
        <div className="duplicate-compare-head-actions">
          <div className="duplicate-reference-status">
            <span>当前比较基准</span>
            <strong>实例 {referenceIndex + 1}{props.referenceIsAutomatic ? " · 自动选择" : " · 手动选择"}</strong>
          </div>
          {hasRollColumns ? (
            <div className="duplicate-roll-view-mode" role="group" aria-label="Roll 比较范围">
              <button type="button" aria-pressed={rollViewMode === "active"} onClick={() => setRollViewMode("active")}>当前启用</button>
              <button
                type="button"
                aria-pressed={rollViewMode === "full"}
                disabled={props.rollDataStatus !== "ready"}
                onClick={() => setRollViewMode("full")}
              >
                所有可切换项
              </button>
            </div>
          ) : null}
          {hasRollColumns ? (
            <div className="duplicate-roll-data-status" data-status={props.rollDataStatus} role={props.rollDataStatus === "error" ? "alert" : "status"}>
              <span>
                {props.rollDataStatus === "loading"
                  ? `正在读取所有可切换项 · 已读取 ${props.rollDataProgress.ready}/${props.rollDataProgress.total} · 当前显示启用项`
                  : props.rollDataStatus === "error"
                    ? "可切换项读取失败 · 当前显示启用项"
                    : props.rollDataStatus === "unavailable"
                      ? "可切换项暂不可用 · 当前显示启用项"
                      : "所有可切换项已就绪"}
              </span>
              {props.rollDataStatus === "error" ? <button type="button" onClick={props.onRetryRollDetails}>重试</button> : null}
            </div>
          ) : null}
          <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!referenceRow} onClick={() => referenceRow && props.onOpenItem(referenceRow.item)}>查看基准详情</button>
        </div>
      </header>
      <div className="duplicate-compare-guide" data-surface="callout">
        <strong>{props.group.item_group === "weapons" ? "先判断用途，再决定是否保留" : props.group.item_group === "armor" ? "先看目标缺口，再决定是否保留" : "先确认是否可以互相替代"}</strong>
        <span>{props.group.item_group === "weapons"
          ? "同一把武器可能分别适合 PVE 和 PVP；基准只用于对照，不代表系统推荐。"
          : props.group.item_group === "armor"
            ? "护甲不只比较总值，还要看职业、部位、属性目标和能量；基准只用于对照。"
            : "同名不代表同一版本或同一用途，请先确认组内关系。"}</span>
      </div>
      <div className="duplicate-instance-list">
        {rows.map(({ entry, item }, index) => {
          const values = columns.map((column) => column.valueFor(item));
          const evidence = itemEvidence(item, props);
          const disposition = pendingDisposition[entry.item_key] ?? "none";
          const persistedDisposition = dispositionFromTag(entry.tag);
          const isReference = props.referenceKey === entry.item_key;
          const isDirty = disposition !== persistedDisposition;
          const hasProtectionConflict = disposition === "junk" && (evidence.protection.length > 0 || evidence.matches.length > 0);
          const differenceSummary = summarizeDifference(columns, values, referenceValues, effectiveRollViewMode);
          return (
            <article className={["duplicate-instance-card", isReference ? "reference" : "", isDirty ? "is-dirty" : "", hasProtectionConflict ? "has-protection-conflict" : "", props.openingItemKey === getVaultItemKey(item) ? "pending" : ""].filter(Boolean).join(" ")} key={entry.item_key}>
              <header className="duplicate-instance-card-head">
                <label className="duplicate-reference-choice" title={`将实例 ${index + 1} 设为比较基准`}>
                  <input type="radio" name={`duplicate-reference-${props.group.group_key}`} checked={isReference} onChange={() => props.onReferenceChange(entry.item_key)} />
                  <span>{isReference ? "比较基准" : "设为基准"}</span>
                </label>
                <button type="button" className="duplicate-identity" title={`打开详情：${formatVaultItemMeta(item)}`} onClick={() => props.onOpenItem(item)}>
                  <GameAssetImage src={item.icon} alt="" loading="eager" fallback={<span className="duplicate-thumb-fallback">{item.group_key === "armor" ? "甲" : "武"}</span>} />
                  <span><strong>实例 {index + 1}</strong><small>{formatInstanceMeta(item)}</small>{isDirty ? <em>状态待应用</em> : null}</span>
                </button>
                <div className="duplicate-instance-card-summary">
                  <strong>{isReference ? "这是比较基准" : summarizeInstanceDecision(props.group, evidence, differenceSummary)}</strong>
                  <small>{isReference ? "其他实例会与它逐项对照" : "差异、证据和用途仅用于辅助判断，不会自动替你做决定"}</small>
                </div>
              </header>
              <div className="duplicate-instance-facts" aria-label={`实例 ${index + 1} 的比较事实`}>
                {columns.map((column, valueIndex) => (
                  <div className="duplicate-instance-fact" key={`${entry.item_key}-${column.key}`}>
                    <span className="duplicate-instance-fact-label">{column.label}</span>
                    <DuplicateComparisonCell
                      label={column.label}
                      value={values[valueIndex]!}
                      referenceValue={referenceValues[valueIndex]}
                      isReference={isReference}
                      rollViewMode={effectiveRollViewMode}
                    />
                  </div>
                ))}
              </div>
              <div className="duplicate-instance-card-foot">
                <div className="duplicate-signals">
                  <button type="button" className="duplicate-open-detail" onClick={() => props.onOpenItem(item)}>打开详情处理</button>
                  <EvidenceGroup label="实例保护" values={evidence.protection} kind="protection" />
                  <EvidenceGroup label="推荐证据" values={evidence.matches} kind="match" />
                </div>
                <div className={["duplicate-decision", isDirty ? "is-dirty" : ""].filter(Boolean).join(" ")} role="group" aria-label={`实例 ${index + 1} 整理状态`}>
                  <span className="duplicate-decision-label">整理状态</span>
                  <div>{dispositionOptions.map((option) => <button type="button" key={option.key} data-decision-value={option.key} aria-pressed={disposition === option.key} onClick={() => updateDisposition(entry.item_key, option.key)}>{option.label}</button>)}</div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <footer className="duplicate-decision-footer">
        <div>
          <div className="duplicate-decision-summary">本组状态：<span>保留 <strong>{summary.keep}</strong></span><span>待复查 <strong>{summary.review}</strong></span><span>待处理 <strong>{summary.junk}</strong></span><span>未标记 <strong>{summary.none}</strong></span></div>
          <span className={changedCount ? "duplicate-decision-message is-dirty" : "duplicate-decision-message"}>{changedCount ? `${changedCount} 件状态待应用` : "当前显示已应用状态"}</span>
          {processingRows.length ? <button type="button" className="duplicate-processing-toggle" aria-expanded={showProcessingList} onClick={() => setShowProcessingList((current) => !current)}>{showProcessingList ? "收起待游戏内处理" : `查看待游戏内处理（${processingRows.length}）`}</button> : null}
        </div>
        <div className="duplicate-decision-actions">
          <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!props.referenceKey || props.isBatchSaving} onClick={keepReferenceReviewRest}>填充：基准保留，其余待复查</button>
          <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!changedCount || props.isBatchSaving} onClick={() => props.onPendingDispositionChange(savedDisposition)}>撤销待应用</button>
          <button type="button" data-ui-kind="button" data-control-variant="primary" aria-busy={props.isBatchSaving} disabled={!changedCount || props.isBatchSaving} onClick={requestApplyPendingDisposition}>应用本组状态</button>
          <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={changedCount > 0 || props.isBatchSaving || !props.hasNextPendingGroup} onClick={props.onNextGroup}>下一未整理组</button>
        </div>
      </footer>
      {showProcessingList && processingRows.length ? (
        <section className="duplicate-processing-list" aria-label="待游戏内处理">
          <div className="duplicate-processing-head">
            <strong>待游戏内处理</strong>
            <span>应用标签不会自动解锁、转移或拆解；请打开详情后逐件确认。</span>
          </div>
          <div className="duplicate-processing-items">
            {processingRows.map(({ entry, item }) => {
              const evidence = itemEvidence(item, props);
              return (
                <article className="duplicate-processing-item" key={entry.item_key}>
                  <GameAssetImage src={item.icon} alt="" loading="lazy" fallback={<span className="duplicate-thumb-fallback">{item.group_key === "armor" ? "甲" : "武"}</span>} />
                  <div>
                    <strong>{item.name}</strong>
                    <small>{formatInstanceMeta(item)}</small>
                    {evidence.protection.length || evidence.matches.length ? <span>{[...evidence.protection, ...evidence.matches].join(" · ")}</span> : <span>暂无保护或推荐证据</span>}
                  </div>
                  <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onOpenItem(item)}>打开详情</button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
      {protectionConflictCount > 0 ? (
        <ConfirmationDialog
          title="仍要应用待处理状态？"
          description={`本组有 ${protectionConflictCount} 件装备带实例保护或推荐证据，但被标记为待处理。`}
          confirmLabel="仍然应用"
          cancelLabel="返回检查"
          confirmTone="danger"
          onCancel={() => setProtectionConflictCount(0)}
          onConfirm={() => {
            setProtectionConflictCount(0);
            return persistPendingDisposition();
          }}
        >
          此操作只写入本地整理状态，不会自动解锁、转移或拆解装备；后续仍需在游戏内逐件确认。
        </ConfirmationDialog>
      ) : null}
    </section>
  );
}

function summarizeDifference(
  columns: DuplicateComparisonColumn[],
  values: DuplicateComparisonValue[],
  referenceValues: DuplicateComparisonValue[],
  rollViewMode: "full" | "active"
): string {
  const labels = values.reduce<string[]>((result, value, index) => {
    const reference = referenceValues[index];
    const column = columns[index];
    if (!reference || !column) return result;
    if (value.kind === "scalar" && reference.kind === "scalar") {
      if (value.key === reference.key) return result;
      if (value.key === "missing" || reference.key === "missing") {
        result.push(`${column.label}缺失`);
        return result;
      }
      const currentNumber = Number(value.text);
      const referenceNumber = Number(reference.text);
      if (Number.isFinite(currentNumber) && Number.isFinite(referenceNumber)) {
        const delta = currentNumber - referenceNumber;
        result.push(`${column.label} ${delta > 0 ? "+" : ""}${delta}`);
      } else {
        result.push(`${column.label}不同`);
      }
      return result;
    }
    if (value.kind === "roll" && reference.kind === "roll") {
      const currentKeys = new Set(visibleRollOptions(value.options, rollViewMode).map((option) => option.key));
      const baseKeys = new Set(visibleRollOptions(reference.options, rollViewMode).map((option) => option.key));
      if (currentKeys.size === baseKeys.size && [...currentKeys].every((key) => baseKeys.has(key))) return result;
      const shared = [...currentKeys].filter((key) => baseKeys.has(key)).length;
      result.push(`${column.label} ${shared ? "部分重合" : "不同"}`);
      return result;
    }
    result.push(`${column.label}不同`);
    return result;
  }, []);
  if (!labels.length) return "与基准完全相同";
  return labels.length > 3
    ? `${labels.slice(0, 3).join(" · ")} · 还有 ${labels.length - 3} 项`
    : labels.join(" · ");
}

function EvidenceGroup(props: { label: string; values: string[]; kind: "protection" | "match" }) {
  return (
    <div className="duplicate-evidence-group" data-evidence-kind={props.kind}>
      <small>{props.label}</small>
      <span>{props.values.length ? props.values.map((label) => <b className="ui-badge status-neutral" key={label}>{label}</b>) : <em>无</em>}</span>
    </div>
  );
}

function DuplicateComparisonCell(props: {
  label: string;
  value: DuplicateComparisonValue;
  referenceValue?: DuplicateComparisonValue;
  isReference: boolean;
  rollViewMode: "full" | "active";
}) {
  if (props.value.kind === "scalar") {
    const referenceKey = props.referenceValue?.kind === "scalar" ? props.referenceValue.key : undefined;
    const compareState = props.isReference ? "baseline" : referenceKey === props.value.key ? "same" : "different";
    const stateLabel = compareState === "baseline" ? "比较基准" : compareState === "same" ? "与基准相同" : "与基准不同";
    const shortStateLabel = comparisonStateShortLabel(compareState, props.rollViewMode);
    return (
      <div className={`duplicate-cell ${compareState}`} aria-label={`${props.label}：${props.value.text || "未返回"}，${stateLabel}`}>
        <span className="duplicate-cell-value">{props.value.text || "未返回"}</span>
        {shortStateLabel ? <small className="duplicate-compare-state">{shortStateLabel}</small> : null}
      </div>
    );
  }

  const options = visibleRollOptions(props.value.options, props.rollViewMode);
  const referenceOptions = props.referenceValue?.kind === "roll"
    ? visibleRollOptions(props.referenceValue.options, props.rollViewMode)
    : [];
  const optionKeys = new Set(options.map((option) => option.key));
  const referenceKeys = new Set(referenceOptions.map((option) => option.key));
  const sharedCount = options.filter((option) => referenceKeys.has(option.key)).length;
  const samePool = optionKeys.size === referenceKeys.size && [...optionKeys].every((key) => referenceKeys.has(key));
  const compareState = props.isReference ? "baseline" : samePool ? "same" : sharedCount > 0 ? "partial" : "different";
  const stateLabel = compareState === "baseline"
    ? "比较基准"
    : compareState === "same"
      ? "与基准相同"
      : compareState === "partial"
        ? "与基准部分重合"
        : "与基准完全不同";
  const optionNames = options.map((option) => option.text).join("、") || "未返回";
  const shortStateLabel = comparisonStateShortLabel(compareState, props.rollViewMode);

  return (
    <div className={`duplicate-cell is-roll ${compareState}`} aria-label={`${props.label}：${optionNames}，${stateLabel}`}>
      {shortStateLabel ? <small className="duplicate-compare-state">{shortStateLabel}</small> : null}
      <div className="duplicate-roll-options">
        {options.length ? options.map((option) => {
          const isExtra = !props.isReference && !referenceKeys.has(option.key);
          return (
            <span className={["duplicate-roll-option", option.selected ? "is-selected" : "", option.canSwitch ? "can-switch" : "", isExtra ? "is-extra" : ""].filter(Boolean).join(" ")} key={option.key}>
              {option.icon ? <GameAssetImage className="game-definition-icon duplicate-roll-option-icon" src={option.icon} alt="" loading="eager" /> : <i className="duplicate-roll-option-icon" aria-hidden="true" />}
              <span className="duplicate-roll-option-copy" title={option.text}>
                <b>{option.text}</b>
                {isExtra ? <small>仅此实例</small> : null}
              </span>
              <em>{option.selected ? "当前" : option.canSwitch ? "可切换" : "已拥有"}</em>
            </span>
          );
        }) : <span className="duplicate-roll-empty">未返回</span>}
      </div>
    </div>
  );
}

function comparisonStateShortLabel(
  state: "baseline" | "same" | "partial" | "different",
  rollViewMode: "full" | "active"
): string | undefined {
  if (state === "baseline") return undefined;
  if (state === "same") return "相同";
  if (state === "partial") return "部分重合";
  return rollViewMode === "full" ? "完全不同" : "不同";
}

function visibleRollOptions(options: DuplicateRollOption[], mode: "full" | "active"): DuplicateRollOption[] {
  if (mode === "full") return options;
  return options.filter((option) => option.selected);
}

function buildComparisonColumns(items: AccountItemSummary[]): DuplicateComparisonColumn[] {
  if (items[0]?.group_key === "armor") {
    const armorColumns: Array<{ key: "total" | "health" | "melee" | "grenade" | "super" | "class" | "weapon" | "tiers" | "energy"; label: string }> = [
      { key: "total", label: "总值" },
      { key: "tiers", label: "关键档位" },
      { key: "health", label: "生命" },
      { key: "melee", label: "近战" },
      { key: "grenade", label: "手雷" },
      { key: "super", label: "超能" },
      { key: "class", label: "职业" },
      { key: "weapon", label: "武器" }
    ];
    if (items.some((item) => item.armor_energy)) armorColumns.push({ key: "energy", label: "能量" });
    return armorColumns.map((column) => ({
      key: column.key,
      label: column.label,
      kind: "scalar" as const,
      valueFor: (item) => {
        if (column.key === "energy") {
          const energy = item.armor_energy;
          const text = energy ? `剩余 ${energy.unused} / ${energy.capacity}` : "未返回";
          return { kind: "scalar" as const, key: text, text };
        }
        if (column.key === "tiers") {
          const text = armorTierText(item);
          return { kind: "scalar" as const, key: text, text };
        }
        const value = item.armor_stats?.[column.key];
        return { kind: "scalar" as const, key: value === undefined ? "missing" : String(value), text: value === undefined ? "" : String(value) };
      }
    }));
  }

  const weaponColumns: DuplicateComparisonColumn[] = [];
  if (items.some((item) => item.weapon_frame?.name)) {
    weaponColumns.push({
      key: "weapon-frame",
      label: "框架",
      kind: "scalar",
      valueFor: (item) => ({
        kind: "scalar" as const,
        key: item.weapon_frame?.key ?? "missing",
        text: item.weapon_frame?.name ?? "未标注"
      })
    });
  }
  if (items.some((item) => item.ammo_type)) {
    weaponColumns.push({
      key: "ammo-type",
      label: "弹药",
      kind: "scalar",
      valueFor: (item) => ({
        kind: "scalar" as const,
        key: item.ammo_type ?? "missing",
        text: formatAmmoType(item.ammo_type)
      })
    });
  }
  if (items.some((item) => item.weapon_stats && Object.keys(item.weapon_stats).length > 0)) {
    weaponColumns.push({
      key: "weapon-stats",
      label: "关键属性",
      kind: "scalar",
      valueFor: (item) => ({
        kind: "scalar" as const,
        key: weaponStatText(item),
        text: weaponStatText(item)
      })
    });
  }

  const socketsByItem = new Map<AccountItemSummary, Map<number, DuplicateRollSocket>>();
  const plugsBySocket = new Map<number, AccountItemPlugSummary[]>();
  for (const item of items) {
    const sockets = weaponRollSockets(item);
    socketsByItem.set(item, new Map(sockets.map((socket) => [socket.socketIndex, socket])));
    for (const socket of sockets) {
      plugsBySocket.set(socket.socketIndex, [...(plugsBySocket.get(socket.socketIndex) ?? []), ...socket.plugs]);
    }
  }

  const sortedSockets = [...plugsBySocket.entries()].sort(([left], [right]) => left - right);
  let traitIndex = 0;
  const columns = sortedSockets.map(([socketIndex, plugs]) => {
    const role: WeaponPerkColumnRole = classifyWeaponSocketPlugs(plugs) ?? "other";
    const label = role === "trait" ? `Perk ${++traitIndex}` : weaponSocketColumnLabel(plugs, role, socketIndex);
    return {
      key: `socket-${socketIndex}`,
      label,
      kind: "roll" as const,
      valueFor: (item: AccountItemSummary) => {
        const options = socketsByItem.get(item)?.get(socketIndex)?.options ?? [];
        return {
          kind: "roll" as const,
          key: options.map((option) => option.key).sort().join(",") || "missing",
          options
        };
      }
    };
  });

  return [...weaponColumns, ...columns];
}

function armorTierText(item: AccountItemSummary): string {
  const stats = item.armor_stats;
  if (!stats) return "未返回";
  const entries = (Object.keys(armorStatLabels) as ArmorStatKey[])
    .map((stat) => ({ stat, value: stats[stat], tier: Math.floor(stats[stat] / 10) }))
    .sort((left, right) => right.value - left.value || right.tier - left.tier)
    .slice(0, 3)
    .map(({ stat, tier }) => `${armorStatLabels[stat]} T${tier}`);
  return entries.length ? entries.join(" / ") : "未返回";
}

function formatAmmoType(value: AccountItemSummary["ammo_type"]): string {
  switch (value) {
    case "primary":
      return "主弹药";
    case "special":
      return "特殊弹药";
    case "heavy":
      return "重弹药";
    default:
      return "未标注";
  }
}

function weaponStatText(item: AccountItemSummary): string {
  const stats = item.weapon_stats;
  if (!stats) return "未返回";
  const labels: Array<[keyof NonNullable<AccountItemSummary["weapon_stats"]>, string]> = [
    ["range", "射程"],
    ["stability", "稳定"],
    ["handling", "操控"],
    ["reload_speed", "装填"]
  ];
  const text = labels
    .map(([key, label]) => stats[key] === undefined ? undefined : `${label} ${stats[key]}`)
    .filter((value): value is string => Boolean(value));
  return text.length ? text.join(" / ") : "未返回";
}

function weaponRollSockets(item: AccountItemSummary): DuplicateRollSocket[] {
  if (item.sockets?.length) {
    return item.sockets.flatMap((socket) => {
      if (!socket.is_visible) return [];
      const optionsByHash = new Map<number, DuplicateRollOption>();
      const plugsByHash = new Map<number, AccountItemPlugSummary>();

      const addOption = (plug: AccountItemPlugSummary, selected: boolean, canSwitch: boolean) => {
        if (isWeaponSystemPlug(plug)) return;
        plugsByHash.set(plug.hash, plug);
        const existing = optionsByHash.get(plug.hash);
        if (existing) {
          existing.selected ||= selected;
          existing.canSwitch ||= canSwitch;
          return;
        }
        optionsByHash.set(plug.hash, {
          key: String(plug.hash),
          text: plug.name,
          icon: plug.icon,
          selected,
          canSwitch
        });
      };

      if (socket.selected_plug) addOption(socket.selected_plug, true, false);
      for (const plug of socket.reusable_plugs.filter(isInstanceReusablePlug)) {
        addOption(plug, plug.selected || plug.hash === socket.selected_plug?.hash, canSwitchReusablePlug(plug));
      }

      const options = [...optionsByHash.values()].sort((left, right) => (
        Number(right.selected) - Number(left.selected)
        || Number(right.canSwitch) - Number(left.canSwitch)
        || left.text.localeCompare(right.text)
      ));
      return options.length ? [{ socketIndex: socket.socket_index, plugs: [...plugsByHash.values()], options }] : [];
    });
  }

  return item.socket_plugs.flatMap((plug, socketIndex) => isWeaponSystemPlug(plug) ? [] : [{
    socketIndex,
    plugs: [plug],
    options: [{ key: String(plug.hash), text: plug.name, icon: plug.icon, selected: true, canSwitch: false }]
  }]);
}

function isInstanceReusablePlug(plug: AccountItemReusablePlugSummary): boolean {
  return plug.sources.includes("instance") && !isWeaponSystemPlug(plug);
}

function canSwitchReusablePlug(plug: AccountItemReusablePlugSummary): boolean {
  return plug.can_insert === true
    && plug.enabled !== false
    && plug.insert_fail_indexes.length === 0
    && plug.enable_fail_indexes.length === 0;
}

function getGroupRollDataStatus(
  group: DuplicateItemGroup | undefined,
  itemByKey: Map<string, AccountItemSummary>,
  detailByItemKey: Record<string, AccountItemSummary>,
  loadStatusByItemKey: Record<string, "loading" | "ready" | "error">,
  canLoadDetails: boolean
): "ready" | "loading" | "error" | "unavailable" {
  if (!group) return "unavailable";
  const items = group.items.flatMap((entry) => {
    const item = detailByItemKey[entry.item_key] ?? itemByKey.get(entry.item_key);
    return item?.group_key === "weapons" ? [{ key: entry.item_key, item }] : [];
  });
  if (!items.length) return "ready";
  if (items.every(({ item }) => item.sockets !== undefined)) return "ready";
  if (items.some(({ key }) => loadStatusByItemKey[key] === "error")) return "error";
  if (!canLoadDetails || items.some(({ item }) => !item.instance_id)) return "unavailable";
  return "loading";
}

function getGroupRollDataProgress(
  group: DuplicateItemGroup | undefined,
  itemByKey: Map<string, AccountItemSummary>,
  detailByItemKey: Record<string, AccountItemSummary>
): { ready: number; total: number } {
  if (!group) return { ready: 0, total: 0 };
  const items = group.items.flatMap((entry) => {
    const item = detailByItemKey[entry.item_key] ?? itemByKey.get(entry.item_key);
    return item?.group_key === "weapons" ? [item] : [];
  });
  return {
    ready: items.filter((item) => item.sockets !== undefined).length,
    total: items.length
  };
}

function itemEvidence(item: AccountItemSummary, props: {
  wishlist?: DimWishlist | null;
  localTargetRules?: LocalTargetRules | null;
  equipmentTargetStore?: EquipmentTargetStore | null;
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  communityMatch?: Map<number, VaultItemMatchInfo>;
}): DuplicateEvidence {
  const wishlist = evaluateWishlistRoll(normalizeCoreItem(item), props.wishlist ?? undefined);
  const target = evaluateLocalTargets(normalizeCoreItem(item), props.localTargetRules ?? undefined);
  const equipmentTarget = evaluateEquipmentTargets(normalizeCoreItem(item), props.equipmentTargetStore ?? undefined);
  const exactLoadoutMatch = Boolean(item.instance_id && props.highlightedItemKeys?.instanceIds.has(item.instance_id));
  const sameDefinitionLoadoutMatch = !exactLoadoutMatch && Boolean(
    props.highlightedItemKeys?.bucketHashKeys.has(`${item.bucket_name ?? ""}:${item.hash}`)
    || props.highlightedItemKeys?.hashKeys.has(item.hash)
  );
  const wishlistLabels = wishlist.labels.slice(0, 2).map((label) => `愿望单：${label}`);
  const targetLabels = [...new Set([...target.labels, ...equipmentTarget.labels])]
    .slice(0, 2)
    .map((label) => `目标：${label}`);
  const targetHint = item.group_key === "armor" ? armorTargetHint(item, props) : undefined;
  return {
    protection: [
      item.locked ? "已锁定" : "",
      exactLoadoutMatch ? "配装实例" : ""
    ].filter(Boolean),
    matches: [
      sameDefinitionLoadoutMatch ? "配装同款" : "",
      ...wishlistLabels,
      ...targetLabels,
      (props.communityMatch?.get(item.hash)?.matched ?? 0) > 0 ? "社区同款" : ""
    ].filter(Boolean),
    targetHint
  };
}

const armorStatLabels: Record<ArmorStatKey, string> = {
  health: "生命",
  melee: "近战",
  grenade: "手雷",
  super: "超能",
  class: "职业",
  weapon: "武器"
};

function armorTargetHint(item: AccountItemSummary, props: {
  localTargetRules?: LocalTargetRules | null;
  equipmentTargetStore?: EquipmentTargetStore | null;
}): string | undefined {
  const stats = item.armor_stats;
  if (!stats) return undefined;
  const targets = [
    ...(props.localTargetRules?.armor ?? []).map((rule) => ({
      name: rule.name,
      class_type: undefined,
      bucket_hash: undefined,
      bucket_name: undefined,
      stat_requirements: Object.fromEntries(rule.conditions.map((condition) => [condition.stat, condition.min])) as Partial<Record<ArmorStatKey, number>>,
      minimum_total: undefined
    })),
    ...(props.equipmentTargetStore?.targets ?? [])
      .filter((target): target is Extract<EquipmentTargetStore["targets"][number], { kind: "armor_acquisition" }> => target.kind === "armor_acquisition")
      .map((target) => target)
  ].filter((target) => (
    (target.class_type === undefined || target.class_type === item.class_type)
    && (target.bucket_hash === undefined || target.bucket_hash === item.bucket_hash)
    && (target.bucket_hash !== undefined || !target.bucket_name || target.bucket_name === item.bucket_name)
  ));
  if (!targets.length) return undefined;

  const evaluations = targets.map((target) => {
    const missing = Object.entries(target.stat_requirements).flatMap(([stat, minimum]) => {
      const current = stats[stat as ArmorStatKey];
      return typeof minimum === "number" && current < minimum
        ? [{ stat: stat as ArmorStatKey, deficit: minimum - current }]
        : [];
    });
    if (typeof target.minimum_total === "number" && stats.total < target.minimum_total) {
      missing.push({ stat: "total" as ArmorStatKey, deficit: target.minimum_total - stats.total });
    }
    return { target, missing };
  });
  const matched = evaluations.filter((entry) => entry.missing.length === 0);
  if (matched.length) return `命中目标：${matched.slice(0, 3).map((entry) => entry.target.name).join("、")}`;
  const nearest = [...evaluations].sort((left, right) => (
    left.missing.length - right.missing.length
    || left.missing.reduce((sum, entry) => sum + entry.deficit, 0) - right.missing.reduce((sum, entry) => sum + entry.deficit, 0)
  ))[0];
  const gaps = nearest?.missing.slice(0, 3);
  return nearest && gaps?.length
    ? `距离目标“${nearest.target.name}”还差 ${gaps.map((gap) => `${gap.stat === "total" ? "总值" : armorStatLabels[gap.stat]} ${gap.deficit}`).join("、")}`
    : undefined;
}

function summarizeGroupEvidence(group: DuplicateItemGroup, itemByKey: Map<string, AccountItemSummary>, props: {
  wishlist?: DimWishlist | null;
  localTargetRules?: LocalTargetRules | null;
  equipmentTargetStore?: EquipmentTargetStore | null;
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  communityMatch?: Map<number, VaultItemMatchInfo>;
}): { protectedItems: number; matchedItems: number } {
  return group.items.reduce((summary, entry) => {
    const item = itemByKey.get(entry.item_key);
    if (!item) return summary;
    const evidence = itemEvidence(item, props);
    if (evidence.protection.length) summary.protectedItems += 1;
    if (evidence.matches.length) summary.matchedItems += 1;
    return summary;
  }, { protectedItems: 0, matchedItems: 0 });
}

function formatInstanceMeta(item: AccountItemSummary): string {
  return [
    item.bucket_name,
    item.group_key === "armor" ? formatArmorClass(item.class_type) : undefined,
    item.group_key === "armor" ? item.armor_set?.name : undefined,
    item.group_key === "weapons" ? item.weapon_frame?.name : undefined,
    item.power !== undefined ? `光等 ${item.power}` : undefined,
    item.instance?.is_equipped ? "已装备" : undefined,
    item.locked ? "已锁定" : "未锁定",
    item.instance_id ? `#${item.instance_id.slice(-6)}` : undefined
  ].filter(Boolean).join(" · ") || "实例信息未返回";
}

function formatArmorClass(classType: number | undefined): string | undefined {
  switch (classType) {
    case 0:
      return "泰坦";
    case 1:
      return "猎人";
    case 2:
      return "术士";
    case 3:
      return "通用";
    default:
      return undefined;
  }
}

function groupKindLabel(group: DuplicateItemGroup): string {
  switch (group.group_kind) {
    case "same_definition":
      return "同一版本";
    case "same_armor_context":
      return "同职业同部位";
    case "same_display_name":
      return "同名不同版本";
    default:
      return group.hash ? "同一版本" : "同名不同版本";
  }
}

function groupTypeLabel(group: DuplicateItemGroup): string {
  switch (group.item_group) {
    case "weapons":
      return "武器";
    case "armor":
      return "护甲";
    case "equipment":
      return "装备";
    case "mixed":
      return "混合对象";
    default:
      return "其他";
  }
}

function groupDecisionHint(
  group: DuplicateItemGroup,
  evidence: { protectedItems: number; matchedItems: number }
): string {
  if (group.item_group === "weapons") {
    return evidence.matchedItems > 0 ? `${evidence.matchedItems} 件有用途证据` : "比较武器用途与 Perk";
  }
  if (group.item_group === "armor") {
    return evidence.matchedItems > 0 ? `${evidence.matchedItems} 件命中目标` : "比较属性目标与配装缺口";
  }
  return "确认是否值得处理";
}

function compareDuplicateGroups(
  left: DuplicateItemGroup,
  right: DuplicateItemGroup,
  evidenceByGroup: Map<string, { protectedItems: number; matchedItems: number }>
): number {
  const leftEvidence = evidenceByGroup.get(left.group_key) ?? { protectedItems: 0, matchedItems: 0 };
  const rightEvidence = evidenceByGroup.get(right.group_key) ?? { protectedItems: 0, matchedItems: 0 };
  const leftActionability = leftEvidence.matchedItems * 3 + leftEvidence.protectedItems * 2;
  const rightActionability = rightEvidence.matchedItems * 3 + rightEvidence.protectedItems * 2;
  return rightActionability - leftActionability
    || Number(right.group_kind === "same_definition") - Number(left.group_kind === "same_definition")
    || right.count - left.count
    || left.name.localeCompare(right.name, "zh-Hans-CN");
}

function isLowDecisionGroup(
  group: DuplicateItemGroup,
  itemByKey: Map<string, AccountItemSummary>,
  evidence: { protectedItems: number; matchedItems: number }
): boolean {
  if (group.group_kind !== "same_definition" || evidence.protectedItems > 0 || evidence.matchedItems > 0) return false;
  const items = group.items
    .map((entry) => itemByKey.get(entry.item_key))
    .filter((item): item is AccountItemSummary => Boolean(item));
  if (items.length < 2) return false;
  const signatures = items.map((item) => item.group_key === "armor"
    ? armorDecisionSignature(item)
    : weaponDecisionSignature(item));
  return signatures.every((signature) => signature === signatures[0]);
}

function armorDecisionSignature(item: AccountItemSummary): string {
  const stats = item.armor_stats;
  const energy = item.armor_energy;
  return [
    stats ? [stats.total, stats.health, stats.melee, stats.grenade, stats.super, stats.class, stats.weapon].join(",") : "missing-stats",
    energy ? `${energy.capacity}/${energy.used}/${energy.unused}` : "missing-energy"
  ].join("|");
}

function weaponDecisionSignature(item: AccountItemSummary): string {
  return [
    item.weapon_frame?.key ?? "missing-frame",
    item.ammo_type ?? "missing-ammo",
    item.socket_plugs.map((plug) => plug.hash).join(","),
    weaponStatText(item)
  ].join("|");
}

function summarizeInstanceDecision(
  group: DuplicateItemGroup,
  evidence: DuplicateEvidence,
  differenceSummary: string
): string {
  const signal = evidence.matches[0] ?? evidence.protection[0];
  if (group.item_group === "weapons" && signal) {
    return `${signal} · ${differenceSummary}`;
  }
  if (group.item_group === "armor" && signal) {
    return `${signal} · ${differenceSummary}`;
  }
  if (group.item_group === "armor" && evidence.targetHint) {
    return `${evidence.targetHint} · ${differenceSummary}`;
  }
  return differenceSummary;
}

function defaultReferenceKey(group: DuplicateItemGroup): string {
  return group.items.find((entry) => dispositionFromTag(entry.tag) === "keep")?.item_key
    ?? group.items[0]?.item_key
    ?? "";
}

function dispositionFromTag(tag?: string): DuplicateDisposition {
  return tag === "keep" || tag === "review" || tag === "junk" ? tag : "none";
}

function summarizeGroupDisposition(group: DuplicateItemGroup, pendingDisposition?: Record<string, DuplicateDisposition>): Record<DuplicateDisposition, number> {
  return group.items.reduce<Record<DuplicateDisposition, number>>((summary, entry) => {
    summary[pendingDisposition?.[entry.item_key] ?? dispositionFromTag(entry.tag)] += 1;
    return summary;
  }, { none: 0, keep: 0, review: 0, junk: 0 });
}

function isGroupPersistedComplete(group: DuplicateItemGroup): boolean {
  return group.items.every((entry) => dispositionFromTag(entry.tag) !== "none");
}

function hasGroupPendingChanges(group: DuplicateItemGroup, pendingDisposition?: Record<string, DuplicateDisposition>): boolean {
  if (!pendingDisposition) return false;
  return group.items.some((entry) => (pendingDisposition[entry.item_key] ?? "none") !== dispositionFromTag(entry.tag));
}

/**
 * 以固定并发运行批量任务。任务按传入顺序排队，单个任务失败不会阻塞后续实例。
 * 返回 promise 仅用于让 effect 保持可追踪，不暴露内部请求结果。
 */
async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  if (!items.length) return;
  const limit = Math.max(1, Math.min(concurrency, items.length));
  let nextIndex = 0;
  const runWorker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      const item = items[index];
      if (item === undefined) return;
      try {
        await worker(item);
      } catch {
        // worker 自己负责更新实例状态；这里吞掉异常以继续读取队列。
      }
    }
  };
  await Promise.all(Array.from({ length: limit }, () => runWorker()));
}
