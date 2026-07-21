import { ipcMain } from "electron";
import { loadConfig } from "@d2-tools/services/config/store";
import {
  loadVaultTags,
  saveVaultNote,
  saveVaultTag,
  saveVaultTagsBatch,
  type SaveVaultNoteInput,
  type SaveVaultTagInput
} from "@d2-tools/services/vault/tags";

export function registerVaultIpcHandlers(): void {
  ipcMain.handle("vault:tags:get", () => {
    const config = loadConfig();
    return loadVaultTags(config.data.data_dir);
  });

  ipcMain.handle("vault:tag:save", (_event, input: SaveVaultTagInput) => {
    const config = loadConfig();
    return saveVaultTag(config.data.data_dir, input);
  });

  ipcMain.handle("vault:tags:save-batch", (_event, inputs: SaveVaultTagInput[]) => {
    const config = loadConfig();
    return saveVaultTagsBatch(config.data.data_dir, inputs);
  });

  ipcMain.handle("vault:note:save", (_event, input: SaveVaultNoteInput) => {
    const config = loadConfig();
    return saveVaultNote(config.data.data_dir, input);
  });
}
