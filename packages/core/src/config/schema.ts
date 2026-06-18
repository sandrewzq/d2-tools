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

export type ConfigEnv = Partial<Record<
  | "BUNGIE_API_KEY"
  | "BUNGIE_CLIENT_ID"
  | "BUNGIE_CLIENT_SECRET"
  | "BUNGIE_REDIRECT_URI"
  | "D2_DATA_DIR"
  | "D2_MANIFEST_LANGUAGE"
  | "AI_PROVIDER"
  | "AI_API_KEY"
  | "AI_MODEL",
  string
>>;
