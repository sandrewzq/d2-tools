import { describe, expect, it } from "vitest";
import type { AccountSummary } from "../src/account/summary.js";
import { createLocalLoadoutPlanFromEquippedItems, matchLocalLoadoutPlan } from "../src/loadouts/plans.js";
import { createDimLoadoutExport, createDimLoadoutImportPreview, parseDimLoadoutLink } from "../src/loadouts/dimImport.js";
import {
  createLocalLoadoutPlanExecutionPlan,
  createLocalLoadoutPlanPublishPlan,
  validateLocalLoadoutPlanExecutionPlan,
  validateLocalLoadoutPlanPublishPlan,
  verifyLocalLoadoutPlanPublishPlan
} from "../src/loadouts/localPlanExecution.js";

describe("local loadout plans", () => {
  it("keeps subclass socket positions and stat goals in a DIM roundtrip", () => {
    const account = accountSummary();
    account.characters[0]!.equipped_items[0] = {
      ...account.characters[0]!.equipped_items[0]!,
      bucket_hash: 1498876634,
      sockets: [{
        socket_index: 0,
        is_visible: true,
        is_enabled: true,
        enable_fail_indexes: [],
        selected_plug: { hash: 10, name: "weapon perk" },
        reusable_plugs: []
      }]
    };
    account.characters[0]!.equipped_items.push({
      hash: 400,
      name: "subclass",
      bucket_hash: 3284755031,
      group_key: "equipment",
      socket_plugs: [{ hash: 51, name: "aspect" }],
      sockets: [{
        socket_index: 7,
        is_visible: true,
        is_enabled: true,
        enable_fail_indexes: [],
        selected_plug: { hash: 51, name: "aspect" },
        reusable_plugs: []
      }]
    });
    const draft = createLocalLoadoutPlanFromEquippedItems({
      name: "DIM roundtrip",
      class_name: "Titan",
      equipped_items: account.characters[0]!.equipped_items
    });
    expect(draft.subclass_target?.socket_overrides).toEqual({ "7": 51 });
    const exported = createDimLoadoutExport({
      plan: {
        ...draft,
        armor_constraints: {
          stat_minimums: { grenade: 200, weapon: 100 },
          priority_stats: ["grenade", "weapon"],
          fragment_stat_bonuses: {},
          five_point_mod_budget: 0,
          ten_point_mod_budget: 0,
          locked_instance_ids: [],
          excluded_instance_ids: [],
          allowed_locations: ["equipped", "inventory", "vault", "postmaster"]
        }
      },
      account
    });
    expect(exported.status).toBe("ready");
    if (exported.status !== "ready") return;
    const parsed = parseDimLoadoutLink(exported.url);
    const preview = createDimLoadoutImportPreview({ source_url: parsed.source_url, payload: parsed.inline_loadout });
    expect(preview.draft.subclass_target?.socket_overrides).toEqual({ "7": 51 });
    expect(preview.draft.armor_constraints?.stat_minimums).toEqual({ grenade: 200, weapon: 100 });
  });

  it("exports each planned armor stat mod and tuning plug to DIM", () => {
    const account = accountSummary();
    const statModHash = 1435557120;
    const tuningHash = 1672416975;
    const otherArmorModHash = 1130820873;
    const armorItems = Array.from({ length: 5 }, (_, index) => ({
      hash: 1000 + index,
      instance_id: `armor-${index}`,
      name: `armor-${index}`,
      group_key: "armor" as const,
      socket_plugs: [],
      sockets: [
        { socket_index: 0, is_visible: true, is_enabled: true, enable_fail_indexes: [],
          selected_plug: { hash: statModHash, name: "grenade +10" }, reusable_plugs: [] },
        { socket_index: 11, is_visible: true, is_enabled: true, enable_fail_indexes: [],
          selected_plug: { hash: tuningHash, name: "tuning" }, reusable_plugs: [] },
        { socket_index: 1, is_visible: true, is_enabled: true, enable_fail_indexes: [],
          selected_plug: { hash: otherArmorModHash, name: "armor mod", category_identifier: "enhancements.v2_head" }, reusable_plugs: [] }
      ]
    }));
    account.vault.items.push(...armorItems);
    const exported = createDimLoadoutExport({
      plan: {
        name: "五件护甲",
        class_name: "术士",
        item_targets: armorItems.map((item) => ({
          slot: "护甲",
          item_hash: item.hash,
          selected_instance_id: item.instance_id,
          plug_hashes: [statModHash, tuningHash, otherArmorModHash]
        })),
        armor_plan: {
          result_id: "result",
          candidate_id: "candidate",
          mode: "owned",
          ruleset_id: "armor-3.0",
          ruleset_version: 1,
          source_revisions: { ruleset: "armor-3.0:1" },
          selected_instance_ids: armorItems.map((item) => item.instance_id),
          planned_armor_plugs: armorItems.map((item) => ({
            instance_id: item.instance_id,
            tuning_plug_hash: tuningHash,
            armor_stat_mod_plug_hash: statModHash,
            armor_stat_mod_stat: "grenade" as const,
            armor_stat_mod_value: 10 as const,
            energy_capacity: 11,
            reserved_energy: 0,
            final_energy: 3
          }))
        },
        armor_constraints: {
          stat_minimums: { grenade: 200, weapon: 100 },
          priority_stats: ["grenade", "weapon"],
          fragment_stat_bonuses: {},
          five_point_mod_budget: 0,
          ten_point_mod_budget: 5,
          locked_instance_ids: [],
          excluded_instance_ids: [],
          allowed_locations: ["equipped", "inventory", "vault", "postmaster"]
        }
      },
      account
    });
    expect(exported.status).toBe("ready");
    if (exported.status !== "ready") return;
    const payload = parseDimLoadoutLink(exported.url).inline_loadout as {
      equipped: Array<{ socketOverrides: Record<string, number> }>;
      parameters: { mods: number[]; statConstraints: Array<{ statHash: number; minStat: number }> };
    };
    expect(payload.parameters.mods.filter((hash) => hash === statModHash)).toHaveLength(5);
    expect(payload.parameters.mods.filter((hash) => hash === tuningHash)).toHaveLength(5);
    expect(payload.parameters.mods.filter((hash) => hash === otherArmorModHash)).toHaveLength(5);
    expect(payload.equipped.every((item) => item.socketOverrides["0"] === statModHash
      && item.socketOverrides["11"] === tuningHash)).toBe(true);
    expect(payload.parameters.statConstraints.map((constraint) => constraint.minStat)).toEqual([200, 100]);
    const preview = createDimLoadoutImportPreview({ source_url: exported.url, payload });
    expect(preview.draft.subclass_target).toBeUndefined();
  });

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

  it("blocks every wear step when the target character's subclass configuration differs", () => {
    const account = accountSummary();
    account.characters[0]!.equipped_items.push({
      hash: 400,
      name: "subclass",
      bucket_hash: 3284755031,
      group_key: "equipment",
      socket_plugs: [
        { hash: 52, name: "fragment", socket_index: 2 },
        { hash: 51, name: "aspect", socket_index: 1 }
      ]
    });
    const plan = {
      class_name: "Titan",
      item_targets: [{ slot: "Kinetic Weapons", item_hash: 100, selected_instance_id: "two", plug_hashes: [] }],
      subclass_target: {
        subclass_hash: 400,
        socket_overrides: { "1": 51, "2": 52 },
        ability_hashes: [],
        aspect_hashes: [51],
        fragment_hashes: [52],
        mod_hashes: []
      }
    };
    const matching = createLocalLoadoutPlanExecutionPlan({ plan, account, target_character_id: "character" });
    expect(matching.gaps).toEqual([]);
    expect(matching.executable_steps.some((step) => step.kind === "equip")).toBe(true);

    const changed = structuredClone(account);
    changed.characters[0]!.equipped_items[1]!.socket_plugs[1]!.hash = 53;
    const blocked = createLocalLoadoutPlanExecutionPlan({ plan, account: changed, target_character_id: "character" });
    expect(blocked.executable_steps).toEqual([]);
    expect(blocked.gaps).toContain("目标角色当前子职业配置与方案不同，请先在游戏中切换星相、碎片或技能。");
    expect(validateLocalLoadoutPlanExecutionPlan(matching, blocked).status).toBe("stale");

    changed.characters[0]!.equipped_items[1]!.socket_plugs = [];
    const unread = createLocalLoadoutPlanExecutionPlan({ plan, account: changed, target_character_id: "character" });
    expect(unread.executable_steps).toEqual([]);
    expect(unread.gaps).toContain("目标角色当前子职业配置未返回，请刷新账号后再穿戴。");
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
