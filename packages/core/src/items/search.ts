import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import { expandAliasQuery, type ItemAliases } from "./aliases.js";
import { ammoTypeKey, classifyBucket, type AmmoTypeKey, type EquipmentGroupKey } from "./classification.js";
import { summarizeItemPerks, type ItemPerkGroup } from "./perks.js";
import { summarizeItemSource, type ItemSourceSummary } from "./source.js";

export type ItemSearchOptions = {
  limit?: number;
  plugSetDefinitions?: DefinitionComponentData;
  aliases?: ItemAliases;
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
  source: ItemSourceSummary;
  perks?: ItemPerkGroup[];
};

const bungieStaticBaseUrl = "https://www.bungie.net";

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

    results.push(toItemSearchResult(definition, definitions, options));
    if (results.length >= limit) {
      break;
    }
  }

  return results;
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

  const perks = summarizeItemPerks(definition, definitions, {
    plugSetDefinitions: options.plugSetDefinitions,
    maxPlugsPerSocket: 6
  });
  if (perks.length > 0) {
    result.perks = perks;
  }

  return result;
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
