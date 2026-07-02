import type { ReactNode } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale, SettingsCopy } from "../i18n/types.js";

export function SettingsPageView(props: { interfaceLocale?: InterfaceLocale; children?: ReactNode }) {
  return (
    <section className="app-page settings-app-page">
      {props.children ?? <DefaultSettingsPrototype interfaceLocale={props.interfaceLocale} />}
    </section>
  );
}

function DefaultSettingsPrototype(props: { interfaceLocale?: InterfaceLocale }) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").settings;
  const menu = [
    ["overview", copy.menu.overview.label, settingsText(copy, "状态与更新")],
    ["language", copy.menu.language.label, settingsText(copy, "界面与资料库")],
    ["account", copy.menu.account.label, settingsText(copy, "授权和读取")],
    ["manifest", copy.menu.library.label, settingsText(copy, "版本检查")],
    ["ai", copy.menu.ai.label, settingsText(copy, "模型配置")],
    ["backup", copy.menu.backup.label, settingsText(copy, "导入导出")],
    ["diagnostics", copy.menu.diagnostics.label, settingsText(copy, "日志和任务")]
  ];

  return (
    <div className="app-settings-shell">
      <nav className="app-panel settings-menu" aria-label={copy.menuAriaLabel}>
        {menu.map(([key, label, detail], index) => (
          <button className={index === 0 ? "active" : ""} key={key} type="button">
            {label}
            <span>{detail}</span>
          </button>
        ))}
      </nav>

      <div className="settings-content">
        <section className="settings-detail active">
          <section className="app-panel app-hero-panel">
            <div>
              <h2>{copy.overview.title}</h2>
              <p>{settingsText(copy, "低频配置不再常驻首页，只在异常时通过顶部状态和这里处理。")}</p>
            </div>
            <div className="app-health-grid">
              <div className="app-metric status-ready">
                <strong>Bungie</strong>
                <span>{settingsText(copy, "已配置")}</span>
              </div>
              <div className="app-metric status-ready">
                <strong>{copy.labels.account}</strong>
                <span>{settingsText(copy, "更新时间 14:18")}</span>
              </div>
              <div className="app-metric status-warning">
                <strong>{copy.labels.library}</strong>
                <span>{settingsText(copy, "有新版时提示更新")}</span>
              </div>
            </div>
          </section>

          <div className="app-settings-grid">
            <section className="app-panel app-panel-body">
              <div className="app-section-title">
                <div>
                  <h2>{copy.labels.account}</h2>
                  <span>{settingsText(copy, "后续切换账号的设置入口")}</span>
                </div>
                <span className="app-chip status-ready">{settingsText(copy, "已授权")}</span>
              </div>
              <div className="app-setting-group">
                <div className="app-setting-row status-ready">
                  <div>
                    <strong>{settingsText(copy, "刷新账号")}</strong>
                    <span>{settingsText(copy, "重新读取角色、装备和最近活动。")}</span>
                  </div>
                  <button className="secondary-button" type="button">{settingsText(copy, "刷新账号")}</button>
                </div>
                <div className="app-setting-row">
                  <div>
                    <strong>{settingsText(copy, "重新授权")}</strong>
                    <span>{settingsText(copy, "账号异常或切换账号时使用。")}</span>
                  </div>
                  <button className="secondary-button" type="button">{settingsText(copy, "重新授权")}</button>
                </div>
              </div>
            </section>

            <section className="app-panel app-panel-body">
              <div className="app-section-title">
                <div>
                  <h2>{copy.menu.language.label}</h2>
                  <span>{settingsText(copy, "界面语言和 Bungie 资料库语言")}</span>
                </div>
                <span className="app-chip status-neutral">{settingsText(copy, "中 / EN")}</span>
              </div>
              <div className="app-setting-group">
                <div className="app-setting-row">
                  <div>
                    <strong>{settingsText(copy, "界面语言")}</strong>
                    <span>{settingsText(copy, "菜单、按钮、设置、状态和诊断文案。")}</span>
                  </div>
                  <button className="secondary-button" type="button">{settingsText(copy, "中文")}</button>
                </div>
                <div className="app-setting-row">
                  <div>
                    <strong>{settingsText(copy, "资料库语言")}</strong>
                    <span>{settingsText(copy, "装备名、perk、活动名等 Bungie 数据。")}</span>
                  </div>
                  <button className="secondary-button" type="button">{settingsText(copy, "跟随界面语言")}</button>
                </div>
              </div>
            </section>

            <section className="app-panel app-panel-body">
              <div className="app-section-title">
                <div>
                  <h2>{copy.labels.library}</h2>
                  <span>{settingsText(copy, "版本检查与后台更新")}</span>
                </div>
                <span className="app-chip status-warning">{settingsText(copy, "待检查")}</span>
              </div>
              <div className="app-setting-group">
                <div className="app-setting-row status-warning">
                  <div>
                    <strong>{settingsText(copy, "检查版本")}</strong>
                    <span>{settingsText(copy, "只在有新版或异常时打扰首页。")}</span>
                  </div>
                  <button className="secondary-button" type="button">{settingsText(copy, "检查版本")}</button>
                </div>
                <div className="version-row">
                  <span>{settingsText(copy, "当前版本")}</span>
                  <strong>{settingsText(copy, "2026/06/16")}</strong>
                </div>
              </div>
            </section>

            <section className="app-panel app-panel-body">
              <div className="app-section-title">
                <div>
                  <h2>AI</h2>
                  <span>{settingsText(copy, "模型、协议和可用性")}</span>
                </div>
                <span className="app-chip status-warning">{settingsText(copy, "未配置")}</span>
              </div>
              <p className="app-note">{settingsText(copy, "AI 配置保持在设置页，首页只在异常或不可用时显示提醒。")}</p>
            </section>

            <section className="app-panel app-panel-body">
              <div className="app-section-title">
                <div>
                  <h2>{settingsText(copy, "备份迁移")}</h2>
                  <span>{settingsText(copy, "迁移电脑和清理缓存")}</span>
                </div>
              </div>
              <div className="app-setting-group">
                {["导出备份", "导入备份", "清理缓存"].map((label) => (
                  <div className="app-setting-row" key={label}>
                    <div>
                      <strong>{settingsText(copy, label)}</strong>
                      <span>{settingsText(copy, "使用本地数据目录执行。")}</span>
                    </div>
                    <button className="secondary-button" type="button">{settingsText(copy, label)}</button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}

function settingsText(copy: SettingsCopy, key: string): string {
  return copy.inline[key] ?? key;
}
