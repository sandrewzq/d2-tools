import type { DestinyManifestMetadata } from "./metadata.js";

export type DefinitionComponentName =
  | "DestinyInventoryItemDefinition"
  | "DestinyPlugSetDefinition"
  | "DestinySandboxPerkDefinition"
  | "DestinyActivityDefinition"
  | "DestinyMilestoneDefinition"
  | "DestinyVendorDefinition"
  | "DestinyInventoryBucketDefinition"
  | "DestinyLoadoutNameDefinition";

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
  inventory?: {
    tierTypeName?: string;
    bucketTypeHash?: number;
  };
  equippingBlock?: {
    ammoType?: number;
  };
  sourceData?: {
    sourceString?: string;
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
  sockets?: {
    socketEntries?: Array<{
      reusablePlugItems?: Array<{ plugItemHash?: number }>;
      reusablePlugSetHash?: number;
      randomizedPlugSetHash?: number;
      singleInitialItemHash?: number;
      hidePerksInItemTooltip?: boolean;
    }>;
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
  "DestinyPlugSetDefinition",
  "DestinySandboxPerkDefinition",
  "DestinyActivityDefinition",
  "DestinyMilestoneDefinition",
  "DestinyVendorDefinition",
  "DestinyInventoryBucketDefinition",
  "DestinyLoadoutNameDefinition"
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
