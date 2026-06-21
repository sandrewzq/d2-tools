import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("account postmaster and loadout UI", () => {
  it("shows read-only postmaster and in-game loadout sections on the account page", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    expect(homePage).toContain("selectedCharacter.postmaster_items");
    expect(homePage).toContain("selectedCharacter.loadout_slots");
    expect(homePage).toContain("邮政官");
    expect(homePage).toContain("游戏内配装栏");
  });
});
