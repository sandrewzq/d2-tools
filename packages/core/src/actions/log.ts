export type ActionLogType =
  | "set-lock"
  | "equip"
  | "insert-socket-plug"
  | "transfer"
  | "postmaster-pull"
  | "loadout-equip"
  | "loadout-snapshot";

export type ActionLogEntry = {
  id: string;
  created_at: string;
  action: ActionLogType;
  item_name?: string;
  item_instance_id?: string;
  character_id?: string;
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
    `信息：${entry.message ?? "-"}`,
    "",
    "说明：这段诊断不会包含 token、client secret 或 API Key。"
  ].join("\n");
}
