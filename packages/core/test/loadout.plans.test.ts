import { describe, expect, it } from "vitest";
import type { AccountSummary } from "../src/account/summary.js";
import { matchLocalLoadoutPlan } from "../src/loadouts/plans.js";
import {
  createLocalLoadoutPlanExecutionPlan,
  createLocalLoadoutPlanPublishPlan,
  validateLocalLoadoutPlanPublishPlan,
  verifyLocalLoadoutPlanPublishPlan
} from "../src/loadouts/localPlanExecution.js";

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

  it("binds a local plan publish to the applied instances and unchanged Bungie slot", () => {
    const account = accountSummary();
    account.characters[0]!.loadout_slots = [{
      index: 0,
      name: "槽位一",
      item_count: 1,
      items: [{ instance_id: "old", item_hash: 999, name: "旧装备" }]
    }];
    const executionPlan = createLocalLoadoutPlanExecutionPlan({
      plan: {
        class_name: "Titan",
        item_targets: [{ slot: "Kinetic Weapons", item_hash: 100, selected_instance_id: "one", plug_hashes: [] }]
      },
      account,
      target_character_id: "character"
    });
    const publishPlan = createLocalLoadoutPlanPublishPlan({ executionPlan, account, loadoutIndex: 0 });

    expect(publishPlan.selected_item_instance_ids).toEqual(["one"]);
    expect(validateLocalLoadoutPlanPublishPlan(publishPlan, account)).toEqual({ status: "valid", reasons: [] });

    const changedSlotAccount = structuredClone(account);
    changedSlotAccount.characters[0]!.loadout_slots[0]!.name = "已被修改";
    expect(validateLocalLoadoutPlanPublishPlan(publishPlan, changedSlotAccount)).toEqual({
      status: "stale",
      reasons: ["目标 Bungie 配装槽位内容已变化"]
    });

    const publishedAccount = structuredClone(account);
    publishedAccount.characters[0]!.loadout_slots[0] = {
      index: 0,
      name: "槽位一",
      item_count: 1,
      items: [{ instance_id: "one", item_hash: 100, name: "one" }]
    };
    expect(verifyLocalLoadoutPlanPublishPlan(publishPlan, publishedAccount)).toEqual({
      status: "verified",
      reasons: []
    });
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
