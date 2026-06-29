import { ipcMain } from "electron";
import { loadConfig } from "@d2-tools/core/config/store";
import {
  loadItemAliases,
  saveItemAlias,
  type ItemAliasEntry
} from "@d2-tools/core/items/aliases";
import { getItemDefinitionDetail } from "@d2-tools/core/items/detail";
import { fetchLiveItemAvailability } from "@d2-tools/core/items/liveAvailability";
import { searchPerkDefinitions } from "@d2-tools/core/items/perkSearch";
import { searchItemDefinitions } from "@d2-tools/core/items/search";
import {
  addFavoriteItem,
  addRecentItem,
  loadLibraryHistory,
  removeFavoriteItem,
  type LibraryHistoryItem
} from "@d2-tools/core/library/history";
import { loadDefinitionComponent } from "@d2-tools/core/manifest/definitions";
import { loadFreshOAuthToken } from "./authSession.js";

export function registerLibraryIpcHandlers(): void {
  ipcMain.handle("items:search", (_event, query: string) => {
    const config = loadConfig();
    const definitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyInventoryItemDefinition"
    );
    const plugSetDefinitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyPlugSetDefinition"
    );

    if (!definitions) {
      throw new Error("请先初始化资料库");
    }

    return searchItemDefinitions(definitions, query, {
      limit: 20,
      plugSetDefinitions: plugSetDefinitions ?? undefined,
      aliases: loadItemAliases(config.data.data_dir)
    });
  });

  ipcMain.handle("items:perks:search", (_event, query: string) => {
    const config = loadConfig();
    const perkDefinitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinySandboxPerkDefinition"
    );
    const itemDefinitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyInventoryItemDefinition"
    );

    if (!perkDefinitions) {
      throw new Error("请先初始化资料库");
    }

    return searchPerkDefinitions(perkDefinitions, query, {
      limit: 20,
      itemDefinitions: itemDefinitions ?? undefined,
      aliases: loadItemAliases(config.data.data_dir)
    });
  });

  ipcMain.handle("items:live-availability", async (_event, itemHashes: number[]) => {
    const config = loadConfig();
    const token = await loadFreshOAuthToken(config).catch(() => null);

    return fetchLiveItemAvailability({
      config,
      token,
      itemHashes: Array.isArray(itemHashes) ? itemHashes : [],
      definitions: {
        activities: loadDefinitionComponent(config.data.data_dir, "DestinyActivityDefinition"),
        milestones: loadDefinitionComponent(config.data.data_dir, "DestinyMilestoneDefinition"),
        vendors: loadDefinitionComponent(config.data.data_dir, "DestinyVendorDefinition"),
        items: loadDefinitionComponent(config.data.data_dir, "DestinyInventoryItemDefinition")
      }
    });
  });

  ipcMain.handle("items:detail", (_event, hash: number) => {
    const config = loadConfig();
    const definitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyInventoryItemDefinition"
    );
    const plugSetDefinitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyPlugSetDefinition"
    );

    if (!definitions) {
      throw new Error("请先初始化资料库");
    }

    const detail = getItemDefinitionDetail(definitions, Number(hash), {
      plugSetDefinitions: plugSetDefinitions ?? undefined
    });
    if (!detail) {
      throw new Error("未找到物品详情");
    }

    return detail;
  });

  ipcMain.handle("aliases:get", () => {
    const config = loadConfig();
    return loadItemAliases(config.data.data_dir);
  });

  ipcMain.handle("aliases:save", (_event, input: ItemAliasEntry) => {
    const config = loadConfig();
    return saveItemAlias(config.data.data_dir, input);
  });

  ipcMain.handle("library:history:get", () => {
    const config = loadConfig();
    return loadLibraryHistory(config.data.data_dir);
  });

  ipcMain.handle("library:recent:add", (_event, item: Omit<LibraryHistoryItem, "viewed_at">) => {
    const config = loadConfig();
    return addRecentItem(config.data.data_dir, item);
  });

  ipcMain.handle("library:favorite:add", (_event, item: Omit<LibraryHistoryItem, "viewed_at">) => {
    const config = loadConfig();
    return addFavoriteItem(config.data.data_dir, item);
  });

  ipcMain.handle("library:favorite:remove", (_event, hash: number) => {
    const config = loadConfig();
    return removeFavoriteItem(config.data.data_dir, Number(hash));
  });
}
