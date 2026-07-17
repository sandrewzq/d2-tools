import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

function readSourceFiles(dir: string): Array<{ path: string; source: string }> {
  const entries: Array<{ path: string; source: string }> = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      entries.push(...readSourceFiles(path));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      entries.push({ path, source: readFileSync(path, "utf8") });
    }
  }
  return entries;
}

describe("desktop package format", () => {
  it("builds core before workspace typecheck so clean checkouts can resolve package exports", () => {
    const rootPackageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(rootPackageJson.scripts["typecheck:desktop-fast"]).toContain("pnpm --filter @d2-tools/services build");
    expect(rootPackageJson.scripts["typecheck:desktop-fast"]).toContain("pnpm --filter @d2-tools/app build");
    expect(rootPackageJson.scripts["typecheck:desktop"]).toContain("pnpm --filter @d2-tools/app build");
    expect(rootPackageJson.scripts.typecheck).toContain("pnpm --filter @d2-tools/core build");
    expect(rootPackageJson.scripts.typecheck).toContain("pnpm -r typecheck");
    expect(rootPackageJson.scripts.typecheck).toContain("pnpm --filter @d2-tools/services build");
  });

  it("keeps OAuth local adapters in services instead of core", () => {
    const corePackageJson = JSON.parse(readFileSync(join(repoRoot, "packages", "core", "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      exports: Record<string, unknown>;
    };
    const servicesPackageJson = JSON.parse(readFileSync(join(repoRoot, "packages", "services", "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      exports: Record<string, unknown>;
    };
    const coreOAuthLogin = readFileSync(join(repoRoot, "packages", "core", "src", "oauth", "login.ts"), "utf8");

    expect(corePackageJson.exports["./oauth/callbackServer"]).toBeUndefined();
    expect(corePackageJson.exports["./oauth/tokenStore"]).toBeUndefined();
    expect(corePackageJson.dependencies?.selfsigned).toBeUndefined();
    expect(servicesPackageJson.exports["./oauth/callbackServer"]).toEqual({
      types: "./dist/oauth/callbackServer.d.ts",
      import: "./dist/oauth/callbackServer.js"
    });
    expect(servicesPackageJson.exports["./oauth/client"]).toEqual({
      types: "./dist/oauth/client.d.ts",
      import: "./dist/oauth/client.js"
    });
    expect(servicesPackageJson.exports["./oauth/tokenStore"]).toEqual({
      types: "./dist/oauth/tokenStore.d.ts",
      import: "./dist/oauth/tokenStore.js"
    });
    expect(servicesPackageJson.dependencies?.selfsigned).toBe("^5.5.0");
    expect(coreOAuthLogin).not.toContain("node:fs");
    expect(coreOAuthLogin).not.toContain("readFileSync");
    expect(coreOAuthLogin).not.toContain("writeFileSync");
    expect(coreOAuthLogin).not.toContain("saveOAuthToken");
    expect(coreOAuthLogin).not.toContain("loadOAuthToken");
    expect(coreOAuthLogin).not.toContain("hasOAuthToken");
    expect(coreOAuthLogin).not.toContain("fetchImpl");
    expect(coreOAuthLogin).not.toContain("exchangeBungieOAuthCode");
    expect(coreOAuthLogin).not.toContain("refreshBungieOAuthToken");
    expect(coreOAuthLogin).not.toContain("platform/app/oauth/token");
  });

  it("keeps config store local adapters in services instead of core", () => {
    const corePackageJson = JSON.parse(readFileSync(join(repoRoot, "packages", "core", "package.json"), "utf8")) as {
      exports: Record<string, unknown>;
    };
    const servicesPackageJson = JSON.parse(readFileSync(join(repoRoot, "packages", "services", "package.json"), "utf8")) as {
      exports: Record<string, unknown>;
    };
    const coreIndex = readFileSync(join(repoRoot, "packages", "core", "src", "index.ts"), "utf8");

    expect(corePackageJson.exports["./config/defaults"]).toEqual({
      types: "./dist/config/defaults.d.ts",
      import: "./dist/config/defaults.js"
    });
    expect(corePackageJson.exports["./config/env"]).toEqual({
      types: "./dist/config/env.d.ts",
      import: "./dist/config/env.js"
    });
    expect(corePackageJson.exports["./config/store"]).toBeUndefined();
    expect(servicesPackageJson.exports["./config/store"]).toEqual({
      types: "./dist/config/store.d.ts",
      import: "./dist/config/store.js"
    });
    expect(existsSync(join(repoRoot, "packages", "core", "src", "config", "store.ts"))).toBe(false);
    expect(coreIndex).not.toContain("./config/store.js");
  });

  it("wires desktop runtime config loading through services", () => {
    const desktopRuntimeFiles = [
      "src/main/ipc/actions.ts",
      "src/main/ipc/activities.ts",
      "src/main/ipc/analysis.ts",
      "src/main/ipc/assistant.ts",
      "src/main/ipc/auth.ts",
      "src/main/ipc/authSession.ts",
      "src/main/ipc/community.ts",
      "src/main/ipc/config.ts",
      "src/main/ipc/daily.ts",
      "src/main/ipc/diagnostics.ts",
      "src/main/ipc/library.ts",
      "src/main/ipc/loadouts.ts",
      "src/main/ipc/manifest.ts",
      "src/main/ipc/startup.ts",
      "src/main/ipc/targets.ts",
      "src/main/ipc/vault.ts",
      "src/main/ipc/wishlist.ts",
      "src/main/workers/heavyTaskWorker.ts"
    ];
    for (const relativePath of desktopRuntimeFiles) {
      const source = readFileSync(join(repoRoot, "packages", "desktop", relativePath), "utf8");
      expect(source, relativePath).not.toContain("@d2-tools/core/config/store");
      if (source.includes("loadConfig")) {
        expect(source, relativePath).toContain("@d2-tools/services/config/store");
      }
    }
  });

  it("keeps Manifest cache adapters in services instead of core", () => {
    const corePackageJson = JSON.parse(readFileSync(join(repoRoot, "packages", "core", "package.json"), "utf8")) as {
      exports: Record<string, unknown>;
    };
    const servicesPackageJson = JSON.parse(readFileSync(join(repoRoot, "packages", "services", "package.json"), "utf8")) as {
      exports: Record<string, unknown>;
    };
    const coreManifestDefinitions = readFileSync(
      join(repoRoot, "packages", "core", "src", "manifest", "definitions.ts"),
      "utf8"
    );
    const coreManifestCache = readFileSync(join(repoRoot, "packages", "core", "src", "manifest", "cache.ts"), "utf8");

    expect(corePackageJson.exports["./manifest/definitions"]).toEqual({
      types: "./dist/manifest/definitions.d.ts",
      import: "./dist/manifest/definitions.js"
    });
    expect(corePackageJson.exports["./manifest/cache"]).toEqual({
      types: "./dist/manifest/cache.d.ts",
      import: "./dist/manifest/cache.js"
    });
    expect(servicesPackageJson.exports["./manifest/definitions"]).toEqual({
      types: "./dist/manifest/definitions.d.ts",
      import: "./dist/manifest/definitions.js"
    });
    expect(servicesPackageJson.exports["./manifest/cache"]).toEqual({
      types: "./dist/manifest/cache.d.ts",
      import: "./dist/manifest/cache.js"
    });
    for (const source of [coreManifestDefinitions, coreManifestCache]) {
      expect(source).not.toContain("node:fs");
      expect(source).not.toContain("existsSync");
      expect(source).not.toContain("mkdirSync");
      expect(source).not.toContain("readFileSync");
      expect(source).not.toContain("writeFileSync");
      expect(source).not.toContain("fetchBungieJson");
    }
    expect(coreManifestDefinitions).not.toContain("initializeDefinitionComponent");
    expect(coreManifestDefinitions).not.toContain("loadDefinitionComponent");
    expect(coreManifestDefinitions).not.toContain("loadDefinitionComponentByLanguage");
    expect(coreManifestDefinitions).not.toContain("getDefinitionStatus");
    expect(coreManifestDefinitions).not.toContain("hasRequiredDefinitionCacheFiles");
    expect(coreManifestDefinitions).not.toContain("hasRequiredDefinitionComponents");
    expect(coreManifestCache).not.toContain("loadManifestMetadataCache");
    expect(coreManifestCache).not.toContain("saveManifestMetadataCache");
    expect(coreManifestCache).not.toContain("getManifestStatus");
    expect(coreManifestCache).not.toContain("initializeManifestMetadata");
    expect(coreManifestCache).not.toContain("checkManifestVersion");
  });

  it("wires desktop Manifest runtime adapters through services", () => {
    const manifestRuntimeConsumers = [
      "src/main/ipc/activities.ts",
      "src/main/ipc/assistant.ts",
      "src/main/ipc/community.ts",
      "src/main/ipc/daily.ts",
      "src/main/ipc/diagnostics.ts",
      "src/main/ipc/library.ts",
      "src/main/ipc/manifest.ts",
      "src/main/ipc/startup.ts",
      "src/main/workers/heavyTaskWorker.ts"
    ];

    for (const relativePath of manifestRuntimeConsumers) {
      const source = readFileSync(join(repoRoot, "packages", "desktop", relativePath), "utf8");
      expect(source, relativePath).not.toContain("@d2-tools/core/manifest/cache");
    }

    const directManifestAdapterConsumers = [
      "src/main/ipc/manifest.ts",
      "src/main/workers/heavyTaskWorker.ts"
    ];
    for (const relativePath of directManifestAdapterConsumers) {
      const source = readFileSync(join(repoRoot, "packages", "desktop", relativePath), "utf8");
      expect(source, relativePath).toMatch(/@d2-tools\/services\/manifest\/(cache|definitions|lifecycle)/);
    }

    const gameDataRuntimeConsumers = [
      "src/main/ipc/activities.ts",
      "src/main/ipc/community.ts",
      "src/main/ipc/library.ts"
    ];
    for (const relativePath of gameDataRuntimeConsumers) {
      const source = readFileSync(join(repoRoot, "packages", "desktop", relativePath), "utf8");
      expect(source, relativePath).toContain("runtime/gameDataRuntime.js");
    }
  });

  it("keeps the services root entry browser-safe for Prototype and Web", () => {
    const servicesIndex = readFileSync(join(repoRoot, "packages", "services", "src", "index.ts"), "utf8");

    expect(servicesIndex).toContain("./contracts.js");
    expect(servicesIndex).toContain("./memoryAdapter.js");
    expect(servicesIndex).toContain("./appServices.js");
    expect(servicesIndex).toContain("./errors.js");
    expect(servicesIndex).not.toContain("./config/store.js");
    expect(servicesIndex).not.toContain("./manifest/cache.js");
    expect(servicesIndex).not.toContain("./manifest/definitions.js");
    expect(servicesIndex).not.toContain("./oauth/callbackServer.js");
    expect(servicesIndex).not.toContain("./oauth/client.js");
    expect(servicesIndex).not.toContain("./oauth/tokenStore.js");
  });

  it("keeps browser-facing source away from the core package root", () => {
    const browserSourceRoots = [
      join(repoRoot, "packages", "prototype", "src"),
      join(repoRoot, "packages", "web", "src"),
      join(repoRoot, "packages", "app", "src"),
      join(repoRoot, "packages", "ui", "src"),
      join(repoRoot, "packages", "desktop", "src", "renderer")
    ];

    for (const root of browserSourceRoots) {
      for (const file of readSourceFiles(root)) {
        expect(file.source, file.path).not.toContain('from "@d2-tools/core"');
        expect(file.source, file.path).not.toContain("from '@d2-tools/core'");
      }
    }
  });

  it("keeps production source behind workspace package exports", () => {
    const packagesRoot = join(repoRoot, "packages");
    const violations: string[] = [];

    for (const packageName of readdirSync(packagesRoot)) {
      const packageRoot = join(packagesRoot, packageName);
      const sourceRoot = join(packageRoot, "src");
      if (!statSync(packageRoot).isDirectory() || !existsSync(sourceRoot)) continue;

      for (const file of readSourceFiles(sourceRoot)) {
        const specifiers = [...file.source.matchAll(
          /\b(?:import|export)\s+(?:type\s+)?(?:[^;]*?\s+from\s+)?["']([^"']+)["']/g
        )].map((match) => match[1]);

        for (const specifier of specifiers) {
          if (/^@d2-tools\/[^/]+\/src(?:\/|$)/.test(specifier)) {
            violations.push(`${relative(repoRoot, file.path)} imports ${specifier}`);
            continue;
          }
          if (!specifier.startsWith(".")) continue;

          const target = relative(packagesRoot, resolve(dirname(file.path), specifier)).replaceAll("\\", "/");
          const [targetPackage, targetRoot] = target.split("/");
          if (targetPackage !== packageName && targetRoot === "src") {
            violations.push(`${relative(repoRoot, file.path)} imports ${specifier}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps preload runtime imports limited to the bundled Electron bridge", () => {
    const preloadSource = readFileSync(join(repoRoot, "packages", "desktop", "src", "preload", "preload.ts"), "utf8");
    const runtimeImports = [...preloadSource.matchAll(
      /^import\s+(?!type\b)[\s\S]*?\s+from\s+["']([^"']+)["'];?\s*$/gm
    )].map((match) => match[1]);

    expect(runtimeImports).toEqual(["electron"]);
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

    expect(desktopPackageJson.scripts.build).toContain("pnpm --filter @d2-tools/services build");
    expect(rootPackageJson.scripts["dev:desktop"]).toBe(
      "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev-desktop.ps1"
    );
    expect(existsSync(join(repoRoot, "启动开发版.bat"))).toBe(false);
    expect(existsSync(scriptPath)).toBe(true);
    expect(script).toContain('"pnpm@9.15.0", "--filter", "@d2-tools/core", "build"');
    expect(script).toContain('"pnpm@9.15.0", "--filter", "@d2-tools/http", "build"');
    expect(script).toContain('"pnpm@9.15.0", "--filter", "@d2-tools/services", "build"');
    expect(script).toContain('"pnpm@9.15.0", "exec", "tsc", "-p", "tsconfig.main.json"');
    expect(script).toContain("tsconfig.main.tsbuildinfo");
    expect(script).toContain("dist\\main\\main.js");
    expect(script).toContain('"pnpm@9.15.0", "exec", "vite", "build", "--config", "vite.preload.config.ts"');
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
