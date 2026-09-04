import { app, ipcMain } from "electron";
import { createRequire } from "node:module";
import { loadActionLog } from "@d2-tools/services/actions/logStore";
import { loadConfig } from "@d2-tools/services/config/store";
import { buildDiagnosticsExport } from "@d2-tools/services/diagnostics/export";
import { loadToolAuditLog } from "@d2-tools/services/tools/audit";
import {
  formatAccountRefreshMetrics,
  formatProcessMemoryBudgetStatus,
  formatRuntimeBudgetStatus,
  formatRuntimeMetrics
} from "../runtime/runtimeMetrics.js";
import { getDesktopManifestStatus } from "./manifest.js";
import { formatAccountCacheMetrics } from "@d2-tools/services/account/cacheMetrics";

const require = createRequire(import.meta.url);

export function registerDiagnosticsIpcHandlers(): void {
  ipcMain.handle("diagnostics:export", () => {
    const config = loadConfig();
    const base = buildDiagnosticsExport({
      app_version: getDiagnosticsAppVersion(),
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
      ...formatProcessMemoryBudgetStatus(app.getAppMetrics()),
      "",
      "账号缓存命中率：",
      ...formatAccountCacheMetrics(),
      "",
      "账号刷新分阶段：",
      ...formatAccountRefreshMetrics()
    ].join("\n");
  });
}

function getDiagnosticsAppVersion(): string {
  try {
    const packageJson = require("../../../package.json") as { version?: string };
    if (packageJson.version) return packageJson.version;
  } catch {
    // Packaged builds normally provide the product version through Electron.
  }
  return app.getVersion();
}

function formatMemoryKiB(value: number): string {
  return value >= 1024 * 1024
    ? `${Math.round(value / 1024 / 1024 * 10) / 10} GiB`
    : `${Math.round(value / 1024 * 10) / 10} MiB`;
}
