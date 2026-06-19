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
    expect(result.groups[0].items[0].recommendation).toBe("keep");
    expect(result.groups[0].items[1].recommendation).toBe("junk");
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
