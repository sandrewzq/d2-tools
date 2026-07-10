import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { DestinyManifestMetadata } from "@d2-tools/core/manifest/metadata";
import {
  requiredDefinitionComponents,
  selectDefinitionComponentPath,
  type DefinitionComponentData,
  type DefinitionComponentName,
  type DefinitionComponentStatus
} from "@d2-tools/core/manifest/definitions";

export {
  requiredDefinitionComponents,
  selectDefinitionComponentPath
} from "@d2-tools/core/manifest/definitions";
export type {
  DefinitionComponentData,
  DefinitionComponentName,
  DefinitionComponentStatus,
  DefinitionRecord
} from "@d2-tools/core/manifest/definitions";

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

export function hasRequiredDefinitionCacheFiles(dataDir: string): boolean {
  return requiredDefinitionComponents.every((component) =>
    existsSync(definitionCachePath(dataDir, component))
  );
}

export function hasRequiredDefinitionComponents(dataDir: string): boolean {
  return requiredDefinitionComponents.every((component) =>
    getDefinitionStatus(dataDir, component).initialized
  );
}

export function clearDefinitionMemoryCache(dataDir: string): void {
  const cacheDirectory = definitionDir(dataDir);
  for (const path of definitionMemoryCache.keys()) {
    if (path === cacheDirectory || path.startsWith(`${cacheDirectory}/`) || path.startsWith(`${cacheDirectory}\\`)) {
      definitionMemoryCache.delete(path);
    }
  }
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
