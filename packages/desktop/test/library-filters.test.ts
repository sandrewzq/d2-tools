import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ItemSearchResult, PerkSearchResult } from "../src/renderer/api/client";
import {
  buildLibraryEquipmentFilterOptions,
  defaultLibraryEquipmentFilter,
  defaultLibraryPerkFilter,
  filterLibraryEquipmentItems,
  filterLibraryPerks,
  type LibraryEquipmentFilter,
  type LibraryPerkFilter
} from "../src/renderer/utils/libraryFilters";

const items: ItemSearchResult[] = [
  {
    hash: 1,
    name: "Riskrunner",
    description: "Arc exotic SMG",
    item_type: "Submachine Gun",
    tier: "Exotic",
    group_key: "weapons",
    bucket_name: "Energy Weapons",
    ammo_type: "primary",
    weapon_frame: {
      key: "lightweight-frame",
      name: "Lightweight Frame"
    },
    source: { status: "ready", label: "Source", description: "World drop" },
    perks: [{ socket_index: 0, plugs: [{ hash: 10, name: "Arc Conductor", description: "" }] }]
  },
  {
    hash: 2,
    name: "Helmet",
    description: "Legendary armor",
    item_type: "Helmet",
    tier: "Legendary",
    group_key: "armor",
    bucket_name: "Helmet",
    source: { status: "ready", label: "Source", description: "Vendor" }
  },
  {
    hash: 3,
    name: "Ghost Shell",
    description: "Cosmetic gear",
    item_type: "Ghost",
    tier: "Legendary",
    group_key: "equipment",
    bucket_name: "Ghost",
    source: { status: "ready", label: "Source", description: "Season pass" }
  }
];

const perks: PerkSearchResult[] = [
  {
    hash: 101,
    name: "Voltshot",
    description: "Reload after a kill to overcharge the next shot.",
    related_items: [
      { hash: 1, name: "Riskrunner", group_key: "weapons" },
      { hash: 2, name: "Helmet", group_key: "armor" }
    ]
  },
  {
    hash: 102,
    name: "Firefly",
    description: "Precision final blows increase reload speed.",
    related_items: []
  }
];

describe("library filters", () => {
  it("filters equipment results with item-specific dropdown fields", () => {
    const filter: LibraryEquipmentFilter = {
      query: "risk",
      group: "weapons",
      tier: "Exotic",
      bucket: "Energy Weapons",
      ammo: "primary",
      frame: []
    };

    expect(filterLibraryEquipmentItems(items, filter).map((item) => item.name)).toEqual(["Riskrunner"]);
    expect(filterLibraryEquipmentItems(items, { ...filter, ammo: "special" })).toEqual([]);
  });

  it("filters equipment results by weapon frame", () => {
    const filter: LibraryEquipmentFilter = {
      query: "",
      group: "weapons",
      tier: "all",
      bucket: "all",
      ammo: "all",
      frame: ["lightweight-frame"]
    };

    expect(filterLibraryEquipmentItems(items, filter).map((item) => item.name)).toEqual(["Riskrunner"]);
    expect(filterLibraryEquipmentItems(items, { ...filter, frame: ["high-impact-frame"] })).toEqual([]);
  });

  it("builds stable equipment dropdown options from manifest-backed fields", () => {
    const options = buildLibraryEquipmentFilterOptions(items);

    expect(options.groups.map((option) => option.value)).toEqual(["all", "weapons", "armor", "equipment"]);
    expect(options.buckets.map((option) => option.value)).toEqual(["all", "Energy Weapons", "Helmet", "Ghost"]);
    expect(options.ammo.map((option) => option.value)).toEqual(["all", "primary"]);
    expect(options.frames.map((option) => option.value)).toEqual(["all", "lightweight-frame"]);
  });

  it("filters perk results with perk-specific related item controls", () => {
    const filter: LibraryPerkFilter = {
      query: "volt",
      relatedGroup: "weapons",
      hasRelatedItems: "yes"
    };

    expect(filterLibraryPerks(perks, filter).map((perk) => perk.name)).toEqual(["Voltshot"]);
    expect(filterLibraryPerks(perks, { ...filter, relatedGroup: "equipment" })).toEqual([]);
    expect(filterLibraryPerks(perks, { ...defaultLibraryPerkFilter, hasRelatedItems: "no" }).map((perk) => perk.name))
      .toEqual(["Firefly"]);
  });

  it("keeps separate defaults for equipment mode and perk mode", () => {
    expect(defaultLibraryEquipmentFilter).toEqual({
      query: "",
      group: "all",
      tier: "all",
      bucket: "all",
      ammo: "all",
      frame: []
    });

    expect(defaultLibraryPerkFilter).toEqual({
      query: "",
      relatedGroup: "all",
      hasRelatedItems: "all"
    });
  });

  it("renders dedicated tabs and mode-specific filter copy in the library page", () => {
    const homePage = readFileSync("packages/desktop/src/renderer/pages/HomePage.tsx", "utf8");

    expect(homePage).toContain("libraryViewMode");
    expect(homePage).toContain('value="equipment"');
    expect(homePage).toContain('value="perks"');
    expect(homePage).toContain("relatedGroup");
    expect(homePage).toContain("libraryEquipmentFilter.frame");
    expect(homePage).not.toContain("hasPerks");
  });
});
