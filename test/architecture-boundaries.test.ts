import { existsSync, readFileSync } from "node:fs";
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
  packagePrefixes: ["@tauri-apps/", "apps/"],
  paths: ["apps"]
};

const dataBoundaryRule: ForbiddenImportRule = {
  packageNames: ["@d2-tools/platform/desktop"],
  packagePrefixes: ["@tauri-apps/", "apps/", "packages/platform/src/desktop"],
  paths: ["apps", "packages/platform/src/desktop.ts"]
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
    expect(isForbiddenImport(filePath, "packages/platform/src/desktop", dataBoundaryRule)).toBe(true);
    expect(isForbiddenImport(filePath, "../../platform/src/desktop", dataBoundaryRule)).toBe(true);
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

  it("desktop app exists", () => {
    expect(existsSync(join(root, "apps/desktop/src-tauri/tauri.conf.json"))).toBe(true);
  });
});
