import { ipcMain } from "electron";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import {
  clearLocalTargetRules,
  loadLocalTargetRules,
  saveLocalTargetRules
} from "@d2-tools/core/analysis/targetRulesStore";
import { emptyLocalTargetRules } from "@d2-tools/core/analysis/targets";
import { loadConfig } from "@d2-tools/core/config/store";

export function registerTargetRulesIpcHandlers(): void {
  ipcMain.handle("targets:get", () => {
    const config = loadConfig();
    return loadLocalTargetRules(config.data.data_dir);
  });

  ipcMain.handle("targets:save", (_event, rules: LocalTargetRules) => {
    const config = loadConfig();
    return saveLocalTargetRules(config.data.data_dir, rules);
  });

  ipcMain.handle("targets:clear", () => {
    const config = loadConfig();
    clearLocalTargetRules(config.data.data_dir);
    return emptyLocalTargetRules satisfies LocalTargetRules;
  });
}
