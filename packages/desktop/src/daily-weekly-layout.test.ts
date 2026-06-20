import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("daily and weekly layout", () => {
  it("separates player-readable daily actions from weekly report cards", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");

    expect(homePage).toContain("daily-board");
    expect(homePage).toContain("renderDailySourceCard");
    expect(homePage).toContain("isLoadingDaily");
    expect(homePage).toContain("daily-brief-count");
    expect(homePage).toContain("daily-date-badge");
    expect(homePage).toContain("daily-action-list");
    expect(homePage).toContain("weekly-focus-list");
    expect(homePage).toContain("weekly-focus-sections");
    expect(homePage).toContain("weekly-focus-section");
    expect(homePage).toContain("daily-source-count");
    expect(homePage).toContain("daily-source-status");
    expect(homePage).toContain("copyWeeklyFocus");
    expect(homePage).toContain("buildWeeklyDigestSections");
    expect(homePage).toContain("formatDailySourceStatus");
    expect(homePage).toContain("buildWeeklyFocusText");
    expect(homePage).toContain("\u4eca\u65e5 / \u672c\u5468");
    expect(homePage).toContain("\u590d\u5236\u65e5\u62a5");
    expect(homePage).toContain("\u590d\u5236\u672c\u5468\u91cd\u70b9");
    expect(homePage).toContain("\u4eca\u65e5\u884c\u52a8");
    expect(homePage).toContain("\u672c\u5468\u5468\u62a5");
    expect(homePage).not.toContain("????");
  });
});
