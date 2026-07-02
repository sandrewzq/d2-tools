import { describe, expect, it } from "vitest";
import {
  applyVisibleVaultSelection, buildDuplicateGroupBatchTagPlan, buildVaultBulkMoveResultMessage, buildVaultCleanupLocatorText, buildVaultCleanupText, buildVaultDuplicateSummary, buildVaultGroups, buildVaultSelectionSummary, countWishlistMatches, buildVaultSections, filterVaultItems, getVaultItemKey, selectDuplicateGroupItems, selectMarkedCleanupItems, selectVaultBatchItems, sortVaultItems
} from "../src/renderer/components/VaultPanel";
import type { AccountItemSummary, BatchItemActionResult, DimWishlist, LocalTargetRules, VaultTags } from "../src/renderer/api/types";
import { existsSync, readFileSync } from "node:fs";

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
  it("keeps vault filter toolbar in the vault feature module", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");
    const toolbarPath = "packages/desktop/src/renderer/features/vault/VaultFilterToolbar.tsx";

    expect(existsSync(toolbarPath)).toBe(true);
    const toolbar = readFileSync(toolbarPath, "utf8");

    expect(source).toContain("../features/vault/VaultFilterToolbar");
    expect(source).not.toContain("className=\"vault-toolbar\"");
    expect(toolbar).toContain("export function VaultFilterToolbar");
    expect(toolbar).toContain("自然搜索名称、类型、perk 或备注");
    expect(toolbar).toContain("仓库武器框架筛选");
    expect(toolbar).toContain("清空筛选");
    expect(toolbar).toContain("VaultArmorFilterPanel");
    expect(toolbar).toContain("ammoFilterLabels");
    expect(toolbar).toContain("tagLabels");
    expect(toolbar).toContain("sortLabels");
    expect(source).not.toContain("tag:junk");
    expect(source).not.toContain("locked:false");
    expect(source).not.toContain("score&gt;=75");
    expect(toolbar).toContain("aria-label");
    expect(readFileSync("packages/desktop/src/renderer/features/vault/VaultOrganizePanel.tsx", "utf8")).toContain("处理中");
  });

  it("keeps vault organize and cleanup controls in the vault feature module", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");
    const panelPath = "packages/desktop/src/renderer/features/vault/VaultOrganizePanel.tsx";

    expect(existsSync(panelPath)).toBe(true);
    const panel = readFileSync(panelPath, "utf8");

    expect(source).toContain("../features/vault/VaultOrganizePanel");
    expect(source).not.toContain("className=\"vault-organize-bar\"");
    expect(source).not.toContain("className=\"vault-cleanup-panel\"");
    expect(panel).toContain("export function VaultOrganizePanel");
    expect(panel).toContain("仓库内容标签");
    expect(panel).toContain("整理模式");
    expect(panel).toContain("清理模式");
    expect(panel).toContain("批量移动");
    expect(panel).toContain("游戏内定位");
  });

  it("keeps duplicate group rendering in the vault feature module", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");
    const duplicateGroupsPath = "packages/desktop/src/renderer/features/vault/VaultDuplicateGroups.tsx";

    expect(existsSync(duplicateGroupsPath)).toBe(true);
    const duplicateGroups = readFileSync(duplicateGroupsPath, "utf8");

    expect(source).toContain("../features/vault/VaultDuplicateGroups");
    expect(source).not.toContain("duplicate-group-list");
    expect(source).not.toContain("duplicate-row-main");
    expect(duplicateGroups).toContain("export function VaultDuplicateGroups");
    expect(duplicateGroups).toContain("selectDuplicateGroupItems");
    expect(duplicateGroups).toContain("duplicate-row-actions");
    expect(duplicateGroups).toContain("保留这件，其余可清理");
  });

  it("keeps vault item section rendering in the vault feature module", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");
    const itemSectionsPath = "packages/desktop/src/renderer/features/vault/VaultItemSections.tsx";

    expect(existsSync(itemSectionsPath)).toBe(true);
    const itemSections = readFileSync(itemSectionsPath, "utf8");

    expect(source).toContain("../features/vault/VaultItemSections");
    expect(source).not.toContain("vault-section-list");
    expect(source).not.toContain("vault-slot-section");
    expect(itemSections).toContain("export function VaultItemSections");
    expect(itemSections).toContain("VaultListItem");
    expect(itemSections).toContain("没有匹配的仓库物品");
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

  it("supports farming and loadout-use local tags across vault filtering and batch selection", () => {
    const tags: VaultTags = {
      items: {
        a: { tag: "farm" },
        b: { tag: "loadout" },
        c: { tag: "junk" }
      }
    };

    expect(filterVaultItems(items, { group: "all", query: "", tag: "farm", tags }).map((item) => item.name))
      .toEqual(["Riskrunner"]);
    expect(filterVaultItems(items, { group: "all", query: "", tag: "loadout", tags }).map((item) => item.name))
      .toEqual(["Helmet A"]);
    expect(selectVaultBatchItems(items, "farm", tags).map((item) => item.name))
      .toEqual(["Riskrunner"]);
    expect(selectVaultBatchItems(items, "loadout", tags).map((item) => item.name))
      .toEqual(["Helmet A"]);
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

  it("filters and sorts armor by confirmed stat values", () => {
    const armorItems: AccountItemSummary[] = [
      {
        ...items[3],
        instance_id: "helmet-high-health",
        name: "Helmet High Health",
        armor_stats: {
          health: 26,
          melee: 8,
          grenade: 12,
          super: 4,
          class: 16,
          weapon: 2,
          total: 68
        }
      },
      {
        ...items[3],
        instance_id: "helmet-high-class",
        name: "Helmet High Class",
        armor_stats: {
          health: 12,
          melee: 4,
          grenade: 10,
          super: 6,
          class: 28,
          weapon: 8,
          total: 68
        }
      },
      {
        ...items[3],
        instance_id: "helmet-low",
        name: "Helmet Low",
        armor_stats: {
          health: 10,
          melee: 4,
          grenade: 6,
          super: 6,
          class: 8,
          weapon: 4,
          total: 38
        }
      }
    ];

    expect(filterVaultItems(armorItems, {
      group: "armor",
      query: "",
      armorStatRules: [{ stat: "health", min: "20" }]
    }).map((item) => item.name)).toEqual(["Helmet High Health"]);
    expect(filterVaultItems(armorItems, {
      group: "armor",
      query: "",
      armorStatRules: [
        { stat: "health", min: "20" },
        { stat: "class", min: "15" },
        { stat: "grenade", min: "" }
      ]
    }).map((item) => item.name)).toEqual(["Helmet High Health"]);
    expect(filterVaultItems(armorItems, {
      group: "armor",
      query: "",
      armorStatRules: [
        { stat: "health", min: "20" },
        { stat: "health", min: "30" }
      ]
    }).map((item) => item.name)).toEqual([]);
    expect(sortVaultItems(armorItems, "armor-total").map((item) => item.name))
      .toEqual(["Helmet High Class", "Helmet High Health", "Helmet Low"]);
    expect(sortVaultItems(armorItems, "health").map((item) => item.name))
      .toEqual(["Helmet High Health", "Helmet High Class", "Helmet Low"]);
  });

  it("filters vault armor by saved local target rules", () => {
    const armorItems: AccountItemSummary[] = [
      {
        ...items[3],
        instance_id: "helmet-target",
        name: "Helmet Target",
        armor_stats: {
          health: 24,
          melee: 8,
          grenade: 12,
          super: 6,
          class: 22,
          weapon: 4,
          total: 76
        }
      },
      {
        ...items[3],
        instance_id: "helmet-miss",
        name: "Helmet Miss",
        armor_stats: {
          health: 18,
          melee: 8,
          grenade: 12,
          super: 6,
          class: 22,
          weapon: 4,
          total: 70
        }
      }
    ];
    const targetRules: LocalTargetRules = {
      action_policy: "notify_only",
      armor: [
        {
          id: "health-class",
          name: "生命职业",
          conditions: [
            { stat: "health", min: 20 },
            { stat: "class", min: 20 }
          ]
        }
      ],
      weapons: []
    };

    expect(filterVaultItems(armorItems, {
      group: "armor",
      query: "",
      tag: "target",
      localTargetRules: targetRules
    }).map((item) => item.name)).toEqual(["Helmet Target"]);
    expect(filterVaultItems(armorItems, {
      group: "armor",
      query: "tag:target",
      localTargetRules: targetRules
    }).map((item) => item.name)).toEqual(["Helmet Target"]);
  });

  it("filters vault weapons by saved local perk target rules", () => {
    const targetRules: LocalTargetRules = {
      action_policy: "notify_only",
      armor: [],
      weapons: [
        {
          id: "riskrunner-clear",
          name: "Riskrunner 清怪",
          item_hash: 1,
          item_name: "Riskrunner",
          conditions: [
            { perk_hash: 11, perk_name: "Threat Detector" },
            { perk_hash: 22, perk_name: "Voltshot" }
          ]
        }
      ]
    };

    expect(filterVaultItems(items, {
      group: "weapons",
      query: "",
      tag: "target",
      localTargetRules: targetRules
    }).map((item) => item.name)).toEqual(["Riskrunner"]);
    expect(filterVaultItems(items, {
      group: "weapons",
      query: "tag:target",
      localTargetRules: targetRules
    }).map((item) => item.name)).toEqual(["Riskrunner"]);
  });

  it("renders free-form Armor 3.0 stat filters without old armor stat labels", () => {
    const toolbar = readFileSync("packages/desktop/src/renderer/features/vault/VaultFilterToolbar.tsx", "utf8");
    const armorPanel = readFileSync("packages/desktop/src/renderer/features/vault/VaultArmorFilterPanel.tsx", "utf8");
    const filters = readFileSync("packages/app/src/workspaces/vaultList.ts", "utf8");

    expect(toolbar).toContain("VaultArmorFilterPanel");
    expect(armorPanel).toContain("护甲属性筛选");
    expect(armorPanel).toContain("添加属性条件");
    expect(armorPanel).toContain("清空护甲条件");
    expect(filters).toContain("health: \"生命值\"");
    expect(filters).toContain("melee: \"近战\"");
    expect(filters).toContain("grenade: \"手雷\"");
    expect(filters).toContain("super: \"超能\"");
    expect(filters).toContain("class: \"职业\"");
    expect(filters).toContain("weapon: \"武器\"");
    expect(armorPanel + filters).not.toContain("敏捷");
    expect(armorPanel + filters).not.toContain("韧性");
    expect(armorPanel + filters).not.toContain("恢复");
    expect(armorPanel + filters).not.toContain("纪律");
    expect(armorPanel + filters).not.toContain("智慧");
    expect(armorPanel + filters).not.toContain("力量");
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

  it("sorts vault items by name, group, tier, and power", () => {
    expect(sortVaultItems(items, "name").map((item) => item.name))
      .toEqual(["Beloved", "Helmet A", "Riskrunner", "Thunderlord", "Vehicle A"]);
    expect(sortVaultItems(items, "group").map((item) => item.name))
      .toEqual(["Beloved", "Riskrunner", "Thunderlord", "Helmet A", "Vehicle A"]);
    expect(sortVaultItems(items, "tier").map((item) => item.name))
      .toEqual(["Riskrunner", "Thunderlord", "Vehicle A", "Beloved", "Helmet A"]);
    expect(sortVaultItems(items, "power").map((item) => item.name))
      .toEqual(["Helmet A", "Beloved", "Thunderlord", "Riskrunner", "Vehicle A"]);
  });

  it("selects batch candidates from visible vault items", () => {
    const tags: VaultTags = {
      items: {
        a: { tag: "keep" },
        b: { note: "keep one high-stat helmet for stasis" },
        c: { tag: "junk" },
        d: { tag: "review" }
      }
    };

    expect(selectVaultBatchItems(items, "visible", tags).map((item) => item.name))
      .toEqual(["Riskrunner", "Beloved", "Thunderlord", "Helmet A", "Vehicle A"]);
    expect(selectVaultBatchItems(items, "junk", tags).map((item) => item.name))
      .toEqual(["Vehicle A"]);
    expect(selectVaultBatchItems(items, "review", tags).map((item) => item.name))
      .toEqual(["Beloved"]);
    expect(selectVaultBatchItems(items, "untagged", tags).map((item) => item.name))
      .toEqual(["Thunderlord", "Helmet A"]);
    expect(selectVaultBatchItems(items, "noted", tags).map((item) => item.name))
      .toEqual(["Helmet A"]);
  });

  it("selects local target matches for batch tagging", () => {
    const targetRules: LocalTargetRules = {
      action_policy: "notify_only",
      armor: [
        {
          id: "high-health",
          name: "生命值 20+",
          conditions: [{ stat: "health", min: 20 }]
        }
      ],
      weapons: [
        {
          id: "riskrunner-perk",
          name: "Riskrunner 目标 perk",
          item_hash: 1,
          item_name: "Riskrunner",
          conditions: [{ perk_hash: 11, perk_name: "目标 perk" }]
        }
      ]
    };
    const targetItems: AccountItemSummary[] = [
      {
        ...items[0],
        socket_plugs: [{ hash: 11, name: "目标 perk" }]
      },
      items[1],
      {
        ...items[3],
        armor_stats: {
          total: 55,
          health: 22,
          melee: 5,
          grenade: 8,
          super: 7,
          class: 6,
          weapon: 7
        }
      },
      items[4]
    ];

    expect(selectVaultBatchItems(targetItems, "target", { items: {} }, targetRules).map((item) => item.name))
      .toEqual(["Riskrunner", "Helmet A"]);
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

  it("builds a readable cleanup checklist from marked items", () => {
    const text = buildVaultCleanupText([items[4]], {
      items: {
        c: { tag: "junk", note: "clean duplicate vehicle" }
      }
    });

    expect(text).toContain("d2-tools 仓库清理清单");
    expect(text).toContain("Vehicle A");
    expect(text).toContain("clean duplicate vehicle");
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
    const duplicateGroups = readFileSync("packages/desktop/src/renderer/features/vault/VaultDuplicateGroups.tsx", "utf8");
    const listItem = readFileSync("packages/desktop/src/renderer/features/vault/VaultListItem.tsx", "utf8");

    expect(source).toContain("onSaveTagBatch");
    expect(duplicateGroups).toContain("selectDuplicateGroupItems");
    expect(duplicateGroups).toContain("keep-best-review-rest");
    expect(duplicateGroups).toContain("keep-best-junk-rest");
    expect(duplicateGroups).toContain("clear-group-tags");
    expect(duplicateGroups).toContain("duplicate-row-actions");
    expect(duplicateGroups).toContain("duplicate-row-meta");
    expect(duplicateGroups).toContain("保留这件，其余可清理");
    expect(duplicateGroups).toContain("选择其余候选");
    expect(duplicateGroups).toContain("已选候选");
    expect(duplicateGroups).toContain("其余标记关注");
    expect(duplicateGroups).toContain("其余标记可清理");
    expect(duplicateGroups).toContain("清除本组标记");
    expect(duplicateGroups).toContain("formatVaultItemMeta(item)");
    expect(duplicateGroups).toContain("evaluateLocalTargets");
    expect(duplicateGroups).toContain("本地目标");
    expect(source).toContain("localTargetRules={props.localTargetRules}");
    expect(listItem).toContain("wishlist-hit-badge");
    expect(listItem).toContain("DIM 愿望单");
    expect(source).toContain("wishlistSummaryCount");
    expect(listItem).toContain("formatCommunityPerkPreview");
    expect(listItem).toContain("sample_perks");
  });

  it("uses top-level vault content tabs so weapons and armor are split into easier views", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");
    const organizePanel = readFileSync("packages/desktop/src/renderer/features/vault/VaultOrganizePanel.tsx", "utf8");
    const filters = readFileSync("packages/app/src/workspaces/vaultList.ts", "utf8");

    expect(filters).toContain("defaultVaultGroupTab");
    expect(filters).toContain('export const defaultVaultGroupTab: VaultGroupFilter = "weapons"');
    expect(organizePanel).toContain("vault-content-tabs");
    expect(organizePanel).toContain("vault-content-tab");
    expect(organizePanel).toContain("aria-label=\"仓库内容标签\"");
    expect(source).toContain("setGroup(defaultVaultGroupTab)");
  });
  it("keeps vault filtering and sorting helpers in the app workspace with a desktop compatibility barrel", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");
    const filters = readFileSync("packages/app/src/workspaces/vaultList.ts", "utf8");
    const featureBarrel = readFileSync("packages/desktop/src/renderer/features/vault/vaultFilters.ts", "utf8");

    expect(filters).toContain("export function filterVaultItems");
    expect(filters).toContain("export function sortVaultItems");
    expect(filters).toContain("export function buildVaultGroups");
    expect(filters).toContain("export function buildVaultSections");
    expect(filters).toContain("export function createVaultListWorkspace");
    expect(featureBarrel).toContain('from "@d2-tools/app"');
    expect(source).toContain("createVaultListWorkspace");
    expect(source).toContain("../features/vault/vaultFilters");
    expect(source).not.toContain("export function filterVaultItems(");
    expect(source).not.toContain("export function sortVaultItems(");
  });
  it("keeps vault cleanup and duplicate planning helpers in the app workspace with desktop compatibility barrels", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");
    const cleanup = readFileSync("packages/desktop/src/renderer/shared/domain/vault/vaultCleanup.ts", "utf8");
    const appCleanup = readFileSync("packages/app/src/workspaces/vaultActions.ts", "utf8");
    const featureBarrel = readFileSync("packages/desktop/src/renderer/features/vault/vaultCleanup.ts", "utf8");

    expect(appCleanup).toContain("export function buildVaultCleanupText");
    expect(appCleanup).toContain("export function buildVaultCleanupLocatorText");
    expect(appCleanup).toContain("export function buildVaultDuplicateSummary");
    expect(appCleanup).toContain("export function buildDuplicateGroupBatchTagPlan");
    expect(appCleanup).toContain("export function selectDuplicateGroupItems");
    expect(cleanup).toContain('from "@d2-tools/app"');
    expect(featureBarrel).toContain("../../shared/domain/vault/vaultCleanup");
    expect(source).toContain("../shared/domain/vault/vaultCleanup");
    expect(cleanup).not.toContain("export function buildVaultCleanupText(");
    expect(cleanup).not.toContain("export function buildDuplicateGroupBatchTagPlan(");
  });
  it("shows a bulk move entry for selected visible vault results", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");
    const hook = readFileSync("packages/desktop/src/renderer/features/vault/useVaultBatchActions.ts", "utf8");
    const organizePanel = readFileSync("packages/desktop/src/renderer/features/vault/VaultOrganizePanel.tsx", "utf8");

    expect(source + hook + organizePanel).toContain("批量移动");
    expect(source).toContain("currentCharacterId");
    expect(source).toContain("runSelectedBulkMove");
    expect(organizePanel).toContain("全选当前结果");
    expect(organizePanel).toContain("追加当前结果");
    expect(organizePanel).toContain("移除当前结果");
    expect(source).toContain("buildVaultSelectionSummary");
  });
  it("keeps vault selection helpers in the app workspace with a desktop compatibility barrel", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");
    const selection = readFileSync("packages/desktop/src/renderer/features/vault/vaultSelection.ts", "utf8");
    const appSelection = readFileSync("packages/app/src/workspaces/vaultSelection.ts", "utf8");

    expect(appSelection).toContain("export function getVaultSelectionItemKey");
    expect(appSelection).toContain("export function selectVaultBatchItems");
    expect(appSelection).toContain("export function applyVisibleVaultSelection");
    expect(appSelection).toContain("export function buildVaultSelectionSummary");
    expect(selection).toContain('from "@d2-tools/app"');
    expect(source).toContain("../features/vault/vaultSelection");
    expect(source).not.toContain("export function selectVaultBatchItems(");
    expect(source).not.toContain("export function applyVisibleVaultSelection(");
    expect(source).not.toContain("export function buildVaultSelectionSummary(");
  });
  it("keeps vault batch action state and write orchestration in the vault feature hook", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");
    const hook = readFileSync("packages/desktop/src/renderer/features/vault/useVaultBatchActions.ts", "utf8");

    expect(hook).toContain("export function useVaultBatchActions");
    expect(hook).toContain("applyBatchTag");
    expect(hook).toContain("runSelectedBulkMove");
    expect(hook).toContain("copyCleanupList");
    expect(hook).toContain("runCleanupAction");
    expect(hook).toContain("applyDuplicateGroupTags");
    expect(hook).toContain("mergeSelectedKeys");
    expect(source).toContain("useVaultBatchActions");
    expect(source).not.toContain("async function applyBatchTag");
    expect(source).not.toContain("async function runSelectedBulkMove");
    expect(source).not.toContain("async function copyCleanupList");
    expect(source).not.toContain("async function runCleanupAction");
    expect(source).not.toContain("async function applyDuplicateGroupTags");
  });
  it("keeps vault list item rendering in the vault feature module", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");
    const listItemPath = "packages/desktop/src/renderer/features/vault/VaultListItem.tsx";
    const itemSections = readFileSync("packages/desktop/src/renderer/features/vault/VaultItemSections.tsx", "utf8");

    expect(existsSync(listItemPath)).toBe(true);
    const listItem = readFileSync(listItemPath, "utf8");

    expect(source).toContain("../features/vault/VaultItemSections");
    expect(itemSections).toContain("./VaultListItem");
    expect(source).not.toContain("function VaultListItem(");
    expect(listItem).toContain("export function VaultListItem");
    expect(listItem).toContain("formatVaultItemMeta");
    expect(listItem).toContain("formatCommunityPerkPreview");
  });
  it("renders vault items as card-grid equipment tiles", () => {
    const itemSections = readFileSync("packages/desktop/src/renderer/features/vault/VaultItemSections.tsx", "utf8");
    const listItem = readFileSync("packages/desktop/src/renderer/features/vault/VaultListItem.tsx", "utf8");
    const styles = readFileSync("packages/desktop/src/renderer/styles.css", "utf8");

    expect(itemSections).toContain("vault-card-grid");
    expect(itemSections).not.toContain("className=\"vault-list\"");
    expect(listItem).toContain("vault-item-card");
    expect(listItem).toContain("vault-card-visual");
    expect(listItem).toContain("vault-card-body");
    expect(listItem).toContain("vault-card-meta");
    expect(listItem).toContain("vault-card-signals");
    expect(listItem).toContain("vault-card-actions");
    expect(styles).toContain(".vault-card-grid");
    expect(styles).toContain(".vault-item-card");
    expect(styles).toContain(".vault-card-actions");
  });
  it("limits initial vault card rendering and lets users load more results", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");
    const itemSections = readFileSync("packages/desktop/src/renderer/features/vault/VaultItemSections.tsx", "utf8");
    const listItem = readFileSync("packages/desktop/src/renderer/features/vault/VaultListItem.tsx", "utf8");
    const duplicateGroups = readFileSync("packages/desktop/src/renderer/features/vault/VaultDuplicateGroups.tsx", "utf8");

    expect(source).toContain("useCallback");
    expect(source).toContain("const toggleSelected = useCallback");
    expect(itemSections).toContain("INITIAL_VAULT_RENDER_LIMIT = 200");
    expect(itemSections).toContain("VAULT_RENDER_INCREMENT = 200");
    expect(itemSections).toContain("isSearchActive");
    expect(itemSections).toContain("props.isSearchActive ? totalItemCount : visibleItemLimit");
    expect(itemSections).toContain("visibleItemLimit");
    expect(itemSections).toContain("renderedSections");
    expect(itemSections).toContain("加载更多");
    expect(itemSections).toContain("先显示");
    expect(listItem).toContain("memo(");
    expect(duplicateGroups).toContain("INITIAL_DUPLICATE_GROUP_RENDER_LIMIT");
    expect(duplicateGroups).toContain("visibleGroupLimit");
    expect(duplicateGroups).toContain("renderedGroups");
    expect(duplicateGroups).toContain("itemByKey");
    expect(duplicateGroups).toContain("加载更多");
  });
  it("keeps cleanup workbench focused and removes the nested duplicate compare switch", () => {
    const vaultPanel = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");
    const organizePanel = readFileSync("packages/desktop/src/renderer/features/vault/VaultOrganizePanel.tsx", "utf8");

    expect(vaultPanel).toContain('{ key: "duplicates", label: "同名对比"');
    expect(organizePanel).not.toContain("同名对比 {props.duplicateGroupCount}");
    expect(organizePanel).not.toContain("onViewModeChange");
    expect(organizePanel).not.toContain("duplicateGroupCount");
  });
  it("renders extended local tag actions for farming and loadout use", () => {
    const coreTags = readFileSync("packages/core/src/vault/tags.ts", "utf8");
    const apiTypes = readFileSync("packages/desktop/src/renderer/api/vaultApi.ts", "utf8");
    const filters = readFileSync("packages/app/src/workspaces/vaultList.ts", "utf8");
    const listItem = readFileSync("packages/desktop/src/renderer/features/vault/VaultListItem.tsx", "utf8");
    const organizePanel = readFileSync("packages/desktop/src/renderer/features/vault/VaultOrganizePanel.tsx", "utf8");
    const selection = readFileSync("packages/desktop/src/renderer/features/vault/vaultSelection.ts", "utf8");
    const styles = readFileSync("packages/desktop/src/renderer/styles.css", "utf8");

    expect(coreTags).toContain('"farm"');
    expect(coreTags).toContain('"loadout"');
    expect(apiTypes).toContain('"farm"');
    expect(apiTypes).toContain('"loadout"');
    expect(filters).toContain('farm: "待刷"');
    expect(filters).toContain('loadout: "配装用"');
    expect(filters).toContain('value === "farm"');
    expect(filters).toContain('value === "loadout"');
    expect(selection).toContain('from "@d2-tools/app"');
    expect(readFileSync("packages/app/src/workspaces/vaultSelection.ts", "utf8")).toContain('"farm"');
    expect(readFileSync("packages/app/src/workspaces/vaultSelection.ts", "utf8")).toContain('"loadout"');
    expect(listItem).toContain('onSaveTag(props.item, "farm")');
    expect(listItem).toContain('onSaveTag(props.item, "loadout")');
    expect(organizePanel).toContain('onBatchSelectionChange("farm")');
    expect(organizePanel).toContain('onBatchSelectionChange("loadout")');
    expect(organizePanel).toContain('onApplyBatchTag("farm")');
    expect(organizePanel).toContain('onApplyBatchTag("loadout")');
    expect(styles).toContain(".vault-tag-current.tag-farm");
    expect(styles).toContain(".vault-tag-current.tag-loadout");
  });
  it("shows local loadout highlights inside the vault list", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");
    const listItem = readFileSync("packages/desktop/src/renderer/features/vault/VaultListItem.tsx", "utf8");

    expect(source).toContain("highlightedItemKeys");
    expect(listItem).toContain("isLoadoutMatch");
    expect(listItem).toContain("loadout-template-badge");
    expect(listItem).toContain("方案命中");
  });
});
