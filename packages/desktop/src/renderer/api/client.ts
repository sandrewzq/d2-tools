declare global {
  interface Window {
    d2: {
      getHealth(): Promise<{ ok: true; service: string; version: string; timestamp: string }>;
      getConfig(): Promise<D2Config>;
      saveConfig(config: D2Config): Promise<D2Config>;
      getStartupState(): Promise<StartupState>;
    };
  }
}

export const api = window.d2;

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
    provider: string;
    api_key: string;
    model: string;
  };
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
