import { describe, expect, it } from "vitest";
import type { AccountItemSummary, AccountSummary } from "@d2-tools/core/account/summary";
import type { LoadoutTemplate } from "@d2-tools/core/loadouts/templates";
import {
  buildMissingLoadoutTransferPlan,
  describeMissingLoadoutBlockedReason
} from "../src/workspaces/loadoutTransfer";

describe("loadout transfer workspace", () => {
  it("builds staged transfer batches for missing loadout items", () => {
    const template: LoadoutTemplate = {
      id: "loadout-1",
      name: "Nightfall",
      character_id: "char-target",
      class_name: "Titan",
      created_at: "2026-06-20T00:00:00.000Z",
      items: [
        { hash: 1, instance_id: "vault-item", name: "Vault Gun", bucket_name: "Kinetic Weapons" },
        { hash: 2, instance_id: "other-inventory-item", name: "Alt Gun", bucket_name: "Energy Weapons" },
        { hash: 3, instance_id: "local-item", name: "Local Helmet", bucket_name: "Helmet" },
        { hash: 4, instance_id: "other-equipped-item", name: "Pinned Rocket", bucket_name: "Power Weapons" }
      ]
    };

    const plan = buildMissingLoadoutTransferPlan({
      template,
      missingItems: template.items,
      accountSummary: accountSummary()
    });

    expect(plan.transferable_count).toBe(2);
    expect(plan.already_on_character_count).toBe(1);
    expect(plan.steps.map((step) => step.phase)).toEqual(["to-vault", "to-character", "equip-target"]);
    expect(plan.steps[0]).toMatchObject({
      phase: "to-vault",
      character_id: "char-other",
      transfer_to_vault: true
    });
    expect(plan.steps[0].items.map((item) => item.item_id)).toEqual(["other-inventory-item"]);
    expect(plan.steps[1].items.map((item) => item.item_id)).toEqual([
      "vault-item",
      "other-inventory-item"
    ]);
    expect(plan.steps[2].items.map((item) => item.item_id).sort()).toEqual([
      "local-item",
      "other-inventory-item",
      "vault-item"
    ]);
    expect(plan.blocked).toEqual([
      expect.objectContaining({
        item: expect.objectContaining({ instance_id: "other-equipped-item" }),
        reason: "other-character-equipped"
      })
    ]);
  });

  it("maps blocked reasons into player-facing guidance", () => {
    expect(describeMissingLoadoutBlockedReason("other-character-equipped")).toEqual({
      label: "其他角色已装备",
      hint: "先去对应角色卸下这件装备，再回来补齐。"
    });
    expect(describeMissingLoadoutBlockedReason("missing-instance-id")).toEqual({
      label: "缺少实例数据",
      hint: "这件物品当前无法精确定位，刷新账号数据后再试。"
    });
  });
});

function accountSummary(): AccountSummary {
  return {
    account_name: "tester",
    destiny_membership_id: "destiny-1",
    membership_type: 3,
    characters: [
      {
        character_id: "char-target",
        class_name: "Titan",
        light: 2020,
        equipped_items: [],
        equipment_groups: [],
        inventory_items: [item("local-item", 3, "Local Helmet", "Helmet", "armor")],
        inventory_groups: [],
        postmaster_items: [],
        loadout_slots: []
      },
      {
        character_id: "char-other",
        class_name: "Hunter",
        light: 2019,
        equipped_items: [item("other-equipped-item", 4, "Pinned Rocket", "Power Weapons", "weapons")],
        equipment_groups: [],
        inventory_items: [item("other-inventory-item", 2, "Alt Gun", "Energy Weapons", "weapons")],
        inventory_groups: [],
        postmaster_items: [],
        loadout_slots: []
      }
    ],
    vault: {
      item_count: 1,
      items: [item("vault-item", 1, "Vault Gun", "Kinetic Weapons", "weapons")],
      sample_items: []
    },
    materials: {
      item_count: 0,
      items: []
    }
  };
}

function item(
  instanceId: string,
  hash: number,
  name: string,
  bucketName: string,
  groupKey: AccountItemSummary["group_key"]
): AccountItemSummary {
  return {
    hash,
    instance_id: instanceId,
    name,
    bucket_name: bucketName,
    group_key: groupKey,
    socket_plugs: []
  };
}
