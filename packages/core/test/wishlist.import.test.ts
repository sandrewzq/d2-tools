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
    // `line_number` 是解析器给导入期校验指回原文件用的（第 3 行是 `// ignored`，不进规则表）。
    expect(wishlist.rules).toEqual([
      { item_hash: 123, perk_hashes: [11, 22], mode: "pve", note: "PVE 清怪", line_number: 2 },
      { item_hash: 123, perk_hashes: [33, 44], mode: "pvp", note: "PVP 手感", line_number: 3 }
    ]);
  });

  it("keeps empty perk rules as weapon-only matches", () => {
    const wishlist = parseDimWishlist("dimwishlist:item=123&perks=");

    expect(wishlist.rules).toEqual([
      { item_hash: 123, perk_hashes: [], kind: "weapon_only", mode: "general", note: "", line_number: 1 }
    ]);
  });
});
