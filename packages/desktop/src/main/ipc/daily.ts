import { ipcMain } from "electron";
import { loadConfig } from "@d2-tools/core/config/store";
import { fetchDailyLiveData } from "@d2-tools/core/daily/liveData";
import { buildDailySummary } from "@d2-tools/core/daily/summary";
import { loadDefinitionComponent } from "@d2-tools/core/manifest/definitions";
import { loadFreshOAuthToken } from "./authSession.js";

export function registerDailyIpcHandlers(): void {
  ipcMain.handle("daily:summary", async () => {
    const config = loadConfig();
    const definitions = {
      activities: loadDefinitionComponent(config.data.data_dir, "DestinyActivityDefinition") ?? undefined,
      milestones: loadDefinitionComponent(config.data.data_dir, "DestinyMilestoneDefinition") ?? undefined,
      vendors: loadDefinitionComponent(config.data.data_dir, "DestinyVendorDefinition") ?? undefined,
      items: loadDefinitionComponent(config.data.data_dir, "DestinyInventoryItemDefinition") ?? undefined
    };
    const token = await loadFreshOAuthToken(config).catch(() => null);
    const liveData = await fetchDailyLiveData({ config, token, definitions });
    return buildDailySummary(new Date(), liveData);
  });
}
