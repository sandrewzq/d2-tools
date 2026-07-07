import { describe, expect, it } from "vitest";
import {
  exchangeBungieOAuthCode,
  refreshBungieOAuthToken
} from "../src/oauth/client";

describe("Bungie OAuth client service adapter", () => {
  it("exchanges an authorization code for an OAuth token", async () => {
    let request: Request | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      request = new Request(input, init);
      return new Response(JSON.stringify({
        access_token: "access",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "refresh",
        refresh_expires_in: 7776000,
        membership_id: "123"
      }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    };

    const token = await exchangeBungieOAuthCode({
      clientId: "client",
      clientSecret: "secret",
      code: "auth-code",
      redirectUri: "https://127.0.0.1:28780/oauth/callback",
      fetchImpl
    });

    expect(token.access_token).toBe("access");
    expect(token.created_at).toBeTruthy();
    expect(request?.method).toBe("POST");
    expect(request?.headers.get("authorization")).toBe(`Basic ${Buffer.from("client:secret").toString("base64")}`);
    expect(request?.headers.get("content-type")).toContain("application/x-www-form-urlencoded");
    const body = new URLSearchParams(await request?.text());
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("auth-code");
    expect(body.get("redirect_uri")).toBe("https://127.0.0.1:28780/oauth/callback");
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
