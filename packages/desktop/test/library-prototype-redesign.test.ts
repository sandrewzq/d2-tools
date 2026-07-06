import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const uiRoot = join(process.cwd(), "packages", "ui");

function readUi(path: string): string {
  return readFileSync(join(uiRoot, "src", path), "utf8");
}

function readCssRule(styles: string, selector: string): string {
  const start = styles.indexOf(`${selector} {`);
  if (start < 0) return "";
  const end = styles.indexOf("\n}", start);
  return end >= 0 ? styles.slice(start, end + 2) : "";
}

describe("library prototype redesign", () => {
  it("uses a search-first library workbench with secondary controls lowered", () => {
    const content = readUi("library/LibraryPageContentView.tsx");
    const view = readUi("library/LibraryPageView.tsx");
    const styles = readUi("styles.css");

    expect(view).toContain("library-workbench-layout");
    expect(view).toContain("showInternalHeading ? (");
    expect(view).not.toContain("library-reference-hero-compact");
    expect(view).not.toContain("library-reference-status");
    expect(view).not.toContain("library-version-chip");
    expect(content).toContain("library-query-panel");
    expect(content).toContain("library-search-command");
    expect(content).toContain("library-quick-filters");
    expect(content).toContain("library-advanced-disclosure");
    expect(content).toContain("library-source-guide-details");
    expect(content).toContain("library-side-utilities");
    expect(content).toContain("library-results-panel");
    expect(content).toContain("搜索结果");
    expect(content).not.toContain("library-source-grid");
    expect(content).not.toContain("library-source-card");
    expect(styles).toContain(".library-workbench-layout");
    expect(styles).toContain(".library-query-panel");
    expect(styles).toContain(".library-search-command");
    expect(readCssRule(styles, ".product-command-bar")).toContain("padding: var(--space-12);");
    expect(readCssRule(styles, ".library-search-command")).not.toContain("padding: var(--space-12);");
    expect(readCssRule(styles, ".library-search-command")).not.toContain("padding: 0 0");
    expect(styles).toContain(".library-quick-filters");
    expect(styles).not.toContain(".library-reference-page.tool-panel");
    expect(styles).not.toContain(".library-reference-hero-compact");
    expect(styles).toContain("box-shadow: none;");
    expect(styles).toContain(".library-main-filter-row");
    expect(styles).toContain(".library-advanced-disclosure");
    expect(styles).toContain(".library-source-guide-details");
    expect(styles).toContain(".library-side-utilities");
    expect(styles).toContain(".library-results-panel");
    expect(styles).not.toContain(".library-version-chip");
    expect(styles).toContain("max-width: 100%;");
  });
});
