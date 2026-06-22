import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("daily and weekly layout", () => {
  it("separates player-readable daily actions from weekly report cards", () => {
    const dailyPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "daily", "DailyPage.tsx"), "utf8");

    expect(dailyPage).toContain("daily-board");
    expect(dailyPage).toContain("renderDailySourceCard");
    expect(dailyPage).toContain("isLoading");
    expect(dailyPage).toContain("daily-brief-count");
    expect(dailyPage).toContain("daily-date-badge");
    expect(dailyPage).toContain("daily-action-list");
    expect(dailyPage).toContain("weekly-focus-list");
    expect(dailyPage).toContain("weekly-focus-sections");
    expect(dailyPage).toContain("weekly-focus-section");
    expect(dailyPage).toContain("daily-source-count");
    expect(dailyPage).toContain("daily-source-status");
    expect(dailyPage).toContain('className="source-status-card source-status-pending daily-panel-status"');
    expect(dailyPage).toContain('className="source-status-badge source-status-pending">今日 / 本周</span>');
    expect(dailyPage).toContain('className="source-status-card source-status-pending daily-source source-pending"');
    expect(dailyPage).toContain('className="source-status-badge source-status-pending">轮换细节</span>');
    expect(dailyPage).toContain("onCopyWeeklyFocus");
    expect(dailyPage).toContain("buildWeeklyDigestSections");
    expect(dailyPage).toContain("formatDailySourceStatus");
    expect(dailyPage).toContain("\u4eca\u65e5 / \u672c\u5468");
    expect(dailyPage).toContain("\u590d\u5236\u65e5\u62a5");
    expect(dailyPage).toContain("\u590d\u5236\u672c\u5468\u91cd\u70b9");
    expect(dailyPage).toContain("\u4eca\u65e5\u884c\u52a8");
    expect(dailyPage).toContain("\u672c\u5468\u5468\u62a5");
    expect(dailyPage).not.toContain("????");
  });
});
