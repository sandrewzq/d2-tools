import { describe, expect, it } from "vitest";
import { fetchBungieJson, postBungieJson } from "../src/bungie/client.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("Bungie API client", () => {
  it("sends the API key header and unwraps successful Bungie responses", async () => {
    let request: Request | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({
        ErrorCode: 1,
        Message: "Ok",
        Response: { version: "123" }
      });
    };

    const result = await fetchBungieJson<{ version: string }>("/Destiny2/Manifest/", {
      apiKey: "api-key",
      baseUrl: "https://example.test/Platform",
      fetchImpl
    });

    expect(result).toEqual({ version: "123" });
    expect(request?.url).toBe("https://example.test/Platform/Destiny2/Manifest/");
    expect(request?.headers.get("x-api-key")).toBe("api-key");
  });

  it("sends bearer tokens for authenticated Bungie requests", async () => {
    let request: Request | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({
        ErrorCode: 1,
        Message: "Ok",
        Response: { ok: true }
      });
    };

    await fetchBungieJson<{ ok: boolean }>("/User/GetMembershipsForCurrentUser/", {
      apiKey: "api-key",
      accessToken: "access-token",
      baseUrl: "https://example.test/Platform",
      fetchImpl
    });

    expect(request?.headers.get("authorization")).toBe("Bearer access-token");
  });

  it("rejects missing API keys before making a request", async () => {
    let called = false;
    const fetchImpl: typeof fetch = async () => {
      called = true;
      return jsonResponse({});
    };

    await expect(fetchBungieJson("/Destiny2/Manifest/", { apiKey: "", fetchImpl }))
      .rejects.toThrow("Bungie API key is required");
    expect(called).toBe(false);
  });

  it("throws when Bungie returns a non-success error code", async () => {
    const fetchImpl: typeof fetch = async () => jsonResponse({
      ErrorCode: 5,
      Message: "System disabled",
      Response: null
    });

    await expect(fetchBungieJson("/Destiny2/Manifest/", { apiKey: "api", fetchImpl }))
      .rejects.toThrow("Bungie API error 5: System disabled");
  });

  it("throws when the HTTP request fails", async () => {
    const fetchImpl: typeof fetch = async () => jsonResponse({ error: "bad" }, 503);

    await expect(fetchBungieJson("/Destiny2/Manifest/", { apiKey: "api", fetchImpl }))
      .rejects.toThrow("Bungie request failed: HTTP 503");
  });

  it("posts JSON bodies with bearer tokens for authenticated write requests", async () => {
    let request: Request | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({
        ErrorCode: 1,
        Message: "Ok",
        Response: { ok: true }
      });
    };

    const result = await postBungieJson<{ ok: boolean }>(
      "/Destiny2/Actions/Items/EquipItem/",
      { itemId: "item-1", characterId: "character-1", membershipType: 3 },
      {
        apiKey: "api-key",
        accessToken: "access-token",
        baseUrl: "https://example.test/Platform",
        fetchImpl
      }
    );

    expect(result).toEqual({ ok: true });
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("https://example.test/Platform/Destiny2/Actions/Items/EquipItem/");
    expect(request?.headers.get("x-api-key")).toBe("api-key");
    expect(request?.headers.get("authorization")).toBe("Bearer access-token");
    expect(request?.headers.get("content-type")).toContain("application/json");
    expect(await request?.json()).toEqual({
      itemId: "item-1",
      characterId: "character-1",
      membershipType: 3
    });
  });
});
