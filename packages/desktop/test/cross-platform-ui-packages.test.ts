import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readJson(path: string) {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as Record<string, unknown>;
}

describe("cross-platform UI package layout", () => {
  it("declares shared UI and interactive prototype packages", () => {
    const rootPackage = readJson("package.json");
    const uiPackage = readJson("packages/ui/package.json");
    const prototypePackage = readJson("packages/prototype/package.json");
    const webPackage = readJson("packages/web/package.json");

    expect(rootPackage.scripts).toMatchObject({
      "dev:prototype": "pnpm --filter @d2-tools/prototype dev",
      "dev:web": "pnpm --filter @d2-tools/web dev"
    });
    expect(uiPackage).toMatchObject({
      name: "@d2-tools/ui",
      private: true,
      type: "module"
    });
    expect(prototypePackage).toMatchObject({
      name: "@d2-tools/prototype",
      private: true,
      type: "module"
    });
    expect(webPackage).toMatchObject({
      name: "@d2-tools/web",
      private: true,
      type: "module"
    });
    expect(existsSync(join(repoRoot, "packages/ui/src/index.ts"))).toBe(true);
    expect(existsSync(join(repoRoot, "packages/prototype/src/main.tsx"))).toBe(true);
    expect(existsSync(join(repoRoot, "packages/web/src/main.tsx"))).toBe(true);
  });
});
