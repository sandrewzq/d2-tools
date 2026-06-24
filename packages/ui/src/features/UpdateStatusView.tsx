import { Button } from "../primitives/Button";
import { Panel } from "../primitives/Panel";

export type UpdateStatusPhase =
  | "idle"
  | "checking"
  | "available"
  | "current"
  | "installing"
  | "restartRequested"
  | "error";

export interface UpdateStatusViewState {
  readonly phase: UpdateStatusPhase;
  readonly version: string | null;
  readonly notes: string | null;
  readonly errorMessage?: string | null;
}

export interface UpdateStatusViewProps {
  readonly status: UpdateStatusViewState;
  readonly onCheck: () => void;
  readonly onInstall: () => void;
  readonly onOpenReleasePage: () => void;
}

export function UpdateStatusView({
  status,
  onCheck,
  onInstall,
  onOpenReleasePage
}: UpdateStatusViewProps) {
  const canCheck = status.phase !== "checking" && status.phase !== "installing";
  const canInstall = status.phase === "available";

  return (
    <Panel title="自动更新">
      <p>{describeStatus(status)}</p>
      {status.notes === null ? null : <p>更新说明：{status.notes}</p>}
      {status.errorMessage == null ? null : <p>错误：{status.errorMessage}</p>}
      <div>
        <Button onClick={onCheck} disabled={!canCheck}>
          检查更新
        </Button>
        <Button onClick={onInstall} disabled={!canInstall}>
          安装更新
        </Button>
        <Button onClick={onOpenReleasePage}>
          打开发布页
        </Button>
      </div>
    </Panel>
  );
}

function describeStatus(status: UpdateStatusViewState): string {
  switch (status.phase) {
    case "checking":
      return "正在检查更新";
    case "available":
      return `发现新版本：${status.version ?? "未知版本"}`;
    case "current":
      return "当前已是最新版本";
    case "installing":
      return "正在安装更新，完成后会重启应用";
    case "restartRequested":
      return "更新已安装，正在等待应用重启";
    case "error":
      return status.version === null ? "更新检查失败" : "更新安装失败";
    case "idle":
      return "尚未检查更新";
  }
}
