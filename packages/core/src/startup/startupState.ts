import type { D2Config } from "../config/schema.js";

export type StartupStep = "bungie-config" | "login" | "home";
export type StatusValue = "ready" | "missing" | "skipped";
export type StartupAuthStatus = {
  status: "missing" | "valid" | "invalid";
  message?: string;
};

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
  auth?: StartupAuthStatus;
}): StartupState {
  const bungieReady = hasRequiredBungieConfig(input.config);
  const auth = input.auth ?? { status: input.hasToken ? "valid" : "missing" };
  const accountReady = auth.status === "valid";
  const accountLabel = getAccountLabel(auth);

  return {
    nextStep: !bungieReady ? "bungie-config" : !accountReady ? "login" : "home",
    cards: {
      bungieConfig: {
        status: bungieReady ? "ready" : "missing",
        label: bungieReady ? "Bungie 配置已完成" : "需要填写 Bungie 配置"
      },
      account: {
        status: accountReady ? "ready" : "missing",
        label: accountLabel
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

function getAccountLabel(auth: StartupAuthStatus): string {
  if (auth.status === "valid") {
    return "Bungie 账号已登录";
  }

  if (auth.status === "invalid") {
    return auth.message?.trim() || "Bungie 登录已失效，请重新登录";
  }

  return "需要登录 Bungie";
}
