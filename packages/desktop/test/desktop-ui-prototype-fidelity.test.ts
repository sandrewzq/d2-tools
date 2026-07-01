import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const desktopRoot = join(process.cwd(), "packages", "desktop");
const rendererRoot = join(desktopRoot, "src", "renderer");

function readRendererFile(path: string): string {
  return readFileSync(join(rendererRoot, path), "utf8");
}

function readCssRule(styles: string, selector: string): string {
  const start = styles.indexOf(`\n${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = styles.indexOf("}", start);
  expect(end).toBeGreaterThan(start);
  return styles.slice(start + 1, end + 1);
}

describe("desktop UI prototype fidelity", () => {
  it("uses the approved prototype primitives instead of patch classes on home and settings", () => {
    const homeDashboard = readRendererFile("features/home/HomeDashboard.tsx");
    const settingsPage = readRendererFile("features/settings/SettingsPage.tsx");
    const dailyPanel = readRendererFile("shared/components/DailySummaryPanel.tsx");
    const overviewSection = settingsPage.slice(
      settingsPage.indexOf('id="settings-overview"'),
      settingsPage.indexOf('id="settings-account"')
    );
    const settingsGrid = overviewSection.slice(
      overviewSection.indexOf('className="app-settings-grid"'),
      overviewSection.indexOf("</div>\n            </section>", overviewSection.indexOf('className="app-settings-grid"'))
    );
    const overviewMetricCount = (settingsGrid.match(/className=\{?`?app-metric/g) ?? []).length;

    for (const source of [homeDashboard, settingsPage, dailyPanel]) {
      expect(source).toContain("app-panel");
      expect(source).not.toContain("product-overview-grid");
      expect(source).not.toContain("settings-product-grid");
    }

    expect(homeDashboard).toContain("home-data-strip");
    expect(homeDashboard).toContain("home-weekly-dashboard");
    expect(homeDashboard).toContain("本周奖励与轮换");
    expect(homeDashboard).toContain("home-weekly-rewards");
    expect(homeDashboard).toContain("home-weekly-intel");
    expect(homeDashboard).toContain("home-main-grid");
    expect(homeDashboard).not.toContain("home-overview-hero");
    expect(homeDashboard).not.toContain("home-risk-grid");
    expect(homeDashboard).not.toContain("home-readiness-grid");

    expect(settingsPage).toContain("app-settings-shell");
    expect(settingsPage).toContain("settings-menu");
    expect(settingsPage).toContain("settings-detail active");
    expect(settingsPage).toContain("设置总览");
    expect(settingsPage).toContain("账号");
    expect(settingsPage).toContain("资料库");
    expect(settingsPage).toContain("Bungie 接口配置");
    expect(settingsPage).toContain("AI 助手");
    expect(settingsPage).toContain("打开应用时");
    expect(settingsPage).toContain("需要重新读取时");
    expect(settingsPage).toContain("资料库日期");
    expect(settingsPage).toContain("资料库版本");
    expect(settingsPage).toContain("每天自动检查一次");
    expect(settingsPage).toContain("formatLibraryVersion");
    expect(settingsPage).toContain("打开数据目录");
    expect(settingsPage).toContain("不知道填哪个？");
    expect(settingsPage).toContain("Bungie API Key");
    expect(settingsPage).toContain("Bungie Client ID");
    expect(settingsPage).toContain("Bungie Client Secret");
    expect(settingsPage).toContain("https://127.0.0.1:28780/oauth/callback");
    expect(settingsPage).toContain("保存配置");
    expect(settingsPage).toContain("<AiSettingsPanel onSaved={props.onAiSettingsSaved} />");
    expect(settingsPage).not.toContain("AI 状态");
    expect(settingsPage).not.toContain("未配置；不影响账号、仓库、资料库和商人功能");
    expect(settingsPage).not.toContain("app-note");
    expect(settingsPage).not.toContain("onOpenConfig");
    expect(settingsPage).toContain("onOpenDataDir");
    expect(settingsPage).toContain("app-settings-grid");
    expect(settingsGrid).toContain("<span>后台任务</span>");
    expect(overviewMetricCount).toBe(6);
    expect(settingsPage).not.toContain("本地 Manifest");
    expect(settingsPage).not.toContain("最新 Manifest");
    expect(settingsPage).not.toContain("必要组件");
    expect(settingsPage).not.toContain("资料包");
    expect(settingsPage).toContain("app-settings-grid");
    expect(settingsPage).toContain("app-setting-group");
    expect(settingsPage).toContain("app-log-row");
    expect(settingsPage).not.toContain("ui-list-row diagnostic-row");
  });

  it("locks wide desktop grids so text cannot collapse into vertical columns", () => {
    const styles = readRendererFile("styles.css");
    const dataStrip = readCssRule(styles, ".home-data-strip");
    const weeklyDashboard = readCssRule(styles, ".home-weekly-dashboard");
    const rewardList = readCssRule(styles, ".home-reward-list");
    const settingsGrid = readCssRule(styles, ".app-settings-grid");
    const settingsShell = readCssRule(styles, ".app-settings-shell");
    const settingRow = readCssRule(styles, ".app-setting-row");

    expect(dataStrip).toContain("grid-template-columns: repeat(4, minmax(0, 1fr))");
    expect(weeklyDashboard).toContain("grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.85fr)");
    expect(rewardList).toContain("grid-template-columns: repeat(auto-fit, minmax(165px, 1fr))");
    expect(settingsGrid).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(settingsShell).toContain("grid-template-columns: 220px minmax(0, 1fr)");
    expect(settingRow).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(styles).not.toContain(".settings-product-grid .settings-update-grid");
  });

  it("keeps core prototype surfaces tokenized in light and dark modes", () => {
    const styles = readRendererFile("styles.css");
    const lightMode = readCssRule(styles, ".app-shell[data-color-mode=\"light\"]");
    const primitiveStart = styles.indexOf("/* Prototype fidelity primitives */");
    const primitiveEnd = styles.indexOf("/* End prototype fidelity primitives */");
    expect(primitiveStart).toBeGreaterThanOrEqual(0);
    expect(primitiveEnd).toBeGreaterThan(primitiveStart);

    const primitiveBlock = styles.slice(primitiveStart, primitiveEnd);
    expect(lightMode).toContain("--surface-page: #f1f4f8");
    expect(lightMode).toContain("--surface-panel: #ffffff");
    expect(lightMode).toContain("--accent-primary: #2d6f9f");
    expect(lightMode).toContain("--status-warning: #a87118");
    expect(primitiveBlock).toContain("background: var(--surface-panel)");
    expect(primitiveBlock).toContain("background: var(--surface-subtle)");
    expect(primitiveBlock).toContain("color: var(--text-title)");
    expect(primitiveBlock).toContain("color: var(--text-body)");
    expect(primitiveBlock).toContain("color: var(--text-muted)");
    expect(primitiveBlock).toContain("border: 1px solid var(--border-subtle)");
    expect(primitiveBlock).not.toContain("#181d27");
    expect(primitiveBlock).not.toContain("#303848");
    expect(primitiveBlock).not.toContain("#eceff4");
    expect(primitiveBlock).not.toContain("#aeb9ca");
  });
});
