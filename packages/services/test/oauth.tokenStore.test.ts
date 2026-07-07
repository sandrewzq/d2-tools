import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { BungieOAuthToken } from "@d2-tools/core/oauth/login";
import {
  hasOAuthToken,
  loadOAuthToken,
  oauthTokenPath,
  saveOAuthToken
} from "../src/oauth/tokenStore";

const tempDirs: string[] = [];

function tempDataDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "d2-oauth-store-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("OAuth token store service adapter", () => {
  it("stores and loads OAuth tokens from the local data directory", () => {
    const dataDir = tempDataDir();
    const token: BungieOAuthToken = {
      access_token: "access",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "refresh",
      refresh_expires_in: 7776000,
      membership_id: "123"
    };

    expect(oauthTokenPath(dataDir)).toBe(join(dataDir, "oauth-token.json"));
    expect(loadOAuthToken(dataDir)).toBeNull();
    expect(hasOAuthToken(dataDir)).toBe(false);

    saveOAuthToken(dataDir, token);

    expect(hasOAuthToken(dataDir)).toBe(true);
    expect(loadOAuthToken(dataDir)).toMatchObject({
      access_token: "access",
      refresh_token: "refresh",
      membership_id: "123"
    });
    expect(loadOAuthToken(dataDir)?.created_at).toBeTruthy();
  });
});
