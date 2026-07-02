import type { ReactNode } from "react";

export function SettingsPageView(props: { children?: ReactNode }) {
  return (
    <section className="app-page settings-app-page">
      {props.children ?? <DefaultSettingsPrototype />}
    </section>
  );
}

function DefaultSettingsPrototype() {
  const menu = [
    ["overview", "总览", "状态与更新"],
    ["language", "语言", "界面与资料库"],
    ["account", "账号", "授权和读取"],
    ["manifest", "资料库", "版本检查"],
    ["ai", "AI", "模型配置"],
    ["backup", "备份迁移", "导入导出"],
    ["diagnostics", "诊断", "日志和任务"]
  ];

  return (
    <div className="app-settings-shell">
      <nav className="app-panel settings-menu" aria-label="设置菜单">
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
              <h2>设置总览</h2>
              <p>低频配置不再常驻首页，只在异常时通过顶部状态和这里处理。</p>
            </div>
            <div className="app-health-grid">
              <div className="app-metric status-ready">
                <strong>Bungie</strong>
                <span>已配置</span>
              </div>
              <div className="app-metric status-ready">
                <strong>账号</strong>
                <span>更新时间 14:18</span>
              </div>
              <div className="app-metric status-warning">
                <strong>资料库</strong>
                <span>有新版时提示更新</span>
              </div>
            </div>
          </section>

          <div className="app-settings-grid">
            <section className="app-panel app-panel-body">
              <div className="app-section-title">
                <div>
                  <h2>账号</h2>
                  <span>后续切换账号的设置入口</span>
                </div>
                <span className="app-chip status-ready">已授权</span>
              </div>
              <div className="app-setting-group">
                <div className="app-setting-row status-ready">
                  <div>
                    <strong>刷新账号</strong>
                    <span>重新读取角色、装备和最近活动。</span>
                  </div>
                  <button className="secondary-button" type="button">刷新账号</button>
                </div>
                <div className="app-setting-row">
                  <div>
                    <strong>重新授权</strong>
                    <span>账号异常或切换账号时使用。</span>
                  </div>
                  <button className="secondary-button" type="button">重新授权</button>
                </div>
              </div>
            </section>

            <section className="app-panel app-panel-body">
              <div className="app-section-title">
                <div>
                  <h2>语言</h2>
                  <span>界面语言和 Bungie 资料库语言</span>
                </div>
                <span className="app-chip status-neutral">中 / EN</span>
              </div>
              <div className="app-setting-group">
                <div className="app-setting-row">
                  <div>
                    <strong>界面语言</strong>
                    <span>菜单、按钮、设置、状态和诊断文案。</span>
                  </div>
                  <button className="secondary-button" type="button">中文</button>
                </div>
                <div className="app-setting-row">
                  <div>
                    <strong>资料库语言</strong>
                    <span>装备名、perk、活动名等 Bungie 数据。</span>
                  </div>
                  <button className="secondary-button" type="button">跟随界面语言</button>
                </div>
              </div>
            </section>

            <section className="app-panel app-panel-body">
              <div className="app-section-title">
                <div>
                  <h2>资料库</h2>
                  <span>版本检查与后台更新</span>
                </div>
                <span className="app-chip status-warning">待检查</span>
              </div>
              <div className="app-setting-group">
                <div className="app-setting-row status-warning">
                  <div>
                    <strong>检查版本</strong>
                    <span>只在有新版或异常时打扰首页。</span>
                  </div>
                  <button className="secondary-button" type="button">检查版本</button>
                </div>
                <div className="version-row">
                  <span>当前版本</span>
                  <strong>2026/06/16</strong>
                </div>
              </div>
            </section>

            <section className="app-panel app-panel-body">
              <div className="app-section-title">
                <div>
                  <h2>AI</h2>
                  <span>模型、协议和可用性</span>
                </div>
                <span className="app-chip status-warning">未配置</span>
              </div>
              <p className="app-note">AI 配置保持在设置页，首页只在异常或不可用时显示提醒。</p>
            </section>

            <section className="app-panel app-panel-body">
              <div className="app-section-title">
                <div>
                  <h2>备份迁移</h2>
                  <span>迁移电脑和清理缓存</span>
                </div>
              </div>
              <div className="app-setting-group">
                {["导出备份", "导入备份", "清理缓存"].map((label) => (
                  <div className="app-setting-row" key={label}>
                    <div>
                      <strong>{label}</strong>
                      <span>使用本地数据目录执行。</span>
                    </div>
                    <button className="secondary-button" type="button">{label}</button>
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
