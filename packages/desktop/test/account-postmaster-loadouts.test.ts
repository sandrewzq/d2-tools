import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("account postmaster and loadout UI", () => {
  it("shows read-only postmaster and in-game loadout sections on the account page", () => {
    const accountPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"),
      "utf8"
    );

    expect(accountPage).toContain("selectedCharacter.postmaster_items");
    expect(accountPage).toContain("selectedCharacter.loadout_slots");
    expect(accountPage).toContain("邮政官");
    expect(accountPage).toContain("游戏内配装栏");
  });
});
