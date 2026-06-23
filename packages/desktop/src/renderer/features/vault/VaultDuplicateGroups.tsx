import type {
  DuplicateAnalysisResult,
  DuplicateItemGroup
} from "@d2-tools/core/analysis/duplicates";
import type {
  AccountItemSummary,
  VaultTags
} from "../../api/client";
import { formatVaultItemMeta } from "./VaultListItem";
import {
  selectDuplicateGroupItems,
  type DuplicateGroupBatchTagMode
} from "../../shared/domain/vault/vaultCleanup";
import { getVaultItemKey } from "./vaultSelection";

export function VaultDuplicateGroups(props: {
  duplicateSummary: DuplicateAnalysisResult;
  items: AccountItemSummary[];
  tags: VaultTags;
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
  if (!props.duplicateSummary.groups.length) {
    return <p className="notice">当前仓库没有发现同名重复装备。</p>;
  }

  return (
    <div className="duplicate-group-list">
      {props.duplicateSummary.groups.map((group) => {
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
                  const topItem = props.items.find((candidate) => getVaultItemKey(candidate) === group.items[0]?.item_key);
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
              const item = props.items.find((candidate) => getVaultItemKey(candidate) === entry.item_key);
              const itemMeta = item ? formatVaultItemMeta(item) : "未找到实例信息";
              const note = item ? props.tags.items[getVaultItemKey(item)]?.note : undefined;
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
