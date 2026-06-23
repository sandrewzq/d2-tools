import type { VaultItemMatchInfo, WeaponRecommendation } from "@d2-tools/core/community-perks";

export type { VaultItemMatchInfo, WeaponRecommendation };

export type EquipmentGroupKey = "weapons" | "armor" | "equipment" | "other";
export type AmmoTypeKey = "primary" | "special" | "heavy";

export type ArmorStatKey = "mobility" | "resilience" | "recovery" | "discipline" | "intellect" | "strength";

export type ArmorStatSummary = Record<ArmorStatKey, number> & {
  total: number;
};

export type WeaponStatKey =
  | "impact"
  | "range"
  | "stability"
  | "handling"
  | "reload_speed"
  | "magazine"
  | "rounds_per_minute"
  | "charge_time"
  | "draw_time"
  | "recoil_direction";

export type WeaponStatSummary = Partial<Record<WeaponStatKey, number>>;

export type AccountItemPlugSummary = {
  hash: number;
  name: string;
  description?: string;
  icon?: string;
};

export type AccountItemSummary = {
  hash: number;
  instance_id?: string;
  name: string;
  icon?: string;
  item_type?: string;
  ammo_type?: AmmoTypeKey;
  tier?: string;
  bucket_hash?: number;
  bucket_name?: string;
  group_key: EquipmentGroupKey;
  weapon_frame?: WeaponFrameSummary;
  power?: number;
  locked?: boolean;
  armor_stats?: ArmorStatSummary;
  weapon_stats?: WeaponStatSummary;
  socket_plugs?: AccountItemPlugSummary[];
};

export type WeaponFrameSummary = {
  key: string;
  name: string;
};

export type ItemSourceSummary = {
  status: "ready" | "missing";
  label: string;
  description: string;
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

export type AiAdviceSections = {
  facts: string[];
  analysis: string[];
  suggestions: string[];
  action_reminders: string[];
  raw: string;
};
