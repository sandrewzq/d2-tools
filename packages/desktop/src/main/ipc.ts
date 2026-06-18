import { ipcMain } from "electron";
import {
  computeStartupState,
  getHealth,
  getManifestStatus,
  initializeManifestMetadata,
  loadConfig,
  saveConfig,
  type D2Config
} from "@d2-service/core";

export function registerIpcHandlers(): void {
  ipcMain.handle("health:get", () => getHealth());

  ipcMain.handle("config:get", () => loadConfig());

  ipcMain.handle("config:save", (_event, config: D2Config) => {
    saveConfig(config);
    return loadConfig();
  });

  ipcMain.handle("startup:get", () => {
    const config = loadConfig();
    const manifestStatus = getManifestStatus(config.data.data_dir);

    return computeStartupState({
      config,
      hasToken: false,
      hasManifest: manifestStatus.initialized
    });
  });

  ipcMain.handle("manifest:status", () => {
    const config = loadConfig();
    return getManifestStatus(config.data.data_dir);
  });

  ipcMain.handle("manifest:initialize", async () => {
    const config = loadConfig();
    return initializeManifestMetadata({ config });
  });
}
