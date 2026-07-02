export type ConfigApi = {
  getHealth(): Promise<{ ok: true; service: string; version: string; timestamp: string }>;
  getConfig(): Promise<D2Config>;
  saveConfig(config: D2Config): Promise<D2Config>;
  openDataDir(): Promise<void>;
  exportConfig(): Promise<ConfigBackupResult>;
  importConfig(): Promise<ConfigBackupResult>;
  clearCache(): Promise<ConfigBackupResult>;
  listAiModels(ai: AiSettings): Promise<AiModelListResult>;
  testAiConnection(): Promise<AiConnectionTestResult>;
};

export type ConfigBackupResult = {
  ok: true;
  message: string;
  path?: string;
};

export type D2Config = {
  bungie: {
    api_key: string;
    client_id: string;
    client_secret: string;
    redirect_uri: string;
  };
  data: {
    data_dir: string;
    manifest_language: string;
  };
  ai: {
    protocol?: string;
    provider?: string;
    api_key: string;
    model: string;
    base_url: string;
    enable_lightgg: boolean;
    force_lightgg?: boolean;
  };
  features: {
    write_actions_enabled: boolean;
    color_mode: "light" | "dark";
    interface_locale: "zh-CN" | "en-US";
    manifest_language_follows_interface: boolean;
  };
};

export type AiSettings = D2Config["ai"];

export type AiModelListResult = {
  protocol: string;
  models: string[];
  source: "remote" | "fallback";
  message: string;
};

export type AiConnectionTestResult = {
  ok: true;
  protocol: string;
  model: string;
  message: string;
};
