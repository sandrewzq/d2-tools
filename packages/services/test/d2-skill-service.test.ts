import { describe, expect, it } from "vitest";
import { createMemoryServices } from "../src/memoryAdapter.js";

describe("guide context service", () => {
  it("exposes account items for deterministic guide matching", async () => {
    const services = createMemoryServices({
      account: {
        account_name: "tester",
        destiny_membership_id: "123",
        membership_type: 1,
        characters: [
          {
            character_id: "char-1",
            class_name: "术士",
            equipped_items: [{ hash: 1, instance_id: "a", name: "反转手", group_key: "armor", socket_plugs: [] }],
            equipment_groups: [],
            inventory_items: [{ hash: 2, instance_id: "b", name: "漏斗网", group_key: "weapons", socket_plugs: [] }],
            inventory_groups: [],
            postmaster_items: [],
            loadout_slots: []
          }
        ],
        vault: {
          item_count: 1,
          items: [{ hash: 3, instance_id: "c", name: "纪律护甲", group_key: "armor", socket_plugs: [] }],
          sample_items: []
        },
        materials: { item_count: 0, items: [] }
      }
    });

    const context = await services.guide.getContext();

    expect(context.account.account_name).toBe("tester");
    expect(context.items.map((item) => item.name)).toEqual(["纪律护甲", "反转手", "漏斗网"]);
  });
});
