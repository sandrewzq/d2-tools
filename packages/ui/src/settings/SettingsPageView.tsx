import type { ReactNode } from "react";
import { useState } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale, SettingsCopy } from "../i18n/types.js";
import {
  ProductWorkspaceContentStack,
  ProductWorkspacePage,
  ProductWorkspaceSideRail,
  ProductWorkspaceSplit
} from "../workspace/ProductWorkspace.js";

export function SettingsPageView(props: { interfaceLocale?: InterfaceLocale; children?: ReactNode }) {
  return (
    <ProductWorkspacePage className="app-page settings-app-page">
      {props.children ?? <DefaultSettingsPrototype interfaceLocale={props.interfaceLocale} />}
    </ProductWorkspacePage>
  );
}

function DefaultSettingsPrototype(props: { interfaceLocale?: InterfaceLocale }) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").settings;
  const [activeSection, setActiveSection] = useState<SettingsPrototypeSectionKey>("overview");
  const menu: Array<{ key: SettingsPrototypeSectionKey; label: string; detail: string }> = [
    { key: "overview", label: copy.menu.overview.label, detail: settingsText(copy, "状态与更新") },
    { key: "language", label: copy.menu.language.label, detail: settingsText(copy, "界面与资料库") },
    { key: "account", label: copy.menu.account.label, detail: settingsText(copy, "授权和读取") },
    { key: "library", label: copy.menu.library.label, detail: settingsText(copy, "版本检查") },
    { key: "ai", label: copy.menu.ai.label, detail: settingsText(copy, "模型配置") },
    { key: "backup", label: copy.menu.backup.label, detail: settingsText(copy, "导入导出") },
    { key: "diagnostics", label: copy.menu.diagnostics.label, detail: settingsText(copy, "日志和任务") }
  ];

  return (
    <ProductWorkspaceSplit className="app-settings-shell">
      <ProductWorkspaceSideRail element="nav" className="settings-menu" ariaLabel={copy.menuAriaLabel}>
        {menu.map((item) => (
          <button
            className={activeSection === item.key ? "active" : ""}
            key={item.key}
            type="button"
            onClick={() => setActiveSection(item.key)}
          >
            {item.label}
            <span>{item.detail}</span>
          </button>
        ))}
      </ProductWorkspaceSideRail>

      <ProductWorkspaceContentStack className="settings-content">
        <section className={activeSection === "overview" ? "settings-detail active" : "settings-detail"}>
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

        <section className={activeSection === "language" ? "settings-detail active" : "settings-detail"}>
          <section className="app-panel app-panel-body app-setting-group">
            <div className="app-section-title">
              <div>
                <h2>{settingsText(copy, "语言")}</h2>
                <span>{settingsText(copy, "界面语言和 Bungie 资料库语言分开设置。")}</span>
              </div>
              <span className="app-chip status-neutral">{settingsText(copy, "中 / EN")}</span>
            </div>
            <div className="app-setting-row">
              <div>
                <strong>{settingsText(copy, "界面语言")}</strong>
                <span>{settingsText(copy, "控制菜单、按钮、设置、状态、诊断和空状态文案。")}</span>
              </div>
              <button className="secondary-button" type="button">{settingsText(copy, "中文")}</button>
            </div>
            <div className="app-setting-row">
              <div>
                <strong>{settingsText(copy, "资料库语言")}</strong>
                <span>{settingsText(copy, "控制装备名、perk、活动名等 Bungie Manifest 数据；变更后在后续资料库读取或更新时生效。")}</span>
              </div>
              <button className="secondary-button" type="button">{settingsText(copy, "跟随界面语言")}</button>
            </div>
          </section>
        </section>

        <section className={activeSection === "account" ? "settings-detail active" : "settings-detail"}>
          <section className="app-panel app-panel-body app-setting-group">
            <div className="app-section-title">
              <div>
                <h2>{settingsText(copy, "账号")}</h2>
                <span>{settingsText(copy, "当前账号、授权状态和后续切换账号入口。")}</span>
              </div>
              <span className="app-chip status-ready">{settingsText(copy, "已读取")}</span>
            </div>
            <div className="app-metric-grid">
              <div className="app-metric status-ready">
                <span>{settingsText(copy, "当前账号")}</span>
                <strong>Prototype Guardian</strong>
                <span>{settingsText(copy, "Bungie 账号已授权")}</span>
              </div>
              <div className="app-metric status-ready">
                <span>{settingsText(copy, "账号读取")}</span>
                <strong>14:18</strong>
                <span>{settingsText(copy, "成功刷新账号资料的时间")}</span>
              </div>
              <div className="app-metric status-neutral">
                <span>{settingsText(copy, "更新规则")}</span>
                <strong>{settingsText(copy, "启动自动读取一次")}</strong>
                <span>{settingsText(copy, "手动刷新、重新授权和切换账号不受限制")}</span>
              </div>
            </div>
            <div className="button-row">
              <button className="secondary-button" type="button">{settingsText(copy, "刷新账号")}</button>
              <button className="secondary-button" type="button">{settingsText(copy, "重新授权")}</button>
            </div>
          </section>
        </section>

        <section className={activeSection === "library" ? "settings-detail active" : "settings-detail"}>
          <section className="app-panel app-panel-body app-setting-group">
            <div className="app-section-title">
              <div>
                <h2>{settingsText(copy, "资料库")}</h2>
                <span>{settingsText(copy, "装备、perk、活动和商人数据。")}</span>
              </div>
              <span className="app-chip status-ready">{settingsText(copy, "已是最新")}</span>
            </div>
            <div className="app-metric-grid">
              <div className="app-metric status-ready">
                <span>{settingsText(copy, "资料库日期")}</span>
                <strong>2026/06/16</strong>
                <span>{settingsText(copy, "从完整版本号解析，顶部状态栏显示")}</span>
              </div>
              <div className="app-metric status-ready">
                <span>{settingsText(copy, "资料完整性")}</span>
                <strong>{settingsText(copy, "完整")}</strong>
                <span>{settingsText(copy, "用于搜索和详情判断")}</span>
              </div>
              <div className="app-metric status-neutral">
                <span>{settingsText(copy, "自动检查")}</span>
                <strong>{settingsText(copy, "每天自动检查一次")}</strong>
                <span>{settingsText(copy, "手动检查、立即更新和修复不受限制")}</span>
              </div>
            </div>
            <div className="button-row">
              <button className="secondary-button" type="button">{settingsText(copy, "检查软件版本")}</button>
              <button className="secondary-button" type="button">{settingsText(copy, "立即更新")}</button>
              <button className="secondary-button" type="button">{settingsText(copy, "修复资料库")}</button>
            </div>
          </section>
        </section>

        <section className={activeSection === "ai" ? "settings-detail active" : "settings-detail"}>
          <section className="app-panel app-panel-body app-setting-group">
            <div className="app-section-title">
              <div>
                <h2>{settingsText(copy, "AI 助手")}</h2>
                <span>{settingsText(copy, "可选能力，不阻断本地功能")}</span>
              </div>
              <span className="app-chip status-warning">{settingsText(copy, "未配置")}</span>
            </div>
            <p className="app-note">{settingsText(copy, "AI 配置保持在设置页，首页只在异常或不可用时显示提醒。")}</p>
          </section>
        </section>

        <section className={activeSection === "backup" ? "settings-detail active" : "settings-detail"}>
          <section className="app-panel app-panel-body app-setting-group">
            <div className="app-section-title">
              <div>
                <h2>{settingsText(copy, "备份迁移")}</h2>
                <span>{settingsText(copy, "迁移电脑和清理缓存")}</span>
              </div>
            </div>
            {["导出备份", "导入备份", "清理缓存"].map((label) => (
              <div className="app-setting-row" key={label}>
                <div>
                  <strong>{settingsText(copy, label)}</strong>
                  <span>{settingsText(copy, "使用本地数据目录执行。")}</span>
                </div>
                <button className="secondary-button" type="button">{settingsText(copy, label)}</button>
              </div>
            ))}
          </section>
        </section>

        <section className={activeSection === "diagnostics" ? "settings-detail active" : "settings-detail"}>
          <section className="app-panel app-panel-body app-setting-group">
            <div className="app-section-title">
              <div>
                <h2>{settingsText(copy, "诊断与操作日志")}</h2>
                <span>{settingsText(copy, "默认展示最近关键事件")}</span>
              </div>
              <button className="secondary-button" type="button">{settingsText(copy, "运行诊断")}</button>
            </div>
            <div className="app-setting-row">
              <div>
                <strong>{settingsText(copy, "诊断摘要")}</strong>
                <span>{settingsText(copy, "检查账号、资料库、后台任务和本地数据目录；异常信息可复制为脱敏诊断。")}</span>
              </div>
              <button className="secondary-button" type="button">{settingsText(copy, "复制脱敏诊断")}</button>
            </div>
            <p className="status-message status-neutral">{settingsText(copy, "还没有写操作记录。")}</p>
          </section>
        </section>
      </ProductWorkspaceContentStack>
    </ProductWorkspaceSplit>
  );
}

type SettingsPrototypeSectionKey = "overview" | "language" | "account" | "library" | "ai" | "backup" | "diagnostics";

function settingsText(copy: SettingsCopy, key: string): string {
  return copy.inline[key] ?? key;
}
