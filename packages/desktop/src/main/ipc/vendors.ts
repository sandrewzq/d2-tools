import { ipcMain } from "electron";
import type { DefinitionComponentData, DefinitionRecord } from "@d2-tools/core/manifest/definitions";
import { loadConfig } from "@d2-tools/services/config/store";
import { fetchVendorInventorySnapshot } from "@d2-tools/services/vendors/liveInventory";
import {
  createVendorInventoryCacheKey,
  loadCachedVendorInventory,
  saveCachedVendorInventory,
  type VendorInventoryCacheContext
} from "@d2-tools/services/vendors/inventoryCache";
import type { VendorInventoryRequest } from "../../contracts/vendors.js";
import { fetchSharedBungieJson } from "../runtime/bungieSession.js";
import { getDefinitions } from "../runtime/gameDataRuntime.js";
import { measureRuntime } from "../runtime/runtimeMetrics.js";
import { loadFreshOAuthToken } from "./authSession.js";

const vendorInventoryTimeoutMs = 30_000;
const vendorInventoryRequests = new Map<string, Promise<Awaited<ReturnType<typeof fetchVendorInventorySnapshot>>>>();

export function registerVendorIpcHandlers(): void {
  ipcMain.handle("vendors:inventory", (_event, input: VendorInventoryRequest) => refreshVendorInventory(input));
  ipcMain.handle("vendors:inventory:refresh", (_event, input: VendorInventoryRequest) => refreshVendorInventory(input));
  ipcMain.handle("vendors:inventory:cached", async (_event, input: VendorInventoryRequest) => {
    const config = loadConfig();
    const cached = await measureRuntime(
      "vendors.inventory.cache-read",
      () => loadCachedVendorInventory(config.data.data_dir, createCacheContext(input, config.data.manifest_language))
    );
    return cached?.snapshot ?? null;
  });
}

function refreshVendorInventory(input: VendorInventoryRequest) {
  const config = loadConfig();
  const cacheContext = createCacheContext(input, config.data.manifest_language);
  const requestKey = createVendorInventoryCacheKey(cacheContext);
  const existing = vendorInventoryRequests.get(requestKey);
  if (existing) return existing;

  const request = measureRuntime("vendors.inventory.refresh", () => (
    runVendorInventoryWithTimeout(async (signal) => {
      const definitions: {
        vendors: DefinitionComponentData;
        items: DefinitionComponentData;
      } = {
        vendors: {},
        items: {}
      };
      const token = await measureRuntime("vendors.inventory.token", () => loadFreshOAuthToken(config));
      const snapshot = await fetchVendorInventorySnapshot({
        apiKey: config.bungie.api_key,
        accessToken: token.access_token,
        membershipType: input.membership_type,
        membershipId: input.membership_id,
        characterIds: input.character_ids,
        detailVendorHashes: input.detail_vendor_hashes,
        definitions,
        signal,
        fetchJson: createVendorDefinitionHydratingFetchJson({
          apiKey: config.bungie.api_key,
          accessToken: token.access_token,
          definitions
        })
      });
      await saveCachedVendorInventory(config.data.data_dir, cacheContext, snapshot);
      return snapshot;
    })
  ));
  vendorInventoryRequests.set(requestKey, request);
  void request.finally(() => {
    if (vendorInventoryRequests.get(requestKey) === request) vendorInventoryRequests.delete(requestKey);
  }).catch(() => undefined);
  return request;
}

function createCacheContext(
  input: VendorInventoryRequest,
  manifestLanguage: string
): VendorInventoryCacheContext {
  return {
    membershipType: input.membership_type,
    membershipId: input.membership_id,
    characterIds: input.character_ids,
    detailVendorHashes: input.detail_vendor_hashes,
    manifestLanguage
  };
}

function createVendorDefinitionHydratingFetchJson(options: {
  apiKey: string;
  accessToken: string;
  definitions: {
    vendors: DefinitionComponentData;
    items: DefinitionComponentData;
  };
}): <T>(path: string, accessToken?: string) => Promise<T> {
  return async <T>(path: string, accessToken?: string): Promise<T> => {
    const payload = await measureRuntime("vendors.inventory.bungie-request", () => (
      fetchSharedBungieJson<T>(
        options.apiKey,
        path,
        accessToken ?? options.accessToken,
        { waitForRefresh: true }
      )
    ));
    const itemHashes = collectNumericProperties(payload, new Set([
      "itemHash",
      "plugHash",
      "plugItemHash"
    ]));
    const vendorHashes = new Set([
      ...collectNumericProperties(payload, new Set(["vendorHash"])),
      ...collectVendorComponentKeys(payload)
    ]);
    await measureRuntime("vendors.inventory.definition-hydration", async () => {
      const items = await getDefinitions("DestinyInventoryItemDefinition", itemHashes);
      Object.assign(options.definitions.items, items);
      for (const item of Object.values(items) as DefinitionRecord[]) {
        const previewVendorHash = (item.preview as { previewVendorHash?: number } | undefined)
          ?.previewVendorHash;
        if (typeof previewVendorHash === "number") {
          vendorHashes.add(previewVendorHash);
        }
      }
      Object.assign(
        options.definitions.vendors,
        await getDefinitions("DestinyVendorDefinition", vendorHashes)
      );
    });

    return payload;
  };
}

async function runVendorInventoryWithTimeout<T>(
  action: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutRequest = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(new Error("商人库存读取超时，请检查网络后重试"));
      controller.abort();
    }, vendorInventoryTimeoutMs);
  });
  try {
    return await Promise.race([action(controller.signal), timeoutRequest]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (controller.signal.aborted || /timed out|timeout|AbortError/i.test(message)) {
      throw new Error("商人库存读取超时，请检查网络后重试");
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
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
