import { existsSync, readFileSync } from "node:fs";
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

  it("uses NSIS as the Windows installer format for GitHub releases", () => {
    const electronBuilderConfig = readFileSync(join(repoRoot, "packages", "desktop", "electron-builder.yml"), "utf8");
    const desktopPackageJson = readFileSync(join(repoRoot, "packages", "desktop", "package.json"), "utf8");

    expect(electronBuilderConfig).toContain("target: nsis");
    expect(electronBuilderConfig).toContain('artifactName: "d2-tools-setup-${version}.${ext}"');
    expect(electronBuilderConfig).toContain("allowToChangeInstallationDirectory: true");
    expect(electronBuilderConfig).toContain('shortcutName: "d2-tools"');
    expect(electronBuilderConfig).toContain("include: build/installer.nsh");
    expect(electronBuilderConfig).not.toContain("target: zip");
    expect(electronBuilderConfig).not.toContain("target: 7z");
    expect(desktopPackageJson).toContain("--win nsis");
    expect(desktopPackageJson).not.toContain("--win zip");
    expect(desktopPackageJson).not.toContain("--win 7z");
  });

  it("provides a PowerShell development launcher without packaging the app", () => {
    const rootPackageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const scriptPath = join(repoRoot, "scripts", "dev-desktop.ps1");
    const script = readFileSync(scriptPath, "utf8");
    const developmentDoc = readFileSync(join(repoRoot, "docs", "development.md"), "utf8");

    expect(rootPackageJson.scripts["dev:desktop"]).toBe(
      "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev-desktop.ps1"
    );
    expect(existsSync(join(repoRoot, "启动开发版.bat"))).toBe(false);
    expect(existsSync(scriptPath)).toBe(true);
    expect(script).toContain('"pnpm@9.15.0", "--filter", "@d2-tools/core", "build"');
    expect(script).toContain('"pnpm@9.15.0", "--filter", "@d2-tools/http", "build"');
    expect(script).toContain('"pnpm@9.15.0", "exec", "tsc", "-p", "tsconfig.main.json"');
    expect(script).toContain("tsconfig.main.tsbuildinfo");
    expect(script).toContain("dist\\main\\main.js");
    expect(script).toContain('"node.exe"');
    expect(script).toContain('"scripts/build-preload.cjs"');
    expect(script).toContain('"pnpm@9.15.0", "--filter", "@d2-tools/desktop", "dev"');
    expect(script).toContain('"pnpm@9.15.0", "--filter", "@d2-tools/desktop", "dev:electron"');
    expect(script).toContain("$LASTEXITCODE");
    expect(script).not.toContain("package:win");
    expect(developmentDoc).toContain("scripts/dev-desktop.ps1");
    expect(developmentDoc).toContain("发布前");
  });

  it("keeps the PowerShell development launcher compatible with Windows PowerShell -File", () => {
    const script = readFileSync(join(repoRoot, "scripts", "dev-desktop.ps1"), "utf8");

    expect(script).toMatch(/^[\x00-\x7F]*$/);
  });
});
