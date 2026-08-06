import { describe, expect, it } from "vitest";
import type { ItemSearchResult, PerkSearchResult } from "../src/renderer/api/types";
import {
  buildLibraryEquipmentFilterOptions,
  classifyLibraryDropAccess,
  defaultLibraryEquipmentFilter,
  defaultLibraryPerkFilter,
  filterLibraryEquipmentItems,
  filterLibraryPerks,
  groupLibraryDropQueryItems,
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
    name: "Multimach CCX",
    description: "Iron Banner SMG",
    item_type: "Submachine Gun",
    tier: "Legendary",
    group_key: "weapons",
    bucket_name: "Kinetic Weapons",
    ammo_type: "primary",
    source: { status: "ready", label: "Source", description: "Iron Banner rotation" },
    perks: [{ socket_index: 0, plugs: [{ hash: 20, name: "Kinetic Tremors", description: "" }] }]
  },
  {
    hash: 3,
    name: "Old Cannon",
    description: "Archived hand cannon",
    item_type: "Hand Cannon",
    tier: "Legendary",
    group_key: "weapons",
    bucket_name: "Energy Weapons",
    ammo_type: "primary",
    source: { status: "ready", label: "Source", description: "No longer available" }
  },
  {
    hash: 4,
    name: "Unknown Rifle",
    description: "Missing source rifle",
    item_type: "Auto Rifle",
    tier: "Legendary",
    group_key: "weapons",
    bucket_name: "Kinetic Weapons",
    ammo_type: "primary",
    source: { status: "missing", label: "Source", description: "Manifest missing source" }
  }
];

const perks: PerkSearchResult[] = [
  {
    key: "perk:101",
    hash: 101,
    hashes: [101],
    name: "Voltshot",
    description: "Reload after a kill to overcharge the next shot.",
    related_count: 2,
    related_groups: ["weapons", "armor"]
  },
  {
    key: "perk:102",
    hash: 102,
    hashes: [102],
    name: "Firefly",
    description: "Precision final blows increase reload speed.",
    related_count: 0,
    related_groups: []
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
      frame: [],
      sourceStatus: "all",
      perkPool: "all",
      dropAccess: "all",
      perkQuery: ""
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
      frame: ["lightweight-frame"],
      sourceStatus: "all",
      perkPool: "all",
      dropAccess: "all",
      perkQuery: ""
    };

    expect(filterLibraryEquipmentItems(items, filter).map((item) => item.name)).toEqual(["Riskrunner"]);
    expect(filterLibraryEquipmentItems(items, { ...filter, frame: ["high-impact-frame"] })).toEqual([]);
  });

  it("builds stable equipment dropdown options from manifest-backed fields", () => {
    const options = buildLibraryEquipmentFilterOptions(items);

    expect(options.groups.map((option) => option.value)).toEqual(["all", "weapons"]);
    expect(options.buckets.map((option) => option.value)).toEqual(["all", "Energy Weapons", "Kinetic Weapons"]);
    expect(options.ammo.map((option) => option.value)).toEqual(["all", "primary"]);
    expect(options.frames.map((option) => option.value)).toEqual(["all", "lightweight-frame"]);
  });

  it("filters equipment with drop query advanced controls and groups by access state", () => {
    const baseFilter: LibraryEquipmentFilter = {
      ...defaultLibraryEquipmentFilter,
      group: "weapons",
      sourceStatus: "ready",
      perkPool: "yes"
    };

    expect(filterLibraryEquipmentItems(items, baseFilter).map((item) => item.name)).toEqual([
      "Riskrunner",
      "Multimach CCX"
    ]);
    expect(filterLibraryEquipmentItems(items, { ...baseFilter, dropAccess: "rotation" }).map((item) => item.name))
      .toEqual(["Multimach CCX"]);
    expect(filterLibraryEquipmentItems(items, { ...baseFilter, perkQuery: "arc conductor" }).map((item) => item.name))
      .toEqual(["Riskrunner"]);
    expect(filterLibraryEquipmentItems(items, { ...defaultLibraryEquipmentFilter, sourceStatus: "missing" }).map((item) => item.name))
      .toEqual(["Unknown Rifle"]);

    expect(classifyLibraryDropAccess(items[0])).toBe("available");
    expect(classifyLibraryDropAccess(items[1])).toBe("rotation");
    expect(classifyLibraryDropAccess(items[2])).toBe("archived");
    expect(classifyLibraryDropAccess(items[3])).toBe("unknown");
    expect(groupLibraryDropQueryItems(items).map((group) => [group.key, group.items.map((item) => item.name)])).toEqual([
      ["available", ["Riskrunner"]],
      ["rotation", ["Multimach CCX"]],
      ["archived", ["Old Cannon"]],
      ["unknown", ["Unknown Rifle"]]
    ]);
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
      ownership: "all",
      tier: "all",
      bucket: "all",
      ammo: "all",
      frame: [],
      sourceStatus: "all",
      perkPool: "all",
      dropAccess: "all",
      perkQuery: ""
    });

    expect(defaultLibraryPerkFilter).toEqual({
      query: "",
      relatedGroup: "all",
      hasRelatedItems: "all"
    });
  });
});
