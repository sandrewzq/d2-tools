import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type BungieOAuthToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  membership_id?: string;
  created_at?: string;
};

export type AuthLoginResult = {
  ok: true;
  message: string;
};

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

const authorizeUrl = "https://www.bungie.net/en/oauth/authorize";
const tokenUrl = "https://www.bungie.net/platform/app/oauth/token/";

export function buildBungieAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(authorizeUrl);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", input.state);
  url.searchParams.set("redirect_uri", input.redirectUri);
  return url.toString();
}

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

export function oauthTokenPath(dataDir: string): string {
  return join(dataDir, "oauth-token.json");
}

export function saveOAuthToken(dataDir: string, token: BungieOAuthToken): void {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(oauthTokenPath(dataDir), `${JSON.stringify({
    ...token,
    created_at: token.created_at ?? new Date().toISOString()
  }, null, 2)}\n`, "utf8");
}

export function loadOAuthToken(dataDir: string): BungieOAuthToken | null {
  const path = oauthTokenPath(dataDir);
  if (!existsSync(path)) {
    return null;
  }

  return JSON.parse(readFileSync(path, "utf8")) as BungieOAuthToken;
}

export function hasOAuthToken(dataDir: string): boolean {
  const token = loadOAuthToken(dataDir);
  return Boolean(token?.access_token || token?.refresh_token);
}
