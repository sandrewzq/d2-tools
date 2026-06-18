import type { D2Config } from "../config/schema.js";

export type StartupStep = "bungie-config" | "login" | "home";
export type StatusValue = "ready" | "missing" | "skipped";

export type StartupState = {
  nextStep: StartupStep;
  cards: {
    bungieConfig: { status: StatusValue; label: string };
    account: { status: StatusValue; label: string };
    manifest: { status: StatusValue; label: string };
    ai: { status: StatusValue; label: string };
  };
};

export function hasRequiredBungieConfig(config: D2Config): boolean {
  return Boolean(
    config.bungie.api_key.trim()
      && config.bungie.client_id.trim()
      && config.bungie.client_secret.trim()
      && config.bungie.redirect_uri.trim()
  );
}

export function computeStartupState(input: {
  config: D2Config;
  hasToken: boolean;
  hasManifest: boolean;
}): StartupState {
  const bungieReady = hasRequiredBungieConfig(input.config);

  return {
    nextStep: !bungieReady ? "bungie-config" : !input.hasToken ? "login" : "home",
    cards: {
      bungieConfig: {
        status: bungieReady ? "ready" : "missing",
        label: bungieReady ? "Bungie 配置已完成" : "需要填写 Bungie 配置"
      },
      account: {
        status: input.hasToken ? "ready" : "missing",
        label: input.hasToken ? "Bungie 账号已登录" : "需要登录 Bungie"
      },
      manifest: {
        status: input.hasManifest ? "ready" : "missing",
        label: input.hasManifest ? "资料库已初始化" : "资料库未初始化"
      },
      ai: {
        status: input.config.ai.provider.trim() ? "ready" : "skipped",
        label: input.config.ai.provider.trim() ? "AI 已配置" : "AI 未配置"
      }
    }
  };
}
