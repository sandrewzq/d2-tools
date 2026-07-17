export type ManifestApi = {
  getStartupState(): Promise<StartupState>;
  getManifestStatus(options?: ManifestStatusRequestOptions): Promise<ManifestStatus>;
  initializeManifest(): Promise<ManifestStatus>;
  repairManifest(): Promise<ManifestStatus>;
};

export type ManifestStatusRequestOptions = {
  forceCheck?: boolean;
};

export type StartupState = {
  nextStep: "bungie-config" | "login" | "home";
  colorMode: "light" | "dark";
  languagePreferences: {
    interfaceLocale: "zh-CN" | "en-US";
    bungieLocale: string;
    followInterfaceLocaleForBungie: boolean;
  };
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
  needsUpdate?: boolean;
  lastUpdated?: string;
};

export type ManifestStatus = {
  initialized: boolean;
  runtime_state?:
    | "ready"
    | "update_available"
    | "supplement_required"
    | "repair_required"
    | "updating"
    | "failed_but_usable";
  version?: string;
  latest_version?: string;
  needs_update?: boolean;
  checked_at?: string;
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
  missing_optional_components?: string[];
};
