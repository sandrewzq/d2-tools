import { describe, expect, it } from "vitest";
import {
  armorSlots,
  createArmor30Ruleset,
  planOwnedArmor,
  type ArmorPieceSnapshot,
  type ArmorSlot
} from "../src/armor/index.js";

describe("owned armor planner candidate pruning", () => {
  it("drops dominated options for minimum-only targets without losing a complete build", () => {
    const result = planOwnedArmor({
      ruleset: createArmor30Ruleset(),
      class: "titan",
      pieces: armorSlots.flatMap((slot) => [piece(slot, "low", 10), piece(slot, "high", 20)]),
      target: { health: { minimum: 100 } },
      allowed_armor_mod_values: [0],
      mode: "strict"
    });

    expect(result.status).toBe("reachable");
    expect(result.search.truncated).toBe(false);
    expect(Object.values(result.search.piece_option_counts)).toEqual([1, 1, 1, 1, 1]);
    expect(result.candidates[0]?.pieces.map((choice) => choice.instance_id)).toEqual(
      armorSlots.map((slot) => `${slot}-high`)
    );
  });

  it("keeps lower-stat choices when an explicit maximum can make higher stats overflow", () => {
    const result = planOwnedArmor({
      ruleset: createArmor30Ruleset(),
      class: "titan",
      pieces: armorSlots.flatMap((slot) => [piece(slot, "low", 10), piece(slot, "high", 20)]),
      target: { health: { exact: 50 } },
      allowed_armor_mod_values: [0],
      mode: "strict"
    });

    expect(result.status).toBe("reachable");
    expect(Object.values(result.search.piece_option_counts)).toEqual([2, 2, 2, 2, 2]);
    expect(result.candidates[0]?.pieces.map((choice) => choice.instance_id)).toEqual(
      armorSlots.map((slot) => `${slot}-low`)
    );
  });
});

function piece(slot: ArmorSlot, variant: string, health: number): ArmorPieceSnapshot {
  return {
    item_hash: health,
    instance_id: `${slot}-${variant}`,
    name: `${slot}-${variant}`,
    class: "titan",
    slot,
    location: "inventory",
    exotic: false,
    exotic_class_item: false,
    stats: { final: { health, melee: 0, grenade: 0, super: 0, class: 0, weapon: 0 } },
    modifiers: [],
    installation: {
      energy_capacity: 10,
      reserved_energy: 0,
      stat_mod_socket_indexes: [0],
      tuning_socket_indexes: [],
      armor_stat_mod_options: [],
      armor_stat_mod_clear_options: [{ plug_hash: 1, plug_name: "empty", socket_index: 0, energy_cost: 0 }],
      tuning_options: [],
      available_non_stat_plugs: [],
      planned_non_stat_plugs: [],
      complete: true
    },
    quality: {
      status: "complete",
      owned_ready: true,
      strict_replay_ready: true,
      acquisition_identity_ready: false,
      checks: {
        has_instance_id: true,
        has_slot: true,
        has_final_stats: true,
        has_base_stats: true,
        modifiers_reconciled: true,
        has_archetype_identity: false,
        has_tuning_identity: false,
        has_energy_capacity: true,
        has_stat_mod_socket: true
      },
      warnings: []
    }
  };
}
