import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";

export type ItemIntrinsicTraitSummary = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
};

const bungieStaticBaseUrl = "https://www.bungie.net";

export function summarizeItemIntrinsicTraits(
  item: DefinitionRecord,
  itemDefinitions: DefinitionComponentData
): ItemIntrinsicTraitSummary[] {
  const traits = (item.sockets?.socketEntries ?? [])
    .flatMap((entry) => typeof entry.singleInitialItemHash === "number" ? [entry.singleInitialItemHash] : [])
    .map((hash) => ({ hash, definition: itemDefinitions[String(hash)] }))
    .filter((entry) => entry.definition?.plug?.plugCategoryIdentifier === "intrinsics")
    .map(({ hash, definition }) => ({
      hash,
      name: definition?.displayProperties?.name?.trim() ?? "",
      description: definition?.displayProperties?.description?.trim() ?? "",
      icon: normalizeBungieAssetUrl(definition?.displayProperties?.icon)
    }))
    .filter((trait): trait is ItemIntrinsicTraitSummary => Boolean(trait.name));

  return [...new Map(traits.map((trait) => [trait.hash, trait])).values()];
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
