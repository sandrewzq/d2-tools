import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("kohinata loadout draft UI", () => {
  it("routes generated drafts through existing loadout save behavior", () => {
    const sidebar = readFileSync("packages/desktop/src/renderer/components/GlobalAssistantSidebar.tsx", "utf8");
    const loadoutActions = readFileSync("packages/desktop/src/renderer/features/loadouts/useLoadoutWriteActions.ts", "utf8");
    const homePage = readFileSync("packages/desktop/src/renderer/pages/HomePage.tsx", "utf8");

    expect(sidebar).toContain("handleSaveDraft");
    expect(sidebar).toContain("onSaveGuideDraft");
    expect(homePage).toContain("onSaveGuideDraft");
    expect(loadoutActions).toContain("saveGuideDraft");
    expect(loadoutActions).toContain("createLoadoutTemplate");
  });
});
