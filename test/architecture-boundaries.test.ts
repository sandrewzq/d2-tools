import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { globSync } from "glob";

const root = process.cwd();

const coreBoundaryRule: ForbiddenImportRule = {
  packageNames: ["@d2-tools/platform", "@d2-tools/data", "@d2-tools/ui"],
  packagePrefixes: ["apps/"],
  paths: ["packages/platform", "packages/data", "packages/ui", "apps"]
};

const uiBoundaryRule: ForbiddenImportRule = {
  packageNames: ["@d2-tools/platform"],
  packagePrefixes: ["@tauri-apps/", "apps/"],
  paths: ["apps", "packages/platform"]
};

const dataBoundaryRule: ForbiddenImportRule = {
  packageNames: ["@d2-tools/platform/desktop", "@d2-tools/platform/mock"],
  packagePrefixes: ["@tauri-apps/", "apps/", "packages/platform/src/desktop"],
  paths: ["apps", "packages/platform/src/desktop.ts"]
};

const desktopAppBoundaryRule: ForbiddenImportRule = {
  packagePrefixes: ["@tauri-apps/"],
  paths: ["packages/platform/src/desktop.ts"]
};

type SourceFile = {
  path: string;
  fullPath: string;
  content: string;
};

type ForbiddenImportRule = {
  packageNames?: string[];
  packagePrefixes?: string[];
  paths?: string[];
};

function readSourceFiles(scope: string): SourceFile[] {
  return globSync(`${scope}/**/*.{ts,tsx}`, {
    cwd: root,
    ignore: ["**/dist/**", "**/node_modules/**"]
  }).map((path) => {
    const fullPath = join(root, path);

    return {
      path,
      fullPath,
      content: readFileSync(fullPath, "utf8")
    };
  });
}

function extractImportSpecifiers(content: string): string[] {
  const sourceFile = ts.createSourceFile("source.tsx", content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const specifiers: string[] = [];

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1
    ) {
      const [specifier] = node.arguments;
      if (specifier && ts.isStringLiteralLike(specifier)) {
        specifiers.push(specifier.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return specifiers;
}

function isForbiddenImport(filePath: string, specifier: string, rule: ForbiddenImportRule | string[]): boolean {
  const normalizedRule = Array.isArray(rule) ? { paths: rule } : rule;

  if (matchesForbiddenPackage(specifier, normalizedRule.packageNames ?? [], normalizedRule.packagePrefixes ?? [])) {
    return true;
  }

  const resolvedPath = resolveSpecifierPath(filePath, specifier);
  if (!resolvedPath) {
    return false;
  }

  return (normalizedRule.paths ?? []).some((forbiddenPath) => matchesForbiddenPath(resolvedPath, forbiddenPath));
}

function matchesForbiddenPackage(specifier: string, packageNames: string[], packagePrefixes: string[]): boolean {
  return (
    packageNames.some((packageName) => specifier === packageName || specifier.startsWith(`${packageName}/`)) ||
    packagePrefixes.some((packagePrefix) => specifier.startsWith(packagePrefix))
  );
}

function resolveSpecifierPath(filePath: string, specifier: string): string | null {
  if (specifier.startsWith(".")) {
    return resolve(dirname(filePath), specifier);
  }

  if (specifier.startsWith("apps/") || specifier.startsWith("packages/")) {
    return resolve(root, specifier);
  }

  return null;
}

function matchesForbiddenPath(resolvedPath: string, forbiddenPath: string): boolean {
  const forbiddenFullPath = resolve(root, forbiddenPath);

  if (looksLikeFilePath(forbiddenFullPath)) {
    return stripKnownExtension(resolvedPath) === stripKnownExtension(forbiddenFullPath);
  }

  const pathFromForbidden = relative(forbiddenFullPath, resolvedPath);
  return pathFromForbidden === "" || (!pathFromForbidden.startsWith("..") && !isAbsolute(pathFromForbidden));
}

function looksLikeFilePath(filePath: string): boolean {
  return extname(filePath) !== "";
}

function stripKnownExtension(filePath: string): string {
  return filePath.replace(/\.(c|m)?[jt]sx?$/, "");
}

function expectNoForbiddenImports(scope: string, rule: ForbiddenImportRule, reason: string) {
  const offenders = readSourceFiles(scope).flatMap((file) =>
    extractImportSpecifiers(file.content)
      .filter((specifier) => isForbiddenImport(file.fullPath, specifier, rule))
      .map((specifier) => `${relative(root, file.fullPath)} imports "${specifier}": ${reason}`)
  );

  expect(
    offenders
  ).toEqual([]);
}

function expectNoForbiddenImportsOutside(
  scope: string,
  allowedScope: string,
  rule: ForbiddenImportRule,
  reason: string
) {
  const allowedFullPath = resolve(root, allowedScope);
  const offenders = readSourceFiles(scope)
    .filter((file) => !isPathInside(file.fullPath, allowedFullPath))
    .flatMap((file) =>
      extractImportSpecifiers(file.content)
        .filter((specifier) => isForbiddenImport(file.fullPath, specifier, rule))
        .map((specifier) => `${relative(root, file.fullPath)} imports "${specifier}": ${reason}`)
    );

  expect(offenders).toEqual([]);
}

function isPathInside(filePath: string, scopePath: string): boolean {
  const pathFromScope = relative(scopePath, filePath);
  return pathFromScope === "" || (!pathFromScope.startsWith("..") && !isAbsolute(pathFromScope));
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(join(root, path), "utf8")) as T;
}

function readTextFile(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function readPackageJson(path: string): {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  exports?: Record<string, unknown>;
} {
  return readJsonFile(path);
}

function readDependencyNames(packageJsonPath: string): string[] {
  const packageJson = readPackageJson(packageJsonPath);
  return [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {})
  ];
}

describe("architecture boundaries", () => {
  it("extracts static, re-export, side-effect, and dynamic import specifiers", () => {
    const specifiers = extractImportSpecifiers(`
      import defaultExport from "@d2-tools/data";
      import type { PlatformServices } from "@d2-tools/platform";
      export { createDataServices } from "@d2-tools/data";
      import "@tauri-apps/api/core";
      const desktop = await import("@d2-tools/platform/desktop");
    `);

    expect(specifiers).toEqual([
      "@d2-tools/data",
      "@d2-tools/platform",
      "@d2-tools/data",
      "@tauri-apps/api/core",
      "@d2-tools/platform/desktop"
    ]);
  });

  it("resolves relative import specifiers before checking forbidden directories", () => {
    const filePath = join(root, "packages/core/src/example.ts");

    expect(isForbiddenImport(filePath, "../../../apps/desktop/src/App", ["apps"])).toBe(true);
    expect(isForbiddenImport(filePath, "../../data/src/index", ["packages/data"])).toBe(true);
  });

  it("ignores comments and ordinary strings when extracting import specifiers", () => {
    const specifiers = extractImportSpecifiers(`
      // import "@tauri-apps/api/core";
      const example = 'import "@d2-tools/data"';
    `);

    expect(specifiers).toEqual([]);
  });

  it("allows data to import platform contracts but blocks the desktop adapter", () => {
    const filePath = join(root, "packages/data/src/createDataServices.ts");

    expect(isForbiddenImport(filePath, "@d2-tools/platform", dataBoundaryRule)).toBe(false);
    expect(isForbiddenImport(filePath, "@d2-tools/platform/desktop", dataBoundaryRule)).toBe(true);
    expect(isForbiddenImport(filePath, "@d2-tools/platform/mock", dataBoundaryRule)).toBe(true);
    expect(isForbiddenImport(filePath, "packages/platform/src/desktop", dataBoundaryRule)).toBe(true);
    expect(isForbiddenImport(filePath, "../../platform/src/desktop", dataBoundaryRule)).toBe(true);
  });

  it("platform root exports contracts only and exposes adapters through subpaths", () => {
    const rootSpecifiers = extractImportSpecifiers(readTextFile("packages/platform/src/index.ts"));
    const packageExports = readPackageJson("packages/platform/package.json").exports;

    expect(rootSpecifiers).not.toContain("./desktop");
    expect(rootSpecifiers).not.toContain("./mock");
    expect(packageExports).toMatchObject({
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js"
      },
      "./desktop": {
        types: "./dist/desktop.d.ts",
        import: "./dist/desktop.js"
      },
      "./mock": {
        types: "./dist/mock.d.ts",
        import: "./dist/mock.js"
      }
    });
  });

  it("package dependencies keep ui and data on their intended platform boundary", () => {
    expect(readDependencyNames("packages/ui/package.json")).not.toContain("@d2-tools/platform");
    expect(readDependencyNames("packages/data/package.json")).toContain("@d2-tools/platform");
    expect(readDependencyNames("packages/data/package.json")).not.toContain("@d2-tools/platform/desktop");
    expect(readDependencyNames("packages/data/package.json")).not.toContain("@d2-tools/platform/mock");
  });

  it("release workflow no longer references the old Electron package paths", () => {
    const releaseWorkflow = readTextFile(".github/workflows/release.yml");

    expect(releaseWorkflow).not.toContain("packages/desktop");
    expect(releaseWorkflow).not.toContain("packages/http");
    expect(releaseWorkflow).not.toContain("electron-builder");
    expect(releaseWorkflow).toContain("apps/desktop");
  });

  it("local package script uses the Tauri desktop package path", () => {
    const localPackageScript = readTextFile("scripts/local-package.ps1");

    expect(localPackageScript).not.toContain("packages/desktop");
    expect(localPackageScript).not.toContain("package:win");
    expect(localPackageScript).toContain("@d2-tools/desktop package:desktop");
    expect(localPackageScript).toContain("apps/desktop/src-tauri/target/release/bundle/nsis");
  });

  it("local desktop dev script uses the Tauri dev entrypoint", () => {
    const devDesktopScript = readTextFile("scripts/dev-desktop.ps1");

    expect(devDesktopScript).not.toContain("packages\\desktop");
    expect(devDesktopScript).not.toContain("@d2-tools/http");
    expect(devDesktopScript).not.toContain("dev:electron");
    expect(devDesktopScript).toContain("@d2-tools/desktop");
    expect(devDesktopScript).toContain("dev:desktop");
  });

  it("desktop Vite dev server does not watch Rust build artifacts", () => {
    const viteConfig = readTextFile("apps/desktop/vite.config.ts");

    expect(viteConfig).toContain("src-tauri/target");
  });

  it("desktop validation scripts build workspace dependencies before reading dist exports", () => {
    const desktopPackage = readJsonFile<{
      scripts?: Record<string, string>;
    }>("apps/desktop/package.json");
    const scripts = desktopPackage.scripts ?? {};

    const dependencyBuildScript = scripts["build:deps"];

    expect(dependencyBuildScript, "build:deps must exist").toBeTypeOf("string");
    expect(dependencyBuildScript).toContain("@d2-tools/platform build");
    expect(dependencyBuildScript).toContain("@d2-tools/ui build");
    expect(dependencyBuildScript).toContain("@d2-tools/data build");

    for (const scriptName of ["pretypecheck", "pretest", "prebuild"]) {
      const script = scripts[scriptName];

      expect(script, `${scriptName} must exist`).toBeTypeOf("string");
      expect(script).toBe("pnpm build:deps");
    }
  });

  it("tauri configuration uses a CSP and does not grant unused shell open permissions", () => {
    const tauriConfig = readJsonFile<{
      app?: { security?: { csp?: string | null } };
      plugins?: { updater?: { endpoints?: string[]; pubkey?: string } };
    }>("apps/desktop/src-tauri/tauri.conf.json");
    const capabilities = readJsonFile<{ permissions?: string[] }>(
      "apps/desktop/src-tauri/capabilities/default.json"
    );
    const cargoToml = readTextFile("apps/desktop/src-tauri/Cargo.toml");
    const libRs = readTextFile("apps/desktop/src-tauri/src/lib.rs");

    expect(tauriConfig.app?.security?.csp).toBeTypeOf("string");
    expect(tauriConfig.app?.security?.csp).not.toBe("");
    expect(tauriConfig.app?.security?.csp).not.toBeNull();
    expect(tauriConfig.plugins?.updater?.endpoints).toEqual([]);
    expect(tauriConfig.plugins?.updater?.pubkey).toBe("");
    expect(capabilities.permissions ?? []).not.toContain("shell:allow-open");
    expect(cargoToml).not.toContain("tauri-plugin-shell");
    expect(libRs).not.toContain("tauri_plugin_shell");
  });

  it("core does not depend on platform, data, ui, or apps", () => {
    expectNoForbiddenImports(
      "packages/core/src",
      coreBoundaryRule,
      "core must stay platform independent"
    );
  });

  it("ui does not import tauri or app code", () => {
    expectNoForbiddenImports(
      "packages/ui/src",
      uiBoundaryRule,
      "ui must not call platform APIs directly"
    );
  });

  it("data does not import app code or tauri", () => {
    expectNoForbiddenImports(
      "packages/data/src",
      dataBoundaryRule,
      "data must use platform contracts only"
    );
  });

  it("desktop pages and components do not call Tauri invoke directly", () => {
    expectNoForbiddenImportsOutside(
      "apps/desktop/src",
      "apps/desktop/src/platform",
      desktopAppBoundaryRule,
      "desktop app code must use the platform adapter; only apps/desktop/src/platform may assemble it"
    );
  });

  it("desktop platform assembly is the only app source allowed to import the desktop adapter", () => {
    expectNoForbiddenImportsOutside(
      "apps/desktop/src",
      "apps/desktop/src/platform",
      {
        packageNames: ["@d2-tools/platform/desktop"],
        paths: ["packages/platform/src/desktop.ts"]
      },
      "desktop adapter imports must stay inside apps/desktop/src/platform"
    );
  });

  it("desktop app exists", () => {
    expect(existsSync(join(root, "apps/desktop/src-tauri/tauri.conf.json"))).toBe(true);
  });

  it("tauri Windows resources include the required icon", () => {
    const iconPath = join(root, "apps/desktop/src-tauri/icons/icon.ico");

    expect(existsSync(iconPath)).toBe(true);
    expect(statSync(iconPath).size).toBeGreaterThan(0);
  });
});
