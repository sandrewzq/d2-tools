import type { D2Config } from "../api/client";

export type AiSettings = D2Config["ai"];

export function normalizeAiSettings(settings: AiSettings): AiSettings {
  const provider = settings.provider.trim();
  if (!provider || provider === "none") {
    return {
      provider: "",
      api_key: "",
      model: "",
      base_url: ""
    };
  }

  return {
    provider,
    api_key: settings.api_key.trim(),
    model: settings.model.trim(),
    base_url: settings.base_url.trim()
  };
}
