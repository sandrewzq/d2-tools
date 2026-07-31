import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";

export type EquipableItemSetSummary = {
  hash: number;
  name: string;
  description?: string;
  bonuses?: EquipableItemSetBonus[];
};

export type EquipableItemSetBonus = {
  required_piece_count: number;
  perk_hash: number;
  name?: string;
  description?: string;
  icon?: string;
};

export function summarizeEquipableItemSet(
  definition: DefinitionRecord,
  setDefinitions: DefinitionComponentData | undefined,
  sandboxPerkDefinitions: DefinitionComponentData | undefined
): EquipableItemSetSummary | undefined {
  const setHash = definition.equippingBlock?.equipableItemSetHash;
  if (typeof setHash !== "number") return undefined;
  const set = setDefinitions?.[String(setHash)];
  const name = set?.displayProperties?.name?.trim();
  if (!set || !name) return undefined;
  const description = set.displayProperties?.description?.trim();
  const bonuses = (set.setPerks ?? [])
    .flatMap((bonus) => {
      const requiredPieceCount = bonus.requiredSetCount;
      const perkHash = bonus.sandboxPerkHash;
      if (
        typeof requiredPieceCount !== "number"
        || !Number.isInteger(requiredPieceCount)
        || requiredPieceCount < 1
        || typeof perkHash !== "number"
      ) {
        return [];
      }
      const perk = sandboxPerkDefinitions?.[String(perkHash)];
      const perkName = perk?.displayProperties?.name?.trim();
      const perkDescription = perk?.displayProperties?.description?.trim();
      const icon = normalizeBungieAssetUrl(perk?.displayProperties?.icon);
      return [{
        required_piece_count: requiredPieceCount,
        perk_hash: perkHash,
        ...(perkName ? { name: perkName } : {}),
        ...(perkDescription ? { description: perkDescription } : {}),
        ...(icon ? { icon } : {})
      }];
    })
    .sort((left, right) => left.required_piece_count - right.required_piece_count || left.perk_hash - right.perk_hash);
  return {
    hash: setHash,
    name,
    ...(description ? { description } : {}),
    ...(bonuses.length ? { bonuses } : {})
  };
}

function normalizeBungieAssetUrl(value: string | undefined): string | undefined {
  const path = value?.trim();
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `https://www.bungie.net${path.startsWith("/") ? path : `/${path}`}`;
}
