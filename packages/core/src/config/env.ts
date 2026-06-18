import type { ConfigEnv, D2Config } from "./schema.js";

export function applyEnvOverrides(config: D2Config, env: ConfigEnv): D2Config {
  return {
    bungie: {
      api_key: env.BUNGIE_API_KEY ?? config.bungie.api_key,
      client_id: env.BUNGIE_CLIENT_ID ?? config.bungie.client_id,
      client_secret: env.BUNGIE_CLIENT_SECRET ?? config.bungie.client_secret,
      redirect_uri: env.BUNGIE_REDIRECT_URI ?? config.bungie.redirect_uri
    },
    data: {
      data_dir: env.D2_DATA_DIR ?? config.data.data_dir,
      manifest_language: env.D2_MANIFEST_LANGUAGE ?? config.data.manifest_language
    },
    ai: {
      provider: env.AI_PROVIDER ?? config.ai.provider,
      api_key: env.AI_API_KEY ?? config.ai.api_key,
      model: env.AI_MODEL ?? config.ai.model
    }
  };
}
