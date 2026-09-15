import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { saveDimWishlist } from "../../services/src/analysis/wishlistStore.js";
import { CommunityPerkRecommendationService, reduceCombosToColumnPool } from "../src/community-perks/index.js";
import {
  createDefaultCommunityPerkService,
  createDimWishlistSources
} from "../../services/src/community/perkRecommendation.js";
import type { CommunityPerkSource, WeaponRecommendation } from "../src/community-perks/index.js";
import type { DefinitionComponentData } from "../src/manifest/definitions.js";

const itemDefinitions: DefinitionComponentData = {
  "11": {
    hash: 11,
    itemTypeDisplayName: "特性",
    plug: { plugCategoryIdentifier: "frames" },
    displayProperties: {
      name: "电流激荡",
      description: "中文 perk"
    }
  },
  "22": {
    hash: 22,
    itemTypeDisplayName: "特性",
    plug: { plugCategoryIdentifier: "frames" },
    displayProperties: {
      name: "快速连发",
      description: "中文 perk"
    }
  },
  "33": {
    hash: 33,
    itemTypeDisplayName: "特性",
    plug: { plugCategoryIdentifier: "frames" },
    displayProperties: { name: "连锁反应", description: "中文 perk" }
  },
  "44": {
    hash: 44,
    itemTypeDisplayName: "特性",
    plug: { plugCategoryIdentifier: "frames" },
    displayProperties: { name: "金中藏弹", description: "中文 perk" }
  },
  "123": {
    hash: 123,
    displayProperties: {
      name: "测试武器",
      description: "test weapon"
    },
    sockets: {
      socketEntries: [
        { reusablePlugItems: [{ plugItemHash: 11 }, { plugItemHash: 33 }] },
        { reusablePlugItems: [{ plugItemHash: 22 }, { plugItemHash: 44 }] }
      ]
    }
  }
};
const englishItemDefinitions: DefinitionComponentData = {
  "11": {
    hash: 11,
    displayProperties: {
      name: "Voltshot",
      description: "english perk"
    }
  },
  "22": {
    hash: 22,
    displayProperties: {
      name: "Rapid Hit",
      description: "english perk"
    }
  }
};

describe("community perk recommendations", () => {
  it("returns recommendations from a local DIM wishlist", async () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-community-"));
    saveDimWishlist(dir, {
      title: "Test Picks",
      rules: [
        { item_hash: 123, perk_hashes: [11, 22], mode: "pve", note: "PVE clear" },
        { item_hash: 123, perk_hashes: [11, 33], mode: "pvp", note: "" },
        { item_hash: 456, perk_hashes: [44], mode: "general", note: "" }
      ]
    });

    const service = createDefaultCommunityPerkService({ data: { data_dir: dir } });
    const result = await service.getRecommendations(123, { item_name: "Test Weapon", itemDefinitions });

    expect(result).not.toBeNull();
    expect(result?.item_hash).toBe(123);
    expect(result?.item_name).toBe("Test Weapon");
    expect(result?.combos).toHaveLength(0);
    expect(result?.source_records).toHaveLength(2);
    expect(result?.source_records?.[0].requirements.map((requirement) => requirement.slot)).toEqual(["perk1", "perk2"]);
    expect(result?.source_records?.[0].requirements[1].candidates.map((candidate) => candidate.hash).sort()).toEqual([22]);
    expect(result?.matched_modes).toContain("pve");
    expect(result?.matched_modes).toContain("pvp");
    expect(result?.source_label).toBe("Test Picks");
    expect(result?.sample_size).toBe(2);
    expect(result?.individual_perks?.map((perk) => perk.hash)).toEqual([11, 22, 33]);
  });


  it("returns null when no wishlist exists", async () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-community-"));
    const service = createDefaultCommunityPerkService({ data: { data_dir: dir } });
    const result = await service.getRecommendations(123, {});
    expect(result).toBeNull();
  });

  it("returns null when no rules match the requested item", async () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-community-"));
    saveDimWishlist(dir, {
      title: "Test Picks",
      rules: [{ item_hash: 999, perk_hashes: [11], mode: "general", note: "" }]
    });

    const service = createDefaultCommunityPerkService({ data: { data_dir: dir } });
    const result = await service.getRecommendations(123, {});
    expect(result).toBeNull();
  });

  it("matches vault items against community combos", async () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-community-"));
    saveDimWishlist(dir, {
      title: "Test Picks",
      rules: [
        { item_hash: 123, perk_hashes: [11, 22], mode: "pve", note: "" },
        { item_hash: 123, perk_hashes: [11, 33], mode: "pvp", note: "" }
      ]
    });

    const service = createDefaultCommunityPerkService({ data: { data_dir: dir } });
    const matches = await service.matchVaultItemInstances([
      { hash: 123, instance_id: "a", socket_plugs: [{ hash: 11 }, { hash: 22 }] },
      { hash: 123, instance_id: "b", socket_plugs: [{ hash: 11 }, { hash: 33 }] },
      { hash: 123, instance_id: "c", socket_plugs: [{ hash: 11 }] }
    ], { itemDefinitions });
    const dimSources = (index: number) => (matches[index]?.source_matches ?? [])
      .filter((source) => source.source_id.startsWith("dim:"));

    expect(dimSources(0).some((source) => source.matched_requirement_count === 2)).toBe(true);
    expect(dimSources(1).some((source) => source.matched_requirement_count === 1)).toBe(true);
  });


  it.each([
    { curatedMode: "pve" as const, expected: "compare" as const },
    { curatedMode: "pvp" as const, expected: "priority" as const },
    { curatedMode: "general" as const, expected: "compare" as const }
  ])("resolves DIM PVE and curated $curatedMode evidence as $expected", async ({ curatedMode, expected }) => {
    const curated = source("Curated", async () => recommendation({
      matched_modes: [curatedMode],
      source_label: "人工来源",
      source_records: [{
        rule_stable_id: `curated-${curatedMode}`,
        source_id: "aegis",
        source_label: "Aegis推荐",
        purposes: [curatedMode],
        requirements: [{
          slot: "perk1",
          label: "Perk 1",
          candidate_names: ["目标 Perk"],
          candidates: [{ hash: 11, name: "目标 Perk" }],
          unresolved_candidate_names: []
        }]
      }]
    }));
    const dim = source("DIM", async () => recommendation({
      matched_modes: ["pve"],
      source_label: "DIM Wishlist",
      source_records: [{
        rule_stable_id: "dim-pve",
        source_id: "dim:test",
        source_label: "DIM Wishlist",
        purposes: ["pve"],
        requirements: [{
          slot: "perk2",
          label: "Perk 2",
          candidate_names: ["DIM Perk"],
          candidates: [{ hash: 22, name: "DIM Perk" }],
          unresolved_candidate_names: []
        }]
      }]
    }));
    const service = new CommunityPerkRecommendationService([curated, dim]);

    const [match] = await service.matchVaultItemInstances([{
      hash: 123,
      instance_id: "instance-1",
      weapon_roll: {
        fingerprint: "roll-1",
        complete: true,
        incomplete_reasons: [],
        sockets: [
          {
            socket_index: 3,
            slot: "perk1",
            label: "Perk 1",
            current_plug: { hash: 99, name: "其他 Perk", selected: true },
            owned_plugs: [{ hash: 99, name: "其他 Perk", selected: true }],
            complete: true,
            incomplete_reasons: []
          },
          {
            socket_index: 4,
            slot: "perk2",
            label: "Perk 2",
            current_plug: { hash: 22, name: "DIM Perk", selected: true },
            owned_plugs: [{ hash: 22, name: "DIM Perk", selected: true }],
            complete: true,
            incomplete_reasons: []
          }
        ]
      }
    }]);

    expect(match?.recommendation_state).toBe(expected);
    expect(match?.match_status).toBe(expected === "priority" ? "full_match" : "partial_match");
  });

  it("includes english perk previews for vault and library community matches", async () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-community-"));
    saveDimWishlist(dir, {
      title: "Test Picks",
      rules: [
        { item_hash: 123, perk_hashes: [11, 22], mode: "pve", note: "" }
      ]
    });

    const service = createDefaultCommunityPerkService({ data: { data_dir: dir } });
    const matches = await service.matchVaultItems(
      [{ hash: 123, socket_plugs: [{ hash: 11 }, { hash: 22 }] }, { hash: 123 }],
      { itemDefinitions, englishItemDefinitions }
    );

    expect(matches.get(123)?.sample_perks).toEqual([
      expect.objectContaining({ hash: 11, name: "电流激荡", englishName: "Voltshot" }),
      expect.objectContaining({ hash: 22, name: "快速连发", englishName: "Rapid Hit" })
    ]);
    expect(matches.get(123)?.source_label).toBe("Test Picks");
  });

  it("counts a same-named enhanced trait toward a base trait requirement", async () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-community-"));
    // 愿望单要求基础特性 33，武器上装的是同名的强化特征 44。
    saveDimWishlist(dir, {
      title: "Enhanced Picks",
      rules: [{ item_hash: 123, perk_hashes: [33], mode: "pve", note: "" }]
    });
    const definitions: DefinitionComponentData = {
      "33": { hash: 33, itemTypeDisplayName: "特性", plug: { plugCategoryIdentifier: "frames" }, displayProperties: { name: "连锁反应", description: "基础特性" } },
      "44": { hash: 44, itemTypeDisplayName: "强化特征", plug: { plugCategoryIdentifier: "frames" }, displayProperties: { name: "连锁反应", description: "强化特性" } },
      "55": { hash: 55, itemTypeDisplayName: "特性", plug: { plugCategoryIdentifier: "frames" }, displayProperties: { name: "金中藏弹", description: "其它特性" } },
      "123": {
        hash: 123,
        displayProperties: { name: "测试武器", description: "test weapon" },
        sockets: { socketEntries: [{ reusablePlugItems: [{ plugItemHash: 33 }, { plugItemHash: 44 }] }] }
      }
    };
    const service = createDefaultCommunityPerkService({ data: { data_dir: dir } });

    // DIM 来源现在与人工来源同级，结论从来源事实读取。
    const enhanced = await service.matchVaultItemInstances(
      [{ hash: 123, instance_id: "enhanced-1", socket_plugs: [{ hash: 44, name: "连锁反应" }] }],
      { itemDefinitions: definitions }
    );
    const enhancedSource = enhanced[0]?.source_matches?.find((source) => source.source_id.startsWith("dim:"));
    expect(enhancedSource?.state).toBe("full");
    expect(enhancedSource?.slots
      .filter((slot) => slot.state !== "source_not_specified")
      .map((slot) => slot.state)).toEqual(["match"]);

    const unrelated = await service.matchVaultItemInstances(
      [{ hash: 123, instance_id: "other-1", socket_plugs: [{ hash: 55, name: "金中藏弹" }] }],
      { itemDefinitions: definitions }
    );
    const unrelatedSource = unrelated[0]?.source_matches?.find((source) => source.source_id.startsWith("dim:"));
    expect(unrelatedSource?.slots
      .filter((slot) => slot.state !== "source_not_specified")
      .map((slot) => slot.state)).toEqual(["different"]);
  });

  it("reduces DIM combo sets to per-column candidate pools only when lossless", () => {
    // 完整笛卡尔积：2 栏 × 2 栏 → 归约成「每栏任选其一」。
    expect(reduceCombosToColumnPool([
      [{ slot: "barrel", hashes: [1] }, { slot: "perk1", hashes: [10] }],
      [{ slot: "barrel", hashes: [1] }, { slot: "perk1", hashes: [11] }],
      [{ slot: "barrel", hashes: [2] }, { slot: "perk1", hashes: [10] }],
      [{ slot: "barrel", hashes: [2] }, { slot: "perk1", hashes: [11] }]
    ])?.columns.map((column) => ({ slot: column.slot, candidates: column.candidates }))).toEqual([
      { slot: "barrel", candidates: [["1"], ["2"]] },
      { slot: "perk1", candidates: [["10"], ["11"]] }
    ]);

    // 小棒猪式的「前缀展开」：长行是短行的超集，去掉冗余后正好是 1 栏 × 2 栏。
    expect(reduceCombosToColumnPool([
      [{ slot: "perk1", hashes: [10] }, { slot: "perk2", hashes: [20] }, { slot: "perk2", hashes: [21] }],
      [{ slot: "perk1", hashes: [10] }, { slot: "perk2", hashes: [20] }],
      [{ slot: "perk1", hashes: [10] }, { slot: "perk2", hashes: [21] }]
    ])?.columns.map((column) => column.candidates.length)).toEqual([1, 2]);

    // 不是笛卡尔积：各栏种数之积 4 ≠ 3 套组合，必须保留组合语义。
    expect(reduceCombosToColumnPool([
      [{ slot: "perk1", hashes: [10] }, { slot: "perk2", hashes: [20] }],
      [{ slot: "perk1", hashes: [11] }, { slot: "perk2", hashes: [20] }],
      [{ slot: "perk1", hashes: [11] }, { slot: "perk2", hashes: [21] }]
    ])).toBeUndefined();
    // 单套组合没有可归约的空间。
    expect(reduceCombosToColumnPool([[{ slot: "perk1", hashes: [10] }]])).toBeUndefined();
  });


  it("creates a dim wishlist source that reports availability", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-community-"));
    saveDimWishlist(dir, {
      title: "Available Picks",
      rules: [{ item_hash: 1, perk_hashes: [1], mode: "general", note: "" }]
    });

    const source = createDimWishlistSources(dir)[0];
    expect(source.isAvailable({ data: { data_dir: dir } })).toBe(true);
  });

  it("keeps a visible fallback warning when one source fails and another source succeeds", async () => {
    const failingSource = source("社区来源", async () => {
      throw new Error("社区来源查询失败");
    });
    const wishlist = source("DIM Wishlist", async () => recommendation({
      source_label: "DIM Wishlist",
      source_records: [{
        rule_stable_id: "dim-fallback",
        source_id: "dim:test",
        source_label: "DIM Wishlist",
        purposes: ["pve"],
        requirements: [{
          slot: "perk1",
          label: "Perk 1",
          candidate_names: ["Voltshot"],
          candidates: [{ hash: 11, name: "Voltshot" }],
          unresolved_candidate_names: []
        }]
      }]
    }));
    const service = new CommunityPerkRecommendationService([failingSource, wishlist]);

    const result = await service.getRecommendationsWithAllSources(123, { item_name: "Test Weapon" });

    expect(result?.source_records).toHaveLength(1);
    expect(result?.source_warnings).toContain("社区来源 查询失败，已显示 DIM Wishlist 数据。");
  });
});

function recommendation(overrides: Partial<WeaponRecommendation> = {}): WeaponRecommendation {
  return {
    item_hash: 123,
    item_name: "Test Weapon",
    combos: [],
    matched_modes: [],
    ...overrides
  };
}

function source(
  name: string,
  getRecommendations: CommunityPerkSource["getRecommendations"]
): CommunityPerkSource {
  return {
    name,
    isAvailable: () => true,
    getRecommendations
  };
}
