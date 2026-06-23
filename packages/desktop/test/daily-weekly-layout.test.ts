import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("daily and weekly layout", () => {
  it("separates player-readable daily actions from weekly report cards", () => {
    const dailyPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "daily", "DailyPage.tsx"), "utf8");
    const dailyPanel = readFileSync(join(desktopRoot, "src", "renderer", "shared", "components", "DailySummaryPanel.tsx"), "utf8");

    expect(dailyPage).toContain("export function DailyPage");
    expect(dailyPage).toContain("<DailySummaryPanel");
    expect(dailyPanel).toContain("daily-board");
    expect(dailyPanel).toContain("renderDailySourceCard");
    expect(dailyPanel).toContain("isLoading");
    expect(dailyPanel).toContain("daily-brief-count");
    expect(dailyPanel).toContain("daily-date-badge");
    expect(dailyPanel).toContain("daily-action-list");
    expect(dailyPanel).toContain("weekly-focus-list");
    expect(dailyPanel).toContain("weekly-focus-sections");
    expect(dailyPanel).toContain("weekly-focus-section");
    expect(dailyPanel).toContain("daily-source-count");
    expect(dailyPanel).toContain("daily-source-status");
    expect(dailyPanel).toContain('className="source-status-card source-status-pending daily-panel-status"');
    expect(dailyPanel).toContain('className="source-status-badge source-status-pending">今日 / 本周</span>');
    expect(dailyPanel).toContain('className="source-status-card source-status-pending daily-source source-pending"');
    expect(dailyPanel).toContain('className="source-status-badge source-status-pending">轮换细节</span>');
    expect(dailyPanel).toContain("onCopyWeeklyFocus");
    expect(dailyPanel).toContain("buildWeeklyDigestSections");
    expect(dailyPanel).toContain("formatDailySourceStatus");
    expect(dailyPanel).toContain("\u4eca\u65e5 / \u672c\u5468");
    expect(dailyPanel).toContain("\u590d\u5236\u65e5\u62a5");
    expect(dailyPanel).toContain("\u590d\u5236\u672c\u5468\u91cd\u70b9");
    expect(dailyPanel).toContain("\u4eca\u65e5\u884c\u52a8");
    expect(dailyPanel).toContain("\u672c\u5468\u5468\u62a5");
    expect(dailyPanel).not.toContain("????");
  });
});
