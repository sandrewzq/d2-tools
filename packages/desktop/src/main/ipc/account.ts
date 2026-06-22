import { ipcMain } from "electron";
import { fetchAccountSummary } from "@d2-tools/core/account/summary";
import { loadConfig } from "@d2-tools/core/config/store";
import { loadDefinitionComponent } from "@d2-tools/core/manifest/definitions";
import { loadFreshOAuthToken } from "./authSession.js";

export function registerAccountIpcHandlers(): void {
  ipcMain.handle("account:summary", async () => {
    const config = loadConfig();
    const token = await loadFreshOAuthToken(config);

    const itemDefinitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyInventoryItemDefinition"
    );
    const bucketDefinitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyInventoryBucketDefinition"
    );
    const plugSetDefinitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyPlugSetDefinition"
    );
    const loadoutNameDefinitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyLoadoutNameDefinition"
    );
    if (!itemDefinitions) {
      throw new Error("请先初始化资料库");
    }

    return fetchAccountSummary({
      config,
      token,
      itemDefinitions,
      bucketDefinitions: bucketDefinitions ?? undefined,
      plugSetDefinitions: plugSetDefinitions ?? undefined,
      loadoutNameDefinitions: loadoutNameDefinitions ?? undefined
    });
  });
}
