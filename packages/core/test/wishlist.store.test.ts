import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { clearDimWishlist, loadDimWishlist, saveDimWishlist } from "../src/analysis/wishlistStore.js";

describe("DIM wishlist store", () => {
  it("persists imported DIM wishlist rules in the local data directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-wishlist-"));

    const saved = saveDimWishlist(dir, {
      title: "Community Picks",
      rules: [
        { item_hash: 123, perk_hashes: [11, 22], mode: "pve", note: "PVE clear" }
      ]
    });

    expect(saved.title).toBe("Community Picks");
    expect(loadDimWishlist(dir)).toEqual(saved);
  });

  it("clears persisted DIM wishlist rules", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-wishlist-"));

    saveDimWishlist(dir, {
      title: "Temporary Picks",
      rules: [
        { item_hash: 456, perk_hashes: [33, 44], mode: "pvp", note: "PVP duels" }
      ]
    });

    clearDimWishlist(dir);

    expect(loadDimWishlist(dir)).toBeNull();
  });
});
