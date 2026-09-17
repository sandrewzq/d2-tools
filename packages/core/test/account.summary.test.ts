import { describe, expect, it } from "vitest";
import { countAccountItemHashes, fetchAccountSummary } from "../src/account/summary.js";
import type { AccountCharacterSnapshot, AccountItemSnapshot, AccountSnapshot } from "../src/account/summary.js";
import type { DefinitionComponentData } from "../src/manifest/definitions.js";

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
    inventory: { tierTypeName: "Exotic", bucketTypeHash: 2465295065 },
    equippingBlock: { ammoType: 1 },
    sockets: {
      socketEntries: [{ singleInitialItemHash: 4003 }]
    }
  },
  "3001": {
    hash: 3001,
    displayProperties: {
      name: "Helmet A",
      icon: "/common/destiny2_content/icons/helmet.png"
    },
    itemTypeDisplayName: "Helmet",
    classType: 1,
    inventory: { tierTypeName: "Legendary", bucketTypeHash: 3448274439 }
  },
  "3002": {
    hash: 3002,
    displayProperties: {
      name: "Exotic Leg Armor",
      icon: "/common/destiny2_content/icons/exotic-legs.png"
    },
    itemTypeDisplayName: "Leg Armor",
    classType: 1,
    inventory: { tierTypeName: "Exotic", bucketTypeHash: 2422292810 },
    equippingBlock: { equipmentSlotTypeHash: 20886954 }
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
  },
  "4003": {
    hash: 4003,
    displayProperties: {
      name: "Lightweight Frame",
      icon: "/common/destiny2_content/icons/lightweight.png",
      description: "Move faster with this weapon equipped."
    },
    itemTypeDisplayName: "Intrinsic",
    inventory: { tierTypeName: "Legendary" }
  },
  "4004": {
    hash: 4004,
    displayProperties: {
      name: "生命值模组",
      icon: "/common/destiny2_content/icons/health-mod.png",
      description: "提高生命值。"
    },
    itemTypeDisplayName: "Armor Mod",
    inventory: { tierTypeName: "Legendary" },
    investmentStats: [
      { statTypeHash: 392767087, value: 10 }
    ]
  },
  "5001": {
    hash: 5001,
    displayProperties: {
      name: "Enhancement Core",
      icon: "/common/destiny2_content/icons/core.png"
    },
    itemTypeDisplayName: "Currency",
    inventory: { tierTypeName: "Legendary", bucketTypeHash: 1469714392 }
  }
};

const bucketDefinitions: DefinitionComponentData = {
  "999999999": {
    hash: 999999999,
    displayProperties: {
      name: "General"
    }
  },
  "215593132": {
    hash: 215593132,
    displayProperties: {
      name: "Postmaster"
    }
  }
};

const loadoutNameDefinitions: DefinitionComponentData = {
  "9001": {
    hash: 9001,
    name: "日落速刷"
  } as DefinitionComponentData[string]
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
          characterInventories: {
            data: {
              "char-1": {
                items: [
                  { itemHash: 2001, itemInstanceId: "backpack-1", state: 0 },
                  { itemHash: 3001, itemInstanceId: "backpack-2", state: 1 },
                  { itemHash: 3002, itemInstanceId: "backpack-exotic-legs", state: 0 },
                  { itemHash: 3001, itemInstanceId: "postmaster-1", bucketHash: 215593132 }
                ]
              }
            }
          },
          characterLoadouts: {
            data: {
              "char-1": {
                loadouts: [
                  {
                    nameHash: 9001,
                    iconHash: 777,
                    colorHash: 888,
                    items: [
                      { itemInstanceId: "0", plugItemHashes: [2166136261] },
                      { itemInstanceId: "instance-1", plugItemHashes: [4001, 2166136261] },
                      { itemInstanceId: "backpack-2" }
                    ]
                  },
                  {
                    items: []
                  }
                ]
              }
            }
          },
          profileInventory: {
            data: {
              items: [
                ...Array.from({ length: 35 }, (_, index) => ({
                  itemHash: index % 2 === 0 ? 1001 : 2001,
                  itemInstanceId: `vault-${index + 1}`,
                  bucketHash: index === 1 ? 999999999 : undefined,
                  state: index === 1 ? 1 : 0
                })),
                { itemHash: 5001, quantity: 42 },
                { itemHash: 1001, quantity: 3 }
              ]
            }
          },
          itemComponents: {
            instances: {
              data: {
                "instance-1": { primaryStat: { value: 1810 } },
                "backpack-1": { primaryStat: { value: 1809 } },
                "instance-2": {
                  primaryStat: { value: 1810 },
                  energy: {
                    energyTypeHash: 123,
                    energyType: 1,
                    energyCapacity: 10,
                    energyUsed: 6,
                    energyUnused: 4
                  }
                },
                "vault-2": { primaryStat: { value: 1805 } }
              }
            },
            stats: {
              data: {
                "instance-1": {
                  stats: {
                    "1240592695": { statHash: 1240592695, value: 54 },
                    "155624089": { statHash: 155624089, value: 42 },
                    "943549884": { statHash: 943549884, value: 61 },
                    "4188031367": { statHash: 4188031367, value: 38 },
                    "3871231066": { statHash: 3871231066, value: 33 },
                    "4284893193": { statHash: 4284893193, value: 900 }
                  }
                },
                "instance-2": {
                  stats: {
                    "2996146975": { statHash: 2996146975, value: 2 },
                    "392767087": { statHash: 392767087, value: 26 },
                    "1943323491": { statHash: 1943323491, value: 16 },
                    "1735777505": { statHash: 1735777505, value: 12 },
                    "144602215": { statHash: 144602215, value: 4 },
                    "4244567218": { statHash: 4244567218, value: 8 }
                  }
                }
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
                "backpack-1": {
                  sockets: [
                    { plugHash: 4002, isVisible: true }
                  ]
                },
                "vault-2": {
                  sockets: [
                    { plugHash: 4002, isVisible: true },
                    { plugHash: 9999, isVisible: false }
                  ]
                },
                "instance-2": {
                  sockets: [
                    { plugHash: 4004, isVisible: true }
                  ]
                }
              }
            }
          }
        }
      });
    };
    const fetchJson = async <T>(path: string, accessToken?: string): Promise<T> => {
      const response = await fetchImpl(new URL(path, "https://example.test/Platform/"), {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      });
      return (await response.json() as { Response: T }).Response;
    };

    const summary = await fetchAccountSummary({
      token: { access_token: "access", token_type: "Bearer", expires_in: 3600 },
      itemDefinitions,
      bucketDefinitions,
      loadoutNameDefinitions,
      fetchJson
    });

    expect(requested[1]).toContain("/Destiny2/3/Profile/destiny-1/");
    expect(requested[1]).toContain("components=100,102,200,201,205,206,300,304,305");
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
      locked: true,
      ammo_type: "primary"
    });
    expect(summary.characters[0]?.equipped_items[0]?.weapon_stats).toEqual({
      range: 54,
      stability: 42,
      handling: 61,
      reload_speed: 38,
      magazine: 33,
      rounds_per_minute: 900
    });
    expect(summary.characters[0]?.equipped_items[0]?.weapon_frame).toEqual({
      key: "lightweight-frame",
      name: "Lightweight Frame"
    });
    expect(summary.characters[0]?.equipped_items[0]?.socket_plugs).toEqual([
      {
        hash: 4001,
        name: "Arrowhead Brake",
        icon: "https://www.bungie.net/common/destiny2_content/icons/arrowhead.png",
        description: "Greatly controls recoil.",
        item_type: "Barrel"
      },
      {
        hash: 4002,
        name: "Voltshot",
        icon: "https://www.bungie.net/common/destiny2_content/icons/voltshot.png",
        description: "Reloading after defeating a target overcharges this weapon.",
        item_type: "Trait"
      }
    ]);
    expect(summary.characters[0]?.inventory_items).toHaveLength(3);
    expect(summary.characters[0]?.inventory_items[0]).toMatchObject({
      hash: 2001,
      instance_id: "backpack-1",
      name: "Riskrunner",
      group_key: "weapons",
      power: 1809,
      locked: false
    });
    expect(summary.characters[0]?.inventory_items[2]).toMatchObject({
      instance_id: "backpack-exotic-legs",
      bucket_hash: 20886954,
      bucket_name: "腿甲",
      group_key: "armor"
    });
    expect(summary.characters[0]?.inventory_groups.map((group) => group.key)).toEqual(["weapons", "armor"]);
    expect(summary.characters[0]?.inventory_groups[0]?.items.map((item) => item.instance_id)).toEqual(["backpack-1"]);
    expect(summary.characters[0]?.postmaster_items).toHaveLength(1);
    expect(summary.characters[0]?.postmaster_items[0]).toMatchObject({
      instance_id: "postmaster-1",
      name: "Helmet A",
      bucket_hash: 215593132,
      bucket_name: "Postmaster"
    });
    expect(summary.characters[0]?.loadout_slots).toMatchObject([
      {
        index: 0,
        name: "日落速刷",
        name_hash: 9001,
        icon_hash: 777,
        color_hash: 888,
        item_count: 2,
        items: [
          { instance_id: "instance-1", name: "Riskrunner", bucket_name: "能量武器", plug_hashes: [4001] },
          { instance_id: "backpack-2", name: "Helmet A", bucket_name: "头盔" }
        ]
      },
      {
        index: 1,
        name: "配装槽 2",
        item_count: 0,
        items: []
      }
    ]);
    expect(summary.characters[0]?.equipped_items[1]).toMatchObject({
      name: "Helmet A",
      group_key: "armor",
      class_type: 1,
      armor_stats: {
        health: 26,
        melee: 8,
        grenade: 12,
        super: 4,
        class: 16,
        weapon: 2,
        total: 68
      },
      armor_stat_breakdown: {
        health: { base: 16, mod: 10, final: 26 },
        melee: { base: 8, mod: 0, final: 8 },
        grenade: { base: 12, mod: 0, final: 12 },
        super: { base: 4, mod: 0, final: 4 },
        class: { base: 16, mod: 0, final: 16 },
        weapon: { base: 2, mod: 0, final: 2 },
        total: { base: 58, mod: 10, final: 68 }
      },
      armor_energy: {
        type_hash: 123,
        type: 1,
        capacity: 10,
        used: 6,
        unused: 4
      }
    });
    expect(summary.vault.item_count).toBe(35);
    expect(summary.vault.items).toHaveLength(35);
    expect(summary.vault.items[0]?.instance_id).toBe("vault-1");
    expect(summary.vault.items[34]?.instance_id).toBe("vault-35");
    expect(summary.vault.items[1]?.power).toBe(1805);
    expect(summary.vault.items[1]?.locked).toBe(true);
    expect(summary.vault.items[1]?.bucket_hash).toBe(2465295065);
    expect(summary.vault.items[1]?.bucket_name).toBe("能量武器");
    expect(summary.vault.items[1]?.group_key).toBe("weapons");
    expect(summary.vault.items[1]?.socket_plugs.map((plug) => plug.name)).toEqual(["Voltshot"]);
    expect(summary.vault.sample_items).toHaveLength(30);
    expect(summary.vault.sample_items.slice(0, 2).map((item) => item.name)).toEqual(["Vehicle A", "Riskrunner"]);
    expect(summary.vault.sample_items.slice(0, 2).map((item) => item.group_key)).toEqual(["equipment", "weapons"]);
    expect(summary.materials.item_count).toBe(2);
    expect(summary.materials.items.map((item) => `${item.name}:${item.quantity}`))
      .toEqual(["Enhancement Core:42", "Vehicle A:3"]);
    expect(summary.materials.items[0]).toMatchObject({
      hash: 5001,
      name: "Enhancement Core",
      icon: "https://www.bungie.net/common/destiny2_content/icons/core.png",
      item_type: "Currency",
      quantity: 42
    });
  });
});

// Bug #98：来源行要同时写出「仓库 N 件 / 全账号 M 件」两个范围。
// 两个数必须同源算出（全账号 = 仓库 + 角色侧），否则行上的两句话会互相打架。
describe("countAccountItemHashes", () => {
  it("同一件武器分两个范围数：仓库只算仓库，全账号再加上角色身上、背包与邮政官", () => {
    const counts = countAccountItemHashes(accountBuckets({
      vault: [101, 101, 202],
      equipped: [202, 303],
      inventory: [101],
      postmaster: [404]
    }));

    expect(toRecord(counts.vault)).toEqual({ 101: 2, 202: 1 });
    expect(toRecord(counts.account)).toEqual({ 101: 3, 202: 2, 303: 1, 404: 1 });
    // 少的那几件就是「在角色身上、不在仓库里」的那些——仓库那一半数不着它们，
    // 全账号那一半数得着。这正是用户看到「292 和 305 对不上」的那 13 件。
    expect(counts.vault.has(303)).toBe(false);
    expect(counts.vault.has(404)).toBe(false);
  });

  it("没有账号数据时两个范围一起为空，不会一个 0 一个有数", () => {
    const counts = countAccountItemHashes(accountBuckets({ vault: [], equipped: [], inventory: [], postmaster: [] }));

    expect(counts.vault.size).toBe(0);
    expect(counts.account.size).toBe(0);
  });
});

function toRecord(counts: Map<number, number>): Record<number, number> {
  return Object.fromEntries([...counts.entries()].sort((left, right) => left[0] - right[0]));
}

/**
 * 只造出计数用得到的部分：每个桶里放一串 Hash。
 *
 * `AccountItemSnapshot` 的其余字段与这件事无关，用 `as unknown as` 跳过——
 * 想要的是「函数按哪个桶算」，不是再复刻一份完整快照。
 */
function accountBuckets(buckets: {
  vault: number[];
  equipped: number[];
  inventory: number[];
  postmaster: number[];
}): Pick<AccountSnapshot, "vault" | "characters"> {
  const items = (hashes: number[]) => hashes.map((hash) => ({ hash })) as unknown as AccountItemSnapshot[];
  return {
    vault: { item_count: buckets.vault.length, items: items(buckets.vault), sample_items: [] },
    characters: [{
      equipped_items: items(buckets.equipped),
      inventory_items: items(buckets.inventory),
      postmaster_items: items(buckets.postmaster)
    } as unknown as AccountCharacterSnapshot]
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
