import type { VaultTags } from "../../../api/client";
import {
  buildVaultDuplicateSummary,
  type buildDuplicateGroupBatchTagPlan
} from "../../domain/vault/vaultCleanup";
import {
  getItemKey,
  type SameNameItemSummary,
  type SelectedItemDetail,
  type SelectedItemSource
} from "../../hooks/useItemDetail";
import { formatAccountItemMeta, formatArmorStatsSummary } from "./itemDetailFormatters";

export type ItemDetailSameNameProps = {
  sameNameItems: SameNameItemSummary[];
  selectedItem: SelectedItemDetail;
  vaultTags: VaultTags;
  onApplySameNameBatchTags: (
    items: SameNameItemSummary[],
    mode: Parameters<typeof buildDuplicateGroupBatchTagPlan>[1]
  ) => void;
  onApplySameNameCurrentKeepTags: (
    items: SameNameItemSummary[],
    currentItemKey: string,
    mode: "keep-current-review-rest" | "keep-current-junk-rest"
  ) => void;
  onOpenBestSameNameItem: (items: SameNameItemSummary[]) => void;
  onOpenItemDetail: (item: SameNameItemSummary, source: SelectedItemSource) => void;
};

export function ItemDetailSameName(props: ItemDetailSameNameProps) {
  if (props.sameNameItems.length <= 1) {
    return null;
  }

  const sameNameDuplicateGroup = buildVaultDuplicateSummary(props.sameNameItems, props.vaultTags).groups[0];
  const sortedSameNameItems = sortSameNameItems(props.sameNameItems, props.selectedItem.item_key);

  return (
    <section className="modal-perk-group">
      <h3>同名对比</h3>
      {sameNameDuplicateGroup ? (
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={() => props.onOpenBestSameNameItem(sortedSameNameItems)}>
            打开最高分
          </button>
          <button type="button" className="secondary-button" onClick={() => props.onApplySameNameCurrentKeepTags(props.sameNameItems, props.selectedItem.item_key, "keep-current-review-rest")}>
            保留当前，其余关注
          </button>
          <button type="button" className="secondary-button" onClick={() => props.onApplySameNameCurrentKeepTags(props.sameNameItems, props.selectedItem.item_key, "keep-current-junk-rest")}>
            保留当前，其余可清理
          </button>
          <button type="button" className="secondary-button" onClick={() => props.onApplySameNameBatchTags(props.sameNameItems, "keep-best-review-rest")}>
            其余标记关注
          </button>
          <button type="button" className="secondary-button" onClick={() => props.onApplySameNameBatchTags(props.sameNameItems, "keep-best-junk-rest")}>
            其余标记可清理
          </button>
          <button type="button" className="secondary-button" onClick={() => props.onApplySameNameBatchTags(props.sameNameItems, "clear-group-tags")}>
            清除本组标记
          </button>
        </div>
      ) : null}
      <div className="same-roll-list">
        {sortedSameNameItems.map((item) => {
          const isCurrent = getItemKey(item) === props.selectedItem.item_key;
          return (
            <button
              type="button"
              className={isCurrent ? "same-roll-row current" : "same-roll-row"}
              key={getItemKey(item)}
              onClick={() => props.onOpenItemDetail(item, {
                source_character_id: item.source_character_id,
                is_vault_item: item.is_vault_item,
                is_postmaster_item: item.is_postmaster_item
              })}
            >
              <strong>{item.name}</strong>
              <span>{formatArmorStatsSummary(item) ?? (item.socket_plugs?.slice(0, 5).map((plug) => plug.name).join(" / ") || "暂无实际 roll")}</span>
              <small>{formatAccountItemMeta(item)}</small>
              <small>{item.locked ? "已锁定" : "未锁定"} / {props.vaultTags.items[getItemKey(item)]?.tag ?? "未标记"}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function sortSameNameItems(items: SameNameItemSummary[], currentItemKey: string): SameNameItemSummary[] {
  return [...items].sort((left, right) => {
    const leftKey = getItemKey(left);
    const rightKey = getItemKey(right);

    if (leftKey === currentItemKey && rightKey !== currentItemKey) return -1;
    if (rightKey === currentItemKey && leftKey !== currentItemKey) return 1;

    return Number(Boolean(right.locked)) - Number(Boolean(left.locked))
      || left.name.localeCompare(right.name, "zh-Hans-CN");
  });
}
