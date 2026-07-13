import type { SelectedItemDetail } from "../../hooks/useItemDetail";

export function ItemDetailHeader(props: { selectedItem: SelectedItemDetail; onClose: () => void; showClose?: boolean }) {
  const selectedItem = props.selectedItem;
  const itemMeta = [
    selectedItem.bucket_name,
    selectedItem.item_type,
    selectedItem.tier
  ].filter(Boolean).join(" · ");

  return (
    <>
      {props.showClose === false ? null : <button className="modal-close" type="button" onClick={props.onClose}>关闭</button>}
      <div className="item-detail-game-header">
        <div className="item-detail-game-icon">
          {selectedItem.icon ? <img alt="" src={selectedItem.icon} /> : <span aria-hidden="true">◆</span>}
        </div>
        <div>
          <h2>{selectedItem.name}</h2>
          <p>{itemMeta || "装备详情"}</p>
          {selectedItem.locked !== undefined ? <small>{selectedItem.locked ? "已锁定" : "未锁定"}</small> : null}
        </div>
        {selectedItem.power ? <strong className="item-detail-power">{selectedItem.power}</strong> : null}
      </div>
    </>
  );
}
