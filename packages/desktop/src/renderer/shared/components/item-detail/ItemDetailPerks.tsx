import type { SelectedItemDetail } from "../../hooks/useItemDetail";

export function ItemDetailPerks(props: { selectedItem: SelectedItemDetail }) {
  const selectedItem = props.selectedItem;

  return (
    <>
      {selectedItem.socket_plugs?.length ? (
        <section className="modal-perk-group item-detail-roll-section">
          <h3>实际 Roll</h3>
          <div className="item-detail-roll-grid">
            {selectedItem.socket_plugs.map((plug) => (
              <div className="modal-plug" key={plug.hash}>
                {plug.icon ? <img alt="" src={plug.icon} /> : null}
                <div>
                  <strong>{plug.name}</strong>
                  {plug.description ? <p>{plug.description}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {selectedItem.perks?.length ? (
        <div className="modal-perks">
          {selectedItem.perks.map((group) => (
            <details className="item-detail-socket-group" key={group.socket_index}>
              <summary className="item-detail-socket-summary">
                <span>插槽 {group.socket_index + 1}</span>
                <strong>{group.plugs.length} 个候选</strong>
              </summary>
              <div className="modal-plug-grid">
                {group.plugs.map((plug) => (
                  <div className="modal-plug" key={plug.hash}>
                    {plug.icon ? <img alt="" src={plug.icon} /> : null}
                    <div>
                      <strong>{plug.name}</strong>
                      {plug.description ? <p>{plug.description}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      ) : selectedItem.is_detail_loading ? (
        <section className="source-status-card source-status-pending item-detail-inline-status" aria-live="polite">
          <span className="source-status-badge source-status-pending">Perk</span>
          <p>正在读取 perk...</p>
        </section>
      ) : (
        <section className="source-status-card source-status-neutral item-detail-inline-status">
          <span className="source-status-badge source-status-neutral">Perk</span>
          <p>暂无可展示 perk。</p>
        </section>
      )}
    </>
  );
}
