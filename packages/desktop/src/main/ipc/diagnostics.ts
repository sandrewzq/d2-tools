import { app, ipcMain } from "electron";
import { loadActionLog } from "@d2-tools/services/actions/logStore";
import { loadConfig } from "@d2-tools/services/config/store";
import { buildDiagnosticsExport } from "@d2-tools/core/diagnostics/export";
import { loadToolAuditLog } from "@d2-tools/core/tools/audit";
import {
  formatProcessMemoryBudgetStatus,
  formatRuntimeBudgetStatus,
  formatRuntimeMetrics
} from "../runtime/runtimeMetrics.js";
import { getDesktopManifestStatus } from "./manifest.js";

export function registerDiagnosticsIpcHandlers(): void {
  ipcMain.handle("diagnostics:export", () => {
    const config = loadConfig();
    const base = buildDiagnosticsExport({
      app_version: app.getVersion(),
      config,
      manifest: getDesktopManifestStatus(),
      action_log: loadActionLog(config.data.data_dir, 20),
      tool_audit_log: loadToolAuditLog(config.data.data_dir, 20)
    });
    const runtimeMetrics = formatRuntimeMetrics();
    const processMetrics = app.getAppMetrics().map((metric) => (
      `- ${metric.type} pid ${metric.pid}：working set ${formatMemoryKiB(metric.memory.workingSetSize)}`
    ));
    return [
      base,
      "",
      "运行时性能：",
      ...(runtimeMetrics.length ? runtimeMetrics : ["- 尚无运行时性能样本"]),
      "",
      "性能预算：",
      ...formatRuntimeBudgetStatus(),
      "",
      "进程内存：",
      ...(processMetrics.length ? processMetrics : ["- 尚无进程内存样本"]),
      "",
      "内存预算：",
      ...formatProcessMemoryBudgetStatus(app.getAppMetrics())
    ].join("\n");
  });
}

function formatMemoryKiB(value: number): string {
  return value >= 1024 * 1024
    ? `${Math.round(value / 1024 / 1024 * 10) / 10} GiB`
    : `${Math.round(value / 1024 * 10) / 10} MiB`;
}
