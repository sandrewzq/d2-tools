import type { ItemAliases } from "@d2-tools/core/items/aliases";
import type {
  PerkRelatedEquipmentPage,
  PerkRelatedEquipmentQuery,
  PerkSearchResult
} from "@d2-tools/core/items/perkSearch";
import type { ItemSearchResult } from "@d2-tools/core/items/search";
import type { WeaponIdentityRelation } from "@d2-tools/core/community-perks";

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

export type WeaponIdentityQuery = {
  item_hashes: number[];
};

export type ItemNameQuery = {
  /**
   * 官方名（中文名或英文名）。写法差异不影响命中：比对时会去掉空格、标点与大小写。
   *
   * 返回这些名字下的**全部**官方版本：同名武器的历次复刻都在内，不做代表版本折叠、不设条数上限。
   * 人工表格只写了武器名时要靠它拿到完整定义池，用 `searchItems` 代劳会漏版本（见 T56）。
   */
  names: string[];
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
  getItemHashesByExactName(input: ItemNameQuery): Promise<number[]>;
  getWeaponIdentityRelations(input: WeaponIdentityQuery): Promise<WeaponIdentityRelation[]>;
};

export function getGameDataRuntimeCapabilities(): GameDataRuntimeCapabilities {
  return {
    contract_version: 2,
    supports_perk_families: true,
    supports_related_equipment_paging: true,
    supports_related_variant_matches: true
  };
}
