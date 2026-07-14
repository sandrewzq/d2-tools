import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale, SettingsCopy } from "../i18n/types.js";
import {
  ProductWorkspaceContentStack,
  ProductWorkspaceSideRail,
  ProductWorkspaceSplit
} from "../workspace/ProductWorkspace.js";

type AccountSummary = any;
type ActionLogEntry = any;
type BackgroundTaskSnapshot = any;
type ManifestStatus = any;
type AppUpdateSnapshot = any;

export type SettingsActionLogResultFilter = "all" | "success" | "failed";
export type SettingsActionLogTypeFilter =
  | "all"
  | "set-lock"
  | "equip"
  | "transfer"
  | "postmaster-pull"
  | "loadout-equip"
  | "loadout-snapshot";

export type SettingsLanguagePreferences = {
  interfaceLocale: "zh-CN" | "en-US";
  bungieLocale: "zh-chs" | "en";
  followInterfaceLocaleForBungie: boolean;
};

export type SettingsBungieConfig = {
  bungie: {
    api_key: string;
    client_id: string;
    client_secret: string;
    redirect_uri: string;
  };
};

export type SettingsBungieConfigInput = SettingsBungieConfig["bungie"];

export type SettingsPageContentViewProps = {
  interfaceLocale?: InterfaceLocale;
  initialSection?: SettingsSectionKey;
  message: string;
  error: string;
  diagnosticDataDir: string;
  writeActionsEnabled: boolean;
  appUpdateSnapshot: AppUpdateSnapshot | null;
  manifestStatus: ManifestStatus | null;
  manifestStatusError: string;
  isLoadingManifestStatus: boolean;
  isInitializingManifest: boolean;
  accountSummary: AccountSummary | null;
  accountError: string;
  accountWarning: string;
  isLoadingAccount: boolean;
  lastAccountLoadedAt: Date | null;
  isAiConfigured: boolean;
  onRefreshAccount: () => void;
  onReauthorizeAccount: () => void;
  backgroundTasks: BackgroundTaskSnapshot[];
  actionLog: ActionLogEntry[];
  actionLogResultFilter: SettingsActionLogResultFilter;
  actionLogTypeFilter: SettingsActionLogTypeFilter;
  aiSettingsPanel: ReactNode;
  onOpenDataDir: () => void;
  onWriteActionsEnabledChange: (enabled: boolean) => void;
  onCheckAppUpdate: () => void;
  onDownloadAppUpdate: () => void;
  onQuitAndInstallAppUpdate: () => void;
  onOpenAppUpdateDownloadPage: () => void;
  onCopyAppUpdateDiagnostic: () => void;
  onRefreshManifestStatus: () => void;
  onInitializeManifest: () => void;
  onRepairManifest: () => void;
  onExportConfig: () => void;
  onImportConfig: () => void;
  onClearCache: () => void;
  onCopyDataBackupGuide: () => void;
  onCopyDiagnosticsExport: () => void;
  onRefreshDiagnostics: () => void;
  onRefreshActionLog: () => void;
  onActionLogResultFilterChange: (filter: SettingsActionLogResultFilter) => void;
  onActionLogTypeFilterChange: (filter: SettingsActionLogTypeFilter) => void;
  onCopyActionDiagnostic: (entry: ActionLogEntry) => void;
  languagePreferences: SettingsLanguagePreferences;
  onLanguagePreferencesChange: (preferences: SettingsLanguagePreferences) => void;
  onLoadBungieConfig: () => Promise<SettingsBungieConfig>;
  onSaveBungieConfig: (bungie: SettingsBungieConfigInput) => Promise<void>;
};

type SettingsSectionKey = "overview" | "language" | "account" | "library" | "bungie" | "ai" | "backup" | "diagnostics";

function getSettingsMenu(copy: SettingsCopy): Array<{ key: SettingsSectionKey; label: string; hint: string }> {
  return [
    { key: "overview", ...copy.menu.overview },
    { key: "language", ...copy.menu.language },
    { key: "account", ...copy.menu.account },
    { key: "library", ...copy.menu.library },
    { key: "bungie", ...copy.menu.bungie },
    { key: "ai", ...copy.menu.ai },
    { key: "backup", ...copy.menu.backup },
    { key: "diagnostics", ...copy.menu.diagnostics }
  ];
}

function settingsText(copy: SettingsCopy, key: string): string {
  return copy.inline[key] ?? key;
}

export function SettingsPageContentView(props: SettingsPageContentViewProps) {
  const copy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").settings;
  const interfaceLocale = props.interfaceLocale ?? "zh-CN";
  const settingsMenu = getSettingsMenu(copy);
  const initialSection = props.initialSection ?? "overview";
  const [activeSection, setActiveSection] = useState<SettingsSectionKey>(settingsMenu.some((item) => item.key === initialSection) ? initialSection : "overview");
  const [bungieApiKey, setBungieApiKey] = useState("");
  const [bungieClientId, setBungieClientId] = useState("");
  const [bungieClientSecret, setBungieClientSecret] = useState("");
  const [bungieRedirectUri, setBungieRedirectUri] = useState("https://127.0.0.1:28780/oauth/callback");
  const [bungieMessage, setBungieMessage] = useState("");
  const [bungieError, setBungieError] = useState("");
  const [isLoadingBungieConfig, setIsLoadingBungieConfig] = useState(true);
  const [isSavingBungieConfig, setIsSavingBungieConfig] = useState(false);
  const visibleActionLog = filteredActionLog(
    props.actionLog,
    props.actionLogResultFilter,
    props.actionLogTypeFilter
  ).slice(0, 8);
  const updateUi = getAppUpdateUi(props.appUpdateSnapshot, copy);
  const updateProgress = formatAppUpdateProgress(props.appUpdateSnapshot);
  const libraryUi = getLibraryUi(props.manifestStatus, props.manifestStatusError, props.isLoadingManifestStatus, copy);
  const accountUi = getAccountUi(props.accountSummary, props.accountError, props.accountWarning, props.isLoadingAccount, copy);
  const libraryVersion = formatLibraryVersion(props.manifestStatus?.version);
  const bungieUi = getBungieUi({
    isLoading: isLoadingBungieConfig,
    apiKey: bungieApiKey,
    clientId: bungieClientId,
    clientSecret: bungieClientSecret,
    redirectUri: bungieRedirectUri
  }, copy);
  const aiUi = getAiUi(props.isAiConfigured, copy);
  const backgroundTaskUi = getBackgroundTaskUi(props.backgroundTasks, copy);

  useEffect(() => {
    let cancelled = false;
    setBungieError("");

    async function loadBungieConfig() {
      try {
        const config = await props.onLoadBungieConfig();
        if (cancelled) return;
        setBungieApiKey(config.bungie.api_key);
        setBungieClientId(config.bungie.client_id);
        setBungieClientSecret(config.bungie.client_secret);
        setBungieRedirectUri(config.bungie.redirect_uri);
      } catch (error) {
        if (cancelled) return;
        setBungieError(error instanceof Error ? error.message : settingsText(copy, "Bungie 配置读取失败"));
      } finally {
        if (!cancelled) setIsLoadingBungieConfig(false);
      }
    }

    void loadBungieConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveBungieConfig() {
    setIsSavingBungieConfig(true);
    setBungieMessage("");
    setBungieError("");

    try {
      await props.onSaveBungieConfig({
        api_key: bungieApiKey.trim(),
        client_id: bungieClientId.trim(),
        client_secret: bungieClientSecret.trim(),
        redirect_uri: bungieRedirectUri.trim() || "https://127.0.0.1:28780/oauth/callback"
      });
      setBungieMessage(settingsText(copy, "Bungie 配置已保存。"));
    } catch (error) {
      setBungieError(error instanceof Error ? error.message : settingsText(copy, "Bungie 配置保存失败"));
    } finally {
      setIsSavingBungieConfig(false);
    }
  }

  return (
    <>
      {props.message ? <p className="status-message status-ready">{props.message}</p> : null}
      {props.error ? <p className="status-message status-error">{props.error}</p> : null}

      <ProductWorkspaceSplit className="app-settings-shell">
        <ProductWorkspaceSideRail className="settings-menu" ariaLabel={copy.menuAriaLabel}>
          {settingsMenu.map((item) => (
            <button
              className={activeSection === item.key ? "active" : ""}
              key={item.key}
              type="button"
              onClick={() => setActiveSection(item.key)}
            >
              {item.label}
              <span>{item.hint}</span>
            </button>
          ))}
        </ProductWorkspaceSideRail>

        <ProductWorkspaceContentStack className="settings-content">
          <section className={activeSection === "overview" ? "settings-detail active" : "settings-detail"} id="settings-overview">
            <section className="panel-subsection app-setting-group">
              <div className="app-section-title">
                <div>
                  <h2>{copy.overview.title}</h2>
                  <span>{copy.overview.subtitle}</span>
                </div>
                <span className="app-chip status-neutral">{copy.overview.badge}</span>
              </div>
              <div className="app-settings-grid">
                <div className={`app-metric status-${accountUi.tone}`}>
                  <span>{copy.labels.account}</span>
                  <strong>{accountUi.statusLabel}</strong>
                  <span>{accountUi.summary}</span>
                </div>
                <div className={`app-metric status-${libraryUi.tone}`}>
                  <span>{copy.labels.library}</span>
                  <strong>{libraryVersion ?? libraryUi.statusLabel}</strong>
                  <span>{libraryUi.summary}</span>
                </div>
                <div className={`app-metric status-${bungieUi.tone}`}>
                  <span>{copy.labels.bungie}</span>
                  <strong>{bungieUi.statusLabel}</strong>
                  <span>{bungieUi.summary}</span>
                </div>
                <div className={`app-metric status-${aiUi.tone}`}>
                  <span>{copy.labels.ai}</span>
                  <strong>{aiUi.statusLabel}</strong>
                  <span>{aiUi.summary}</span>
                </div>
                <div className={`app-metric status-${updateUi.tone}`}>
                  <span>{copy.labels.appVersion}</span>
                  <strong>{props.appUpdateSnapshot?.current_version ?? settingsText(copy, "未读取")}</strong>
                  <span>{updateUi.statusLabel}</span>
                </div>
                <div className={`app-metric status-${backgroundTaskUi.tone}`}>
                  <span>{copy.labels.backgroundTasks}</span>
                  <strong>{backgroundTaskUi.statusLabel}</strong>
                  <span>{backgroundTaskUi.summary}</span>
                </div>
              </div>
            </section>

            <section className={`panel-subsection app-setting-group update-${updateUi.tone}`} id="settings-updates">
              <div className="app-section-title">
                <div>
                  <h2>{settingsText(copy, "应用更新")}</h2>
                  <span>{updateUi.summary}</span>
                </div>
                <span className={`app-chip status-${updateUi.tone}`}>{updateUi.statusLabel}</span>
              </div>
              <div className="app-metric-grid">
                <div className="app-metric status-neutral">
                  <span>{settingsText(copy, "应用版本")}</span>
                  <strong>{props.appUpdateSnapshot?.current_version ?? settingsText(copy, "未读取")}</strong>
                  <span>{settingsText(copy, "当前安装版本")}</span>
                </div>
                <div className="app-metric status-neutral">
                  <span>{settingsText(copy, "更新来源")}</span>
                  <strong>{props.appUpdateSnapshot?.update_source_label ?? "GitHub Release"}</strong>
                  <span>{settingsText(copy, "GitHub 连接失败时可打开下载页手动处理")}</span>
                </div>
                <div className="app-metric status-neutral">
                  <span>{settingsText(copy, "上次检查")}</span>
                  <strong>{formatUpdateCheckedAt(props.appUpdateSnapshot?.last_checked_at, interfaceLocale, copy)}</strong>
                  <span>{settingsText(copy, "应用更新检查时间")}</span>
                </div>
              </div>
              {updateProgress > 0 ? (
                <div className="update-progress-bar" aria-label={settingsText(copy, "更新下载进度")}>
                  <span style={{ width: `${updateProgress}%` }} />
                </div>
              ) : null}
              <div className="button-row settings-update-actions">
                <button type="button" className="secondary-button" disabled={props.appUpdateSnapshot?.status === "checking"} onClick={props.onCheckAppUpdate}>{settingsText(copy, "检查软件版本")}</button>
                <button type="button" className="secondary-button" disabled={props.appUpdateSnapshot?.status !== "available"} onClick={props.onDownloadAppUpdate}>{settingsText(copy, "下载更新")}</button>
                <button type="button" disabled={props.appUpdateSnapshot?.status !== "downloaded"} onClick={props.onQuitAndInstallAppUpdate}>{settingsText(copy, "重启并安装")}</button>
                <button type="button" className="secondary-button" onClick={props.onOpenAppUpdateDownloadPage}>{settingsText(copy, "打开下载页")}</button>
                <button type="button" className="secondary-button" onClick={props.onCopyAppUpdateDiagnostic}>{settingsText(copy, "复制更新诊断")}</button>
              </div>
            </section>

            <section className="panel-subsection app-setting-group">
              <div className="app-section-title">
                <h2>{copy.overview.commonActionsTitle}</h2>
                <span>{copy.overview.commonActionsSubtitle}</span>
              </div>
              <div className="app-setting-row">
                <div>
                  <strong>{settingsText(copy, "管理账号")}</strong>
                  <span>{settingsText(copy, "查看当前账号、刷新读取状态，并为后续切换账号预留入口。")}</span>
                </div>
                <button type="button" className="secondary-button" onClick={props.onRefreshAccount}>{settingsText(copy, "刷新账号")}</button>
              </div>
              <div className="app-setting-row">
                <div>
                  <strong>{settingsText(copy, "检查资料库更新")}</strong>
                  <span>{settingsText(copy, "手动检查不受“每天自动检查一次”限制。")}</span>
                </div>
                <button type="button" className="secondary-button" disabled={props.isLoadingManifestStatus} onClick={props.onRefreshManifestStatus}>{settingsText(copy, "检查资料库版本")}</button>
              </div>
              <div className="app-setting-row">
                <div>
                  <strong>{settingsText(copy, "运行诊断")}</strong>
                  <span>{settingsText(copy, "检查账号、资料库、后台任务和本地数据目录。")}</span>
                </div>
                <button type="button" className="secondary-button" onClick={() => setActiveSection("diagnostics")}>{settingsText(copy, "查看诊断")}</button>
              </div>
            </section>
          </section>

          <section className={activeSection === "language" ? "settings-detail active" : "settings-detail"} id="settings-language">
            <section className="panel-subsection app-setting-group">
              <div className="app-section-title">
                <div>
                  <h2>{settingsText(copy, "语言")}</h2>
                  <span>{settingsText(copy, "界面语言和 Bungie 资料库语言分开设置。")}</span>
                </div>
                <span className="app-chip status-neutral">{props.languagePreferences.interfaceLocale === "zh-CN" ? settingsText(copy, "中文") : "English"}</span>
              </div>
              <div className="app-setting-row">
                <div>
                  <strong>{settingsText(copy, "界面语言")}</strong>
                  <span>{settingsText(copy, "控制菜单、按钮、设置、状态、诊断和空状态文案。")}</span>
                </div>
                <select
                  value={props.languagePreferences.interfaceLocale}
                  onChange={(event) => {
                    const interfaceLocale = event.target.value as SettingsLanguagePreferences["interfaceLocale"];
                    props.onLanguagePreferencesChange({
                      ...props.languagePreferences,
                      interfaceLocale,
                      bungieLocale: props.languagePreferences.followInterfaceLocaleForBungie
                        ? interfaceLocaleToBungieLocale(interfaceLocale)
                        : props.languagePreferences.bungieLocale
                    });
                  }}
                >
                  <option value="zh-CN">{settingsText(copy, "中文")}</option>
                  <option value="en-US">English</option>
                </select>
              </div>
              <div className="app-setting-row">
                <div>
                  <strong>{settingsText(copy, "资料库语言")}</strong>
                  <span>{settingsText(copy, "控制装备名、perk、活动名等 Bungie Manifest 数据；变更后在后续资料库读取或更新时生效。")}</span>
                </div>
                <select
                  disabled={props.languagePreferences.followInterfaceLocaleForBungie}
                  value={props.languagePreferences.bungieLocale}
                  onChange={(event) => props.onLanguagePreferencesChange({
                    ...props.languagePreferences,
                    bungieLocale: event.target.value as SettingsLanguagePreferences["bungieLocale"]
                  })}
                >
                  <option value="zh-chs">{settingsText(copy, "简体中文")}</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="app-setting-row">
                <div>
                  <strong>{settingsText(copy, "跟随界面语言")}</strong>
                  <span>{settingsText(copy, "开启后，切换界面语言会同步切换资料库语言。")}</span>
                </div>
                <label className="switch-row">
                  <input
                    checked={props.languagePreferences.followInterfaceLocaleForBungie}
                    type="checkbox"
                    onChange={(event) => {
                      const follow = event.target.checked;
                      props.onLanguagePreferencesChange({
                        ...props.languagePreferences,
                        followInterfaceLocaleForBungie: follow,
                        bungieLocale: follow
                          ? interfaceLocaleToBungieLocale(props.languagePreferences.interfaceLocale)
                          : props.languagePreferences.bungieLocale
                      });
                    }}
                  />
                  {settingsText(copy, "跟随")}
                </label>
              </div>
            </section>
          </section>

          <section className={activeSection === "account" ? "settings-detail active" : "settings-detail"} id="settings-account">
            <section className="panel-subsection app-setting-group">
              <div className="app-section-title">
                <div>
                  <h2>{settingsText(copy, "账号")}</h2>
                  <span>{settingsText(copy, "当前账号、授权状态和后续切换账号入口。")}</span>
                </div>
                <span className={`app-chip status-${accountUi.tone}`}>{accountUi.statusLabel}</span>
              </div>
              <div className="app-metric-grid">
                <div className={`app-metric status-${accountUi.tone}`}>
                  <span>{settingsText(copy, "当前账号")}</span>
                  <strong>{props.accountSummary?.account_name ?? settingsText(copy, "未登录")}</strong>
                  <span>{props.accountSummary ? settingsText(copy, "Bungie 账号已授权") : settingsText(copy, "登录后可读取账号")}</span>
                </div>
                <div className={`app-metric status-${accountUi.tone}`}>
                  <span>{settingsText(copy, "账号读取")}</span>
                  <strong>{accountUi.statusLabel}</strong>
                  <span>{accountUi.summary}</span>
                </div>
                <div className="app-metric status-neutral">
                  <span>{settingsText(copy, "上次刷新")}</span>
                  <strong>{formatAccountLoadedAt(props.lastAccountLoadedAt, props.accountSummary, interfaceLocale, copy)}</strong>
                  <span>{settingsText(copy, "成功刷新账号资料的时间")}</span>
                </div>
                <div className="app-metric status-neutral">
                  <span>{settingsText(copy, "刷新规则")}</span>
                  <strong>{settingsText(copy, "启动自动读取一次")}</strong>
                  <span>{settingsText(copy, "手动刷新、重新授权和切换账号不受限制")}</span>
                </div>
              </div>
              <div className="library-version-table">
                <div className="version-row"><span>{settingsText(copy, "当前账号")}</span><strong>{props.accountSummary?.account_name ?? settingsText(copy, "未登录")}</strong></div>
                <div className="version-row"><span>{settingsText(copy, "当前版本")}</span><strong>{formatAccountSnapshot(props.accountSummary, copy)}</strong></div>
                <div className="version-row"><span>{settingsText(copy, "最新版本")}</span><strong>{props.accountSummary ? settingsText(copy, "已是当前读取结果") : settingsText(copy, "等待读取账号")}</strong></div>
                <div className="version-row"><span>{settingsText(copy, "上次检查")}</span><strong>{formatAccountLoadedAt(props.lastAccountLoadedAt, props.accountSummary, interfaceLocale, copy)}</strong></div>
                <div className="version-row"><span>{settingsText(copy, "打开应用时")}</span><strong>{settingsText(copy, "自动读取一次当前账号，避免每次进页面都重复加载")}</strong></div>
                <div className="version-row"><span>{settingsText(copy, "需要重新读取时")}</span><strong>{settingsText(copy, "首次登录、重新授权、切换账号或本地记录不可用时会重新读取；失败时保留上次成功结果")}</strong></div>
                <div className="version-row"><span>{settingsText(copy, "手动操作")}</span><strong>{settingsText(copy, "刷新账号、重新授权、管理账号和未来切换账号始终立即执行")}</strong></div>
                <div className="version-row"><span>{settingsText(copy, "默认账号")}</span><strong>{settingsText(copy, "当前账号；切换账号功能上线后可修改")}</strong></div>
              </div>
              <div className={`app-setting-row status-${props.writeActionsEnabled ? "ready" : "neutral"}`}>
                <div><strong>{settingsText(copy, "装备写操作")}</strong><span>{props.writeActionsEnabled ? settingsText(copy, "已开启，允许锁定、装备和转移。") : settingsText(copy, "已关闭，写操作会被阻断。")}</span></div>
                <label className="switch-row">
                  <input checked={props.writeActionsEnabled} type="checkbox" onChange={(event) => props.onWriteActionsEnabledChange(event.target.checked)} />
                  {settingsText(copy, "允许")}
                </label>
              </div>
              <div className="button-row">
                <button type="button" onClick={props.onRefreshAccount} disabled={props.isLoadingAccount}>{settingsText(copy, "刷新账号")}</button>
                <button type="button" className="secondary-button" onClick={props.onReauthorizeAccount}>{settingsText(copy, "重新授权")}</button>
              </div>
            </section>
          </section>

          <section className={activeSection === "library" ? "settings-detail active" : "settings-detail"} id="settings-library">
            <section className={`panel-subsection app-setting-group app-settings-wide manifest-${libraryUi.tone} library-${libraryUi.tone}`} id="settings-manifest">
              <div className="app-section-title">
                <div>
                  <h2>{settingsText(copy, "资料库")}</h2>
                  <span>{settingsText(copy, "装备、perk、活动和商人数据。")}</span>
                </div>
                <span className={`app-chip status-${libraryUi.tone}`}>{libraryUi.statusLabel}</span>
              </div>
              <div className="app-metric-grid">
                <div className={`app-metric status-${libraryUi.tone}`}>
                  <span>{settingsText(copy, "资料库日期")}</span>
                  <strong>{libraryVersion ?? settingsText(copy, "未读取")}</strong>
                  <span>{settingsText(copy, "从完整版本号解析，顶部状态栏显示")}</span>
                </div>
                <div className={`app-metric status-${props.manifestStatus?.missing_required_components?.length ? "warning" : "ready"}`}>
                  <span>{settingsText(copy, "资料完整性")}</span>
                  <strong>{formatLibraryIntegrity(props.manifestStatus, copy)}</strong>
                  <span>{settingsText(copy, "用于搜索和详情判断")}</span>
                </div>
                <div className="app-metric status-neutral">
                  <span>{settingsText(copy, "上次更新")}</span>
                  <strong>{formatDateTime(props.manifestStatus?.cached_at, interfaceLocale, copy)}</strong>
                  <span>{settingsText(copy, "成功重建资料库的时间")}</span>
                </div>
                <div className="app-metric status-neutral">
                  <span>{settingsText(copy, "更新规则")}</span>
                  <strong>{settingsText(copy, "每天自动检查一次")}</strong>
                  <span>{settingsText(copy, "手动检查、立即更新和修复不受限制")}</span>
                </div>
              </div>
              <div className="library-version-table">
                <div className="version-row"><span>{settingsText(copy, "资料库版本")}</span><strong>{libraryVersion ?? settingsText(copy, "未读取")}</strong></div>
                <div className="version-row"><span>{settingsText(copy, "当前版本")}</span><strong>{props.manifestStatus?.version ?? settingsText(copy, "未初始化")}</strong></div>
                <div className="version-row"><span>{settingsText(copy, "最新版本")}</span><strong>{props.manifestStatus?.latest_version ?? settingsText(copy, "等待检查")}</strong></div>
                <div className="version-row"><span>{settingsText(copy, "上次检查")}</span><strong>{formatDateTime(props.manifestStatus?.checked_at, interfaceLocale, copy)}</strong></div>
                <div className="version-row"><span>{settingsText(copy, "自动检查")}</span><strong>{settingsText(copy, "启动后或打开资料库状态时触发；同一本地日期只自动检查一次")}</strong></div>
                <div className="version-row"><span>{settingsText(copy, "自动更新")}</span><strong>{settingsText(copy, "未初始化、不完整或发现新版时后台更新；失败时保留旧资料库")}</strong></div>
                <div className="version-row"><span>{settingsText(copy, "手动操作")}</span><strong>{settingsText(copy, "检查资料库版本、立即更新、修复资料库始终立即执行")}</strong></div>
              </div>
              <div className="button-row">
                <button type="button" className="secondary-button" disabled={props.isLoadingManifestStatus} onClick={props.onRefreshManifestStatus}>{settingsText(copy, "检查资料库版本")}</button>
                <button type="button" disabled={props.isInitializingManifest} onClick={props.onInitializeManifest}>
                  {props.isInitializingManifest ? settingsText(copy, "更新中...") : settingsText(copy, "立即更新")}
                </button>
                <button type="button" className="secondary-button" disabled={props.isInitializingManifest} onClick={props.onRepairManifest}>{settingsText(copy, "修复资料库")}</button>
              </div>
            </section>
          </section>

          <section className={activeSection === "bungie" ? "settings-detail active" : "settings-detail"} id="settings-bungie">
            <section className="panel-subsection app-setting-group">
              <div className="app-section-title">
                <h2>{settingsText(copy, "Bungie 接口配置")}</h2>
                <span>{settingsText(copy, "应用级接口，不等同于当前账号")}</span>
              </div>
              <section className="config-help-card" aria-label={settingsText(copy, "Bungie 配置填写说明")}>
                <h3>{settingsText(copy, "不知道填哪个？")}</h3>
                <p>{settingsText(copy, "在 Bungie 应用页面里这样对应：")}</p>
                <dl className="config-map">
                  <div><dt>{settingsText(copy, "应用程序介面金钥")}</dt><dd>Bungie API Key</dd></div>
                  <div><dt>{settingsText(copy, "开放授权 client_id")}</dt><dd>Bungie Client ID</dd></div>
                  <div><dt>{settingsText(copy, "开放授权 client_secret")}</dt><dd>Bungie Client Secret</dd></div>
                </dl>
                <p>
                  {settingsText(copy, "不要填写“开放授权之授权 URI”，那是 Bungie 自动生成的授权地址。本工具回调地址固定是：")}
                  <code>https://127.0.0.1:28780/oauth/callback</code>
                </p>
              </section>
              <div className="config-field-stack">
                <label className="config-field">
                  Bungie API Key
                  <input
                    disabled={isLoadingBungieConfig || isSavingBungieConfig}
                    placeholder={settingsText(copy, "复制 Bungie 页面里的“应用程序介面金钥”")}
                    value={bungieApiKey}
                    onChange={(event) => setBungieApiKey(event.target.value)}
                  />
                </label>
                <label className="config-field">
                  Bungie Client ID
                  <input
                    disabled={isLoadingBungieConfig || isSavingBungieConfig}
                    placeholder={settingsText(copy, "复制 Bungie 页面里的“开放授权 client_id”")}
                    value={bungieClientId}
                    onChange={(event) => setBungieClientId(event.target.value)}
                  />
                </label>
                <label className="config-field">
                  Bungie Client Secret
                  <input
                    disabled={isLoadingBungieConfig || isSavingBungieConfig}
                    placeholder={settingsText(copy, "复制 Bungie 页面里的“开放授权 client_secret”")}
                    type="password"
                    value={bungieClientSecret}
                    onChange={(event) => setBungieClientSecret(event.target.value)}
                  />
                </label>
                <label className="config-field">
                  {settingsText(copy, "回调地址")}
                  <input disabled value={bungieRedirectUri} onChange={(event) => setBungieRedirectUri(event.target.value)} />
                </label>
                <label className="config-field">
                  {settingsText(copy, "数据目录")}
                  <input disabled value={props.diagnosticDataDir || settingsText(copy, "未读取到配置目录")} />
                </label>
              </div>
              <div className="button-row">
                <button type="button" disabled={isLoadingBungieConfig || isSavingBungieConfig} onClick={() => void saveBungieConfig()}>
                  {isSavingBungieConfig ? settingsText(copy, "保存中...") : settingsText(copy, "保存配置")}
                </button>
                <button type="button" className="secondary-button" onClick={props.onOpenDataDir}>{settingsText(copy, "打开数据目录")}</button>
              </div>
              {bungieError ? <p className="status-message status-error">{bungieError}</p> : null}
              {bungieMessage ? <p className="status-message status-ready">{bungieMessage}</p> : null}
            </section>
          </section>

          <section className={activeSection === "ai" ? "settings-detail active" : "settings-detail"} id="settings-ai">
            <section className="panel-subsection app-setting-group settings-ai-section">
              <div className="app-section-title">
                <h2>{settingsText(copy, "AI 助手")}</h2>
                <span>{settingsText(copy, "可选能力，不阻断本地功能")}</span>
              </div>
              {props.aiSettingsPanel}
            </section>
          </section>

          <section className={activeSection === "backup" ? "settings-detail active" : "settings-detail"} id="settings-backup">
            <section className="panel-subsection app-setting-group">
              <div className="app-section-title">
                <h2>{settingsText(copy, "数据备份与迁移")}</h2>
                <span>{settingsText(copy, "低频但需要可发现")}</span>
              </div>
              <div className="app-setting-row">
                <div><strong>{settingsText(copy, "数据目录")}</strong><span>{props.diagnosticDataDir || settingsText(copy, "未读取到配置目录")}</span></div>
                <button type="button" className="secondary-button" onClick={props.onOpenDataDir}>{settingsText(copy, "打开")}</button>
              </div>
              <div className="app-setting-row">
                <div><strong>{settingsText(copy, "导出配置")}</strong><span>{settingsText(copy, "导出不包含账号令牌的本地偏好设置。")}</span></div>
                <button type="button" className="secondary-button" onClick={props.onExportConfig}>{settingsText(copy, "导出")}</button>
              </div>
              <div className="app-setting-row">
                <div><strong>{settingsText(copy, "导入配置")}</strong><span>{settingsText(copy, "迁移电脑时先关闭应用，再用备份覆盖数据目录。")}</span></div>
                <button type="button" className="secondary-button" onClick={props.onImportConfig}>{settingsText(copy, "导入")}</button>
              </div>
              <div className="app-setting-row">
                <div><strong>{settingsText(copy, "清理缓存")}</strong><span>{settingsText(copy, "清理临时缓存，不删除账号授权、设置和本地标记。")}</span></div>
                <button type="button" className="secondary-button" onClick={props.onClearCache}>{settingsText(copy, "清理")}</button>
              </div>
              <div className="app-setting-row">
                <div><strong>{settingsText(copy, "迁移说明")}</strong><span>{settingsText(copy, "覆盖安装或换电脑前，先关闭 d2-tools，再复制整个本地数据目录。")}</span></div>
                <button type="button" className="secondary-button" onClick={props.onCopyDataBackupGuide}>{settingsText(copy, "复制备份/迁移说明")}</button>
              </div>
            </section>
          </section>

          <section className={activeSection === "diagnostics" ? "settings-detail active" : "settings-detail"} id="settings-diagnostics">
            <section className="panel-subsection app-setting-group">
              <div className="app-section-title">
                <div>
                  <h2>{settingsText(copy, "诊断与操作日志")}</h2>
                  <span>{settingsText(copy, "默认展示最近关键事件")}</span>
                </div>
                <div className="button-row">
                  <button type="button" className="secondary-button" onClick={props.onRefreshDiagnostics}>{settingsText(copy, "运行诊断")}</button>
                  <button type="button" className="secondary-button" onClick={props.onRefreshActionLog}>{settingsText(copy, "刷新日志")}</button>
                </div>
              </div>
              <div className="app-setting-row">
                <div>
                  <strong>{settingsText(copy, "诊断摘要")}</strong>
                  <span>{settingsText(copy, "检查账号、资料库、后台任务和本地数据目录；异常信息可复制为脱敏诊断。")}</span>
                </div>
                <button type="button" className="secondary-button" onClick={props.onCopyDiagnosticsExport}>{settingsText(copy, "复制脱敏诊断")}</button>
              </div>
              <div className="settings-diagnostics-toolbar">
                <label className="compact-field">
                  {settingsText(copy, "结果")}
                  <select value={props.actionLogResultFilter} onChange={(event) => props.onActionLogResultFilterChange(event.target.value as SettingsActionLogResultFilter)}>
                    <option value="all">{settingsText(copy, "全部")}</option>
                    <option value="success">{settingsText(copy, "成功")}</option>
                    <option value="failed">{settingsText(copy, "失败")}</option>
                  </select>
                </label>
                <label className="compact-field">
                  {settingsText(copy, "类型")}
                  <select value={props.actionLogTypeFilter} onChange={(event) => props.onActionLogTypeFilterChange(event.target.value as SettingsActionLogTypeFilter)}>
                    <option value="all">{settingsText(copy, "全部")}</option>
                    <option value="set-lock">{settingsText(copy, "锁定状态")}</option>
                    <option value="equip">{settingsText(copy, "装备")}</option>
                    <option value="transfer">{settingsText(copy, "仓库转移")}</option>
                    <option value="postmaster-pull">{settingsText(copy, "邮政官取回")}</option>
                    <option value="loadout-equip">{settingsText(copy, "应用游戏内配装栏")}</option>
                    <option value="loadout-snapshot">{settingsText(copy, "覆盖游戏内配装栏")}</option>
                  </select>
                </label>
              </div>
              {visibleActionLog.length ? (
                <div className="app-log-list">
                  {visibleActionLog.map((entry) => (
                    <div className={`app-log-row settings-log-row ${entry.ok ? "is-success" : "is-failed"}`} key={entry.id}>
                      <div>
                        <strong>{formatActionLogTitle(entry, copy)}</strong>
                        <span>{new Date(entry.created_at).toLocaleString(interfaceLocale)}</span>
                      </div>
                      <small>{entry.message ?? "-"}</small>
                      {!entry.ok ? <button type="button" className="inline-action" onClick={() => props.onCopyActionDiagnostic(entry)}>{settingsText(copy, "复制诊断")}</button> : null}
                    </div>
                  ))}
                </div>
              ) : <p className="status-message status-neutral">{settingsText(copy, "还没有写操作记录。")}</p>}
            </section>
          </section>
        </ProductWorkspaceContentStack>
      </ProductWorkspaceSplit>
    </>
  );
}

function getAccountUi(
  accountSummary: AccountSummary | null,
  error: string,
  warning: string,
  isLoading: boolean,
  copy: SettingsCopy
): { statusLabel: string; summary: string; tone: "neutral" | "ready" | "warning" | "error" } {
  if (error && accountSummary) return { statusLabel: settingsText(copy, "刷新失败"), summary: `${settingsText(copy, "显示上次账号数据")}：${error}`, tone: "error" };
  if (error) return { statusLabel: settingsText(copy, "读取失败"), summary: error, tone: "error" };
  if (isLoading) {
    return accountSummary
      ? { statusLabel: settingsText(copy, "刷新中"), summary: settingsText(copy, "正在刷新账号和仓库。"), tone: "warning" }
      : { statusLabel: settingsText(copy, "读取中"), summary: settingsText(copy, "正在读取账号和仓库。"), tone: "warning" };
  }
  if (warning && accountSummary) return { statusLabel: settingsText(copy, "已读取"), summary: warning, tone: "warning" };
  if (accountSummary) {
    return {
      statusLabel: settingsText(copy, "已读取"),
      summary: `${settingsText(copy, "角色")} ${accountSummary.characters.length} ${settingsText(copy, "个")}，${settingsText(copy, "仓库")} ${accountSummary.vault.item_count} ${settingsText(copy, "件")}`,
      tone: "ready"
    };
  }
  return { statusLabel: settingsText(copy, "未登录"), summary: settingsText(copy, "登录后可读取角色和仓库。"), tone: "neutral" };
}

function getBungieUi(input: {
  isLoading: boolean;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}, copy: SettingsCopy): { statusLabel: string; summary: string; tone: "neutral" | "ready" | "warning" } {
  if (input.isLoading) {
    return { statusLabel: settingsText(copy, "读取中"), summary: settingsText(copy, "正在读取本地 Bungie 应用配置。"), tone: "neutral" };
  }

  const isConfigured = Boolean(
    input.apiKey.trim()
      && input.clientId.trim()
      && input.clientSecret.trim()
      && input.redirectUri.trim()
  );
  if (isConfigured) {
    return { statusLabel: settingsText(copy, "已配置"), summary: settingsText(copy, "接口配置与回调地址可用"), tone: "ready" };
  }

  return { statusLabel: settingsText(copy, "未配置"), summary: settingsText(copy, "需要填写 Bungie API Key、Client ID 和 Secret。"), tone: "warning" };
}

function getAiUi(isConfigured: boolean, copy: SettingsCopy): { statusLabel: string; summary: string; tone: "ready" | "warning" } {
  if (isConfigured) {
    return { statusLabel: settingsText(copy, "已配置"), summary: settingsText(copy, "可用于装备分析、perk 解读和仓库建议。"), tone: "ready" };
  }

  return { statusLabel: settingsText(copy, "未配置"), summary: settingsText(copy, "不影响本地账号和资料库功能"), tone: "warning" };
}

function getBackgroundTaskUi(tasks: BackgroundTaskSnapshot[], copy: SettingsCopy): { statusLabel: string; summary: string; tone: "neutral" | "warning" | "error" } {
  const activeTasks = tasks.filter((task) => task.status === "queued" || task.status === "running" || task.status === "retrying");
  const blockedOrFailed = tasks.find((task) => task.status === "blocked" || task.status === "failed");

  if (blockedOrFailed) {
    return {
      statusLabel: settingsText(copy, "需关注"),
      summary: blockedOrFailed.title,
      tone: "error"
    };
  }

  if (activeTasks.length) {
    return {
      statusLabel: `${activeTasks.length} ${settingsText(copy, "个运行中")}`,
      summary: activeTasks[0]?.title ?? settingsText(copy, "后台任务运行中"),
      tone: "warning"
    };
  }

  return { statusLabel: settingsText(copy, "空闲"), summary: settingsText(copy, "没有正在运行或阻断的任务。"), tone: "neutral" };
}

function formatAccountSnapshot(accountSummary: AccountSummary | null, copy: SettingsCopy): string {
  if (!accountSummary) return settingsText(copy, "未读取账号");
  return `${settingsText(copy, "账号快照")} · ${settingsText(copy, "角色")} ${accountSummary.characters.length} · ${settingsText(copy, "仓库")} ${accountSummary.vault.item_count}`;
}

function formatAccountLoadedAt(loadedAt: Date | null, accountSummary: AccountSummary | null, locale: InterfaceLocale, copy: SettingsCopy): string {
  if (!accountSummary) return settingsText(copy, "未读取");
  if (!loadedAt) return settingsText(copy, "本次启动已读取");
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(loadedAt);
}

function getAppUpdateUi(snapshot: AppUpdateSnapshot | null, copy: SettingsCopy): { statusLabel: string; summary: string; tone: "neutral" | "ready" | "warning" | "error" } {
  if (!snapshot) {
    return { statusLabel: settingsText(copy, "读取中"), summary: settingsText(copy, "正在读取更新状态。"), tone: "neutral" };
  }

  if (snapshot.status === "checking") {
    return { statusLabel: settingsText(copy, "检查中"), summary: settingsText(copy, "正在连接更新服务。"), tone: "neutral" };
  }

  if (snapshot.status === "available") {
    return {
      statusLabel: settingsText(copy, "发现新版本"),
      summary: `${settingsText(copy, "发现新版本")} ${snapshot.available_version ?? ""}${settingsText(copy, "可先下载，下载完成后再重启安装。")}`,
      tone: "ready"
    };
  }

  if (snapshot.status === "not_available") {
    return {
      statusLabel: settingsText(copy, "已是最新"),
      summary: snapshot.user_message ?? snapshot.error ?? settingsText(copy, "当前已是最新版本。"),
      tone: "neutral"
    };
  }

  if (snapshot.status === "downloading") {
    return {
      statusLabel: settingsText(copy, "下载中"),
      summary: snapshot.progress_percent === undefined
        ? settingsText(copy, "正在下载更新。")
        : `${settingsText(copy, "正在下载更新：")}${snapshot.progress_percent}%`,
      tone: "warning"
    };
  }

  if (snapshot.status === "downloaded") {
    return {
      statusLabel: settingsText(copy, "等待重启"),
      summary: snapshot.user_message ?? `${settingsText(copy, "更新")} ${snapshot.downloaded_version ?? snapshot.available_version ?? ""} ${settingsText(copy, "已下载。")}`,
      tone: "ready"
    };
  }

  if (snapshot.status === "error") {
    return {
      statusLabel: settingsText(copy, "更新受阻"),
      summary: snapshot.user_message ?? snapshot.error ?? settingsText(copy, "更新检查失败。"),
      tone: "error"
    };
  }

  return { statusLabel: settingsText(copy, "未检查"), summary: settingsText(copy, "尚未检查软件版本。"), tone: "neutral" };
}

function getLibraryUi(
  status: ManifestStatus | null,
  error: string,
  isLoading: boolean,
  copy: SettingsCopy
): { statusLabel: string; summary: string; tone: "neutral" | "ready" | "warning" | "error" } {
  if (error) {
    return { statusLabel: settingsText(copy, "检查失败"), summary: status?.initialized ? settingsText(copy, "未能检查新版；本地资料库仍可继续使用。") : error, tone: status?.initialized ? "warning" : "error" };
  }
  if (isLoading && !status) {
    return { statusLabel: settingsText(copy, "检查中"), summary: settingsText(copy, "正在检查资料库是否有新版。"), tone: "neutral" };
  }
  if (!status || !status.initialized) {
    return { statusLabel: settingsText(copy, "未准备"), summary: settingsText(copy, "资料库尚未准备，部分搜索和解析功能不可用。"), tone: "warning" };
  }
  if (status.missing_required_components?.length) {
    return {
      statusLabel: settingsText(copy, "需修复"),
      summary: `${settingsText(copy, "资料库内容不完整，缺失")} ${status.missing_required_components.length} ${settingsText(copy, "项。")}`,
      tone: "warning"
    };
  }
  if (status.missing_optional_components?.length) {
    return {
      statusLabel: settingsText(copy, "可用"),
      summary: `${settingsText(copy, "英文辅助数据缺失")} ${status.missing_optional_components.length} ${settingsText(copy, "项，英文匹配能力可能降低。")}`,
      tone: "warning"
    };
  }
  if (status.needs_update) {
    return {
      statusLabel: settingsText(copy, "可更新"),
      summary: settingsText(copy, "发现新版资料库，将在后台更新。"),
      tone: "warning"
    };
  }
  return { statusLabel: settingsText(copy, "可用"), summary: settingsText(copy, "装备、perk、活动和商人数据可用。"), tone: "ready" };
}

function formatLibraryVersion(version?: string): string | undefined {
  if (!version) return undefined;
  const match = version.match(/(?:^|\.)(\d{2})\.(\d{2})\.(\d{2})(?:\.|-)/);
  if (!match) return undefined;
  const yearNumber = Number(match[1]);
  const fullYear = yearNumber < 80 ? 2000 + yearNumber : 1900 + yearNumber;
  return `${fullYear}/${match[2]}/${match[3]}`;
}

function formatLibraryIntegrity(status: ManifestStatus | null, copy: SettingsCopy): string {
  if (!status?.initialized) return settingsText(copy, "未准备");
  const missingCount = status.missing_required_components?.length ?? 0;
  if (missingCount > 0) return `${settingsText(copy, "缺失")} ${missingCount} ${settingsText(copy, "项，需修复")}`;
  const optionalMissingCount = status.missing_optional_components?.length ?? 0;
  if (optionalMissingCount > 0) return `${settingsText(copy, "辅助数据缺失")} ${optionalMissingCount} ${settingsText(copy, "项")}`;
  return settingsText(copy, "完整");
}

function formatDateTime(value: string | undefined, locale: InterfaceLocale, copy: SettingsCopy): string {
  if (!value) return settingsText(copy, "未读取");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatUpdateCheckedAt(value: string | undefined, locale: InterfaceLocale, copy: SettingsCopy): string {
  if (!value) return settingsText(copy, "未检查");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatAppUpdateProgress(snapshot: AppUpdateSnapshot | null): number {
  if (!snapshot) return 0;
  if (snapshot.status === "downloaded") return 100;
  if (snapshot.status === "downloading") return Math.max(8, Math.min(100, snapshot.progress_percent ?? 8));
  return 0;
}

function formatActionLogTitle(entry: ActionLogEntry, copy: SettingsCopy): string {
  const actionLabels: Record<ActionLogEntry["action"], string> = {
    "set-lock": settingsText(copy, "锁定状态"),
    equip: settingsText(copy, "装备"),
    transfer: settingsText(copy, "仓库转移"),
    "postmaster-pull": settingsText(copy, "邮政官取回"),
    "loadout-equip": settingsText(copy, "应用游戏内配装栏"),
    "loadout-snapshot": settingsText(copy, "覆盖游戏内配装栏")
  };

  return [
    entry.ok ? settingsText(copy, "成功") : settingsText(copy, "失败"),
    actionLabels[entry.action],
    entry.item_name
  ].filter(Boolean).join(" / ");
}

function filteredActionLog(
  entries: ActionLogEntry[],
  result: SettingsActionLogResultFilter,
  action: SettingsActionLogTypeFilter
): ActionLogEntry[] {
  return entries.filter((entry) => {
    if (result === "success" && !entry.ok) return false;
    if (result === "failed" && entry.ok) return false;
    if (action !== "all" && entry.action !== action) return false;
    return true;
  });
}

function interfaceLocaleToBungieLocale(locale: SettingsLanguagePreferences["interfaceLocale"]): SettingsLanguagePreferences["bungieLocale"] {
  return locale === "en-US" ? "en" : "zh-chs";
}
