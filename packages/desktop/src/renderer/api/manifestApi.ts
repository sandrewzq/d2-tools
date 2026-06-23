export type ManifestApi = {
  getStartupState(): Promise<StartupState>;
  getManifestStatus(): Promise<ManifestStatus>;
  initializeManifest(): Promise<ManifestStatus>;
};

export type StartupState = {
  nextStep: "bungie-config" | "login" | "home";
  cards: {
    bungieConfig: StatusCardState;
    account: StatusCardState;
    manifest: StatusCardState;
    ai: StatusCardState;
  };
};

export type StatusCardState = {
  status: "ready" | "missing" | "skipped";
  label: string;
};

export type ManifestStatus = {
  initialized: boolean;
  version?: string;
  language?: string;
  sqlite_path?: string;
  cached_at?: string;
  definitions?: Array<{
    initialized: boolean;
    component?: string;
    language?: string;
    cached_at?: string;
    count?: number;
  }>;
  missing_required_components?: string[];
};
