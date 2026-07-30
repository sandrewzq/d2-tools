import { describe, expect, it } from "vitest";
import type { AccountSummary } from "../src/account/summary.js";
import { matchLocalLoadoutPlan } from "../src/loadouts/plans.js";

describe("local loadout plans", () => {
  it("derives item availability from the current account without persisting a match", () => {
    const match = matchLocalLoadoutPlan({
      item_targets: [
        { slot: "Kinetic Weapons", item_hash: 100, plug_hashes: [10] },
        { slot: "Energy Weapons", item_hash: 200, selected_instance_id: "missing", plug_hashes: [] },
        { slot: "Power Weapons", item_hash: 300, plug_hashes: [30] }
      ]
    }, accountSummary());

    expect(match.item_matches.map((item) => item.status)).toEqual([
      "needs-selection",
      "missing",
      "plug-unavailable"
    ]);
    expect(match.needs_selection_count).toBe(1);
    expect(match.missing_count).toBe(1);
    expect(match.plug_unavailable_count).toBe(1);
  });
});

function accountSummary(): AccountSummary {
  const item = (instance_id: string, hash: number, plugHashes: number[]) => ({
    hash,
    instance_id,
    name: instance_id,
    group_key: "weapons" as const,
    socket_plugs: plugHashes.map((hash) => ({ hash, name: String(hash) }))
  });
  return {
    account_name: "tester",
    destiny_membership_id: "membership",
    membership_type: 3,
    characters: [{
      character_id: "character",
      class_name: "Titan",
      equipped_items: [item("one", 100, [10])],
      equipment_groups: [],
      inventory_items: [item("two", 100, [10]), item("three", 300, [31])],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    }],
    vault: { item_count: 0, items: [], sample_items: [] },
    materials: { item_count: 0, items: [] }
  };
}
