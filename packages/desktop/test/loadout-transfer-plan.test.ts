import { describe, expect, it } from "vitest";
import type { AccountSummary, LoadoutTemplate } from "../src/renderer/api/types";
import {
  buildMissingLoadoutTransferPlan,
  describeMissingLoadoutBlockedReason
} from "../src/renderer/utils/loadoutTransfer";

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

const accountSummary: AccountSummary = {
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
      inventory_items: [
        {
          hash: 3,
          instance_id: "local-item",
          name: "Local Helmet",
          bucket_name: "Helmet",
          group_key: "armor",
          socket_plugs: []
        }
      ],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    },
    {
      character_id: "char-other",
      class_name: "Hunter",
      light: 2019,
      equipped_items: [
        {
          hash: 4,
          instance_id: "other-equipped-item",
          name: "Pinned Rocket",
          bucket_name: "Power Weapons",
          group_key: "weapons",
          socket_plugs: []
        }
      ],
      equipment_groups: [],
      inventory_items: [
        {
          hash: 2,
          instance_id: "other-inventory-item",
          name: "Alt Gun",
          bucket_name: "Energy Weapons",
          group_key: "weapons",
          socket_plugs: []
        }
      ],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    }
  ],
  vault: {
    item_count: 1,
    items: [
      {
        hash: 1,
        instance_id: "vault-item",
        name: "Vault Gun",
        bucket_name: "Kinetic Weapons",
        group_key: "weapons",
        socket_plugs: []
      }
    ],
    sample_items: []
  },
  materials: {
    item_count: 0,
    items: []
  }
};

describe("loadout transfer plan", () => {
  it("builds staged transfer batches for vault and other-character inventory items", () => {
    const plan = buildMissingLoadoutTransferPlan({
      template,
      missingItems: template.items,
      accountSummary
    });

    expect(plan.transferable_count).toBe(2);
    expect(plan.steps).toHaveLength(3);
    expect(plan.steps[0]).toMatchObject({
      phase: "to-vault",
      character_id: "char-other",
      transfer_to_vault: true
    });
    expect(plan.steps[0].items.map((item) => item.item_id)).toEqual(["other-inventory-item"]);
    expect(plan.steps[1]).toMatchObject({
      phase: "to-character",
      character_id: "char-target",
      transfer_to_vault: false
    });
    expect(plan.steps[1].items.map((item) => item.item_id)).toEqual(["vault-item", "other-inventory-item"]);
    expect(plan.steps[2]).toMatchObject({
      phase: "equip-target",
      character_id: "char-target"
    });
    expect(plan.steps[2].items.map((item) => item.item_id).sort()).toEqual([
      "local-item",
      "other-inventory-item",
      "vault-item"
    ]);
  });

  it("tracks skipped and blocked missing items separately", () => {
    const plan = buildMissingLoadoutTransferPlan({
      template,
      missingItems: template.items,
      accountSummary
    });

    expect(plan.already_on_character_count).toBe(1);
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
    expect(describeMissingLoadoutBlockedReason("postmaster")).toEqual({
      label: "还在邮政官",
      hint: "先把物品取回角色背包，再执行补齐。"
    });
  });

  it("recovers equipped items from another character when a same-slot replacement exists", () => {
    const plan = buildMissingLoadoutTransferPlan({
      template,
      missingItems: template.items,
      accountSummary: {
        ...accountSummary,
        characters: accountSummary.characters.map((character) => character.character_id === "char-other"
          ? {
            ...character,
            inventory_items: [
              ...character.inventory_items,
              {
                hash: 5,
                instance_id: "replacement-heavy",
                name: "Backup Rocket",
                bucket_name: "Power Weapons",
                group_key: "weapons",
                socket_plugs: []
              }
            ]
          }
          : character)
      }
    });

    expect(plan.already_on_character_count).toBe(1);
    expect(plan.blocked).toEqual([]);
    expect(plan.transferable_count).toBe(3);
    expect(plan.steps.map((step) => step.phase)).toEqual(["equip-swap", "to-vault", "to-character", "equip-target"]);
    expect(plan.steps[0]).toMatchObject({
      phase: "equip-swap",
      character_id: "char-other"
    });
    expect(plan.steps[0].items.map((item) => item.item_id)).toEqual(["replacement-heavy"]);
    expect(plan.steps[1]).toMatchObject({
      phase: "to-vault",
      character_id: "char-other",
      transfer_to_vault: true
    });
    expect(plan.steps[1].items.map((item) => item.item_id)).toEqual([
      "other-inventory-item",
      "other-equipped-item"
    ]);
    expect(plan.steps[2]).toMatchObject({
      phase: "to-character",
      character_id: "char-target",
      transfer_to_vault: false
    });
    expect(plan.steps[2].items.map((item) => item.item_id)).toEqual([
      "vault-item",
      "other-inventory-item",
      "other-equipped-item"
    ]);
    expect(plan.steps[3]).toMatchObject({
      phase: "equip-target",
      character_id: "char-target"
    });
    expect(plan.steps[3].items.map((item) => item.item_id).sort()).toEqual([
      "local-item",
      "other-equipped-item",
      "other-inventory-item",
      "vault-item"
    ]);
  });

  it("pulls missing items from another character postmaster before transferring them", () => {
    const postmasterTemplate: LoadoutTemplate = {
      ...template,
      items: [
        { hash: 6, instance_id: "postmaster-item", name: "Postmaster Gun", bucket_name: "Energy Weapons" }
      ]
    };

    const plan = buildMissingLoadoutTransferPlan({
      template: postmasterTemplate,
      missingItems: postmasterTemplate.items,
      accountSummary: {
        ...accountSummary,
        characters: accountSummary.characters.map((character) => character.character_id === "char-other"
          ? {
            ...character,
            postmaster_items: [
              {
                hash: 6,
                instance_id: "postmaster-item",
                name: "Postmaster Gun",
                bucket_name: "Energy Weapons",
                group_key: "weapons",
                socket_plugs: []
              }
            ]
          }
          : character)
      }
    });

    expect(plan.blocked).toEqual([]);
    expect(plan.steps.map((step) => step.phase)).toEqual(["pull-postmaster", "to-vault", "to-character", "equip-target"]);
    expect(plan.steps[0]).toMatchObject({
      phase: "pull-postmaster",
      character_id: "char-other"
    });
    expect(plan.steps[0].items.map((item) => item.item_id)).toEqual(["postmaster-item"]);
    expect(plan.steps[1].items.map((item) => item.item_id)).toEqual(["postmaster-item"]);
    expect(plan.steps[2].items.map((item) => item.item_id)).toEqual(["postmaster-item"]);
    expect(plan.steps[3].items.map((item) => item.item_id)).toEqual(["postmaster-item"]);
  });

  it("pulls current-character postmaster items back and equips them directly", () => {
    const postmasterTemplate: LoadoutTemplate = {
      ...template,
      items: [
        { hash: 7, instance_id: "target-postmaster-item", name: "Mail Helmet", bucket_name: "Helmet" }
      ]
    };

    const plan = buildMissingLoadoutTransferPlan({
      template: postmasterTemplate,
      missingItems: postmasterTemplate.items,
      accountSummary: {
        ...accountSummary,
        characters: accountSummary.characters.map((character) => character.character_id === "char-target"
          ? {
            ...character,
            postmaster_items: [
              {
                hash: 7,
                instance_id: "target-postmaster-item",
                name: "Mail Helmet",
                bucket_name: "Helmet",
                group_key: "armor",
                socket_plugs: []
              }
            ]
          }
          : character)
      }
    });

    expect(plan.blocked).toEqual([]);
    expect(plan.transferable_count).toBe(0);
    expect(plan.steps.map((step) => step.phase)).toEqual(["pull-postmaster", "equip-target"]);
    expect(plan.steps[0]).toMatchObject({
      phase: "pull-postmaster",
      character_id: "char-target"
    });
    expect(plan.steps[0].items.map((item) => item.item_id)).toEqual(["target-postmaster-item"]);
    expect(plan.steps[1]).toMatchObject({
      phase: "equip-target",
      character_id: "char-target"
    });
    expect(plan.steps[1].items.map((item) => item.item_id)).toEqual(["target-postmaster-item"]);
  });
});
