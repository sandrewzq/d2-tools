import type { ArmorStatKey } from "../loadouts/analysis.js";
import { armorStatKeys } from "./statDefinitions.js";

export { armorStatKeys } from "./statDefinitions.js";

export const armorSlots = ["helmet", "arms", "chest", "legs", "class"] as const;

export type ArmorSlot = typeof armorSlots[number];
export type ArmorLocation = "equipped" | "inventory" | "vault" | "postmaster";
export type ArmorClass = "titan" | "hunter" | "warlock" | "any" | "unknown";
export type ArmorStatValues = Record<ArmorStatKey, number>;

export type ArmorModifierKind =
  | "masterwork"
  | "tuning_shift"
  | "tuning_plus3"
  | "armor_stat_mod"
  | "unclassified_socket";

export type ArmorModifierConfidence = "exact" | "derived" | "ambiguous";

export type ArmorModifierSnapshot = {
  kind: ArmorModifierKind;
  confidence: ArmorModifierConfidence;
  values: ArmorStatValues;
  plug_hash: number;
  plug_name: string;
  category_identifier?: string;
};

export type ArmorArchetypeIdentity = {
  id: string;
  name: string;
  primary_stat: ArmorStatKey;
  secondary_stat: ArmorStatKey;
  tertiary_stat?: ArmorStatKey;
  source_plug_hash?: number;
  confidence: "exact" | "derived";
};

export type ArmorTuningIdentity =
  | {
      mode: "shift";
      from_stat: ArmorStatKey;
      to_stat: ArmorStatKey;
      rolled_to_stat: ArmorStatKey;
      source_plug_hash: number;
    }
  | {
      mode: "plus3";
      source_plug_hash: number;
    };

export type ArmorStatModIdentity = {
  stat: ArmorStatKey;
  value: 5 | 10;
  source_plug_hash: number;
};

export type ArmorMasterworkIdentity = {
  tier?: number;
  values: ArmorStatValues;
  source_plug_hash: number;
};

export type ArmorPieceStatSnapshot = {
  base?: ArmorStatValues;
  socket_total?: ArmorStatValues;
  final: ArmorStatValues;
};

export type ArmorPieceDataQuality = {
  status: "complete" | "partial" | "ambiguous";
  owned_ready: boolean;
  strict_replay_ready: boolean;
  acquisition_identity_ready: boolean;
  checks: {
    has_instance_id: boolean;
    has_slot: boolean;
    has_final_stats: boolean;
    has_base_stats: boolean;
    modifiers_reconciled: boolean;
    has_archetype_identity: boolean;
    has_tuning_identity: boolean;
  };
  warnings: string[];
};

export type ArmorPieceSnapshot = {
  item_hash: number;
  instance_id?: string;
  name: string;
  class: ArmorClass;
  class_type?: number;
  slot?: ArmorSlot;
  location: ArmorLocation;
  source_character_id?: string;
  exotic: boolean;
  exotic_class_item: boolean;
  set?: {
    hash: number;
    name: string;
  };
  stats: ArmorPieceStatSnapshot;
  modifiers: ArmorModifierSnapshot[];
  archetype?: ArmorArchetypeIdentity;
  tuning?: ArmorTuningIdentity;
  armor_stat_mod?: ArmorStatModIdentity;
  masterwork?: ArmorMasterworkIdentity;
  quality: ArmorPieceDataQuality;
};

export function createEmptyArmorStatValues(): ArmorStatValues {
  return {
    health: 0,
    melee: 0,
    grenade: 0,
    super: 0,
    class: 0,
    weapon: 0
  };
}

export function cloneArmorStatValues(
  values: Partial<Record<ArmorStatKey, number>> | undefined
): ArmorStatValues {
  const result = createEmptyArmorStatValues();
  for (const stat of armorStatKeys) {
    result[stat] = finiteStatValue(values?.[stat]);
  }
  return result;
}

export function addArmorStatValues(...blocks: readonly ArmorStatValues[]): ArmorStatValues {
  const result = createEmptyArmorStatValues();
  for (const block of blocks) {
    for (const stat of armorStatKeys) result[stat] += block[stat];
  }
  return result;
}

export function subtractArmorStatValues(
  left: ArmorStatValues,
  right: ArmorStatValues
): ArmorStatValues {
  const result = createEmptyArmorStatValues();
  for (const stat of armorStatKeys) result[stat] = left[stat] - right[stat];
  return result;
}

export function totalArmorStatValues(values: ArmorStatValues): number {
  return armorStatKeys.reduce((total, stat) => total + values[stat], 0);
}

export function hasNonZeroArmorStat(values: ArmorStatValues): boolean {
  return armorStatKeys.some((stat) => values[stat] !== 0);
}

export function equalArmorStatValues(left: ArmorStatValues, right: ArmorStatValues): boolean {
  return armorStatKeys.every((stat) => left[stat] === right[stat]);
}

function finiteStatValue(value: number | undefined): number {
  return Number.isFinite(value) ? Math.trunc(value!) : 0;
}
