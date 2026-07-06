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
      activityTypeHash: 2724706103,
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
    expect(result.items[0].title).toContain("遗失区域");
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
    expect(result.items[0].title).toBe("遗失区域：传说遗失区域：掘出");
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
      "遗失区域：Sector A",
      "遗失区域：Sector B",
      "遗失区域：Sector C",
      "遗失区域：Sector D",
      "遗失区域：Sector E",
      "遗失区域：Sector F",
      "遗失区域：Sector G",
      "遗失区域：Sector H",
      "遗失区域：Sector I"
    ]);
    expect(result.message).toContain("今日展示 9 个");
  });

  it("includes daily rotation info in subtitle", () => {
    const defs: DefinitionComponentData = {
      ...makeActivityDef(1, "Sector A", { activityLightLevel: 1840 }),
    };

    const result = buildLostSectorData(defs, new Date("2026-06-25T18:00:00Z"));
    expect(result.items[0].subtitle).toContain("1840");
    expect(result.items[0].subtitle).toContain("世界遗失区域");
    expect(result.items[0].source).toBe("Manifest 世界遗失区域");
  });
});
