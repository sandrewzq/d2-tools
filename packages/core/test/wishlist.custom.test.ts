import { describe, expect, it } from "vitest";
import { evaluateWishlistRoll } from "../src/analysis/wishlist.js";
import type { AccountItemSummary } from "../src/account/summary.js";
import type { DimWishlist } from "../src/analysis/wishlistImport.js";

describe("custom DIM wishlist matching", () => {
  it("matches imported DIM rules by item hash and socket perk hashes", () => {
    const wishlist: DimWishlist = {
      title: "Team Picks",
      rules: [
        { item_hash: 9001, perk_hashes: [101, 202], mode: "pve", note: "Boss DPS" }
      ]
    };

    const result = evaluateWishlistRoll(item({
      hash: 9001,
      socket_plugs: [
        { hash: 101, name: "Perk A" },
        { hash: 202, name: "Perk B" }
      ]
    }), wishlist);

    expect(result.matched).toBe(true);
    expect(result.labels).toContain("DIM Wishlist");
    expect(result.reasons.join(" ")).toContain("Boss DPS");
    expect(result.disclaimer).toContain("DIM");
  });

  it("does not match imported DIM rules for the wrong perk combination", () => {
    const wishlist: DimWishlist = {
      title: "Team Picks",
      rules: [
        { item_hash: 9001, perk_hashes: [101, 202], mode: "pve", note: "Boss DPS" }
      ]
    };

    const result = evaluateWishlistRoll(item({
      hash: 9001,
      socket_plugs: [
        { hash: 101, name: "Perk A" },
        { hash: 303, name: "Perk C" }
      ]
    }), wishlist);

    expect(result.reasons.join(" ")).not.toContain("Boss DPS");
  });
});

function item(overrides: Partial<AccountItemSummary>): AccountItemSummary {
  return {
    hash: 1,
    instance_id: "item-1",
    name: "Test Weapon",
    group_key: "weapons",
    tier: "Legendary",
    socket_plugs: [],
    ...overrides
  };
}
