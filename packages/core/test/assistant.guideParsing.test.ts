import { describe, expect, it } from "vitest";
import type { BuildGuideRequirement } from "../src/assistant/guideSchema.js";
import { parseBuildGuideFallback, parseBuildGuideFromAiJson } from "../src/assistant/guideParsing.js";

describe("build guide schema", () => {
  it("represents uncertain guide requirements without treating them as facts", () => {
    const requirement: BuildGuideRequirement = {
      raw_text: "虚空术士，反转手，虚空武器，纪律 100",
      class_name: { value: "术士", confidence: "high" },
      subclass: { value: "虚空", confidence: "high" },
      exotic_armor: [{ name: "反转手", confidence: "high" }],
      weapons: [{ name: "虚空武器", confidence: "medium", requirement: "element" }],
      armor_stats: [{ stat: "discipline", minimum: 100, confidence: "high" }],
      mods: [],
      fragments: [],
      aspects: [],
      notes: [],
      needs_confirmation: ["虚空武器没有指定具体装备"]
    };

    expect(requirement.needs_confirmation).toContain("虚空武器没有指定具体装备");
  });
});

describe("build guide parsing", () => {
  it("normalizes AI JSON into a safe guide requirement", () => {
    const result = parseBuildGuideFromAiJson("虚空术士纪律 100", JSON.stringify({
      class_name: "术士",
      subclass: "虚空",
      exotic_armor: ["反转手"],
      weapons: [{ name: "虚空武器", requirement: "element", perk_names: ["斥力支架"] }],
      armor_stats: [{ stat: "discipline", minimum: 100 }],
      mods: ["虹吸"],
      aspects: ["混沌加速"],
      fragments: [],
      notes: ["适合手雷循环"]
    }));

    expect(result.parser).toBe("ai-json");
    expect(result.requirement.class_name?.value).toBe("术士");
    expect(result.requirement.armor_stats).toContainEqual({ stat: "discipline", minimum: 100, confidence: "high" });
    expect(result.requirement.needs_confirmation).toContain("虚空武器没有指定具体装备");
  });

  it("falls back to local keyword parsing when AI JSON is unusable", () => {
    const result = parseBuildGuideFallback("虚空术士\n需要反转手\n纪律 100\n虚空武器");

    expect(result.parser).toBe("local-fallback");
    expect(result.requirement.subclass?.value).toBe("虚空");
    expect(result.requirement.exotic_armor.map((item) => item.name)).toContain("反转手");
    expect(result.requirement.armor_stats[0]).toMatchObject({ stat: "discipline", minimum: 100 });
  });
});
