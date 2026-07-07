import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BungieOAuthToken } from "@d2-tools/core/oauth/login";

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
