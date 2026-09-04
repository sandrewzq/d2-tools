import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { D2Config } from "@d2-tools/core/config/schema";
import {
  requiredDefinitionComponents,
  type DefinitionComponentName,
  type DefinitionComponentStatus
} from "@d2-tools/core/manifest/definitions";
import {
  selectManifestLanguagePath,
  type DestinyManifestMetadata
} from "@d2-tools/core/manifest/metadata";
import {
  clearDefinitionMemoryCache,
  getDefinitionStatus,
  getDefinitionStatusByLanguage
} from "./definitions.js";

export type ManifestMetadataCache = {
  cached_at: string;
  language: string;
  sqlite_path: string;
  metadata: DestinyManifestMetadata;
};

export type ManifestStatus = {
  initialized: boolean;
  runtime_state?:
    | "ready"
    | "update_available"
    | "supplement_required"
    | "repair_required"
    | "updating"
    | "updating_usable"
    | "activating"
    | "retrying"
    | "preparing_required"
    | "failed_but_usable";
  version?: string;
  latest_version?: string;
  needs_update?: boolean;
  checked_at?: string;
  language?: string;
  sqlite_path?: string;
  cached_at?: string;
  item_count?: number;
  perk_count?: number;
  relation_count?: number;
  definitions?: DefinitionComponentStatus[];
  missing_required_components?: DefinitionComponentName[];
  missing_optional_components?: DefinitionComponentName[];
};

export type ManifestVersionCheckCache = {
  checked_at: string;
  latest_version?: string;
  needs_update?: boolean;
};

export type InitializeManifestMetadataOptions = {
  config: D2Config;
  fetchMetadata?: (apiKey: string) => Promise<DestinyManifestMetadata>;
  now?: () => Date;
};

export type CheckManifestVersionOptions = InitializeManifestMetadataOptions;

type BungiePlatformResponse<T> = {
  ErrorCode?: number;
  Message?: string;
  Response?: T;
};

const bungiePlatformBaseUrl = "https://www.bungie.net/Platform";

export function manifestDir(dataDir: string): string {
  return join(dataDir, "manifest");
}

export function manifestMetadataPath(dataDir: string): string {
  return join(manifestDir(dataDir), "metadata.json");
}

export function manifestVersionCheckPath(dataDir: string): string {
  return join(manifestDir(dataDir), "version-check.json");
}

export function clearManifestCache(dataDir: string): void {
  clearDefinitionMemoryCache(dataDir);
  rmSync(manifestDir(dataDir), { recursive: true, force: true });
}

export function recoverManifestCacheDirectories(dataDir: string): void {
  mkdirSync(dataDir, { recursive: true });
  const targetDir = manifestDir(dataDir);
  const entries = readdirSync(dataDir, { withFileTypes: true });
  const backups = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("manifest-backup-"))
    .map((entry) => join(dataDir, entry.name))
    .sort((left, right) => right.localeCompare(left));
  let recoveryFailedPath: string | null = null;

  if (!existsSync(targetDir) && backups[0]) {
    const recoverySource = backups.shift()!;
    try {
      renameSync(recoverySource, targetDir);
    } catch {
      recoveryFailedPath = recoverySource;
    }
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("manifest-staging-")) {
      continue;
    }
    removeManifestWorkDirectory(dataDir, join(dataDir, entry.name));
  }
  for (const backup of backups) {
    if (backup === recoveryFailedPath) {
      continue;
    }
    removeManifestWorkDirectory(dataDir, backup);
  }
}

function removeManifestWorkDirectory(dataDir: string, path: string): void {
  const root = resolve(dataDir);
  const target = resolve(path);
  const relativePath = relative(root, target);
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    return;
  }
  try {
    rmSync(target, { recursive: true, force: true });
  } catch {
    // A locked stale directory can be retried during the next startup/update.
  }
}

export function loadManifestMetadataCache(dataDir: string): ManifestMetadataCache | null {
  const path = manifestMetadataPath(dataDir);
  if (!existsSync(path)) {
    return null;
  }

  try {
    const cache = JSON.parse(readFileSync(path, "utf8")) as ManifestMetadataCache;
    return cache?.metadata?.version && cache.language ? cache : null;
  } catch {
    return null;
  }
}

export function loadManifestVersionCheckCache(dataDir: string): ManifestVersionCheckCache | null {
  const path = manifestVersionCheckPath(dataDir);
  if (!existsSync(path)) {
    return null;
  }

  try {
    const cache = JSON.parse(readFileSync(path, "utf8")) as ManifestVersionCheckCache;
    return cache?.checked_at ? cache : null;
  } catch {
    return null;
  }
}

export function saveManifestVersionCheckCache(input: {
  dataDir: string;
  checkedAt: string;
  latestVersion?: string;
  needsUpdate?: boolean;
}): ManifestVersionCheckCache {
  const cache: ManifestVersionCheckCache = {
    checked_at: input.checkedAt,
    latest_version: input.latestVersion,
    needs_update: input.needsUpdate
  };

  mkdirSync(manifestDir(input.dataDir), { recursive: true });
  writeJsonCache(manifestVersionCheckPath(input.dataDir), cache);
  return cache;
}

export function saveManifestMetadataCache(input: {
  dataDir: string;
  language: string;
  metadata: DestinyManifestMetadata;
  cachedAt: string;
}): ManifestMetadataCache {
  const cache: ManifestMetadataCache = {
    cached_at: input.cachedAt,
    language: input.language,
    sqlite_path: selectManifestLanguagePath(input.metadata, input.language),
    metadata: input.metadata
  };

  mkdirSync(manifestDir(input.dataDir), { recursive: true });
  writeJsonCache(manifestMetadataPath(input.dataDir), cache);
  return cache;
}

function writeJsonCache(path: string, value: unknown): void {
  const temporaryPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    renameSync(temporaryPath, path);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
}

export function getManifestStatus(dataDir: string): ManifestStatus {
  const cache = loadManifestMetadataCache(dataDir);
  if (!cache) {
    return { initialized: false };
  }

  return {
    initialized: true,
    version: cache.metadata.version,
    language: cache.language,
    sqlite_path: cache.sqlite_path,
    cached_at: cache.cached_at,
    ...definitionStatusSummary(dataDir, cache)
  };
}

export async function initializeManifestMetadata(
  options: InitializeManifestMetadataOptions
): Promise<ManifestStatus> {
  const metadata = await (options.fetchMetadata ?? fetchManifestMetadata)(options.config.bungie.api_key);
  const cache = saveManifestMetadataCache({
    dataDir: options.config.data.data_dir,
    language: options.config.data.manifest_language,
    metadata,
    cachedAt: (options.now ?? (() => new Date()))().toISOString()
  });

  return {
    initialized: true,
    version: cache.metadata.version,
    language: cache.language,
    sqlite_path: cache.sqlite_path,
    cached_at: cache.cached_at,
    ...definitionStatusSummary(options.config.data.data_dir, cache)
  };
}

export async function checkManifestVersion(
  options: CheckManifestVersionOptions
): Promise<ManifestStatus> {
  const currentCache = loadManifestMetadataCache(options.config.data.data_dir);
  const current = getManifestStatus(options.config.data.data_dir);
  const latest = await (options.fetchMetadata ?? fetchManifestMetadata)(options.config.bungie.api_key);
  const checkedAt = (options.now ?? (() => new Date()))().toISOString();
  const configuredLanguage = options.config.data.manifest_language.trim().toLowerCase();
  const cachedLanguage = current.language?.trim().toLowerCase();

  return {
    ...current,
    latest_version: latest.version,
    needs_update: current.version !== latest.version
      || cachedLanguage !== configuredLanguage
      || manifestContentPathsChanged(currentCache?.metadata, latest, configuredLanguage),
    checked_at: checkedAt
  };
}

async function fetchManifestMetadata(apiKey: string): Promise<DestinyManifestMetadata> {
  const key = apiKey.trim();
  if (!key) {
    throw new Error("Bungie API key is required");
  }

  const response = await fetch(new URL("Destiny2/Manifest/", `${bungiePlatformBaseUrl}/`), {
    signal: AbortSignal.timeout(30_000),
    headers: {
      "X-API-Key": key,
      "Accept": "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Bungie request failed: HTTP ${response.status}`);
  }

  const body = await response.json() as BungiePlatformResponse<DestinyManifestMetadata>;
  if (body.ErrorCode !== undefined && body.ErrorCode !== 1) {
    throw new Error(`Bungie API error ${body.ErrorCode}: ${body.Message ?? "Unknown error"}`);
  }
  if (body.Response) {
    return validateManifestMetadata(body.Response);
  }
  return validateManifestMetadata(body as DestinyManifestMetadata);
}

function validateManifestMetadata(metadata: DestinyManifestMetadata): DestinyManifestMetadata {
  if (!metadata?.version || !metadata.jsonWorldComponentContentPaths) {
    throw new Error("Bungie Manifest metadata is incomplete");
  }
  return metadata;
}

function manifestContentPathsChanged(
  current: DestinyManifestMetadata | undefined,
  latest: DestinyManifestMetadata,
  language: string
): boolean {
  if (!current) {
    return true;
  }
  const currentSqlitePath = current.mobileWorldContentPaths?.[language]
    ?? current.mobileWorldContentPaths?.en;
  const latestSqlitePath = latest.mobileWorldContentPaths?.[language]
    ?? latest.mobileWorldContentPaths?.en;
  if (currentSqlitePath !== latestSqlitePath) {
    return true;
  }
  const currentPaths = current.jsonWorldComponentContentPaths?.[language]
    ?? current.jsonWorldComponentContentPaths?.en;
  const latestPaths = latest.jsonWorldComponentContentPaths?.[language]
    ?? latest.jsonWorldComponentContentPaths?.en;
  return JSON.stringify(currentPaths ?? null) !== JSON.stringify(latestPaths ?? null);
}

function definitionStatusSummary(
  dataDir: string,
  cache: ManifestMetadataCache
): Pick<ManifestStatus, "definitions" | "missing_required_components" | "missing_optional_components"> {
  const definitions = requiredDefinitionComponents.map((component) => {
    const status = getDefinitionStatus(dataDir, component, {
      language: cache.language,
      manifestVersion: cache.metadata.version
    });
    return status.initialized ? status : { ...status, component };
  });

  const optionalEnglishComponents: DefinitionComponentName[] = cache.language.toLowerCase() === "en"
    ? []
    : ["DestinyInventoryItemDefinition", "DestinyPlugSetDefinition"];
  const missingRequiredComponents = definitions
    .filter((status) => !status.initialized)
    .map((status) => status.component as DefinitionComponentName);
  return {
    definitions,
    missing_required_components: missingRequiredComponents,
    ...(missingRequiredComponents.length === 0
      ? {
          missing_optional_components: optionalEnglishComponents.filter((component) => (
            !getDefinitionStatusByLanguage(dataDir, component, "en", {
              manifestVersion: cache.metadata.version
            }).initialized
          ))
        }
      : {})
  };
}
