import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));
const uiRoot = fileURLToPath(new URL("../../ui", import.meta.url));

describe("account postmaster and loadout UI", () => {
  it("keeps read-only postmaster on the account page and moves in-game loadout slots out of account", () => {
    const accountPage = [
      readFileSync(join(uiRoot, "src", "account", "AccountPageContentView.tsx"), "utf8"),
      readFileSync(join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"), "utf8")
    ].join("\n");
    const loadoutsPage = [
      readFileSync(join(uiRoot, "src", "loadouts", "LoadoutsPageContentView.tsx"), "utf8"),
      readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "LoadoutsPage.tsx"), "utf8")
    ].join("\n");

    expect(accountPage).toContain("viewModel.postmaster.items");
    expect(accountPage).toContain("邮政官");
    expect(accountPage).not.toContain("accountWorkspace.loadoutSlotRows");
    expect(accountPage).not.toContain("游戏内配装栏");
    expect(loadoutsPage).toContain("配装工作台");
    expect(loadoutsPage).toContain("loadout-entry-source-filter");
    expect(loadoutsPage).toContain("游戏内");
    expect(loadoutsPage).toContain("onEquipSavedLoadout");
    expect(loadoutsPage).toContain("onSnapshotCurrentLoadout");
  });
});
