import { ipcMain } from "electron";
import {
  computeStartupState,
  getHealth,
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

    return computeStartupState({
      config,
      hasToken: false,
      hasManifest: false
    });
  });
}
