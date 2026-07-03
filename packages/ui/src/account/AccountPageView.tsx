import type { ReactNode } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { AccountCopy, InterfaceLocale } from "../i18n/types.js";

export function AccountPageView(props: { interfaceLocale?: InterfaceLocale; children?: ReactNode }) {
  return (
    <section className="tool-panel account-dashboard-panel account-page">
      {props.children ?? <DefaultAccountPrototype interfaceLocale={props.interfaceLocale} />}
    </section>
  );
}

function DefaultAccountPrototype(props: { interfaceLocale?: InterfaceLocale }) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").account;
  const characters = ["猎人 2010", "术士 2008", "泰坦 2005"];
  const slots = ["动能武器", "能量武器", "威能武器", "头盔", "臂铠", "胸甲", "腿甲", "职业物品"];

  return (
    <div className="account-prototype-page">
      <section className="account-hero">
        <div>
          <span className="app-chip status-ready">{accountText(copy, "账号已读取")}</span>
          <h2>{accountText(copy, "账号工作台")}</h2>
          <p>{accountText(copy, "角色、装备、背包和账号操作收口在同一个页面。")}</p>
        </div>
        <div className="account-actions">
          <button className="secondary-button" type="button">{accountText(copy, "刷新账号")}</button>
          <button className="secondary-button" type="button">{accountText(copy, "重新授权")}</button>
        </div>
      </section>

      <nav className="account-character-tabs" aria-label={accountText(copy, "角色")}>
        {characters.map((character, index) => (
          <button className={index === 0 ? "active" : ""} key={character} type="button">
            <strong>{accountText(copy, character)}</strong>
            <span>{index === 0 ? accountText(copy, "当前查看") : accountText(copy, "可切换")}</span>
          </button>
        ))}
      </nav>

      <div className="account-workspace-grid">
        <section className="app-panel app-panel-body">
          <div className="app-section-title">
            <div>
              <h2>{accountText(copy, "装备栏")}</h2>
              <span>{accountText(copy, "保持真实应用的装备槽位密度和状态层级")}</span>
            </div>
            <span className="app-chip status-ready">{accountText(copy, "8 槽")}</span>
          </div>
          <div className="account-equipment-grid">
            {slots.map((slot, index) => (
              <article className="account-equipment-card" key={slot}>
                <span className="account-equipment-icon" aria-hidden="true" />
                <div>
                  <strong>{accountText(copy, slot)}</strong>
                  <span>{index < 3 ? accountText(copy, "武器 Perk 摘要") : accountText(copy, "属性和模组摘要")}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="app-panel app-panel-body">
          <div className="app-section-title">
            <div>
              <h2>{accountText(copy, "账号摘要")}</h2>
              <span>{accountText(copy, "只放需要立刻处理的信息")}</span>
            </div>
          </div>
          <div className="home-account-list">
            <div className="home-account-row" data-tone="ready">
              <div>
                <strong>{accountText(copy, "授权状态")}</strong>
                <span>{accountText(copy, "模拟账号已读取，更新时间 14:18。")}</span>
              </div>
              <span className="app-chip status-ready">{accountText(copy, "正常")}</span>
            </div>
            <div className="home-account-row" data-tone="warning">
              <div>
                <strong>{accountText(copy, "仓库容量")}</strong>
                <span>{accountText(copy, "仓库 496 / 600，接近上限时从仓库页继续清理。")}</span>
              </div>
              <span className="app-chip status-warning">{accountText(copy, "496 / 600")}</span>
            </div>
            <div className="home-account-row" data-tone="neutral">
              <div>
                <strong>{accountText(copy, "最近活动")}</strong>
                <span>{accountText(copy, "最近 10 场已读取，突袭 / 地牢复盘可从账号页继续查看。")}</span>
              </div>
              <span className="app-chip">{accountText(copy, "最近 10 场已读取")}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function accountText(copy: AccountCopy, key: string): string {
  return copy.inline[key] ?? key;
}
