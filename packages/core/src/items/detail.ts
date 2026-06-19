import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import { summarizeItemPerks, type ItemPerkGroup } from "./perks.js";
import { summarizeItemSource, type ItemSourceSummary } from "./source.js";

export type ItemDefinitionDetail = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  source: ItemSourceSummary;
  perks?: ItemPerkGroup[];
};

export type ItemDefinitionDetailOptions = {
  plugSetDefinitions?: DefinitionComponentData;
};

const bungieStaticBaseUrl = "https://www.bungie.net";

export function getItemDefinitionDetail(
  definitions: DefinitionComponentData,
  hash: number,
  options: ItemDefinitionDetailOptions = {}
): ItemDefinitionDetail | null {
  const definition = definitions[String(hash)];
  if (!definition) {
    return null;
  }

  const detail: ItemDefinitionDetail = {
    hash: Number(definition.hash ?? hash),
    name: definition.displayProperties?.name ?? "",
    description: definition.displayProperties?.description ?? "",
    icon: normalizeBungieAssetUrl(definition.displayProperties?.icon),
    item_type: definition.itemTypeDisplayName,
    tier: definition.inventory?.tierTypeName,
    source: summarizeItemSource(definition as DefinitionRecord)
  };

  const perks = summarizeItemPerks(definition as DefinitionRecord, definitions, {
    plugSetDefinitions: options.plugSetDefinitions,
    maxPlugsPerSocket: 8
  });
  if (perks.length > 0) {
    detail.perks = perks;
  }

  return detail;
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
