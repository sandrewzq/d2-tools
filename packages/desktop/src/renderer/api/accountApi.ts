import type { AccountItemSummary, EquipmentGroupKey } from "./sharedTypes";

export type AccountApi = {
  loginBungie(): Promise<AuthLoginResult>;
  getAccountSummary(): Promise<AccountSummary>;
};

export type AuthLoginResult = {
  ok: true;
  message: string;
};

export type AccountSummary = {
  account_name: string;
  destiny_membership_id: string;
  membership_type: number;
  characters: CharacterSummary[];
  vault: {
    item_count: number;
    items: AccountItemSummary[];
    sample_items: AccountItemSummary[];
  };
  materials: {
    item_count: number;
    items: AccountMaterialSummary[];
  };
};

export type CharacterSummary = {
  character_id: string;
  class_name: string;
  light?: number;
  emblem_url?: string;
  equipped_items: AccountItemSummary[];
  equipment_groups: CharacterEquipmentGroup[];
  inventory_items: AccountItemSummary[];
  inventory_groups: CharacterEquipmentGroup[];
  postmaster_items: AccountItemSummary[];
  loadout_slots: CharacterLoadoutSlotSummary[];
};

export type CharacterEquipmentGroup = {
  key: EquipmentGroupKey;
  label: string;
  items: AccountItemSummary[];
};

export type CharacterLoadoutSlotSummary = {
  index: number;
  name: string;
  name_hash?: number;
  icon_hash?: number;
  color_hash?: number;
  item_count: number;
  items: Array<{
    instance_id?: string;
    name: string;
    bucket_name?: string;
  }>;
};

export type AccountMaterialSummary = {
  hash: number;
  name: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  quantity: number;
};
