import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const coreRoot = join(repoRoot, "packages", "core", "src");
const appRoot = join(repoRoot, "packages", "app", "src");
const servicesRoot = join(repoRoot, "packages", "services", "src");
const uiRoot = join(repoRoot, "packages", "ui", "src");

describe("multi-platform package boundaries", () => {
  it("prevents new core runtime IO and HTTP dependencies", () => {
    const legacyRuntimeFiles = new Set([
      "actions/log.ts",
      "analysis/targetRulesStore.ts",
      "analysis/wishlistStore.ts",
      "bungie/client.ts",
      "community-perks/aiLightggSource.ts",
      "community-perks/localCommunityRecommendations.ts",
      "community-perks/personalWeaponKnowledge.ts",
      "config/defaults.ts",
      "items/aliases.ts",
      "library/history.ts",
      "loadouts/templates.ts",
      "tools/audit.ts",
      "vault/tags.ts"
    ]);
    const legacyBungieCallers = new Set([
      "account/summary.ts",
      "activities/history.ts",
      "daily/liveData.ts",
      "items/liveAvailability.ts",
      "weekly/liveData.ts"
    ]);

    expect(sourceFiles(coreRoot).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const path = relative(coreRoot, file).replaceAll("\\", "/");
      const violations: string[] = [];
      if (/from\s+["']node:(?:fs|fs\/promises|crypto|path|os)["']/.test(source)
        && !legacyRuntimeFiles.has(path)) {
        violations.push(`${path} adds a Node runtime dependency`);
      }
      if (/from\s+["']\.\.\/bungie\/client\.js["']/.test(source)
        && !legacyBungieCallers.has(path)) {
        violations.push(`${path} adds a direct Bungie HTTP dependency`);
      }
      return violations;
    })).toEqual([]);
  });

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
