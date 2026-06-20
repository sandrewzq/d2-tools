import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import { classifyBucket, type EquipmentGroupKey } from "./classification.js";
import { expandAliasQuery, type ItemAliases } from "./aliases.js";

export type PerkRelatedItem = {
  hash: number;
  name: string;
  group_key?: EquipmentGroupKey;
};

export type PerkSearchResult = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  related_items?: PerkRelatedItem[];
};

export type PerkSearchOptions = {
  limit?: number;
  itemDefinitions?: DefinitionComponentData;
  aliases?: ItemAliases;
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
    const relatedItems = options.itemDefinitions
      ? findRelatedItems(Number(definition.hash), options.itemDefinitions)
      : [];
    if (relatedItems.length) {
      result.related_items = relatedItems;
    }

    results.push(result);
    if (results.length >= limit) {
      break;
    }
  }

  return results;
}

function findRelatedItems(perkHash: number, itemDefinitions: DefinitionComponentData): PerkRelatedItem[] {
  const matches: PerkRelatedItem[] = [];
  for (const definition of Object.values(itemDefinitions)) {
    const name = definition.displayProperties?.name?.trim();
    if (!name || !definitionContainsPlug(definition, perkHash)) {
      continue;
    }

    const groupKey = classifyBucket(definition.inventory?.bucketTypeHash)?.group;
    matches.push({
      hash: Number(definition.hash),
      name,
      ...(groupKey ? { group_key: groupKey } : {})
    });
    if (matches.length >= 8) {
      break;
    }
  }

  return matches;
}

function definitionContainsPlug(definition: DefinitionRecord, perkHash: number): boolean {
  return (definition.sockets?.socketEntries ?? []).some((entry) => {
    if (entry.singleInitialItemHash === perkHash) {
      return true;
    }
    return (entry.reusablePlugItems ?? []).some((plug) => plug.plugItemHash === perkHash);
  });
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
