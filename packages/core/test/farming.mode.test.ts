import { describe, expect, it } from "vitest";
import { createFarmingModePlan } from "../src/actions/farmingMode.js";
import type { AccountItemSummary } from "../src/account/summary.js";

function item(index: number): AccountItemSummary {
  return {
    hash: index,
    instance_id: `item-${index}`,
    name: `Item ${index}`,
    group_key: index % 2 ? "weapons" : "armor",
    bucket_name: index % 2 ? "能量武器" : "头盔",
    power: 1900 + index,
    socket_plugs: []
  };
}

describe("farming mode", () => {
  it("keeps requested free backpack slots by moving lowest priority items to vault", () => {
    const plan = createFarmingModePlan({
      character_id: "char-1",
      inventory_items: Array.from({ length: 10 }, (_, index) => item(index + 1)),
      max_inventory_slots: 10,
      keep_free_slots: 3
    });

    expect(plan.summary).toBe("需要移入仓库 3 件，保留 3 个背包空位。");
    expect(plan.transfer_items.map((entry) => entry.name)).toEqual(["Item 1", "Item 2", "Item 3"]);
    expect(plan.steps).toHaveLength(3);
  });
});
