import { ipcMain } from "electron";
import { loadActionLog } from "@d2-tools/core/actions/log";
import { loadConfig } from "@d2-tools/services/config/store";
import { buildDiagnosticsExport } from "@d2-tools/core/diagnostics/export";
import { getManifestStatus } from "@d2-tools/services/manifest/cache";
import { loadToolAuditLog } from "@d2-tools/core/tools/audit";

export function registerDiagnosticsIpcHandlers(): void {
  ipcMain.handle("diagnostics:export", () => {
    const config = loadConfig();
    return buildDiagnosticsExport({
      app_version: "0.0.4",
      config,
      manifest: getManifestStatus(config.data.data_dir),
      action_log: loadActionLog(config.data.data_dir, 20),
      tool_audit_log: loadToolAuditLog(config.data.data_dir, 20)
    });
  });
}
