import { ipcMain } from "electron";
import { loadConfig } from "@d2-tools/services/config/store";
import { computeStartupState } from "@d2-tools/core/startup/startupState";
import { getStartupAuthStatus } from "./authSession.js";
import { getDesktopManifestStatus } from "./manifest.js";
import { warmRuntimeInBackground } from "../runtime/runtimeCoordinator.js";
import { measureRuntime } from "../runtime/runtimeMetrics.js";

export function registerStartupIpcHandlers(): void {
  ipcMain.handle("startup:get", async () => {
    return measureRuntime("startup.state", async () => {
      const config = loadConfig();
      const manifestStatus = getDesktopManifestStatus();
      const auth = await getStartupAuthStatus(config);
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
