import type { ActionLogEntry, UpdateSnapshot } from "../../api/client";
import { AiSettingsPanel } from "../../components/AiSettingsPanel";

export type SettingsActionLogResultFilter = "all" | "success" | "failed";
export type SettingsActionLogTypeFilter = ActionLogEntry["action"] | "all";

export function SettingsPage(props: {
  message: string;
  error: string;
  diagnosticDataDir: string;
  writeActionsEnabled: boolean;
  updateSnapshot: UpdateSnapshot | null;
  actionLog: ActionLogEntry[];
  actionLogResultFilter: SettingsActionLogResultFilter;
  actionLogTypeFilter: SettingsActionLogTypeFilter;
  onAiSettingsSaved: () => void;
  onOpenConfig: () => void;
  onWriteActionsEnabledChange: (enabled: boolean) => void;
  onCheckForUpdates: () => void;
  onDownloadUpdate: () => void;
  onQuitAndInstallUpdate: () => void;
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

  return (
    <section className="settings-page">
      <nav className="settings-nav" aria-label="设置分类">
        <a href="#settings-ai">AI 配置</a>
        <a href="#settings-core">基础配置</a>
        <a href="#settings-updates">应用更新</a>
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
          <section id="settings-updates" className="panel-subsection settings-subsection">
            <div>
              <h3>应用更新</h3>
              <p>{formatUpdateStatusText(props.updateSnapshot)}</p>
            </div>
            <div className="diagnostic-grid update-status-grid">
              <div className="ui-list-row diagnostic-row diagnostic-neutral">
                <span>当前版本</span>
                <strong>{props.updateSnapshot?.current_version ?? "未读取"}</strong>
              </div>
              <div className="ui-list-row diagnostic-row diagnostic-neutral">
                <span>当前安装位置</span>
                <strong>{props.updateSnapshot?.install_path ?? "未读取"}</strong>
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
                className="secondary-button"
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
            </div>
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

function formatUpdateStatusText(snapshot: UpdateSnapshot | null): string {
  if (!snapshot) return "正在读取更新状态。";
  if (snapshot.status === "checking") return "正在检查更新。";
  if (snapshot.status === "available") return `发现新版本 ${snapshot.available_version ?? ""}。`;
  if (snapshot.status === "not_available") return snapshot.error || "当前已是最新版本。";
  if (snapshot.status === "downloading") {
    return snapshot.progress_percent === undefined
      ? "正在下载更新。"
      : `正在下载更新：${snapshot.progress_percent}%`;
  }
  if (snapshot.status === "downloaded") return `更新 ${snapshot.downloaded_version ?? snapshot.available_version ?? ""} 已下载。`;
  if (snapshot.status === "error") return snapshot.error || "更新检查失败。";
  return "尚未检查更新。";
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
