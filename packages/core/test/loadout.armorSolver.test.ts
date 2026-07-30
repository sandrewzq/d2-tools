import { describe, expect, it } from "vitest";
import type { AccountItemSummary, AccountSummary } from "../src/account/summary.js";
import { solveLoadoutArmorCandidates } from "../src/loadouts/armorSolver.js";

describe("loadout armor solver", () => {
  it("uses only real armor instances and reports the applied stat mods", () => {
    const result = solveLoadoutArmorCandidates({
      account: accountSummary(),
      target_character_id: "target",
      constraints: {
        stat_minimums: { health: 60 },
        priority_stats: ["health"],
        fragment_stat_bonuses: {},
        five_point_mod_budget: 0,
        ten_point_mod_budget: 1,
        locked_instance_ids: ["helmet"],
        excluded_instance_ids: [],
        allowed_locations: ["equipped", "inventory", "vault"]
      }
    });

    expect(result.unavailable_reasons).toEqual([]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      final_stats: { health: 60 },
      transfer_count: 1,
      equipped_count: 4,
      stat_mods: [{ stat: "health", value: 10, count: 1 }]
    });
    expect(result.candidates[0]?.items.map((item) => item.instance_id)).toEqual([
      "helmet", "arms", "chest", "legs", "class"
    ]);
  });
});

function accountSummary(): AccountSummary {
  return {
    account_name: "tester",
    destiny_membership_id: "membership",
    membership_type: 3,
    characters: [{
      character_id: "target",
      class_name: "Titan",
      equipped_items: [armor("helmet", "头盔"), armor("arms", "臂铠"), armor("chest", "胸甲"), armor("legs", "腿甲")],
      equipment_groups: [],
      inventory_items: [],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    }],
    vault: { item_count: 1, items: [armor("class", "职业物品")], sample_items: [] },
    materials: { item_count: 0, items: [] }
  };
}

function armor(instance_id: string, bucket_name: string): AccountItemSummary {
  return {
    hash: instance_id.length,
    instance_id,
    name: instance_id,
    bucket_name,
    group_key: "armor",
    socket_plugs: [],
    armor_stats: { health: 10, melee: 0, grenade: 0, super: 0, class: 0, weapon: 0, total: 10 }
  };
}
