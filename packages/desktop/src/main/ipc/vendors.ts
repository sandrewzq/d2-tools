import { ipcMain } from "electron";
import type { DefinitionComponentData, DefinitionRecord } from "@d2-tools/core/manifest/definitions";
import { loadConfig } from "@d2-tools/services/config/store";
import { getManifestStatus } from "@d2-tools/services/manifest/cache";
import { fetchVendorInventorySnapshot } from "@d2-tools/services/vendors/liveInventory";
import type { VendorInventorySnapshot } from "@d2-tools/core/vendors/inventory";
import type { VendorInventoryRequest } from "../../contracts/vendors.js";
import { fetchSharedBungieJson } from "../runtime/bungieSession.js";
import { getDefinitions } from "../runtime/gameDataRuntime.js";
import { loadFreshOAuthToken } from "./authSession.js";

type VendorCacheEntry = {
  snapshot: VendorInventorySnapshot;
  freshUntil: number;
};

const vendorCache = new Map<string, VendorCacheEntry>();
const vendorRequests = new Map<string, Promise<VendorInventorySnapshot>>();

export function registerVendorIpcHandlers(): void {
  ipcMain.handle("vendors:inventory", async (_event, input: VendorInventoryRequest) => {
    const config = loadConfig();
    const manifest = getManifestStatus(config.data.data_dir);
    const cacheKey = vendorCacheKey(input, manifest.version, manifest.language);
    const cached = vendorCache.get(cacheKey);
    if (!input.force_refresh && cached && Date.now() < cached.freshUntil) {
      return { ...cached.snapshot, status: "ready", cachedAt: cached.snapshot.fetchedAt };
    }
    const inFlight = vendorRequests.get(cacheKey);
    if (inFlight) return inFlight;

    const operation = loadVendorInventory(config, input)
      .then((snapshot) => {
        vendorCache.set(cacheKey, {
          snapshot,
          freshUntil: vendorFreshUntil(snapshot, Date.now())
        });
        return snapshot;
      })
      .catch((error) => {
        if (!cached) throw error;
        return {
          ...cached.snapshot,
          status: "stale" as const,
          cachedAt: cached.snapshot.fetchedAt,
          errorMessage: error instanceof Error ? error.message : "商人数据刷新失败"
        };
      });
    let request: Promise<VendorInventorySnapshot>;
    request = operation.finally(() => {
        if (vendorRequests.get(cacheKey) === request) vendorRequests.delete(cacheKey);
      });
    vendorRequests.set(cacheKey, request);
    return request;
  });
}

async function loadVendorInventory(
  config: ReturnType<typeof loadConfig>,
  input: VendorInventoryRequest
): Promise<VendorInventorySnapshot> {
    const tokenRequest = loadFreshOAuthToken(config);
    const definitions: {
      vendors: DefinitionComponentData;
      vendorGroups: DefinitionComponentData;
      items: DefinitionComponentData;
    } = {
      vendors: {},
      vendorGroups: {},
      items: {}
    };
    const token = await tokenRequest;

    return fetchVendorInventorySnapshot({
      apiKey: config.bungie.api_key,
      accessToken: token.access_token,
      membershipType: input.membership_type,
      membershipId: input.membership_id,
      characterIds: input.character_ids,
      detailVendorHashes: input.detail_vendor_hashes,
      definitions,
      fetchJson: createVendorDefinitionHydratingFetchJson({
        apiKey: config.bungie.api_key,
        accessToken: token.access_token,
        definitions,
        forceRefresh: Boolean(input.force_refresh)
      })
    });
}

function createVendorDefinitionHydratingFetchJson(options: {
  apiKey: string;
  accessToken: string;
  definitions: {
    vendors: DefinitionComponentData;
    vendorGroups: DefinitionComponentData;
    items: DefinitionComponentData;
  };
  forceRefresh: boolean;
}): <T>(path: string, accessToken?: string) => Promise<T> {
  return async <T>(path: string, accessToken?: string): Promise<T> => {
    const payload = await fetchSharedBungieJson<T>(
      options.apiKey,
      path,
      accessToken ?? options.accessToken,
      { forceRefresh: options.forceRefresh }
    );
    const itemHashes = collectNumericProperties(payload, new Set([
      "itemHash",
      "plugHash",
      "plugItemHash"
    ]));
    const vendorHashes = new Set([
      ...collectNumericProperties(payload, new Set(["vendorHash"])),
      ...collectVendorComponentKeys(payload)
    ]);
    const items = await getDefinitions("DestinyInventoryItemDefinition", itemHashes);
    Object.assign(options.definitions.items, items);
    for (const item of Object.values(items) as DefinitionRecord[]) {
      const previewVendorHash = (item.preview as { previewVendorHash?: number } | undefined)
        ?.previewVendorHash;
      if (typeof previewVendorHash === "number") {
        vendorHashes.add(previewVendorHash);
      }
    }
    const vendors = await getDefinitions("DestinyVendorDefinition", vendorHashes);
    Object.assign(options.definitions.vendors, vendors);
    const vendorGroupHashes = new Set<number>();
    for (const vendor of Object.values(vendors) as DefinitionRecord[]) {
      for (const group of vendor.groups ?? []) {
        if (typeof group.vendorGroupHash === "number") {
          vendorGroupHashes.add(group.vendorGroupHash);
        }
      }
    }
    Object.assign(
      options.definitions.vendorGroups,
      await getDefinitions("DestinyVendorGroupDefinition", vendorGroupHashes)
    );

    return payload;
  };
}

function vendorCacheKey(
  input: VendorInventoryRequest,
  manifestVersion: string | undefined,
  manifestLanguage: string | undefined
): string {
  return [
    input.membership_type,
    input.membership_id,
    [...input.character_ids].sort().join(","),
    [...(input.detail_vendor_hashes ?? [])].sort((left, right) => left - right).join(","),
    manifestVersion ?? "manifest-unavailable",
    manifestLanguage ?? ""
  ].join("\u0000");
}

function vendorFreshUntil(snapshot: VendorInventorySnapshot, now: number): number {
  const refreshTimes = snapshot.vendors
    .map((vendor) => vendor.nextRefreshAt ? Date.parse(vendor.nextRefreshAt) : Number.NaN)
    .filter((value) => Number.isFinite(value) && value > now)
    .sort((left, right) => left - right);
  return refreshTimes[0] ?? now + 15 * 60_000;
}

function collectNumericProperties(value: unknown, keys: Set<string>, output = new Set<number>()): Set<number> {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    for (const item of value) collectNumericProperties(item, keys, output);
    return output;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (keys.has(key) && typeof nested === "number" && Number.isFinite(nested)) {
      output.add(nested);
    }
    collectNumericProperties(nested, keys, output);
  }
  return output;
}

function collectVendorComponentKeys(value: unknown, output = new Set<number>()): Set<number> {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    for (const item of value) collectVendorComponentKeys(item, output);
    return output;
  }
  for (const [key, nested] of Object.entries(value)) {
    if ((key === "vendors" || key === "sales") && nested && typeof nested === "object") {
      const data = (nested as { data?: unknown }).data;
      if (data && typeof data === "object" && !Array.isArray(data)) {
        for (const hash of Object.keys(data)) {
          const numericHash = Number(hash);
          if (Number.isFinite(numericHash)) output.add(numericHash);
        }
      }
    }
    collectVendorComponentKeys(nested, output);
  }
  return output;
}
