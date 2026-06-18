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
      model: "",
      base_url: ""
    }
  };
}

const itemDefinitions: DefinitionComponentData = {
  "1001": {
    hash: 1001,
    displayProperties: {
      name: "Vehicle A",
      icon: "/common/destiny2_content/icons/amethyst.png"
    },
    itemTypeDisplayName: "Vehicle",
    inventory: { tierTypeName: "Exotic", bucketTypeHash: 2025709351 }
  },
  "2001": {
    hash: 2001,
    displayProperties: {
      name: "Riskrunner",
      icon: "/common/destiny2_content/icons/riskrunner.png"
    },
    itemTypeDisplayName: "Submachine Gun",
    inventory: { tierTypeName: "Exotic", bucketTypeHash: 2465295065 }
  },
  "3001": {
    hash: 3001,
    displayProperties: {
      name: "Helmet A",
      icon: "/common/destiny2_content/icons/helmet.png"
    },
    itemTypeDisplayName: "Helmet",
    inventory: { tierTypeName: "Legendary", bucketTypeHash: 3448274439 }
  },
  "4001": {
    hash: 4001,
    displayProperties: {
      name: "Arrowhead Brake",
      icon: "/common/destiny2_content/icons/arrowhead.png",
      description: "Greatly controls recoil."
    },
    itemTypeDisplayName: "Barrel",
    inventory: { tierTypeName: "Legendary" }
  },
  "4002": {
    hash: 4002,
    displayProperties: {
      name: "Voltshot",
      icon: "/common/destiny2_content/icons/voltshot.png",
      description: "Reloading after defeating a target overcharges this weapon."
    },
    itemTypeDisplayName: "Trait",
    inventory: { tierTypeName: "Legendary" }
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
                items: [
                  { itemHash: 2001, itemInstanceId: "instance-1", state: 1 },
                  { itemHash: 3001, itemInstanceId: "instance-2" }
                ]
              }
            }
          },
          profileInventory: {
            data: {
              items: Array.from({ length: 35 }, (_, index) => ({
                itemHash: index % 2 === 0 ? 1001 : 2001,
                itemInstanceId: `vault-${index + 1}`,
                state: index === 1 ? 1 : 0
              }))
            }
          },
          itemComponents: {
            instances: {
              data: {
                "instance-1": { primaryStat: { value: 1810 } },
                "vault-2": { primaryStat: { value: 1805 } }
              }
            },
            sockets: {
              data: {
                "instance-1": {
                  sockets: [
                    { plugHash: 4001, isVisible: true },
                    { plugHash: 4002, isVisible: true }
                  ]
                },
                "vault-2": {
                  sockets: [
                    { plugHash: 4002, isVisible: true },
                    { plugHash: 9999, isVisible: false }
                  ]
                }
              }
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
    expect(summary.characters).toHaveLength(1);
    expect(summary.characters[0]).toMatchObject({
      character_id: "char-1",
      class_name: "猎人",
      light: 2010,
      emblem_url: "https://www.bungie.net/img/theme/destiny/icons/icon.png"
    });
    expect(summary.characters[0]?.equipment_groups.map((group) => group.key)).toEqual(["weapons", "armor"]);
    expect(summary.characters[0]?.equipped_items[0]).toMatchObject({
      hash: 2001,
      instance_id: "instance-1",
      name: "Riskrunner",
      icon: "https://www.bungie.net/common/destiny2_content/icons/riskrunner.png",
      item_type: "Submachine Gun",
      tier: "Exotic",
      bucket_hash: 2465295065,
      bucket_name: "能量武器",
      group_key: "weapons",
      power: 1810,
      locked: true
    });
    expect(summary.characters[0]?.equipped_items[0]?.socket_plugs).toEqual([
      {
        hash: 4001,
        name: "Arrowhead Brake",
        icon: "https://www.bungie.net/common/destiny2_content/icons/arrowhead.png",
        description: "Greatly controls recoil."
      },
      {
        hash: 4002,
        name: "Voltshot",
        icon: "https://www.bungie.net/common/destiny2_content/icons/voltshot.png",
        description: "Reloading after defeating a target overcharges this weapon."
      }
    ]);
    expect(summary.vault.item_count).toBe(35);
    expect(summary.vault.items).toHaveLength(35);
    expect(summary.vault.items[0]?.instance_id).toBe("vault-1");
    expect(summary.vault.items[34]?.instance_id).toBe("vault-35");
    expect(summary.vault.items[1]?.power).toBe(1805);
    expect(summary.vault.items[1]?.locked).toBe(true);
    expect(summary.vault.items[1]?.socket_plugs.map((plug) => plug.name)).toEqual(["Voltshot"]);
    expect(summary.vault.sample_items).toHaveLength(30);
    expect(summary.vault.sample_items.slice(0, 2).map((item) => item.name)).toEqual(["Vehicle A", "Riskrunner"]);
    expect(summary.vault.sample_items.slice(0, 2).map((item) => item.group_key)).toEqual(["equipment", "weapons"]);
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
