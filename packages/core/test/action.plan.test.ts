import { describe, expect, it } from "vitest";
import { createBatchTransferPlan, createItemActionPlan } from "../src/actions/plan.js";

describe("action plans", () => {
  it("creates a non-executing single item plan", () => {
    expect(createItemActionPlan({
      action: "transfer",
      item_name: "Riskrunner",
      item_instance_id: "item-1",
      item_reference_hash: 1,
      character_id: "char-1",
      transfer_to_vault: true
    })).toMatchObject({
      action: "transfer",
      title: "转移 Riskrunner",
      requires_confirmation: true,
      executable: false
    });
  });

  it("creates batch transfer plan steps", () => {
    const plan = createBatchTransferPlan({
      character_id: "char-1",
      transfer_to_vault: false,
      items: [
        { hash: 1, instance_id: "item-1", name: "Riskrunner", group_key: "weapons", socket_plugs: [] },
        { hash: 2, instance_id: "item-2", name: "Gjallarhorn", group_key: "weapons", socket_plugs: [] }
      ]
    });

    expect(plan.steps).toHaveLength(2);
    expect(plan.summary).toBe("计划取出 2 件装备到角色。");
  });
});
