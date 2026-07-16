import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";

export type ItemPlugSummary = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  category_identifier?: string;
  source_description?: string;
  item_type?: string;
};

export type ItemPerkGroup = {
  socket_index: number;
  plugs: ItemPlugSummary[];
};

export type SummarizeItemPerksOptions = {
  plugSetDefinitions?: DefinitionComponentData;
  maxPlugsPerSocket?: number | null;
};

const bungieStaticBaseUrl = "https://www.bungie.net";

export function summarizeItemPerks(
  item: DefinitionRecord,
  itemDefinitions: DefinitionComponentData,
  options: SummarizeItemPerksOptions
): ItemPerkGroup[] {
  const entries = item.sockets?.socketEntries ?? [];
  const groups: ItemPerkGroup[] = [];

  entries.forEach((entry, index) => {
    if (entry.hidePerksInItemTooltip) {
      return;
    }

    const hashes = [
      ...(typeof entry.singleInitialItemHash === "number" ? [entry.singleInitialItemHash] : []),
      ...hashesFromReusablePlugItems(entry.reusablePlugItems),
      ...hashesFromPlugSet(options.plugSetDefinitions, entry.reusablePlugSetHash),
      ...hashesFromPlugSet(options.plugSetDefinitions, entry.randomizedPlugSetHash)
    ];
    const plugs = uniqueNumbers(hashes)
      .map((hash) => toPlugSummary(hash, itemDefinitions[String(hash)]))
      .filter((plug): plug is ItemPlugSummary => Boolean(plug));
    const visiblePlugs = options.maxPlugsPerSocket === null
      ? plugs
      : plugs.slice(0, options.maxPlugsPerSocket ?? 8);

    if (visiblePlugs.length > 0) {
      groups.push({
        socket_index: index,
        plugs: visiblePlugs
      });
    }
  });

  return groups;
}

function hashesFromReusablePlugItems(
  reusablePlugItems: Array<{ plugItemHash?: number }> | undefined
): number[] {
  return (reusablePlugItems ?? [])
    .map((item) => item.plugItemHash)
    .filter((hash): hash is number => typeof hash === "number");
}

function hashesFromPlugSet(
  plugSetDefinitions: DefinitionComponentData | undefined,
  plugSetHash: number | undefined
): number[] {
  if (!plugSetDefinitions || typeof plugSetHash !== "number") {
    return [];
  }

  return hashesFromReusablePlugItems(plugSetDefinitions[String(plugSetHash)]?.reusablePlugItems);
}

function toPlugSummary(
  hash: number,
  definition: DefinitionRecord | undefined
): ItemPlugSummary | null {
  if (!definition) {
    return null;
  }

  const name = definition.displayProperties?.name?.trim();
  if (!name) {
    return null;
  }

  return {
    hash,
    name,
    description: definition.displayProperties?.description ?? "",
    icon: normalizeBungieAssetUrl(definition.displayProperties?.icon),
    ...(definition.plug?.plugCategoryIdentifier
      ? { category_identifier: definition.plug.plugCategoryIdentifier }
      : {}),
    ...(definition.sourceData?.sourceString
      ? { source_description: definition.sourceData.sourceString }
      : {}),
    ...(definition.itemTypeDisplayName ? { item_type: definition.itemTypeDisplayName } : {})
  };
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)];
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
