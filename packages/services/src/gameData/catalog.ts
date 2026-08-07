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

export type GameDataRuntimeCapabilities = {
  contract_version: 2;
  supports_perk_families: true;
  supports_related_equipment_paging: true;
  supports_related_variant_matches: true;
};

export type GameDataCatalog = {
  getRuntimeCapabilities(): Promise<GameDataRuntimeCapabilities>;
  searchItems(input: ItemSearchQuery): Promise<ItemSearchResult[]>;
  searchPerks(input: PerkSearchQuery): Promise<PerkSearchResult[]>;
  getPerkRelatedEquipment(input: PerkRelatedEquipmentQuery): Promise<PerkRelatedEquipmentPage<ItemSearchResult>>;
  getItemDetail(input: ItemDetailQuery): Promise<ItemSearchResult | null>;
};

export function getGameDataRuntimeCapabilities(): GameDataRuntimeCapabilities {
  return {
    contract_version: 2,
    supports_perk_families: true,
    supports_related_equipment_paging: true,
    supports_related_variant_matches: true
  };
}
