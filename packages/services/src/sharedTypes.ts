export type VaultItemMatchInfo = {
  matched: number;
  available: number;
  modes: Array<"pve" | "pvp" | "general">;
  sample_perks?: Array<{ hash: number; name: string; englishName?: string; description?: string; icon?: string }>;
  source_label?: string;
};

export type WeaponRecommendation = {
  item_hash: number;
  item_name: string;
  combos: Array<{
    perks: Array<{ hash: number; name: string; englishName?: string; description?: string; icon?: string }>;
    popularity?: number;
    source: "dim_wishlist" | "ai_lightgg" | "local_community";
    mode: "pve" | "pvp" | "general";
    note?: string;
  }>;
  matched_modes: Array<"pve" | "pvp" | "general">;
  individual_perks?: Array<{ hash: number; name: string; englishName?: string; description?: string; icon?: string }>;
  sample_size?: number;
  source_label?: string;
  ai_analysis?: string;
  source_warnings?: string[];
  disclaimer?: string;
};
