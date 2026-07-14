import { ipcMain } from "electron";
import { loadConfig } from "@d2-tools/services/config/store";
import { getManifestStatus } from "@d2-tools/services/manifest/cache";
import { computeStartupState } from "@d2-tools/core/startup/startupState";
import { getStartupAuthStatus } from "./authSession.js";

export function registerStartupIpcHandlers(): void {
  ipcMain.handle("startup:get", async () => {
    try {
      const config = loadConfig();
      const manifestStatus = getManifestStatus(config.data.data_dir);
      const auth = await getStartupAuthStatus(config);
      const result = computeStartupState({
        config,
        hasToken: auth.status !== "missing",
        auth,
        hasManifest: Boolean(manifestStatus.initialized && !manifestStatus.missing_required_components?.length),
        manifestCachedAt: manifestStatus.cached_at
      });
      return result;
    } catch (error) {
      throw error;
    }
  });
}
