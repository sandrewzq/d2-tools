import { ipcMain } from "electron";
import {
  clearLightggCache,
  clearLocalCommunityRecommendations,
  createDefaultCommunityPerkService,
  createFullCommunityPerkService,
  loadLocalCommunityRecommendations,
  saveLocalCommunityRecommendations,
  type LocalCommunityRecommendationTable,
  type SourceOptions,
  type VaultItemMatchInput
} from "@d2-tools/core/community-perks";
import { loadConfig } from "@d2-tools/core/config/store";
import {
  loadDefinitionComponent,
  loadDefinitionComponentByLanguage
} from "@d2-tools/core/manifest/definitions";
import { startBackgroundTask } from "../backgroundTasks.js";

export function registerCommunityIpcHandlers(): void {
  ipcMain.handle("community:local:get", () => {
    const config = loadConfig();
    return loadLocalCommunityRecommendations(config.data.data_dir);
  });

  ipcMain.handle("community:local:save", (_event, table: LocalCommunityRecommendationTable) => {
    const config = loadConfig();
    return saveLocalCommunityRecommendations(config.data.data_dir, table);
  });

  ipcMain.handle("community:local:clear", () => {
    const config = loadConfig();
    clearLocalCommunityRecommendations(config.data.data_dir);
    return null;
  });

  ipcMain.handle("community:recommendations:get", async (_event, item_hash: number, options?: SourceOptions) => {
    const config = loadConfig();
    const service = createFullCommunityPerkService(config);

    const itemDefinitions = options?.itemDefinitions ?? loadDefinitionComponent(config.data.data_dir, "DestinyInventoryItemDefinition") ?? undefined;
    const plugSetDefinitions = options?.plugSetDefinitions ?? loadDefinitionComponent(config.data.data_dir, "DestinyPlugSetDefinition") ?? undefined;
    const manifestLanguage = config.data.manifest_language;
    const englishItemDefinitions = options?.englishItemDefinitions ?? (manifestLanguage.toLowerCase() !== "en" ? loadDefinitionComponentByLanguage(config.data.data_dir, "DestinyInventoryItemDefinition", "en") ?? undefined : undefined);
    const englishPlugSetDefinitions = options?.englishPlugSetDefinitions ?? (manifestLanguage.toLowerCase() !== "en" ? loadDefinitionComponentByLanguage(config.data.data_dir, "DestinyPlugSetDefinition", "en") ?? undefined : undefined);

    const merged: SourceOptions = {
      itemDefinitions,
      plugSetDefinitions,
      englishItemDefinitions,
      englishPlugSetDefinitions,
      item_name: options?.item_name
    };

    return service.getRecommendationsWithAllSources(Number(item_hash), merged);
  });

  ipcMain.handle("community:vault:match", async (_event, items: VaultItemMatchInput[]) => {
    const result = matchVaultCommunityItems(items);
    startBackgroundTask({
      type: "community-analysis",
      title: "分析仓库推荐",
      message: "正在匹配本地愿望单和社区推荐。",
      run: async () => {
        await result;
      }
    });

    return result;
  });

  ipcMain.handle("community:lightgg:cache:clear", () => {
    const config = loadConfig();
    clearLightggCache(config.data.data_dir);
    return null;
  });
}

async function matchVaultCommunityItems(items: VaultItemMatchInput[]) {
  const config = loadConfig();
  // 仓库/资料库匹配只使用本地 DIM wishlist，避免触发大量 AI 查询
  const service = createDefaultCommunityPerkService(config);

  const itemDefinitions = loadDefinitionComponent(config.data.data_dir, "DestinyInventoryItemDefinition") ?? undefined;
  const plugSetDefinitions = loadDefinitionComponent(config.data.data_dir, "DestinyPlugSetDefinition") ?? undefined;
  const manifestLanguage = config.data.manifest_language;
  const englishItemDefinitions = manifestLanguage.toLowerCase() !== "en"
    ? loadDefinitionComponentByLanguage(config.data.data_dir, "DestinyInventoryItemDefinition", "en") ?? undefined
    : undefined;

  const resultMap = await service.matchVaultItems(items, {
    itemDefinitions,
    plugSetDefinitions,
    englishItemDefinitions
  });
  const arr: Array<{
    hash: number;
    matched: number;
    available: number;
    modes: Array<"pve" | "pvp" | "general">;
    sample_perks?: Array<{ hash: number; name: string; englishName?: string }>;
    source_label?: string;
  }> = [];
  resultMap.forEach((value, hash) => {
    arr.push({
      hash,
      matched: value.matched,
      available: value.available,
      modes: value.modes,
      sample_perks: value.sample_perks?.map((perk) => ({
        hash: perk.hash,
        name: perk.name,
        englishName: perk.englishName
      })),
      source_label: value.source_label
    });
  });
  return arr;
}
