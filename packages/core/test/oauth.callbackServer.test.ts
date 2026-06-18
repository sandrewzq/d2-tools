import { describe, expect, it } from "vitest";
import { startOAuthCallbackServer } from "../src/oauth/callbackServer";

describe("OAuth callback server", () => {
  it("accepts a callback code and closes cleanly", async () => {
    const server = await startOAuthCallbackServer({ host: "127.0.0.1", port: 0 });
    const url = `${server.origin}/oauth/callback?code=abc&state=xyz`;

    const response = await fetch(url);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("Bungie login received");
    expect(await server.waitForCallback()).toEqual({ code: "abc", state: "xyz" });

    await server.close();
  });

  it("returns a helpful page when code is missing", async () => {
    const server = await startOAuthCallbackServer({ host: "127.0.0.1", port: 0 });
    const response = await fetch(`${server.origin}/oauth/callback`);

    expect(response.status).toBe(400);
    expect(await response.text()).toContain("Missing OAuth code");

    await server.close();
  });
});
