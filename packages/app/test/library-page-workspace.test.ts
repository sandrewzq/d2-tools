import { describe, expect, it } from "vitest";
import {
  defaultLibraryEquipmentFilter,
  defaultLibraryPerkFilter,
  normalizeLibraryPerkSearchPayload,
  selectLibraryPageModel,
  type ItemSearchResult,
  type LibraryPageCache,
  type LibraryPageState,
  type PerkSearchResult
} from "../src/workspaces/libraryPage";

const equipmentItems: ItemSearchResult[] = [
  {
    hash: 1,
    name: "Riskrunner",
    description: "Arc exotic SMG",
    item_type: "Submachine Gun",
    tier: "Exotic",
    group_key: "weapons",
    bucket_name: "Energy Weapons",
    ammo_type: "primary",
    weapon_frame: { key: "lightweight-frame", name: "Lightweight Frame" },
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

const perkItems: PerkSearchResult[] = [
  {
    key: "perk:101",
    hash: 101,
    hashes: [101],
    name: "Voltshot",
    description: "Reload after a kill to overcharge the next shot.",
    related_count: 2,
    related_groups: ["weapons"]
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

function createCache(patch: Partial<LibraryPageCache> = {}): LibraryPageCache {
  return {
    items: equipmentItems,
    perks: perkItems,
    perkRelatedEquipment: {
      "perk:101": {
        items: [
          equipmentItems[0],
          { ...equipmentItems[0], hash: 4, name: "Stormchaser" }
        ],
        total: 2,
        hasMore: false,
        isLoading: false,
        isLoaded: true,
        error: ""
      }
    },
    libraryHistory: {
      recent: [{ hash: 1, name: "Riskrunner" }],
      favorites: [{ hash: 1, name: "Riskrunner" }]
    },
    libraryCommunityMatch: new Map([[1, { available: 2, sample_perks: [{ name: "Voltshot" }] }]]),
    liveAvailability: {
      account_scope: "character",
      items: {
        "1": {
          status: "character_vendor",
          label: "当前角色商人售卖",
          description: "Ada-1",
          sources: [{ kind: "character_vendor", label: "Ada-1", character_id: "char-1" }]
        },
        "2": {
          status: "public_activity",
          label: "公共活动线索",
          description: "Iron Banner",
          sources: [{ kind: "public_activity", label: "Iron Banner" }]
        }
      }
    },
    liveAvailabilityError: "",
    manifestStatus: { initialized: true, version: "mobile_world_sql_content_26.07.01.01" },
    manifestStatusError: "",
    ...patch
  };
}

function createState(patch: Partial<LibraryPageState> = {}): LibraryPageState {
  return {
    libraryViewMode: "equipment",
    equipmentFilters: defaultLibraryEquipmentFilter,
    perkFilters: defaultLibraryPerkFilter,
    equipmentSearchTouched: true,
    perkSearchTouched: false,
    isSearching: false,
    searchError: "",
    aliasDraft: "",
    aliasTargetDraft: "",
    aliasKind: "item",
    aliasMessage: "",
    isLoadingLiveAvailability: false,
    isLoadingManifestStatus: false,
    isInitializingManifest: false,
    itemDetailLoadingKey: "",
    ...patch
  };
}

describe("library page workspace", () => {
  it("normalizes legacy perk search payloads before page selection", () => {
    const normalized = normalizeLibraryPerkSearchPayload([
      {
        hash: 101,
        name: "Voltshot",
        description: "Reload after a kill to overcharge the next shot.",
        related_items: [{ hash: 1, name: "Riskrunner", group_key: "weapons" }]
      }
    ]);

    expect(normalized.perks).toEqual([expect.objectContaining({
      key: "perk:101",
      hashes: [101],
      related_count: 1,
      related_groups: ["weapons"]
    })]);
    expect(normalized.legacyRelatedEquipment["perk:101"]?.items[0]).toEqual(expect.objectContaining({
      hash: 1,
      name: "Riskrunner"
    }));
    expect(() => selectLibraryPageModel(createCache({
      perks: normalized.perks,
      perkRelatedEquipment: normalized.legacyRelatedEquipment
    }), createState({
      libraryViewMode: "perks",
      perkSearchTouched: true
    }))).not.toThrow();
  });

  it("selects equipment result groups with live stats and row state", () => {
    const model = selectLibraryPageModel(createCache(), createState({
      equipmentFilters: {
        ...defaultLibraryEquipmentFilter,
        group: "weapons",
        perkPool: "yes"
      },
      itemDetailLoadingKey: "hash:1"
    }));

    expect(model.queryPanel.viewMode).toBe("equipment");
    expect(model.results.hitCount).toBe(2);
    expect(model.results.equipmentGroups.map((group) => [group.key, group.items.map((item) => item.item.name)])).toEqual([
      ["available", ["Riskrunner"]],
      ["rotation", ["Multimach CCX"]]
    ]);
    expect(model.results.equipmentGroups[0].items[0]).toMatchObject({
      dropAccess: "available",
      isFavorite: true,
      isDetailLoading: true,
      communityMatch: { available: 2 },
      liveEntry: { status: "character_vendor" }
    });
    expect(model.stats.live).toEqual({
      scope: "character",
      characterVendor: 1,
      publicVendor: 0,
      publicActivity: 1
    });
    expect(model.emptyState).toBeNull();
  });

  it("keeps perk related equipment visible in the page model", () => {
    const model = selectLibraryPageModel(createCache(), createState({
      libraryViewMode: "perks",
      equipmentSearchTouched: false,
      perkSearchTouched: true,
      perkFilters: {
        ...defaultLibraryPerkFilter,
        query: "volt",
        relatedGroup: "weapons",
        hasRelatedItems: "yes"
      }
    }));

    expect(model.results.hitCount).toBe(1);
    expect(model.results.perks).toEqual([
      expect.objectContaining({
        perk: expect.objectContaining({ name: "Voltshot" }),
        relatedGroupKeys: ["weapons"],
        relatedItems: [
          expect.objectContaining({ name: "Riskrunner" }),
          expect.objectContaining({ name: "Stormchaser" })
        ],
        relatedCount: 2,
        hasRelatedItems: true
      })
    ]);
  });

  it("keeps same-name versions distinguishable through their visible definition data", () => {
    const duplicateItems: ItemSearchResult[] = [
      {
        ...equipmentItems[0],
        hash: 10,
        name: "天堂暴政",
        release: {
          status: "ready",
          label: "发布版本",
          kind: "season",
          season_hash: 400004,
          season_number: 4,
          year_number: 2,
          name: "锻炉赛季",
          description: "第2年 · 第4赛季 · 锻炉赛季"
        }
      },
      {
        ...equipmentItems[0],
        hash: 11,
        name: "天堂暴政",
        release: {
          status: "ready",
          label: "发布版本",
          kind: "season",
          season_hash: 400021,
          season_number: 21,
          year_number: 6,
          name: "深渊赛季",
          description: "第6年 · 第21赛季 · 深渊赛季"
        }
      }
    ];

    const rows = selectLibraryPageModel(createCache({ items: duplicateItems }), createState())
      .results.equipmentGroups.flatMap((group) => group.items);

    expect(rows).not.toContainEqual(expect.objectContaining({ isSameNameVariant: expect.anything() }));
  });

  it("selects manifest alerts as semantic page state", () => {
    expect(selectLibraryPageModel(
      createCache({ manifestStatus: null, manifestStatusError: "读取失败" }),
      createState()
    ).manifestAlert).toMatchObject({ kind: "error", className: "status-error", error: "读取失败" });

    expect(selectLibraryPageModel(
      createCache({ manifestStatus: { initialized: false } }),
      createState()
    ).manifestAlert).toMatchObject({ kind: "not_initialized", className: "status-warning" });

    expect(selectLibraryPageModel(
      createCache({ manifestStatus: { initialized: true, missing_required_components: ["DestinyInventoryItemDefinition"] } }),
      createState()
    ).manifestAlert).toMatchObject({ kind: "missing_components", className: "status-warning", missingComponentCount: 1 });

    expect(selectLibraryPageModel(
      createCache({ manifestStatus: { initialized: true, version: "old", latest_version: "new", needs_update: true } }),
      createState()
    ).manifestAlert).toMatchObject({ kind: "needs_update", className: "status-warning", version: "old", latestVersion: "new" });
  });

  it("selects empty state from search touch and visible result count", () => {
    expect(selectLibraryPageModel(createCache({ items: [] }), createState({
      equipmentSearchTouched: false
    })).emptyState).toEqual({ kind: "not_searched" });

    expect(selectLibraryPageModel(createCache({ items: [] }), createState({
      equipmentSearchTouched: true
    })).emptyState).toEqual({ kind: "no_results" });
  });
});
