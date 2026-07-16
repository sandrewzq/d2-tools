import type { DestinyManifestMetadata } from "./metadata.js";

export type DefinitionComponentName =
  | "DestinyInventoryItemDefinition"
  | "DestinyBreakerTypeDefinition"
  | "DestinyDamageTypeDefinition"
  | "DestinyPlugSetDefinition"
  | "DestinySandboxPerkDefinition"
  | "DestinyCollectibleDefinition"
  | "DestinyActivityDefinition"
  | "DestinyMilestoneDefinition"
  | "DestinyVendorDefinition"
  | "DestinyInventoryBucketDefinition"
  | "DestinyLoadoutNameDefinition"
  | "DestinyStatDefinition"
  | "DestinyActivityModifierDefinition"
  | "DestinyDestinationDefinition"
  | "DestinyPlaceDefinition"
  | "DestinyObjectiveDefinition";

export type DefinitionRecord = {
  hash?: number;
  name?: string;
  displayProperties?: {
    name?: string;
    description?: string;
    icon?: string;
  };
  originalDisplayProperties?: {
    name?: string;
    description?: string;
    icon?: string;
  };
  itemTypeDisplayName?: string;
  classType?: number;
  inventory?: {
    tierTypeName?: string;
    bucketTypeHash?: number;
  };
  equippingBlock?: {
    ammoType?: number;
    damageType?: number;
  };
  defaultDamageType?: number;
  defaultDamageTypeHash?: number;
  damageTypeHashes?: number[];
  breakerType?: number;
  breakerTypeHash?: number;
  enumValue?: number;
  isAdept?: boolean;
  sourceData?: {
    sourceString?: string;
  };
  collectibleHash?: number;
  displaySource?: string;
  sourceString?: string;
  sourceHash?: number;
  progressDescription?: string;
  completionValue?: number;
  translationBlock?: {
    artArrangementHash?: number;
    arrangements?: Array<{
      artArrangementHash?: number;
      classHash?: number;
    }>;
  };
  traitIds?: string[];
  stats?: {
    stats?: Record<string, {
      statHash?: number;
      value?: number;
      displayMaximum?: number;
      maximum?: number;
    }>;
  };
  investmentStats?: Array<{
    statTypeHash?: number;
    value?: number;
    isConditionallyActive?: boolean;
  }>;
  perks?: Array<{
    requirementDisplayString?: string;
    perkHash?: number;
    perkVisibility?: number;
  }>;
  reusablePlugItems?: Array<{
    plugItemHash?: number;
  }>;
  itemCount?: number;
  fifo?: boolean;
  scope?: number;
  index?: number;
  sockets?: {
    socketEntries?: Array<{
      reusablePlugItems?: Array<{ plugItemHash?: number }>;
      reusablePlugSetHash?: number;
      randomizedPlugSetHash?: number;
      singleInitialItemHash?: number;
      hidePerksInItemTooltip?: boolean;
    }>;
  };
  plug?: {
    plugCategoryIdentifier?: string;
  };
  [key: string]: unknown;
};

export type DefinitionComponentData = Record<string, DefinitionRecord>;

export type DefinitionComponentStatus = {
  initialized: boolean;
  component?: DefinitionComponentName;
  language?: string;
  cached_at?: string;
  count?: number;
};

export const requiredDefinitionComponents: DefinitionComponentName[] = [
  "DestinyInventoryItemDefinition",
  "DestinyBreakerTypeDefinition",
  "DestinyDamageTypeDefinition",
  "DestinyPlugSetDefinition",
  "DestinySandboxPerkDefinition",
  "DestinyCollectibleDefinition",
  "DestinyActivityDefinition",
  "DestinyMilestoneDefinition",
  "DestinyVendorDefinition",
  "DestinyInventoryBucketDefinition",
  "DestinyLoadoutNameDefinition",
  "DestinyStatDefinition",
  "DestinyActivityModifierDefinition",
  "DestinyDestinationDefinition",
  "DestinyPlaceDefinition",
  "DestinyObjectiveDefinition"
];

export function selectDefinitionComponentPath(
  metadata: DestinyManifestMetadata,
  language: string,
  component: DefinitionComponentName
): string {
  const paths = metadata.jsonWorldComponentContentPaths;
  if (!paths) {
    throw new Error("Manifest metadata does not include JSON component paths");
  }

  const normalizedLanguage = language.trim().toLowerCase();
  const languagePaths = paths[normalizedLanguage] ?? paths.en ?? Object.values(paths)[0];
  const componentPath = languagePaths?.[component];

  if (!componentPath) {
    throw new Error(`Manifest metadata does not include ${component}`);
  }

  return componentPath;
}
