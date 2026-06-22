import { ipcMain } from "electron";
import { loadConfig } from "@d2-tools/core/config/store";
import {
  initializeDefinitionComponent,
  requiredDefinitionComponents,
  type DefinitionComponentStatus
} from "@d2-tools/core/manifest/definitions";
import {
  getManifestStatus,
  initializeManifestMetadata,
  loadManifestMetadataCache
} from "@d2-tools/core/manifest/cache";

export function registerManifestIpcHandlers(): void {
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

    const primaryLanguage = cache.language;
    const primaryTasks = requiredDefinitionComponents.map((component) =>
      initializeDefinitionComponent({
        dataDir: config.data.data_dir,
        language: primaryLanguage,
        metadata: cache.metadata,
        component
      })
    );

    const englishTasks: Promise<DefinitionComponentStatus | null>[] = [];
    if (primaryLanguage.toLowerCase() !== "en") {
      englishTasks.push(
        initializeDefinitionComponent({
          dataDir: config.data.data_dir,
          language: "en",
          metadata: cache.metadata,
          component: "DestinyInventoryItemDefinition"
        }).catch(() => null),
        initializeDefinitionComponent({
          dataDir: config.data.data_dir,
          language: "en",
          metadata: cache.metadata,
          component: "DestinyPlugSetDefinition"
        }).catch(() => null)
      );
    }

    await Promise.all([...primaryTasks, ...englishTasks]);

    return status;
  });
}
