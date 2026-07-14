import { copyFileSync, existsSync, linkSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
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
  manifest_version?: string;
  source_path: string;
  count: number;
  data: DefinitionComponentData;
};

type DefinitionComponentCacheStatus = Omit<DefinitionComponentCache, "data"> & {
  file_size?: number;
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
  if (!data || Array.isArray(data) || typeof data !== "object" || Object.keys(data).length === 0) {
    throw new Error(`Definition download returned no records: ${options.component}`);
  }
  const cache: DefinitionComponentCache = {
    cached_at: (options.now ?? (() => new Date()))().toISOString(),
    component: options.component,
    language,
    manifest_version: options.metadata.version,
    source_path: sourcePath,
    count: Object.keys(data).length,
    data
  };

  mkdirSync(definitionDir(options.dataDir), { recursive: true });
  const languagePath = definitionCachePathForLanguage(options.dataDir, options.component, language);
  writeDefinitionCache(languagePath, cache);
  if (options.writeDefaultCache !== false) {
    writeDefinitionCacheAlias(languagePath, definitionCachePath(options.dataDir, options.component), cache);
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
  component: DefinitionComponentName,
  expected?: { language?: string; manifestVersion?: string }
): DefinitionComponentStatus {
  const cache = loadDefinitionComponentStatus(dataDir, component, "")
    ?? loadDefinitionComponentCache(dataDir, component);
  if (!cache || !isCompatibleCache(cache, component, expected)) {
    return { initialized: false };
  }
  return statusFromCache(cache);
}

export function getDefinitionStatusByLanguage(
  dataDir: string,
  component: DefinitionComponentName,
  language: string,
  expected?: { manifestVersion?: string }
): DefinitionComponentStatus {
  const normalizedLanguage = normalizeDefinitionLanguage(language);
  const cache = loadDefinitionComponentStatus(dataDir, component, normalizedLanguage)
    ?? loadDefinitionComponentCacheByLanguage(dataDir, component, normalizedLanguage);
  if (!cache || !isCompatibleCache(cache, component, {
    language: normalizedLanguage,
    manifestVersion: expected?.manifestVersion
  })) {
    return { initialized: false, component, language: normalizedLanguage };
  }
  return statusFromCache(cache);
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

  try {
    const loaded = JSON.parse(readFileSync(path, "utf8")) as DefinitionComponentCache;
    if (!isDefinitionComponentCache(loaded)) {
      return null;
    }
    definitionMemoryCache.set(path, loaded);
    return loaded;
  } catch {
    return null;
  }
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
  const { data: _data, ...cacheStatus } = cache;
  const status: DefinitionComponentCacheStatus = {
    ...cacheStatus,
    file_size: statSync(path).size
  };
  writeFileSync(
    definitionStatusPath(path),
    `${JSON.stringify(status)}\n`,
    "utf8"
  );
  definitionMemoryCache.set(path, cache);
}

function writeDefinitionCacheAlias(
  sourcePath: string,
  targetPath: string,
  cache: DefinitionComponentCache
): void {
  mkdirSync(dirname(targetPath), { recursive: true });
  rmSync(targetPath, { force: true });
  rmSync(definitionStatusPath(targetPath), { force: true });
  try {
    linkSync(sourcePath, targetPath);
    linkSync(definitionStatusPath(sourcePath), definitionStatusPath(targetPath));
  } catch {
    rmSync(targetPath, { force: true });
    rmSync(definitionStatusPath(targetPath), { force: true });
    copyFileSync(sourcePath, targetPath);
    copyFileSync(definitionStatusPath(sourcePath), definitionStatusPath(targetPath));
  }
  definitionMemoryCache.set(targetPath, cache);
}

function loadDefinitionComponentStatus(
  dataDir: string,
  component: DefinitionComponentName,
  language: string
): DefinitionComponentCacheStatus | null {
  const cachePath = definitionCachePathForLanguage(dataDir, component, language);
  const path = definitionStatusPath(cachePath);
  if (!existsSync(cachePath) || !existsSync(path)) {
    return null;
  }
  try {
    const status = JSON.parse(readFileSync(path, "utf8")) as DefinitionComponentCacheStatus;
    if (!isDefinitionComponentStatus(status)) {
      return null;
    }
    if (status.file_size !== undefined && statSync(cachePath).size !== status.file_size) {
      return null;
    }
    return status;
  } catch {
    return null;
  }
}

function definitionStatusPath(cachePath: string): string {
  return `${cachePath}.status.json`;
}

function staticContentUrl(path: string): string {
  return new URL(path, bungieStaticBaseUrl).toString();
}

async function fetchDefinitionJson(url: string): Promise<DefinitionComponentData> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(120_000),
    headers: { "Accept": "application/json" }
  });
  if (!response.ok) {
    throw new Error(`Definition download failed: HTTP ${response.status}`);
  }

  return response.json() as Promise<DefinitionComponentData>;
}

function statusFromCache(cache: DefinitionComponentCacheStatus): DefinitionComponentStatus {
  return {
    initialized: true,
    component: cache.component,
    language: cache.language,
    cached_at: cache.cached_at,
    count: cache.count
  };
}

function isDefinitionComponentStatus(
  cache: DefinitionComponentCacheStatus | DefinitionComponentCache | null | undefined
): cache is DefinitionComponentCacheStatus {
  return Boolean(
    cache
    && cache.component
    && cache.language
    && Number.isFinite(cache.count)
    && cache.count > 0
  );
}

function isDefinitionComponentCache(cache: DefinitionComponentCache | null | undefined): cache is DefinitionComponentCache {
  return Boolean(
    isDefinitionComponentStatus(cache)
    && cache.data
    && !Array.isArray(cache.data)
    && typeof cache.data === "object"
  );
}

function isCompatibleCache(
  cache: DefinitionComponentCacheStatus,
  component: DefinitionComponentName,
  expected?: { language?: string; manifestVersion?: string }
): boolean {
  if (cache.component !== component) {
    return false;
  }
  if (expected?.language && cache.language !== normalizeDefinitionLanguage(expected.language)) {
    return false;
  }
  if (expected?.manifestVersion && cache.manifest_version !== expected.manifestVersion) {
    return false;
  }
  return true;
}
