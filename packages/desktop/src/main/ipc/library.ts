import { ipcMain } from "electron";
import {
  classifyGameDataIpcError,
  encodeDesktopIpcFailure
} from "../../contracts/errors.js";
import { loadConfig } from "@d2-tools/services/config/store";
import {
  loadItemAliases,
  saveItemAlias,
  type ItemAliasEntry
} from "@d2-tools/services/items/aliases";
import { buildLiveItemAvailabilityFromBungie } from "@d2-tools/core/items/liveAvailability";
import {
  addFavoriteItem,
  addRecentItem,
  loadLibraryHistory,
  removeFavoriteItem,
  type LibraryHistoryItem
} from "@d2-tools/services/library/history";
import {
  type BungieHomeSnapshot,
  type BungieVendorsResponse
} from "@d2-tools/services/bungie/session";
import { getArmorSetCatalog, getDefinitions, getGameDataCatalog } from "../runtime/gameDataRuntime.js";
import { getSharedBungieSession } from "../runtime/bungieSession.js";
import { loadFreshOAuthToken } from "./authSession.js";

export function registerLibraryIpcHandlers(): void {
  ipcMain.handle("items:search", (_event, query: string) => encodeDesktopIpcFailure(() => {
    const config = loadConfig();
    return getGameDataCatalog().searchItems({
      query,
      limit: 20,
      aliases: loadItemAliases(config.data.data_dir)
    });
  }, classifyGameDataIpcError));

  ipcMain.handle("items:perks:search", (_event, query: string) => encodeDesktopIpcFailure(() => {
    const config = loadConfig();
    return getGameDataCatalog().searchPerks({
      query,
      limit: 20,
      aliases: loadItemAliases(config.data.data_dir)
    });
  }, classifyGameDataIpcError));

  ipcMain.handle("items:perks:related", (_event, input: { perk_hashes: number[]; offset?: number; limit?: number }) => (
    encodeDesktopIpcFailure(() => getGameDataCatalog().getPerkRelatedEquipment({
      perk_hashes: Array.isArray(input?.perk_hashes)
        ? input.perk_hashes.map(Number).filter(Number.isFinite)
        : [],
      offset: Number(input?.offset ?? 0),
      limit: Number(input?.limit ?? 20)
    }), classifyGameDataIpcError)
  ));

  ipcMain.handle("items:armor-sets:list", () => encodeDesktopIpcFailure(
    () => getArmorSetCatalog(),
    classifyGameDataIpcError
  ));

  ipcMain.handle("items:live-availability", (_event, itemHashes: number[]) => encodeDesktopIpcFailure(async () => {
    const config = loadConfig();
    const token = await loadFreshOAuthToken(config).catch(() => null);
    const snapshot = await getSharedBungieSession(config.bungie.api_key).getHomeSnapshot({
      accessToken: token?.access_token
    });
    const normalizedItemHashes = Array.isArray(itemHashes) ? itemHashes.map(Number) : [];

    return buildLiveItemAvailabilityFromBungie({
      itemHashes: normalizedItemHashes,
      publicVendors: snapshot.publicVendors,
      characterVendors: snapshot.characterVendors,
      milestones: snapshot.milestones,
      definitions: await loadAvailabilityDefinitions(snapshot, normalizedItemHashes)
    });
  }, classifyGameDataIpcError));

  ipcMain.handle("items:detail", (_event, hash: number) => encodeDesktopIpcFailure(async () => {
    const detail = await getGameDataCatalog().getItemDetail({ hash: Number(hash) });
    if (!detail) {
      throw new Error("未找到物品详情");
    }

    return detail;
  }, classifyGameDataIpcError));

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

async function loadAvailabilityDefinitions(
  snapshot: BungieHomeSnapshot,
  itemHashes: number[]
) {
  const milestones = snapshot.milestones ?? {};
  const vendorResponses = [snapshot.publicVendors, ...snapshot.characterVendors]
    .filter((response): response is BungieVendorsResponse => Boolean(response));
  const milestoneHashes = Object.keys(milestones).map(Number);
  const activityHashes = Object.values(milestones).flatMap((milestone) =>
    (milestone.activities ?? []).flatMap((activity) => numberValue(activity.activityHash))
  );
  const milestoneItemHashes = Object.values(milestones).flatMap((milestone) => [
    ...(milestone.availableQuests ?? []).flatMap((quest) => numberValue(quest.questItemHash))
  ]);
  const vendorHashes = vendorResponses.flatMap((response) =>
    Object.entries(response.vendors?.data ?? {}).flatMap(([key, vendor]) =>
      numberValue(vendor.vendorHash ?? Number(key))
    )
  );
  const vendorSaleItemHashes = vendorResponses.flatMap((response) =>
    Object.values(response.sales?.data ?? {}).flatMap((sales) =>
      Object.values(sales?.saleItems ?? {}).flatMap((sale) => [
        ...numberValue(sale.itemHash),
        ...(sale.costs ?? []).flatMap((cost) => numberValue(cost.itemHash))
      ])
    )
  );
  const [activities, milestoneDefinitions, vendors, items] = await Promise.all([
    getDefinitions("DestinyActivityDefinition", activityHashes),
    getDefinitions("DestinyMilestoneDefinition", milestoneHashes),
    getDefinitions("DestinyVendorDefinition", vendorHashes),
    getDefinitions("DestinyInventoryItemDefinition", [
      ...itemHashes,
      ...milestoneItemHashes,
      ...vendorSaleItemHashes
    ])
  ]);

  return {
    activities,
    milestones: milestoneDefinitions,
    vendors,
    items
  };
}

function numberValue(value: unknown): number[] {
  return typeof value === "number" && Number.isFinite(value) ? [value] : [];
}
