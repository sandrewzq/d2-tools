import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const apiRoot = fileURLToPath(new URL("../src/renderer/api/", import.meta.url));
const rendererRoot = fileURLToPath(new URL("../src/renderer/", import.meta.url));
const testRoot = fileURLToPath(new URL("../test/", import.meta.url));
const clientPath = `${apiRoot}client.ts`;
const typesPath = `${apiRoot}types.ts`;
const accountApiPath = `${apiRoot}accountApi.ts`;
const dailyApiPath = `${apiRoot}dailyApi.ts`;
const domainApiFiles = [
  "accountApi.ts",
  "actionsApi.ts",
  "aiApi.ts",
  "communityApi.ts",
  "configApi.ts",
  "dailyApi.ts",
  "diagnosticsApi.ts",
  "libraryApi.ts",
  "loadoutApi.ts",
  "manifestApi.ts",
  "sharedTypes.ts",
  "targetApi.ts",
  "updateApi.ts",
  "vaultApi.ts",
  "windowApi.ts"
];

describe("renderer API boundary", () => {
  it("keeps platform-neutral API types outside the Electron renderer binding", () => {
    expect(existsSync(typesPath)).toBe(true);

    const clientSource = readFileSync(clientPath, "utf8");
    const typesSource = readFileSync(typesPath, "utf8");
    const accountApiSource = readFileSync(accountApiPath, "utf8");
    const dailyApiSource = readFileSync(dailyApiPath, "utf8");
    const sharedTypesSource = readFileSync(`${apiRoot}sharedTypes.ts`, "utf8");

    expect(typesSource).toContain("export type AppApi");
    expect(countExportType(typesSource, "AppApi")).toBe(1);
    expect(countExportType(accountApiSource, "AccountSummary")).toBe(1);
    expect(countExportType(dailyApiSource, "DailySummary")).toBe(1);
    expect(sharedTypesSource).toContain("@d2-tools/core/account/summary");
    expect(sharedTypesSource).not.toContain("export type AccountItemSummary =");
    expect(sharedTypesSource).not.toContain("socket_plugs?:");

    expect(clientSource).toContain("import type { AppApi } from \"./types\"");
    expect(clientSource).toContain("export const api");
    expect(clientSource).toContain("window.d2");
    expect(clientSource).toContain("export type * from \"./types\"");
    expect(clientSource).not.toContain("export type AccountSummary");
    expect(clientSource).not.toContain("export type DailySummary");
    expect(clientSource).not.toContain("export type D2Config");
  });

  it("keeps renderer API contracts split by product domain", () => {
    const typesSource = readFileSync(typesPath, "utf8");

    for (const file of domainApiFiles) {
      expect(existsSync(`${apiRoot}${file}`), file).toBe(true);
      expect(typesSource).toContain(`export type * from "./${file.replace(/\.ts$/, "")}"`);
    }

    expect(typesSource).toContain("export type AppApi =");
    expect(typesSource).toContain("AccountApi");
    expect(typesSource).toContain("VaultApi");
    expect(typesSource).toContain("LibraryApi");
    expect(typesSource).not.toContain("export type AccountSummary =");
    expect(typesSource).not.toContain("export type DailySummary =");
    expect(typesSource.split(/\r?\n/).length).toBeLessThanOrEqual(80);
  });

  it("keeps api/client as a runtime-only renderer import", () => {
    const offenders = [...listSourceFiles(rendererRoot), ...listSourceFiles(testRoot)]
      .map((file) => {
        const source = readFileSync(file, "utf8");
        const importStatements = source.match(/import\s+[\s\S]*?from\s+["'][^"']+["'];?/g) ?? [];
        const hasTypeClientImport = importStatements.some((statement) =>
          /^import\s+type\b/.test(statement) && /from\s+["'][^"']*api\/client["']/.test(statement)
        );
        const hasMixedClientTypeImport = importStatements.some((statement) =>
          /^import\s+\{/.test(statement)
          && /\btype\s+\w+/.test(statement)
          && /from\s+["'][^"']*api\/client["']/.test(statement)
        );
        return hasTypeClientImport || hasMixedClientTypeImport ? relative(fileURLToPath(new URL("..", import.meta.url)), file) : null;
      })
      .filter(Boolean);

    expect(offenders).toEqual([]);
  });
});

function countExportType(source: string, name: string): number {
  return [...source.matchAll(new RegExp(`export type ${name}\\b`, "g"))].length;
}

function listSourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}
