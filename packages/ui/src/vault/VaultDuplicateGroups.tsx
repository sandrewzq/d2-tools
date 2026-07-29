import { useEffect, useMemo, useState } from "react";
import type {
  DuplicateAnalysisResult, DuplicateItemGroup
} from "@d2-tools/core/analysis/duplicates";
import { evaluateLocalTargets } from "@d2-tools/core/analysis/targets";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { VaultTags } from "@d2-tools/core/vault/tags";
import { formatVaultItemMeta } from "./VaultListItem.js";
import { getVaultItemKey, selectDuplicateGroupItems, type DuplicateGroupBatchTagMode } from "@d2-tools/app/vault";

export const INITIAL_DUPLICATE_GROUP_RENDER_LIMIT = 40;
const DUPLICATE_GROUP_RENDER_INCREMENT = 40;

export function VaultDuplicateGroups(props: {
  duplicateSummary: DuplicateAnalysisResult;
  items: AccountItemSummary[];
  tags: VaultTags;
  localTargetRules?: LocalTargetRules | null;
  selectedKeys: Set<string>;
  openingItemKey?: string;
  isBatchSaving: boolean;
  onOpenItem: (item: AccountItemSummary) => void;
  onMergeSelectedKeys: (keys: string[]) => void;
  onApplyDuplicateGroupTags: (
    group: DuplicateItemGroup,
    mode: DuplicateGroupBatchTagMode,
    keepItemKey?: string
  ) => void | Promise<void>;
}) {
  const groups = props.duplicateSummary.groups;
  const [visibleGroupLimit, setVisibleGroupLimit] = useState(INITIAL_DUPLICATE_GROUP_RENDER_LIMIT);
  useEffect(() => {
    setVisibleGroupLimit(INITIAL_DUPLICATE_GROUP_RENDER_LIMIT);
  }, [groups]);
  const itemByKey = useMemo(
    () => new Map(props.items.map((item) => [getVaultItemKey(item), item])),
    [props.items]
  );
  const renderedGroups = groups.slice(0, visibleGroupLimit);

  if (!groups.length) {
    return <p className="status-message status-neutral">当前仓库没有发现同名重复装备。</p>;
  }

  return (
    <div className="duplicate-group-list">
      {groups.length > INITIAL_DUPLICATE_GROUP_RENDER_LIMIT ? (
        <div className="vault-render-limit-message">
          <span>先显示 {Math.min(visibleGroupLimit, groups.length)} / {groups.length} 组，减少同名对比切换和批量标记时的界面延迟。</span>
          {visibleGroupLimit < groups.length ? (
            <button
              data-ui-kind="button" data-control-variant="secondary"
              type="button"
              onClick={() => setVisibleGroupLimit((current) => current + DUPLICATE_GROUP_RENDER_INCREMENT)}
            >
              加载更多
            </button>
          ) : null}
        </div>
      ) : null}
      {renderedGroups.map((group) => {
        const selectedGroupCount = group.items.filter((entry) => props.selectedKeys.has(entry.item_key)).length;
        const junkCandidateKeys = selectDuplicateGroupItems(group, "junk");
        const restCandidateKeys = selectDuplicateGroupItems(group, "rest");
        const topItem = group.items[0] ? itemByKey.get(group.items[0].item_key) : undefined;
        const canOpenTopItem = topItem?.group_key === "weapons" || topItem?.group_key === "armor";
        return (
          <section className="duplicate-group" key={group.group_key}>
            <header className="duplicate-group-heading">
              <div>
                <h3>{group.name}</h3>
                <span>{group.hash ? `同 Hash ${group.hash}` : "同名不同 Hash"} · {group.count} 个实例{selectedGroupCount ? ` · 已选 ${selectedGroupCount}` : ""}</span>
              </div>
              <div className="duplicate-group-actions">
                {canOpenTopItem ? <button
                  type="button"
                  data-ui-kind="button"
                  data-control-variant="secondary"
                  aria-busy={props.isBatchSaving}
                  disabled={props.isBatchSaving}
                  onClick={() => props.onOpenItem(topItem)}
                >
                  打开推荐项
                </button> : null}
                <details className="duplicate-batch-tools">
                  <summary>批量操作</summary>
                  <div className="vault-batch-panel">
                    <button
                      type="button"
                      aria-busy={props.isBatchSaving}
                      disabled={props.isBatchSaving || !restCandidateKeys.length}
                      onClick={() => props.onMergeSelectedKeys(restCandidateKeys)}
                    >
                      选择其余候选
                    </button>
                    <button
                      type="button"
                      aria-busy={props.isBatchSaving}
                      disabled={props.isBatchSaving || !junkCandidateKeys.length}
                      onClick={() => props.onMergeSelectedKeys(junkCandidateKeys)}
                    >
                      选择可清理候选
                    </button>
                    <button
                      type="button"
                      aria-busy={props.isBatchSaving}
                      disabled={props.isBatchSaving}
                      onClick={() => void props.onApplyDuplicateGroupTags(group, "keep-best-review-rest")}
                    >
                      其余标记关注
                    </button>
                    <button
                      type="button"
                      aria-busy={props.isBatchSaving}
                      disabled={props.isBatchSaving}
                      onClick={() => void props.onApplyDuplicateGroupTags(group, "keep-best-junk-rest")}
                    >
                      其余标记可清理
                    </button>
                    <button
                      type="button"
                      aria-busy={props.isBatchSaving}
                      disabled={props.isBatchSaving}
                      onClick={() => void props.onApplyDuplicateGroupTags(group, "clear-group-tags")}
                    >
                      清除本组标记
                    </button>
                  </div>
                </details>
              </div>
            </header>
            {group.items.map((entry, index) => {
              const item = itemByKey.get(entry.item_key);
              const itemMeta = item ? formatVaultItemMeta(item) : "未找到实例信息";
              const note = item ? props.tags.items[getVaultItemKey(item)]?.note : undefined;
              const localTarget = item
                ? evaluateLocalTargets({ ...item, socket_plugs: item.socket_plugs ?? [] }, props.localTargetRules ?? undefined)
                : { matched: false, labels: [] };
              const isSelected = props.selectedKeys.has(entry.item_key);
              const duplicateTone = entry.tag === "keep" || entry.tag === "review" || entry.tag === "junk"
                ? entry.tag
                : "none";
              const canOpenDetail = item?.group_key === "weapons" || item?.group_key === "armor";
              const rowContent = <>
                {item?.icon ? <img src={item.icon} alt="" /> : <span className="duplicate-row-icon-missing" aria-hidden="true">?</span>}
                <span className="duplicate-row-copy">
                  <strong>实例 {index + 1} · {entry.roll_text || "暂无实际 Roll"}</strong>
                  <small className="duplicate-row-meta">仓库 · {entry.locked ? "已锁定" : "未锁定"}{entry.tag ? ` · ${entry.tag}` : ""}{isSelected ? " · 已选候选" : ""}</small>
                  {localTarget.matched ? <small className="duplicate-row-note">本地目标：{localTarget.labels.join(" / ")}</small> : null}
                  {note ? <small className="duplicate-row-note">备注：{note}</small> : null}
                </span>
              </>;
              return (
                <article
                  className={item && getVaultItemKey(item) === props.openingItemKey
                    ? `duplicate-row duplicate-${duplicateTone} pending${isSelected ? " selected" : ""}`
                    : `duplicate-row duplicate-${duplicateTone}${isSelected ? " selected" : ""}`}
                  key={entry.item_key}
                >
                  {canOpenDetail ? (
                    <button
                      className="duplicate-row-main"
                      type="button"
                      title={itemMeta}
                      aria-busy={Boolean(item && getVaultItemKey(item) === props.openingItemKey)}
                      onClick={() => item && props.onOpenItem(item)}
                    >
                      {rowContent}
                    </button>
                  ) : <div className="duplicate-row-main is-readonly" title={itemMeta}>{rowContent}</div>}
                  <div className="duplicate-row-actions">
                    <button
                      type="button"
                      data-ui-kind="button" data-control-variant="secondary"
                      aria-busy={props.isBatchSaving}
                      disabled={props.isBatchSaving || !item}
                      onClick={() => item && void props.onApplyDuplicateGroupTags(group, "keep-best-review-rest", entry.item_key)}
                    >
                      设为基准
                    </button>
                    <button
                      type="button"
                      data-ui-kind="button" data-control-variant="secondary"
                      aria-busy={props.isBatchSaving}
                      disabled={props.isBatchSaving || !item}
                      onClick={() => item && void props.onApplyDuplicateGroupTags(group, "keep-best-junk-rest", entry.item_key)}
                    >
                      其余可清理
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
