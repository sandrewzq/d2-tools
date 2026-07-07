import { describe, expect, it } from "vitest";
import {
  buildBungieAuthorizationUrl
} from "../src/oauth/login.js";

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

});
