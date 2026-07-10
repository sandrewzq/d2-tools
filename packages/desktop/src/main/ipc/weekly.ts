import { ipcMain } from "electron";
import { fetchWeeklyLiveData } from "@d2-tools/core/weekly/liveData";
import { buildWeeklySummary } from "@d2-tools/core/weekly/summary";
import { loadConfig } from "@d2-tools/services/config/store";
import { loadDefinitionComponent } from "@d2-tools/services/manifest/definitions";
import { loadFreshOAuthToken } from "./authSession.js";

export function registerWeeklyIpcHandlers(): void {
  ipcMain.handle("weekly:summary", async () => {
    const config = loadConfig();
    const definitions = {
      activities: loadDefinitionComponent(config.data.data_dir, "DestinyActivityDefinition") ?? undefined,
      milestones: loadDefinitionComponent(config.data.data_dir, "DestinyMilestoneDefinition") ?? undefined,
      items: loadDefinitionComponent(config.data.data_dir, "DestinyInventoryItemDefinition") ?? undefined,
      objectives: loadDefinitionComponent(config.data.data_dir, "DestinyObjectiveDefinition") ?? undefined
    };
    const token = await loadFreshOAuthToken(config).catch(() => null);
    const liveData = await fetchWeeklyLiveData({ config, token, definitions });
    return buildWeeklySummary(new Date(), liveData);
  });
}
