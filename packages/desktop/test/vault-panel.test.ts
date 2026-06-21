import { describe, expect, it } from "vitest";
import {
  applyVisibleVaultSelection,
  buildDuplicateGroupBatchTagPlan,
  buildVaultBulkMoveResultMessage,
  buildVaultCleanupLocatorText,
  buildVaultCleanupText,
  buildVaultDuplicateSummary,
  buildVaultGroups,
  buildVaultSelectionSummary,
  countWishlistMatches,
  buildVaultSections,
  filterVaultItems,
  type VaultScoreRangeFilter,
  getVaultItemKey,
  scoreVaultItemForDisplay,
  selectDuplicateGroupItems,
  selectMarkedCleanupItems,
  selectVaultBatchItems,
  sortVaultItems
} from "../src/renderer/components/VaultPanel";
import type { AccountItemSummary, BatchItemActionResult, DimWishlist, VaultTags } from "../src/renderer/api/client";
import { readFileSync } from "node:fs";

const items: AccountItemSummary[] = [
  {
    hash: 1,
    instance_id: "a",
    name: "Riskrunner",
    item_type: "Submachine Gun",
    tier: "Exotic",
    bucket_name: "能量武器",
    group_key: "weapons",
    ammo_type: "primary",
    weapon_frame: {
      key: "lightweight-frame",
      name: "Lightweight Frame"
    },
    power: 1990,
    locked: true,
    socket_plugs: [
      { hash: 11, name: "Threat Detector" },
      { hash: 22, name: "Voltshot" }
    ]
  },
  {
    hash: 4,
    instance_id: "d",
    name: "Beloved",
    item_type: "Sniper Rifle",
    tier: "Legendary",
    bucket_name: "能量武器",
    group_key: "weapons",
    ammo_type: "special",
    weapon_frame: {
      key: "adaptive-frame",
      name: "Adaptive Frame"
    },
    power: 2000,
    locked: true
  },
  {
    hash: 5,
    instance_id: "e",
    name: "Thunderlord",
    item_type: "Machine Gun",
    tier: "Exotic",
    bucket_name: "威能武器",
    group_key: "weapons",
    ammo_type: "heavy",
    weapon_frame: {
      key: "high-impact-frame",
      name: "High-Impact Frame"
    },
    power: 1995,
    locked: true
  },
  {
    hash: 2,
    instance_id: "b",
    name: "Helmet A",
    item_type: "Helmet",
    tier: "Legendary",
    bucket_name: "头盔",
    group_key: "armor",
    power: 2010,
    locked: false
  },
  {
    hash: 3,
    instance_id: "c",
    name: "Vehicle A",
    item_type: "Vehicle",
    tier: "Exotic",
    bucket_name: "载具",
    group_key: "equipment",
    power: 1600
  }
];

describe("vault panel helpers", () => {
  it("uses dropdown filters instead of teaching English search syntax", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");

    expect(source).toContain("清空筛选");
    expect(source).toContain("scoreRangeFilter");
    expect(source).toContain("frameFilters");
    expect(source).toContain("自然搜索名称、类型、perk 或备注");
    expect(source).not.toContain("tag:junk");
    expect(source).not.toContain("locked:false");
    expect(source).not.toContain("score&gt;=75");
    expect(source).toContain("aria-busy");
    expect(source).toContain("处理中");
  });

  it("filters vault items by group and text", () => {
    expect(filterVaultItems(items, { group: "all", query: "risk" }).map((item) => item.name))
      .toEqual(["Riskrunner"]);
    expect(filterVaultItems(items, { group: "armor", query: "" }).map((item) => item.name))
      .toEqual(["Helmet A"]);
    expect(filterVaultItems(items, { group: "all", query: "异域" }).map((item) => item.name))
      .toEqual(["Riskrunner", "Thunderlord", "Vehicle A"]);
  });

  it("filters vault weapons by accurate ammo type", () => {
    expect(filterVaultItems(items, { group: "all", query: "", ammo: "primary" }).map((item) => item.name))
      .toEqual(["Riskrunner"]);
    expect(filterVaultItems(items, { group: "all", query: "", ammo: "special" }).map((item) => item.name))
      .toEqual(["Beloved"]);
    expect(filterVaultItems(items, { group: "all", query: "", ammo: "heavy" }).map((item) => item.name))
      .toEqual(["Thunderlord"]);
  });

  it("filters vault items by local tag", () => {
    const tags: VaultTags = {
      items: {
        a: { tag: "keep" },
        b: { tag: "junk" },
        c: { note: "sparrow collection favorite" }
      }
    };

    expect(filterVaultItems(items, { group: "all", query: "", tag: "keep", tags }).map((item) => item.name))
      .toEqual(["Riskrunner"]);
    expect(filterVaultItems(items, { group: "all", query: "", tag: "untagged", tags }).map((item) => item.name))
      .toEqual(["Beloved", "Thunderlord", "Vehicle A"]);
    expect(filterVaultItems(items, { group: "all", query: "", tag: "noted", tags }).map((item) => item.name))
      .toEqual(["Vehicle A"]);
  });

  it("summarizes visible and hidden selections for the vault batch toolbar", () => {
    const summary = buildVaultSelectionSummary({
      selectedTotalCount: 5,
      selectedVisibleCount: 3
    });

    expect(summary).toBe("已选 5 件，其中当前结果 3 件，另外 2 件来自其他筛选结果。");
    expect(buildVaultSelectionSummary({
      selectedTotalCount: 2,
      selectedVisibleCount: 2
    })).toBe("已选 2 件，全部都在当前结果中。");
    expect(buildVaultSelectionSummary({
      selectedTotalCount: 0,
      selectedVisibleCount: 0
    })).toBe("未选择任何装备。");
  });

  it("supports replacing, appending, and removing visible vault selections", () => {
    const visibleItems = [items[0], items[1], items[2]];

    expect([...applyVisibleVaultSelection(new Set(["b", "c", "hash:99"]), visibleItems, "replace")]).toEqual(["a", "d", "e"]);
    expect([...applyVisibleVaultSelection(new Set(["hash:99"]), visibleItems, "append")]).toEqual(["hash:99", "a", "d", "e"]);
    expect([...applyVisibleVaultSelection(new Set(["a", "d", "e", "hash:99"]), visibleItems, "remove")]).toEqual(["hash:99"]);
  });

  it("builds a clearer bulk move result with target character and failure guidance", () => {
    const partialResult: BatchItemActionResult = {
      ok: true,
      total: 4,
      success_count: 3,
      failed_count: 1,
      message: "批量操作完成"
    };

    expect(buildVaultBulkMoveResultMessage("猎人", partialResult))
      .toContain("已转移到猎人");
    expect(buildVaultBulkMoveResultMessage("猎人", partialResult))
      .toContain("成功 3 件，失败 1 件");
    expect(buildVaultBulkMoveResultMessage("猎人", partialResult))
      .toContain("设置");
    expect(buildVaultBulkMoveResultMessage("猎人", partialResult))
      .toContain("操作日志");

    expect(buildVaultBulkMoveResultMessage("泰坦", {
      ok: true,
      total: 2,
      success_count: 2,
      failed_count: 0,
      message: "批量操作完成"
    })).toBe("已转移到泰坦：共 2 件。");
  });

  it("filters vault items by selected weapon frames", () => {
    expect(filterVaultItems(items, { group: "all", query: "", frames: ["lightweight-frame"] }).map((item) => item.name))
      .toEqual(["Riskrunner"]);
    expect(filterVaultItems(items, { group: "all", query: "", frames: ["adaptive-frame", "high-impact-frame"] }).map((item) => item.name))
      .toEqual(["Beloved", "Thunderlord"]);
  });

  it("filters vault items by imported DIM wishlist hits", () => {
    const wishlist: DimWishlist = {
      title: "DIM Wishlist",
      rules: [
        {
          item_hash: 1,
          perk_hashes: [11, 22],
          mode: "pve"
        }
      ]
    };

    expect(filterVaultItems(items, { group: "all", query: "", tag: "wishlist", wishlist }).map((item) => item.name))
      .toEqual(["Riskrunner"]);
    expect(filterVaultItems(items, { group: "all", query: "tag:wishlist", wishlist }).map((item) => item.name))
      .toEqual(["Riskrunner"]);
  });

  it("counts imported DIM wishlist hits for vault summary", () => {
    const wishlist: DimWishlist = {
      title: "DIM Wishlist",
      rules: [
        {
          item_hash: 1,
          perk_hashes: [11, 22],
          mode: "pve"
        }
      ]
    };

    expect(countWishlistMatches(items, wishlist)).toBe(1);
    expect(countWishlistMatches(items, null)).toBe(0);
  });

  it("searches vault item notes", () => {
    const tags: VaultTags = {
      items: {
        b: { note: "keep one high-stat helmet for stasis" }
      }
    };

    expect(filterVaultItems(items, { group: "all", query: "stasis", tags }).map((item) => item.name))
      .toEqual(["Helmet A"]);
  });

  it("filters vault items by score recommendation", () => {
    const tags: VaultTags = {
      items: {
        a: { tag: "keep" },
        c: { tag: "junk" }
      }
    };

    expect(filterVaultItems(items, { group: "all", query: "", score: "keep", tags }).map((item) => item.name))
      .toEqual(["Riskrunner", "Beloved", "Thunderlord"]);
    expect(filterVaultItems(items, { group: "all", query: "", score: "junk", tags }).map((item) => item.name))
      .toEqual(["Vehicle A"]);
  });

  it("filters vault items by score range dropdown", () => {
    const tags: VaultTags = {
      items: {
        a: { tag: "keep" },
        c: { tag: "junk" }
      }
    };

    expect(filterVaultItems(items, { group: "all", query: "", scoreRange: "80-100" as VaultScoreRangeFilter, tags }).map((item) => item.name))
      .toEqual(["Riskrunner", "Thunderlord"]);
    expect(filterVaultItems(items, { group: "all", query: "", scoreRange: "0-39" as VaultScoreRangeFilter, tags }).map((item) => item.name))
      .toEqual(["Vehicle A"]);
  });

  it("filters vault items by lock state", () => {
    expect(filterVaultItems(items, { group: "all", query: "", lock: "locked" }).map((item) => item.name))
      .toEqual(["Riskrunner", "Beloved", "Thunderlord"]);
    expect(filterVaultItems(items, { group: "all", query: "", lock: "unlocked" }).map((item) => item.name))
      .toEqual(["Helmet A"]);
  });

  it("filters vault items with inline search syntax", () => {
    const tags: VaultTags = {
      items: {
        a: { tag: "keep" },
        c: { tag: "junk" }
      }
    };

    expect(filterVaultItems(items, { group: "all", query: "tag:keep", tags }).map((item) => item.name))
      .toEqual(["Riskrunner"]);
    expect(filterVaultItems(items, { group: "all", query: "locked:true", tags }).map((item) => item.name))
      .toEqual(["Riskrunner", "Beloved", "Thunderlord"]);
    expect(filterVaultItems(items, { group: "all", query: "locked:false", tags }).map((item) => item.name))
      .toEqual(["Helmet A"]);
    expect(filterVaultItems(items, { group: "all", query: "type:weapon score>=75", tags }).map((item) => item.name))
      .toEqual(["Riskrunner", "Beloved", "Thunderlord"]);
    expect(filterVaultItems(items, { group: "all", query: "score<=34", tags }).map((item) => item.name))
      .toEqual(["Vehicle A"]);
    expect(filterVaultItems(items, { group: "all", query: "tag:junk vehicle", tags }).map((item) => item.name))
      .toEqual(["Vehicle A"]);
  });

  it("uses instance id as the stable vault tag key before falling back to hash", () => {
    expect(getVaultItemKey(items[0])).toBe("a");
    expect(getVaultItemKey({ ...items[0], instance_id: undefined })).toBe("hash:1");
  });

  it("builds stable vault groups with counts", () => {
    expect(buildVaultGroups(items)).toEqual([
      { key: "all", label: "全部", count: 5 },
      { key: "weapons", label: "武器", count: 3 },
      { key: "armor", label: "护甲", count: 1 },
      { key: "equipment", label: "装备", count: 1 },
      { key: "other", label: "其他", count: 0 }
    ]);
  });

  it("builds vault display sections by inventory position", () => {
    expect(buildVaultSections(items).map((section) => [section.label, section.count])).toEqual([
      ["能量武器", 2],
      ["威能武器", 1],
      ["头盔", 1],
      ["载具", 1]
    ]);
  });

  it("sorts vault items by name, group, tier, score, and power", () => {
    expect(sortVaultItems(items, "name").map((item) => item.name))
      .toEqual(["Beloved", "Helmet A", "Riskrunner", "Thunderlord", "Vehicle A"]);
    expect(sortVaultItems(items, "group").map((item) => item.name))
      .toEqual(["Beloved", "Riskrunner", "Thunderlord", "Helmet A", "Vehicle A"]);
    expect(sortVaultItems(items, "tier").map((item) => item.name))
      .toEqual(["Riskrunner", "Thunderlord", "Vehicle A", "Beloved", "Helmet A"]);
    expect(sortVaultItems(items, "score", {
      items: {
        c: { tag: "junk" },
        a: { tag: "keep" }
      }
    }).map((item) => item.name)).toEqual(["Riskrunner", "Thunderlord", "Beloved", "Helmet A", "Vehicle A"]);
    expect(sortVaultItems(items, "power").map((item) => item.name))
      .toEqual(["Helmet A", "Beloved", "Thunderlord", "Riskrunner", "Vehicle A"]);
  });

  it("builds display scoring data from the shared local scoring rules", () => {
    const score = scoreVaultItemForDisplay(items[0], { items: { a: { tag: "keep" } } });

    expect(score.grade).toBe("keep");
    expect(score.label).toBe("建议保留");
    expect(score.reasons).toContain("本地标记为保留");
  });

  it("selects batch candidates from visible vault items", () => {
    const tags: VaultTags = {
      items: {
        a: { tag: "keep" },
        b: { note: "keep one high-stat helmet for stasis" },
        c: { tag: "junk" }
      }
    };

    expect(selectVaultBatchItems(items, "visible", tags).map((item) => item.name))
      .toEqual(["Riskrunner", "Beloved", "Thunderlord", "Helmet A", "Vehicle A"]);
    expect(selectVaultBatchItems(items, "junk", tags).map((item) => item.name))
      .toEqual(["Vehicle A"]);
    expect(selectVaultBatchItems(items, "review", tags).map((item) => item.name))
      .toEqual(["Helmet A"]);
    expect(selectVaultBatchItems(items, "untagged", tags).map((item) => item.name))
      .toEqual(["Beloved", "Thunderlord", "Helmet A"]);
    expect(selectVaultBatchItems(items, "noted", tags).map((item) => item.name))
      .toEqual(["Helmet A"]);
  });

  it("selects manually marked cleanup items instead of score suggestions", () => {
    const tags: VaultTags = {
      items: {
        a: { tag: "keep" },
        b: { tag: "junk" },
        c: { note: "review later" }
      }
    };

    expect(selectMarkedCleanupItems(items, tags).map((item) => item.name))
      .toEqual(["Helmet A"]);
  });

  it("builds a readable cleanup checklist from scored items", () => {
    const text = buildVaultCleanupText([items[4]], {
      items: {
        c: { tag: "junk", note: "clean duplicate vehicle" }
      }
    });

    expect(text).toContain("d2-tools 仓库清理清单");
    expect(text).toContain("Vehicle A");
    expect(text).toContain("clean duplicate vehicle");
    expect(text).toContain("可清理");
    expect(text).toContain("本地标记为可清理");
  });

  it("builds in-game locator details for cleanup candidates with duplicate names", () => {
    const duplicateItems: AccountItemSummary[] = [
      {
        ...items[1],
        instance_id: "beloved-a",
        power: 2000,
        locked: false,
        socket_plugs: [{ hash: 11, name: "速射瞄准" }, { hash: 12, name: "精准连击" }]
      },
      {
        ...items[1],
        instance_id: "beloved-b",
        power: 1990,
        locked: true,
        socket_plugs: [{ hash: 13, name: "滑射" }, { hash: 14, name: "首发射击" }]
      }
    ];

    const text = buildVaultCleanupLocatorText(duplicateItems, {
      items: {
        "beloved-a": { tag: "junk", note: "低分 PVE roll" },
        "beloved-b": { tag: "keep", note: "PVP 留着" }
      }
    });

    expect(text).toContain("游戏内定位提示");
    expect(text).toContain("Beloved");
    expect(text).toContain("能量武器 / Sniper Rifle / 特殊");
    expect(text).toContain("光等 2000");
    expect(text).toContain("未锁定");
    expect(text).toContain("速射瞄准 / 精准连击");
    expect(text).toContain("备注：低分 PVE roll");
    expect(text).toContain("同名装备有 2 件");
  });

  it("builds duplicate summary for same-name roll comparison", () => {
    const duplicateItems: AccountItemSummary[] = [
      { ...items[0], instance_id: "risk-1", socket_plugs: [{ hash: 1, name: "爆破专家" }] },
      { ...items[0], instance_id: "risk-2", socket_plugs: [{ hash: 2, name: "萤火虫" }] },
      items[1]
    ];

    const summary = buildVaultDuplicateSummary(duplicateItems, {
      items: {
        "risk-1": { tag: "keep" },
        "risk-2": { tag: "review" }
      }
    });

    expect(summary.total_duplicate_groups).toBe(1);
    expect(summary.groups[0].items.map((item) => item.roll_text)).toEqual(["爆破专家", "萤火虫"]);
  });
  it("builds duplicate-group quick-tag plans that keep the top roll and retag the rest", () => {
    const duplicateItems: AccountItemSummary[] = [
      { ...items[0], instance_id: "risk-1", socket_plugs: [{ hash: 1, name: "explosive" }] },
      { ...items[0], instance_id: "risk-2", socket_plugs: [{ hash: 2, name: "firefly" }] },
      { ...items[0], instance_id: "risk-3", socket_plugs: [{ hash: 3, name: "slideshot" }] }
    ];

    const summary = buildVaultDuplicateSummary(duplicateItems, { items: {} });
    const group = summary.groups[0];

    expect(buildDuplicateGroupBatchTagPlan(group, "keep-best-review-rest")).toEqual([
      { item_key: group.items[0]?.item_key, tag: "keep" },
      { item_key: group.items[1]?.item_key, tag: "review" },
      { item_key: group.items[2]?.item_key, tag: "review" }
    ]);
    expect(buildDuplicateGroupBatchTagPlan(group, "keep-best-junk-rest")).toEqual([
      { item_key: group.items[0]?.item_key, tag: "keep" },
      { item_key: group.items[1]?.item_key, tag: "junk" },
      { item_key: group.items[2]?.item_key, tag: "junk" }
    ]);
    expect(buildDuplicateGroupBatchTagPlan(group, "clear-group-tags")).toEqual([
      { item_key: group.items[0]?.item_key, tag: "none" },
      { item_key: group.items[1]?.item_key, tag: "none" },
      { item_key: group.items[2]?.item_key, tag: "none" }
    ]);
  });

  it("supports keeping a chosen duplicate instead of always keeping the top row", () => {
    const duplicateItems: AccountItemSummary[] = [
      { ...items[0], instance_id: "risk-1", socket_plugs: [{ hash: 1, name: "explosive" }] },
      { ...items[0], instance_id: "risk-2", socket_plugs: [{ hash: 2, name: "firefly" }] },
      { ...items[0], instance_id: "risk-3", socket_plugs: [{ hash: 3, name: "slideshot" }] }
    ];

    const summary = buildVaultDuplicateSummary(duplicateItems, { items: {} });
    const group = summary.groups[0];
    const keepItemKey = group.items[1]?.item_key ?? "";

    expect(buildDuplicateGroupBatchTagPlan(group, "keep-best-junk-rest", keepItemKey)).toEqual([
      { item_key: group.items[0]?.item_key, tag: "junk" },
      { item_key: group.items[1]?.item_key, tag: "keep" },
      { item_key: group.items[2]?.item_key, tag: "junk" }
    ]);
  });

  it("selects duplicate candidates by rest items and junk recommendations", () => {
    const duplicateItems: AccountItemSummary[] = [
      { ...items[0], instance_id: "risk-1", socket_plugs: [{ hash: 1, name: "explosive" }] },
      { ...items[0], instance_id: "risk-2", socket_plugs: [{ hash: 2, name: "firefly" }] },
      { ...items[0], instance_id: "risk-3", socket_plugs: [{ hash: 3, name: "slideshot" }] }
    ];

    const summary = buildVaultDuplicateSummary(duplicateItems, {
      items: {
        "risk-1": { tag: "keep" },
        "risk-2": { tag: "junk" },
        "risk-3": { tag: "review" }
      }
    });
    const group = summary.groups[0];

    expect(selectDuplicateGroupItems(group, "rest")).toEqual([
      group.items[1]?.item_key,
      group.items[2]?.item_key
    ]);
    expect(selectDuplicateGroupItems(group, "junk")).toEqual([
      "risk-2"
    ]);
  });

  it("renders duplicate group quick actions and richer meta in the vault UI", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");

    expect(source).toContain("onSaveTagBatch");
    expect(source).toContain("selectDuplicateGroupItems");
    expect(source).toContain("keep-best-review-rest");
    expect(source).toContain("keep-best-junk-rest");
    expect(source).toContain("clear-group-tags");
    expect(source).toContain("duplicate-row-actions");
    expect(source).toContain("duplicate-row-meta");
    expect(source).toContain("保留这件，其余可清理");
    expect(source).toContain("选择其余候选");
    expect(source).toContain("已选候选");
    expect(source).toContain("其余标记关注");
    expect(source).toContain("其余标记可清理");
    expect(source).toContain("清除本组标记");
    expect(source).toContain("formatVaultItemMeta(item)");
    expect(source).toContain("wishlist-hit-badge");
    expect(source).toContain("DIM 愿望单");
    expect(source).toContain("wishlistSummaryCount");
  });

  it("uses top-level vault content tabs so weapons and armor are split into easier views", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");

    expect(source).toContain("defaultVaultGroupTab");
    expect(source).toContain('const defaultVaultGroupTab: VaultGroupFilter = "weapons"');
    expect(source).toContain("vault-content-tabs");
    expect(source).toContain("vault-content-tab");
    expect(source).toContain("aria-label=\"仓库内容标签\"");
    expect(source).toContain("setGroup(defaultVaultGroupTab)");
  });
  it("shows a bulk move entry for selected visible vault results", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");

    expect(source).toContain("批量移动");
    expect(source).toContain("currentCharacterId");
    expect(source).toContain("runSelectedBulkMove");
    expect(source).toContain("全选当前结果");
    expect(source).toContain("追加当前结果");
    expect(source).toContain("移除当前结果");
    expect(source).toContain("buildVaultSelectionSummary");
  });
  it("shows local loadout highlights inside the vault list", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");

    expect(source).toContain("highlightedItemKeys");
    expect(source).toContain("isLoadoutMatch");
    expect(source).toContain("loadout-template-badge");
    expect(source).toContain("方案命中");
  });
});
