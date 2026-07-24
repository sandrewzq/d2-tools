import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale, SettingsCopy } from "../i18n/types.js";
import { SettingsAiConfigPanel, type SettingsAiAdapter } from "./SettingsAiConfigPanel.js";

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
  | "insert-socket-plug"
  | "transfer"
  | "postmaster-pull"
  | "loadout-equip"
  | "loadout-snapshot";
export type SettingsDensity = "compact" | "standard" | "comfortable";

export type SettingsLanguagePreferences = {
  interfaceLocale: "zh-CN" | "en-US";
  bungieLocale: "zh-chs" | "en";
  followInterfaceLocaleForBungie: boolean;
};

export type SettingsBungieConfig = {
  bungie: { api_key: string; client_id: string; client_secret: string; redirect_uri: string };
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
  aiSettingsAdapter: SettingsAiAdapter;
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
  colorMode?: "light" | "dark";
  onColorModeChange?: (mode: "light" | "dark") => void;
  density?: SettingsDensity;
  onDensityChange?: (density: SettingsDensity) => void;
  languagePreferences: SettingsLanguagePreferences;
  onLanguagePreferencesChange: (preferences: SettingsLanguagePreferences) => void;
  onLoadBungieConfig: () => Promise<SettingsBungieConfig>;
  onSaveBungieConfig: (bungie: SettingsBungieConfigInput) => Promise<void>;
};

type SettingsSectionKey = "overview" | "language" | "account" | "library" | "bungie" | "ai" | "backup" | "diagnostics";
type StatusTone = "neutral" | "ready" | "warning" | "error";

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
  const updateUi = getAppUpdateUi(props.appUpdateSnapshot, copy);
  const libraryUi = getLibraryUi(props.manifestStatus, props.manifestStatusError, props.isLoadingManifestStatus, copy);
  const accountUi = getAccountUi(props.accountSummary, props.accountError, props.accountWarning, props.isLoadingAccount, copy);
  const bungieUi = getBungieUi({ isLoading: isLoadingBungieConfig, apiKey: bungieApiKey, clientId: bungieClientId, clientSecret: bungieClientSecret, redirectUri: bungieRedirectUri }, copy);
  const aiUi = getAiUi(props.isAiConfigured, copy);
  const backgroundTaskUi = getBackgroundTaskUi(props.backgroundTasks, copy);
  const libraryVersion = formatLibraryVersion(props.manifestStatus?.version);

  useEffect(() => {
    let cancelled = false;
    void props.onLoadBungieConfig().then((config) => {
      if (cancelled) return;
      setBungieApiKey(config.bungie.api_key);
      setBungieClientId(config.bungie.client_id);
      setBungieClientSecret(config.bungie.client_secret);
      setBungieRedirectUri(config.bungie.redirect_uri);
    }).catch((error) => {
      if (!cancelled) setBungieError(error instanceof Error ? error.message : settingsText(copy, "Bungie 配置读取失败"));
    }).finally(() => {
      if (!cancelled) setIsLoadingBungieConfig(false);
    });
    return () => { cancelled = true; };
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

  const sectionProps = { copy, interfaceLocale, accountUi, libraryUi, bungieUi, aiUi, backgroundTaskUi, libraryVersion };

  return (
    <div className="settings-page" data-reference-id="settings.workspace">
      {props.message ? <p className="settings-feedback status-ready" role="status">{props.message}</p> : null}
      {props.error ? <p className="settings-feedback status-error" role="alert">{props.error}</p> : null}
      <div className="settings-workspace">
        <aside className="settings-directory" data-reference-id="settings.directory" data-scroll-region="pane" aria-label={copy.menuAriaLabel}>
          <div className="settings-directory-caption">{settingsText(copy, "设置目录")}</div>
          <nav className="settings-directory-list">
            {settingsMenu.map((item) => (
              <button
                aria-controls={`settings-${item.key}`}
                aria-current={activeSection === item.key ? "page" : undefined}
                className={activeSection === item.key ? "is-active" : undefined}
                id={`settings-menu-${item.key}`}
                key={item.key}
                type="button"
                onClick={() => setActiveSection(item.key)}
              >
                <strong>{item.label}</strong><span>{item.hint}</span>
              </button>
            ))}
          </nav>
        </aside>
        <main className="settings-content" data-reference-id="settings.content">
          {activeSection === "overview" ? (
            <OverviewSection
              {...sectionProps}
              updateUi={updateUi}
              updateProgress={formatAppUpdateProgress(props.appUpdateSnapshot)}
              appVersion={props.appUpdateSnapshot?.current_version ?? settingsText(copy, "未读取")}
              updateSource={props.appUpdateSnapshot?.update_source_label ?? "GitHub Release"}
              updateCheckedAt={formatUpdateCheckedAt(props.appUpdateSnapshot?.last_checked_at, interfaceLocale, copy)}
              onCheckAppUpdate={props.onCheckAppUpdate}
              onDownloadAppUpdate={props.onDownloadAppUpdate}
              onQuitAndInstallAppUpdate={props.onQuitAndInstallAppUpdate}
              onOpenAppUpdateDownloadPage={props.onOpenAppUpdateDownloadPage}
              onCopyAppUpdateDiagnostic={props.onCopyAppUpdateDiagnostic}
              isCheckingUpdate={props.appUpdateSnapshot?.status === "checking"}
              canDownload={props.appUpdateSnapshot?.status === "available"}
              canInstall={props.appUpdateSnapshot?.status === "downloaded"}
              onRefreshAccount={props.onRefreshAccount}
              onRefreshManifestStatus={props.onRefreshManifestStatus}
              isLoadingManifestStatus={props.isLoadingManifestStatus}
              onOpenDiagnostics={() => setActiveSection("diagnostics")}
            />
          ) : null}
          {activeSection === "language" ? <LanguageSection {...sectionProps} preferences={props.languagePreferences} colorMode={props.colorMode ?? "light"} density={props.density ?? "standard"} onPreferencesChange={props.onLanguagePreferencesChange} onColorModeChange={props.onColorModeChange} onDensityChange={props.onDensityChange ?? (() => undefined)} /> : null}
          {activeSection === "account" ? <AccountSection {...sectionProps} writeActionsEnabled={props.writeActionsEnabled} lastAccountLoadedAt={props.lastAccountLoadedAt} accountSummary={props.accountSummary} onWriteActionsEnabledChange={props.onWriteActionsEnabledChange} onRefreshAccount={props.onRefreshAccount} onReauthorizeAccount={props.onReauthorizeAccount} isLoadingAccount={props.isLoadingAccount} /> : null}
          {activeSection === "library" ? <LibrarySection {...sectionProps} manifestStatus={props.manifestStatus} isInitializing={props.isInitializingManifest} onRefresh={props.onRefreshManifestStatus} onInitialize={props.onInitializeManifest} onRepair={props.onRepairManifest} /> : null}
          {activeSection === "bungie" ? <BungieSection copy={copy} dataDir={props.diagnosticDataDir} apiKey={bungieApiKey} clientId={bungieClientId} clientSecret={bungieClientSecret} redirectUri={bungieRedirectUri} isLoading={isLoadingBungieConfig} isSaving={isSavingBungieConfig} error={bungieError} message={bungieMessage} onApiKeyChange={setBungieApiKey} onClientIdChange={setBungieClientId} onClientSecretChange={setBungieClientSecret} onSave={() => void saveBungieConfig()} onOpenDataDir={props.onOpenDataDir} /> : null}
          {activeSection === "ai" ? <SettingsSection id="ai" copy={copy} title={settingsText(copy, "AI 助手")} subtitle={settingsText(copy, "可选能力，不阻断本地功能")} badge={aiUi.statusLabel} tone={aiUi.tone}><SettingsAiConfigPanel adapter={props.aiSettingsAdapter} /></SettingsSection> : null}
          {activeSection === "backup" ? <BackupSection copy={copy} dataDir={props.diagnosticDataDir} onOpenDataDir={props.onOpenDataDir} onExport={props.onExportConfig} onImport={props.onImportConfig} onClearCache={props.onClearCache} onCopyGuide={props.onCopyDataBackupGuide} /> : null}
          {activeSection === "diagnostics" ? <DiagnosticsSection copy={copy} interfaceLocale={interfaceLocale} entries={filteredActionLog(props.actionLog, props.actionLogResultFilter, props.actionLogTypeFilter).slice(0, 8)} resultFilter={props.actionLogResultFilter} typeFilter={props.actionLogTypeFilter} onResultFilterChange={props.onActionLogResultFilterChange} onTypeFilterChange={props.onActionLogTypeFilterChange} onRefreshDiagnostics={props.onRefreshDiagnostics} onRefreshLog={props.onRefreshActionLog} onCopyExport={props.onCopyDiagnosticsExport} onCopyEntry={props.onCopyActionDiagnostic} /> : null}
        </main>
      </div>
    </div>
  );
}

function SettingsSection(props: { id: string; copy: SettingsCopy; title: string; subtitle: string; badge?: string; tone?: StatusTone; children: ReactNode }) {
  return <section className="settings-section" data-reference-id={`settings.section.${props.id}`} id={`settings-${props.id}`} aria-labelledby={`settings-menu-${props.id}`}><header className="settings-section-head"><div><h2>{props.title}</h2><p>{props.subtitle}</p></div>{props.badge ? <StatusBadge tone={props.tone ?? "neutral"}>{props.badge}</StatusBadge> : null}</header>{props.children}</section>;
}

function SettingsPanel(props: { title: string; subtitle: string; badge?: string; tone?: StatusTone; children: ReactNode }) {
  return <section className="settings-panel"><header className="settings-panel-head"><div><h3>{props.title}</h3><p>{props.subtitle}</p></div>{props.badge ? <StatusBadge tone={props.tone ?? "neutral"}>{props.badge}</StatusBadge> : null}</header>{props.children}</section>;
}

function StatusBadge(props: { tone: StatusTone; children: ReactNode }) { return <span className={`settings-status-badge status-${props.tone}`}>{props.children}</span>; }
function MetricGrid(props: { children: ReactNode }) { return <div className="settings-metric-grid" data-reference-id="settings.metrics">{props.children}</div>; }
function Metric(props: { label: string; value: string; detail: string; tone: StatusTone }) { return <div className={`settings-metric status-${props.tone}`}><span>{props.label}</span><strong>{props.value}</strong><small>{props.detail}</small></div>; }
function SettingRow(props: { label: string; detail: string; children: ReactNode }) { return <div className="setting-row"><div><strong>{props.label}</strong><p>{props.detail}</p></div><div className="setting-row-control">{props.children}</div></div>; }
function SettingsActions(props: { children: ReactNode }) { return <div className="settings-actions">{props.children}</div>; }
function VersionTable(props: { children: ReactNode }) { return <div className="settings-version-table">{props.children}</div>; }
function VersionRow(props: { label: string; value: string }) { return <div className="settings-version-row"><span>{props.label}</span><strong>{props.value}</strong></div>; }

function OverviewSection(props: any) {
  const { copy, accountUi, libraryUi, bungieUi, aiUi, backgroundTaskUi, libraryVersion, updateUi } = props;
  return <SettingsSection id="overview" copy={copy} title={copy.overview.title} subtitle={copy.overview.subtitle} badge={copy.overview.badge}>
    <MetricGrid>
      <Metric label={copy.labels.account} value={accountUi.statusLabel} detail={accountUi.summary} tone={accountUi.tone} />
      <Metric label={copy.labels.library} value={libraryVersion ?? libraryUi.statusLabel} detail={libraryUi.summary} tone={libraryUi.tone} />
      <Metric label={copy.labels.bungie} value={bungieUi.statusLabel} detail={bungieUi.summary} tone={bungieUi.tone} />
      <Metric label={copy.labels.ai} value={aiUi.statusLabel} detail={aiUi.summary} tone={aiUi.tone} />
      <Metric label={copy.labels.appVersion} value={props.appVersion} detail={updateUi.statusLabel} tone={updateUi.tone} />
      <Metric label={copy.labels.backgroundTasks} value={backgroundTaskUi.statusLabel} detail={backgroundTaskUi.summary} tone={backgroundTaskUi.tone} />
    </MetricGrid>
    <SettingsPanel title={settingsText(copy, "应用更新")} subtitle={updateUi.summary} badge={updateUi.statusLabel} tone={updateUi.tone}>
      <MetricGrid><Metric label={settingsText(copy, "应用版本")} value={props.appVersion} detail={settingsText(copy, "当前安装版本")} tone="neutral" /><Metric label={settingsText(copy, "更新来源")} value={props.updateSource} detail={settingsText(copy, "GitHub 连接失败时可打开下载页手动处理")} tone="neutral" /><Metric label={settingsText(copy, "上次检查")} value={props.updateCheckedAt} detail={settingsText(copy, "应用更新检查时间")} tone="neutral" /></MetricGrid>
      {props.updateProgress > 0 ? <div className="settings-progress" aria-label={settingsText(copy, "更新下载进度")}><span style={{ width: `${props.updateProgress}%` }} /></div> : null}
      <div className="settings-action-row"><SettingsActions><button type="button" className="secondary-button" disabled={props.isCheckingUpdate} onClick={props.onCheckAppUpdate}>{settingsText(copy, "检查软件版本")}</button><button type="button" className="secondary-button" disabled={!props.canDownload} onClick={props.onDownloadAppUpdate}>{settingsText(copy, "下载更新")}</button><button type="button" disabled={!props.canInstall} onClick={props.onQuitAndInstallAppUpdate}>{settingsText(copy, "重启并安装")}</button><button type="button" className="secondary-button" onClick={props.onOpenAppUpdateDownloadPage}>{settingsText(copy, "打开下载页")}</button><button type="button" className="secondary-button" onClick={props.onCopyAppUpdateDiagnostic}>{settingsText(copy, "复制更新诊断")}</button></SettingsActions></div>
    </SettingsPanel>
    <SettingsPanel title={copy.overview.commonActionsTitle} subtitle={copy.overview.commonActionsSubtitle}>
      <div className="settings-group"><SettingRow label={settingsText(copy, "管理账号")} detail={settingsText(copy, "查看当前账号、刷新读取状态，并为后续切换账号预留入口。")}><button type="button" className="secondary-button" onClick={props.onRefreshAccount}>{settingsText(copy, "刷新账号")}</button></SettingRow>
      <SettingRow label={settingsText(copy, "检查资料库更新")} detail={settingsText(copy, "手动检查不受“每天自动检查一次”限制。")}><button type="button" className="secondary-button" disabled={props.isLoadingManifestStatus} onClick={props.onRefreshManifestStatus}>{settingsText(copy, "检查资料库版本")}</button></SettingRow>
      <SettingRow label={settingsText(copy, "运行诊断")} detail={settingsText(copy, "检查账号、资料库、后台任务和本地数据目录。")}><button type="button" className="secondary-button" onClick={props.onOpenDiagnostics}>{settingsText(copy, "查看诊断")}</button></SettingRow></div>
    </SettingsPanel>
  </SettingsSection>;
}

function LanguageSection(props: any) {
  const { copy, preferences } = props;
  function update(patch: Partial<SettingsLanguagePreferences>) {
    const next = { ...preferences, ...patch };
    if (next.followInterfaceLocaleForBungie) next.bungieLocale = interfaceLocaleToBungieLocale(next.interfaceLocale);
    props.onPreferencesChange(next);
  }
  return <SettingsSection id="language" copy={copy} title={copy.menu.language.label} subtitle={settingsText(copy, "界面语言和 Bungie 资料库语言分开设置。")} badge={preferences.interfaceLocale === "zh-CN" ? settingsText(copy, "中文") : "English"}>
    <SettingRow label={settingsText(copy, "界面语言")} detail={settingsText(copy, "控制菜单、按钮、设置、状态、诊断和空状态文案。")}><select aria-label={settingsText(copy, "界面语言")} value={preferences.interfaceLocale} onChange={(event) => update({ interfaceLocale: event.target.value as SettingsLanguagePreferences["interfaceLocale"] })}><option value="zh-CN">{settingsText(copy, "中文")}</option><option value="en-US">English</option></select></SettingRow>
    <SettingRow label={settingsText(copy, "资料库语言")} detail={settingsText(copy, "控制装备名、perk、活动名等 Bungie Manifest 数据；变更后在后续资料库读取或更新时生效。")}><select aria-label={settingsText(copy, "资料库语言")} disabled={preferences.followInterfaceLocaleForBungie} value={preferences.bungieLocale} onChange={(event) => update({ bungieLocale: event.target.value as SettingsLanguagePreferences["bungieLocale"] })}><option value="zh-chs">{settingsText(copy, "简体中文")}</option><option value="en">English</option></select></SettingRow>
    <SettingRow label={settingsText(copy, "跟随界面语言")} detail={settingsText(copy, "开启后，切换界面语言会同步切换资料库语言。")}><label className="setting-toggle"><input checked={preferences.followInterfaceLocaleForBungie} type="checkbox" onChange={(event) => update({ followInterfaceLocaleForBungie: event.target.checked })} />{settingsText(copy, "跟随")}</label></SettingRow>
    <SettingRow label={settingsText(copy, "界面主题")} detail={settingsText(copy, "切换整个工作区的浅色或深色视觉。")}><select aria-label={settingsText(copy, "界面主题")} disabled={!props.onColorModeChange} value={props.colorMode} onChange={(event) => props.onColorModeChange?.(event.target.value as "light" | "dark")}><option value="light">{settingsText(copy, "浅色")}</option><option value="dark">{settingsText(copy, "深色")}</option></select></SettingRow>
    <SettingRow label={settingsText(copy, "信息密度")} detail={settingsText(copy, "调整列表、卡片和操作区的垂直间距，不改变功能与数据量。")}><select aria-label={settingsText(copy, "信息密度")} value={props.density} onChange={(event) => props.onDensityChange(event.target.value as SettingsDensity)}><option value="compact">{settingsText(copy, "紧凑")}</option><option value="standard">{settingsText(copy, "标准")}</option><option value="comfortable">{settingsText(copy, "舒适")}</option></select></SettingRow>
  </SettingsSection>;
}

function AccountSection(props: any) {
  const { copy, accountUi, accountSummary, interfaceLocale } = props;
  return <SettingsSection id="account" copy={copy} title={copy.menu.account.label} subtitle={settingsText(copy, "当前账号、授权状态、读取规则和后续切换账号入口。")} badge={accountUi.statusLabel} tone={accountUi.tone}>
    <MetricGrid><Metric label={settingsText(copy, "当前账号")} value={accountSummary?.account_name ?? settingsText(copy, "未登录")} detail={accountSummary ? settingsText(copy, "Bungie 账号已授权") : settingsText(copy, "登录后可读取账号")} tone={accountUi.tone} /><Metric label={settingsText(copy, "账号读取")} value={accountUi.statusLabel} detail={accountUi.summary} tone={accountUi.tone} /><Metric label={settingsText(copy, "上次刷新")} value={formatAccountLoadedAt(props.lastAccountLoadedAt, accountSummary, interfaceLocale, copy)} detail={settingsText(copy, "成功刷新账号资料的时间")} tone="neutral" /><Metric label={settingsText(copy, "刷新规则")} value={settingsText(copy, "启动自动读取一次")} detail={settingsText(copy, "手动刷新、重新授权和切换账号不受限制")} tone="neutral" /></MetricGrid>
    <VersionTable><VersionRow label={settingsText(copy, "当前账号")} value={accountSummary?.account_name ?? settingsText(copy, "未登录")} /><VersionRow label={settingsText(copy, "当前版本")} value={formatAccountSnapshot(accountSummary, copy)} /><VersionRow label={settingsText(copy, "最新版本")} value={settingsText(copy, "已是当前读取结果")} /><VersionRow label={settingsText(copy, "上次检查")} value={formatAccountLoadedAt(props.lastAccountLoadedAt, accountSummary, interfaceLocale, copy)} /><VersionRow label={settingsText(copy, "打开应用时")} value={settingsText(copy, "自动读取一次当前账号，避免每次进页面都重复加载")} /><VersionRow label={settingsText(copy, "需要重新读取时")} value={settingsText(copy, "首次登录、重新授权、切换账号或本地记录不可用时会重新读取；失败时保留上次成功结果")} /><VersionRow label={settingsText(copy, "手动操作")} value={settingsText(copy, "刷新账号、重新授权、管理账号和未来切换账号始终立即执行")} /><VersionRow label={settingsText(copy, "默认账号")} value={settingsText(copy, "当前账号；切换账号功能上线后可修改")} /></VersionTable>
    <div className="settings-group settings-spaced-group">
      <SettingRow label={settingsText(copy, "装备写操作")} detail={props.writeActionsEnabled ? settingsText(copy, "已开启，允许锁定、装备和转移。") : settingsText(copy, "已关闭，写操作会被阻断。")}><label className="setting-toggle"><input checked={props.writeActionsEnabled} type="checkbox" onChange={(event) => props.onWriteActionsEnabledChange(event.target.checked)} />{settingsText(copy, "允许")}</label></SettingRow>
      <SettingRow label={settingsText(copy, "账号操作")} detail={settingsText(copy, "手动操作始终重新读取最新数据。")}><SettingsActions><button type="button" disabled={props.isLoadingAccount} onClick={props.onRefreshAccount}>{settingsText(copy, "刷新账号")}</button><button type="button" className="secondary-button" onClick={props.onReauthorizeAccount}>{settingsText(copy, "重新授权")}</button></SettingsActions></SettingRow>
    </div>
  </SettingsSection>;
}

function LibrarySection(props: any) {
  const { copy, libraryUi, libraryVersion, interfaceLocale, manifestStatus } = props;
  return <SettingsSection id="library" copy={copy} title={copy.menu.library.label} subtitle={settingsText(copy, "装备、perk、活动和商人数据。")} badge={libraryUi.statusLabel} tone={libraryUi.tone}>
    <MetricGrid><Metric label={settingsText(copy, "资料库日期")} value={libraryVersion ?? settingsText(copy, "未读取")} detail={settingsText(copy, "从完整版本号解析")} tone={libraryUi.tone} /><Metric label={settingsText(copy, "资料完整性")} value={formatLibraryIntegrity(manifestStatus, copy)} detail={settingsText(copy, "用于搜索和详情判断")} tone={manifestStatus?.missing_required_components?.length ? "warning" : "ready"} /><Metric label={settingsText(copy, "上次更新")} value={formatDateTime(manifestStatus?.cached_at, interfaceLocale, copy)} detail={settingsText(copy, "成功重建资料库的时间")} tone="neutral" /><Metric label={settingsText(copy, "更新规则")} value={settingsText(copy, "每天自动检查一次")} detail={settingsText(copy, "手动检查、立即更新和修复不受限制")} tone="neutral" /></MetricGrid>
    <VersionTable><VersionRow label={settingsText(copy, "资料库版本")} value={libraryVersion ?? settingsText(copy, "未读取")} /><VersionRow label={settingsText(copy, "当前版本")} value={manifestStatus?.version ?? settingsText(copy, "未初始化")} /><VersionRow label={settingsText(copy, "最新版本")} value={manifestStatus?.latest_version ?? settingsText(copy, "等待检查")} /><VersionRow label={settingsText(copy, "上次检查")} value={formatDateTime(manifestStatus?.checked_at, interfaceLocale, copy)} /><VersionRow label={settingsText(copy, "自动检查")} value={settingsText(copy, "启动后或打开资料库状态时触发；同一本地日期只自动检查一次")} /><VersionRow label={settingsText(copy, "自动更新")} value={settingsText(copy, "未初始化、不完整或发现新版时后台更新；失败时保留旧资料库")} /><VersionRow label={settingsText(copy, "手动操作")} value={settingsText(copy, "检查资料库版本、立即更新、修复资料库始终立即执行")} /></VersionTable>
    <div className="settings-action-row"><SettingsActions><button type="button" className="secondary-button" disabled={props.isLoading} onClick={props.onRefresh}>{settingsText(copy, "检查资料库版本")}</button><button type="button" disabled={props.isInitializing} onClick={props.onInitialize}>{props.isInitializing ? settingsText(copy, "更新中...") : settingsText(copy, "立即更新")}</button><button type="button" className="settings-danger-button" disabled={props.isInitializing} onClick={props.onRepair}>{settingsText(copy, "修复资料库")}</button></SettingsActions></div>
  </SettingsSection>;
}

function BungieSection(props: any) {
  const { copy } = props;
  const disabled = props.isLoading || props.isSaving;
  return <SettingsSection id="bungie" copy={copy} title={copy.menu.bungie.label} subtitle={settingsText(copy, "应用级接口，不等同于当前账号")}>
    <div className="settings-config-help"><h3>{settingsText(copy, "不知道填哪个？")}</h3><p>{settingsText(copy, "在 Bungie 应用页面里这样对应：")}</p><dl><div><dt>{settingsText(copy, "应用程序介面金钥")}</dt><dd>Bungie API Key</dd></div><div><dt>{settingsText(copy, "开放授权 client_id")}</dt><dd>Bungie Client ID</dd></div><div><dt>{settingsText(copy, "开放授权 client_secret")}</dt><dd>Bungie Client Secret</dd></div></dl><p>{settingsText(copy, "不要填写“开放授权之授权 URI”，那是 Bungie 自动生成的授权地址。本工具回调地址固定是：")}<code>https://127.0.0.1:28780/oauth/callback</code></p></div>
    <div className="settings-config-fields"><label>Bungie API Key<input disabled={disabled} placeholder={settingsText(copy, "复制 Bungie 页面里的“应用程序介面金钥”")} value={props.apiKey} onChange={(event) => props.onApiKeyChange(event.target.value)} /></label><label>Bungie Client ID<input disabled={disabled} placeholder={settingsText(copy, "复制 Bungie 页面里的“开放授权 client_id”")} value={props.clientId} onChange={(event) => props.onClientIdChange(event.target.value)} /></label><label>Bungie Client Secret<input disabled={disabled} placeholder={settingsText(copy, "复制 Bungie 页面里的“开放授权 client_secret”")} type="password" value={props.clientSecret} onChange={(event) => props.onClientSecretChange(event.target.value)} /></label><label>{settingsText(copy, "回调地址")}<input disabled value={props.redirectUri} /></label><label>{settingsText(copy, "数据目录")}<input disabled value={props.dataDir || settingsText(copy, "未读取到配置目录")} /></label></div>
    <SettingsActions><button type="button" disabled={disabled} onClick={props.onSave}>{props.isSaving ? settingsText(copy, "保存中...") : settingsText(copy, "保存配置")}</button><button type="button" className="secondary-button" onClick={props.onOpenDataDir}>{settingsText(copy, "打开数据目录")}</button></SettingsActions>{props.error ? <p className="settings-feedback status-error" role="alert">{props.error}</p> : null}{props.message ? <p className="settings-feedback status-ready" role="status">{props.message}</p> : null}
  </SettingsSection>;
}

function BackupSection(props: any) {
  const { copy } = props;
  return <SettingsSection id="backup" copy={copy} title={copy.menu.backup.label} subtitle={settingsText(copy, "低频但需要可发现")}>
    <SettingRow label={settingsText(copy, "数据目录")} detail={props.dataDir || settingsText(copy, "未读取到配置目录")}><button type="button" className="secondary-button" onClick={props.onOpenDataDir}>{settingsText(copy, "打开")}</button></SettingRow>
    <SettingRow label={settingsText(copy, "创建便携备份")} detail={settingsText(copy, "备份偏好、愿望单、标签和配装模板，不包含账号令牌、密钥、资料库、缓存或日志。")}><button type="button" className="secondary-button" onClick={props.onExport}>{settingsText(copy, "创建备份")}</button></SettingRow>
    <SettingRow label={settingsText(copy, "恢复便携备份")} detail={settingsText(copy, "恢复前自动保存本机回滚备份；目标电脑仍需重新登录并填写密钥。")}><button type="button" className="secondary-button" onClick={props.onImport}>{settingsText(copy, "恢复备份")}</button></SettingRow>
    <SettingRow label={settingsText(copy, "清理缓存")} detail={settingsText(copy, "清理临时缓存，不删除账号授权、设置和本地标记。")}><button type="button" className="secondary-button" onClick={props.onClearCache}>{settingsText(copy, "清理")}</button></SettingRow>
    <SettingRow label={settingsText(copy, "迁移说明")} detail={settingsText(copy, "优先使用便携备份；只有需要保留账号令牌时才手动复制整个数据目录。")}><button type="button" className="secondary-button" onClick={props.onCopyGuide}>{settingsText(copy, "复制备份/迁移说明")}</button></SettingRow>
  </SettingsSection>;
}

function DiagnosticsSection(props: any) {
  const { copy } = props;
  return <SettingsSection id="diagnostics" copy={copy} title={copy.menu.diagnostics.label} subtitle={settingsText(copy, "默认展示最近关键事件")}>
    <SettingsActions><button type="button" className="secondary-button" onClick={props.onRefreshDiagnostics}>{settingsText(copy, "运行诊断")}</button><button type="button" className="secondary-button" onClick={props.onRefreshLog}>{settingsText(copy, "刷新日志")}</button></SettingsActions>
    <SettingRow label={settingsText(copy, "诊断摘要")} detail={settingsText(copy, "检查账号、资料库、后台任务和本地数据目录；异常信息可复制为脱敏诊断。")}><button type="button" className="secondary-button" onClick={props.onCopyExport}>{settingsText(copy, "复制脱敏诊断")}</button></SettingRow>
    <div className="settings-log-toolbar"><label>{settingsText(copy, "结果")}<select value={props.resultFilter} onChange={(event) => props.onResultFilterChange(event.target.value as SettingsActionLogResultFilter)}><option value="all">{settingsText(copy, "全部")}</option><option value="success">{settingsText(copy, "成功")}</option><option value="failed">{settingsText(copy, "失败")}</option></select></label><label>{settingsText(copy, "类型")}<select value={props.typeFilter} onChange={(event) => props.onTypeFilterChange(event.target.value as SettingsActionLogTypeFilter)}><option value="all">{settingsText(copy, "全部")}</option><option value="set-lock">{settingsText(copy, "锁定状态")}</option><option value="equip">{settingsText(copy, "装备")}</option><option value="insert-socket-plug">{settingsText(copy, "切换武器 Perk")}</option><option value="transfer">{settingsText(copy, "仓库转移")}</option><option value="postmaster-pull">{settingsText(copy, "邮政官取回")}</option><option value="loadout-equip">{settingsText(copy, "应用游戏内配装栏")}</option><option value="loadout-snapshot">{settingsText(copy, "覆盖游戏内配装栏")}</option></select></label></div>
    {props.entries.length ? <div className="settings-log-list">{props.entries.map((entry: ActionLogEntry) => <div className={`settings-log-entry ${entry.ok ? "is-success" : "is-failed"}`} key={entry.id}><div><strong>{formatActionLogTitle(entry, copy)}</strong><span>{new Date(entry.created_at).toLocaleString(props.interfaceLocale)}</span></div><small>{entry.message ?? "-"}</small>{!entry.ok ? <button type="button" className="inline-action" onClick={() => props.onCopyEntry(entry)}>{settingsText(copy, "复制诊断")}</button> : null}</div>)}</div> : <p className="settings-feedback status-neutral">{settingsText(copy, "还没有写操作记录。")}</p>}
  </SettingsSection>;
}

function getAccountUi(accountSummary: AccountSummary | null, error: string, warning: string, isLoading: boolean, copy: SettingsCopy): { statusLabel: string; summary: string; tone: StatusTone } {
  if (error && accountSummary) return { statusLabel: settingsText(copy, "刷新失败"), summary: `${settingsText(copy, "显示上次账号数据")}：${error}`, tone: "error" };
  if (error) return { statusLabel: settingsText(copy, "读取失败"), summary: error, tone: "error" };
  if (isLoading) return accountSummary ? { statusLabel: settingsText(copy, "刷新中"), summary: settingsText(copy, "正在刷新账号和仓库。"), tone: "warning" } : { statusLabel: settingsText(copy, "读取中"), summary: settingsText(copy, "正在读取账号和仓库。"), tone: "warning" };
  if (warning && accountSummary) return { statusLabel: settingsText(copy, "已读取"), summary: warning, tone: "warning" };
  if (accountSummary) return { statusLabel: settingsText(copy, "已读取"), summary: `${settingsText(copy, "角色")} ${accountSummary.characters.length} ${settingsText(copy, "个")}，${settingsText(copy, "仓库")} ${accountSummary.vault.item_count} ${settingsText(copy, "件")}`, tone: "ready" };
  return { statusLabel: settingsText(copy, "未登录"), summary: settingsText(copy, "登录后可读取角色和仓库。"), tone: "neutral" };
}

function getBungieUi(input: { isLoading: boolean; apiKey: string; clientId: string; clientSecret: string; redirectUri: string }, copy: SettingsCopy): { statusLabel: string; summary: string; tone: "neutral" | "ready" | "warning" } {
  if (input.isLoading) return { statusLabel: settingsText(copy, "读取中"), summary: settingsText(copy, "正在读取本地 Bungie 应用配置。"), tone: "neutral" };
  if (input.apiKey.trim() && input.clientId.trim() && input.clientSecret.trim() && input.redirectUri.trim()) return { statusLabel: settingsText(copy, "已配置"), summary: settingsText(copy, "接口配置与回调地址可用"), tone: "ready" };
  return { statusLabel: settingsText(copy, "未配置"), summary: settingsText(copy, "需要填写 Bungie API Key、Client ID 和 Secret。"), tone: "warning" };
}

function getAiUi(isConfigured: boolean, copy: SettingsCopy): { statusLabel: string; summary: string; tone: "ready" | "warning" } { return isConfigured ? { statusLabel: settingsText(copy, "已配置"), summary: settingsText(copy, "可用于装备分析、perk 解读和仓库建议。"), tone: "ready" } : { statusLabel: settingsText(copy, "未配置"), summary: settingsText(copy, "不影响本地账号和资料库功能"), tone: "warning" }; }
function getBackgroundTaskUi(tasks: BackgroundTaskSnapshot[], copy: SettingsCopy): { statusLabel: string; summary: string; tone: "neutral" | "warning" | "error" } { const active = tasks.filter((task) => task.status === "queued" || task.status === "running" || task.status === "retrying"); const failed = tasks.find((task) => task.status === "blocked" || task.status === "failed"); if (failed) return { statusLabel: settingsText(copy, "需关注"), summary: failed.title, tone: "error" }; if (active.length) return { statusLabel: `${active.length} ${settingsText(copy, "个运行中")}`, summary: active[0]?.title ?? settingsText(copy, "后台任务运行中"), tone: "warning" }; return { statusLabel: settingsText(copy, "空闲"), summary: settingsText(copy, "没有正在运行或阻断的任务。"), tone: "neutral" }; }
function getAppUpdateUi(snapshot: AppUpdateSnapshot | null, copy: SettingsCopy): { statusLabel: string; summary: string; tone: StatusTone } { if (!snapshot) return { statusLabel: settingsText(copy, "读取中"), summary: settingsText(copy, "正在读取更新状态。"), tone: "neutral" }; if (snapshot.status === "checking") return { statusLabel: settingsText(copy, "检查中"), summary: settingsText(copy, "正在连接更新服务。"), tone: "neutral" }; if (snapshot.status === "available") return { statusLabel: settingsText(copy, "发现新版本"), summary: `${settingsText(copy, "发现新版本")} ${snapshot.available_version ?? ""}${settingsText(copy, "可先下载，下载完成后再重启安装。")}`, tone: "ready" }; if (snapshot.status === "not_available") return { statusLabel: settingsText(copy, "已是最新"), summary: snapshot.user_message ?? snapshot.error ?? settingsText(copy, "当前已是最新版本。"), tone: "neutral" }; if (snapshot.status === "downloading") return { statusLabel: settingsText(copy, "下载中"), summary: snapshot.progress_percent === undefined ? settingsText(copy, "正在下载更新。") : `${settingsText(copy, "正在下载更新：")}${snapshot.progress_percent}%`, tone: "warning" }; if (snapshot.status === "downloaded") return { statusLabel: settingsText(copy, "等待重启"), summary: snapshot.user_message ?? `${settingsText(copy, "更新")} ${snapshot.downloaded_version ?? snapshot.available_version ?? ""} ${settingsText(copy, "已下载。")}`, tone: "ready" }; if (snapshot.status === "error") return { statusLabel: settingsText(copy, "更新受阻"), summary: snapshot.user_message ?? snapshot.error ?? settingsText(copy, "更新检查失败。"), tone: "error" }; return { statusLabel: settingsText(copy, "未检查"), summary: settingsText(copy, "尚未检查软件版本。"), tone: "neutral" }; }
function getLibraryUi(status: ManifestStatus | null, error: string, isLoading: boolean, copy: SettingsCopy): { statusLabel: string; summary: string; tone: StatusTone } { if (error) return { statusLabel: settingsText(copy, "检查失败"), summary: status?.initialized ? settingsText(copy, "未能检查新版；本地资料库仍可继续使用。") : error, tone: status?.initialized ? "warning" : "error" }; if (isLoading && !status) return { statusLabel: settingsText(copy, "检查中"), summary: settingsText(copy, "正在检查资料库是否有新版。"), tone: "neutral" }; if (!status || !status.initialized) return { statusLabel: settingsText(copy, "未准备"), summary: settingsText(copy, "资料库尚未准备，部分搜索和解析功能不可用。"), tone: "warning" }; if (status.missing_required_components?.length) return { statusLabel: settingsText(copy, "需修复"), summary: `${settingsText(copy, "资料库内容不完整，缺失")} ${status.missing_required_components.length} ${settingsText(copy, "项。")}`, tone: "warning" }; if (status.missing_optional_components?.length) return { statusLabel: settingsText(copy, "可用"), summary: `${settingsText(copy, "英文辅助数据缺失")} ${status.missing_optional_components.length} ${settingsText(copy, "项，英文匹配能力可能降低。")}`, tone: "warning" }; if (status.needs_update) return { statusLabel: settingsText(copy, "可更新"), summary: settingsText(copy, "发现新版资料库，将在后台更新。"), tone: "warning" }; return { statusLabel: settingsText(copy, "可用"), summary: settingsText(copy, "装备、perk、活动和商人数据可用。"), tone: "ready" }; }

function formatLibraryVersion(version?: string): string | undefined { const match = version?.match(/(?:^|\.)(\d{2})\.(\d{2})\.(\d{2})(?:\.|-)/); if (!match) return undefined; return `${Number(match[1]) < 80 ? 2000 + Number(match[1]) : 1900 + Number(match[1])}/${match[2]}/${match[3]}`; }
function formatLibraryIntegrity(status: ManifestStatus | null, copy: SettingsCopy): string { if (!status?.initialized) return settingsText(copy, "未准备"); if (status.missing_required_components?.length) return `${settingsText(copy, "缺失")} ${status.missing_required_components.length} ${settingsText(copy, "项，需修复")}`; if (status.missing_optional_components?.length) return `${settingsText(copy, "辅助数据缺失")} ${status.missing_optional_components.length} ${settingsText(copy, "项")}`; return settingsText(copy, "完整"); }
function formatDateTime(value: string | undefined, locale: InterfaceLocale, copy: SettingsCopy): string { if (!value) return settingsText(copy, "未读取"); const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(locale, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
function formatUpdateCheckedAt(value: string | undefined, locale: InterfaceLocale, copy: SettingsCopy): string { if (!value) return settingsText(copy, "未检查"); const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(locale, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
function formatAppUpdateProgress(snapshot: AppUpdateSnapshot | null): number { if (!snapshot) return 0; if (snapshot.status === "downloaded") return 100; return snapshot.status === "downloading" ? Math.max(8, Math.min(100, snapshot.progress_percent ?? 8)) : 0; }
function formatAccountSnapshot(accountSummary: AccountSummary | null, copy: SettingsCopy): string { return accountSummary ? `${settingsText(copy, "账号快照")} · ${settingsText(copy, "角色")} ${accountSummary.characters.length} · ${settingsText(copy, "仓库")} ${accountSummary.vault.item_count}` : settingsText(copy, "未读取账号"); }
function formatAccountLoadedAt(loadedAt: Date | null, accountSummary: AccountSummary | null, locale: InterfaceLocale, copy: SettingsCopy): string { if (!accountSummary) return settingsText(copy, "未读取"); if (!loadedAt) return settingsText(copy, "本次启动已读取"); return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(loadedAt); }
function formatActionLogTitle(entry: ActionLogEntry, copy: SettingsCopy): string { const labels: Record<string, string> = { "set-lock": settingsText(copy, "锁定状态"), equip: settingsText(copy, "装备"), "insert-socket-plug": settingsText(copy, "切换武器 Perk"), transfer: settingsText(copy, "仓库转移"), "postmaster-pull": settingsText(copy, "邮政官取回"), "loadout-equip": settingsText(copy, "应用游戏内配装栏"), "loadout-snapshot": settingsText(copy, "覆盖游戏内配装栏") }; return [entry.ok ? settingsText(copy, "成功") : settingsText(copy, "失败"), labels[entry.action], entry.item_name].filter(Boolean).join(" / "); }
function filteredActionLog(entries: ActionLogEntry[], result: SettingsActionLogResultFilter, action: SettingsActionLogTypeFilter): ActionLogEntry[] { return entries.filter((entry) => (result === "all" || (result === "success") === entry.ok) && (action === "all" || entry.action === action)); }
function interfaceLocaleToBungieLocale(locale: SettingsLanguagePreferences["interfaceLocale"]): SettingsLanguagePreferences["bungieLocale"] { return locale === "en-US" ? "en" : "zh-chs"; }
