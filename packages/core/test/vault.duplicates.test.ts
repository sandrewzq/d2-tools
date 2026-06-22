import { describe, expect, it } from "vitest";
import { analyzeDuplicateItems } from "../src/analysis/duplicates.js";
import type { AccountItemSummary } from "../src/account/summary.js";
import type { VaultTags } from "../src/vault/tags.js";

describe("vault duplicate analysis", () => {
  it("groups same-hash items and recommends the best duplicate to keep", () => {
    const result = analyzeDuplicateItems([
      item({ instance_id: "a", hash: 10, name: "不朽", locked: true, socket_plugs: plugs("测距仪", "目标锁定") }),
      item({ instance_id: "b", hash: 10, name: "不朽", locked: false, socket_plugs: plugs("威胁探测", "腹背受敌") }),
      item({ instance_id: "c", hash: 11, name: "单件装备" })
    ], tags({ a: "keep", b: "junk" }));

    expect(result.total_duplicate_groups).toBe(1);
    expect(result.total_duplicate_items).toBe(2);
    expect(result.groups[0].name).toBe("不朽");
    expect(result.groups[0].items.map((entry) => entry.item_key)).toEqual(["a", "b"]);
    expect(result.groups[0].items[0].roll_text).toBe("测距仪 / 目标锁定");
  });

  it("uses normalized names when hashes differ but names match", () => {
    const result = analyzeDuplicateItems([
      item({ instance_id: "a", hash: 20, name: "  风险管理者 " }),
      item({ instance_id: "b", hash: 21, name: "风险管理者" })
    ], tags({}));

    expect(result.total_duplicate_groups).toBe(1);
    expect(result.groups[0].group_key).toBe("name:风险管理者");
  });

  it("uses armor stat text for same-name armor comparison", () => {
    const result = analyzeDuplicateItems([
      item({
        instance_id: "helmet-a",
        hash: 30,
        name: "铁骑头盔",
        group_key: "armor",
        armor_stats: {
          mobility: 2,
          resilience: 26,
          recovery: 16,
          discipline: 12,
          intellect: 4,
          strength: 8,
          total: 68
        }
      }),
      item({
        instance_id: "helmet-b",
        hash: 30,
        name: "铁骑头盔",
        group_key: "armor",
        armor_stats: {
          mobility: 8,
          resilience: 12,
          recovery: 28,
          discipline: 10,
          intellect: 6,
          strength: 4,
          total: 68
        }
      })
    ], tags({}));

    expect(result.groups[0].items.map((entry) => entry.roll_text)).toEqual([
      "总值 68 / 韧性 26 / 恢复 16 / 纪律 12",
      "总值 68 / 韧性 12 / 恢复 28 / 纪律 10"
    ]);
  });
});

function item(overrides: Partial<AccountItemSummary>): AccountItemSummary {
  return {
    hash: 1,
    instance_id: "item",
    name: "Item",
    group_key: "weapons",
    tier: "Legendary",
    locked: false,
    socket_plugs: [],
    ...overrides
  };
}

function plugs(...names: string[]): AccountItemSummary["socket_plugs"] {
  return names.map((name, index) => ({ hash: index + 1, name }));
}

function tags(entries: Record<string, "keep" | "review" | "junk">): VaultTags {
  return {
    items: Object.fromEntries(Object.entries(entries).map(([key, tag]) => [key, { tag }]))
  };
}
