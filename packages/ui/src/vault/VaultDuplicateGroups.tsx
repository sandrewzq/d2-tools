import { useEffect, useMemo, useState } from "react";
import type { DuplicateAnalysisResult, DuplicateItemGroup } from "@d2-tools/core/analysis/duplicates";
import { evaluateLocalTargets } from "@d2-tools/core/analysis/targets";
import { evaluateWishlistRoll } from "@d2-tools/core/analysis/wishlist";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { VaultItemMatchInfo } from "@d2-tools/core/community-perks";
import type { SaveVaultTagInput, VaultTags } from "@d2-tools/core/vault/tags";
import { matchesLoadoutTemplateItem, type LoadoutTemplateLookup } from "@d2-tools/app/loadouts";
import { getVaultItemKey, normalizeCoreItem } from "@d2-tools/app/vault";
import { GameAssetImage } from "../media/GameAssetImage.js";
import { formatVaultItemMeta } from "./VaultListItem.js";

type DuplicateDisposition = "none" | "keep" | "review" | "junk";
type DuplicateTypeFilter = "all" | "weapons" | "armor";

const dispositionOptions: Array<{ key: DuplicateDisposition; label: string }> = [
  { key: "keep", label: "保留" },
  { key: "review", label: "待复查" },
  { key: "junk", label: "可清理" },
  { key: "none", label: "清除" }
];

export function VaultDuplicateGroups(props: {
  duplicateSummary: DuplicateAnalysisResult;
  items: AccountItemSummary[];
  tags: VaultTags;
  wishlist?: DimWishlist | null;
  localTargetRules?: LocalTargetRules | null;
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  communityMatch?: Map<number, VaultItemMatchInfo>;
  openingItemKey?: string;
  isBatchSaving: boolean;
  onOpenItem: (item: AccountItemSummary) => void;
  onApplyGroupTags: (groupName: string, inputs: SaveVaultTagInput[]) => void | Promise<void>;
}) {
  const groups = props.duplicateSummary.groups;
  const itemByKey = useMemo(() => new Map(props.items.map((item) => [getVaultItemKey(item), item])), [props.items]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<DuplicateTypeFilter>("all");
  const [activeGroupKey, setActiveGroupKey] = useState(groups[0]?.group_key ?? "");
  const [referenceByGroup, setReferenceByGroup] = useState<Record<string, string>>({});
  const [draftByGroup, setDraftByGroup] = useState<Record<string, Record<string, DuplicateDisposition>>>({});

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return groups.filter((group) => {
      const firstItem = group.items[0] ? itemByKey.get(group.items[0].item_key) : undefined;
      if (typeFilter !== "all" && firstItem?.group_key !== typeFilter) return false;
      return !normalizedQuery || group.name.toLocaleLowerCase().includes(normalizedQuery) || String(group.hash ?? "").includes(normalizedQuery);
    });
  }, [groups, itemByKey, query, typeFilter]);

  useEffect(() => {
    if (!filteredGroups.some((group) => group.group_key === activeGroupKey)) {
      setActiveGroupKey(filteredGroups[0]?.group_key ?? "");
    }
  }, [activeGroupKey, filteredGroups]);

  if (!groups.length) {
    return <p className="status-message status-neutral">当前仓库没有发现同名重复装备。</p>;
  }

  const activeGroup = filteredGroups.find((group) => group.group_key === activeGroupKey) ?? filteredGroups[0];

  return (
    <div className="duplicate-workspace">
      <aside className="duplicate-group-browser" aria-label="同名装备组">
        <div className="duplicate-browser-head"><strong>同名整理队列</strong><span>先选择一组，再在右侧逐件比较和暂存状态。</span></div>
        <div className="duplicate-browser-tools">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索同名装备" aria-label="搜索同名装备组" />
          <div className="duplicate-type-filter" role="group" aria-label="同名装备类型">
            {(["all", "weapons", "armor"] as DuplicateTypeFilter[]).map((value) => (
              <button type="button" key={value} aria-pressed={typeFilter === value} onClick={() => setTypeFilter(value)}>{value === "all" ? "全部" : value === "weapons" ? "武器" : "护甲"}</button>
            ))}
          </div>
        </div>
        <nav className="duplicate-group-nav">
          {filteredGroups.map((group) => {
            const dispositionSummary = summarizeGroupDraft(group, draftByGroup[group.group_key]);
            const protectionCount = group.items.filter((entry) => {
              const item = itemByKey.get(entry.item_key);
              return item ? evidenceLabels(item, props).length > 0 : false;
            }).length;
            const firstItem = group.items[0] ? itemByKey.get(group.items[0].item_key) : undefined;
            return (
              <button type="button" className="duplicate-group-link" key={group.group_key} aria-pressed={activeGroup?.group_key === group.group_key} onClick={() => setActiveGroupKey(group.group_key)}>
                <GameAssetImage src={firstItem?.icon} alt="" loading="eager" fallback={<span className="duplicate-thumb-fallback">{firstItem?.group_key === "armor" ? "甲" : "武"}</span>} />
                <span className="duplicate-group-copy"><strong>{group.name}</strong><span>{group.hash ? "同 Hash" : "同名不同 Hash"} · {group.count} 件 · 保护信号 {protectionCount}</span><small>保留 {dispositionSummary.keep} · 待复查 {dispositionSummary.review} · 可清理 {dispositionSummary.junk}</small></span>
              </button>
            );
          })}
        </nav>
        {!filteredGroups.length ? <p className="duplicate-browser-empty">没有符合当前搜索和类型条件的同名组。</p> : null}
      </aside>

      {activeGroup ? (
        <DuplicateComparePanel
          group={activeGroup}
          itemByKey={itemByKey}
          tags={props.tags}
          wishlist={props.wishlist}
          localTargetRules={props.localTargetRules}
          highlightedItemKeys={props.highlightedItemKeys}
          communityMatch={props.communityMatch}
          referenceKey={referenceByGroup[activeGroup.group_key] ?? ""}
          draft={draftByGroup[activeGroup.group_key]}
          openingItemKey={props.openingItemKey}
          isBatchSaving={props.isBatchSaving}
          onReferenceChange={(itemKey) => setReferenceByGroup((current) => ({ ...current, [activeGroup.group_key]: itemKey }))}
          onDraftChange={(nextDraft) => setDraftByGroup((current) => ({ ...current, [activeGroup.group_key]: nextDraft }))}
          onOpenItem={props.onOpenItem}
          onApplyGroupTags={props.onApplyGroupTags}
          onNextGroup={() => {
            const currentIndex = filteredGroups.findIndex((group) => group.group_key === activeGroup.group_key);
            const nextGroup = filteredGroups[(currentIndex + 1) % filteredGroups.length];
            if (nextGroup) setActiveGroupKey(nextGroup.group_key);
          }}
        />
      ) : <section className="duplicate-compare-panel"><p className="status-message status-neutral">选择左侧同名组开始比较。</p></section>}
    </div>
  );
}

function DuplicateComparePanel(props: {
  group: DuplicateItemGroup;
  itemByKey: Map<string, AccountItemSummary>;
  tags: VaultTags;
  wishlist?: DimWishlist | null;
  localTargetRules?: LocalTargetRules | null;
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  communityMatch?: Map<number, VaultItemMatchInfo>;
  referenceKey: string;
  draft?: Record<string, DuplicateDisposition>;
  openingItemKey?: string;
  isBatchSaving: boolean;
  onReferenceChange: (itemKey: string) => void;
  onDraftChange: (draft: Record<string, DuplicateDisposition>) => void;
  onOpenItem: (item: AccountItemSummary) => void;
  onApplyGroupTags: (groupName: string, inputs: SaveVaultTagInput[]) => void | Promise<void>;
  onNextGroup: () => void;
}) {
  const rows = props.group.items.flatMap((entry) => {
    const item = props.itemByKey.get(entry.item_key);
    return item ? [{ entry, item }] : [];
  });
  const draft = props.draft ?? Object.fromEntries(props.group.items.map((entry) => [entry.item_key, dispositionFromTag(entry.tag)]));
  const referenceRow = rows.find((row) => row.entry.item_key === props.referenceKey);
  const referenceValues = referenceRow ? comparisonValues(referenceRow.item) : [];
  const summary = summarizeGroupDraft(props.group, draft);
  const columnLabels = rows[0]?.item.group_key === "armor" ? ["总值", "生命", "职业", "手雷"] : ["第一列", "第二列", "第三列", "第四列"];
  const openItem = referenceRow?.item ?? rows[0]?.item;

  function updateDisposition(itemKey: string, disposition: DuplicateDisposition) {
    props.onDraftChange({ ...draft, [itemKey]: disposition });
  }

  function keepReferenceReviewRest() {
    if (!props.referenceKey) return;
    props.onDraftChange(Object.fromEntries(props.group.items.map((entry) => [entry.item_key, entry.item_key === props.referenceKey ? "keep" : "review"])));
  }

  async function applyDraft() {
    const conflicts = rows.filter(({ entry, item }) => (draft[entry.item_key] ?? "none") === "junk" && evidenceLabels(item, props).length > 0);
    if (conflicts.length && !window.confirm(`本组有 ${conflicts.length} 件带锁定、配装、愿望单、目标或社区推荐信号的装备被标记为可清理。确认仍要应用吗？`)) return;
    await props.onApplyGroupTags(props.group.name, props.group.items.map((entry) => ({ item_key: entry.item_key, tag: draft[entry.item_key] ?? "none" })));
  }

  return (
    <section className="duplicate-compare-panel">
      <header className="duplicate-compare-head">
        <div><h2>{props.group.name}</h2><p>{props.group.hash ? `同 Hash ${props.group.hash}` : "同名不同 Hash"} · 参考实例只用于突出差异，不会自动修改整理状态，也不等于唯一保留项。</p></div>
        <div className="duplicate-compare-head-actions"><span>{props.referenceKey ? "已选择对比参考" : "尚未选择对比参考"}</span><button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!openItem} onClick={() => openItem && props.onOpenItem(openItem)}>打开详情</button></div>
      </header>
      <div className="duplicate-compare-table">
        <div className="duplicate-table-head"><span>参考</span><span>实例</span>{columnLabels.map((label) => <span key={label}>{label}</span>)}<span>保护与匹配</span><span>整理状态</span></div>
        {rows.map(({ entry, item }, index) => {
          const values = comparisonValues(item);
          const evidence = evidenceLabels(item, props);
          const disposition = draft[entry.item_key] ?? "none";
          const isReference = props.referenceKey === entry.item_key;
          const hasProtectionConflict = disposition === "junk" && evidence.length > 0;
          return (
            <article className={["duplicate-compare-row", isReference ? "reference" : "", hasProtectionConflict ? "has-protection-conflict" : "", props.openingItemKey === getVaultItemKey(item) ? "pending" : ""].filter(Boolean).join(" ")} key={entry.item_key}>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" className="duplicate-reference-button" aria-pressed={isReference} onClick={() => props.onReferenceChange(entry.item_key)}>{isReference ? "已选" : "参考"}</button>
              <button type="button" className="duplicate-identity" title={formatVaultItemMeta(item)} onClick={() => props.onOpenItem(item)}>
                <GameAssetImage src={item.icon} alt="" loading="eager" fallback={<span className="duplicate-thumb-fallback">{item.group_key === "armor" ? "甲" : "武"}</span>} />
                <span><strong>实例 {index + 1}</strong><small>{item.bucket_name ?? "未知位置"} · {item.locked ? "已锁定" : "未锁定"}</small></span>
              </button>
              {values.map((value, valueIndex) => {
                const compareState = !props.referenceKey || isReference ? "" : referenceValues[valueIndex] === value ? "same" : "different";
                return <div className={`duplicate-cell ${compareState}`} key={`${entry.item_key}-${valueIndex}`}>{value || "-"}</div>;
              })}
              <div className="duplicate-signals">{evidence.length ? evidence.map((label) => <span className="ui-badge status-neutral" key={label}>{label}</span>) : <span>无保护或匹配信号</span>}</div>
              <div className="duplicate-decision" role="group" aria-label={`实例 ${index + 1} 整理状态`}>
                {dispositionOptions.map((option) => <button type="button" key={option.key} data-decision-value={option.key} aria-pressed={disposition === option.key} onClick={() => updateDisposition(entry.item_key, option.key)}>{option.label}</button>)}
              </div>
            </article>
          );
        })}
      </div>
      <footer className="duplicate-decision-footer">
        <div><div className="duplicate-decision-summary">本组状态：<span>保留 <strong>{summary.keep}</strong></span><span>待复查 <strong>{summary.review}</strong></span><span>可清理 <strong>{summary.junk}</strong></span><span>未标记 <strong>{summary.none}</strong></span></div><span className="duplicate-decision-message">这里只写入玩家整理状态，不会自动转移或拆解装备。</span></div>
        <div className="duplicate-decision-actions"><button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!props.referenceKey || props.isBatchSaving} onClick={keepReferenceReviewRest}>保留参考，其余待复查</button><button type="button" data-ui-kind="button" data-control-variant="primary" aria-busy={props.isBatchSaving} disabled={props.isBatchSaving} onClick={() => void applyDraft()}>应用本组状态</button><button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isBatchSaving} onClick={props.onNextGroup}>下一组</button></div>
      </footer>
    </section>
  );
}

function comparisonValues(item: AccountItemSummary): string[] {
  if (item.group_key === "armor") {
    return item.armor_stats ? [String(item.armor_stats.total), String(item.armor_stats.health), String(item.armor_stats.class), String(item.armor_stats.grenade)] : ["", "", "", ""];
  }
  return Array.from({ length: 4 }, (_, index) => item.socket_plugs[index]?.name ?? "");
}

function evidenceLabels(item: AccountItemSummary, props: {
  wishlist?: DimWishlist | null;
  localTargetRules?: LocalTargetRules | null;
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  communityMatch?: Map<number, VaultItemMatchInfo>;
}): string[] {
  const wishlist = evaluateWishlistRoll(normalizeCoreItem(item), props.wishlist ?? undefined);
  const target = evaluateLocalTargets(normalizeCoreItem(item), props.localTargetRules ?? undefined);
  return [
    item.locked ? "已锁定" : "",
    matchesLoadoutTemplateItem(item, props.highlightedItemKeys) ? "配装引用" : "",
    wishlist.matched ? "愿望单" : "",
    target.matched ? "目标命中" : "",
    (props.communityMatch?.get(item.hash)?.matched ?? 0) > 0 ? "社区推荐" : ""
  ].filter(Boolean);
}

function dispositionFromTag(tag?: string): DuplicateDisposition {
  return tag === "keep" || tag === "review" || tag === "junk" ? tag : "none";
}

function summarizeGroupDraft(group: DuplicateItemGroup, draft?: Record<string, DuplicateDisposition>): Record<DuplicateDisposition, number> {
  return group.items.reduce<Record<DuplicateDisposition, number>>((summary, entry) => {
    summary[draft?.[entry.item_key] ?? dispositionFromTag(entry.tag)] += 1;
    return summary;
  }, { none: 0, keep: 0, review: 0, junk: 0 });
}
