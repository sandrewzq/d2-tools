import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { saveDimWishlist } from "../src/analysis/wishlistStore.js";
import {
  createDefaultCommunityPerkService,
  createDimWishlistSource
} from "../src/community-perks/index.js";

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
    const result = await service.getRecommendations(123, { item_name: "Test Weapon" });

    expect(result).not.toBeNull();
    expect(result?.item_hash).toBe(123);
    expect(result?.item_name).toBe("Test Weapon");
    expect(result?.combos).toHaveLength(2);
    expect(result?.combos[0].mode).toBe("pve");
    expect(result?.combos[1].mode).toBe("pvp");
    expect(result?.combos[0].source).toBe("dim_wishlist");
    expect(result?.combos[0].note).toBe("PVE clear");
    expect(result?.matched_modes).toContain("pve");
    expect(result?.matched_modes).toContain("pvp");
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
    const matches = await service.matchVaultItems([
      { hash: 123, socket_plugs: [{ hash: 11 }, { hash: 22 }] },
      { hash: 123, socket_plugs: [{ hash: 11 }, { hash: 33 }] },
      { hash: 123, socket_plugs: [{ hash: 11 }] }
    ]);

    expect(matches.get(123)?.matched).toBe(2);
    expect(matches.get(123)?.modes).toContain("pve");
    expect(matches.get(123)?.modes).toContain("pvp");

    const noMatch = await service.matchVaultItems([
      { hash: 123, socket_plugs: [{ hash: 11 }] }
    ]);
    expect(noMatch.get(123)?.matched).toBe(0);
  });

  it("creates a dim wishlist source that reports availability", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-community-"));
    saveDimWishlist(dir, {
      title: "Available Picks",
      rules: [{ item_hash: 1, perk_hashes: [1], mode: "general", note: "" }]
    });

    const source = createDimWishlistSource(dir);
    expect(source.isAvailable({ data: { data_dir: dir } })).toBe(true);
  });
});
