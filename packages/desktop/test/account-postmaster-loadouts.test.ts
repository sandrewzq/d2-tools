import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("account postmaster and loadout UI", () => {
  it("keeps read-only postmaster on the account page and moves in-game loadout slots out of account", () => {
    const accountPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"),
      "utf8"
    );
    const loadoutsPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "loadouts", "LoadoutsPage.tsx"),
      "utf8"
    );

    expect(accountPage).toContain("accountWorkspace.postmasterPreviewItems");
    expect(accountPage).toContain("邮政官");
    expect(accountPage).not.toContain("accountWorkspace.loadoutSlotRows");
    expect(accountPage).not.toContain("游戏内配装栏");
    expect(loadoutsPage).toContain("游戏内配装栏");
    expect(loadoutsPage).toContain("onEquipSavedLoadout");
    expect(loadoutsPage).toContain("onSnapshotCurrentLoadout");
  });
});
