import { describe, expect, it } from "vitest";
import { summarizeItemRelease } from "../src/items/release.ts";
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
          label: "官方来源提示",
          description: "Bungie Manifest 未提供官方来源提示。"
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

    itemWithPerks["1"].inventory = {
      ...itemWithPerks["1"].inventory,
      bucketTypeHash: 1498876634
    };

    expect(searchItemDefinitions(itemWithPerks, "风险", { plugSetDefinitions: plugSets })[0]?.perks)
      .toEqual([
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

  it("collapses historical armor definitions and excludes same-name engram entries", () => {
    const starfireDefinitions: DefinitionComponentData = {
      "599049453": {
        hash: 599049453,
        displayProperties: {
          name: "星火协议",
          description: "当前收藏品版本",
          icon: "/common/destiny2_content/icons/starfire.jpg"
        },
        itemType: 2,
        itemTypeDisplayName: "胸部护甲",
        classType: 2,
        inventory: { tierTypeName: "异域", bucketTypeHash: 14239492 },
        collectibleHash: 860077154,
        traitIds: ["item.armor.chest", "item.armor.exotic", "releases.v300.annual"]
      },
      "1256834041": {
        hash: 1256834041,
        displayProperties: {
          name: "星火协议",
          description: "异域记忆水晶条目",
          icon: "/common/destiny2_content/icons/starfire.jpg"
        },
        itemType: 0,
        itemTypeDisplayName: "胸部护甲",
        classType: 2,
        inventory: { tierTypeName: "异域", bucketTypeHash: 2422292810 },
        traitIds: ["item.engram", "releases.v300.annual"]
      },
      "2082483156": {
        hash: 2082483156,
        displayProperties: {
          name: "星火协议",
          description: "旧护甲属性版本",
          icon: "/common/destiny2_content/icons/starfire.jpg"
        },
        itemType: 2,
        itemTypeDisplayName: "胸部护甲",
        classType: 2,
        inventory: { tierTypeName: "异域", bucketTypeHash: 14239492 },
        traitIds: ["item.armor.chest", "item.armor.exotic", "releases.v300.annual"]
      },
      "2782999717": {
        hash: 2782999717,
        displayProperties: {
          name: "星火协议",
          description: "更早的护甲属性版本",
          icon: "/common/destiny2_content/icons/starfire.jpg"
        },
        itemType: 2,
        itemTypeDisplayName: "胸部护甲",
        classType: 2,
        inventory: { tierTypeName: "异域", bucketTypeHash: 14239492 },
        traitIds: ["item.armor.chest", "item.armor.exotic", "releases.v300.annual"]
      }
    };

    const results = searchItemDefinitions(starfireDefinitions, "星火协议", {
      collectibleDefinitions: {
        "860077154": {
          hash: 860077154,
          sourceString: "异域记忆水晶；极稀有世界掉落。"
        }
      }
    });

    expect(results.map((item) => item.hash)).toEqual([599049453]);
    expect(results[0]?.source.status).toBe("ready");
  });

  it("returns player-readable release summaries from Manifest season definitions", () => {
    const tyrannyDefinitions: DefinitionComponentData = {
      "2721249463": {
        hash: 2721249463,
        displayProperties: { name: "天堂暴政", description: "旧版" },
        itemType: 3,
        itemTypeDisplayName: "战斗弓箭",
        inventory: { bucketTypeHash: 2465295065 },
        collectibleHash: 301231525,
        seasonHash: 400004
      },
      "3388655311": {
        hash: 3388655311,
        displayProperties: { name: "天堂暴政", description: "复刻版" },
        itemType: 3,
        itemTypeDisplayName: "战斗弓箭",
        inventory: { bucketTypeHash: 2465295065 },
        translationBlock: {
          arrangements: [{ classHash: 0, artArrangementHash: 2721249463 }]
        },
        seasonHash: 400021
      }
    };

    const results = searchItemDefinitions(tyrannyDefinitions, "天堂暴政", {
      collectibleDefinitions: {
        "301231525": {
          hash: 301231525,
          sourceString: "来源：“救赎花园”突袭",
          sourceHash: 1491707941
        }
      },
      seasonDefinitions: {
        "400004": {
          hash: 400004,
          seasonNumber: 4,
          displayProperties: { name: "锻炉赛季" }
        },
        "400021": {
          hash: 400021,
          seasonNumber: 21,
          displayProperties: { name: "深渊赛季" }
        }
      }
    });

    expect(results.map((item) => item.release)).toEqual([
      {
        status: "ready",
        label: "发布版本",
        kind: "season",
        season_hash: 400004,
        season_number: 4,
        year_number: 2,
        name: "锻炉赛季",
        description: "第2年 · 第4赛季 · 锻炉赛季"
      },
      {
        status: "ready",
        label: "发布版本",
        kind: "season",
        season_hash: 400021,
        season_number: 21,
        year_number: 6,
        name: "深渊赛季",
        description: "第6年 · 第21赛季 · 深渊赛季"
      }
    ]);
    expect(results.map((item) => item.source)).toEqual([
      {
        status: "ready",
        label: "官方来源提示",
        description: "“救赎花园”突袭",
        source_kind: "collectible",
        source_hash: 1491707941,
        linked_definition_hash: undefined
      },
      {
        status: "ready",
        label: "官方来源提示",
        description: "“救赎花园”突袭",
        source_kind: "linked_collectible",
        source_hash: 1491707941,
        linked_definition_hash: 2721249463
      }
    ]);
  });

  it("parses annual releases and maps current content traits to their release season", () => {
    expect(summarizeItemRelease({ traitIds: ["releases.v600.annual"] }, undefined)).toMatchObject({
      status: "ready",
      label: "发布版本",
      kind: "annual",
      year_number: 5,
      name: "邪姬魅影",
      description: "第5年 · 邪姬魅影"
    });
    expect(summarizeItemRelease({ traitIds: ["releases.v950.dlc"] }, undefined)).toMatchObject({
      status: "ready",
      label: "发布版本",
      kind: "dlc",
      season_number: 28,
      year_number: 8,
      name: "反叛",
      description: "第8年 · 第28赛季 · 凯旋纪念碑 · 反叛内容包"
    });
    expect(summarizeItemRelease({ traitIds: ["releases.v970.core"] }, undefined)).toMatchObject({
      status: "ready",
      label: "发布版本",
      kind: "core",
      season_number: 28,
      year_number: 8,
      description: "第8年 · 第28赛季 · 凯旋纪念碑 · 核心内容更新"
    });
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

  it("returns fixed card tags for element, adept status, and origin traits", () => {
    const weaponDefinitions: DefinitionComponentData = {
      "1": {
        ...definitions["1"],
        defaultDamageType: 3,
        isAdept: true,
        sockets: {
          socketEntries: [{ singleInitialItemHash: 2 }]
        }
      },
      "2": {
        hash: 2,
        displayProperties: { name: "爆炸契约" },
        plug: { plugCategoryIdentifier: "origins" }
      }
    };

    expect(searchItemDefinitions(weaponDefinitions, "风险")[0]).toMatchObject({
      damage_type: "烈日伤害",
      is_adept: true,
      origin_traits: [{ hash: 2, name: "爆炸契约" }]
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
