import type { VendorInventorySnapshot } from "@d2-tools/core/vendors/inventory";

export type VendorInventoryRequest = {
  membership_type: number;
  membership_id: string;
  character_ids: string[];
};

export type VendorsApi = {
  getVendorInventory(input: VendorInventoryRequest): Promise<VendorInventorySnapshot>;
};

export type { VendorInventorySnapshot } from "@d2-tools/core/vendors/inventory";
