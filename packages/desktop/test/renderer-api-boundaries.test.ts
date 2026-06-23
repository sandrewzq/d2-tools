import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const apiRoot = fileURLToPath(new URL("../src/renderer/api/", import.meta.url));
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
  "vaultApi.ts"
];

describe("renderer API boundary", () => {
  it("keeps platform-neutral API types outside the Electron renderer binding", () => {
    expect(existsSync(typesPath)).toBe(true);

    const clientSource = readFileSync(clientPath, "utf8");
    const typesSource = readFileSync(typesPath, "utf8");
    const accountApiSource = readFileSync(accountApiPath, "utf8");
    const dailyApiSource = readFileSync(dailyApiPath, "utf8");

    expect(typesSource).toContain("export type AppApi");
    expect(countExportType(typesSource, "AppApi")).toBe(1);
    expect(countExportType(accountApiSource, "AccountSummary")).toBe(1);
    expect(countExportType(dailyApiSource, "DailySummary")).toBe(1);

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
});

function countExportType(source: string, name: string): number {
  return [...source.matchAll(new RegExp(`export type ${name}\\b`, "g"))].length;
}
