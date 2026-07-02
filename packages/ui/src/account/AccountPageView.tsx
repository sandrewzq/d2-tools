import type { ReactNode } from "react";

export function AccountPageView(props: { children?: ReactNode }) {
  return (
    <section className="tool-panel account-dashboard-panel account-page">
      {props.children ?? <DefaultAccountPrototype />}
    </section>
  );
}

function DefaultAccountPrototype() {
  const characters = ["猎人 2010", "术士 2008", "泰坦 2005"];
  const slots = ["动能武器", "能量武器", "威能武器", "头盔", "臂铠", "胸甲", "腿甲", "职业物品"];

  return (
    <div className="account-prototype-page">
      <section className="account-hero">
        <div>
          <span className="app-chip status-ready">账号已读取</span>
          <h2>账号工作台</h2>
          <p>角色、装备、背包和后续账号切换能力收口在同一个页面。</p>
        </div>
        <div className="account-actions">
          <button className="secondary-button" type="button">刷新账号</button>
          <button className="secondary-button" type="button">重新授权</button>
        </div>
      </section>

      <nav className="account-character-tabs" aria-label="角色">
        {characters.map((character, index) => (
          <button className={index === 0 ? "active" : ""} key={character} type="button">
            <strong>{character}</strong>
            <span>{index === 0 ? "当前查看" : "可切换"}</span>
          </button>
        ))}
      </nav>

      <div className="account-workspace-grid">
        <section className="app-panel app-panel-body">
          <div className="app-section-title">
            <div>
              <h2>装备栏</h2>
              <span>保持真实应用的装备槽位密度和状态层级</span>
            </div>
            <span className="app-chip status-ready">8 槽</span>
          </div>
          <div className="account-equipment-grid">
            {slots.map((slot, index) => (
              <article className="account-equipment-card" key={slot}>
                <span className="reward-icon" />
                <div>
                  <strong>{slot}</strong>
                  <span>{index < 3 ? "武器详情接入后展示 perk" : "属性和模组摘要"}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="app-panel app-panel-body">
          <div className="app-section-title">
            <div>
              <h2>账号摘要</h2>
              <span>只放需要立刻处理的信息</span>
            </div>
          </div>
          <div className="home-account-list">
            <div className="home-account-row" data-tone="ready">
              <div>
                <strong>授权状态</strong>
                <span>Bungie 账号已读取，后续支持切换账号。</span>
              </div>
              <span className="app-chip status-ready">正常</span>
            </div>
            <div className="home-account-row" data-tone="warning">
              <div>
                <strong>仓库容量</strong>
                <span>接入真实统计后提示溢出和清理入口。</span>
              </div>
              <span className="app-chip status-warning">待统计</span>
            </div>
            <div className="home-account-row" data-tone="neutral">
              <div>
                <strong>最近活动</strong>
                <span>PGCR 接入后展示近期复盘。</span>
              </div>
              <span className="app-chip">待接入</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
