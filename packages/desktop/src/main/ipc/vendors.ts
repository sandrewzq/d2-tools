import { ipcMain } from "electron";
import { loadConfig } from "@d2-tools/services/config/store";
import { loadDefinitionComponent } from "@d2-tools/services/manifest/definitions";
import { fetchVendorInventorySnapshot } from "@d2-tools/services/vendors/liveInventory";
import type { VendorInventoryRequest } from "../../renderer/api/vendorsApi.js";
import { loadFreshOAuthToken } from "./authSession.js";

export function registerVendorIpcHandlers(): void {
  ipcMain.handle("vendors:inventory", async (_event, input: VendorInventoryRequest) => {
    const config = loadConfig();
    const tokenRequest = loadFreshOAuthToken(config);
    const vendorDefinitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyVendorDefinition"
    );
    const itemDefinitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyInventoryItemDefinition"
    );
    const token = await tokenRequest;
    if (!vendorDefinitions || !itemDefinitions) {
      throw new Error("资料库尚未准备好，无法读取商人详情");
    }

    return fetchVendorInventorySnapshot({
      apiKey: config.bungie.api_key,
      accessToken: token.access_token,
      membershipType: input.membership_type,
      membershipId: input.membership_id,
      characterIds: input.character_ids,
      detailVendorHashes: input.detail_vendor_hashes,
      definitions: {
        vendors: vendorDefinitions,
        items: itemDefinitions
      }
    });
  });
}
