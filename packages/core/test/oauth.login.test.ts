import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildBungieAuthorizationUrl,
  hasOAuthToken,
  refreshBungieOAuthToken,
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
      redirectUri: "https://127.0.0.1:28780/oauth/callback",
      state: "state-123"
    }));

    expect(url.origin + url.pathname).toBe("https://www.bungie.net/en/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("53056");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("redirect_uri")).toBe("https://127.0.0.1:28780/oauth/callback");
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

  it("refreshes OAuth tokens with the stored refresh token", async () => {
    let request: Request | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      request = new Request(input, init);
      return new Response(JSON.stringify({
        access_token: "new-access",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "new-refresh",
        refresh_expires_in: 7776000,
        membership_id: "123"
      }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    };

    const token = await refreshBungieOAuthToken({
      clientId: "client",
      clientSecret: "secret",
      refreshToken: "old-refresh",
      fetchImpl
    });

    expect(token.access_token).toBe("new-access");
    expect(token.refresh_token).toBe("new-refresh");
    expect(token.created_at).toBeTruthy();
    expect(request?.method).toBe("POST");
    expect(request?.headers.get("authorization")).toBe(`Basic ${Buffer.from("client:secret").toString("base64")}`);
    expect(request?.headers.get("content-type")).toContain("application/x-www-form-urlencoded");
    const body = new URLSearchParams(await request?.text());
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("old-refresh");
  });
});
