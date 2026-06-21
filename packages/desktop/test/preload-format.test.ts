import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("desktop preload format", () => {
  it("packages preload as CommonJS and points BrowserWindow to the cjs entry", () => {
    const mainSource = readFileSync(join(desktopRoot, "src", "main", "main.ts"), "utf8");
    const packageJson = JSON.parse(
      readFileSync(join(desktopRoot, "package.json"), "utf8")
    ) as { scripts: Record<string, string> };

    expect(existsSync(join(desktopRoot, "src", "preload", "preload.ts"))).toBe(true);
    expect(mainSource).toContain("../preload/preload.cjs");
    expect(packageJson.scripts.build).toContain("node scripts/build-preload.cjs");
  });
});
