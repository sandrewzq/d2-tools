import { ipcMain } from "electron";
import { hasOAuthToken } from "@d2-tools/core/oauth/login";
import { loadConfig } from "@d2-tools/core/config/store";
import { getManifestStatus } from "@d2-tools/core/manifest/cache";
import { hasRequiredDefinitionComponents } from "@d2-tools/core/manifest/definitions";
import { computeStartupState } from "@d2-tools/core/startup/startupState";
import { getStartupAuthStatus } from "./authSession.js";

export function registerStartupIpcHandlers(): void {
  ipcMain.handle("startup:get", async () => {
    try {
      const config = loadConfig();
      const hasManifestDefinitions = hasRequiredDefinitionComponents(config.data.data_dir);
      const auth = await getStartupAuthStatus(config);
      const manifestStatus = hasManifestDefinitions
        ? getManifestStatus(config.data.data_dir)
        : null;
      const result = computeStartupState({
        config,
        hasToken: hasOAuthToken(config.data.data_dir),
        auth,
        hasManifest: hasManifestDefinitions,
        manifestCachedAt: manifestStatus?.cached_at
      });
      return result;
    } catch (error) {
      throw error;
    }
  });
}
