import { describe, expect, it } from "vitest";
import {
  buildVaultCleanupText,
  buildVaultDuplicateSummary,
  buildVaultGroups,
  buildVaultSections,
  filterVaultItems,
  getVaultItemKey,
  scoreVaultItemForDisplay,
  selectMarkedCleanupItems,
  selectVaultBatchItems,
  sortVaultItems
} from "./renderer/components/VaultPanel";
import type { AccountItemSummary, VaultTags } from "./renderer/api/client";
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
    power: 1990,
    locked: true
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
  it("shows advanced search syntax in the vault UI copy", () => {
    const source = readFileSync("packages/desktop/src/renderer/components/VaultPanel.tsx", "utf8");

    expect(source).toContain("tag:junk");
    expect(source).toContain("locked:false");
    expect(source).toContain("score&gt;=75");
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

    expect(text).toContain("d2-service 仓库清理清单");
    expect(text).toContain("Vehicle A");
    expect(text).toContain("clean duplicate vehicle");
    expect(text).toContain("可清理");
    expect(text).toContain("本地标记为可清理");
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
});
