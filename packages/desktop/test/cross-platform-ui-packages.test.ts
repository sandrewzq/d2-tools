import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readJson(path: string) {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as Record<string, unknown>;
}

function readText(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

function readSourceTree(relativeDirectory: string): string {
  const absoluteDirectory = join(repoRoot, relativeDirectory);
  return readdirSync(absoluteDirectory, { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = join(relativeDirectory, entry.name);
      if (entry.isDirectory()) {
        return readSourceTree(relativePath);
      }
      return /\.(?:ts|tsx)$/.test(entry.name) ? [readText(relativePath)] : [];
    })
    .join("\n");
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

  it("mounts the same shared product shell in prototype, web and desktop", () => {
    expect(readText("packages/prototype/src/main.tsx")).toContain("ProductShellHost");
    expect(readText("packages/web/src/main.tsx")).toContain("ProductShellHost");
    expect(readText("packages/desktop/src/renderer/pages/HomePage.tsx")).toContain("ProductShellHost");
  });

  it("keeps the shared UI package independent from platform shells", () => {
    const sharedUiSource = readSourceTree("packages/ui/src");

    expect(sharedUiSource).not.toMatch(/@d2-tools\/(?:desktop|prototype|web)/);
    expect(sharedUiSource).not.toMatch(/packages[\\/](?:desktop|prototype|web)/);
  });

  it("keeps product page styles out of the Desktop platform stylesheet", () => {
    const desktopStyles = readText("packages/desktop/src/renderer/styles.css");

    expect(desktopStyles).not.toMatch(/^\.(?:home|account|vault|loadout|library|vendor|settings)-/m);
    expect(desktopStyles).not.toMatch(/^\.product-workspace/m);
  });

  it("exports one shared content view per product page without compatibility wrappers", () => {
    const contentViews = [
      "packages/ui/src/home/HomePageContentView.tsx",
      "packages/ui/src/account/AccountPageContentView.tsx",
      "packages/ui/src/vault/VaultPageContentView.tsx",
      "packages/ui/src/loadouts/LoadoutsPageContentView.tsx",
      "packages/ui/src/library/LibraryPageContentView.tsx",
      "packages/ui/src/vendors/VendorsPageContentView.tsx",
      "packages/ui/src/settings/SettingsPageContentView.tsx"
    ];

    for (const contentView of contentViews) {
      expect(existsSync(join(repoRoot, contentView))).toBe(true);
    }

    const uiIndex = readText("packages/ui/src/index.ts");
    expect(uiIndex).not.toMatch(/export \{ \w+PageView \}/);
  });
});
