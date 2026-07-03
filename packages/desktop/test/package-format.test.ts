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

  it("exposes vibe verification scripts for menu-level agent loops", () => {
    const rootPackageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(rootPackageJson.scripts["verify:vibe:ui"]).toBe("pnpm test:ui");
    expect(rootPackageJson.scripts["verify:vibe:desktop:account"]).toBe("pnpm test:desktop:account");
    expect(rootPackageJson.scripts["verify:vibe:desktop:ai"]).toBe("pnpm test:desktop:ai");
    expect(rootPackageJson.scripts["verify:vibe:desktop:loadouts"]).toBe("pnpm test:desktop:loadouts");
    expect(rootPackageJson.scripts["verify:vibe:desktop:vault"]).toBe("pnpm test:desktop:vault");
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
    const desktopPackageJson = JSON.parse(readFileSync(join(repoRoot, "packages", "desktop", "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const mainProcess = readFileSync(join(repoRoot, "packages", "desktop", "src", "main", "main.ts"), "utf8");
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
    expect(script).toContain("$rendererPort = 53172");
    expect(script).toContain("$rendererUrl = \"http://127.0.0.1:${rendererPort}\"");
    expect(script).toContain("D2_RENDERER_URL");
    expect(script).toContain('"pnpm@9.15.0", "--filter", "@d2-tools/desktop", "exec", "vite"');
    expect(script).toContain('"--port", "$rendererPort", "--strictPort"');
    expect(script).toContain('"pnpm@9.15.0", "--filter", "@d2-tools/desktop", "dev:electron"');
    expect(script).not.toContain("http://127.0.0.1:5173");
    expect(desktopPackageJson.scripts.dev).toContain("--port 53172");
    expect(desktopPackageJson.scripts.dev).toContain("--strictPort");
    expect(mainProcess).toContain('process.env.D2_RENDERER_URL ?? "http://127.0.0.1:53172"');
    expect(mainProcess).toContain('const rendererFile = join(currentDir, "../renderer/index.html")');
    expect(mainProcess).toContain("await window.loadURL(rendererUrl)");
    expect(mainProcess).toContain("await window.loadFile(rendererFile)");
    expect(mainProcess.indexOf("await window.loadURL(rendererUrl)")).toBeLessThan(
      mainProcess.indexOf("await window.loadFile(rendererFile)")
    );
    expect(desktopPackageJson.scripts["package:win"]).not.toContain("dev:electron");
    expect(desktopPackageJson.scripts["package:win"]).not.toContain("D2_RENDERER_URL");
    expect(script).toContain("$LASTEXITCODE");
    expect(script).not.toContain("package:win");
    expect(developmentDoc).toContain("scripts/dev-desktop.ps1");
    expect(developmentDoc).toContain("http://127.0.0.1:53172");
    expect(developmentDoc).toContain("发布前");
  });

  it("keeps the PowerShell development launcher compatible with Windows PowerShell -File", () => {
    const script = readFileSync(join(repoRoot, "scripts", "dev-desktop.ps1"), "utf8");

    expect(script).toMatch(/^[\x00-\x7F]*$/);
  });
});
