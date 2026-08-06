import type {
  AmmoTypeKey,
  ArmorSetCatalogItem,
  DamageTypeSummary,
  EquipmentGroupKey,
  ItemDefinitionStat,
  ItemDefinitionVersionSummary,
  ItemPerkGroup,
  ItemReleaseSummary,
  EquipableItemSetSummary,
  ItemSourceSummary,
  LiveItemAvailability,
  WeaponBreakerTypeSummary,
  WeaponFrameSummary
} from "./sharedTypes";

export type LibraryApi = {
  getItemDetail(hash: number): Promise<ItemDefinitionDetail>;
  getArmorSetCatalog(): Promise<ArmorSetCatalogItem[]>;
  searchItems(query: string): Promise<ItemSearchResult[]>;
  searchPerks(query: string): Promise<PerkSearchResult[]>;
  getPerkRelatedEquipment(input: PerkRelatedEquipmentQuery): Promise<PerkRelatedEquipmentPage>;
  getLiveItemAvailability(itemHashes: number[]): Promise<LiveItemAvailability>;
  getItemAliases(): Promise<ItemAliases>;
  saveItemAlias(input: ItemAliasEntry): Promise<ItemAliases>;
  getLibraryHistory(): Promise<LibraryHistory>;
  addRecentItem(item: Omit<LibraryHistoryItem, "viewed_at">): Promise<LibraryHistory>;
  addFavoriteItem(item: Omit<LibraryHistoryItem, "viewed_at">): Promise<LibraryHistory>;
  removeFavoriteItem(hash: number): Promise<LibraryHistory>;
};

export type ItemDefinitionDetail = ItemSearchResult & {
};

export type ItemSearchResult = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  release?: ItemReleaseSummary;
  definition_version?: ItemDefinitionVersionSummary;
  armor_set?: EquipableItemSetSummary;
  class_name?: string;
  damage_type?: string;
  damage_type_summary?: DamageTypeSummary;
  is_adept?: boolean;
  origin_traits?: Array<{
    hash: number;
    name: string;
  }>;
  intrinsic_traits?: Array<{
    hash: number;
    name: string;
    description: string;
    icon?: string;
  }>;
  ammo_type?: AmmoTypeKey;
  bucket_hash?: number;
  bucket_name?: string;
  group_key?: EquipmentGroupKey;
  weapon_frame?: WeaponFrameSummary;
  breaker_type?: WeaponBreakerTypeSummary;
  source: ItemSourceSummary;
  definition_stats?: ItemDefinitionStat[];
  perks?: ItemPerkGroup[];
};

export type PerkSearchResult = {
  key: string;
  hash: number;
  hashes: number[];
  name: string;
  description: string;
  icon?: string;
  related_count: number;
  related_groups: EquipmentGroupKey[];
};

export type PerkRelatedEquipmentQuery = {
  perk_hashes: number[];
  offset?: number;
  limit?: number;
};

export type PerkRelatedEquipmentPage = {
  total: number;
  items: ItemSearchResult[];
  offset: number;
  has_more: boolean;
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
