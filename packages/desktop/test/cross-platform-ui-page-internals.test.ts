import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const desktopRendererRoot = join(root, "packages", "desktop", "src", "renderer");
const uiRoot = join(root, "packages", "ui", "src");

function readDesktop(path: string): string {
  return readFileSync(join(desktopRendererRoot, path), "utf8");
}

function readUi(path: string): string {
  return readFileSync(join(uiRoot, path), "utf8");
}

describe("cross-platform page internals", () => {
  it("keeps settings internal blocks in the shared UI package", () => {
    const desktopPage = readDesktop("features/settings/SettingsPage.tsx");
    const uiView = readUi("settings/SettingsPageContentView.tsx");

    expect(desktopPage).toContain("SettingsPageContentView");
    expect(desktopPage).not.toContain("settingsMenu.map");
    expect(desktopPage).not.toContain('className="app-setting-row"');
    expect(desktopPage).not.toContain('className="app-metric');
    expect(uiView).toContain("SettingsPageContentView");
    expect(uiView).toContain("app-setting-row");
    expect(uiView).toContain("app-metric");
    expect(uiView).toContain("settings-menu");
  });

  it("keeps account internal blocks in the shared UI package", () => {
    const desktopPage = readDesktop("features/account/AccountPage.tsx");
    const uiView = readUi("account/AccountPageContentView.tsx");

    expect(desktopPage).toContain("AccountPageContentView");
    expect(desktopPage).not.toContain("AccountSlotComparison");
    expect(desktopPage).not.toContain("renderAccountItemGrid");
    expect(desktopPage).not.toContain("account-slot-comparison-list");
    expect(uiView).toContain("AccountPageContentView");
    expect(uiView).toContain("account-slot-comparison-list");
    expect(uiView).toContain("account-activity-review");
    expect(uiView).toContain("account-postmaster");
  });

  it("keeps library and loadout workbench internals in the shared UI package", () => {
    const libraryDesktop = readDesktop("features/library/LibraryPage.tsx");
    const loadoutsDesktop = readDesktop("features/loadouts/LoadoutsPage.tsx");
    const libraryUi = readUi("library/LibraryPageContentView.tsx");
    const loadoutsUi = readUi("loadouts/LoadoutsPageContentView.tsx");

    expect(libraryDesktop).toContain("LibraryPageContentView");
    expect(libraryDesktop).not.toContain("library-source-groups");
    expect(libraryDesktop).not.toContain("library-reference-card");
    expect(libraryUi).toContain("LibraryPageContentView");
    expect(libraryUi).toContain("library-source-groups");
    expect(libraryUi).toContain("library-reference-card");

    expect(loadoutsDesktop).toContain("LoadoutsPageContentView");
    expect(loadoutsDesktop).not.toContain("loadout-compare-grid");
    expect(loadoutsDesktop).not.toContain("loadout-status-summary");
    expect(loadoutsUi).toContain("LoadoutsPageContentView");
    expect(loadoutsUi).toContain("loadout-compare-grid");
    expect(loadoutsUi).toContain("loadout-status-summary");
  });

  it("has a real web API adapter boundary instead of only client-side fallback", () => {
    const webAdapter = readFileSync(join(root, "packages", "web", "src", "webAdapter.ts"), "utf8");
    const webApi = readFileSync(join(root, "packages", "web", "src", "webApi.ts"), "utf8");

    expect(webAdapter).toContain("fetchJson<WebHomeSnapshot>(\"/api/home-snapshot\")");
    expect(webAdapter).toContain("fetchJson<WebPageSnapshot>(`/api/pages/${page}/snapshot`)");
    expect(webApi).toContain("createWebApiRouter");
    expect(webApi).toContain("home-snapshot");
    expect(webApi).toContain("/api/pages/");
    expect(webApi).toContain("/snapshot");
  });
});
