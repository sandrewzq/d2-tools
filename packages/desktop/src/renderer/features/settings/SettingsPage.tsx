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
    <section className="settings-page">
      <nav className="settings-nav" aria-label="设置分类">
        <a href="#settings-ai">AI 配置</a>
        <a href="#settings-core">基础配置</a>
        <a href="#settings-updates">应用更新</a>
        <a href="#settings-manifest">资料库状态</a>
        <a href="#settings-backup">备份迁移</a>
        <a href="#settings-write-actions">写操作</a>
        <a href="#settings-diagnostics">诊断导出</a>
        <a href="#settings-action-log">操作日志</a>
      </nav>
      <div className="settings-main">
        <section id="settings-ai" className="settings-ai-section">
          <AiSettingsPanel onSaved={props.onAiSettingsSaved} />
        </section>
        <section id="settings-core" className="tool-panel">
          <div className="section-heading">
            <div>
              <h2>设置</h2>
              <p>查看或修改 Bungie 配置、写操作开关和本地日志。</p>
            </div>
            <button type="button" onClick={props.onOpenConfig}>打开配置</button>
          </div>
          {props.message ? <p className="status-message status-ready">{props.message}</p> : null}
          {props.error ? <p className="status-message status-error">{props.error}</p> : null}
          <div className="diagnostic-grid">
            <div className="ui-list-row diagnostic-row diagnostic-neutral">
              <span>本地数据目录</span>
              <strong>{props.diagnosticDataDir || "未读取到配置目录"}</strong>
            </div>
            <div className={props.writeActionsEnabled ? "ui-list-row diagnostic-row diagnostic-ready" : "ui-list-row diagnostic-row diagnostic-neutral"}>
              <span>装备写操作</span>
              <strong>{props.writeActionsEnabled ? "已开启" : "已关闭"}</strong>
            </div>
          </div>
          <section id="settings-updates" className={`settings-update-panel update-${updateUi.tone}`}>
            <div className="settings-update-hero">
              <div>
                <span className="section-kicker">桌面发布</span>
                <h3>应用更新</h3>
                <p>{updateUi.summary}</p>
              </div>
              <span className={`update-status-pill update-status-${updateUi.tone}`}>
                {updateUi.statusLabel}
              </span>
            </div>
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
            <div className="settings-update-grid">
              <div className="ui-list-row diagnostic-row diagnostic-neutral">
                <span>当前版本</span>
                <strong>{props.updateSnapshot?.current_version ?? "未读取"}</strong>
              </div>
              <div className="ui-list-row diagnostic-row diagnostic-neutral">
                <span>可用版本</span>
                <strong>{props.updateSnapshot?.available_version ?? props.updateSnapshot?.downloaded_version ?? "未发现"}</strong>
              </div>
              <div className="ui-list-row diagnostic-row diagnostic-neutral">
                <span>更新来源</span>
                <strong>{props.updateSnapshot?.update_source_label ?? "GitHub Releases"}</strong>
              </div>
              <div className="ui-list-row diagnostic-row diagnostic-neutral">
                <span>上次检查</span>
                <strong>{formatUpdateCheckedAt(props.updateSnapshot?.last_checked_at)}</strong>
              </div>
            </div>
            <div className="update-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={props.updateSnapshot?.status === "checking" || props.updateSnapshot?.status === "downloading"}
                onClick={props.onCheckForUpdates}
              >
                检查更新
              </button>
              <button
                type="button"
                disabled={props.updateSnapshot?.status !== "available"}
                onClick={props.onDownloadUpdate}
              >
                下载更新
              </button>
              <button
                type="button"
                disabled={props.updateSnapshot?.status !== "downloaded"}
                onClick={props.onQuitAndInstallUpdate}
              >
                重启并安装
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={props.onOpenUpdateDownloadPage}
              >
                打开下载页
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={props.onCopyUpdateDiagnostic}
              >
                复制更新诊断
              </button>
            </div>
            {props.updateSnapshot?.status === "error" ? (
              <p className="status-message status-warning">
                GitHub 连接失败时，可以先重试；如果网络仍不稳定，打开下载页手动安装最新版本。需要镜像源时，可设置 D2_TOOLS_UPDATE_FEED_URL 后重启应用。
              </p>
            ) : null}
          </section>
          <section id="settings-manifest" className={`settings-manifest-panel panel-subsection manifest-${manifestUi.tone}`}>
            <div className="settings-update-hero">
              <div>
                <span className="section-kicker">Destiny 2 数据</span>
                <h3>资料库状态</h3>
                <p>{manifestUi.summary}</p>
              </div>
              <span className={`update-status-pill update-status-${manifestUi.tone}`}>
                {manifestUi.statusLabel}
              </span>
            </div>
            <div className="settings-update-grid">
              <div className="ui-list-row diagnostic-row diagnostic-neutral">
                <span>本地 Manifest</span>
                <strong>{props.manifestStatus?.version ?? "未初始化"}</strong>
              </div>
              <div className="ui-list-row diagnostic-row diagnostic-neutral">
                <span>最新 Manifest</span>
                <strong>{props.manifestStatus?.latest_version ?? "等待检查"}</strong>
              </div>
              <div className="ui-list-row diagnostic-row diagnostic-neutral">
                <span>资料库日期</span>
                <strong>{formatManifestDate(props.manifestStatus?.cached_at)}</strong>
              </div>
              <div className="ui-list-row diagnostic-row diagnostic-neutral">
                <span>资料库语言</span>
                <strong>{props.manifestStatus?.language ?? "-"}</strong>
              </div>
              <div className="ui-list-row diagnostic-row diagnostic-neutral">
                <span>必要组件</span>
                <strong>{formatManifestComponents(props.manifestStatus)}</strong>
              </div>
              <div className="ui-list-row diagnostic-row diagnostic-neutral">
                <span>上次检查</span>
                <strong>{formatManifestDate(props.manifestStatus?.checked_at)}</strong>
              </div>
            </div>
            <div className="update-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={props.isLoadingManifestStatus}
                onClick={props.onRefreshManifestStatus}
              >
                重新检查资料库
              </button>
              <button
                type="button"
                disabled={props.isInitializingManifest}
                onClick={props.onInitializeManifest}
              >
                {props.isInitializingManifest ? "更新中..." : "后台更新资料库"}
              </button>
            </div>
          </section>
          <section id="settings-background-tasks" className="panel-subsection settings-subsection">
            <div>
              <h3>后台任务</h3>
              <p>应用更新、资料库更新和长时间任务会在后台继续运行，切换菜单不会中断。</p>
            </div>
            {props.backgroundTasks.length ? (
              <div className="background-task-list">
                {props.backgroundTasks.slice(0, 6).map((task) => (
                  <div className={`ui-list-row diagnostic-row diagnostic-${backgroundTaskTone(task)}`} key={task.task_id}>
                    <span>{formatBackgroundTaskStatus(task.status)}</span>
                    <strong>{task.title}</strong>
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
          <section id="settings-write-actions" className="panel-subsection settings-subsection">
            <div>
              <h3>危险操作保护</h3>
              <p>
                开启后才能锁定、解锁、装备、移入或取出仓库。需要在 Bungie App 勾选
                MoveEquipDestinyItems 权限并重新登录。
              </p>
            </div>
            <label className="switch-row">
              <input
                checked={props.writeActionsEnabled}
                type="checkbox"
                onChange={(event) => props.onWriteActionsEnabledChange(event.target.checked)}
              />
              允许单件装备写操作
            </label>
          </section>
          <section id="settings-backup" className="panel-subsection settings-subsection">
            <div>
              <h3>数据备份与迁移</h3>
              <p>备份、换电脑或覆盖安装前，先关闭 d2-tools，再复制整个本地数据目录。</p>
            </div>
            <div className="diagnostic-grid">
              <div className="ui-list-row diagnostic-row diagnostic-neutral">
                <span>需要备份的目录</span>
                <strong>{props.diagnosticDataDir || "未读取到配置目录"}</strong>
              </div>
            </div>
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={props.onCopyDataBackupGuide}>
                复制备份/迁移说明
              </button>
              <button type="button" className="secondary-button" onClick={props.onCopyDiagnosticsExport}>
                复制脱敏诊断
              </button>
            </div>
          </section>
          <section id="settings-diagnostics" className="panel-subsection settings-subsection">
            <div>
              <h3>脱敏诊断导出</h3>
              <p>复制版本、配置状态、Manifest 状态和最近错误，不包含 token、client secret 或 API Key。</p>
            </div>
            <button type="button" className="secondary-button" onClick={props.onCopyDiagnosticsExport}>
              复制脱敏诊断
            </button>
          </section>
          <section id="settings-action-log" className="panel-subsection settings-subsection">
            <div className="section-heading compact-heading">
              <div>
                <h3>最近操作</h3>
                <p>只记录本机操作结果，不上报。</p>
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
              <div className="action-log-list">
                {visibleActionLog.map((entry) => (
                  <div className={`ui-list-row action-log-row ${entry.ok ? "log-ok" : "log-fail"}`} key={entry.id}>
                    <span>{new Date(entry.created_at).toLocaleString("zh-CN")}</span>
                    <strong>{formatActionLogTitle(entry)}</strong>
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
