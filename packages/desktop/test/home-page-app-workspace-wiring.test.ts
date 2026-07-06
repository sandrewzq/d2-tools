import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const desktopRoot = join(process.cwd(), "packages", "desktop");
const appRoot = join(process.cwd(), "packages", "app");

describe("home page app workspace wiring", () => {
  it("routes home derived state through app workspace helpers instead of rebuilding assistant context inline", () => {
    const productShell = readFileSync(join(desktopRoot, "src", "renderer", "pages", "useDesktopProductShell.tsx"), "utf8");
    const homeDerivedHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "home", "useHomePageDerivedState.ts"), "utf8");
    const homePageWorkspace = readFileSync(join(appRoot, "src", "workspaces", "homePage.ts"), "utf8");

    expect(productShell).toContain("useHomePageDerivedState");
    expect(productShell).not.toContain('createHomePageDerivedState');
    expect(productShell).not.toContain('buildDiagnosticRows');
    expect(productShell).not.toContain('isAiSettingsConfigured');
    expect(productShell).not.toContain('buildLoadoutTemplateLookup');
    expect(homeDerivedHook).toContain('createHomePageDerivedState');
    expect(homeDerivedHook).toContain('buildDiagnosticRows');
    expect(homeDerivedHook).toContain('isAiSettingsConfigured');
    expect(homeDerivedHook).toContain('buildLoadoutTemplateLookup');
    expect(productShell).not.toContain("buildAssistantPageContext(");
    expect(productShell).not.toContain("function buildLoadoutContextFacts(");
    expect(productShell).not.toContain("function buildLibraryContextFacts(");
    expect(homePageWorkspace).toContain("assistantPageContext");
    expect(homePageWorkspace).toContain("buildLoadoutContextFacts");
    expect(homePageWorkspace).toContain("buildLibraryContextFacts");
  });
});
