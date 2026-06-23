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
      { item_key: "helm", name: "Helmet", bucket_name: "头盔", stats: { health: 20, melee: 8, grenade: 12, super: 4, class: 10, weapon: 2 } },
      { item_key: "arms", name: "Arms", bucket_name: "臂铠", stats: { health: 18, melee: 6, grenade: 10, super: 8, class: 12, weapon: 4 } },
      { item_key: "chest", name: "Chest", bucket_name: "胸甲", stats: { health: 22, melee: 10, grenade: 8, super: 6, class: 8, weapon: 6 } },
      { item_key: "legs", name: "Legs", bucket_name: "腿甲", stats: { health: 16, melee: 4, grenade: 6, super: 10, class: 14, weapon: 8 } },
      { item_key: "class", name: "Bond", bucket_name: "职业物品", stats: { health: 0, melee: 0, grenade: 0, super: 0, class: 0, weapon: 0 } }
    ], { preferred_stats: ["health", "class"], limit: 1 });

    expect(suggestions[0].total_stats.health).toBe(76);
    expect(suggestions[0].score).toBe(120);
    expect(suggestions[0].items.map((item) => item.bucket_name)).toEqual(["头盔", "臂铠", "胸甲", "腿甲", "职业物品"]);
  });
});
