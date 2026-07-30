import type { D2Config } from "../config/schema.js";

export type AiProtocol = "openai_responses" | "openai_chat_completions" | "anthropic_messages";
export type AiSettings = D2Config["ai"];

export type NormalizedAiSettings = {
  protocol: "" | AiProtocol;
  api_key: string;
  model: string;
  base_url: string;
  enable_lightgg: boolean;
  force_lightgg: boolean;
};

export type AiLightggSupportSettings = {
  supported: boolean;
  canForce: boolean;
  reason: string;
};

export const aiProtocolBaseUrls: Record<AiProtocol, string> = {
  openai_responses: "https://api.openai.com/v1",
  openai_chat_completions: "https://api.openai.com/v1",
  anthropic_messages: "https://api.anthropic.com"
};

export function normalizeAiSettings(settings: AiSettings): NormalizedAiSettings {
  const protocol = normalizeAiProtocol(settings);
  if (!protocol) {
    return {
      protocol: "",
      api_key: "",
      model: "",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    };
  }

  return {
    protocol,
    api_key: settings.api_key.trim(),
    model: settings.model.trim(),
    base_url: normalizeBaseUrl(settings.base_url, protocol),
    enable_lightgg: settings.enable_lightgg,
    force_lightgg: settings.force_lightgg
  };
}

export function isAiSettingsConfigured(settings: AiSettings): boolean {
  const normalized = normalizeAiSettings(settings);
  return Boolean(normalized.protocol && normalized.api_key && normalized.model);
}

export function getAiLightggSupportSettings(settings: AiSettings): AiLightggSupportSettings {
  const normalized = normalizeAiSettings(settings);

  if (!normalized.protocol) {
    return {
      supported: false,
      canForce: false,
      reason: "请先选择 API 格式。"
    };
  }

  if (normalized.protocol === "openai_responses") {
    return {
      supported: true,
      canForce: false,
      reason: "当前 API 格式默认支持 light.gg 实时分析。"
    };
  }

  if (normalized.protocol === "openai_chat_completions") {
    return {
      supported: false,
      canForce: true,
      reason: "当前是 Chat Completions。只有在目标服务额外兼容 Responses 能力时，强制开启才可能成功。"
    };
  }

  return {
    supported: false,
    canForce: true,
    reason: "Anthropic Messages 没有内置 light.gg 实时分析链路；如你明确知道目标服务兼容 Responses，可强制开启后自行验证。"
  };
}

export function protocolLabel(protocol: string): string {
  if (protocol === "openai_chat_completions") return "OpenAI Chat Completions";
  if (protocol === "openai_responses") return "OpenAI Responses";
  if (protocol === "anthropic_messages") return "Anthropic Messages";
  return protocol;
}

function normalizeAiProtocol(settings: AiSettings): "" | AiProtocol {
  const protocol = settings.protocol.trim();
  if (isAiProtocol(protocol)) {
    return protocol;
  }
  return "";
}

function normalizeBaseUrl(baseUrl: string, protocol: AiProtocol): string {
  const trimmed = baseUrl.trim();
  if (trimmed) {
    return trimmed;
  }
  return aiProtocolBaseUrls[protocol];
}

function isAiProtocol(protocol: string): protocol is AiProtocol {
  return protocol === "openai_responses"
    || protocol === "openai_chat_completions"
    || protocol === "anthropic_messages";
}
