import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("daily panel theme colors", () => {
  it("keeps daily and weekly cards aligned with the dark app theme", () => {
    const styles = readFileSync(
      join(desktopRoot, "src", "renderer", "styles.css"),
      "utf8"
    );

    expect(styles).toMatch(/\.daily-board\s*{[\s\S]*?display: grid;/);
    expect(styles).toMatch(/\.daily-reset-grid > div,[\s\S]*?\.daily-source\s*{[\s\S]*?background: #181d27;/);
    expect(styles).toMatch(/\.daily-reset-grid strong,[\s\S]*?\.daily-source strong\s*{[\s\S]*?color: #f3f6fc;/);
    expect(styles).toContain(".daily-source.source-pending strong");
    expect(styles).toContain("background: #211d12;");
  });

  it("does not apply light-card colors to modal and vault comparison panels", () => {
    const styles = readFileSync(
      join(desktopRoot, "src", "renderer", "styles.css"),
      "utf8"
    );

    expect(styles).not.toMatch(/\.daily-source,[\s\S]*?\.same-roll-row[\s\S]*?background: #ffffff;/);
    expect(styles).not.toMatch(/\.daily-source,[\s\S]*?\.duplicate-group[\s\S]*?background: #ffffff;/);
    expect(styles).toMatch(/\.same-roll-row\s*{[\s\S]*?background: #141924;/);
    expect(styles).toMatch(/\.duplicate-group\s*{[\s\S]*?background: #181d27;/);
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
