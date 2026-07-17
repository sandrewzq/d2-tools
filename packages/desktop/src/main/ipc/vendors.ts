import { ipcMain } from "electron";
import type { DefinitionComponentData, DefinitionRecord } from "@d2-tools/core/manifest/definitions";
import { fetchBungieJson } from "@d2-tools/services/bungie/client";
import { loadConfig } from "@d2-tools/services/config/store";
import { fetchVendorInventorySnapshot } from "@d2-tools/services/vendors/liveInventory";
import type { VendorInventoryRequest } from "../../contracts/vendors.js";
import { getDefinitions } from "../runtime/gameDataRuntime.js";
import { loadFreshOAuthToken } from "./authSession.js";

export function registerVendorIpcHandlers(): void {
  ipcMain.handle("vendors:inventory", async (_event, input: VendorInventoryRequest) => {
    const config = loadConfig();
    const tokenRequest = loadFreshOAuthToken(config);
    const definitions: {
      vendors: DefinitionComponentData;
      items: DefinitionComponentData;
    } = {
      vendors: {},
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
        definitions
      })
    });
  });
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
    const payload = await fetchBungieJson<T>(path, {
      apiKey: options.apiKey,
      accessToken: accessToken ?? options.accessToken
    });
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
    Object.assign(
      options.definitions.vendors,
      await getDefinitions("DestinyVendorDefinition", vendorHashes)
    );

    return payload;
  };
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
