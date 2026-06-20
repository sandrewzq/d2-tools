import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

describe("desktop package format", () => {
  it("builds core before workspace typecheck so clean checkouts can resolve package exports", () => {
    const rootPackageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(rootPackageJson.scripts.typecheck).toContain("pnpm --filter @d2-tools/core build");
    expect(rootPackageJson.scripts.typecheck).toContain("pnpm -r typecheck");
  });

  it("uses 7z as the Windows green package format for GitHub releases", () => {
    const electronBuilderConfig = readFileSync(join(repoRoot, "packages", "desktop", "electron-builder.yml"), "utf8");
    const desktopPackageJson = readFileSync(join(repoRoot, "packages", "desktop", "package.json"), "utf8");

    expect(electronBuilderConfig).toContain("target: 7z");
    expect(electronBuilderConfig).not.toContain("target: zip");
    expect(desktopPackageJson).toContain("--win 7z");
    expect(desktopPackageJson).not.toContain("--win zip");
  });
});
