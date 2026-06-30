import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
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

export type InitializeDefinitionComponentOptions = {
  dataDir: string;
  language: string;
  metadata: DestinyManifestMetadata;
  component: DefinitionComponentName;
  writeDefaultCache?: boolean;
  fetchJson?: (url: string) => Promise<DefinitionComponentData>;
  now?: () => Date;
};

type DefinitionComponentCache = {
  cached_at: string;
  component: DefinitionComponentName;
  language: string;
  source_path: string;
  count: number;
  data: DefinitionComponentData;
};

const bungieStaticBaseUrl = "https://www.bungie.net";
const definitionMemoryCache = new Map<string, DefinitionComponentCache>();
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

export async function initializeDefinitionComponent(
  options: InitializeDefinitionComponentOptions
): Promise<DefinitionComponentStatus> {
  const language = normalizeDefinitionLanguage(options.language);
  const sourcePath = selectDefinitionComponentPath(
    options.metadata,
    language,
    options.component
  );
  const data = await (options.fetchJson ?? fetchDefinitionJson)(staticContentUrl(sourcePath));
  const cache: DefinitionComponentCache = {
    cached_at: (options.now ?? (() => new Date()))().toISOString(),
    component: options.component,
    language,
    source_path: sourcePath,
    count: Object.keys(data).length,
    data
  };

  mkdirSync(definitionDir(options.dataDir), { recursive: true });
  writeDefinitionCache(definitionCachePathForLanguage(options.dataDir, options.component, language), cache);
  if (options.writeDefaultCache !== false) {
    writeDefinitionCache(definitionCachePath(options.dataDir, options.component), cache);
  }

  return statusFromCache(cache);
}

export function loadDefinitionComponent(
  dataDir: string,
  component: DefinitionComponentName
): DefinitionComponentData | null {
  return loadDefinitionComponentCache(dataDir, component)?.data ?? null;
}

export function loadDefinitionComponentByLanguage(
  dataDir: string,
  component: DefinitionComponentName,
  language: string
): DefinitionComponentData | null {
  return loadDefinitionComponentCacheByLanguage(dataDir, component, language)?.data ?? null;
}

export function getDefinitionStatus(
  dataDir: string,
  component: DefinitionComponentName
): DefinitionComponentStatus {
  const cache = loadDefinitionComponentCache(dataDir, component);
  return cache ? statusFromCache(cache) : { initialized: false };
}

export function hasRequiredDefinitionComponents(dataDir: string): boolean {
  return requiredDefinitionComponents.every((component) =>
    getDefinitionStatus(dataDir, component).initialized
  );
}

function loadDefinitionComponentCache(
  dataDir: string,
  component: DefinitionComponentName
): DefinitionComponentCache | null {
  return loadDefinitionComponentCacheByLanguage(dataDir, component, "");
}

function loadDefinitionComponentCacheByLanguage(
  dataDir: string,
  component: DefinitionComponentName,
  language: string
): DefinitionComponentCache | null {
  const path = definitionCachePathForLanguage(dataDir, component, language);
  const cached = definitionMemoryCache.get(path);
  if (cached) {
    return cached;
  }
  if (!existsSync(path)) {
    return null;
  }

  const loaded = JSON.parse(readFileSync(path, "utf8")) as DefinitionComponentCache;
  definitionMemoryCache.set(path, loaded);
  return loaded;
}

function definitionDir(dataDir: string): string {
  return join(dataDir, "manifest", "definitions");
}

function definitionCachePath(
  dataDir: string,
  component: DefinitionComponentName
): string {
  return definitionCachePathForLanguage(dataDir, component, "");
}

function definitionCachePathForLanguage(
  dataDir: string,
  component: DefinitionComponentName,
  language: string
): string {
  const dir = language ? join(definitionDir(dataDir), language) : definitionDir(dataDir);
  return join(dir, `${component}.json`);
}

function normalizeDefinitionLanguage(language: string): string {
  return language.trim().toLowerCase();
}

function writeDefinitionCache(path: string, cache: DefinitionComponentCache): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify(cache)}\n`,
    "utf8"
  );
  definitionMemoryCache.set(path, cache);
}

function staticContentUrl(path: string): string {
  return new URL(path, bungieStaticBaseUrl).toString();
}

async function fetchDefinitionJson(url: string): Promise<DefinitionComponentData> {
  const response = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!response.ok) {
    throw new Error(`Definition download failed: HTTP ${response.status}`);
  }

  return response.json() as Promise<DefinitionComponentData>;
}

function statusFromCache(cache: DefinitionComponentCache): DefinitionComponentStatus {
  return {
    initialized: true,
    component: cache.component,
    language: cache.language,
    cached_at: cache.cached_at,
    count: cache.count
  };
}
