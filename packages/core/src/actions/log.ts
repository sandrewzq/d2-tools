import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

export type ActionLogType = "set-lock" | "equip" | "transfer";

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

export function actionLogPath(dataDir: string): string {
  return join(dataDir, "action-log.json");
}

export function loadActionLog(dataDir: string, limit?: number): ActionLogEntry[] {
  const path = actionLogPath(dataDir);
  if (!existsSync(path)) {
    return [];
  }

  const entries = JSON.parse(readFileSync(path, "utf8")) as ActionLogEntry[];
  return typeof limit === "number" ? entries.slice(0, Math.max(0, limit)) : entries;
}

export function appendActionLog(dataDir: string, entry: NewActionLogEntry): ActionLogEntry[] {
  mkdirSync(dataDir, { recursive: true });
  const nextEntry: ActionLogEntry = {
    ...entry,
    id: entry.id ?? randomUUID(),
    created_at: entry.created_at ?? new Date().toISOString()
  };
  const entries = [nextEntry, ...loadActionLog(dataDir)].slice(0, 200);
  writeFileSync(actionLogPath(dataDir), `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  return entries;
}

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
    "d2-service 写操作诊断",
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
