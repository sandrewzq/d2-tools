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
    .map(({ hash, definition }): ItemIntrinsicTraitSummary | null => {
      const name = definition?.displayProperties?.name?.trim();
      if (!name) {
        return null;
      }

      const trait: ItemIntrinsicTraitSummary = {
        hash,
        name,
        description: definition?.displayProperties?.description?.trim() ?? ""
      };
      const icon = normalizeBungieAssetUrl(definition?.displayProperties?.icon);
      if (icon) {
        trait.icon = icon;
      }
      return trait;
    })
    .filter((trait): trait is ItemIntrinsicTraitSummary => trait !== null);

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
