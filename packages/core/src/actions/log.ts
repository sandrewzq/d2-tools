export type ActionLogType =
  | "set-lock"
  | "equip"
  | "insert-socket-plug"
  | "transfer"
  | "postmaster-pull"
  | "loadout-equip"
  | "loadout-snapshot"
  | "loadout-clear"
  | "loadout-update-identifiers"
  | "execution-verification";

export type ActionVerificationStatus = "verified" | "partial" | "mismatch" | "unavailable";

export type ActionTraceContext = {
  operation_id?: string;
  plan_id?: string;
  confirmation_id?: string;
  execution_id?: string;
  step_id?: string;
};

export type ActionDebugTracePhase =
  | "preflight-start"
  | "preflight-read"
  | "submit-start"
  | "submit-complete"
  | "submit-failed"
  | "bungie-request"
  | "account-patch-applied"
  | "verification-start"
  | "verification-wait"
  | "verification-read"
  | "verification-complete";

export type ActionDebugTraceInput = {
  operation_id: string;
  action: ActionLogType;
  phase: ActionDebugTracePhase;
  item_name?: string;
  item_instance_id?: string;
  character_id?: string;
  attempt?: number;
  total_attempts?: number;
  expected_count?: number;
  matched_count?: number;
  expected_state?: "inventory-or-equipped" | "equipped";
  delay_ms?: number;
  duration_ms?: number;
  auth_duration_ms?: number;
  bungie_duration_ms?: number;
  postprocess_duration_ms?: number;
  elapsed_ms?: number;
  account_available?: boolean;
  reflected?: boolean;
  ok?: boolean;
  message?: string;
};

export type ActionDebugTraceEntry = ActionDebugTraceInput & {
  id: string;
  created_at: string;
};

export type ActionLogEntry = ActionTraceContext & {
  id: string;
  created_at: string;
  action: ActionLogType;
  item_name?: string;
  item_instance_id?: string;
  character_id?: string;
  verification_status?: ActionVerificationStatus;
  duration_ms?: number;
  auth_duration_ms?: number;
  bungie_duration_ms?: number;
  postprocess_duration_ms?: number;
  ok: boolean;
  message?: string;
};

export type NewActionLogEntry = Omit<ActionLogEntry, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type ActionLogFilter = {
  ok?: boolean;
  action?: ActionLogType;
};

export function filterActionLog(entries: ActionLogEntry[], filter: ActionLogFilter): ActionLogEntry[] {
  return entries.filter((entry) => {
    if (filter.ok !== undefined && entry.ok !== filter.ok) {
      return false;
    }
    if (filter.action && entry.action !== filter.action) {
      return false;
    }
    return true;
  });
}

export function buildActionLogDiagnosticText(entry: ActionLogEntry): string {
  return [
    "d2-tools 写操作诊断",
    `时间：${entry.created_at}`,
    `操作：${entry.action}`,
    `结果：${entry.ok ? "成功" : "失败"}`,
    `物品：${entry.item_name ?? "-"}`,
    `物品实例：${entry.item_instance_id ?? "-"}`,
    `角色：${entry.character_id ?? "-"}`,
    `操作追踪：${entry.operation_id ?? "-"}`,
    `计划：${entry.plan_id ?? "-"}`,
    `确认：${entry.confirmation_id ?? "-"}`,
    `执行：${entry.execution_id ?? "-"}`,
    `步骤：${entry.step_id ?? "-"}`,
    `验证：${entry.verification_status ?? "-"}`,
    `总耗时：${formatOptionalDuration(entry.duration_ms)}`,
    `认证耗时：${formatOptionalDuration(entry.auth_duration_ms)}`,
    `Bungie 写请求：${formatOptionalDuration(entry.bungie_duration_ms)}`,
    `写后处理：${formatOptionalDuration(entry.postprocess_duration_ms)}`,
    `信息：${entry.message ?? "-"}`,
    "",
    "说明：这段诊断不会包含 token、client secret 或 API Key。"
  ].join("\n");
}

function formatOptionalDuration(value: number | undefined): string {
  return value === undefined ? "-" : `${Math.round(value)} ms`;
}
