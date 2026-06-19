import { describe, expect, it } from "vitest";
import { groupAccountItemsBySlot } from "./renderer/utils/accountSlots";
import type { AccountItemSummary } from "./renderer/api/client";

describe("account slot grouping", () => {
  it("groups account equipment by Destiny/DIM-style inventory slots", () => {
    const grouped = groupAccountItemsBySlot([
      item("Kinetic", "动能武器", "weapons"),
      item("Energy", "能量武器", "weapons"),
      item("Helmet", "头盔", "armor"),
      item("Class Item", "职业物品", "armor"),
      item("Ship", "飞船", "equipment"),
      item("Unknown", undefined, "other")
    ]);

    expect(grouped.map((category) => [category.label, category.count])).toEqual([
      ["武器", 2],
      ["护甲", 2],
      ["装备", 1],
      ["其他", 1]
    ]);
    expect(grouped[0].groups.map((group) => group.label)).toEqual(["动能武器", "能量武器"]);
    expect(grouped[1].groups.map((group) => group.label)).toEqual(["头盔", "职业物品"]);
    expect(grouped[2].groups.map((group) => group.label)).toEqual(["飞船"]);
    expect(grouped[3].groups.map((group) => group.label)).toEqual(["未识别物品"]);
  });

  it("continues grouping other inventory items into readable subgroups", () => {
    const grouped = groupAccountItemsBySlot([
      item("周常公会记忆水晶", undefined, "other", "传说"),
      item("个人周常任务", undefined, "other"),
      item("强化核心", undefined, "other", "货币"),
      item("武器模组", undefined, "other", "模组"),
      item("Item 3359067392", undefined, "other")
    ]);

    expect(grouped.map((category) => [category.label, category.count])).toEqual([
      ["其他", 5]
    ]);
    expect(grouped[0].groups.map((group) => group.label)).toEqual([
      "记忆水晶",
      "任务与追踪",
      "材料与货币",
      "模组与外观",
      "未识别物品"
    ]);
  });
});

function item(
  name: string,
  bucketName: string | undefined,
  groupKey: AccountItemSummary["group_key"],
  itemType?: string
): AccountItemSummary {
  return {
    hash: name.length,
    name,
    bucket_name: bucketName,
    group_key: groupKey,
    item_type: itemType
  };
}
