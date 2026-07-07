import type { BungieOAuthToken } from "@d2-tools/core/oauth/login";

export type ExchangeBungieOAuthCodeOptions = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  fetchImpl?: typeof fetch;
};

export type RefreshBungieOAuthTokenOptions = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fetchImpl?: typeof fetch;
};

const tokenUrl = "https://www.bungie.net/platform/app/oauth/token/";

export async function exchangeBungieOAuthCode(
  options: ExchangeBungieOAuthCodeOptions
): Promise<BungieOAuthToken> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: options.code,
    redirect_uri: options.redirectUri
  });
  const credentials = Buffer.from(`${options.clientId}:${options.clientSecret}`).toString("base64");

  const response = await fetchImpl(tokenUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Bungie OAuth token request failed: HTTP ${response.status}`);
  }

  const token = await response.json() as BungieOAuthToken;
  if (!token.access_token) {
    throw new Error("Bungie OAuth token response did not include an access token");
  }

  return {
    ...token,
    created_at: new Date().toISOString()
  };
}

export async function refreshBungieOAuthToken(
  options: RefreshBungieOAuthTokenOptions
): Promise<BungieOAuthToken> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: options.refreshToken
  });
  const credentials = Buffer.from(`${options.clientId}:${options.clientSecret}`).toString("base64");

  const response = await fetchImpl(tokenUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Bungie OAuth refresh failed: HTTP ${response.status}`);
  }

  const token = await response.json() as BungieOAuthToken;
  if (!token.access_token) {
    throw new Error("Bungie OAuth refresh response did not include an access token");
  }

  return {
    ...token,
    created_at: new Date().toISOString()
  };
}
