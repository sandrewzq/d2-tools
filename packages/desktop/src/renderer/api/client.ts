declare global {
  interface Window {
    d2: {
      getHealth(): Promise<{ ok: true; service: string; version: string; timestamp: string }>;
      getConfig(): Promise<D2Config>;
      saveConfig(config: D2Config): Promise<D2Config>;
      loginBungie(): Promise<AuthLoginResult>;
      getAccountSummary(): Promise<AccountSummary>;
      getItemDetail(hash: number): Promise<ItemDefinitionDetail>;
      getStartupState(): Promise<StartupState>;
      getManifestStatus(): Promise<ManifestStatus>;
      initializeManifest(): Promise<ManifestStatus>;
      searchItems(query: string): Promise<ItemSearchResult[]>;
    };
  }
}

export const api = window.d2;

export type D2Config = {
  bungie: {
    api_key: string;
    client_id: string;
    client_secret: string;
    redirect_uri: string;
  };
  data: {
    data_dir: string;
    manifest_language: string;
  };
  ai: {
    provider: string;
    api_key: string;
    model: string;
  };
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
    sample_items: AccountItemSummary[];
  };
};

export type CharacterSummary = {
  character_id: string;
  class_name: string;
  light?: number;
  emblem_url?: string;
  equipped_items: AccountItemSummary[];
  equipment_groups: CharacterEquipmentGroup[];
};

export type AccountItemSummary = {
  hash: number;
  instance_id?: string;
  name: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  bucket_hash?: number;
  bucket_name?: string;
  group_key: EquipmentGroupKey;
};

export type ItemDefinitionDetail = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  perks?: ItemPerkGroup[];
};

export type EquipmentGroupKey = "weapons" | "armor" | "equipment" | "other";

export type CharacterEquipmentGroup = {
  key: EquipmentGroupKey;
  label: string;
  items: AccountItemSummary[];
};

export type StartupState = {
  nextStep: "bungie-config" | "login" | "home";
  cards: {
    bungieConfig: StatusCardState;
    account: StatusCardState;
    manifest: StatusCardState;
    ai: StatusCardState;
  };
};

export type StatusCardState = {
  status: "ready" | "missing" | "skipped";
  label: string;
};

export type ManifestStatus = {
  initialized: boolean;
  version?: string;
  language?: string;
  sqlite_path?: string;
  cached_at?: string;
};

export type ItemSearchResult = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  perks?: ItemPerkGroup[];
};

export type ItemPerkGroup = {
  socket_index: number;
  plugs: ItemPlugSummary[];
};

export type ItemPlugSummary = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
};
