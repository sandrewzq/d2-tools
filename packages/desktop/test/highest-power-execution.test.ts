import { describe, expect, it } from "vitest";
import {
  createHighestPowerEquipPlan,
  createHighestPowerExecutionPlan
} from "../src/renderer/utils/highestPower";
import type { AccountItemSummary, CharacterSummary } from "../src/renderer/api/client";

describe("highest power execution plan", () => {
  it("splits highest-power actions into transfer and equip phases", () => {
    const character: CharacterSummary = {
      character_id: "char-1",
      class_name: "术士",
      equipped_items: [item("equipped-kinetic", "Old Kinetic", "动能武器", 1800)],
      equipment_groups: [],
      inventory_items: [item("inventory-energy", "Best Energy", "能量武器", 1810)],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    };

    const highestPowerPlan = createHighestPowerEquipPlan({
      character,
      vaultItems: [item("vault-helmet", "Best Helmet", "头盔", 1815)]
    });

    const executionPlan = createHighestPowerExecutionPlan(highestPowerPlan);

    expect(executionPlan.transfer_items.map((entry) => entry.item.name)).toEqual(["Best Helmet"]);
    expect(executionPlan.equip_items.map((entry) => entry.item.name)).toEqual([
      "Best Energy",
      "Best Helmet"
    ]);
    expect(executionPlan.summary).toContain("先转移 1 件");
    expect(executionPlan.summary).toContain("再装备 2 件");
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
    group_key: bucketName.includes("武器") ? "weapons" : "armor",
    power
  };
}
