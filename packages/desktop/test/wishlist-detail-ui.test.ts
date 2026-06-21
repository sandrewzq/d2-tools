import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("wishlist detail UI", () => {
  it("renders DIM-style badges and same-name quick actions in the item detail modal", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    expect(homePage).toContain("wishlist-detail-header");
    expect(homePage).toContain("wishlist-mode-badges");
    expect(homePage).toContain("wishlist-detail-badge");
    expect(homePage).toContain("formatWishlistModeLabels");
    expect(homePage).toContain("wishlist-local-tag");
    expect(homePage).toContain("wishlist-same-name-summary");
    expect(homePage).toContain("wishlist-same-name-chip");
    expect(homePage).toContain("wishlist-quick-actions");
    expect(homePage).toContain("saveSelectedItemTag");
    expect(homePage).toContain("copyWishlistInsight");
    expect(homePage).toContain("copySameNameLocator");
    expect(homePage).toContain("buildSameNameSourceStats");
    expect(homePage).toContain("openBestSameNameItem");
    expect(homePage).toContain("applySameNameCurrentKeepTags");
    expect(homePage).toContain("\u540c\u540d\u5171 ");
    expect(homePage).toContain("\u5df2\u88c5\u5907 ");
    expect(homePage).toContain("\u80cc\u5305 ");
    expect(homePage).toContain("\u4ed3\u5e93 ");
    expect(homePage).toContain("\u90ae\u653f\u5b98 ");
  });
});
