import { describe, expect, it } from "vitest";
import {
  getAiLightggSupportSettings,
  isAiSettingsConfigured,
  normalizeAiSettings
} from "../src/renderer/utils/aiSettings";

describe("AI settings panel helpers", () => {
  it("trims AI settings and keeps empty protocol as disabled", () => {
    expect(normalizeAiSettings({
      protocol: " openai_responses ",
      provider: "",
      api_key: " key ",
      model: " gpt-4.1 ",
      base_url: " https://api.example.com/v1 ",
      enable_lightgg: true,
      force_lightgg: false
    })).toEqual({
      protocol: "openai_responses",
      provider: "",
      api_key: "key",
      model: "gpt-4.1",
      base_url: "https://api.example.com/v1",
      enable_lightgg: true,
      force_lightgg: false
    });
    expect(normalizeAiSettings({
      protocol: " none ",
      provider: "",
      api_key: " key ",
      model: " model ",
      base_url: " url ",
      enable_lightgg: true,
      force_lightgg: true
    })).toEqual({ protocol: "", provider: "", api_key: "", model: "", base_url: "", enable_lightgg: false, force_lightgg: false });
  });

  it("normalizes legacy AI providers to the new protocol modes", () => {
    expect(normalizeAiSettings({
      protocol: "",
      provider: " openai ",
      api_key: " key ",
      model: " gpt-4.1 ",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    }).protocol).toBe("openai_chat_completions");

    expect(normalizeAiSettings({
      protocol: "",
      provider: " deepseek ",
      api_key: " key ",
      model: " deepseek-chat ",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    })).toEqual({
      protocol: "openai_chat_completions",
      provider: "",
      api_key: "key",
      model: "deepseek-chat",
      base_url: "https://api.deepseek.com",
      enable_lightgg: false,
      force_lightgg: false
    });

    expect(normalizeAiSettings({
      protocol: "",
      provider: " custom ",
      api_key: " key ",
      model: " model ",
      base_url: " https://example.test/v1 ",
      enable_lightgg: false,
      force_lightgg: false
    }).protocol).toBe("openai_chat_completions");
  });

  it("detects whether AI is actually configured for the assistant page", () => {
    expect(isAiSettingsConfigured({
      protocol: " none ",
      provider: "",
      api_key: " key ",
      model: " model ",
      base_url: " https://example.test/v1 ",
      enable_lightgg: false,
      force_lightgg: false
    })).toBe(false);

    expect(isAiSettingsConfigured({
      protocol: " openai_responses ",
      provider: "",
      api_key: " key ",
      model: " gpt-4.1-mini ",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    })).toBe(true);

    expect(isAiSettingsConfigured({
      protocol: " anthropic_messages ",
      provider: "",
      api_key: "",
      model: " claude-sonnet-4-5 ",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    })).toBe(false);
  });

  it("detects light.gg automatic support and force-enable eligibility by protocol", () => {
    expect(getAiLightggSupportSettings({
      protocol: "openai_responses",
      provider: "",
      api_key: "",
      model: "",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    })).toMatchObject({ supported: true, canForce: false });

    expect(getAiLightggSupportSettings({
      protocol: "openai_chat_completions",
      provider: "",
      api_key: "",
      model: "",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    })).toMatchObject({ supported: false, canForce: true });

    expect(getAiLightggSupportSettings({
      protocol: "anthropic_messages",
      provider: "",
      api_key: "",
      model: "",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    })).toMatchObject({ supported: false, canForce: true });
  });
});
