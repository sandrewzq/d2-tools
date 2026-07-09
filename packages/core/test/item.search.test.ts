import { describe, expect, it } from "vitest";
import { searchItemDefinitions } from "../src/items/search.ts";
import type { DefinitionComponentData } from "../src/manifest/definitions.js";

const definitions: DefinitionComponentData = {
  "1": {
    hash: 1,
    displayProperties: {
      name: "风险管理者",
      description: "一把会导引电弧的异域冲锋枪。",
      icon: "/common/destiny2_content/icons/riskrunner.png"
    },
    itemTypeDisplayName: "冲锋枪",
    inventory: { tierTypeName: "异域" }
  },
  "2": {
    hash: 2,
    displayProperties: {
      name: "Riskrunner",
      description: "Exotic submachine gun.",
      icon: "/common/destiny2_content/icons/riskrunner_en.png"
    },
    itemTypeDisplayName: "Submachine Gun",
    inventory: { tierTypeName: "Exotic" }
  },
  "3": {
    hash: 3,
    displayProperties: {
      name: "",
      description: "Hidden item"
    }
  },
  "100": {
    hash: 100,
    displayProperties: {
      name: "爆破专家",
      description: "使用技能会重新装填武器。"
    }
  },
  "101": {
    hash: 101,
    displayProperties: {
      name: "萤火虫",
      description: "精准击杀产生元素爆炸。"
    }
  }
};

describe("item definition search", () => {
  it("returns compact summaries for Chinese display name matches", () => {
    expect(searchItemDefinitions(definitions, "风险")).toEqual([
      {
        hash: 1,
        name: "风险管理者",
        description: "一把会导引电弧的异域冲锋枪。",
        icon: "https://www.bungie.net/common/destiny2_content/icons/riskrunner.png",
        item_type: "冲锋枪",
        tier: "异域",
        group_key: "other",
        source: {
          status: "missing",
          label: "来源",
          description: "Bungie Manifest 未提供完整来源，后续再接入更细的数据源。"
        }
      }
    ]);
  });

  it("includes perk groups when plug set definitions are provided", () => {
    const itemWithPerks: DefinitionComponentData = {
      "1": {
        ...definitions["1"],
        sockets: {
          socketEntries: [{ reusablePlugSetHash: 500 }]
        }
      },
      "100": definitions["100"],
      "101": definitions["101"]
    };
    const plugSets: DefinitionComponentData = {
      "500": {
        hash: 500,
        reusablePlugItems: [
          { plugItemHash: 100 },
          { plugItemHash: 101 }
        ]
      }
    };

    expect(searchItemDefinitions(itemWithPerks, "风险", { plugSetDefinitions: plugSets }))
      .toEqual([
        {
          hash: 1,
          name: "风险管理者",
          description: "一把会导引电弧的异域冲锋枪。",
          icon: "https://www.bungie.net/common/destiny2_content/icons/riskrunner.png",
          item_type: "冲锋枪",
          tier: "异域",
          group_key: "other",
          perks: [
            {
              socket_index: 0,
              plugs: [
                {
                  hash: 100,
                  name: "爆破专家",
                  description: "使用技能会重新装填武器。",
                  icon: undefined
                },
                {
                  hash: 101,
                  name: "萤火虫",
                  description: "精准击杀产生元素爆炸。",
                  icon: undefined
                }
              ]
            }
          ],
          source: {
            status: "missing",
            label: "来源",
            description: "Bungie Manifest 未提供完整来源，后续再接入更细的数据源。"
          }
        }
      ]);
  });

  it("includes definition weapon stats when stat definitions are provided", () => {
    const itemWithStats: DefinitionComponentData = {
      "1": {
        ...definitions["1"],
        stats: {
          stats: {
            "4043523819": {
              statHash: 4043523819,
              value: 68,
              displayMaximum: 100
            },
            "155624089": {
              statHash: 155624089,
              value: 59,
              displayMaximum: 100
            },
            "4284893193": {
              statHash: 4284893193,
              value: 140,
              displayMaximum: 1000
            },
            "999": {
              statHash: 999,
              value: 0,
              displayMaximum: 100
            }
          }
        }
      }
    };
    const statDefinitions: DefinitionComponentData = {
      "4043523819": {
        hash: 4043523819,
        displayProperties: { name: "伤害" },
        index: 10
      },
      "155624089": {
        hash: 155624089,
        displayProperties: { name: "稳定性" },
        index: 30
      },
      "4284893193": {
        hash: 4284893193,
        displayProperties: { name: "RPM" },
        index: 5
      },
      "999": {
        hash: 999,
        displayProperties: { name: "隐藏零值" },
        index: 1
      }
    };

    expect(searchItemDefinitions(itemWithStats, "风险", { statDefinitions })[0]?.definition_stats)
      .toEqual([
        { hash: 4284893193, name: "RPM", value: 140, display_maximum: 1000 },
        { hash: 4043523819, name: "伤害", value: 68, display_maximum: 100 },
        { hash: 155624089, name: "稳定性", value: 59, display_maximum: 100 }
      ]);
  });

  it("matches English display names case-insensitively", () => {
    expect(searchItemDefinitions(definitions, "runner").map((item) => item.hash)).toEqual([2]);
  });

  it("filters same-name pattern, dummy, and mod definitions from equipment search", () => {
    const tyrannyDefinitions: DefinitionComponentData = {
      "543990593": {
        hash: 543990593,
        displayProperties: { name: "天堂暴政", description: "Pattern entry" },
        itemType: 30,
        itemTypeDisplayName: "战斗弓箭",
        inventory: { bucketTypeHash: 766235248 }
      },
      "910588426": {
        hash: 910588426,
        displayProperties: { name: "天堂暴政", description: "Dummy entry" },
        itemType: 20,
        itemTypeDisplayName: "战斗弓箭",
        inventory: { bucketTypeHash: 2465295065 }
      },
      "2721249463": {
        hash: 2721249463,
        displayProperties: { name: "天堂暴政", description: "Weapon entry" },
        itemType: 3,
        itemTypeDisplayName: "战斗弓箭",
        inventory: { bucketTypeHash: 2465295065 }
      },
      "2902836964": {
        hash: 2902836964,
        displayProperties: { name: "天堂暴政", description: "Mod entry" },
        itemType: 19,
        inventory: { bucketTypeHash: 3313201758 }
      },
      "3052325065": {
        hash: 3052325065,
        displayProperties: { name: "天堂暴政", description: "Second dummy entry" },
        itemType: 20,
        itemTypeDisplayName: "战斗弓箭",
        inventory: { bucketTypeHash: 2465295065 }
      },
      "3388655311": {
        hash: 3388655311,
        displayProperties: { name: "天堂暴政", description: "Second weapon entry" },
        itemType: 3,
        itemTypeDisplayName: "战斗弓箭",
        inventory: { bucketTypeHash: 2465295065 }
      }
    };

    expect(searchItemDefinitions(tyrannyDefinitions, "天堂暴政").map((item) => item.hash)).toEqual([
      2721249463,
      3388655311
    ]);
  });

  it("returns confirmed bucket, group, and ammo fields for library filters", () => {
    const weaponDefinitions: DefinitionComponentData = {
      "1": {
        ...definitions["1"],
        inventory: {
          tierTypeName: "异域",
          bucketTypeHash: 2465295065
        },
        equippingBlock: {
          ammoType: 1
        }
      }
    };

    expect(searchItemDefinitions(weaponDefinitions, "风险")[0]).toMatchObject({
      bucket_hash: 2465295065,
      bucket_name: "能量武器",
      group_key: "weapons",
      ammo_type: "primary"
    });
  });

  it("returns a weapon frame summary when a frame plug is available", () => {
    const weaponDefinitions: DefinitionComponentData = {
      "1": {
        ...definitions["1"],
        inventory: {
          tierTypeName: "异域",
          bucketTypeHash: 2465295065
        },
        sockets: {
          socketEntries: [{ singleInitialItemHash: 102 }]
        }
      },
      "102": {
        hash: 102,
        displayProperties: {
          name: "Rapid-Fire Frame"
        },
        itemTypeDisplayName: "Intrinsic"
      }
    };

    expect(searchItemDefinitions(weaponDefinitions, "风险")[0]).toMatchObject({
      weapon_frame: {
        key: "rapid-fire-frame",
        name: "Rapid-Fire Frame"
      }
    });
  });

  it("limits result count", () => {
    expect(searchItemDefinitions(definitions, "risk", { limit: 1 })).toHaveLength(1);
  });

  it("returns no results for blank queries", () => {
    expect(searchItemDefinitions(definitions, "   ")).toEqual([]);
  });
});
