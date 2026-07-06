import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readItemDetailSources } from "./source-readers";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("wishlist detail UI", () => {
  it("renders DIM-style badges and same-name quick actions in the item detail modal", () => {
    const itemDetailModal = readItemDetailSources(desktopRoot);
    const itemDetailHook = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetailWorkspace.ts"),
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
    expect(itemDetailModal).toContain("打开推荐同名");
    expect(itemDetailModal).not.toContain("打开最高分");
    expect(itemDetailModal).not.toContain("打开最佳同名");
    expect(itemDetailHook).toContain("已将推荐项保留");
    expect(itemDetailHook).not.toContain("已将最高分保留");
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

  it("explains target match source, write-safety and same-name review path", () => {
    const itemDetailSources = readItemDetailSources(desktopRoot);

    expect(itemDetailSources).toContain("命中来源");
    expect(itemDetailSources).toContain("本地目标规则");
    expect(itemDetailSources).toContain("DIM 愿望单");
    expect(itemDetailSources).toContain("不会自动收藏、加标签或改动装备");
    expect(itemDetailSources).toContain("同名对比可继续复查同名装备");
  });

  it("keeps same-name comparison rows scannable with current item and tag chips", () => {
    const itemDetailSources = readItemDetailSources(desktopRoot);
    const styles = readFileSync(join(desktopRoot, "..", "ui", "src", "styles.css"), "utf8");

    expect(itemDetailSources).toContain("same-roll-summary");
    expect(itemDetailSources).toContain("same-roll-chip");
    expect(itemDetailSources).toContain("当前装备");
    expect(itemDetailSources).toContain("同名共");
    expect(itemDetailSources).toContain("标记：");
    expect(styles).toContain(".same-roll-summary");
    expect(styles).toContain(".same-roll-chip");
  });

  it("renders community recommendation trust signals and queries all detail sources", () => {
    const itemDetailModal = readItemDetailSources(desktopRoot);
    const homePageItemDetailModal = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePageItemDetailModal.tsx"),
      "utf8"
    );
    const itemDetailWorkspace = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetailWorkspace.ts"),
      "utf8"
    );
    const communityIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "community.ts"), "utf8");

    expect(communityIpc).toContain("getRecommendationsWithAllSources");
    expect(itemDetailWorkspace).toContain("communityRecommendationError");
    expect(itemDetailWorkspace).toContain("社区推荐读取失败");
    expect(homePageItemDetailModal).toContain("communityRecommendationError={itemDetail.communityRecommendationError}");
    expect(itemDetailModal).toContain("communityRecommendationError");
    expect(itemDetailModal).toContain("社区推荐降级");
    expect(itemDetailModal).toContain("已保留 DIM 愿望单和本地目标判断");
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

  it("keeps detail modal rendering and loading state behind the page-level detail wrapper", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );
    const homePageItemDetailModal = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePageItemDetailModal.tsx"),
      "utf8"
    );
    const productWriteHook = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "useDesktopProductWriteActions.ts"),
      "utf8"
    );
    const hook = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetail.ts"),
      "utf8"
    );

    expect(homePage).toContain("<HomePageItemDetailModal");
    expect(homePage).not.toContain("<ItemDetailModal");
    expect(homePageItemDetailModal).toContain("<ItemDetailModal");
    expect(homePageItemDetailModal).toContain("itemDetail.selectedItem ? (");
    expect(productWriteHook).toContain("useItemDetailWorkspace");
    expect(homePage).not.toContain("function renderItemModal()");
    expect(homePage).not.toContain("itemDetailCacheRef");
    expect(homePage).not.toContain("itemDetailRequestKeyRef");
    expect(hook).toContain("export function useItemDetail");
    expect(hook).toContain("openItemDetail");
    expect(hook).toContain("closeSelectedItemDetail");
    expect(hook).toContain("api.getItemDetail");
  });
});
