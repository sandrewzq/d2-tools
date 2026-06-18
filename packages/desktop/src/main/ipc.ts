import { ipcMain } from "electron";
import {
  computeStartupState,
  getDefinitionStatus,
  getHealth,
  getManifestStatus,
  initializeManifestMetadata,
  initializeDefinitionComponent,
  loadDefinitionComponent,
  loadConfig,
  loadManifestMetadataCache,
  saveConfig,
  searchItemDefinitions,
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
    const itemDefinitionStatus = getDefinitionStatus(
      config.data.data_dir,
      "DestinyInventoryItemDefinition"
    );

    return computeStartupState({
      config,
      hasToken: false,
      hasManifest: itemDefinitionStatus.initialized
    });
  });

  ipcMain.handle("manifest:status", () => {
    const config = loadConfig();
    return getManifestStatus(config.data.data_dir);
  });

  ipcMain.handle("manifest:initialize", async () => {
    const config = loadConfig();
    const status = await initializeManifestMetadata({ config });
    const cache = loadManifestMetadataCache(config.data.data_dir);
    if (!cache) {
      throw new Error("Manifest metadata cache was not created");
    }

    await initializeDefinitionComponent({
      dataDir: config.data.data_dir,
      language: cache.language,
      metadata: cache.metadata,
      component: "DestinyInventoryItemDefinition"
    });

    return status;
  });

  ipcMain.handle("items:search", (_event, query: string) => {
    const config = loadConfig();
    const definitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyInventoryItemDefinition"
    );

    if (!definitions) {
      throw new Error("请先初始化资料库");
    }

    return searchItemDefinitions(definitions, query, { limit: 20 });
  });
}
