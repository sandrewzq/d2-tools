import type { ActionLogEntry } from "../../api/client";
import { AiSettingsPanel } from "../../components/AiSettingsPanel";

export type SettingsActionLogResultFilter = "all" | "success" | "failed";
export type SettingsActionLogTypeFilter = ActionLogEntry["action"] | "all";

export function SettingsPage(props: {
  message: string;
  error: string;
  diagnosticDataDir: string;
  writeActionsEnabled: boolean;
  actionLog: ActionLogEntry[];
  actionLogResultFilter: SettingsActionLogResultFilter;
  actionLogTypeFilter: SettingsActionLogTypeFilter;
  onAiSettingsSaved: () => void;
  onOpenConfig: () => void;
  onWriteActionsEnabledChange: (enabled: boolean) => void;
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
    <>
      <AiSettingsPanel onSaved={props.onAiSettingsSaved} />
      <section className="tool-panel">
        <div className="section-heading">
          <div>
            <h2>设置</h2>
            <p>查看或修改 Bungie 配置、写操作开关和本地日志。</p>
          </div>
          <button type="button" onClick={props.onOpenConfig}>打开配置</button>
        </div>
        {props.message ? <p className="notice">{props.message}</p> : null}
        {props.error ? <p className="error">{props.error}</p> : null}
        <div className="diagnostic-grid">
          <div className="diagnostic-row diagnostic-neutral">
            <span>本地数据目录</span>
            <strong>{props.diagnosticDataDir || "未读取到配置目录"}</strong>
          </div>
          <div className={props.writeActionsEnabled ? "diagnostic-row diagnostic-ready" : "diagnostic-row diagnostic-neutral"}>
            <span>装备写操作</span>
            <strong>{props.writeActionsEnabled ? "已开启" : "已关闭"}</strong>
          </div>
        </div>
        <section className="settings-subsection">
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
        <section className="settings-subsection">
          <div>
            <h3>脱敏诊断导出</h3>
            <p>复制版本、配置状态、Manifest 状态和最近错误，不包含 token、client secret 或 API Key。</p>
          </div>
          <button type="button" className="secondary-button" onClick={props.onCopyDiagnosticsExport}>
            复制脱敏诊断
          </button>
        </section>
        <section className="settings-subsection">
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
                <div className={`action-log-row ${entry.ok ? "log-ok" : "log-fail"}`} key={entry.id}>
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
            <p className="notice">还没有写操作记录。</p>
          )}
        </section>
      </section>
    </>
  );
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
