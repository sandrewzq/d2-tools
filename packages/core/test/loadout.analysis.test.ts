import { describe, expect, it } from "vitest";
import { analyzeLoadoutTemplate, suggestArmorStatSets } from "../src/loadouts/analysis.js";
import type { AccountItemSummary } from "../src/account/summary.js";
import type { LoadoutTemplate } from "../src/loadouts/templates.js";

const template: LoadoutTemplate = {
  id: "loadout-1",
  name: "PVE",
  character_id: "char-1",
  class_name: "术士",
  created_at: "2026-06-20T00:00:00.000Z",
  items: [
    { hash: 1, instance_id: "weapon-1", name: "Riskrunner", bucket_name: "能量武器" },
    { hash: 2, instance_id: "helm-1", name: "Helmet", bucket_name: "头盔" }
  ]
};

const available: AccountItemSummary[] = [
  {
    hash: 1,
    instance_id: "weapon-1",
    name: "Riskrunner",
    group_key: "weapons",
    bucket_name: "能量武器",
    power: 2000,
    socket_plugs: []
  }
];

describe("loadout analysis", () => {
  it("reports equipped, missing, and power warnings for a saved loadout", () => {
    const result = analyzeLoadoutTemplate(template, available);

    expect(result.equipped.map((item) => item.name)).toEqual(["Riskrunner"]);
    expect(result.missing.map((item) => item.name)).toEqual(["Helmet"]);
    expect(result.warnings).toContain("缺失 1 件模板装备，应用前需要先找回或替换。");
  });

  it("suggests simple armor stat combinations from confirmed stat values", () => {
    const suggestions = suggestArmorStatSets([
      { item_key: "helm", name: "Helmet", bucket_name: "头盔", stats: { mobility: 2, resilience: 20, recovery: 10, discipline: 12, intellect: 4, strength: 8 } },
      { item_key: "arms", name: "Arms", bucket_name: "臂铠", stats: { mobility: 4, resilience: 18, recovery: 12, discipline: 10, intellect: 8, strength: 6 } },
      { item_key: "chest", name: "Chest", bucket_name: "胸甲", stats: { mobility: 6, resilience: 22, recovery: 8, discipline: 8, intellect: 6, strength: 10 } },
      { item_key: "legs", name: "Legs", bucket_name: "腿甲", stats: { mobility: 8, resilience: 16, recovery: 14, discipline: 6, intellect: 10, strength: 4 } },
      { item_key: "class", name: "Bond", bucket_name: "职业物品", stats: { mobility: 0, resilience: 0, recovery: 0, discipline: 0, intellect: 0, strength: 0 } }
    ], { preferred_stats: ["resilience", "recovery"], limit: 1 });

    expect(suggestions[0].total_stats.resilience).toBe(76);
    expect(suggestions[0].score).toBe(120);
    expect(suggestions[0].items.map((item) => item.bucket_name)).toEqual(["头盔", "臂铠", "胸甲", "腿甲", "职业物品"]);
  });
});
