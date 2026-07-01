import { useEffect, useState } from "react";
import { api, type AccountSummary, type ActionLogEntry, type BackgroundTaskSnapshot, type ManifestStatus, type UpdateSnapshot } from "../../api/client";
import { AiSettingsPanel } from "../../components/AiSettingsPanel";

export type SettingsActionLogResultFilter = "all" | "success" | "failed";
export type SettingsActionLogTypeFilter = ActionLogEntry["action"] | "all";

type SettingsSectionKey = "overview" | "account" | "library" | "bungie" | "ai" | "backup" | "diagnostics";

const settingsMenu: Array<{ key: SettingsSectionKey; label: string; hint: string }> = [
  { key: "overview", label: "总览", hint: "状态、常用操作" },
  { key: "account", label: "账号", hint: "授权、读取、切换预留" },
  { key: "library", label: "资料库", hint: "版本、检查、修复" },
  { key: "bungie", label: "Bungie", hint: "接口配置" },
  { key: "ai", label: "AI 助手", hint: "模型、上下文、安全边界" },
  { key: "backup", label: "备份迁移", hint: "数据目录、导入导出" },
  { key: "diagnostics", label: "诊断日志", hint: "运行检查和事件记录" }
];

export function SettingsPage(props: {
  message: string;
  error: string;
  diagnosticDataDir: string;
  writeActionsEnabled: boolean;
  updateSnapshot: UpdateSnapshot | null;
  manifestStatus: ManifestStatus | null;
  manifestStatusError: string;
  isLoadingManifestStatus: boolean;
  isInitializingManifest: boolean;
  accountSummary: AccountSummary | null;
  accountError: string;
  isLoadingAccount: boolean;
  lastAccountLoadedAt: Date | null;
  isAiConfigured: boolean;
  onRefreshAccount: () => void;
  onReauthorizeAccount: () => void;
  backgroundTasks: BackgroundTaskSnapshot[];
  actionLog: ActionLogEntry[];
  actionLogResultFilter: SettingsActionLogResultFilter;
  actionLogTypeFilter: SettingsActionLogTypeFilter;
  onAiSettingsSaved: () => void;
  onOpenDataDir: () => void;
  onWriteActionsEnabledChange: (enabled: boolean) => void;
  onCheckForUpdates: () => void;
  onDownloadUpdate: () => void;
  onQuitAndInstallUpdate: () => void;
  onOpenUpdateDownloadPage: () => void;
  onCopyUpdateDiagnostic: () => void;
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
}) {
  const initialSection = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_D2_VISUAL_SETTINGS_SECTION ?? "overview") as SettingsSectionKey;
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
  const updateUi = getUpdateUi(props.updateSnapshot);
  const updateProgress = formatUpdateProgress(props.updateSnapshot);
  const libraryUi = getLibraryUi(props.manifestStatus, props.manifestStatusError, props.isLoadingManifestStatus);
  const accountUi = getAccountUi(props.accountSummary, props.accountError, props.isLoadingAccount);
  const libraryVersion = formatLibraryVersion(props.manifestStatus?.version);
  const bungieUi = getBungieUi({
    isLoading: isLoadingBungieConfig,
    apiKey: bungieApiKey,
    clientId: bungieClientId,
    clientSecret: bungieClientSecret,
    redirectUri: bungieRedirectUri
  });
  const aiUi = getAiUi(props.isAiConfigured);
  const backgroundTaskUi = getBackgroundTaskUi(props.backgroundTasks);

  useEffect(() => {
    let cancelled = false;
    setBungieError("");

    async function loadBungieConfig() {
      try {
        const config = await api.getConfig();
        if (cancelled) return;
        setBungieApiKey(config.bungie.api_key);
        setBungieClientId(config.bungie.client_id);
        setBungieClientSecret(config.bungie.client_secret);
        setBungieRedirectUri(config.bungie.redirect_uri);
      } catch (error) {
        if (cancelled) return;
        setBungieError(error instanceof Error ? error.message : "Bungie 配置读取失败");
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
      const current = await api.getConfig();
      await api.saveConfig({
        ...current,
        bungie: {
          ...current.bungie,
          api_key: bungieApiKey.trim(),
          client_id: bungieClientId.trim(),
          client_secret: bungieClientSecret.trim(),
          redirect_uri: bungieRedirectUri.trim() || "https://127.0.0.1:28780/oauth/callback"
        }
      });
      setBungieMessage("Bungie 配置已保存。");
    } catch (error) {
      setBungieError(error instanceof Error ? error.message : "Bungie 配置保存失败");
    } finally {
      setIsSavingBungieConfig(false);
    }
  }

  return (
    <section className="app-page settings-app-page">
      {props.message ? <p className="status-message status-ready">{props.message}</p> : null}
      {props.error ? <p className="status-message status-error">{props.error}</p> : null}

      <div className="app-settings-shell">
        <aside className="app-panel settings-menu" aria-label="设置菜单">
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
        </aside>

        <div className="settings-content">
          <section className={activeSection === "overview" ? "settings-detail active" : "settings-detail"} id="settings-overview">
            <section className="app-panel app-setting-group">
              <div className="app-section-title">
                <div>
                  <h2>设置总览</h2>
                  <span>只展示会影响今天使用的状态</span>
                </div>
                <span className="app-chip status-neutral">核心状态</span>
              </div>
              <div className="app-settings-grid">
                <div className={`app-metric status-${accountUi.tone}`}>
                  <span>账号</span>
                  <strong>{accountUi.statusLabel}</strong>
                  <span>{accountUi.summary}</span>
                </div>
                <div className={`app-metric status-${libraryUi.tone}`}>
                  <span>资料库</span>
                  <strong>{libraryVersion ?? libraryUi.statusLabel}</strong>
                  <span>{libraryUi.summary}</span>
                </div>
                <div className={`app-metric status-${bungieUi.tone}`}>
                  <span>Bungie</span>
                  <strong>{bungieUi.statusLabel}</strong>
                  <span>{bungieUi.summary}</span>
                </div>
                <div className={`app-metric status-${aiUi.tone}`}>
                  <span>AI 助手</span>
                  <strong>{aiUi.statusLabel}</strong>
                  <span>{aiUi.summary}</span>
                </div>
                <div className={`app-metric status-${updateUi.tone}`}>
                  <span>应用版本</span>
                  <strong>{props.updateSnapshot?.current_version ?? "未读取"}</strong>
                  <span>{updateUi.statusLabel}</span>
                </div>
                <div className={`app-metric status-${backgroundTaskUi.tone}`}>
                  <span>后台任务</span>
                  <strong>{backgroundTaskUi.statusLabel}</strong>
                  <span>{backgroundTaskUi.summary}</span>
                </div>
              </div>
            </section>

            <section className={`app-panel app-setting-group update-${updateUi.tone}`} id="settings-updates">
              <div className="app-section-title">
                <div>
                  <h2>应用更新</h2>
                  <span>{updateUi.summary}</span>
                </div>
                <span className={`app-chip status-${updateUi.tone}`}>{updateUi.statusLabel}</span>
              </div>
              <div className="app-metric-grid">
                <div className="app-metric status-neutral">
                  <span>应用版本</span>
                  <strong>{props.updateSnapshot?.current_version ?? "未读取"}</strong>
                  <span>当前安装版本</span>
                </div>
                <div className="app-metric status-neutral">
                  <span>更新来源</span>
                  <strong>{props.updateSnapshot?.update_source_label ?? "GitHub Release"}</strong>
                  <span>GitHub 连接失败时可打开下载页手动处理</span>
                </div>
                <div className="app-metric status-neutral">
                  <span>上次检查</span>
                  <strong>{formatUpdateCheckedAt(props.updateSnapshot?.last_checked_at)}</strong>
                  <span>应用更新检查时间</span>
                </div>
              </div>
              {updateProgress > 0 ? (
                <div className="update-progress-bar" aria-label="更新下载进度">
                  <span style={{ width: `${updateProgress}%` }} />
                </div>
              ) : null}
              <div className="button-row settings-update-actions">
                <button type="button" className="secondary-button" disabled={props.updateSnapshot?.status === "checking"} onClick={props.onCheckForUpdates}>检查更新</button>
                <button type="button" className="secondary-button" disabled={props.updateSnapshot?.status !== "available"} onClick={props.onDownloadUpdate}>下载更新</button>
                <button type="button" disabled={props.updateSnapshot?.status !== "downloaded"} onClick={props.onQuitAndInstallUpdate}>重启并安装</button>
                <button type="button" className="secondary-button" onClick={props.onOpenUpdateDownloadPage}>打开下载页</button>
                <button type="button" className="secondary-button" onClick={props.onCopyUpdateDiagnostic}>复制更新诊断</button>
              </div>
            </section>

            <section className="app-panel app-setting-group">
              <div className="app-section-title">
                <h2>常用操作</h2>
                <span>不会触发危险写操作</span>
              </div>
              <div className="app-setting-row">
                <div>
                  <strong>管理账号</strong>
                  <span>查看当前账号、刷新读取状态，并为后续切换账号预留入口。</span>
                </div>
                <button type="button" className="secondary-button" onClick={props.onRefreshAccount}>刷新账号</button>
              </div>
              <div className="app-setting-row">
                <div>
                  <strong>检查资料库更新</strong>
                  <span>手动检查不受“每天自动检查一次”限制。</span>
                </div>
                <button type="button" className="secondary-button" disabled={props.isLoadingManifestStatus} onClick={props.onRefreshManifestStatus}>检查更新</button>
              </div>
              <div className="app-setting-row">
                <div>
                  <strong>运行诊断</strong>
                  <span>检查账号、资料库、后台任务和本地数据目录。</span>
                </div>
                <button type="button" className="secondary-button" onClick={() => setActiveSection("diagnostics")}>查看诊断</button>
              </div>
            </section>
          </section>

          <section className={activeSection === "account" ? "settings-detail active" : "settings-detail"} id="settings-account">
            <section className="app-panel app-setting-group">
              <div className="app-section-title">
                <div>
                  <h2>账号</h2>
                  <span>当前账号、授权状态和后续切换账号入口。</span>
                </div>
                <span className={`app-chip status-${accountUi.tone}`}>{accountUi.statusLabel}</span>
              </div>
              <div className="app-metric-grid">
                <div className={`app-metric status-${accountUi.tone}`}>
                  <span>当前账号</span>
                  <strong>{props.accountSummary?.account_name ?? "未登录"}</strong>
                  <span>{props.accountSummary ? "Bungie 账号已授权" : "登录后可读取账号"}</span>
                </div>
                <div className={`app-metric status-${accountUi.tone}`}>
                  <span>账号读取</span>
                  <strong>{accountUi.statusLabel}</strong>
                  <span>{accountUi.summary}</span>
                </div>
                <div className="app-metric status-neutral">
                  <span>上次更新</span>
                  <strong>{formatAccountLoadedAt(props.lastAccountLoadedAt, props.accountSummary)}</strong>
                  <span>成功刷新账号资料的时间</span>
                </div>
                <div className="app-metric status-neutral">
                  <span>更新规则</span>
                  <strong>启动自动读取一次</strong>
                  <span>手动刷新、重新授权和切换账号不受限制</span>
                </div>
              </div>
              <div className="library-version-table">
                <div className="version-row"><span>当前账号</span><strong>{props.accountSummary?.account_name ?? "未登录"}</strong></div>
                <div className="version-row"><span>当前版本</span><strong>{formatAccountSnapshot(props.accountSummary)}</strong></div>
                <div className="version-row"><span>最新版本</span><strong>{props.accountSummary ? "已是当前读取结果" : "等待读取账号"}</strong></div>
                <div className="version-row"><span>上次检查</span><strong>{formatAccountLoadedAt(props.lastAccountLoadedAt, props.accountSummary)}</strong></div>
                <div className="version-row"><span>打开应用时</span><strong>自动读取一次当前账号，避免每次进页面都重复加载</strong></div>
                <div className="version-row"><span>需要重新读取时</span><strong>首次登录、重新授权、切换账号或本地记录不可用时会重新读取；失败时保留上次成功结果</strong></div>
                <div className="version-row"><span>手动操作</span><strong>刷新账号、重新授权、管理账号和未来切换账号始终立即执行</strong></div>
                <div className="version-row"><span>默认账号</span><strong>当前账号；切换账号功能上线后可修改</strong></div>
              </div>
              <div className={`app-setting-row status-${props.writeActionsEnabled ? "ready" : "neutral"}`}>
                <div><strong>装备写操作</strong><span>{props.writeActionsEnabled ? "已开启，允许锁定、装备和转移。" : "已关闭，写操作会被阻断。"}</span></div>
                <label className="switch-row">
                  <input checked={props.writeActionsEnabled} type="checkbox" onChange={(event) => props.onWriteActionsEnabledChange(event.target.checked)} />
                  允许
                </label>
              </div>
              <div className="button-row">
                <button type="button" onClick={props.onRefreshAccount} disabled={props.isLoadingAccount}>刷新账号</button>
                <button type="button" className="secondary-button" onClick={props.onReauthorizeAccount}>重新授权</button>
              </div>
            </section>
          </section>

          <section className={activeSection === "library" ? "settings-detail active" : "settings-detail"} id="settings-library">
            <section className={`app-panel app-setting-group app-settings-wide manifest-${libraryUi.tone} library-${libraryUi.tone}`} id="settings-manifest">
              <div className="app-section-title">
                <div>
                  <h2>资料库</h2>
                  <span>装备、perk、活动和商人数据。</span>
                </div>
                <span className={`app-chip status-${libraryUi.tone}`}>{libraryUi.statusLabel}</span>
              </div>
              <div className="app-metric-grid">
                <div className={`app-metric status-${libraryUi.tone}`}>
                  <span>资料库日期</span>
                  <strong>{libraryVersion ?? "未读取"}</strong>
                  <span>从完整版本号解析，顶部状态栏显示</span>
                </div>
                <div className={`app-metric status-${props.manifestStatus?.missing_required_components?.length ? "warning" : "ready"}`}>
                  <span>资料完整性</span>
                  <strong>{formatLibraryIntegrity(props.manifestStatus)}</strong>
                  <span>用于搜索和详情判断</span>
                </div>
                <div className="app-metric status-neutral">
                  <span>上次更新</span>
                  <strong>{formatDateTime(props.manifestStatus?.cached_at)}</strong>
                  <span>成功重建资料库的时间</span>
                </div>
                <div className="app-metric status-neutral">
                  <span>更新规则</span>
                  <strong>每天自动检查一次</strong>
                  <span>手动检查、立即更新和修复不受限制</span>
                </div>
              </div>
              <div className="library-version-table">
                <div className="version-row"><span>资料库版本</span><strong>{libraryVersion ?? "未读取"}</strong></div>
                <div className="version-row"><span>当前版本</span><strong>{props.manifestStatus?.version ?? "未初始化"}</strong></div>
                <div className="version-row"><span>最新版本</span><strong>{props.manifestStatus?.latest_version ?? "等待检查"}</strong></div>
                <div className="version-row"><span>上次检查</span><strong>{formatDateTime(props.manifestStatus?.checked_at)}</strong></div>
                <div className="version-row"><span>自动检查</span><strong>启动后或打开资料库状态时触发；同一本地日期只自动检查一次</strong></div>
                <div className="version-row"><span>自动更新</span><strong>未初始化、不完整或发现新版时后台更新；失败时保留旧资料库</strong></div>
                <div className="version-row"><span>手动操作</span><strong>检查更新、立即更新、修复资料库始终立即执行</strong></div>
              </div>
              <div className="button-row">
                <button type="button" className="secondary-button" disabled={props.isLoadingManifestStatus} onClick={props.onRefreshManifestStatus}>检查更新</button>
                <button type="button" disabled={props.isInitializingManifest} onClick={props.onInitializeManifest}>
                  {props.isInitializingManifest ? "更新中..." : "立即更新"}
                </button>
                <button type="button" className="secondary-button" disabled={props.isInitializingManifest} onClick={props.onRepairManifest}>修复资料库</button>
              </div>
            </section>
          </section>

          <section className={activeSection === "bungie" ? "settings-detail active" : "settings-detail"} id="settings-bungie">
            <section className="app-panel app-setting-group">
              <div className="app-section-title">
                <h2>Bungie 接口配置</h2>
                <span>应用级接口，不等同于当前账号</span>
              </div>
              <section className="config-help-card" aria-label="Bungie 配置填写说明">
                <h3>不知道填哪个？</h3>
                <p>在 Bungie 应用页面里这样对应：</p>
                <dl className="config-map">
                  <div><dt>应用程序介面金钥</dt><dd>Bungie API Key</dd></div>
                  <div><dt>开放授权 client_id</dt><dd>Bungie Client ID</dd></div>
                  <div><dt>开放授权 client_secret</dt><dd>Bungie Client Secret</dd></div>
                </dl>
                <p>
                  不要填写“开放授权之授权 URI”，那是 Bungie 自动生成的授权地址。本工具回调地址固定是：
                  <code>https://127.0.0.1:28780/oauth/callback</code>
                </p>
              </section>
              <div className="config-field-stack">
                <label className="config-field">
                  Bungie API Key
                  <input
                    disabled={isLoadingBungieConfig || isSavingBungieConfig}
                    placeholder="复制 Bungie 页面里的“应用程序介面金钥”"
                    value={bungieApiKey}
                    onChange={(event) => setBungieApiKey(event.target.value)}
                  />
                </label>
                <label className="config-field">
                  Bungie Client ID
                  <input
                    disabled={isLoadingBungieConfig || isSavingBungieConfig}
                    placeholder="复制 Bungie 页面里的“开放授权 client_id”"
                    value={bungieClientId}
                    onChange={(event) => setBungieClientId(event.target.value)}
                  />
                </label>
                <label className="config-field">
                  Bungie Client Secret
                  <input
                    disabled={isLoadingBungieConfig || isSavingBungieConfig}
                    placeholder="复制 Bungie 页面里的“开放授权 client_secret”"
                    type="password"
                    value={bungieClientSecret}
                    onChange={(event) => setBungieClientSecret(event.target.value)}
                  />
                </label>
                <label className="config-field">
                  回调地址
                  <input disabled value={bungieRedirectUri} onChange={(event) => setBungieRedirectUri(event.target.value)} />
                </label>
                <label className="config-field">
                  数据目录
                  <input disabled value={props.diagnosticDataDir || "未读取到配置目录"} />
                </label>
              </div>
              <div className="button-row">
                <button type="button" disabled={isLoadingBungieConfig || isSavingBungieConfig} onClick={() => void saveBungieConfig()}>
                  {isSavingBungieConfig ? "保存中..." : "保存配置"}
                </button>
                <button type="button" className="secondary-button" onClick={props.onOpenDataDir}>打开数据目录</button>
              </div>
              {bungieError ? <p className="status-message status-error">{bungieError}</p> : null}
              {bungieMessage ? <p className="status-message status-ready">{bungieMessage}</p> : null}
            </section>
          </section>

          <section className={activeSection === "ai" ? "settings-detail active" : "settings-detail"} id="settings-ai">
            <section className="app-panel app-setting-group settings-ai-section">
              <div className="app-section-title">
                <h2>AI 助手</h2>
                <span>可选能力，不阻断本地功能</span>
              </div>
              <AiSettingsPanel onSaved={props.onAiSettingsSaved} />
            </section>
          </section>

          <section className={activeSection === "backup" ? "settings-detail active" : "settings-detail"} id="settings-backup">
            <section className="app-panel app-setting-group">
              <div className="app-section-title">
                <h2>数据备份与迁移</h2>
                <span>低频但需要可发现</span>
              </div>
              <div className="app-setting-row">
                <div><strong>数据目录</strong><span>{props.diagnosticDataDir || "未读取到配置目录"}</span></div>
                <button type="button" className="secondary-button" onClick={props.onOpenDataDir}>打开</button>
              </div>
              <div className="app-setting-row">
                <div><strong>导出配置</strong><span>导出不包含账号令牌的本地偏好设置。</span></div>
                <button type="button" className="secondary-button" onClick={props.onExportConfig}>导出</button>
              </div>
              <div className="app-setting-row">
                <div><strong>导入配置</strong><span>迁移电脑时先关闭应用，再用备份覆盖数据目录。</span></div>
                <button type="button" className="secondary-button" onClick={props.onImportConfig}>导入</button>
              </div>
              <div className="app-setting-row">
                <div><strong>清理缓存</strong><span>清理临时缓存，不删除账号授权、设置和本地标记。</span></div>
                <button type="button" className="secondary-button" onClick={props.onClearCache}>清理</button>
              </div>
              <div className="app-setting-row">
                <div><strong>迁移说明</strong><span>覆盖安装或换电脑前，先关闭 d2-tools，再复制整个本地数据目录。</span></div>
                <button type="button" className="secondary-button" onClick={props.onCopyDataBackupGuide}>复制备份/迁移说明</button>
              </div>
            </section>
          </section>

          <section className={activeSection === "diagnostics" ? "settings-detail active" : "settings-detail"} id="settings-diagnostics">
            <section className="app-panel app-setting-group">
              <div className="app-section-title">
                <div>
                  <h2>诊断与操作日志</h2>
                  <span>默认展示最近关键事件</span>
                </div>
                <div className="button-row">
                  <button type="button" className="secondary-button" onClick={props.onRefreshDiagnostics}>运行诊断</button>
                  <button type="button" className="secondary-button" onClick={props.onRefreshActionLog}>刷新日志</button>
                </div>
              </div>
              <div className="app-setting-row">
                <div>
                  <strong>诊断摘要</strong>
                  <span>检查账号、资料库、后台任务和本地数据目录；异常信息可复制为脱敏诊断。</span>
                </div>
                <button type="button" className="secondary-button" onClick={props.onCopyDiagnosticsExport}>复制脱敏诊断</button>
              </div>
              <div className="settings-diagnostics-toolbar">
                <label className="compact-field">
                  结果
                  <select value={props.actionLogResultFilter} onChange={(event) => props.onActionLogResultFilterChange(event.target.value as SettingsActionLogResultFilter)}>
                    <option value="all">全部</option>
                    <option value="success">成功</option>
                    <option value="failed">失败</option>
                  </select>
                </label>
                <label className="compact-field">
                  类型
                  <select value={props.actionLogTypeFilter} onChange={(event) => props.onActionLogTypeFilterChange(event.target.value as SettingsActionLogTypeFilter)}>
                    <option value="all">全部</option>
                    <option value="set-lock">锁定状态</option>
                    <option value="equip">装备</option>
                    <option value="transfer">仓库转移</option>
                    <option value="postmaster-pull">邮政官取回</option>
                    <option value="loadout-equip">应用游戏内配装栏</option>
                    <option value="loadout-snapshot">覆盖游戏内配装栏</option>
                  </select>
                </label>
              </div>
              {visibleActionLog.length ? (
                <div className="app-log-list">
                  {visibleActionLog.map((entry) => (
                    <div className={`app-log-row settings-log-row ${entry.ok ? "is-success" : "is-failed"}`} key={entry.id}>
                      <div>
                        <strong>{formatActionLogTitle(entry)}</strong>
                        <span>{new Date(entry.created_at).toLocaleString("zh-CN")}</span>
                      </div>
                      <small>{entry.message ?? "-"}</small>
                      {!entry.ok ? <button type="button" className="inline-action" onClick={() => props.onCopyActionDiagnostic(entry)}>复制诊断</button> : null}
                    </div>
                  ))}
                </div>
              ) : <p className="status-message status-neutral">还没有写操作记录。</p>}
            </section>
          </section>
        </div>
      </div>
    </section>
  );
}

function getAccountUi(
  accountSummary: AccountSummary | null,
  error: string,
  isLoading: boolean
): { statusLabel: string; summary: string; tone: "neutral" | "ready" | "warning" | "error" } {
  if (error) return { statusLabel: "读取失败", summary: error, tone: "error" };
  if (isLoading) return { statusLabel: "读取中", summary: "正在读取账号和仓库。", tone: "warning" };
  if (accountSummary) {
    return {
      statusLabel: "已读取",
      summary: `角色 ${accountSummary.characters.length} 个，仓库 ${accountSummary.vault.item_count} 件`,
      tone: "ready"
    };
  }
  return { statusLabel: "未登录", summary: "登录后可读取角色和仓库。", tone: "neutral" };
}

function getBungieUi(input: {
  isLoading: boolean;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): { statusLabel: string; summary: string; tone: "neutral" | "ready" | "warning" } {
  if (input.isLoading) {
    return { statusLabel: "读取中", summary: "正在读取本地 Bungie 应用配置。", tone: "neutral" };
  }

  const isConfigured = Boolean(
    input.apiKey.trim()
      && input.clientId.trim()
      && input.clientSecret.trim()
      && input.redirectUri.trim()
  );
  if (isConfigured) {
    return { statusLabel: "已配置", summary: "接口配置与回调地址可用", tone: "ready" };
  }

  return { statusLabel: "未配置", summary: "需要填写 Bungie API Key、Client ID 和 Secret。", tone: "warning" };
}

function getAiUi(isConfigured: boolean): { statusLabel: string; summary: string; tone: "ready" | "warning" } {
  if (isConfigured) {
    return { statusLabel: "已配置", summary: "可用于装备分析、perk 解读和仓库建议。", tone: "ready" };
  }

  return { statusLabel: "未配置", summary: "不影响本地账号和资料库功能", tone: "warning" };
}

function getBackgroundTaskUi(tasks: BackgroundTaskSnapshot[]): { statusLabel: string; summary: string; tone: "neutral" | "warning" | "error" } {
  const activeTasks = tasks.filter((task) => task.status === "queued" || task.status === "running" || task.status === "retrying");
  const blockedOrFailed = tasks.find((task) => task.status === "blocked" || task.status === "failed");

  if (blockedOrFailed) {
    return {
      statusLabel: "需关注",
      summary: blockedOrFailed.title,
      tone: "error"
    };
  }

  if (activeTasks.length) {
    return {
      statusLabel: `${activeTasks.length} 个运行中`,
      summary: activeTasks[0]?.title ?? "后台任务运行中",
      tone: "warning"
    };
  }

  return { statusLabel: "空闲", summary: "没有正在运行或阻断的任务。", tone: "neutral" };
}

function formatAccountSnapshot(accountSummary: AccountSummary | null): string {
  if (!accountSummary) return "未读取账号";
  return `账号快照 · 角色 ${accountSummary.characters.length} · 仓库 ${accountSummary.vault.item_count}`;
}

function formatAccountLoadedAt(loadedAt: Date | null, accountSummary: AccountSummary | null): string {
  if (!accountSummary) return "未读取";
  if (!loadedAt) return "本次启动已读取";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(loadedAt);
}

function getUpdateUi(snapshot: UpdateSnapshot | null): { statusLabel: string; summary: string; tone: "neutral" | "ready" | "warning" | "error" } {
  if (!snapshot) {
    return { statusLabel: "读取中", summary: "正在读取更新状态。", tone: "neutral" };
  }

  if (snapshot.status === "checking") {
    return { statusLabel: "检查中", summary: "正在连接更新服务。", tone: "neutral" };
  }

  if (snapshot.status === "available") {
    return {
      statusLabel: "发现新版本",
      summary: `发现新版本 ${snapshot.available_version ?? ""}，可先下载，下载完成后再重启安装。`,
      tone: "ready"
    };
  }

  if (snapshot.status === "not_available") {
    return {
      statusLabel: "已是最新",
      summary: snapshot.user_message ?? snapshot.error ?? "当前已是最新版本。",
      tone: "neutral"
    };
  }

  if (snapshot.status === "downloading") {
    return {
      statusLabel: "下载中",
      summary: snapshot.progress_percent === undefined
        ? "正在下载更新。"
        : `正在下载更新：${snapshot.progress_percent}%`,
      tone: "warning"
    };
  }

  if (snapshot.status === "downloaded") {
    return {
      statusLabel: "等待重启",
      summary: snapshot.user_message ?? `更新 ${snapshot.downloaded_version ?? snapshot.available_version ?? ""} 已下载。`,
      tone: "ready"
    };
  }

  if (snapshot.status === "error") {
    return {
      statusLabel: "更新受阻",
      summary: snapshot.user_message ?? snapshot.error ?? "更新检查失败。",
      tone: "error"
    };
  }

  return { statusLabel: "未检查", summary: "尚未检查更新。", tone: "neutral" };
}

function getLibraryUi(
  status: ManifestStatus | null,
  error: string,
  isLoading: boolean
): { statusLabel: string; summary: string; tone: "neutral" | "ready" | "warning" | "error" } {
  if (error) {
    return { statusLabel: "检查失败", summary: status?.initialized ? "未能检查新版；本地资料库仍可继续使用。" : error, tone: status?.initialized ? "warning" : "error" };
  }
  if (isLoading && !status) {
    return { statusLabel: "检查中", summary: "正在检查资料库是否有新版。", tone: "neutral" };
  }
  if (!status || !status.initialized) {
    return { statusLabel: "未准备", summary: "资料库尚未准备，部分搜索和解析功能不可用。", tone: "warning" };
  }
  if (status.missing_required_components?.length) {
    return {
      statusLabel: "需修复",
      summary: `资料库内容不完整，缺失 ${status.missing_required_components.length} 项。`,
      tone: "warning"
    };
  }
  if (status.needs_update) {
    return {
      statusLabel: "可更新",
      summary: "发现新版资料库，将在后台更新。",
      tone: "warning"
    };
  }
  return { statusLabel: "可用", summary: "装备、perk、活动和商人数据可用。", tone: "ready" };
}

function formatLibraryVersion(version?: string): string | undefined {
  if (!version) return undefined;
  const match = version.match(/(?:^|\.)(\d{2})\.(\d{2})\.(\d{2})(?:\.|-)/);
  if (!match) return undefined;
  const yearNumber = Number(match[1]);
  const fullYear = yearNumber < 80 ? 2000 + yearNumber : 1900 + yearNumber;
  return `${fullYear}/${match[2]}/${match[3]}`;
}

function formatLibraryIntegrity(status: ManifestStatus | null): string {
  if (!status?.initialized) return "未准备";
  const missingCount = status.missing_required_components?.length ?? 0;
  if (missingCount > 0) return `缺失 ${missingCount} 项，需修复`;
  return "完整";
}

function formatDateTime(value?: string): string {
  if (!value) return "未读取";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatUpdateCheckedAt(value?: string): string {
  if (!value) return "未检查";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatUpdateProgress(snapshot: UpdateSnapshot | null): number {
  if (!snapshot) return 0;
  if (snapshot.status === "downloaded") return 100;
  if (snapshot.status === "downloading") return Math.max(8, Math.min(100, snapshot.progress_percent ?? 8));
  return 0;
}

function formatActionLogTitle(entry: ActionLogEntry): string {
  const actionLabels: Record<ActionLogEntry["action"], string> = {
    "set-lock": "锁定状态",
    equip: "装备",
    transfer: "仓库转移",
    "postmaster-pull": "邮政官取回",
    "loadout-equip": "应用游戏内配装栏",
    "loadout-snapshot": "覆盖游戏内配装栏"
  };

  return [
    entry.ok ? "成功" : "失败",
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
