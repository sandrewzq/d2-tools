import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("wishlist detail UI", () => {
  it("renders DIM-style badges and same-name quick actions in the item detail modal", () => {
    const itemDetailModal = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "components", "ItemDetailModal.tsx"),
      "utf8"
    );

    expect(itemDetailModal).toContain("wishlist-detail-header");
    expect(itemDetailModal).toContain("wishlist-mode-badges");
    expect(itemDetailModal).toContain("wishlist-detail-badge");
    expect(itemDetailModal).toContain("formatWishlistModeLabels");
    expect(itemDetailModal).toContain("wishlist-local-tag");
    expect(itemDetailModal).toContain("wishlist-same-name-summary");
    expect(itemDetailModal).toContain("wishlist-same-name-chip");
    expect(itemDetailModal).toContain("wishlist-quick-actions");
    expect(itemDetailModal).toContain("onSaveSelectedItemTag");
    expect(itemDetailModal).toContain("onCopyWishlistInsight");
    expect(itemDetailModal).toContain("onCopySameNameLocator");
    expect(itemDetailModal).toContain("buildSameNameSourceStats");
    expect(itemDetailModal).toContain("onOpenBestSameNameItem");
    expect(itemDetailModal).toContain("onApplySameNameCurrentKeepTags");
    expect(itemDetailModal).toContain("\u540c\u540d\u5171 ");
    expect(itemDetailModal).toContain("\u5df2\u88c5\u5907 ");
    expect(itemDetailModal).toContain("\u80cc\u5305 ");
    expect(itemDetailModal).toContain("\u4ed3\u5e93 ");
    expect(itemDetailModal).toContain("\u90ae\u653f\u5b98 ");
  });

  it("renders community recommendation trust signals and queries all detail sources", () => {
    const itemDetailModal = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "components", "ItemDetailModal.tsx"),
      "utf8"
    );
    const communityIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "community.ts"), "utf8");

    expect(communityIpc).toContain("getRecommendationsWithAllSources");
    expect(itemDetailModal).toContain("source_warnings");
    expect(itemDetailModal).toContain("ai_analysis");
    expect(itemDetailModal).toContain("source-status-list source-status-warning");
    expect(itemDetailModal).toContain("AI 原始分析");
  });

  it("keeps detail modal information before notes and write actions", () => {
    const itemDetailModal = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "components", "ItemDetailModal.tsx"),
      "utf8"
    );

    const armorIndex = itemDetailModal.indexOf('className="modal-perk-group armor-stat-panel"');
    const actualRollIndex = itemDetailModal.indexOf("<h3>实际 Roll</h3>");
    const perkPoolIndex = itemDetailModal.indexOf('className="modal-perks"');
    const communityIndex = itemDetailModal.indexOf('className="community-recommendations-panel"');
    const aiRawIndex = itemDetailModal.indexOf("community-ai-analysis");
    const sameNameIndex = itemDetailModal.indexOf("<h3>同名对比</h3>");
    const noteIndex = itemDetailModal.indexOf('className="item-note-panel"');
    const actionIndex = itemDetailModal.indexOf('className="item-action-panel"');

    expect(armorIndex).toBeGreaterThanOrEqual(0);
    expect(actualRollIndex).toBeGreaterThan(armorIndex);
    expect(perkPoolIndex).toBeGreaterThan(actualRollIndex);
    expect(communityIndex).toBeGreaterThan(perkPoolIndex);
    expect(aiRawIndex).toBeGreaterThan(communityIndex);
    expect(sameNameIndex).toBeGreaterThan(aiRawIndex);
    expect(noteIndex).toBeGreaterThan(sameNameIndex);
    expect(actionIndex).toBeGreaterThan(noteIndex);
  });

  it("keeps detail modal rendering and loading state out of HomePage", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );
    const hook = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetail.ts"),
      "utf8"
    );

    expect(homePage).toContain("<ItemDetailModal");
    expect(homePage).toContain("useItemDetail");
    expect(homePage).not.toContain("function renderItemModal()");
    expect(homePage).not.toContain("itemDetailCacheRef");
    expect(homePage).not.toContain("itemDetailRequestKeyRef");
    expect(hook).toContain("export function useItemDetail");
    expect(hook).toContain("openItemDetail");
    expect(hook).toContain("closeSelectedItemDetail");
    expect(hook).toContain("api.getItemDetail");
  });
});
