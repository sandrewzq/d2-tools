import type { SelectedItemDetail } from "../../hooks/useItemDetail";
import { getItemSourceStatusTone } from "./itemDetailFormatters";

export function ItemDetailHeader(props: { selectedItem: SelectedItemDetail; onClose: () => void }) {
  const selectedItem = props.selectedItem;
  const sourceTone = getItemSourceStatusTone(selectedItem);

  return (
    <>
      <button className="modal-close" type="button" onClick={props.onClose}>关闭</button>
      <div className="modal-title">
        {selectedItem.icon ? <img alt="" src={selectedItem.icon} /> : null}
        <div>
          <h2>{selectedItem.name}</h2>
          <p>{[selectedItem.tier, selectedItem.item_type].filter(Boolean).join(" / ")}</p>
          {selectedItem.power ? <p>光等 {selectedItem.power}</p> : null}
          {selectedItem.locked !== undefined ? <p>{selectedItem.locked ? "已锁定" : "未锁定"}</p> : null}
        </div>
      </div>
      {selectedItem.is_detail_loading ? (
        <section className="source-status-card source-status-pending item-detail-loading" aria-live="polite">
          <span className="source-status-badge source-status-pending">详情加载</span>
          <strong>正在打开详情...</strong>
          <span>先显示基础信息，来源、perk 和详细说明会继续加载。</span>
        </section>
      ) : null}
      {selectedItem.description ? <p>{selectedItem.description}</p> : null}
      <section className={`source-status-card source-status-${sourceTone} daily-source ${selectedItem.is_detail_loading ? "item-detail-loading" : "source-ready"}`}>
        <span className={`source-status-badge source-status-${sourceTone}`}>
          {selectedItem.is_detail_loading ? "来源读取中" : "来源"}
        </span>
        <strong>{selectedItem.source.label}</strong>
        <span>{selectedItem.source.description}</span>
      </section>
    </>
  );
}
