import type { DefinitionComponentData } from "../manifest/definitions.js";

export type PerkRef = {
  hash: number;
  name: string;
  englishName?: string;
  description?: string;
  icon?: string;
};

export type PerkCombo = {
  perks: PerkRef[];
  popularity?: number;
  source: "dim_wishlist" | "ai_lightgg" | "local_community";
  mode: "pve" | "pvp" | "general";
  note?: string;
};

export type WeaponRecommendation = {
  item_hash: number;
  item_name: string;
  combos: PerkCombo[];
  matched_modes: Array<"pve" | "pvp" | "general">;
  individual_perks?: PerkRef[];
  sample_size?: number;
  source_label?: string;
  ai_analysis?: string;
  source_warnings?: string[];
  disclaimer?: string;
};

export type SourceOptions = {
  itemDefinitions?: DefinitionComponentData;
  plugSetDefinitions?: DefinitionComponentData;
  englishItemDefinitions?: DefinitionComponentData;
  englishPlugSetDefinitions?: DefinitionComponentData;
  item_name?: string;
};

export interface CommunityPerkSource {
  name: string;
  isAvailable(config: { data?: { data_dir?: string } } | null | undefined): boolean;
  getRecommendations(
    item_hash: number,
    options: SourceOptions
  ): Promise<WeaponRecommendation | null>;
}

export type VaultItemMatchInfo = {
  matched: number;
  available: number;
  modes: Array<"pve" | "pvp" | "general">;
  sample_perks?: PerkRef[];
  source_label?: string;
};

export type VaultItemMatchInput = {
  hash: number;
  socket_plugs?: Array<{ hash: number }>;
};
