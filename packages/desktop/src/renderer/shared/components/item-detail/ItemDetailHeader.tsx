import type { ItemDetailCopy } from "@d2-tools/ui";
import { itemDetailText } from "@d2-tools/ui";
import type { SelectedItemDetail } from "../../hooks/useItemDetail";

export function ItemDetailHeader(props: {
  copy: ItemDetailCopy;
  selectedItem: SelectedItemDetail;
  onClose: () => void;
  showClose?: boolean;
}) {
  const selectedItem = props.selectedItem;
  const copy = props.copy;
  const itemMeta = [
    selectedItem.equipment_bucket_name ?? selectedItem.bucket_name,
    selectedItem.item_type,
    selectedItem.tier
  ].filter(Boolean).join(" · ");

  return (
    <>
      {props.showClose === false ? null : <button className="modal-close" type="button" onClick={props.onClose}>{itemDetailText(copy, "关闭")}</button>}
      <div className="item-detail-game-header">
        <div className="item-detail-game-icon">
          {selectedItem.icon ? <img alt="" src={selectedItem.icon} /> : <span aria-hidden="true">◆</span>}
        </div>
        <div>
          <h2>{selectedItem.name}</h2>
          <p>{itemMeta || itemDetailText(copy, "装备详情")}</p>
          {selectedItem.locked !== undefined
            ? <small>{selectedItem.locked ? itemDetailText(copy, "已锁定") : itemDetailText(copy, "未锁定")}</small>
            : null}
        </div>
        {selectedItem.power ? <strong className="item-detail-power">{selectedItem.power}</strong> : null}
      </div>
    </>
  );
}
