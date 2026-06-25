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
    expect(result.items).toHaveLength(1);
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

  it("rotates lost sectors deterministically by date", () => {
    const defs: DefinitionComponentData = {
      ...makeActivityDef(1, "Sector A"),
      ...makeActivityDef(2, "Sector B"),
      ...makeActivityDef(3, "Sector C"),
    };

    const day1 = buildLostSectorData(defs, new Date("2026-06-25T18:00:00Z"));
    const day2 = buildLostSectorData(defs, new Date("2026-06-26T18:00:00Z"));
    const day1Again = buildLostSectorData(defs, new Date("2026-06-25T18:00:00Z"));

    // Same date returns same sector
    expect(day1.items[0].title).toBe(day1Again.items[0].title);
    // Different dates may differ (3-sector pool means some adjacent days share)
    // After 3 days, should wrap around
    const day4 = buildLostSectorData(defs, new Date("2026-06-28T18:00:00Z"));
    expect(day1.items[0].title).toBe(day4.items[0].title);
  });

  it("includes daily rotation info in subtitle", () => {
    const defs: DefinitionComponentData = {
      ...makeActivityDef(1, "Sector A", { activityLightLevel: 1840 }),
    };

    const result = buildLostSectorData(defs, new Date("2026-06-25T18:00:00Z"));
    expect(result.items[0].subtitle).toContain("1840");
    expect(result.items[0].subtitle).toContain("1 选 1");
    expect(result.items[0].source).toBe("Manifest 轮换推算");
  });
});
