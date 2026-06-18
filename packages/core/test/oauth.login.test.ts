import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildBungieAuthorizationUrl,
  hasOAuthToken,
  saveOAuthToken
} from "../src/oauth/login.js";

const tempDirs: string[] = [];

function tempDataDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "d2-oauth-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("Bungie OAuth login", () => {
  it("builds an authorization URL for the system browser", () => {
    const url = new URL(buildBungieAuthorizationUrl({
      clientId: "53056",
      redirectUri: "http://127.0.0.1:28780/oauth/callback",
      state: "state-123"
    }));

    expect(url.origin + url.pathname).toBe("https://www.bungie.net/en/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("53056");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:28780/oauth/callback");
    expect(url.searchParams.has("scope")).toBe(false);
  });

  it("stores OAuth tokens in the local data directory", () => {
    const dataDir = tempDataDir();

    expect(hasOAuthToken(dataDir)).toBe(false);
    saveOAuthToken(dataDir, {
      access_token: "access",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "refresh",
      refresh_expires_in: 7776000,
      membership_id: "123"
    });

    expect(hasOAuthToken(dataDir)).toBe(true);
  });
});
