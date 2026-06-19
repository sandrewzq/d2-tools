import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("daily panel theme colors", () => {
  it("uses readable text colors on light daily cards", () => {
    const styles = readFileSync(
      join(desktopRoot, "src", "renderer", "styles.css"),
      "utf8"
    );

    expect(styles).toMatch(/\.daily-reset-grid > div,[\s\S]*?\.daily-source\s*{[\s\S]*?color: #172033;/);
    expect(styles).toContain("color: #172033;");
    expect(styles).toContain(".daily-source.source-pending strong");
    expect(styles).toContain("color: #713f12;");
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
});
