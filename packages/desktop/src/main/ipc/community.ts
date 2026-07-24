import { ipcMain } from "electron";
import type { DefinitionComponentData, DefinitionRecord } from "@d2-tools/core/manifest/definitions";
import {
  clearLightggCache,
  clearLocalCommunityRecommendations,
  loadLocalCommunityRecommendations,
  saveLocalCommunityRecommendations,
  deletePersonalWeaponKnowledge,
  loadPersonalWeaponKnowledge,
  savePersonalWeaponKnowledge,
  setPersonalWeaponKnowledgeEnabled,
  type LocalCommunityRecommendationTable,
  type SavePersonalWeaponKnowledgeInput,
  type SourceOptions,
  type VaultItemMatchInput
} from "@d2-tools/core/community-perks";
import { loadConfig } from "@d2-tools/services/config/store";
import { createDefaultCommunityPerkService } from "@d2-tools/services/community/perkRecommendation";
import { startBackgroundTask } from "../backgroundTasks.js";
import { getDefinitions } from "../runtime/gameDataRuntime.js";

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

  ipcMain.handle("community:personal:get", (_event, weaponName?: string) => {
    const config = loadConfig();
    return loadPersonalWeaponKnowledge(config.data.data_dir, weaponName);
  });

  ipcMain.handle("community:personal:save", (_event, input: SavePersonalWeaponKnowledgeInput) => {
    const config = loadConfig();
    return savePersonalWeaponKnowledge(config.data.data_dir, input);
  });

  ipcMain.handle("community:personal:set-enabled", (_event, id: string, enabled: boolean) => {
    const config = loadConfig();
    return setPersonalWeaponKnowledgeEnabled(config.data.data_dir, id, enabled);
  });

  ipcMain.handle("community:personal:delete", (_event, id: string) => {
    const config = loadConfig();
    return deletePersonalWeaponKnowledge(config.data.data_dir, id);
  });

  ipcMain.handle("community:recommendations:get", async (_event, item_hash: number, options?: SourceOptions) => {
    const config = loadConfig();
    const service = createDefaultCommunityPerkService(config);
    const definitions = await loadCommunityDefinitions([Number(item_hash)]);

    const merged: SourceOptions = {
      itemDefinitions: options?.itemDefinitions ?? definitions.items,
      plugSetDefinitions: options?.plugSetDefinitions ?? definitions.plugSets,
      englishItemDefinitions: options?.englishItemDefinitions,
      englishPlugSetDefinitions: options?.englishPlugSetDefinitions,
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
  const definitions = await loadCommunityDefinitions(items.map((item) => item.hash));

  const resultMap = await service.matchVaultItems(items, {
    itemDefinitions: definitions.items,
    plugSetDefinitions: definitions.plugSets
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

async function loadCommunityDefinitions(itemHashes: number[]): Promise<{
  items: DefinitionComponentData;
  plugSets: DefinitionComponentData;
}> {
  const rootItems = await getDefinitions(
    "DestinyInventoryItemDefinition",
    itemHashes,
    { projection: "community-match" }
  );
  const itemRecords = Object.values(rootItems) as DefinitionRecord[];
  const socketEntries = itemRecords.flatMap((item) =>
    (item.sockets?.socketEntries ?? []) as Array<{
      singleInitialItemHash?: number;
      reusablePlugItems?: Array<{ plugItemHash?: number }>;
      reusablePlugSetHash?: number;
      randomizedPlugSetHash?: number;
    }>
  );
  const plugSetHashes = socketEntries.flatMap((entry) => [
    ...numberValue(entry.reusablePlugSetHash),
    ...numberValue(entry.randomizedPlugSetHash)
  ]);
  const plugSets = await getDefinitions(
    "DestinyPlugSetDefinition",
    plugSetHashes,
    { projection: "community-match" }
  );
  const directPlugHashes = socketEntries.flatMap((entry) => [
    ...numberValue(entry.singleInitialItemHash),
    ...(entry.reusablePlugItems ?? []).flatMap((plug) => numberValue(plug.plugItemHash))
  ]);
  const plugSetItemHashes = (Object.values(plugSets) as DefinitionRecord[]).flatMap((plugSet) =>
    ((plugSet.reusablePlugItems as Array<{ plugItemHash?: number }> | undefined) ?? [])
      .flatMap((plug) => numberValue(plug.plugItemHash))
  );
  const plugItems = await getDefinitions(
    "DestinyInventoryItemDefinition",
    [...directPlugHashes, ...plugSetItemHashes],
    { projection: "community-match" }
  );

  return {
    items: { ...rootItems, ...plugItems },
    plugSets
  };
}

function numberValue(value: unknown): number[] {
  return typeof value === "number" && Number.isFinite(value) ? [value] : [];
}
