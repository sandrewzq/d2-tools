import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const desktopRoot = join(process.cwd(), "packages", "desktop");
const appRoot = join(process.cwd(), "packages", "app");

describe("home page app workspace wiring", () => {
  it("routes home derived state through app workspace helpers instead of rebuilding assistant context inline", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const homeDerivedHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "home", "useHomePageDerivedState.ts"), "utf8");
    const homePageWorkspace = readFileSync(join(appRoot, "src", "workspaces", "homePage.ts"), "utf8");

    expect(homePage).toContain("useHomePageDerivedState");
    expect(homePage).not.toContain('createHomePageDerivedState');
    expect(homePage).not.toContain('buildDiagnosticRows');
    expect(homePage).not.toContain('isAiSettingsConfigured');
    expect(homePage).not.toContain('buildLoadoutTemplateLookup');
    expect(homeDerivedHook).toContain('createHomePageDerivedState');
    expect(homeDerivedHook).toContain('buildDiagnosticRows');
    expect(homeDerivedHook).toContain('isAiSettingsConfigured');
    expect(homeDerivedHook).toContain('buildLoadoutTemplateLookup');
    expect(homePage).not.toContain("buildAssistantPageContext(");
    expect(homePage).not.toContain("function buildLoadoutContextFacts(");
    expect(homePage).not.toContain("function buildLibraryContextFacts(");
    expect(homePageWorkspace).toContain("assistantPageContext");
    expect(homePageWorkspace).toContain("buildLoadoutContextFacts");
    expect(homePageWorkspace).toContain("buildLibraryContextFacts");
  });
});
