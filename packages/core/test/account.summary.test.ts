import { describe, expect, it } from "vitest";
import { fetchAccountSummary } from "../src/account/summary.js";
import type { D2Config } from "../src/config/schema.js";
import type { DefinitionComponentData } from "../src/manifest/definitions.js";

function config(): D2Config {
  return {
    bungie: {
      api_key: "api",
      client_id: "client",
      client_secret: "secret",
      redirect_uri: "https://127.0.0.1:28780/oauth/callback"
    },
    data: {
      data_dir: "C:/Users/test/AppData/Roaming/d2-service",
      manifest_language: "zh-chs"
    },
    ai: {
      provider: "",
      api_key: "",
      model: ""
    }
  };
}

const itemDefinitions: DefinitionComponentData = {
  "1001": {
    hash: 1001,
    displayProperties: {
      name: "紫黄晶SP-11",
      icon: "/common/destiny2_content/icons/amethyst.png"
    },
    itemTypeDisplayName: "异域 / 载具",
    inventory: { tierTypeName: "异域" }
  },
  "2001": {
    hash: 2001,
    displayProperties: {
      name: "风险管理者",
      icon: "/common/destiny2_content/icons/riskrunner.png"
    },
    itemTypeDisplayName: "冲锋枪",
    inventory: { tierTypeName: "异域" }
  }
};

describe("account summary", () => {
  it("fetches memberships, characters, equipment, and vault items", async () => {
    const requested: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const request = new Request(input, init);
      requested.push(request.url);

      if (request.url.endsWith("/User/GetMembershipsForCurrentUser/")) {
        expect(request.headers.get("authorization")).toBe("Bearer access");
        return jsonResponse({
          ErrorCode: 1,
          Response: {
            bungieNetUser: { displayName: "Big Brother is watching" },
            primaryMembershipId: "destiny-1",
            destinyMemberships: [
              {
                membershipId: "destiny-1",
                membershipType: 3,
                displayName: "Guardian"
              }
            ]
          }
        });
      }

      return jsonResponse({
        ErrorCode: 1,
        Response: {
          characters: {
            data: {
              "char-1": {
                characterId: "char-1",
                classType: 1,
                light: 2010,
                emblemPath: "/img/theme/destiny/icons/icon.png"
              }
            }
          },
          characterEquipment: {
            data: {
              "char-1": {
                items: [{ itemHash: 2001, itemInstanceId: "instance-1" }]
              }
            }
          },
          profileInventory: {
            data: {
              items: [
                { itemHash: 1001, itemInstanceId: "vault-1" },
                { itemHash: 2001, itemInstanceId: "vault-2" }
              ]
            }
          }
        }
      });
    };

    const summary = await fetchAccountSummary({
      config: config(),
      token: { access_token: "access", token_type: "Bearer", expires_in: 3600 },
      itemDefinitions,
      fetchImpl,
      baseUrl: "https://example.test/Platform"
    });

    expect(requested[1]).toContain("/Destiny2/3/Profile/destiny-1/");
    expect(summary.account_name).toBe("Big Brother is watching");
    expect(summary.destiny_membership_id).toBe("destiny-1");
    expect(summary.characters).toEqual([
      {
        character_id: "char-1",
        class_name: "猎人",
        light: 2010,
        emblem_url: "https://www.bungie.net/img/theme/destiny/icons/icon.png",
        equipped_items: [
          {
            hash: 2001,
            instance_id: "instance-1",
            name: "风险管理者",
            icon: "https://www.bungie.net/common/destiny2_content/icons/riskrunner.png",
            item_type: "冲锋枪",
            tier: "异域"
          }
        ]
      }
    ]);
    expect(summary.vault.item_count).toBe(2);
    expect(summary.vault.sample_items.map((item) => item.name)).toEqual(["紫黄晶SP-11", "风险管理者"]);
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
