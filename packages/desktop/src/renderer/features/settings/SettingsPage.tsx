import type { ActionLogEntry, BackgroundTaskSnapshot, ManifestStatus, UpdateSnapshot } from "../../api/client";
import { AiSettingsPanel } from "../../components/AiSettingsPanel";

export type SettingsActionLogResultFilter = "all" | "success" | "failed";
export type SettingsActionLogTypeFilter = ActionLogEntry["action"] | "all";

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
  backgroundTasks: BackgroundTaskSnapshot[];
  actionLog: ActionLogEntry[];
  actionLogResultFilter: SettingsActionLogResultFilter;
  actionLogTypeFilter: SettingsActionLogTypeFilter;
  onAiSettingsSaved: () => void;
  onOpenConfig: () => void;
  onWriteActionsEnabledChange: (enabled: boolean) => void;
  onCheckForUpdates: () => void;
  onDownloadUpdate: () => void;
  onQuitAndInstallUpdate: () => void;
  onOpenUpdateDownloadPage: () => void;
  onCopyUpdateDiagnostic: () => void;
  onRefreshManifestStatus: () => void;
  onInitializeManifest: () => void;
  onCopyDataBackupGuide: () => void;
  onCopyDiagnosticsExport: () => void;
  onRefreshActionLog: () => void;
  onActionLogResultFilterChange: (filter: SettingsActionLogResultFilter) => void;
  onActionLogTypeFilterChange: (filter: SettingsActionLogTypeFilter) => void;
  onCopyActionDiagnostic: (entry: ActionLogEntry) => void;
}) {
  const visibleActionLog = filteredActionLog(
    props.actionLog,
    props.actionLogResultFilter,
    props.actionLogTypeFilter
  ).slice(0, 8);
  const updateUi = getUpdateUi(props.updateSnapshot);
  const manifestUi = getManifestUi(props.manifestStatus, props.manifestStatusError, props.isLoadingManifestStatus);

  return (
    <section className="app-page settings-app-page">
      <div className="app-page-head">
        <div>
          <h1>设置中心</h1>
          <p>查看或修改 Bungie 配置、AI、写操作开关、本地日志、更新和备份迁移。</p>
        </div>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={props.onCopyDiagnosticsExport}>
            复制诊断
          </button>
          <button type="button" onClick={props.onOpenConfig}>
            打开配置
          </button>
        </div>
      </div>
      {props.message ? <p className="status-message status-ready">{props.message}</p> : null}
      {props.error ? <p className="status-message status-error">{props.error}</p> : null}

      <div className="app-settings-grid">
        <section id="settings-core" className="app-panel app-setting-group">
          <div className="app-section-title">
            <div>
              <h2>关键配置</h2>
              <span>影响应用可用性</span>
            </div>
          </div>
          <div className="app-setting-row">
            <div>
              <strong>本地数据目录</strong>
              <span>{props.diagnosticDataDir || "未读取到配置目录"}</span>
            </div>
            <button type="button" className="secondary-button" onClick={props.onOpenConfig}>
              打开
            </button>
          </div>
          <div className={`app-setting-row status-${props.writeActionsEnabled ? "ready" : "neutral"}`}>
            <div>
              <strong>装备写操作</strong>
              <span>{props.writeActionsEnabled ? "已开启，允许锁定、装备和转移。" : "已关闭，写操作会被阻断。"}</span>
            </div>
            <label className="switch-row">
              <input
                checked={props.writeActionsEnabled}
                type="checkbox"
                onChange={(event) => props.onWriteActionsEnabledChange(event.target.checked)}
              />
              允许
            </label>
          </div>
          <div id="settings-backup" className="app-setting-row">
            <div>
              <strong>数据备份与迁移</strong>
              <span>覆盖安装或换电脑前，先关闭 d2-tools，再复制整个本地数据目录。</span>
            </div>
            <button type="button" className="secondary-button" onClick={props.onCopyDataBackupGuide}>
              复制备份/迁移说明
            </button>
          </div>
        </section>

        <aside id="settings-updates" className={`app-panel app-setting-group update-${updateUi.tone}`}>
          <div className="app-section-title">
            <div>
              <h2>更新状态</h2>
              <span>自动后台重试</span>
            </div>
            <span className={`app-chip status-${updateUi.tone}`}>{updateUi.statusLabel}</span>
          </div>
          <p className="app-muted">{updateUi.summary}</p>
          {props.updateSnapshot?.status === "downloading" ? (
            <div
              className="update-progress-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={props.updateSnapshot.progress_percent ?? 0}
            >
              <span style={{ width: `${props.updateSnapshot.progress_percent ?? 8}%` }} />
            </div>
          ) : null}
          <div className="app-metric-grid">
            <div className="app-metric status-neutral">
              <span>应用版本</span>
              <strong>{props.updateSnapshot?.current_version ?? "未读取"}</strong>
              <span>当前安装版本</span>
            </div>
            <div className="app-metric status-neutral">
              <span>可用版本</span>
              <strong>{props.updateSnapshot?.available_version ?? props.updateSnapshot?.downloaded_version ?? "未发现"}</strong>
              <span>GitHub Releases</span>
            </div>
            <div className="app-metric status-neutral">
              <span>更新来源</span>
              <strong>{props.updateSnapshot?.update_source_label ?? "GitHub Releases"}</strong>
              <span>可配置镜像源</span>
            </div>
            <div className="app-metric status-neutral">
              <span>上次检查</span>
              <strong>{formatUpdateCheckedAt(props.updateSnapshot?.last_checked_at)}</strong>
              <span>失败会后台重试</span>
            </div>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="secondary-button"
              disabled={props.updateSnapshot?.status === "checking" || props.updateSnapshot?.status === "downloading"}
              onClick={props.onCheckForUpdates}
            >
              检查更新
            </button>
            <button type="button" disabled={props.updateSnapshot?.status !== "available"} onClick={props.onDownloadUpdate}>
              下载更新
            </button>
            <button type="button" disabled={props.updateSnapshot?.status !== "downloaded"} onClick={props.onQuitAndInstallUpdate}>
              重启并安装
            </button>
            <button type="button" className="secondary-button" onClick={props.onOpenUpdateDownloadPage}>
              打开下载页
            </button>
            <button type="button" className="secondary-button" onClick={props.onCopyUpdateDiagnostic}>
              复制更新诊断
            </button>
          </div>
          {props.updateSnapshot?.status === "error" ? (
            <p className="status-message status-warning">
              GitHub 连接失败时，可以先重试；如果网络仍不稳定，打开下载页手动安装最新版本。需要镜像源时，可设置 D2_TOOLS_UPDATE_FEED_URL 后重启应用。
            </p>
          ) : null}
        </aside>

        <section id="settings-manifest" className={`app-panel app-setting-group app-settings-wide manifest-${manifestUi.tone}`}>
          <div className="app-section-title">
            <div>
              <h2>资料库状态</h2>
              <span>{manifestUi.summary}</span>
            </div>
            <span className={`app-chip status-${manifestUi.tone}`}>{manifestUi.statusLabel}</span>
          </div>
          <div className="app-metric-grid">
            <div className="app-metric status-neutral">
              <span>本地 Manifest</span>
              <strong>{props.manifestStatus?.version ?? "未初始化"}</strong>
              <span>当前缓存版本</span>
            </div>
            <div className="app-metric status-neutral">
              <span>最新 Manifest</span>
              <strong>{props.manifestStatus?.latest_version ?? "等待检查"}</strong>
              <span>启动后自动检查</span>
            </div>
            <div className="app-metric status-neutral">
              <span>资料库日期</span>
              <strong>{formatManifestDate(props.manifestStatus?.cached_at)}</strong>
              <span>{props.manifestStatus?.language ?? "语言未读取"}</span>
            </div>
            <div className="app-metric status-neutral">
              <span>必要组件</span>
              <strong>{formatManifestComponents(props.manifestStatus)}</strong>
              <span>缺失时阻断依赖功能</span>
            </div>
          </div>
          <div className="button-row">
            <button type="button" className="secondary-button" disabled={props.isLoadingManifestStatus} onClick={props.onRefreshManifestStatus}>
              重新检查资料库
            </button>
            <button type="button" disabled={props.isInitializingManifest} onClick={props.onInitializeManifest}>
              {props.isInitializingManifest ? "更新中..." : "后台更新资料库"}
            </button>
          </div>
        </section>

        <section id="settings-ai" className="app-panel app-setting-group app-settings-wide settings-ai-section">
          <div className="app-section-title">
            <div>
              <h2>AI 配置</h2>
              <span>AI 只读取当前页面上下文和本地摘要。</span>
            </div>
          </div>
          <AiSettingsPanel onSaved={props.onAiSettingsSaved} />
        </section>

        <section id="settings-background-tasks" className="app-panel app-setting-group app-settings-wide">
          <div className="app-section-title">
            <div>
              <h2>后台任务</h2>
              <span>应用更新、资料库更新和长时间任务会在后台继续运行。</span>
            </div>
          </div>
          {props.backgroundTasks.length ? (
            <div className="app-log-list">
              {props.backgroundTasks.slice(0, 6).map((task) => (
                <div className={`app-log-row status-${backgroundTaskTone(task)}`} key={task.task_id}>
                  <strong>{task.title}</strong>
                  <span>{formatBackgroundTaskStatus(task.status)}</span>
                  <small>
                    {task.next_retry_at
                      ? `下次重试：${formatBackgroundTaskTime(task.next_retry_at)}`
                      : task.finished_at
                        ? `完成时间：${formatBackgroundTaskTime(task.finished_at)}`
                        : task.message ?? "后台任务状态已记录。"}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p className="status-message status-neutral">当前没有后台任务。</p>
          )}
        </section>

        <section id="settings-diagnostics" className="app-panel app-setting-group">
          <div className="app-section-title">
            <div>
              <h2>诊断导出</h2>
              <span>复制版本、配置状态、Manifest 状态和最近错误。</span>
            </div>
          </div>
          <div className="button-row">
            <button type="button" className="secondary-button" onClick={props.onCopyDiagnosticsExport}>
              复制脱敏诊断
            </button>
          </div>
        </section>

        <section id="settings-action-log" className="app-panel app-setting-group">
          <div className="app-section-title">
            <div>
              <h2>操作日志</h2>
              <span>只记录本机操作结果，不上报。</span>
            </div>
            <button type="button" className="secondary-button" onClick={props.onRefreshActionLog}>
              刷新日志
            </button>
          </div>
          <div className="action-log-filters">
            <label className="compact-field">
              结果
              <select
                value={props.actionLogResultFilter}
                onChange={(event) => props.onActionLogResultFilterChange(event.target.value as SettingsActionLogResultFilter)}
              >
                <option value="all">全部</option>
                <option value="success">成功</option>
                <option value="failed">失败</option>
              </select>
            </label>
            <label className="compact-field">
              类型
              <select
                value={props.actionLogTypeFilter}
                onChange={(event) => props.onActionLogTypeFilterChange(event.target.value as SettingsActionLogTypeFilter)}
              >
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
          {props.actionLog.length ? (
            <div className="app-log-list">
              {visibleActionLog.map((entry) => (
                <div className={`app-log-row ${entry.ok ? "status-ready" : "status-error"}`} key={entry.id}>
                  <strong>{formatActionLogTitle(entry)}</strong>
                  <span>{new Date(entry.created_at).toLocaleString("zh-CN")}</span>
                  <small>{entry.message ?? "-"}</small>
                  {!entry.ok ? (
                    <button type="button" className="inline-action" onClick={() => props.onCopyActionDiagnostic(entry)}>
                      复制诊断
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="status-message status-neutral">还没有写操作记录。</p>
          )}
        </section>
      </div>
    </section>
  );
}

function formatBackgroundTaskStatus(status: BackgroundTaskSnapshot["status"]): string {
  if (status === "queued") return "排队中";
  if (status === "running") return "运行中";
  if (status === "retrying") return "重试中";
  if (status === "success") return "已完成";
  if (status === "failed") return "失败";
  if (status === "blocked") return "已阻断";
  return "空闲";
}

function formatBackgroundTaskTime(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function backgroundTaskTone(task: BackgroundTaskSnapshot): "neutral" | "ready" | "warning" | "error" {
  if (task.status === "success") return "ready";
  if (task.status === "failed" || task.status === "blocked") return "error";
  if (task.status === "retrying") return "warning";
  return "neutral";
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

function getManifestUi(
  status: ManifestStatus | null,
  error: string,
  isLoading: boolean
): { statusLabel: string; summary: string; tone: "neutral" | "ready" | "warning" | "error" } {
  if (error) {
    return { statusLabel: "检查失败", summary: error, tone: "error" };
  }
  if (isLoading && !status) {
    return { statusLabel: "检查中", summary: "正在读取本地资料库状态并检查最新 Manifest。", tone: "neutral" };
  }
  if (!status || !status.initialized) {
    return { statusLabel: "未初始化", summary: "资料库缺失，搜索、详情和来源判断需要先后台更新资料库。", tone: "warning" };
  }
  if (status.missing_required_components?.length) {
    return {
      statusLabel: "组件缺失",
      summary: `缺少 ${status.missing_required_components.length} 个必要组件，资料库依赖功能可能不完整。`,
      tone: "warning"
    };
  }
  if (status.needs_update) {
    return {
      statusLabel: "需要更新",
      summary: `本地 Manifest ${status.version ?? "未知"} 落后于 ${status.latest_version ?? "最新版本"}，建议后台更新。`,
      tone: "warning"
    };
  }
  return { statusLabel: "可用", summary: "本地资料库可用，必要组件完整。", tone: "ready" };
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

function formatManifestDate(value?: string): string {
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

function formatManifestComponents(status: ManifestStatus | null): string {
  if (!status?.initialized) return "未初始化";
  const missingCount = status.missing_required_components?.length ?? 0;
  if (missingCount > 0) return `缺少 ${missingCount} 个`;
  return `${status.definitions?.length ?? 0} 个已就绪`;
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
