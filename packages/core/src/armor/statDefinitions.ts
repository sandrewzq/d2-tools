import type { ArmorStatKey } from "../loadouts/analysis.js";

export const armorStatKeys = [
  "health",
  "melee",
  "grenade",
  "super",
  "class",
  "weapon"
] as const satisfies readonly ArmorStatKey[];

export const armorStatKeyByDefinitionHash: Readonly<Record<number, ArmorStatKey>> = {
  392767087: "health",
  4244567218: "melee",
  1735777505: "grenade",
  144602215: "super",
  1943323491: "class",
  2996146975: "weapon"
};

export const armorStatDefinitionHashByKey: Readonly<Record<ArmorStatKey, number>> = {
  health: 392767087,
  melee: 4244567218,
  grenade: 1735777505,
  super: 144602215,
  class: 1943323491,
  weapon: 2996146975
};
