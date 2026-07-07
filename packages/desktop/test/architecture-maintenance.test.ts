import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

describe("architecture maintenance guardrails", () => {
  it("uses one shared page label source for app workspace and desktop assistant surfaces", () => {
    const appIndex = readFileSync(join(repoRoot, "packages", "app", "src", "index.ts"), "utf8");
    const homePageWorkspace = readFileSync(join(repoRoot, "packages", "app", "src", "workspaces", "homePage.ts"), "utf8");
    const assistantContext = readFileSync(join(desktopRoot, "src", "renderer", "shared", "domain", "assistant", "assistantContext.ts"), "utf8");
    const globalAssistant = readFileSync(join(desktopRoot, "src", "renderer", "components", "GlobalAssistantSidebar.tsx"), "utf8");

    expect(appIndex).toContain("homePageLabels");
    expect(homePageWorkspace).toContain("homePageLabels");
    expect(assistantContext).toContain("homePageLabels");
    expect(globalAssistant).toContain("homePageLabels");
    expect(globalAssistant).not.toContain("const pageLabels");
    expect(assistantContext).not.toContain("const pageLabels");
  });

  it("caps item detail cache with an LRU eviction limit", () => {
    const hook = readFileSync(join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetail.ts"), "utf8");

    expect(hook).toContain("ITEM_DETAIL_CACHE_LIMIT");
    expect(hook).toContain("touchItemDetailCache");
    expect(hook).toContain("evictOldestItemDetailCacheEntry");
    expect(hook).toContain("itemDetailCacheRef.current.delete(oldestKey)");
  });

  it("keeps desktop app services delegated to the shared desktop bridge adapter", () => {
    const appServices = readFileSync(join(repoRoot, "packages", "services", "src", "appServices.ts"), "utf8");
    const desktopBridge = readFileSync(join(repoRoot, "packages", "services", "src", "desktopBridge.ts"), "utf8");
    const rendererServices = readFileSync(join(desktopRoot, "src", "renderer", "api", "services.ts"), "utf8");

    expect(appServices).toContain("createDesktopBridgeServices");
    expect(appServices).toContain("return createDesktopBridgeServices(api)");
    expect(appServices).not.toContain("createD2SkillService");
    expect(desktopBridge).toContain("export function createDesktopBridgeServices");
    expect(rendererServices).toContain("createAppServices(api)");
  });

  it("keeps migrated loadouts page behavior out of source-string UI assertions", () => {
    const loadoutsUiTest = readFileSync(join(desktopRoot, "test", "loadout-library-ui.test.ts"), "utf8");
    const sharedUiPageViewsTest = readFileSync(join(desktopRoot, "test", "shared-ui-page-views.test.tsx"), "utf8");

    expect(sharedUiPageViewsTest).toContain("renders the loadouts workbench from the page model contract");
    expect(sharedUiPageViewsTest).toContain("renders saved loadout compare rows from the page model contract");
    expect(sharedUiPageViewsTest).toContain("renderToStaticMarkup");
    expect(sharedUiPageViewsTest).toContain("selectLoadoutsPageModel");
    expect(loadoutsUiTest).not.toContain("presents local templates and in-game slots as one loadout workbench");
    expect(loadoutsUiTest).not.toContain("lets app-modeled in-game loadout slots open their own detail panel");
    expect(loadoutsUiTest).not.toContain("renders compare rows as side-by-side item, frame, and perk details");
  });
});
