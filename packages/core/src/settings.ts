export interface AppSettings {
  readonly dataDir: string;
  readonly bungie: {
    readonly apiKeyConfigured: boolean;
  };
  readonly ai: {
    readonly providerConfigured: boolean;
    readonly providerId: string | null;
    readonly model: string | null;
  };
}

export function createDefaultSettings(dataDir: string): AppSettings {
  return {
    dataDir,
    bungie: { apiKeyConfigured: false },
    ai: {
      providerConfigured: false,
      providerId: null,
      model: null
    }
  };
}
