import type { ManifestStatus } from "@d2-tools/core";
import { Panel } from "../primitives/Panel";

export interface ManifestStatusViewProps {
  readonly status: ManifestStatus;
}

export function ManifestStatusView({ status }: ManifestStatusViewProps) {
  return (
    <Panel title="Manifest">
      <p>状态：{status.state}</p>
      <p>版本：{status.version ?? "未下载"}</p>
      {status.errorMessage === null ? null : <p>错误：{status.errorMessage}</p>}
    </Panel>
  );
}
