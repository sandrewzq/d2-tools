import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("account inventory UI", () => {
  it("uses DIM-style character tabs and splits equipped items from carried inventory in the main workbench", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const homeRoutes = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePageRoutes.tsx"), "utf8");
    const accountPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"),
      "utf8"
    );
    const loadoutWriteHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "loadouts", "useLoadoutWriteActions.ts"),
      "utf8"
    );

    expect(homePage).toContain("<HomePageRoutes");
    expect(homePage).not.toContain("<AccountPage");
    expect(homeRoutes).toContain("<AccountPage");
    expect(homePage).not.toContain("function renderAccountPanel");
    expect(accountPage).toContain("export function AccountPage");
    expect(accountPage).toContain("selectedCharacterId");
    expect(accountPage).toContain("character-tabs");
    expect(accountPage).toContain("character-tab");
    expect(accountPage).toContain("当前角色装备");
    expect(accountPage).toContain("当前角色背包");
    expect(accountPage).toContain("account-primary-workbench");
    expect(accountPage).toContain("account-slot-comparison");
    expect(accountPage).toContain("account-slot-comparison-row");
    expect(accountPage).toContain("accountWorkspace.slotComparisonRows");
    expect(accountPage).toContain("account-secondary-workbench");
    expect(accountPage).toContain("account-character-summary");
    expect(accountPage).toContain("account-equipped-panel");
    expect(accountPage).toContain("account-inventory-panel");
    expect(accountPage).not.toContain("accountWorkspace.equippedSlotCategories");
    expect(accountPage).not.toContain("accountWorkspace.inventorySlotCategories");
    expect(accountPage).toContain("account-slot-comparison-column");
    expect(accountPage).toContain("onOpenEquippedItem");
    expect(accountPage).toContain("onOpenInventoryItem");
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
    const homeDerivedHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "home", "useHomePageDerivedState.ts"),
      "utf8"
    );
    const accountPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"),
      "utf8"
    );

    expect(homeDerivedHook).toContain("buildLoadoutTemplateLookup");
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

  it("auto-loads account data only when Bungie config and account login are ready", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    const accountHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "useAccountWorkspace.ts"),
      "utf8"
    );

    expect(homePage).toContain("hasAutoLoadedAccount");
    expect(homePage).toContain("canRefreshAccount");
    expect(homePage).toContain('props.state.cards.bungieConfig.status === "ready"');
    expect(homePage).toContain('props.state.cards.account.status === "ready"');
    expect(homePage).toContain("void loadAccountSummary()");
    expect(accountHook).toContain("登录可能已失效，请重新登录 Bungie");
  });

  it("shows a clear disconnected account state before Bungie is configured", () => {
    const accountPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"),
      "utf8"
    );
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );
    const accountHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "useAccountWorkspace.ts"),
      "utf8"
    );

    expect(accountPage).toContain("未连接 Bungie");
    expect(accountPage).toContain("onConfigureBungie");
    expect(accountPage).toContain("去设置 Bungie");
    expect(accountPage).toContain("onLoginBungie");
    expect(accountPage).toContain("登录 Bungie");
    expect(homePage).toContain("onConfigureBungie: props.onConfigure");
    expect(homePage).toContain("onLoginBungie: () => void loginBungie()");
    expect(accountHook).toContain("请先在设置里填写 Bungie API Key、Client ID 和 Client Secret");
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
    expect(accountHook).not.toContain("loadFullAccountWorkspace");
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
    expect(accountPage).toContain("accountWorkspace.materialRows");
    expect(accountPage).toContain("row.material.quantity");
    expect(homePage).not.toContain("materials.items.slice(0, 40)");
    expect(homePage).not.toContain("仓库预览");
  });

  it("adds an account page directory for long account workbench sections", () => {
    const accountPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"),
      "utf8"
    );
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");

    expect(accountPage).toContain('className="account-page-shell"');
    expect(accountPage).toContain('className="account-page-nav"');
    expect(accountPage).toContain('aria-label="账号目录"');
    expect(accountPage).toContain('href="#account-profile"');
    expect(accountPage).toContain('href="#account-loadout"');
    expect(accountPage).toContain('href="#account-activity"');
    expect(accountPage).toContain('href="#account-materials"');
    expect(accountPage).toContain('href="#account-postmaster"');
    expect(accountPage).toContain('id="account-profile"');
    expect(accountPage).toContain('id="account-loadout"');
    expect(accountPage).toContain('id="account-activity"');
    expect(accountPage).toContain('id="account-materials"');
    expect(accountPage).toContain('id="account-postmaster"');
    expect(accountPage).toContain("账号概览");
    expect(styles).toContain(".account-page-nav");
    expect(styles).toContain(".account-page-main");
    expect(styles).toMatch(/\.account-secondary-workbench\s*{[\s\S]*?grid-template-columns:\s*1fr;/);
    expect(styles).toMatch(/\.activity-review-grid\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*0\.8fr\)\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
    expect(styles).toMatch(/\.activity-review-list\s*{[\s\S]*?min-width:\s*0;/);
    expect(styles).toMatch(/\.material-grid\s*{[\s\S]*?minmax\(180px,\s*1fr\)/);
  });

  it("keeps account item rendering bounded and lazy-loads item icons", () => {
    const accountPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"),
      "utf8"
    );

    expect(accountPage).toContain("ACCOUNT_SLOT_PREVIEW_LIMIT");
    expect(accountPage).toContain("items.slice(0, ACCOUNT_SLOT_PREVIEW_LIMIT)");
    expect(accountPage).toContain("hiddenItemCount");
    expect(accountPage).toContain("显示全部");
    expect(accountPage).toContain('loading="lazy"');
  });
});
