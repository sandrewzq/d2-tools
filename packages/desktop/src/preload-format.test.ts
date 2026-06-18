import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("desktop preload format", () => {
  it("loads a CommonJS preload script in packaged Electron", () => {
    const mainSource = readFileSync(join(desktopRoot, "src", "main", "main.ts"), "utf8");
    const tsconfig = readFileSync(join(desktopRoot, "tsconfig.main.json"), "utf8");
    const packageJson = JSON.parse(
      readFileSync(join(desktopRoot, "package.json"), "utf8")
    ) as { scripts: Record<string, string> };

    expect(existsSync(join(desktopRoot, "src", "preload", "preload.cts"))).toBe(true);
    expect(mainSource).toContain("../preload/preload.cjs");
    expect(tsconfig).toContain("src/preload/**/*.cts");
    expect(packageJson.scripts.build).toMatch(/^pnpm clean && /);
  });
});
