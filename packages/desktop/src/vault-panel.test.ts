import { describe, expect, it } from "vitest";
import { buildVaultGroups, filterVaultItems, getVaultItemKey, sortVaultItems } from "./renderer/components/VaultPanel";
import type { AccountItemSummary, VaultTags } from "./renderer/api/client";

const items: AccountItemSummary[] = [
  {
    hash: 1,
    instance_id: "a",
    name: "Riskrunner",
    item_type: "Submachine Gun",
    tier: "Exotic",
    bucket_name: "能量武器",
    group_key: "weapons"
  },
  {
    hash: 2,
    instance_id: "b",
    name: "Helmet A",
    item_type: "Helmet",
    tier: "Legendary",
    bucket_name: "头盔",
    group_key: "armor"
  },
  {
    hash: 3,
    instance_id: "c",
    name: "Vehicle A",
    item_type: "Vehicle",
    tier: "Exotic",
    bucket_name: "载具",
    group_key: "equipment"
  }
];

describe("vault panel helpers", () => {
  it("filters vault items by group and text", () => {
    expect(filterVaultItems(items, { group: "all", query: "risk" }).map((item) => item.name))
      .toEqual(["Riskrunner"]);
    expect(filterVaultItems(items, { group: "armor", query: "" }).map((item) => item.name))
      .toEqual(["Helmet A"]);
    expect(filterVaultItems(items, { group: "all", query: "异域" }).map((item) => item.name))
      .toEqual(["Riskrunner", "Vehicle A"]);
  });

  it("filters vault items by local tag", () => {
    const tags: VaultTags = {
      items: {
        a: { tag: "keep" },
        b: { tag: "junk" }
      }
    };

    expect(filterVaultItems(items, { group: "all", query: "", tag: "keep", tags }).map((item) => item.name))
      .toEqual(["Riskrunner"]);
    expect(filterVaultItems(items, { group: "all", query: "", tag: "untagged", tags }).map((item) => item.name))
      .toEqual(["Vehicle A"]);
  });

  it("uses instance id as the stable vault tag key before falling back to hash", () => {
    expect(getVaultItemKey(items[0])).toBe("a");
    expect(getVaultItemKey({ ...items[0], instance_id: undefined })).toBe("hash:1");
  });

  it("builds stable vault groups with counts", () => {
    expect(buildVaultGroups(items)).toEqual([
      { key: "all", label: "全部", count: 3 },
      { key: "weapons", label: "武器", count: 1 },
      { key: "armor", label: "护甲", count: 1 },
      { key: "equipment", label: "装备", count: 1 },
      { key: "other", label: "其他", count: 0 }
    ]);
  });

  it("sorts vault items by name, group, and tier", () => {
    expect(sortVaultItems(items, "name").map((item) => item.name))
      .toEqual(["Helmet A", "Riskrunner", "Vehicle A"]);
    expect(sortVaultItems(items, "group").map((item) => item.name))
      .toEqual(["Riskrunner", "Helmet A", "Vehicle A"]);
    expect(sortVaultItems(items, "tier").map((item) => item.name))
      .toEqual(["Riskrunner", "Vehicle A", "Helmet A"]);
  });
});
