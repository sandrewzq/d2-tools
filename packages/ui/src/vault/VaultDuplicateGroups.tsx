import { useEffect, useMemo, useState } from "react";
import type {
  DuplicateAnalysisResult, DuplicateItemGroup
} from "@d2-tools/core/analysis/duplicates";
import { evaluateLocalTargets } from "@d2-tools/core/analysis/targets";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { VaultTags } from "@d2-tools/core/vault/tags";
import { formatVaultItemMeta } from "./VaultListItem.js";
import {
  getVaultItemKey,
  selectDuplicateGroupItems,
  type DuplicateGroupBatchTagMode
} from "@d2-tools/app";

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
              className="secondary-button"
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
        return (
          <section className="duplicate-group" key={group.group_key}>
            <div className="duplicate-group-heading">
              <h3>{group.name}</h3>
              <span>{group.count} 件 / 已选候选 {selectedGroupCount}</span>
            </div>
            <div className="vault-batch-panel">
              <button
                type="button"
                aria-busy={props.isBatchSaving}
                disabled={props.isBatchSaving}
                onClick={() => {
                  const topItem = group.items[0] ? itemByKey.get(group.items[0].item_key) : undefined;
                  if (topItem) props.onOpenItem(topItem);
                }}
              >
                打开最高分
              </button>
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
            {group.items.map((entry) => {
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
                    {localTarget.matched ? <small className="duplicate-row-note">本地目标：{localTarget.labels.join(" / ")}</small> : null}
                    {note ? <small className="duplicate-row-note">备注：{note}</small> : null}
                  </button>
                  <div className="duplicate-row-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      aria-busy={props.isBatchSaving}
                      disabled={props.isBatchSaving || !item}
                      onClick={() => item && void props.onApplyDuplicateGroupTags(group, "keep-best-review-rest", entry.item_key)}
                    >
                      保留这件，其余关注
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      aria-busy={props.isBatchSaving}
                      disabled={props.isBatchSaving || !item}
                      onClick={() => item && void props.onApplyDuplicateGroupTags(group, "keep-best-junk-rest", entry.item_key)}
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
  );
}
