import { describe, expect, it } from "vitest";
import { parseDimWishlist } from "../src/analysis/wishlistImport.js";

describe("DIM wishlist import", () => {
  it("parses DIM wishlist notes into PvE/PvP perk rules", () => {
    const wishlist = parseDimWishlist([
      "title:Community Picks",
      "dimwishlist:item=123&perks=11,22#notes:PVE 清怪",
      "dimwishlist:item=123&perks=33,44#notes:PVP 手感",
      "// ignored"
    ].join("\n"));

    expect(wishlist.title).toBe("Community Picks");
    expect(wishlist.rules).toEqual([
      { item_hash: 123, perk_hashes: [11, 22], mode: "pve", note: "PVE 清怪" },
      { item_hash: 123, perk_hashes: [33, 44], mode: "pvp", note: "PVP 手感" }
    ]);
  });
});
