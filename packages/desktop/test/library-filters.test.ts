import { readFileSync } from "node:fs";
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

  it("renders dedicated tabs and mode-specific filter copy in the library page", () => {
    const homePage = readFileSync("packages/desktop/src/renderer/pages/HomePage.tsx", "utf8");
    const homeRoutes = readFileSync("packages/desktop/src/renderer/pages/HomePageRoutes.tsx", "utf8");
    const libraryProvider = readFileSync("packages/desktop/src/renderer/pages/providers/LibraryMenuProvider.tsx", "utf8");
    const libraryPage = readFileSync("packages/desktop/src/renderer/features/library/LibraryPage.tsx", "utf8");
    const libraryView = readFileSync("packages/ui/src/library/LibraryPageView.tsx", "utf8");
    const libraryContent = readFileSync("packages/ui/src/library/LibraryPageContentView.tsx", "utf8");
    const libraryWorkspace = readFileSync("packages/app/src/workspaces/libraryPage.ts", "utf8");

    expect(homePage).toContain("<HomePageRoutes");
    expect(homePage).not.toContain("<LibraryPage");
    expect(homeRoutes).toContain("<LibraryMenuProvider");
    expect(libraryProvider).toContain("<LibraryPage");
    expect(homePage).not.toContain("function renderSearchPanel");
    expect(libraryPage).toContain("export function LibraryPage");
    expect(libraryPage).toContain("selectLibraryPageModel");
    expect(libraryPage).toContain("LibraryPageContentView");
    expect(libraryPage).toContain("cache: LibraryPageCache");
    expect(libraryPage).toContain("state: LibraryPageState");
    expect(libraryPage).toContain("actions: LibraryPageActions");
    expect(libraryContent).toContain("ProductWorkspaceSplit");
    expect(libraryContent).toContain("model.queryPanel.viewMode");
    expect(libraryContent).toContain('value="equipment"');
    expect(libraryContent).toContain('value="perks"');
    expect(libraryContent).toContain("library-search-command");
    expect(libraryContent).toContain("library-main-filter-row");
    expect(libraryContent).toContain("relatedGroup");
    expect(libraryContent).toContain("libraryEquipmentFilter.frame");
    expect(libraryContent).not.toContain("hasPerks");
    expect(libraryContent).toContain("formatCommunityPerkPreview");
    expect(libraryWorkspace).toContain("communityMatch: input.communityMatch.get(item.hash)");
    expect(libraryContent).toContain("const communityMatch = row.communityMatch");
    expect(libraryContent).toContain("communityMatch?.available");
  });

  it("renders a manifest-backed and live drop query workflow for equipment results", () => {
    const libraryContent = readFileSync("packages/ui/src/library/LibraryPageContentView.tsx", "utf8");

    expect(libraryContent).toContain("drop-query-panel");
    expect(libraryContent).toContain("掉落查询");
    expect(libraryContent).toContain("可确认来源");
    expect(libraryContent).toContain("Perk 池");
    expect(libraryContent).toContain("掉落来源");
    expect(libraryContent).toContain("来源状态");
    expect(libraryContent).toContain("item.source.status");
    expect(libraryContent).toContain("item.perks");
    expect(libraryContent).toContain("drop-query-advanced");
    expect(libraryContent).toContain("来源状态筛选");
    expect(libraryContent).toContain("来源线索");
    expect(libraryContent).toContain("只看有 Perk 池");
    expect(libraryContent).toContain("Perk AND 条件");
    expect(libraryContent).toContain("drop-query-groups");
    expect(libraryContent).toContain("来源可确认");
    expect(libraryContent).toContain("实时商人与公共活动优先");
    expect(libraryContent).toContain("没有证据时明确标记为待补");
    expect(libraryContent).toContain("刷取判断");
    expect(libraryContent).toContain("实时状态");
    expect(libraryContent).toContain("liveAvailability");
    expect(libraryContent).toContain("当前角色商人售卖");
    expect(libraryContent).toContain("当前公开商人售卖");
    expect(libraryContent).toContain("等轮换");
    expect(libraryContent).toContain("已下架或待确认");
    expect(libraryContent).toContain("library-weapon-card");
  });

  it("passes plug set definitions into perk search related item lookup", () => {
    const libraryIpc = readFileSync("packages/desktop/src/main/ipc/library.ts", "utf8");
    const perkHandler = libraryIpc.slice(
      libraryIpc.indexOf('ipcMain.handle("items:perks:search"'),
      libraryIpc.indexOf('ipcMain.handle("items:live-availability"')
    );

    expect(perkHandler).toContain("DestinyPlugSetDefinition");
    expect(perkHandler).toContain("plugSetDefinitions");
    expect(perkHandler).toContain("plugSetDefinitions: plugSetDefinitions ?? undefined");
  });
});
