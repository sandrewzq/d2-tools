import { describe, expect, it } from "vitest";
import type { BuildGuideMatchResult } from "../src/assistant/guideSchema.js";
import { createBuildGuideLoadoutDraft } from "../src/assistant/loadoutDraft.js";

describe("guide loadout draft", () => {
  it("creates a saveable draft from matched account items while preserving gaps", () => {
    const draft = createBuildGuideLoadoutDraft({
      characterId: "warlock-1",
      fallbackName: "虚空术士攻略",
      match: {
        requirement: {
          raw_text: "虚空术士 反转手 漏斗网",
          class_name: { value: "术士", confidence: "high" },
          subclass: { value: "虚空", confidence: "high" },
          exotic_armor: [],
          weapons: [],
          armor_stats: [],
          mods: [],
          aspects: [],
          fragments: [],
          notes: ["适合手雷循环"],
          needs_confirmation: []
        },
        matched_items: [
          { hash: 1, instance_id: "a", name: "反转手", bucket_name: "护臂", item_type: "异域护臂", status: "matched", reason: "命中异域要求" },
          { hash: 2, instance_id: "b", name: "漏斗网", bucket_name: "能量武器", item_type: "冲锋枪", status: "matched", reason: "命中武器要求" }
        ],
        missing_requirements: ["缺少 100 纪律护甲"],
        alternative_items: [],
        needs_confirmation: [],
        summary: "已满足 2 项，缺少 1 项"
      } satisfies BuildGuideMatchResult
    });

    expect(draft.name).toBe("虚空术士攻略");
    expect(draft.character_id).toBe("warlock-1");
    expect(draft.items.map((item) => item.name)).toEqual(["反转手", "漏斗网"]);
    expect(draft.missing_requirements).toContain("缺少 100 纪律护甲");
    expect(draft.notes).toContain("适合手雷循环");
  });
});
