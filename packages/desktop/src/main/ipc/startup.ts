import { ipcMain } from "electron";
import { loadConfig } from "@d2-tools/services/config/store";
import { loadManifestMetadataCache } from "@d2-tools/services/manifest/cache";
import { hasRequiredDefinitionCacheFiles } from "@d2-tools/services/manifest/definitions";
import { computeStartupState } from "@d2-tools/core/startup/startupState";
import { getStartupAuthStatus } from "./authSession.js";

export function registerStartupIpcHandlers(): void {
  ipcMain.handle("startup:get", async () => {
    try {
      const config = loadConfig();
      const manifestMetadata = loadManifestMetadataCache(config.data.data_dir);
      const hasManifestDefinitions = hasRequiredDefinitionCacheFiles(config.data.data_dir);
      const auth = await getStartupAuthStatus(config);
      const result = computeStartupState({
        config,
        hasToken: auth.status !== "missing",
        auth,
        hasManifest: Boolean(manifestMetadata && hasManifestDefinitions),
        manifestCachedAt: manifestMetadata?.cached_at
      });
      return result;
    } catch (error) {
      throw error;
    }
  });
}
