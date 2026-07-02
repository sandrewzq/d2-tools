import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const desktopRoot = join(process.cwd(), "packages", "desktop");
const rendererRoot = join(desktopRoot, "src", "renderer");
const uiRoot = join(process.cwd(), "packages", "ui");

function readRendererFile(path: string): string {
  return readFileSync(join(rendererRoot, path), "utf8");
}

function readUiFile(path: string): string {
  return readFileSync(join(uiRoot, "src", path), "utf8");
}

describe("desktop product redesign wiring", () => {
  it("lands the approved prototype structure into the real desktop pages", () => {
    const homeDashboard = readUiFile("home/HomePageView.tsx");
    const homePage = readRendererFile("pages/HomePage.tsx");
    const vaultPanel = readRendererFile("components/VaultPanel.tsx");
    const loadoutsPage = readRendererFile("features/loadouts/LoadoutsPage.tsx");
    const libraryPage = readRendererFile("features/library/LibraryPage.tsx");
    const settingsPage = `${readUiFile("settings/SettingsPageView.tsx")}\n${readRendererFile("features/settings/SettingsPage.tsx")}`;
    const styles = readRendererFile("styles.css");

    expect(homeDashboard).toContain("app-page home-app-page");
    expect(homeDashboard).not.toContain("app-page-head");
    expect(homePage).toContain('className="page-header"');
    expect(homePage).toContain("刷新今日信息");
    expect(homePage).not.toContain("复制本周重点");
    expect(homeDashboard).toContain("home-data-strip");
    expect(homeDashboard).toContain("home-weekly-dashboard");
    expect(homeDashboard).toContain("本周奖励与轮换");
    expect(homeDashboard).toContain("home-weekly-rewards");
    expect(homeDashboard).toContain("home-weekly-intel");
    expect(homeDashboard).not.toContain("product-overview-grid");
    expect(homeDashboard).not.toContain("home-risk-grid product-card");
    expect(homeDashboard).not.toContain("ui-badge status-ready\">总览");
    expect(homeDashboard).not.toContain("读取账号");
    expect(homeDashboard).not.toContain("商人库存");

    expect(vaultPanel).toContain("vault-product-layout");
    expect(vaultPanel).toContain("vault-decision-summary");
    expect(vaultPanel).toContain("ItemDecision");

    expect(loadoutsPage).toContain("loadout-product-layout");
    expect(loadoutsPage).toContain("配装风险");
    expect(loadoutsPage).toContain("缺失装备");

    expect(libraryPage).toContain("library-product-layout");
    expect(libraryPage).toContain("library-source-matrix");

    expect(settingsPage).toContain("app-page settings-app-page");
    expect(settingsPage).not.toContain("app-page-head");
    expect(settingsPage).toContain("app-settings-grid");
    expect(settingsPage).toContain("app-setting-row");
    expect(settingsPage).toContain("app-metric");
    expect(settingsPage).toContain("应用更新");
    expect(settingsPage).toContain("getBackgroundTaskUi");
    expect(settingsPage).not.toContain("settings-background-tasks");
    expect(settingsPage).not.toContain("<h1>设置中心</h1>");
    expect(settingsPage).not.toContain("settings-product-grid");
    expect(settingsPage).toContain("app-settings-shell");
    expect(settingsPage).toContain("settings-menu");
    expect(settingsPage).toContain("资料库");
    expect(settingsPage).not.toContain("本地 Manifest");
    expect(settingsPage).not.toContain("最新 Manifest");
    expect(settingsPage).not.toContain("必要组件");
    expect(settingsPage).toContain("设置总览");
    expect(settingsPage).toContain("资料库");

    expect(styles).toContain(".app-page-head");
    expect(styles).toContain(".app-panel");
    expect(styles).toContain(".app-metric");
    expect(styles).toContain(".home-data-strip");
    expect(styles).toContain(".home-weekly-dashboard");
    expect(styles).toContain(".home-reward-list");
    expect(styles).toContain(".app-setting-row");
    expect(styles).toContain(".decision-badge");
    expect(styles).toContain(".vault-product-layout");
    expect(styles).toContain(".loadout-product-layout");
    expect(styles).toContain(".library-product-layout");
    expect(styles).toContain(".app-settings-grid");
    expect(styles).not.toContain(".settings-product-grid .settings-update-grid");
  });

  it("shows item decision evidence on vault cards and keeps cleanup protected by evidence", () => {
    const vaultListItem = readRendererFile("features/vault/VaultListItem.tsx");

    expect(vaultListItem).toContain("buildItemDecision");
    expect(vaultListItem).toContain("decision-badge");
    expect(vaultListItem).toContain("decision.protected");
    expect(vaultListItem).toContain("summarizeItemDecision");
  });
});
