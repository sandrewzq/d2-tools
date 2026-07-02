import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const appRoot = join(repoRoot, "packages", "app", "src");
const servicesRoot = join(repoRoot, "packages", "services", "src");
const uiRoot = join(repoRoot, "packages", "ui", "src");

describe("multi-platform package boundaries", () => {
  it("keeps app package independent from desktop and platform runtime modules", () => {
    expect(findForbiddenImports(appRoot, [
      "@d2-tools/desktop",
      "electron",
      "node:",
      "../desktop",
      "../../desktop"
    ])).toEqual([]);
  });

  it("keeps services contracts independent from desktop and UI packages", () => {
    expect(findForbiddenImports(servicesRoot, [
      "@d2-tools/desktop",
      "electron",
      "react",
      "react-dom",
      "../desktop",
      "../../desktop"
    ])).toEqual([]);
  });

  it("keeps shared UI independent from desktop runtime and localized label logic", () => {
    expect(findForbiddenImports(uiRoot, [
      "@d2-tools/desktop",
      "electron",
      "node:",
      "../desktop",
      "../../desktop"
    ])).toEqual([]);

    const appShell = readFileSync(join(uiRoot, "shell", "AppShell.tsx"), "utf8");
    expect(appShell).not.toContain('includes("账号")');
    expect(appShell).not.toContain("AI 助手抽屉");
  });
});

function findForbiddenImports(root: string, forbiddenSpecifiers: string[]): string[] {
  return sourceFiles(root).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return [...source.matchAll(/\bimport\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g)]
      .map((match) => match[1])
      .filter((specifier) => forbiddenSpecifiers.some((forbidden) => specifier === forbidden || specifier.startsWith(forbidden)))
      .map((specifier) => `${relative(repoRoot, file)} imports ${specifier}`);
  });
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      return sourceFiles(fullPath);
    }

    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}
