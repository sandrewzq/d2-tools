import { describe, expect, it } from "vitest";
import type { D2Config } from "../src/config/schema.js";
import {
  buildLiveItemAvailabilityFromBungie,
  fetchLiveItemAvailability
} from "../src/items/liveAvailability.js";

describe("item live availability", () => {
  it("marks items sold by public and character vendors with current Bungie data", () => {
    const result = buildLiveItemAvailabilityFromBungie({
      itemHashes: [101, 202, 303, 404],
      publicVendors: {
        vendors: { data: { "10": { vendorHash: 10 } } },
        sales: { data: { "10": { saleItems: { "1": { itemHash: 101 } } } } }
      },
      characterVendors: [
        {
          characterId: "char-1",
          vendors: { data: { "20": { vendorHash: 20 } } },
          sales: { data: { "20": { saleItems: { "2": { itemHash: 202 } } } } }
        }
      ],
      milestones: {
        "30": {
          displayProperties: { name: "Nightfall" },
          activities: [{ activityHash: 40 }],
          rewards: [{ rewardItems: [{ itemHash: 303 }] }]
        }
      },
      definitions: {
        vendors: {
          "10": { displayProperties: { name: "Banshee-44" } },
          "20": { displayProperties: { name: "Saint-14" } }
        },
        activities: {
          "40": { displayProperties: { name: "The Glassway" } }
        }
      },
      now: () => new Date("2026-06-28T13:00:00.000Z")
    });

    expect(result.checked_at).toBe("2026-06-28T13:00:00.000Z");
    expect(result.account_scope).toBe("character");
    expect(result.items["101"]).toMatchObject({
      status: "public_vendor",
      label: "当前公开商人售卖",
      sources: [{ kind: "public_vendor", label: "Banshee-44" }]
    });
    expect(result.items["202"]).toMatchObject({
      status: "character_vendor",
      label: "当前角色商人售卖",
      sources: [{ kind: "character_vendor", label: "Saint-14", character_id: "char-1" }]
    });
    expect(result.items["303"]).toMatchObject({
      status: "public_activity",
      label: "当前公共活动线索"
    });
    expect(result.items["404"]).toMatchObject({
      status: "manifest_only",
      label: "当前实时数据未命中"
    });
    expect(result.milestone_clues.map((clue) => clue.label)).toContain("Nightfall：The Glassway");
  });

  it("fetches public availability without a token and adds character vendors when logged in", async () => {
    const requested: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const request = new Request(input, init);
      requested.push(request.url);

      if (request.url.endsWith("/Destiny2/Milestones/")) {
        return jsonResponse({ Response: {} });
      }
      if (request.url.endsWith("/User/GetMembershipsForCurrentUser/")) {
        expect(request.headers.get("authorization")).toBe("Bearer access");
        return jsonResponse({
          Response: {
            primaryMembershipId: "membership-1",
            destinyMemberships: [{ membershipId: "membership-1", membershipType: 3 }]
          }
        });
      }
      if (request.url.endsWith("/Destiny2/Vendors/?components=400,402")) {
        return jsonResponse({
          Response: {
            vendors: { data: { "10": { vendorHash: 10 } } },
            sales: { data: { "10": { saleItems: { "1": { itemHash: 101 } } } } }
          }
        });
      }
      if (request.url.includes("/Character/char-1/Vendors/")) {
        return jsonResponse({
          Response: {
            vendors: { data: { "20": { vendorHash: 20 } } },
            sales: { data: { "20": { saleItems: { "2": { itemHash: 202 } } } } }
          }
        });
      }
      if (request.url.includes("/Destiny2/3/Profile/membership-1/")) {
        return jsonResponse({
          Response: {
            characters: { data: { "char-1": { characterId: "char-1" } } }
          }
        });
      }

      throw new Error(`Unexpected request ${request.url}`);
    };

    const result = await fetchLiveItemAvailability({
      config: config(),
      token: {
        access_token: "access",
        token_type: "Bearer",
        expires_in: 3600,
        membership_id: "membership-1"
      },
      itemHashes: [101, 202],
      fetchImpl
    });

    expect(result.items["101"].status).toBe("public_vendor");
    expect(result.items["202"].status).toBe("character_vendor");
    expect(requested.some((url) => url.includes("/User/GetMembershipsForCurrentUser/"))).toBe(true);
    expect(requested.some((url) => url.includes("/Character/char-1/Vendors/"))).toBe(true);
  });
});

function config(): D2Config {
  return {
    bungie: {
      api_key: "api-key",
      client_id: "client-id",
      client_secret: "client-secret",
      redirect_uri: "http://127.0.0.1:17777/callback"
    },
    ai: {
      provider: "openai-compatible",
      base_url: "",
      api_key: "",
      model: "",
      enable_lightgg: false
    },
    data: {
      data_dir: ".local-data/test",
      manifest_language: "zh-chs"
    },
    features: {
      write_actions_enabled: false
    }
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify({ ErrorCode: 1, ...body }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
