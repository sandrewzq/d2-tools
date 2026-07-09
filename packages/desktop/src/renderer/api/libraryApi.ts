import type {
  AmmoTypeKey,
  EquipmentGroupKey,
  ItemDefinitionStat,
  ItemPerkGroup,
  ItemSourceSummary,
  LiveItemAvailability,
  WeaponFrameSummary
} from "./sharedTypes";

export type LibraryApi = {
  getItemDetail(hash: number): Promise<ItemDefinitionDetail>;
  searchItems(query: string): Promise<ItemSearchResult[]>;
  searchPerks(query: string): Promise<PerkSearchResult[]>;
  getLiveItemAvailability(itemHashes: number[]): Promise<LiveItemAvailability>;
  getItemAliases(): Promise<ItemAliases>;
  saveItemAlias(input: ItemAliasEntry): Promise<ItemAliases>;
  getLibraryHistory(): Promise<LibraryHistory>;
  addRecentItem(item: Omit<LibraryHistoryItem, "viewed_at">): Promise<LibraryHistory>;
  addFavoriteItem(item: Omit<LibraryHistoryItem, "viewed_at">): Promise<LibraryHistory>;
  removeFavoriteItem(hash: number): Promise<LibraryHistory>;
};

export type ItemDefinitionDetail = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  source: ItemSourceSummary;
  perks?: ItemPerkGroup[];
};

export type ItemSearchResult = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  ammo_type?: AmmoTypeKey;
  bucket_hash?: number;
  bucket_name?: string;
  group_key?: EquipmentGroupKey;
  weapon_frame?: WeaponFrameSummary;
  source: ItemSourceSummary;
  definition_stats?: ItemDefinitionStat[];
  perks?: ItemPerkGroup[];
};

export type PerkSearchResult = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  related_items?: Array<{ hash: number; name: string; group_key?: EquipmentGroupKey }>;
};

export type ItemAliasEntry = {
  alias: string;
  target: string;
  kind: "item" | "perk";
};

export type ItemAliases = {
  entries: ItemAliasEntry[];
};

export type LibraryHistoryItem = {
  hash: number;
  name: string;
  icon?: string;
  viewed_at?: string;
};

export type LibraryHistory = {
  recent: LibraryHistoryItem[];
  favorites: LibraryHistoryItem[];
};
