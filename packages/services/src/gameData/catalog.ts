import type { ItemAliases } from "@d2-tools/core/items/aliases";
import type {
  PerkRelatedEquipmentPage,
  PerkRelatedEquipmentQuery,
  PerkSearchResult
} from "@d2-tools/core/items/perkSearch";
import type { ItemSearchResult } from "@d2-tools/core/items/search";

export type ItemSearchQuery = {
  query: string;
  limit?: number;
  aliases?: ItemAliases;
};

export type PerkSearchQuery = {
  query: string;
  limit?: number;
  aliases?: ItemAliases;
};

export type ItemDetailQuery = {
  hash: number;
};

export type GameDataCatalog = {
  searchItems(input: ItemSearchQuery): Promise<ItemSearchResult[]>;
  searchPerks(input: PerkSearchQuery): Promise<PerkSearchResult[]>;
  getPerkRelatedEquipment(input: PerkRelatedEquipmentQuery): Promise<PerkRelatedEquipmentPage<ItemSearchResult>>;
  getItemDetail(input: ItemDetailQuery): Promise<ItemSearchResult | null>;
};
