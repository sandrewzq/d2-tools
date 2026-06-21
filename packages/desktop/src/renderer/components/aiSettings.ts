import type { D2Config } from "../api/client";

export type AiSettings = D2Config["ai"];

export function normalizeAiSettings(settings: AiSettings): AiSettings {
  const provider = settings.provider.trim();
  if (!provider || provider === "none") {
    return {
      provider: "",
      api_key: "",
      model: "",
      base_url: "",
      enable_lightgg: false
    };
  }

  if (provider === "openai") {
    return {
      provider: "openai_chat",
      api_key: settings.api_key.trim(),
      model: settings.model.trim(),
      base_url: settings.base_url.trim(),
      enable_lightgg: false
    };
  }

  if (provider === "deepseek") {
    return {
      provider: "openai_compatible",
      api_key: settings.api_key.trim(),
      model: settings.model.trim(),
      base_url: settings.base_url.trim() || "https://api.deepseek.com",
      enable_lightgg: false
    };
  }

  if (provider === "custom") {
    return {
      provider: "openai_compatible",
      api_key: settings.api_key.trim(),
      model: settings.model.trim(),
      base_url: settings.base_url.trim(),
      enable_lightgg: false
    };
  }

  return {
    provider,
    api_key: settings.api_key.trim(),
    model: settings.model.trim(),
    base_url: settings.base_url.trim(),
    enable_lightgg: settings.enable_lightgg ?? false
  };
}

export function isAiSettingsConfigured(settings: AiSettings): boolean {
  const normalized = normalizeAiSettings(settings);
  return Boolean(normalized.provider && normalized.api_key && normalized.model);
}
