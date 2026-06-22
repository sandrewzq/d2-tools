import { ipcMain } from "electron";
import type { D2Config } from "@d2-tools/core/config/schema";
import { loadConfig, saveConfig } from "@d2-tools/core/config/store";

export function registerConfigIpcHandlers(): void {
  ipcMain.handle("config:get", () => loadConfig());

  ipcMain.handle("config:save", (_event, config: D2Config) => {
    saveConfig(config);
    return loadConfig();
  });
}
