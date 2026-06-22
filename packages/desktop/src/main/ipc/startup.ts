import { ipcMain } from "electron";
import { hasOAuthToken } from "@d2-tools/core/oauth/login";
import { loadConfig } from "@d2-tools/core/config/store";
import { hasRequiredDefinitionComponents } from "@d2-tools/core/manifest/definitions";
import { computeStartupState } from "@d2-tools/core/startup/startupState";
import { getStartupAuthStatus } from "./authSession.js";

export function registerStartupIpcHandlers(): void {
  ipcMain.handle("startup:get", async () => {
    // #region debug-point B:main-startup-entry
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "startup-stuck", runId: "pre-fix", hypothesisId: "B", location: "ipc.ts:startup:get:entry", msg: "[DEBUG] main startup:get entry", data: { pid: process.pid }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    try {
      const config = loadConfig();
      // #region debug-point C:main-startup-config
      fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "startup-stuck", runId: "pre-fix", hypothesisId: "C", location: "ipc.ts:startup:get:config", msg: "[DEBUG] main startup:get config loaded", data: { dataDir: config.data.data_dir, language: config.data.manifest_language }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      const hasManifestDefinitions = hasRequiredDefinitionComponents(config.data.data_dir);
      const auth = await getStartupAuthStatus(config);
      const result = computeStartupState({
        config,
        hasToken: hasOAuthToken(config.data.data_dir),
        auth,
        hasManifest: hasManifestDefinitions
      });
      // #region debug-point D:main-startup-success
      fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "startup-stuck", runId: "pre-fix", hypothesisId: "D", location: "ipc.ts:startup:get:success", msg: "[DEBUG] main startup:get success", data: { nextStep: result.nextStep, hasManifest: hasManifestDefinitions }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      return result;
    } catch (error) {
      // #region debug-point E:main-startup-error
      fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "startup-stuck", runId: "pre-fix", hypothesisId: "E", location: "ipc.ts:startup:get:error", msg: "[DEBUG] main startup:get error", data: { error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error) }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      throw error;
    }
  });
}
