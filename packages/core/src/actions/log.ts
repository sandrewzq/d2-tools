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
  /**
   * 写没有落地，但也不是失败：Bungie 用 ErrorCode 1679 说「这件装备还有变更在处理中」。
   *
   * 单独一档是因为 2026-09-18 那次排查里，这条状态被 `submit-failed` 的措辞盖住了 ——
   * 留痕看上去像写入失败，实际是「服务器还没来得及处理，而我们已经放弃重试」。
   */
  | "submit-deferred"
  | "bungie-request"
  | "account-patch-applied"
  | "account-confirmation-registered"
  | "verification-start"
  | "verification-wait"
  | "verification-read"
  | "verification-complete"
  /**
   * 写响应体带回的插槽状态与写入意图不一致。只留痕、不改界面 —— 它是「受理但被静默拒绝」
   * 这个担心唯一的第一手证据（见 T77 §七）。
   */
  | "socket-plug-response-mismatch";

export type ActionDebugTraceInput = {
  operation_id: string;
  action: ActionLogType;
  phase: ActionDebugTracePhase;
  item_name?: string;
  item_instance_id?: string;
  character_id?: string;
  /**
   * 这条留痕是哪个槽位 / 哪个 plug 的写入。
   *
   * 2026-09-18 排查「换 Perk 报错」时，留痕里只有 `item_instance_id`，四条 op 到底写的是哪个槽位
   * 哪个 Perk 只能靠推断补出来。写入调用点本来就知道这两个值，钉进留痕即可。
   */
  socket_index?: number;
  plug_hash?: number;
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
  /**
   * 记录这条留痕时，Bungie 请求漏斗里是否已经持有粘滞 cookie（affinitize）。
   * 由主进程盖章——jar 住在那里，渲染进程看不见。它是**布尔**，不是 cookie 值。
   *
   * 用途：读回不匹配时区分「jar 是空的（亲和性没起来）」和「jar 非空却仍读不回（另有原因）」。
   */
  affinity_cookie?: boolean;
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
    `结果：${actionLogResultLabel(entry)}`,
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

function actionLogResultLabel(entry: ActionLogEntry): string {
  if (entry.verification_status === "verified") return "已确认";
  if (entry.verification_status === "partial") return "部分完成";
  if (entry.verification_status === "unavailable") return "不可用";
  if (entry.verification_status === "mismatch") return "不一致";
  if (
    entry.ok
    && entry.action !== "execution-verification"
    && /请求已受理|正在确认/.test(entry.message ?? "")
  ) return "已受理";
  return entry.ok ? "成功" : "失败";
}

function formatOptionalDuration(value: number | undefined): string {
  return value === undefined ? "-" : `${Math.round(value)} ms`;
}
