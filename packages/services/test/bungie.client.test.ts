import { describe, expect, it } from "vitest";
import { fetchBungieJson, postBungieJson } from "../src/bungie/client.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("Bungie API client", () => {
  it("sends the API key header and unwraps successful responses", async () => {
    let request: Request | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ ErrorCode: 1, Response: { version: "123" } });
    };

    await expect(fetchBungieJson<{ version: string }>("/Destiny2/Manifest/", {
      apiKey: "api-key", baseUrl: "https://example.test/Platform", fetchImpl
    })).resolves.toEqual({ version: "123" });
    expect(request?.url).toBe("https://example.test/Platform/Destiny2/Manifest/");
    expect(request?.headers.get("x-api-key")).toBe("api-key");
  });

  it("sends authenticated POST requests and reports Bungie failures", async () => {
    let request: Request | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ ErrorCode: 1, Response: { ok: true } });
    };

    await expect(postBungieJson("/Destiny2/Actions/Items/EquipItem/", { itemId: "item-1" }, {
      apiKey: "api-key", accessToken: "access-token", baseUrl: "https://example.test/Platform", fetchImpl
    })).resolves.toEqual({ ok: true });
    expect(request?.headers.get("authorization")).toBe("Bearer access-token");
    expect(await request?.json()).toEqual({ itemId: "item-1" });

    await expect(fetchBungieJson("/Destiny2/Manifest/", {
      apiKey: "api", fetchImpl: async () => jsonResponse({ ErrorCode: 5, Message: "System disabled" })
    })).rejects.toThrow("Bungie API error 5: System disabled");
  });
});
