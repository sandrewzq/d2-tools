import { ipcMain } from "electron";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import {
  createLoadoutTemplate,
  deleteLoadoutTemplate,
  listLoadoutTemplates,
  renameLoadoutTemplate,
  type CreateLoadoutTemplateInput,
  type LoadoutTemplate
} from "@d2-tools/core/loadouts/templates";
import { createLoadoutTemplateTransferPlan } from "@d2-tools/core/loadouts/plan";
import { loadConfig } from "@d2-tools/core/config/store";

export function registerLoadoutIpcHandlers(): void {
  ipcMain.handle("loadouts:list", () => {
    const config = loadConfig();
    return listLoadoutTemplates(config.data.data_dir);
  });

  ipcMain.handle("loadouts:create", (_event, input: CreateLoadoutTemplateInput) => {
    const config = loadConfig();
    return createLoadoutTemplate(config.data.data_dir, input);
  });

  ipcMain.handle("loadouts:rename", (_event, input: { id: string; name: string }) => {
    const config = loadConfig();
    return renameLoadoutTemplate(config.data.data_dir, input.id, input.name);
  });

  ipcMain.handle("loadouts:delete", (_event, id: string) => {
    const config = loadConfig();
    return deleteLoadoutTemplate(config.data.data_dir, id);
  });

  ipcMain.handle("loadouts:transfer-plan", (_event, input: {
    template: LoadoutTemplate;
    target_character_id: string;
    available_items: AccountItemSummary[];
    equipped_items: AccountItemSummary[];
  }) => {
    return createLoadoutTemplateTransferPlan(input);
  });
}
