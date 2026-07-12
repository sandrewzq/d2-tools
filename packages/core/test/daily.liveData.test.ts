import { describe, expect, it } from "vitest";
import { buildDailyLiveDataFromBungie } from "../src/daily/liveData.js";
import type { DefinitionComponentData } from "../src/manifest/definitions.js";

describe("daily live data mapping", () => {
  it("maps public milestones and public vendors into the four selected daily sections", () => {
    const activityDefinitions: DefinitionComponentData = {
      "100": { displayProperties: { name: "玻璃小径" } },
      "200": { displayProperties: { name: "传说遗失区域：天启" } }
    };
    const vendorDefinitions: DefinitionComponentData = {
      "300": { displayProperties: { name: "枪匠" } }
    };
    const itemDefinitions: DefinitionComponentData = {
      "400": { displayProperties: { name: "风险管理者" } }
    };

    const liveData = buildDailyLiveDataFromBungie({
      milestones: {
        "1": {
          displayProperties: { name: "日落" },
          activities: [{ activityHash: 100 }]
        },
        "2": {
          displayProperties: { name: "遗失区域" },
          activities: [{ activityHash: 200 }]
        }
      },
      publicVendors: {
        vendors: {
          data: {
            "300": { vendorHash: 300 }
          }
        },
        sales: {
          data: {
            "300": {
              "sale-a": { itemHash: 400 }
            }
          }
        }
      },
      definitions: {
        activities: activityDefinitions,
        vendors: vendorDefinitions,
        items: itemDefinitions
      }
    });

    expect(liveData.rotations.map((item) => item.title)).toContain("日落：玻璃小径");
    expect(liveData.lost_sector).toEqual([]);
    expect(liveData.vendors.map((item) => item.title)).toContain("枪匠");
    expect(liveData.vendors[0].description).toContain("风险管理者");
    expect(liveData.weekly_report.some((item) => item.title === "Bungie 公共里程碑：日落")).toBe(true);
    expect(liveData.weekly_report.every((item) => !item.title.startsWith("周报："))).toBe(true);
    expect(liveData.weekly_report[0].subtitle).toContain("非完整掉落地图");
  });

  it("reads nested public vendor saleItems and formats readable item details", () => {
    const liveData = buildDailyLiveDataFromBungie({
      publicVendors: {
        vendors: {
          data: {
            "2190858386": { vendorHash: 2190858386 }
          }
        },
        sales: {
          data: {
            "2190858386": {
              saleItems: {
                "14": { itemHash: 3883286571 }
              }
            }
          }
        }
      },
      definitions: {
        vendors: {
          "2190858386": { displayProperties: { name: "老九" } }
        },
        items: {
          "3883286571": {
            displayProperties: { name: "守誓者" },
            itemTypeDisplayName: "臂铠",
            inventory: { tierTypeName: "异域" }
          }
        }
      }
    });

    expect(liveData.vendors).toHaveLength(1);
    expect(liveData.vendors[0].description).toContain("守誓者（臂铠，异域）");
    expect(liveData.vendors[0].description).not.toContain("库存名称暂不可读");
  });

  it("includes confirmed vendor sale costs when Bungie returns currency items", () => {
    const liveData = buildDailyLiveDataFromBungie({
      publicVendors: {
        vendors: {
          data: {
            "2190858386": { vendorHash: 2190858386 }
          }
        },
        sales: {
          data: {
            "2190858386": {
              saleItems: {
                "14": {
                  itemHash: 3883286571,
                  costs: [{ itemHash: 3702027555, quantity: 23 }]
                }
              }
            }
          }
        }
      },
      definitions: {
        vendors: {
          "2190858386": { displayProperties: { name: "老九" } }
        },
        items: {
          "3883286571": {
            displayProperties: { name: "守誓者" },
            itemTypeDisplayName: "臂铠",
            inventory: { tierTypeName: "异域" }
          },
          "3702027555": {
            displayProperties: { name: "奇异硬币" }
          }
        }
      }
    });

    expect(liveData.vendors[0].description).toContain("守誓者（臂铠，异域；23 奇异硬币）");
  });

  it("keeps public vendor, sale item, and currency icons for home and vendor UI", () => {
    const liveData = buildDailyLiveDataFromBungie({
      publicVendors: {
        vendors: {
          data: {
            "2190858386": { vendorHash: 2190858386 }
          }
        },
        sales: {
          data: {
            "2190858386": {
              saleItems: {
                "14": {
                  itemHash: 3883286571,
                  costs: [{ itemHash: 3702027555, quantity: 23 }]
                }
              }
            }
          }
        }
      },
      definitions: {
        vendors: {
          "2190858386": {
            displayProperties: {
              name: "老九",
              icon: "/common/destiny2_content/icons/xur.jpg"
            }
          }
        },
        items: {
          "3883286571": {
            displayProperties: {
              name: "守誓者",
              icon: "/common/destiny2_content/icons/oathkeeper.jpg"
            },
            itemTypeDisplayName: "臂铠",
            inventory: { tierTypeName: "异域" }
          },
          "3702027555": {
            displayProperties: {
              name: "奇异硬币",
              icon: "/common/destiny2_content/icons/strange-coin.jpg"
            }
          }
        }
      }
    });

    expect(liveData.vendors[0]).toMatchObject({
      iconUrl: "/common/destiny2_content/icons/xur.jpg"
    });
    expect(liveData.vendors[0].items?.[0]).toMatchObject({
      title: "守誓者",
      subtitle: "臂铠，异域",
      description: "23 奇异硬币",
      iconUrl: "/common/destiny2_content/icons/oathkeeper.jpg",
      costIconUrl: "/common/destiny2_content/icons/strange-coin.jpg",
      source: "Bungie 公共商人"
    });
  });

  it("keeps confirmed Xur availability, refresh time, and resolved location", () => {
    const liveData = buildDailyLiveDataFromBungie({
      publicVendors: {
        vendors: {
          data: {
            "2190858386": {
              vendorHash: 2190858386,
              enabled: true,
              nextRefreshDate: "2026-07-14T17:00:00Z",
              vendorLocationIndex: 0
            }
          }
        },
        sales: {
          data: {
            "2190858386": {
              saleItems: {
                "14": { itemHash: 3883286571 }
              }
            }
          }
        }
      },
      definitions: {
        vendors: {
          "2190858386": {
            displayProperties: { name: "仄" },
            locations: [{ destinationHash: 900 }]
          }
        },
        destinations: {
          "900": { displayProperties: { name: "高塔" } }
        },
        items: {
          "3883286571": { displayProperties: { name: "守誓者" } }
        }
      }
    });

    expect(liveData.vendors[0]).toMatchObject({
      title: "仄",
      vendorHash: 2190858386,
      vendorEnabled: true,
      vendorRefreshDate: "2026-07-14T17:00:00Z",
      vendorLocation: "高塔"
    });
  });

  it("drops disabled Xur vendor data instead of presenting stale inventory", () => {
    const liveData = buildDailyLiveDataFromBungie({
      publicVendors: {
        vendors: {
          data: {
            "2190858386": {
              vendorHash: 2190858386,
              enabled: false,
              nextRefreshDate: "2026-07-14T17:00:00Z"
            }
          }
        },
        sales: {
          data: {
            "2190858386": {
              saleItems: {
                "14": { itemHash: 3883286571 }
              }
            }
          }
        }
      },
      definitions: {
        vendors: {
          "2190858386": { displayProperties: { name: "仄" } }
        },
        items: {
          "3883286571": { displayProperties: { name: "守誓者" } }
        }
      }
    });

    expect(liveData.vendors).toEqual([]);
  });

  it("uses neutral placeholders when vendor definitions are missing", () => {
    const liveData = buildDailyLiveDataFromBungie({
      publicVendors: {
        vendors: {
          data: {
            "2190858386": { vendorHash: 2190858386 },
            "672118013": { vendorHash: 672118013 }
          }
        },
        sales: { data: {} }
      },
      definitions: {}
    });

    expect(liveData.vendors.map((item) => item.title)).toEqual([
      "等待资料库解析的商人",
      "等待资料库解析的商人"
    ]);
    expect(liveData.vendors[0].subtitle).toBe("周末商人库存");
    expect(liveData.vendors[1].subtitle).toBe("登录角色或公共商人库存");
    expect(JSON.stringify(liveData.vendors)).not.toContain("老九");
    expect(JSON.stringify(liveData.vendors)).not.toContain("枪匠");
    expect(liveData.vendors.map((item) => item.description).join(" ")).not.toContain("2190858386");
    expect(liveData.vendors.map((item) => item.description).join(" ")).not.toContain("672118013");
  });

  it("uses vendor definition names exactly instead of canonical translations", () => {
    const liveData = buildDailyLiveDataFromBungie({
      publicVendors: {
        vendors: {
          data: {
            "672118013": { vendorHash: 672118013 }
          }
        },
        sales: { data: {} }
      },
      definitions: {
        vendors: {
          "672118013": { displayProperties: { name: "资料库枪匠名" } }
        }
      }
    });

    expect(liveData.vendors[0]).toMatchObject({
      title: "资料库枪匠名",
      vendorHash: 672118013
    });
  });

  it("merges authenticated character vendors into daily vendor summaries", () => {
    const liveData = buildDailyLiveDataFromBungie({
      publicVendors: {
        vendors: {
          data: {
            "2190858386": { vendorHash: 2190858386 }
          }
        },
        sales: {
          data: {
            "2190858386": {
              saleItems: {
                "14": { itemHash: 3883286571 }
              }
            }
          }
        }
      },
      characterVendors: [
        {
          characterId: "character-1",
          vendors: {
            data: {
              "672118013": { vendorHash: 672118013 },
              "3500617033": { vendorHash: 3500617033 }
            }
          },
          sales: {
            data: {
              "672118013": {
                saleItems: {
                  "weapon": { itemHash: 400, costs: [{ itemHash: 3159615086, quantity: 7000 }] }
                }
              },
              "3500617033": {
                saleItems: {
                  "synth": { itemHash: 401 }
                }
              }
            }
          }
        }
      ],
      definitions: {
        vendors: {
          "2190858386": { displayProperties: { name: "资料库周末商人" } },
          "672118013": { displayProperties: { name: "资料库武器商人" } },
          "3500617033": { displayProperties: { name: "资料库护甲商人" } }
        },
        items: {
          "3883286571": {
            displayProperties: { name: "守誓者" },
            itemTypeDisplayName: "臂铠",
            inventory: { tierTypeName: "异域" }
          },
          "400": {
            displayProperties: { name: "高射速自动步枪" },
            itemTypeDisplayName: "自动步枪",
            inventory: { tierTypeName: "传说" }
          },
          "401": {
            displayProperties: { name: "护甲合成赏金" },
            itemTypeDisplayName: "赏金"
          },
          "3159615086": {
            displayProperties: { name: "微光" }
          }
        }
      }
    });

    expect(liveData.vendors.map((item) => item.title)).toEqual(["资料库周末商人", "资料库武器商人", "资料库护甲商人"]);
    expect(liveData.vendors[1]).toMatchObject({
      subtitle: "登录角色或公共商人库存",
      source: "Bungie 登录角色商人"
    });
    expect(liveData.vendors[1].items?.[0]).toMatchObject({
      title: "高射速自动步枪",
      subtitle: "自动步枪，传说",
      description: "7000 微光",
      source: "Bungie 登录角色商人"
    });
    expect(liveData.vendors[2]).toMatchObject({
      title: "资料库护甲商人",
      source: "Bungie 登录角色商人"
    });
  });

  it("keeps non-key vendors when key vendors are present", () => {
    const liveData = buildDailyLiveDataFromBungie({
      publicVendors: {
        vendors: {
          data: {
            "2190858386": { vendorHash: 2190858386 },
            "123456": { vendorHash: 123456 }
          }
        },
        sales: {
          data: {
            "2190858386": {
              saleItems: {
                "xur-item": { itemHash: 400 }
              }
            },
            "123456": {
              saleItems: {
                "vendor-item": { itemHash: 401 }
              }
            }
          }
        }
      },
      definitions: {
        vendors: {
          "2190858386": { displayProperties: { name: "资料库周末商人" } },
          "123456": { displayProperties: { name: "资料库非关键商人" } }
        },
        items: {
          "400": { displayProperties: { name: "异域库存" } },
          "401": { displayProperties: { name: "普通库存" } }
        }
      }
    });

    expect(liveData.vendors.map((item) => item.title)).toEqual([
      "资料库周末商人",
      "资料库非关键商人"
    ]);
    expect(liveData.vendors[1].items?.[0]?.title).toBe("普通库存");
  });

  it("uses milestone definitions when public milestone payload omits display names", () => {
    const liveData = buildDailyLiveDataFromBungie({
      milestones: {
        "292102995": {
          activities: [{ activityHash: 100 }]
        }
      },
      definitions: {
        milestones: {
          "292102995": { displayProperties: { name: "国王的陨落", description: "国王万岁" } }
        },
        activities: {
          "100": { displayProperties: { name: "国王的陨落: 标准" } }
        }
      }
    });

    expect(liveData.rotations.map((item) => item.title)).toContain("国王的陨落: 标准");
    expect(liveData.weekly_report.map((item) => item.title)).toContain("Bungie 公共里程碑：国王的陨落");
    expect(liveData.weekly_report[0].description).toBe("国王万岁");
  });

  it("classifies lost sector activities per activity instead of contaminating the whole milestone", () => {
    const liveData = buildDailyLiveDataFromBungie({
      milestones: {
        "777": {
          displayProperties: { name: "每日活动" },
          activities: [
            { activityHash: 200 },
            { activityHash: 100 }
          ]
        }
      },
      definitions: {
        activities: {
          "100": { displayProperties: { name: "国王的陨落：标准" } },
          "200": { displayProperties: { name: "传说遗失区域：英灵日遗失区域" } }
        }
      }
    });

    expect(liveData.lost_sector).toEqual([]);
    expect(liveData.rotations.map((item) => item.title)).toContain("每日活动：国王的陨落：标准");
    expect(liveData.lost_sector.map((item) => item.title).join(" ")).not.toContain("国王的陨落");
    expect(liveData.weekly_report.map((item) => item.title)).toContain("Bungie 公共里程碑：每日活动");
  });

  it("does not present an incomplete public milestone lost sector without confirmed active hashes", () => {
    const liveData = buildDailyLiveDataFromBungie({
      milestones: {
        "777": {
          displayProperties: { name: "遗失区域" },
          availableQuests: [{ questItemHash: 900 }]
        }
      },
      definitions: {
        activities: Object.fromEntries([
          [1344654780, "采石场"], [1509764568, "萃取地"], [1962464165, "永劫地狱"],
          [2983905025, "镀金箴言"], [3995113176, "繁盛深渊"], [2310698359, "溪谷迷宫"],
          [4269987990, "汇流"], [1956131630, "K1通讯区"], [457172842, "星光大殿"]
        ].map(([hash, name]) => [String(hash), {
          hash,
          displayProperties: { name },
          activityTypeHash: 103143560,
          directActivityModeType: 87,
          activityModeTypes: [87, 7]
        }])),
        items: {
          "900": { displayProperties: { name: "传说遗失区域：英灵日遗失区域" } }
        }
      }
    });

    expect(liveData.lost_sector).toEqual([]);
  });

  it("passes official lost sector destination, modifier, and solo reward definitions into daily live data", () => {
    const liveData = buildDailyLiveDataFromBungie({
      activeLostSectorActivityHashes: [1344654780],
      definitions: {
        activities: {
          "1344654780": {
            hash: 1344654780,
            displayProperties: { name: "采石场" },
            activityTypeHash: 103143560,
            directActivityModeType: 87,
            activityModeTypes: [87, 7],
            destinationHash: 697502628,
            rewards: [{ rewardItems: [{ itemHash: 2284123716 }, { itemHash: 3339998924 }] }],
            modifiers: [
              { activityModifierHash: 1806568190 },
              { activityModifierHash: 1377274412 },
              { activityModifierHash: 3652821947 },
              { activityModifierHash: 1174869237 }
            ]
          },
          "101": {
            displayProperties: { name: "采石场" },
            activityTypeHash: 103143560,
            directActivityModeType: 87,
            activityModeTypes: [87, 7],
            destinationHash: 697502628,
            rewards: [{ rewardItems: [{ itemHash: 4087193961 }, { itemHash: 585074942 }] }],
            modifiers: [
              { activityModifierHash: 1806568190 },
              { activityModifierHash: 1377274412 },
              { activityModifierHash: 3652821947 },
              { activityModifierHash: 501815068 }
            ]
          }
        },
        items: {
          "2284123716": { displayProperties: { name: "如若单人 - 异域记忆水晶（稀有）" } },
          "3339998924": { displayProperties: { name: "如若单人 - 传说武器（罕见）" } },
          "4087193961": { displayProperties: { name: "如若单人 - 异域记忆水晶（普通）" } },
          "585074942": { displayProperties: { name: "如若单人 - 传说武器（普通）" } }
        },
        destinations: {
          "697502628": { displayProperties: { name: "欧洲无人区" } }
        },
        modifiers: {
          "1806568190": { displayProperties: { name: "勇士敌人", description: "你将面对屏障和势不可挡勇士。" } },
          "1377274412": { displayProperties: { name: "护盾敌人", description: "烈日和虚空护盾" } },
          "3652821947": { displayProperties: { name: "虚空威胁" } },
          "1174869237": { displayProperties: { name: "专家修改器" } },
          "501815068": { displayProperties: { name: "大师难度修改器" } }
        }
      } as any
    });

    expect(liveData.lost_sector[0]).toMatchObject({
      title: "采石场",
      destinationName: "欧洲无人区",
      championTypes: ["屏障", "势不可挡"],
      shieldTypes: ["烈日", "虚空"],
      threatType: "虚空",
      expertSoloRewards: ["异域记忆水晶（稀有）", "传说武器（罕见）"],
      masterSoloRewards: ["异域记忆水晶（普通）", "传说武器（普通）"]
    });
    expect(liveData.lost_sector[0]?.subtitle ?? "").not.toContain("950");
    expect(liveData.lost_sector[0]?.source ?? "").not.toContain("Manifest");
  });

  it("does not expose raw Bungie milestone or vendor hashes to players", () => {
    const liveData = buildDailyLiveDataFromBungie({
      milestones: {
        "292102995": {},
        "540415767": {
          displayProperties: { description: "Only a description is not enough for a readable card." }
        }
      },
      publicVendors: {
        vendors: {
          data: {
            "2190858386": { vendorHash: 2190858386 }
          }
        },
        sales: { data: {} }
      },
      definitions: {}
    });

    const playerVisibleText = [
      ...liveData.rotations,
      ...liveData.vendors,
      ...liveData.weekly_report
    ].flatMap((item) => [item.title, item.subtitle, item.description]).join(" ");

    expect(playerVisibleText).not.toContain("里程碑 292102995");
    expect(playerVisibleText).not.toContain("里程碑 540415767");
    expect(playerVisibleText).not.toContain("商人 2190858386");
    expect(playerVisibleText).not.toContain("老九");
    expect(liveData.rotations).toEqual([]);
    expect(liveData.vendors.map((item) => item.title)).toEqual(["等待资料库解析的商人"]);
    expect(liveData.weekly_report).toEqual([]);
  });
});
