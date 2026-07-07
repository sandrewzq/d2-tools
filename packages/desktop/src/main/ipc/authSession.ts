import type { D2Config } from "@d2-tools/core/config/schema";
import { refreshBungieOAuthToken } from "@d2-tools/services/oauth/client";
import {
  loadOAuthToken,
  saveOAuthToken
} from "@d2-tools/services/oauth/tokenStore";
import {
  hasRequiredBungieConfig,
  type StartupAuthStatus
} from "@d2-tools/core/startup/startupState";

export type FreshOAuthToken = NonNullable<ReturnType<typeof loadOAuthToken>>;

export async function loadFreshOAuthToken(config: D2Config): Promise<FreshOAuthToken> {
  const token = loadOAuthToken(config.data.data_dir);
  if (!token) {
    throw new Error("请先登录 Bungie");
  }
  if (!isOAuthAccessTokenExpired(token)) {
    return token;
  }
  if (!token.refresh_token) {
    throw new Error("Bungie 登录已过期，请重新登录");
  }

  try {
    const refreshed = await refreshBungieOAuthToken({
      clientId: config.bungie.client_id,
      clientSecret: config.bungie.client_secret,
      refreshToken: token.refresh_token
    });
    saveOAuthToken(config.data.data_dir, refreshed);
    return refreshed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bungie token 刷新失败";
    throw new Error(`${message}。请重新登录 Bungie。`);
  }
}

export async function getStartupAuthStatus(config: D2Config): Promise<StartupAuthStatus> {
  const token = loadOAuthToken(config.data.data_dir);
  if (!hasRequiredBungieConfig(config) || !token) {
    return { status: "missing" };
  }

  if (token.access_token && (!isOAuthAccessTokenExpired(token) || token.refresh_token)) {
    return { status: "valid" };
  }

  if (token.refresh_token) {
    return { status: "valid" };
  }

  if (isOAuthAccessTokenExpired(token)) {
    return {
      status: "invalid",
      message: "Bungie 登录已过期，请重新登录"
    };
  }

  return { status: "valid" };
}

function isOAuthAccessTokenExpired(token: FreshOAuthToken): boolean {
  if (!token.created_at) {
    return true;
  }

  const createdAt = Date.parse(token.created_at);
  if (!Number.isFinite(createdAt)) {
    return true;
  }

  const expiresInMs = Math.max(0, token.expires_in - 60) * 1000;
  return Date.now() >= createdAt + expiresInMs;
}
