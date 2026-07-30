import { ipcMain } from "electron";
import { loadConfig } from "@d2-tools/services/config/store";
import { computeStartupState } from "@d2-tools/core/startup/startupState";
import { getStartupAuthStatus } from "./authSession.js";
import { getDesktopManifestStatus } from "./manifest.js";
import { warmRuntimeInBackground } from "../runtime/runtimeCoordinator.js";
import { measureRuntime } from "../runtime/runtimeMetrics.js";

export function registerStartupIpcHandlers(): void {
  ipcMain.handle("startup:get", async () => {
    // #region debug-point A:startup-ipc
    void fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "desktop-first-load-stall", runId: "pre-fix", hypothesisId: "A", location: "startup.ts:startup:get", msg: "[DEBUG] startup IPC entered", data: {}, ts: Date.now() }) }).catch(() => {});
    // #endregion
    return measureRuntime("startup.state", async () => {
      const config = loadConfig();
      const manifestStatus = getDesktopManifestStatus();
      // #region debug-point A:auth-before
      void fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "desktop-first-load-stall", runId: "pre-fix", hypothesisId: "A", location: "startup.ts:getStartupAuthStatus", msg: "[DEBUG] auth status starting", data: {}, ts: Date.now() }) }).catch(() => {});
      // #endregion
      const auth = await getStartupAuthStatus(config);
      // #region debug-point A:auth-after
      void fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "desktop-first-load-stall", runId: "pre-fix", hypothesisId: "A", location: "startup.ts:getStartupAuthStatus", msg: "[DEBUG] auth status resolved", data: { status: auth.status }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      const result = computeStartupState({
        config,
        hasToken: auth.status !== "missing",
        auth,
        hasManifest: Boolean(manifestStatus.initialized && !manifestStatus.missing_required_components?.length),
        manifestCachedAt: manifestStatus.cached_at
      });
      void warmRuntimeInBackground();
      return result;
    }, { measurePayload: true });
  });
}
