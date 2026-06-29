import { describe, expect, it } from "vitest";
import type { AccountItemSummary } from "../src/account/summary.js";
import type { BuildGuideRequirement } from "../src/assistant/guideSchema.js";
import { matchBuildGuideToAccount } from "../src/assistant/guideMatching.js";

describe("guide matching", () => {
  it("matches exact exotic and weapon perk requirements from account items", () => {
    const requirement: BuildGuideRequirement = guide({
      raw_text: "虚空术士 反转手 漏斗网 斥力支架 纪律 100",
      exotic_armor: [{ name: "反转手", confidence: "high" }],
      weapons: [{ name: "漏斗网", confidence: "high", requirement: "specific", perk_names: ["斥力支架"] }],
      armor_stats: [{ stat: "discipline", minimum: 100, confidence: "high" }]
    });

    const result = matchBuildGuideToAccount({
      requirement,
      targetCharacterId: "warlock-1",
      items: [
        item({ hash: 1, instance_id: "a", name: "反转手", item_type: "异域护臂", group_key: "armor" }),
        item({
          hash: 2,
          instance_id: "b",
          name: "漏斗网",
          item_type: "冲锋枪",
          group_key: "weapons",
          socket_plugs: [{ hash: 21, name: "斥力支架" }]
        }),
        item({
          hash: 3,
          instance_id: "c",
          name: "纪律护甲",
          item_type: "护胸",
          group_key: "armor",
          armor_stats: { health: 20, melee: 20, grenade: 103, super: 20, class: 20, weapon: 20, total: 203 }
        })
      ]
    });

    expect(result.matched_items.map((entry) => entry.name)).toEqual(["反转手", "漏斗网", "纪律护甲"]);
    expect(result.missing_requirements).toEqual([]);
    expect(result.summary).toContain("已满足 3 项");
  });

  it("keeps uncertain element weapon requirements as confirmation instead of facts", () => {
    const requirement: BuildGuideRequirement = guide({
      raw_text: "需要虚空武器",
      weapons: [{ name: "虚空武器", confidence: "medium", requirement: "element" }],
      needs_confirmation: ["虚空武器没有指定具体装备"]
    });

    const result = matchBuildGuideToAccount({
      requirement,
      targetCharacterId: "hunter-1",
      items: [item({ hash: 4, instance_id: "d", name: "漏斗网", item_type: "虚空冲锋枪", group_key: "weapons" })]
    });

    expect(result.needs_confirmation).toContain("虚空武器没有指定具体装备");
    expect(result.alternative_items.map((entry) => entry.name)).toContain("漏斗网");
    expect(result.missing_requirements).toEqual([]);
  });
});

function guide(patch: Partial<BuildGuideRequirement>): BuildGuideRequirement {
  return {
    raw_text: "",
    exotic_armor: [],
    weapons: [],
    armor_stats: [],
    mods: [],
    aspects: [],
    fragments: [],
    notes: [],
    needs_confirmation: [],
    ...patch
  };
}

function item(patch: Partial<AccountItemSummary> & Pick<AccountItemSummary, "hash" | "name" | "group_key">): AccountItemSummary {
  return {
    socket_plugs: [],
    ...patch
  };
}
