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
    expect(liveData.lost_sector.map((item) => item.title)).toContain("遗失区域：传说遗失区域：天启");
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

  it("uses known key vendor labels when vendor definitions are missing", () => {
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

    expect(liveData.vendors.map((item) => item.title)).toEqual(["老九", "枪匠"]);
    expect(liveData.vendors[0].subtitle).toBe("异域商人 · 周五至周二出现");
    expect(liveData.vendors[1].subtitle).toBe("枪匠 · 每日模组刷新");
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

    const text = JSON.stringify(liveData);

    expect(text).not.toContain("里程碑 292102995");
    expect(text).not.toContain("里程碑 540415767");
    expect(text).not.toContain("商人 2190858386");
    expect(liveData.rotations).toEqual([]);
    expect(liveData.vendors.map((item) => item.title)).toEqual(["老九"]);
    expect(liveData.weekly_report).toEqual([]);
  });
});
