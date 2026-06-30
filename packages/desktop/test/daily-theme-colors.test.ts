import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("daily panel theme colors", () => {
  it("keeps daily and weekly cards aligned with semantic theme tokens", () => {
    const styles = readFileSync(
      join(desktopRoot, "src", "renderer", "styles.css"),
      "utf8"
    );
    const finalBlock = styles.slice(
      styles.indexOf("/* Desktop UI design system v2 final overrides */"),
      styles.indexOf("/* End desktop UI design system v2 final overrides */")
    );

    expect(styles).toMatch(/\.daily-board\s*{[\s\S]*?display: grid;/);
    expect(finalBlock).toContain(".daily-reset-grid > div");
    expect(finalBlock).toContain(".daily-source");
    expect(finalBlock).toContain(".daily-source.source-pending");
    expect(finalBlock).toContain("background: var(--item-bg)");
    expect(finalBlock).toContain("background: var(--status-warning-bg)");
    expect(finalBlock).toContain("color: var(--text-title)");
  });

  it("keeps modal and vault comparison panels on shared item tokens", () => {
    const styles = readFileSync(
      join(desktopRoot, "src", "renderer", "styles.css"),
      "utf8"
    );
    const finalBlock = styles.slice(
      styles.indexOf("/* Desktop UI design system v2 final overrides */"),
      styles.indexOf("/* End desktop UI design system v2 final overrides */")
    );

    expect(finalBlock).toContain(".same-roll-row");
    expect(finalBlock).toContain(".duplicate-group");
    expect(finalBlock).toContain(".item-modal .daily-source");
    expect(finalBlock).toContain("background: var(--item-bg)");
    expect(finalBlock).toContain("color: var(--text-body)");
  });

  it("constrains shell content so desktop pages do not create horizontal overflow", () => {
    const styles = readFileSync(
      join(desktopRoot, "src", "renderer", "styles.css"),
      "utf8"
    );

    expect(styles).toContain("box-sizing: border-box;");
    expect(styles).toMatch(/\.shell-content\s*{[\s\S]*?width:\s*100%;/);
    expect(styles).toMatch(/\.shell-content\s*{[\s\S]*?max-width:\s*none;/);
    expect(styles).toMatch(/\.shell-content\s*{[\s\S]*?min-width:\s*0;/);
    expect(styles).toMatch(/@media \(max-width:\s*760px\)\s*{[\s\S]*?\.app-shell\s*{[\s\S]*?grid-template-columns:\s*1fr;/);
    expect(styles).toContain(".character-actions");
  });
});
