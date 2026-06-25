import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readItemDetailSources } from "./source-readers";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("wishlist detail UI", () => {
  it("renders DIM-style badges and same-name quick actions in the item detail modal", () => {
    const itemDetailModal = readItemDetailSources(desktopRoot);

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

  it("shows a target match summary before detailed community recommendations", () => {
    const itemDetailTools = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "components", "item-detail", "ItemDetailTools.tsx"),
      "utf8"
    );
    const itemDetailSources = readItemDetailSources(desktopRoot);

    const overviewIndex = itemDetailTools.indexOf("<ItemDetailOverview");
    const targetIndex = itemDetailTools.indexOf("<ItemDetailTargetMatch");
    const actualRollIndex = itemDetailTools.indexOf("<ItemDetailPerks");
    const communityIndex = itemDetailTools.indexOf("<ItemDetailCommunity");

    expect(itemDetailSources).toContain("target-match-panel");
    expect(itemDetailSources).toContain("目标命中");
    expect(itemDetailSources).toContain("DIM 愿望单命中");
    expect(itemDetailSources).toContain("未命中已导入 DIM 愿望单");
    expect(itemDetailSources).toContain("evaluateWishlistRoll");
    expect(itemDetailSources).toContain("selectedItemToAccountItem");
    expect(itemDetailSources).toContain("onCopyWishlistInsight");
    expect(itemDetailSources).toContain('onSaveSelectedItemTag("farm")');
    expect(itemDetailSources).toContain('onSaveSelectedItemTag("loadout")');
    expect(targetIndex).toBeGreaterThan(overviewIndex);
    expect(actualRollIndex).toBeGreaterThan(targetIndex);
    expect(communityIndex).toBeGreaterThan(actualRollIndex);
  });

  it("renders community recommendation trust signals and queries all detail sources", () => {
    const itemDetailModal = readItemDetailSources(desktopRoot);
    const communityIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "community.ts"), "utf8");

    expect(communityIpc).toContain("getRecommendationsWithAllSources");
    expect(itemDetailModal).toContain("source_warnings");
    expect(itemDetailModal).toContain("ai_analysis");
    expect(itemDetailModal).toContain("source-status-list source-status-warning");
    expect(itemDetailModal).toContain("AI 原始分析");
  });

  it("keeps detail modal information before notes and write actions", () => {
    const itemDetailTools = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "components", "item-detail", "ItemDetailTools.tsx"),
      "utf8"
    );
    const itemDetailSources = readItemDetailSources(desktopRoot);

    const overviewIndex = itemDetailTools.indexOf("<ItemDetailOverview");
    const actualRollIndex = itemDetailTools.indexOf("<ItemDetailPerks");
    const sameNameIndex = itemDetailTools.indexOf("<ItemDetailSameName");
    const communityIndex = itemDetailTools.indexOf("<ItemDetailCommunity");
    const noteIndex = itemDetailTools.indexOf("<ItemNotePanel");
    const actionIndex = itemDetailTools.indexOf("<ItemDetailActions");

    expect(itemDetailSources).toContain('className="item-detail-game-stats armor-stat-panel"');
    expect(itemDetailSources).toContain("<h3>实际 Roll</h3>");
    expect(itemDetailSources).toContain('className="modal-perks"');
    expect(itemDetailSources).toContain('className="community-recommendations-panel"');
    expect(itemDetailSources).toContain("community-ai-analysis");
    expect(itemDetailSources).toContain("<h3>同名对比</h3>");
    expect(overviewIndex).toBeGreaterThanOrEqual(0);
    expect(actualRollIndex).toBeGreaterThan(overviewIndex);
    expect(sameNameIndex).toBeGreaterThan(actualRollIndex);
    expect(communityIndex).toBeGreaterThan(sameNameIndex);
    expect(noteIndex).toBeGreaterThan(communityIndex);
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
