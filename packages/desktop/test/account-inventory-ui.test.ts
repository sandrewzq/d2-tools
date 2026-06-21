import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("account inventory UI", () => {
  it("uses DIM-style character tabs and separates equipped items from inventory", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    expect(homePage).toContain("selectedCharacterId");
    expect(homePage).toContain("character-tabs");
    expect(homePage).toContain("character-tab");
    expect(homePage).toContain("getCharacterCombinedItems");
    expect(homePage).toContain("当前角色装备");
    expect(homePage).toContain("account-slot-category");
    expect(homePage).toContain("account-slot-group");
    expect(homePage).toContain('label="已装备"');
    expect(homePage).toContain('label="背包"');
    expect(homePage).toContain('isAccountItemFromSource(item, "equipped")');
    expect(homePage).toContain('isAccountItemFromSource(item, "inventory")');
    expect(homePage).toContain("account-slot-source-cluster");
    expect(homePage).toContain('"equipment-item"');
    expect(homePage).toContain('isEquipped ? "equipped" : "inventory"');
    expect(homePage).toContain("装备最高光等");
    expect(homePage).toContain("createHighestPowerEquipPlan");
    expect(homePage).toContain("source_character_id: selectedCharacter.character_id");
  });

  it("highlights items that belong to the selected local loadout template", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    expect(homePage).toContain("buildLoadoutTemplateLookup");
    expect(homePage).toContain("matchesLoadoutTemplateItem");
    expect(homePage).toContain("loadout-template-badge");
    expect(homePage).toContain("loadout-highlight");
    expect(homePage).toContain("highlightedTemplate");
  });

  it("shows how many current character items match the active local loadout", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    expect(homePage).toContain("selectedCharacterLoadoutMatchCount");
    expect(homePage).toContain("方案命中");
  });

  it("auto-loads account data when startup says login is ready", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    expect(homePage).toContain("hasAutoLoadedAccount");
    expect(homePage).toContain('props.state.nextStep === "home"');
    expect(homePage).toContain("void loadAccountSummary()");
    expect(homePage).toContain("登录可能已失效，请重新登录 Bungie");
  });

  it("shows profile materials instead of a misleading vault preview", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    expect(homePage).toContain("材料与消耗品");
    expect(homePage).toContain("accountSummary.materials.items");
    expect(homePage).toContain("material.quantity");
    expect(homePage).not.toContain("materials.items.slice(0, 40)");
    expect(homePage).not.toContain("仓库预览");
  });
});
