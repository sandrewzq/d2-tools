import type {
  DefinitionComponentName,
  DefinitionComponentStatus
} from "./definitions.js";
import type { DestinyManifestMetadata } from "./metadata.js";

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
