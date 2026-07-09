import { describe, expect, it } from "vitest";
import { buildLostSectorData } from "../src/daily/lostSectors.js";
import type { DefinitionComponentData } from "../src/manifest/definitions.js";

function makeActivityDef(
  hash: number,
  name: string,
  overrides: Record<string, unknown> = {}
): DefinitionComponentData {
  return {
    [String(hash)]: {
      hash,
      displayProperties: { name, description: `Desc: ${name}` },
      activityTypeHash: 103143560,
      directActivityModeType: 87,
      activityModeTypes: [87, 7],
      activityLightLevel: 1830,
      ...overrides,
    },
  };
}

describe("lost sectors from manifest", () => {
  it("finds lost sectors by activityTypeHash", () => {
    const defs: DefinitionComponentData = {
      ...makeActivityDef(100, "Aphelion's Rest"),
      ...makeActivityDef(200, "Bay of Drowned Wishes"),
      "300": {
        hash: 300,
        displayProperties: { name: "Strike: The Arms Dealer" },
        activityTypeHash: 0,
      },
    };

    const result = buildLostSectorData(defs, new Date("2026-06-25T18:00:00Z"));
    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe("Aphelion's Rest");
    expect(result.items[0].subtitle ?? "").not.toContain("推荐光等");
    expect(result.items[0].source ?? "").not.toContain("Manifest");
    expect(result.source).toBe("manifest-rotation");
  });

  it("finds lost sectors by Chinese name keyword", () => {
    const defs: DefinitionComponentData = {
      [String(9999)]: {
        hash: 9999,
        displayProperties: { name: "传说遗失区域：掘出" },
        // No activityTypeHash set — rely on name match
      },
    };

    const result = buildLostSectorData(defs, new Date("2026-06-25T18:00:00Z"));
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("传说遗失区域：掘出");
  });

  it("finds lost sectors by English name keyword", () => {
    const defs: DefinitionComponentData = {
      [String(8888)]: {
        hash: 8888,
        displayProperties: { name: "Legend Lost Sector: Extraction" },
      },
    };

    const result = buildLostSectorData(defs, new Date("2026-06-25T18:00:00Z"));
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toContain("Extraction");
  });

  it("finds current manifest lost sectors by Bungie activity mode type", () => {
    const defs: DefinitionComponentData = {
      "100": {
        hash: 100,
        displayProperties: { name: "天空码头IV: 专家" },
        originalDisplayProperties: { name: "天空码头IV" },
        activityTypeHash: 103143560,
        directActivityModeType: 87,
        activityModeTypes: [87, 7],
      },
      "200": {
        hash: 200,
        displayProperties: { name: "国王的陨落：标准" },
        activityTypeHash: 2043403989,
        activityModeTypes: [4],
      },
    };

    const result = buildLostSectorData(defs);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("天空码头IV");
  });

  it("returns empty when no lost sectors found", () => {
    const defs: DefinitionComponentData = {
      "1": {
        hash: 1,
        displayProperties: { name: "Crucible: Control" },
      },
    };

    const result = buildLostSectorData(defs);
    expect(result.items).toHaveLength(0);
    expect(result.message).toContain("未找到");
  });

  it("returns up to nine active world lost sectors instead of a single N-of-1 pick", () => {
    const defs: DefinitionComponentData = {
      ...makeActivityDef(1, "Sector A"),
      ...makeActivityDef(2, "Sector B"),
      ...makeActivityDef(3, "Sector C"),
      ...makeActivityDef(4, "Sector D"),
      ...makeActivityDef(5, "Sector E"),
      ...makeActivityDef(6, "Sector F"),
      ...makeActivityDef(7, "Sector G"),
      ...makeActivityDef(8, "Sector H"),
      ...makeActivityDef(9, "Sector I"),
      ...makeActivityDef(10, "Sector J"),
    };

    const result = buildLostSectorData(defs, new Date("2026-07-06T18:00:00Z"));

    expect(result.items).toHaveLength(9);
    expect(result.items.map((item) => item.title)).toEqual([
      "Sector A",
      "Sector B",
      "Sector C",
      "Sector D",
      "Sector E",
      "Sector F",
      "Sector G",
      "Sector H",
      "Sector I"
    ]);
    expect(result.message).toContain("今日展示 9 个");
  });

  it("builds player-facing briefing fields from official destination, modifier, and reward definitions", () => {
    const defs: DefinitionComponentData = {
      ...makeActivityDef(100, "采石场", {
        destinationHash: 697502628,
        activityLightLevel: 950,
        rewards: [
          {
            rewardItems: [
              { itemHash: 3632457717 },
              { itemHash: 2284123716 },
              { itemHash: 3339998924 }
            ]
          }
        ],
        modifiers: [
          { activityModifierHash: 1806568190 },
          { activityModifierHash: 1377274412 },
          { activityModifierHash: 3652821947 },
          { activityModifierHash: 1174869237 },
          { activityModifierHash: 3758645512 }
        ]
      }),
      ...makeActivityDef(101, "采石场", {
        destinationHash: 697502628,
        activityLightLevel: 980,
        rewards: [
          {
            rewardItems: [
              { itemHash: 3632457717 },
              { itemHash: 4087193961 },
              { itemHash: 585074942 }
            ]
          }
        ],
        modifiers: [
          { activityModifierHash: 1806568190 },
          { activityModifierHash: 1377274412 },
          { activityModifierHash: 3652821947 },
          { activityModifierHash: 501815068 },
          { activityModifierHash: 3758645512 }
        ]
      }),
    };

    const result = (buildLostSectorData as any)(defs, new Date("2026-06-25T18:00:00Z"), {
      destinations: {
        "697502628": {
          displayProperties: { name: "欧洲无人区" }
        }
      },
      items: {
        "3632457717": { displayProperties: { name: "强化核心（罕见）" } },
        "2284123716": { displayProperties: { name: "如若单人 - 异域记忆水晶（稀有）" } },
        "3339998924": { displayProperties: { name: "如若单人 - 传说武器（罕见）" } },
        "4087193961": { displayProperties: { name: "如若单人 - 异域记忆水晶（普通）" } },
        "585074942": { displayProperties: { name: "如若单人 - 传说武器（普通）" } }
      },
      modifiers: {
        "1806568190": {
          displayProperties: { name: "勇士敌人", description: "你将面对屏障和势不可挡勇士。" }
        },
        "1377274412": {
          displayProperties: { name: "护盾敌人", description: "烈日和虚空护盾" }
        },
        "3652821947": {
          displayProperties: { name: "虚空威胁", description: "受到的虚空伤害提升。" }
        },
        "1174869237": {
          displayProperties: { name: "专家修改器" }
        },
        "501815068": {
          displayProperties: { name: "大师难度修改器" }
        },
        "3758645512": {
          displayProperties: { name: "过充榴弹发射器" }
        }
      }
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      title: "采石场",
      destinationName: "欧洲无人区",
      championTypes: ["屏障", "势不可挡"],
      shieldTypes: ["烈日", "虚空"],
      threatType: "虚空",
      expertSoloRewards: ["异域记忆水晶（稀有）", "传说武器（罕见）"],
      masterSoloRewards: ["异域记忆水晶（普通）", "传说武器（普通）"]
    });
    expect(result.items[0].subtitle ?? "").not.toContain("950");
    expect(result.items[0].subtitle ?? "").not.toContain("世界遗失区域");
    expect(result.items[0].description ?? "").not.toContain("强化核心");
    expect(result.items[0].source ?? "").not.toContain("Manifest");
  });
});
