import { describe, expect, it } from "vitest";
import { createHighestPowerEquipPlan } from "../src/renderer/utils/highestPower";
import type { AccountItemSummary, CharacterSummary } from "../src/renderer/api/client";

describe("highest power equip plan", () => {
  it("selects the highest power item per power slot from equipped, inventory, and vault", () => {
    const character: CharacterSummary = {
      character_id: "char-1",
      class_name: "术士",
      light: 1800,
      equipped_items: [
        item("equipped-kinetic", "Old Kinetic", "动能武器", 1800),
        item("equipped-helmet", "Old Helmet", "头盔", 1801)
      ],
      equipment_groups: [],
      inventory_items: [
        item("inventory-kinetic", "Better Kinetic", "动能武器", 1810),
        item("inventory-energy", "Best Energy", "能量武器", 1805)
      ],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    };
    const vaultItems = [
      item("vault-helmet", "Best Helmet", "头盔", 1812),
      item("vault-ship", "Pretty Ship", "飞船", 1900),
      item("vault-missing-power", "No Power", "威能武器", undefined)
    ];

    const plan = createHighestPowerEquipPlan({ character, vaultItems });

    expect(plan.items.map((entry) => [entry.slot_label, entry.item.name, entry.source])).toEqual([
      ["动能武器", "Better Kinetic", "inventory"],
      ["能量武器", "Best Energy", "inventory"],
      ["头盔", "Best Helmet", "vault"]
    ]);
    expect(plan.items.filter((entry) => entry.needs_transfer).map((entry) => entry.item.name)).toEqual(["Best Helmet"]);
    expect(plan.items.filter((entry) => entry.needs_equip).map((entry) => entry.item.name)).toEqual([
      "Better Kinetic",
      "Best Energy",
      "Best Helmet"
    ]);
    expect(plan.summary).toContain("准备装备 3 件最高光等装备");
    expect(plan.summary).not.toContain("Pretty Ship");
  });

  it("does not ask to equip an already equipped highest power item", () => {
    const character: CharacterSummary = {
      character_id: "char-1",
      class_name: "术士",
      equipped_items: [item("equipped-kinetic", "Best Kinetic", "动能武器", 1810)],
      equipment_groups: [],
      inventory_items: [item("inventory-kinetic", "Lower Kinetic", "动能武器", 1800)],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    };

    const plan = createHighestPowerEquipPlan({ character, vaultItems: [] });

    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]).toMatchObject({
      already_equipped: true,
      needs_transfer: false,
      needs_equip: false
    });
    expect(plan.executable_items).toEqual([]);
  });
});

function item(
  instanceId: string,
  name: string,
  bucketName: string,
  power: number | undefined
): AccountItemSummary {
  return {
    hash: instanceId.length,
    instance_id: instanceId,
    name,
    bucket_name: bucketName,
    group_key: bucketName.includes("武器") ? "weapons" : bucketName === "飞船" ? "equipment" : "armor",
    power
  };
}
