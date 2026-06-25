import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("account inventory UI", () => {
  it("uses DIM-style character tabs and splits equipped items from carried inventory in the main workbench", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const accountPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"),
      "utf8"
    );
    const loadoutWriteHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "loadouts", "useLoadoutWriteActions.ts"),
      "utf8"
    );

    expect(homePage).toContain("<AccountPage");
    expect(homePage).not.toContain("function renderAccountPanel");
    expect(accountPage).toContain("export function AccountPage");
    expect(accountPage).toContain("selectedCharacterId");
    expect(accountPage).toContain("character-tabs");
    expect(accountPage).toContain("character-tab");
    expect(accountPage).toContain("当前角色装备");
    expect(accountPage).toContain("当前角色背包");
    expect(accountPage).toContain("account-primary-workbench");
    expect(accountPage).toContain("account-secondary-workbench");
    expect(accountPage).toContain("account-character-summary");
    expect(accountPage).toContain("account-equipped-panel");
    expect(accountPage).toContain("account-inventory-panel");
    expect(accountPage).toContain("groupAccountItemsBySlot(selectedCharacter.equipped_items)");
    expect(accountPage).toContain("groupAccountItemsBySlot(selectedCharacter.inventory_items)");
    expect(accountPage).toContain("account-slot-category");
    expect(accountPage).toContain("account-slot-group");
    expect(accountPage).not.toContain("account-slot-source-cluster");
    expect(accountPage).not.toContain('renderAccountSlotSourceCluster("已装备"');
    expect(accountPage).not.toContain('renderAccountSlotSourceCluster("背包"');
    expect(accountPage).toContain('"equipment-item"');
    expect(accountPage).toContain('source === "equipped" ? "equipped" : "inventory"');
    expect(accountPage).toContain("装备最高光等");
    expect(loadoutWriteHook).toContain("createHighestPowerEquipPlan");
    expect(accountPage).toContain("source_character_id: selectedCharacter.character_id");
  });

  it("highlights items that belong to the selected local loadout template", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );
    const accountPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"),
      "utf8"
    );

    expect(homePage).toContain("buildLoadoutTemplateLookup");
    expect(accountPage).toContain("matchesLoadoutTemplateItem");
    expect(accountPage).toContain("loadout-template-badge");
    expect(accountPage).toContain("loadout-highlight");
    expect(accountPage).toContain("highlightedTemplate");
  });

  it("shows how many current character items match the active local loadout", () => {
    const accountPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"),
      "utf8"
    );

    expect(accountPage).toContain("selectedCharacterLoadoutMatchCount");
    expect(accountPage).toContain("方案命中");
  });

  it("auto-loads account data when startup says login is ready", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    const accountHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "useAccountWorkspace.ts"),
      "utf8"
    );

    expect(homePage).toContain("hasAutoLoadedAccount");
    expect(homePage).toContain('props.state.nextStep !== "home"');
    expect(homePage).toContain("void loadAccountSummary()");
    expect(accountHook).toContain("登录可能已失效，请重新登录 Bungie");
  });

  it("loads account workspace through the shared app and services layers", () => {
    const accountHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "useAccountWorkspace.ts"),
      "utf8"
    );

    expect(accountHook).toContain('import { loadAccountWorkspace, loadAccountDerivedWorkspace } from "@d2-tools/app"');
    expect(accountHook).toContain('import { services } from "../../api/services"');
    expect(accountHook).toContain("loadAccountWorkspace(services)");
    expect(accountHook).toContain("loadAccountDerivedWorkspace(services, summary)");
    expect(accountHook).not.toContain("api.getAccountSummary(), api.getVaultTags()");
    expect(accountHook).not.toContain("api.getActivitySummary({");
    expect(accountHook).not.toContain("api.matchCommunityVaultItems(");
  });

  it("shows profile materials instead of a misleading vault preview", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );
    const accountPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"),
      "utf8"
    );

    expect(accountPage).toContain("材料与消耗品");
    expect(accountPage).toContain("accountSummary.materials.items");
    expect(accountPage).toContain("material.quantity");
    expect(homePage).not.toContain("materials.items.slice(0, 40)");
    expect(homePage).not.toContain("仓库预览");
  });
});
