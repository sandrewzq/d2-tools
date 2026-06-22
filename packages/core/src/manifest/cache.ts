import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fetchBungieJson } from "../bungie/client.js";
import type { D2Config } from "../config/schema.js";
import {
  getDefinitionStatus,
  requiredDefinitionComponents,
  type DefinitionComponentName,
  type DefinitionComponentStatus
} from "./definitions.js";
import {
  selectManifestLanguagePath,
  type DestinyManifestMetadata
} from "./metadata.js";

export type ManifestMetadataCache = {
  cached_at: string;
  language: string;
  sqlite_path: string;
  metadata: DestinyManifestMetadata;
};

export type ManifestStatus = {
  initialized: boolean;
  version?: string;
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

export function manifestDir(dataDir: string): string {
  return join(dataDir, "manifest");
}

export function manifestMetadataPath(dataDir: string): string {
  return join(manifestDir(dataDir), "metadata.json");
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

async function fetchManifestMetadata(apiKey: string): Promise<DestinyManifestMetadata> {
  return fetchBungieJson<DestinyManifestMetadata>("/Destiny2/Manifest/", { apiKey });
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
