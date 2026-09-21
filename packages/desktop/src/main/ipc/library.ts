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
import type {
  WeeklyFarmingCatalogResource,
  WeeklyFarmingRequest
} from "@d2-tools/core/weekly/farming";
import {
  buildWeeklyFarmingCatalogResource,
  collectActivityLootItemHashes
} from "@d2-tools/services/community/activityLoot";
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
import { getAccountProfileComponents } from "../runtime/accountSession.js";
import { getSharedBungieSession } from "../runtime/bungieSession.js";
import { loadFreshOAuthToken } from "./authSession.js";
import { getDesktopManifestStatus } from "./manifest.js";

export function registerLibraryIpcHandlers(): void {
  ipcMain.handle("library:capabilities", async () => {
    const catalog = getGameDataCatalog() as {
      getRuntimeCapabilities?: () => Promise<{
        contract_version: number;
        supports_perk_families: boolean;
        supports_related_equipment_paging: boolean;
        supports_related_variant_matches: boolean;
      }>;
    };
    try {
      if (catalog.getRuntimeCapabilities) return await catalog.getRuntimeCapabilities();
    } catch {
      // An older worker does not know this operation and must be treated as contract v1.
    }
    return {
      contract_version: 1,
      supports_perk_families: false,
      supports_related_equipment_paging: false,
      supports_related_variant_matches: false
    };
  });

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

  ipcMain.handle("library:weekly-farming:get", (_event, rawRequest: WeeklyFarmingRequest) => (
    encodeDesktopIpcFailure(
      () => loadWeeklyFarmingCatalog(normalizeWeeklyFarmingRequest(rawRequest)),
      classifyGameDataIpcError
    )
  ));

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

async function loadWeeklyFarmingCatalog(
  request: WeeklyFarmingRequest
): Promise<WeeklyFarmingCatalogResource> {
  const itemHashes = collectActivityLootItemHashes(request);
  const [itemDefinitions, recordsResult] = await Promise.all([
    getDefinitions("DestinyInventoryItemDefinition", itemHashes, { projection: "display-summary" }),
    // 900 只有账号作用域的 Record，901 才有角色作用域的。图样 record 两种作用域都存在，
    // 少读一个就会把角色作用域的图样一律报成「没返回」（T91 第 12 节）。
    getAccountProfileComponents([900, 901], request.force ? "refresh" : "cached")
      .then((profile) => ({
        records: profile.profileRecords?.data?.records,
        characterRecords: flattenCharacterRecords(profile.characterRecords?.data),
        failed: false
      }))
      .catch(() => ({ records: undefined, characterRecords: undefined, failed: true }))
  ]);
  return buildWeeklyFarmingCatalogResource({
    request,
    manifestVersion: getDesktopManifestStatus().version,
    itemDefinitions,
    profileRecords: recordsResult.records,
    characterRecords: recordsResult.characterRecords,
    patternReadFailed: recordsResult.failed
  });
}

/**
 * 把组件 901 按角色分组的 Record 摊平成一张表。
 *
 * 同一 record 在多个角色下出现时保留**任意一个已完成 / 进度更高**的：图样是账号级解锁，
 * 一个角色打满就等于解锁了，取第一个遇到的角色会把已经做完的图样报成进行中。
 */
function flattenCharacterRecords(
  data: Record<string, { records?: Record<string, {
    state?: number;
    objectives?: Array<{
      progress?: number;
      completionValue?: number;
      complete?: boolean;
      visible?: boolean;
    }>;
  }> }> | undefined
) {
  if (!data) return undefined;
  const merged: Record<string, {
    state?: number;
    objectives?: Array<{
      progress?: number;
      completionValue?: number;
      complete?: boolean;
      visible?: boolean;
    }>;
  }> = {};
  for (const character of Object.values(data)) {
    for (const [hash, record] of Object.entries(character.records ?? {})) {
      const existing = merged[hash];
      if (!existing || recordProgressScore(record) > recordProgressScore(existing)) {
        merged[hash] = record;
      }
    }
  }
  return merged;
}

function recordProgressScore(record: {
  state?: number;
  objectives?: Array<{ progress?: number; completionValue?: number; complete?: boolean }>;
}): number {
  const complete = record.objectives?.filter((objective) => objective.complete).length ?? 0;
  const progress = (record.objectives ?? []).reduce(
    (sum, objective) => sum + Math.max(0, objective.progress ?? 0),
    0
  );
  // 完成条数优先于进度累加：一个是「已经有目标做完」，另一个只是「打得多」。
  return complete * 1_000_000 + progress;
}

function normalizeWeeklyFarmingRequest(value: WeeklyFarmingRequest): WeeklyFarmingRequest {
  const activities = Array.isArray(value?.activities)
    ? value.activities.flatMap((activity) => {
        if (!activity || (activity.kind !== "raid" && activity.kind !== "dungeon")) return [];
        const title = typeof activity.title === "string" ? activity.title.trim() : "";
        if (!title) return [];
        return [{
          kind: activity.kind,
          title,
          related_hashes: Array.isArray(activity.related_hashes)
            ? activity.related_hashes.map(Number).filter(Number.isFinite)
            : [],
          source: typeof activity.source === "string" ? activity.source : undefined
        }];
      })
    : [];
  return {
    activities,
    reset_at: typeof value?.reset_at === "string" ? value.reset_at : undefined,
    force: value?.force === true
  };
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
