import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";

export type EquipableItemSetSummary = {
  hash: number;
  name: string;
  description?: string;
  bonuses?: EquipableItemSetBonus[];
};

export type ArmorSetCatalogItem = Pick<EquipableItemSetSummary, "hash" | "name">;

export type ArmorSetCatalogMember = {
  item_hash: number;
  class_type?: number;
  bucket_hash?: number;
};

export type ArmorSetCatalogEntry = EquipableItemSetSummary & {
  members: ArmorSetCatalogMember[];
  member_definitions_complete: boolean;
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
  return set ? summarizeEquipableItemSetDefinition(setHash, set, sandboxPerkDefinitions) : undefined;
}

export function buildArmorSetCatalog(
  setDefinitions: DefinitionComponentData,
  itemDefinitions: DefinitionComponentData,
  sandboxPerkDefinitions: DefinitionComponentData | undefined
): ArmorSetCatalogEntry[] {
  return Object.entries(setDefinitions)
    .flatMap(([key, definition]) => {
      const hash = toUnsignedHash(Number(definition.hash ?? key));
      const summary = summarizeEquipableItemSetDefinition(
        hash,
        definition,
        sandboxPerkDefinitions
      );
      if (!summary) return [];

      const itemHashes = uniqueUnsignedHashes(definition.setItems ?? []);
      const members = itemHashes.map((itemHash) => {
        const item = itemDefinitions[String(itemHash)];
        return {
          item_hash: itemHash,
          ...(typeof item?.classType === "number" ? { class_type: item.classType } : {}),
          ...(typeof item?.inventory?.bucketTypeHash === "number"
            ? { bucket_hash: toUnsignedHash(item.inventory.bucketTypeHash) }
            : {})
        };
      });
      return [{
        ...summary,
        members,
        member_definitions_complete: itemHashes.length > 0
          && itemHashes.every((itemHash) => Boolean(itemDefinitions[String(itemHash)]))
      }];
    })
    .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN") || left.hash - right.hash);
}

function summarizeEquipableItemSetDefinition(
  setHash: number,
  set: DefinitionRecord,
  sandboxPerkDefinitions: DefinitionComponentData | undefined
): EquipableItemSetSummary | undefined {
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
    hash: toUnsignedHash(setHash),
    name,
    ...(description ? { description } : {}),
    ...(bonuses.length ? { bonuses } : {})
  };
}

function uniqueUnsignedHashes(values: readonly number[]): number[] {
  return [...new Set(values
    .map(toUnsignedHash)
    .filter((value) => value !== 0))];
}

function toUnsignedHash(value: number): number {
  return Number.isFinite(value) ? value >>> 0 : 0;
}

function normalizeBungieAssetUrl(value: string | undefined): string | undefined {
  const path = value?.trim();
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `https://www.bungie.net${path.startsWith("/") ? path : `/${path}`}`;
}
