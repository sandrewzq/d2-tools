import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import { classifyBucket, type EquipmentGroupKey } from "./classification.js";
import { expandAliasQuery, type ItemAliases } from "./aliases.js";
import { summarizeItemRelease, type ItemReleaseSummary } from "./release.js";

export type PerkRelatedItem = {
  hash: number;
  name: string;
  icon?: string;
  item_type?: string;
  group_key?: EquipmentGroupKey;
  release?: ItemReleaseSummary;
};

export type PerkSearchResult = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  related_items?: PerkRelatedItem[];
  related_items_truncated?: boolean;
};

export type PerkSearchOptions = {
  limit?: number;
  itemDefinitions?: DefinitionComponentData;
  plugSetDefinitions?: DefinitionComponentData;
  aliases?: ItemAliases;
  relatedItemLimit?: number;
};

const bungieStaticBaseUrl = "https://www.bungie.net";

export function searchPerkDefinitions(
  perkDefinitions: DefinitionComponentData,
  query: string,
  options: PerkSearchOptions = {}
): PerkSearchResult[] {
  const terms = options.aliases ? expandAliasQuery(query, options.aliases) : [query.trim()];
  const normalizedTerms = terms.map((term) => term.toLocaleLowerCase()).filter(Boolean);
  if (!normalizedTerms.length) {
    return [];
  }

  const limit = options.limit ?? 20;
  const results: PerkSearchResult[] = [];

  for (const definition of Object.values(perkDefinitions)) {
    const name = definition.displayProperties?.name?.trim();
    const description = definition.displayProperties?.description?.trim() ?? "";
    if (!name) {
      continue;
    }

    const searchable = `${name}\n${description}`.toLocaleLowerCase();
    if (!normalizedTerms.some((term) => searchable.includes(term))) {
      continue;
    }

    const result: PerkSearchResult = {
      hash: Number(definition.hash),
      name,
      description,
      icon: normalizeBungieAssetUrl(definition.displayProperties?.icon)
    };
    const related = options.itemDefinitions
      ? findRelatedItems(
        buildRelatedPlugHashes(Number(definition.hash), options.itemDefinitions),
        options.itemDefinitions,
        options.plugSetDefinitions,
        options.relatedItemLimit ?? 8
      )
      : { items: [], truncated: false };
    if (related.items.length) {
      result.related_items = related.items;
    }
    if (related.truncated) {
      result.related_items_truncated = true;
    }

    results.push(result);
    if (results.length >= limit) {
      break;
    }
  }

  return results;
}

function findRelatedItems(
  perkHashes: Set<number>,
  itemDefinitions: DefinitionComponentData,
  plugSetDefinitions: DefinitionComponentData | undefined,
  requestedLimit: number
): { items: PerkRelatedItem[]; truncated: boolean } {
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.trunc(requestedLimit))
    : 8;
  const matches: PerkRelatedItem[] = [];
  for (const definition of Object.values(itemDefinitions)) {
    const name = definition.displayProperties?.name?.trim();
    if (!name || !definitionContainsPlug(definition, perkHashes, plugSetDefinitions)) {
      continue;
    }

    const groupKey = classifyBucket(definition.inventory?.bucketTypeHash)?.group;
    const icon = normalizeBungieAssetUrl(definition.displayProperties?.icon);
    const release = summarizeItemRelease(definition, undefined);
    matches.push({
      hash: Number(definition.hash),
      name,
      ...(icon ? { icon } : {}),
      ...(definition.itemTypeDisplayName ? { item_type: definition.itemTypeDisplayName } : {}),
      ...(groupKey ? { group_key: groupKey } : {}),
      ...(release ? { release } : {})
    });
    if (matches.length > limit) {
      break;
    }
  }

  return {
    items: matches.slice(0, limit),
    truncated: matches.length > limit
  };
}

function definitionContainsPlug(
  definition: DefinitionRecord,
  perkHashes: Set<number>,
  plugSetDefinitions: DefinitionComponentData | undefined
): boolean {
  return (definition.sockets?.socketEntries ?? []).some((entry) => {
    if (typeof entry.singleInitialItemHash === "number" && perkHashes.has(entry.singleInitialItemHash)) {
      return true;
    }
    if ((entry.reusablePlugItems ?? []).some((plug) => typeof plug.plugItemHash === "number" && perkHashes.has(plug.plugItemHash))) {
      return true;
    }

    return [
      entry.reusablePlugSetHash,
      entry.randomizedPlugSetHash
    ].some((plugSetHash) => plugSetContainsPlug(plugSetDefinitions, plugSetHash, perkHashes));
  });
}

function plugSetContainsPlug(
  plugSetDefinitions: DefinitionComponentData | undefined,
  plugSetHash: number | undefined,
  perkHashes: Set<number>
): boolean {
  if (!plugSetDefinitions || typeof plugSetHash !== "number") {
    return false;
  }

  return (plugSetDefinitions[String(plugSetHash)]?.reusablePlugItems ?? [])
    .some((plug) => typeof plug.plugItemHash === "number" && perkHashes.has(plug.plugItemHash));
}

function buildRelatedPlugHashes(
  sandboxPerkHash: number,
  itemDefinitions: DefinitionComponentData
): Set<number> {
  const hashes = new Set<number>([sandboxPerkHash]);
  for (const definition of Object.values(itemDefinitions)) {
    const plugHash = Number(definition.hash);
    if (!Number.isFinite(plugHash)) {
      continue;
    }

    if ((definition.perks ?? []).some((perk) => perk.perkHash === sandboxPerkHash)) {
      hashes.add(plugHash);
    }
  }
  return hashes;
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
