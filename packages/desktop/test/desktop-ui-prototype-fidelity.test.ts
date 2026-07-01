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

    for (const source of [homeDashboard, settingsPage, dailyPanel]) {
      expect(source).toContain("app-panel");
      expect(source).not.toContain("product-overview-grid");
      expect(source).not.toContain("settings-product-grid");
    }

    expect(homeDashboard).toContain("home-readiness-grid");
    expect(homeDashboard).toContain("home-rotation-grid");
    expect(homeDashboard).toContain("home-weekly-grid");
    expect(homeDashboard).toContain("app-status-row");
    expect(homeDashboard).not.toContain("home-overview-hero");
    expect(homeDashboard).not.toContain("home-risk-grid");

    expect(settingsPage).toContain("app-settings-grid");
    expect(settingsPage).toContain("app-setting-group");
    expect(settingsPage).toContain("app-log-row");
    expect(settingsPage).not.toContain("ui-list-row diagnostic-row");
  });

  it("locks wide desktop grids so text cannot collapse into vertical columns", () => {
    const styles = readRendererFile("styles.css");
    const readinessGrid = readCssRule(styles, ".home-readiness-grid");
    const rotationGrid = readCssRule(styles, ".home-rotation-grid");
    const weeklyGrid = readCssRule(styles, ".home-weekly-grid");
    const settingsGrid = readCssRule(styles, ".app-settings-grid");
    const settingRow = readCssRule(styles, ".app-setting-row");

    expect(readinessGrid).toContain("grid-template-columns: repeat(5, minmax(0, 1fr))");
    expect(rotationGrid).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(weeklyGrid).toContain("grid-template-columns: repeat(4, minmax(0, 1fr))");
    expect(settingsGrid).toContain("grid-template-columns: minmax(0, 1fr) minmax(280px, 0.5fr)");
    expect(settingRow).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(styles).not.toContain(".settings-product-grid .settings-update-grid");
  });

  it("keeps core prototype surfaces tokenized in light and dark modes", () => {
    const styles = readRendererFile("styles.css");
    const primitiveStart = styles.indexOf("/* Prototype fidelity primitives */");
    const primitiveEnd = styles.indexOf("/* End prototype fidelity primitives */");
    expect(primitiveStart).toBeGreaterThanOrEqual(0);
    expect(primitiveEnd).toBeGreaterThan(primitiveStart);

    const primitiveBlock = styles.slice(primitiveStart, primitiveEnd);
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
