import type { VendorInventorySnapshot } from "@d2-tools/core/vendors/inventory";

export type VendorInventoryRequest = {
  membership_type: number;
  membership_id: string;
  character_ids: string[];
  detail_vendor_hashes?: number[];
};

export type VendorsApi = {
  getVendorInventory(input: VendorInventoryRequest): Promise<VendorInventorySnapshot>;
  getCachedVendorInventory(input: VendorInventoryRequest): Promise<VendorInventorySnapshot | null>;
  refreshVendorInventory(input: VendorInventoryRequest): Promise<VendorInventorySnapshot>;
};

export type { VendorInventorySnapshot };
