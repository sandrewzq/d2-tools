import type { SelectedItemDetail } from "../../hooks/useItemDetail";

export function ItemDetailPerks(props: { selectedItem: SelectedItemDetail }) {
  const selectedItem = props.selectedItem;

  return (
    <>
      {selectedItem.socket_plugs?.length ? (
        <section className="modal-perk-group">
          <h3>实际 Roll</h3>
          <div className="modal-plug-grid">
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
            <section className="modal-perk-group" key={group.socket_index}>
              <h3>插槽 {group.socket_index + 1}</h3>
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
            </section>
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
