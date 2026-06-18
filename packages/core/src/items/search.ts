import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";

export type ItemSearchOptions = {
  limit?: number;
};

export type ItemSearchResult = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  item_type?: string;
  tier?: string;
};

const bungieStaticBaseUrl = "https://www.bungie.net";

export function searchItemDefinitions(
  definitions: DefinitionComponentData,
  query: string,
  options: ItemSearchOptions = {}
): ItemSearchResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const limit = options.limit ?? 20;
  const results: ItemSearchResult[] = [];

  for (const definition of Object.values(definitions)) {
    const name = definition.displayProperties?.name?.trim();
    if (!name || !name.toLocaleLowerCase().includes(normalizedQuery)) {
      continue;
    }

    results.push(toItemSearchResult(definition));
    if (results.length >= limit) {
      break;
    }
  }

  return results;
}

function toItemSearchResult(definition: DefinitionRecord): ItemSearchResult {
  return {
    hash: Number(definition.hash),
    name: definition.displayProperties?.name ?? "",
    description: definition.displayProperties?.description ?? "",
    icon: normalizeBungieAssetUrl(definition.displayProperties?.icon),
    item_type: definition.itemTypeDisplayName,
    tier: definition.inventory?.tierTypeName
  };
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
