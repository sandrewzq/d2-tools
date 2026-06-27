import { describe, expect, it } from "vitest";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { VaultTags } from "@d2-tools/core/vault/tags";
import {
  applyVisibleVaultSelection,
  buildVaultSelectionSummary,
  buildVaultTagInput,
  getVaultSelectionItemKey,
  selectMarkedCleanupItems,
  selectVaultBatchItems
} from "../src/workspaces/vaultSelection";

function item(input: Partial<AccountItemSummary> & Pick<AccountItemSummary, "hash" | "name" | "group_key" | "item_type" | "tier">): AccountItemSummary {
  return {
    bucket_name: "未识别物品",
    ...input
  };
}

describe("vault selection workspace", () => {
  const items = [
    item({
      hash: 100,
      instance_id: "weapon-target",
      name: "目标手炮",
      group_key: "weapons",
      item_type: "Hand Cannon",
      tier: "Legendary",
      socket_plugs: [{ hash: 2001, name: "快速命中" }]
    }),
    item({
      hash: 101,
      instance_id: "armor-junk",
      name: "待清理胸甲",
      group_key: "armor",
      item_type: "Chest Armor",
      tier: "Legendary",
      armor_stats: {
        health: 8,
        melee: 6,
        grenade: 10,
        super: 4,
        class: 6,
        weapon: 6,
        total: 40
      }
    }),
    item({
      hash: 102,
      instance_id: "weapon-untagged",
      name: "未标记步枪",
      group_key: "weapons",
      item_type: "Auto Rifle",
      tier: "Legendary"
    })
  ];
  const tags: VaultTags = {
    items: {
      "weapon-target": { tag: "keep" },
      "armor-junk": { tag: "junk", note: "低属性" }
    }
  };
  const targetRules: LocalTargetRules = {
    action_policy: "notify_only",
    armor: [],
    weapons: [{
      id: "target-hand-cannon",
      name: "目标手炮",
      item_hash: 100,
      item_name: "目标手炮",
      conditions: [{ perk_hash: 2001, perk_name: "快速命中" }]
    }]
  };

  it("selects batch candidates from app layer rules", () => {
    expect(selectVaultBatchItems(items, "visible", tags, targetRules).map((entry) => entry.name))
      .toEqual(["目标手炮", "待清理胸甲", "未标记步枪"]);
    expect(selectVaultBatchItems(items, "target", tags, targetRules).map((entry) => entry.name))
      .toEqual(["目标手炮"]);
    expect(selectVaultBatchItems(items, "junk", tags, targetRules).map((entry) => entry.name))
      .toEqual(["待清理胸甲"]);
    expect(selectVaultBatchItems(items, "untagged", tags, targetRules).map((entry) => entry.name))
      .toEqual(["未标记步枪"]);
    expect(selectVaultBatchItems(items, "noted", tags, targetRules).map((entry) => entry.name))
      .toEqual(["待清理胸甲"]);
  });

  it("builds stable visible selection and cleanup helpers", () => {
    expect(getVaultSelectionItemKey(items[0]!)).toBe("weapon-target");
    expect(getVaultSelectionItemKey({ ...items[0]!, instance_id: undefined })).toBe("hash:100");

    expect([...applyVisibleVaultSelection(new Set(["old"]), [items[0]!, items[2]!], "replace")])
      .toEqual(["weapon-target", "weapon-untagged"]);
    expect([...applyVisibleVaultSelection(new Set(["old"]), [items[0]!], "append")])
      .toEqual(["old", "weapon-target"]);
    expect([...applyVisibleVaultSelection(new Set(["old", "weapon-target"]), [items[0]!], "remove")])
      .toEqual(["old"]);

    expect(selectMarkedCleanupItems(items, tags).map((entry) => entry.name)).toEqual(["待清理胸甲"]);
    expect(buildVaultTagInput(items[0]!, "review")).toEqual({ item_key: "weapon-target", tag: "review" });
  });

  it("summarizes visible and hidden selections for desktop UI", () => {
    expect(buildVaultSelectionSummary({ selectedTotalCount: 0, selectedVisibleCount: 0 }))
      .toBe("未选择任何装备。");
    expect(buildVaultSelectionSummary({ selectedTotalCount: 2, selectedVisibleCount: 2 }))
      .toBe("已选 2 件，全部都在当前结果中。");
    expect(buildVaultSelectionSummary({ selectedTotalCount: 5, selectedVisibleCount: 3 }))
      .toBe("已选 5 件，其中当前结果 3 件，另外 2 件来自其他筛选结果。");
  });
});
