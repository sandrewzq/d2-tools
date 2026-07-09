import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import { expandAliasQuery, type ItemAliases } from "./aliases.js";
import { ammoTypeKey, classifyBucket, type AmmoTypeKey, type EquipmentGroupKey } from "./classification.js";
import { summarizeItemPerks, type ItemPerkGroup } from "./perks.js";
import { summarizeItemSource, type ItemSourceSummary } from "./source.js";
import { summarizeWeaponFrame, type WeaponFrameSummary } from "./weaponFrames.js";

export type ItemSearchOptions = {
  limit?: number;
  plugSetDefinitions?: DefinitionComponentData;
  statDefinitions?: DefinitionComponentData;
  aliases?: ItemAliases;
};

export type ItemDefinitionStat = {
  hash: number;
  name: string;
  value: number;
  display_maximum: number;
};

export type ItemSearchResult = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  ammo_type?: AmmoTypeKey;
  bucket_hash?: number;
  bucket_name?: string;
  group_key: EquipmentGroupKey;
  weapon_frame?: WeaponFrameSummary;
  source: ItemSourceSummary;
  definition_stats?: ItemDefinitionStat[];
  perks?: ItemPerkGroup[];
};

const bungieStaticBaseUrl = "https://www.bungie.net";
const nonEquipmentItemTypes = new Set([
  19, // Mod
  20, // Dummy
  30 // Pattern
]);

export function searchItemDefinitions(
  definitions: DefinitionComponentData,
  query: string,
  options: ItemSearchOptions = {}
): ItemSearchResult[] {
  const terms = options.aliases ? expandAliasQuery(query, options.aliases) : [query.trim()];
  const normalizedTerms = terms.map((term) => term.toLocaleLowerCase()).filter(Boolean);
  if (!normalizedTerms.length) {
    return [];
  }

  const limit = options.limit ?? 20;
  const results: ItemSearchResult[] = [];

  for (const definition of Object.values(definitions)) {
    const name = definition.displayProperties?.name?.trim();
    if (!name || !normalizedTerms.some((term) => name.toLocaleLowerCase().includes(term))) {
      continue;
    }
    if (!isSearchableEquipmentDefinition(definition)) {
      continue;
    }

    results.push(toItemSearchResult(definition, definitions, options));
    if (results.length >= limit) {
      break;
    }
  }

  return results;
}

function isSearchableEquipmentDefinition(definition: DefinitionRecord): boolean {
  return typeof definition.itemType !== "number" || !nonEquipmentItemTypes.has(definition.itemType);
}

function toItemSearchResult(
  definition: DefinitionRecord,
  definitions: DefinitionComponentData,
  options: ItemSearchOptions
): ItemSearchResult {
  const bucketHash = definition.inventory?.bucketTypeHash;
  const bucket = classifyBucket(bucketHash);
  const result: ItemSearchResult = {
    hash: Number(definition.hash),
    name: definition.displayProperties?.name ?? "",
    description: definition.displayProperties?.description ?? "",
    icon: normalizeBungieAssetUrl(definition.displayProperties?.icon),
    item_type: definition.itemTypeDisplayName,
    group_key: bucket?.group ?? "other",
    tier: definition.inventory?.tierTypeName,
    source: summarizeItemSource(definition)
  };
  const ammoType = ammoTypeKey(definition.equippingBlock?.ammoType);
  if (ammoType) {
    result.ammo_type = ammoType;
  }
  if (bucketHash) {
    result.bucket_hash = bucketHash;
  }
  if (bucket?.name) {
    result.bucket_name = bucket.name;
  }
  const weaponFrame = summarizeWeaponFrame(definition, definitions, {
    plugSetDefinitions: options.plugSetDefinitions
  });
  if (weaponFrame) {
    result.weapon_frame = weaponFrame;
  }

  const definitionStats = summarizeDefinitionStats(definition, options.statDefinitions);
  if (definitionStats.length > 0) {
    result.definition_stats = definitionStats;
  }

  const perks = summarizeItemPerks(definition, definitions, {
    plugSetDefinitions: options.plugSetDefinitions,
    maxPlugsPerSocket: 6
  });
  if (perks.length > 0) {
    result.perks = perks;
  }

  return result;
}

function summarizeDefinitionStats(
  definition: DefinitionRecord,
  statDefinitions: DefinitionComponentData | undefined
): ItemDefinitionStat[] {
  if (!statDefinitions) {
    return [];
  }

  return Object.entries(definition.stats?.stats ?? {})
    .map(([statKey, stat]) => {
      const hash = Number(stat.statHash ?? statKey);
      const value = Number(stat.value ?? 0);
      const statDefinition = statDefinitions[String(hash)];
      const name = statDefinition?.displayProperties?.name?.trim();
      if (!Number.isFinite(hash) || !Number.isFinite(value) || value <= 0 || !name) {
        return null;
      }

      const displayMaximum = Number(stat.displayMaximum ?? stat.maximum ?? 100);
      return {
        hash,
        name,
        value,
        display_maximum: Number.isFinite(displayMaximum) && displayMaximum > 0 ? displayMaximum : 100,
        order: statDefinition?.index ?? Number.MAX_SAFE_INTEGER
      };
    })
    .filter((stat): stat is ItemDefinitionStat & { order: number } => Boolean(stat))
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name, "zh-Hans-CN"))
    .map(({ order: _order, ...stat }) => stat);
}

function normalizeBungieAssetUrl(path: string | undefined): string | undefined {
  if (!path) {
    return undefined;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return new URL(path, bungieStaticBaseUrl).toString();
}
