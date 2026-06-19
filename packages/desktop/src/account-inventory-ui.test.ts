import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("account inventory UI", () => {
  it("shows equipped gear and character backpack as separate sections", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    expect(homePage).toContain("已装备");
    expect(homePage).toContain("背包");
    expect(homePage).toContain("groupAccountItemsBySlot(character.inventory_items)");
    expect(homePage).toContain("account-slot-category");
    expect(homePage).toContain("account-slot-group");
    expect(homePage).toContain("装备最高光等");
    expect(homePage).toContain("createHighestPowerEquipPlan");
    expect(homePage).toContain("source_character_id: character.character_id");
  });

  it("shows profile materials instead of a misleading vault preview", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    expect(homePage).toContain("材料与消耗品");
    expect(homePage).toContain("accountSummary.materials.items");
    expect(homePage).toContain("material.quantity");
    expect(homePage).not.toContain("仓库预览");
  });
});
