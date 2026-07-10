import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
import { clearDefinitionMemoryCache, getDefinitionStatus } from "./definitions.js";

export type ManifestMetadataCache = {
  cached_at: string;
  language: string;
  sqlite_path: string;
  metadata: DestinyManifestMetadata;
};

export type ManifestStatus = {
  initialized: boolean;
  version?: string;
  latest_version?: string;
  needs_update?: boolean;
  checked_at?: string;
  language?: string;
  sqlite_path?: string;
  cached_at?: string;
  definitions?: DefinitionComponentStatus[];
  missing_required_components?: DefinitionComponentName[];
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

export function clearManifestCache(dataDir: string): void {
  clearDefinitionMemoryCache(dataDir);
  rmSync(manifestDir(dataDir), { recursive: true, force: true });
}

export function loadManifestMetadataCache(dataDir: string): ManifestMetadataCache | null {
  const path = manifestMetadataPath(dataDir);
  if (!existsSync(path)) {
    return null;
  }

  return JSON.parse(readFileSync(path, "utf8")) as ManifestMetadataCache;
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
  writeFileSync(manifestMetadataPath(input.dataDir), `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  return cache;
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
    ...definitionStatusSummary(dataDir)
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
    ...definitionStatusSummary(options.config.data.data_dir)
  };
}

export async function checkManifestVersion(
  options: CheckManifestVersionOptions
): Promise<ManifestStatus> {
  const current = getManifestStatus(options.config.data.data_dir);
  const latest = await (options.fetchMetadata ?? fetchManifestMetadata)(options.config.bungie.api_key);
  const checkedAt = (options.now ?? (() => new Date()))().toISOString();

  return {
    ...current,
    latest_version: latest.version,
    needs_update: current.version !== latest.version,
    checked_at: checkedAt
  };
}

async function fetchManifestMetadata(apiKey: string): Promise<DestinyManifestMetadata> {
  const key = apiKey.trim();
  if (!key) {
    throw new Error("Bungie API key is required");
  }

  const response = await fetch(new URL("Destiny2/Manifest/", `${bungiePlatformBaseUrl}/`), {
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
    return body.Response;
  }
  return body as DestinyManifestMetadata;
}

function definitionStatusSummary(dataDir: string): Pick<ManifestStatus, "definitions" | "missing_required_components"> {
  const definitions = requiredDefinitionComponents.map((component) => {
    const status = getDefinitionStatus(dataDir, component);
    return status.initialized ? status : { ...status, component };
  });

  return {
    definitions,
    missing_required_components: definitions
      .filter((status) => !status.initialized)
      .map((status) => status.component as DefinitionComponentName)
  };
}
