import { describe, expect, it } from "vitest";
import type { AccountItemSummary, CharacterSummary } from "@d2-tools/core/account/summary";
import {
  buildHighestPowerAlreadyOptimalMessage,
  buildHighestPowerConfirmText,
  buildHighestPowerEquipProgressMessage,
  buildHighestPowerResultMessage,
  buildHighestPowerTransferProgressMessage,
  createHighestPowerEquipPlan,
  createHighestPowerExecutionPlan,
  formatHighestPowerSource
} from "../src/workspaces/highestPower";

describe("highest power workspace", () => {
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

  it("recovers an exotic armor slot from cached item metadata when its bucket is unknown", () => {
    const character: CharacterSummary = {
      character_id: "char-1",
      class_name: "术士",
      light: 1800,
      equipped_items: [item("equipped-legs", "当前腿甲", "腿甲", 1800)],
      equipment_groups: [],
      inventory_items: [{
        ...item("inventory-exotic-legs", "异域腿甲", "未知", 1810, 2, "异域"),
        item_type: "腿部护甲",
        bucket_hash: 2422292810,
        group_key: "other",
        instance: { can_equip: false, cannot_equip_reason: 16 }
      }],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    };

    const plan = createHighestPowerEquipPlan({ character, vaultItems: [] });

    expect(plan.items.find((entry) => entry.slot_label === "腿甲")).toMatchObject({
      item: { name: "异域腿甲", power: 1810 },
      source: "inventory",
      needs_equip: true
    });
  });

  it("does not submit an item whose cannot-equip reason is unknown", () => {
    const character: CharacterSummary = {
      character_id: "char-1",
      class_name: "术士",
      light: 1800,
      equipped_items: [item("equipped-legs", "当前腿甲", "腿甲", 1800)],
      equipment_groups: [],
      inventory_items: [{
        ...item("blocked-legs", "不可装备腿甲", "未知", 1810, 2, "异域"),
        item_type: "腿部护甲",
        bucket_hash: 2422292810,
        group_key: "other",
        instance: { can_equip: false, cannot_equip_reason: 0 }
      }],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    };

    const plan = createHighestPowerEquipPlan({ character, vaultItems: [] });

    expect(plan.items.find((entry) => entry.slot_label === "腿甲")?.item.name).toBe("当前腿甲");
  });

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

  it("ignores armor that belongs to a different class while retaining weapons", () => {
    const character: CharacterSummary = {
      character_id: "titan-1",
      class_name: "泰坦",
      equipped_items: [item("titan-helmet", "泰坦头盔", "头盔", 1800, 0)],
      equipment_groups: [],
      inventory_items: [],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    };

    const plan = createHighestPowerEquipPlan({
      character,
      vaultItems: [
        item("warlock-helmet", "术士头盔", "头盔", 1810, 2),
        item("shared-weapon", "共享武器", "动能武器", 1810, 3)
      ]
    });

    expect(plan.items.map((entry) => entry.item.name)).toEqual(["共享武器", "泰坦头盔"]);
  });

  it("selects the highest total power combination that respects exotic limits", () => {
    const character: CharacterSummary = {
      character_id: "char-1",
      class_name: "术士",
      equipped_items: [
        item("kinetic-base", "动能基准", "动能武器", 500),
        item("energy-base", "能量基准", "能量武器", 500),
        item("power-base", "威能基准", "威能武器", 500),
        item("helmet-base", "头盔基准", "头盔", 500, 2),
        item("gauntlets-base", "臂铠基准", "臂铠", 500, 2)
      ],
      equipment_groups: [],
      inventory_items: [
        item("kinetic-exotic", "异域动能", "动能武器", 525, undefined, "异域"),
        item("energy-exotic", "异域能量", "能量武器", 524, undefined, "Exotic"),
        item("energy-legendary", "传说能量", "能量武器", 523),
        item("power-legendary", "传说威能", "威能武器", 522),
        item("helmet-exotic", "异域头盔", "头盔", 525, 2, "异域"),
        item("gauntlets-exotic", "异域臂铠", "臂铠", 524, 2, "Exotic"),
        item("gauntlets-legendary", "传说臂铠", "臂铠", 523, 2)
      ],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    };

    const plan = createHighestPowerEquipPlan({ character, vaultItems: [] });

    expect(plan.items.map((entry) => entry.item.name)).toEqual([
      "异域动能",
      "传说能量",
      "传说威能",
      "异域头盔",
      "传说臂铠"
    ]);
  });

  it("keeps vault transfers and replaceable exotic conflicts in the power plan", () => {
    const character: CharacterSummary = {
      character_id: "char-1",
      class_name: "术士",
      equipped_items: [
        item("equipped-kinetic", "当前异域动能", "动能武器", 456, 3, "异域"),
        item("equipped-energy", "当前传说能量", "能量武器", 444, 3, "传说")
      ],
      equipment_groups: [],
      inventory_items: [
        item("inventory-energy", "可替换异域能量", "能量武器", 475, 3, "异域", {
          can_equip: false,
          cannot_equip_reason: 2
        }),
        item("inventory-gauntlets", "可替换异域臂铠", "臂铠", 477, 2, "异域", {
          can_equip: false,
          cannot_equip_reason: 2
        })
      ],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    };
    const plan = createHighestPowerEquipPlan({
      character,
      vaultItems: [
        item("vault-kinetic", "仓库传说动能", "动能武器", 477, 3, "传说", {
          can_equip: false,
          cannot_equip_reason: 16
        }),
        item("vault-energy", "仓库传说能量", "能量武器", 477, 3, "传说", {
          can_equip: false,
          cannot_equip_reason: 16
        }),
        item("vault-helmet", "等级不足头盔", "头盔", 490, 2, "传说", {
          can_equip: false,
          cannot_equip_reason: 8
        })
      ]
    });

    expect(plan.items.map((entry) => [entry.item.name, entry.source])).toEqual([
      ["仓库传说动能", "vault"],
      ["仓库传说能量", "vault"],
      ["可替换异域臂铠", "inventory"]
    ]);
    expect(plan.items.some((entry) => entry.item.name === "等级不足头盔")).toBe(false);
    expect(plan.executable_items.filter((entry) => entry.needs_transfer)).toHaveLength(2);
  });

  it("builds the confirm copy for highest-power write actions", () => {
    const character: CharacterSummary = {
      character_id: "char-1",
      class_name: "术士",
      equipped_items: [item("equipped-kinetic", "Old Kinetic", "动能武器", 1800)],
      equipment_groups: [],
      inventory_items: [item("inventory-kinetic", "Better Kinetic", "动能武器", 1810)],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    };
    const plan = createHighestPowerEquipPlan({
      character,
      vaultItems: [item("vault-helmet", "Best Helmet", "头盔", 1815)]
    });
    const executionPlan = createHighestPowerExecutionPlan(plan);

    expect(formatHighestPowerSource("inventory")).toBe("角色背包");
    expect(formatHighestPowerSource("vault")).toBe("仓库");
    expect(buildHighestPowerConfirmText({
      characterClassName: character.class_name,
      plan,
      executionPlan
    })).toBe([
      "确认给 术士 装备最高光等组合？",
      "准备装备 2 件最高光等装备，涉及 2 个位置。",
      "先转移 1 件，再装备 2 件。",
      "动能武器：Better Kinetic / 光等 1810 / 角色背包",
      "头盔：Best Helmet / 光等 1815 / 仓库",
      "说明：仓库里的装备会先取出到该角色，再执行装备。不会分解装备。"
    ].join("\n"));
  });

  it("builds progress and result messages for highest-power write actions", () => {
    expect(buildHighestPowerAlreadyOptimalMessage("术士")).toBe("术士 当前已经是最高光等组合。");
    expect(buildHighestPowerTransferProgressMessage(2)).toBe("正在从仓库取出 2 件最高光等装备...");
    expect(buildHighestPowerEquipProgressMessage(3)).toBe("正在装备最高光等 3 件装备...");
    expect(buildHighestPowerResultMessage({
      characterClassName: "术士",
      transferSuccessCount: 0,
      transferTotalCount: 0,
      equipSuccessCount: 3,
      equipTotalCount: 3,
      failedCount: 0
    })).toBe("已提交给 术士 装备 3 件最高光等装备，正在确认游戏内状态。");
    expect(buildHighestPowerResultMessage({
      characterClassName: "术士",
      transferSuccessCount: 1,
      transferTotalCount: 2,
      equipSuccessCount: 2,
      equipTotalCount: 3,
      failedCount: 2,
      failureReason: "当前角色所在位置不允许更换装备。"
    })).toBe("最高光等部分提交：转移受理 1/2，装备受理 2/3，失败步骤 2。首个失败原因：当前角色所在位置不允许更换装备。");
  });
});

function item(
  instanceId: string,
  name: string,
  bucketName: string,
  power: number | undefined,
  classType?: number,
  tier?: string,
  instance?: AccountItemSummary["instance"]
): AccountItemSummary {
  return {
    hash: instanceId.length,
    instance_id: instanceId,
    name,
    bucket_name: bucketName,
    group_key: bucketName.includes("武器") ? "weapons" : bucketName === "飞船" ? "equipment" : "armor",
    power,
    class_type: classType,
    tier,
    instance
  };
}
