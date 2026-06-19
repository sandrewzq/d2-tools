import { describe, expect, it } from "vitest";
import { compareLoadoutTemplate, createLoadoutTemplateTransferPlan } from "../src/loadouts/plan.js";
import type { LoadoutTemplate } from "../src/loadouts/templates.js";

const template: LoadoutTemplate = {
  id: "loadout-1",
  name: "术士日落",
  character_id: "char-1",
  class_name: "术士",
  created_at: "2026-06-19T00:00:00.000Z",
  items: [
    { hash: 1, instance_id: "item-1", name: "风险管理者", bucket_name: "能量武器" },
    { hash: 2, instance_id: "item-2", name: "加拉尔号角", bucket_name: "威能武器" }
  ]
};

describe("loadout template planning", () => {
  it("compares a template against currently equipped items", () => {
    const comparison = compareLoadoutTemplate(template, [
      { hash: 1, instance_id: "item-1", name: "风险管理者", group_key: "weapons", socket_plugs: [] }
    ]);

    expect(comparison.equipped.map((item) => item.name)).toEqual(["风险管理者"]);
    expect(comparison.missing.map((item) => item.name)).toEqual(["加拉尔号角"]);
  });

  it("creates transfer plans for template items found outside the current character", () => {
    const plan = createLoadoutTemplateTransferPlan({
      template,
      target_character_id: "char-1",
      available_items: [
        { hash: 2, instance_id: "item-2", name: "加拉尔号角", group_key: "weapons", socket_plugs: [] }
      ],
      equipped_items: []
    });

    expect(plan.summary).toBe("计划为模板「术士日落」转移 1 件装备到角色。");
    expect(plan.steps[0].title).toBe("转移 加拉尔号角");
  });
});
