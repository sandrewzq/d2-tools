import type { StartupState } from "@d2-tools/core/startup/startupState";
import type { ManifestStatus } from "@d2-tools/services/manifest/cache";

export type ManifestApi = {
  getStartupState(): Promise<StartupState>;
  getManifestStatus(options?: ManifestStatusRequestOptions): Promise<ManifestStatus>;
  initializeManifest(): Promise<ManifestStatus>;
  repairManifest(): Promise<ManifestStatus>;
};

export type ManifestStatusRequestOptions = {
  forceCheck?: boolean;
};

export type StatusCardState = StartupState["cards"][keyof StartupState["cards"]];

export type { ManifestStatus, StartupState };
