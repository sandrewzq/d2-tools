import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DestinyManifestMetadata } from "./metadata.js";

export type DefinitionComponentName =
  | "DestinyInventoryItemDefinition"
  | "DestinyPlugSetDefinition"
  | "DestinySandboxPerkDefinition";

export type DefinitionRecord = {
  hash?: number;
  displayProperties?: {
    name?: string;
    description?: string;
    icon?: string;
  };
  itemTypeDisplayName?: string;
  inventory?: {
    tierTypeName?: string;
  };
  reusablePlugItems?: Array<{
    plugItemHash?: number;
  }>;
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
  const sourcePath = selectDefinitionComponentPath(
    options.metadata,
    options.language,
    options.component
  );
  const data = await (options.fetchJson ?? fetchDefinitionJson)(staticContentUrl(sourcePath));
  const cache: DefinitionComponentCache = {
    cached_at: (options.now ?? (() => new Date()))().toISOString(),
    component: options.component,
    language: options.language,
    source_path: sourcePath,
    count: Object.keys(data).length,
    data
  };

  mkdirSync(definitionDir(options.dataDir), { recursive: true });
  writeFileSync(
    definitionCachePath(options.dataDir, options.component),
    `${JSON.stringify(cache, null, 2)}\n`,
    "utf8"
  );

  return statusFromCache(cache);
}

export function loadDefinitionComponent(
  dataDir: string,
  component: DefinitionComponentName
): DefinitionComponentData | null {
  return loadDefinitionComponentCache(dataDir, component)?.data ?? null;
}

export function getDefinitionStatus(
  dataDir: string,
  component: DefinitionComponentName
): DefinitionComponentStatus {
  const cache = loadDefinitionComponentCache(dataDir, component);
  return cache ? statusFromCache(cache) : { initialized: false };
}

function loadDefinitionComponentCache(
  dataDir: string,
  component: DefinitionComponentName
): DefinitionComponentCache | null {
  const path = definitionCachePath(dataDir, component);
  if (!existsSync(path)) {
    return null;
  }

  return JSON.parse(readFileSync(path, "utf8")) as DefinitionComponentCache;
}

function definitionDir(dataDir: string): string {
  return join(dataDir, "manifest", "definitions");
}

function definitionCachePath(dataDir: string, component: DefinitionComponentName): string {
  return join(definitionDir(dataDir), `${component}.json`);
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
