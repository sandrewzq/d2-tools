import { describe, expect, it } from "vitest";
import { queryManifestPerks, getManifestPerk, perkToTargetCondition } from "../src/analysis/manifestPerks.js";
import type { DefinitionComponentData } from "../src/manifest/definitions.js";

function makePerkDef(hash: number, name: string, desc?: string): DefinitionComponentData {
  return {
    [String(hash)]: {
      hash,
      displayProperties: { name, description: desc },
    },
  };
}

describe("manifest perk query", () => {
  const perkDefs: DefinitionComponentData = {
    ...makePerkDef(100, "暴徒", "击杀后提升装填速度"),
    ...makePerkDef(200, "狂乱", "持续战斗后提升伤害和操控"),
    ...makePerkDef(300, "战壕炮管", "近战击杀后短时间内提升伤害"),
    ...makePerkDef(400, "Armor Mod Mobility", "Increases mobility"),
    ...makePerkDef(500, "Ghost Scanner", "Detects resources"),
  };

  it("returns all weapon-relevant perks when no query", () => {
    const result = queryManifestPerks(perkDefs);
    // Should exclude "Armor Mod Mobility" and "Ghost Scanner"
    expect(result.map((p) => p.hash).sort()).toEqual([100, 200, 300]);
  });

  it("searches by name", () => {
    const result = queryManifestPerks(perkDefs, "暴徒");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("暴徒");
    expect(result[0].hash).toBe(100);
  });

  it("searches by description", () => {
    const result = queryManifestPerks(perkDefs, "装填");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("暴徒");
  });

  it("case-insensitive search", () => {
    const result = queryManifestPerks(perkDefs, "MOBILITY");
    // "Armor Mod Mobility" should be filtered out by isWeaponRelevant
    expect(result).toHaveLength(0);
  });

  it("getManifestPerk returns single perk by hash", () => {
    const perk = getManifestPerk(perkDefs, 200);
    expect(perk?.name).toBe("狂乱");
    expect(perk?.hash).toBe(200);
  });

  it("getManifestPerk returns null for unknown hash", () => {
    expect(getManifestPerk(perkDefs, 99999)).toBeNull();
  });

  it("perkToTargetCondition builds condition from manifest", () => {
    const condition = perkToTargetCondition(perkDefs, 100);
    expect(condition).toEqual({ perk_hash: 100, perk_name: "暴徒" });
  });

  it("perkToTargetCondition returns null for missing perk", () => {
    expect(perkToTargetCondition(perkDefs, 99999)).toBeNull();
  });
});
