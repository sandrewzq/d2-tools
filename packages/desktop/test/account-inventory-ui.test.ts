import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));
const uiRoot = fileURLToPath(new URL("../../ui", import.meta.url));

function readAccountPage(): string {
  return [
    readFileSync(join(uiRoot, "src", "account", "AccountPageContentView.tsx"), "utf8"),
    readFileSync(join(uiRoot, "src", "i18n", "copy.ts"), "utf8"),
    readFileSync(join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"), "utf8")
  ].join("\n");
}

function readAccountContentView(): string {
  return readFileSync(join(uiRoot, "src", "account", "AccountPageContentView.tsx"), "utf8");
}

function readCssRule(styles: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escapedSelector}\\s*\\{(?<body>[\\s\\S]*?)\\}`).exec(styles);
  return match?.groups?.body ?? "";
}

describe("account inventory UI", () => {
  it("routes the account page through the menu provider and preserves account item actions", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const homeRoutes = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePageRoutes.tsx"), "utf8");
    const accountMenuProvider = readFileSync(join(desktopRoot, "src", "renderer", "pages", "providers", "AccountMenuProvider.tsx"), "utf8");
    const accountPage = readAccountPage();
    const loadoutWriteHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "loadouts", "useLoadoutWriteActions.ts"),
      "utf8"
    );

    expect(homePage).toContain("<HomePageRoutes");
    expect(homePage).not.toContain("<AccountPage");
    expect(homeRoutes).toContain("<AccountMenuProvider");
    expect(accountMenuProvider).toContain("<AccountPage");
    expect(homePage).not.toContain("function renderAccountPanel");
    expect(accountPage).toContain("export function AccountPage");
    expect(accountPage).toContain("selectedCharacterId");
    expect(accountPage).not.toContain("accountWorkspace.equippedSlotCategories");
    expect(accountPage).not.toContain("accountWorkspace.inventorySlotCategories");
    expect(accountPage).toContain("openPayload");
    expect(accountPage).toContain("source_kind");
    expect(accountPage).not.toContain("account-slot-source-cluster");
    expect(accountPage).not.toContain('renderAccountSlotSourceCluster("已装备"');
    expect(accountPage).not.toContain('renderAccountSlotSourceCluster("背包"');
    expect(accountPage).toContain('source === "equipped" ? "equipped" : "inventory"');
    expect(accountPage).toContain("装备最高光等");
    expect(loadoutWriteHook).toContain("createHighestPowerEquipPlan");
    expect(accountPage).toContain("source_character_id: payload.source_character_id");
  });

  it("auto-loads account data only when Bungie config and account login are ready", () => {
    const productShell = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "useDesktopProductShell.tsx"),
      "utf8"
    );

    const accountHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "useAccountWorkspace.ts"),
      "utf8"
    );

    expect(productShell).toContain("hasAutoLoadedAccount");
    expect(productShell).toContain("canRefreshAccount");
    expect(productShell).toContain('props.state.cards.bungieConfig.status === "ready"');
    expect(productShell).toContain('props.state.cards.account.status === "ready"');
    expect(productShell).toContain("void loadAccountSummary()");
    expect(accountHook).toContain("登录可能已失效，请重新登录 Bungie");
  });

  it("wires disconnected account setup actions through the desktop shell", () => {
    const productShell = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "useDesktopProductShell.tsx"),
      "utf8"
    );
    const accountHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "useAccountWorkspace.ts"),
      "utf8"
    );

    expect(productShell).toContain("onConfigureBungie: props.onConfigure");
    expect(productShell).toContain("onLoginBungie: () => void loginBungie()");
    expect(accountHook).toContain("请先在设置里填写 Bungie API Key、Client ID 和 Client Secret");
  });

  it("keeps account slot comparison columns inside visible panels", () => {
    const styles = readFileSync(join(uiRoot, "src", "styles.css"), "utf8");
    const slotColumn = readCssRule(styles, ".account-slot-comparison-column");
    const backpackPreview = readCssRule(styles, ".account-slot-backpack-preview");

    expect(slotColumn).toContain("padding: 10px;");
    expect(slotColumn).toContain("border: 1px solid var(--border-subtle);");
    expect(slotColumn).toContain("border-radius: var(--radius-control);");
    expect(slotColumn).toContain("background: var(--surface-panel);");
    expect(backpackPreview).toContain("border-color: var(--state-selected-border);");
    expect(backpackPreview).toContain("background: var(--state-selected-bg);");
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

  it("keeps account materials out of the legacy HomePage vault preview path", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    expect(homePage).not.toContain("materials.items.slice(0, 40)");
    expect(homePage).not.toContain("仓库预览");
  });

  it("adds an account page directory for long account workbench sections", () => {
    const accountPage = readAccountPage();
    const styles = readFileSync(join(desktopRoot, "..", "ui", "src", "styles.css"), "utf8");

    expect(accountPage).toContain('className="account-page-shell"');
    expect(accountPage).toContain('className="account-page-nav"');
    expect(accountPage).toContain('ariaLabel={accountText(copy, "账号目录")}');
    expect(accountPage).toContain("href={item.href}");
    expect(accountPage).toContain("key={item.key}");
    expect(accountPage).toContain("copy.nav[item.labelKey]");
    expect(accountPage).toContain('id="account-profile"');
    expect(accountPage).toContain('id="account-loadout"');
    expect(accountPage).toContain('id="account-activity"');
    expect(accountPage).toContain('id="account-materials"');
    expect(accountPage).toContain('id="account-postmaster"');
    expect(styles).toContain(".account-page-nav");
    expect(styles).toContain(".account-page-main");
    expect(styles).toMatch(/\.account-secondary-workbench\s*{[\s\S]*?grid-template-columns:\s*1fr;/);
    expect(styles).toMatch(/\.activity-review-list\s*{[\s\S]*?min-width:\s*0;/);
    expect(styles).toMatch(/\.material-grid\s*{[\s\S]*?minmax\(180px,\s*1fr\)/);
  });

  it("keeps recent account activities wide instead of squeezing them into a side rail", () => {
    const accountPage = readAccountContentView();
    const styles = readFileSync(join(uiRoot, "src", "styles.css"), "utf8");

    expect(accountPage).toContain('className="activity-review-list activity-review-list-wide"');
    expect(styles).toMatch(/\.activity-review-grid\s*{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
    expect(styles).toMatch(/\.activity-review-list-wide\s*{[\s\S]*?grid-column:\s*1 \/ -1;/);
    expect(styles).toMatch(/\.activity-review-list-wide ul\s*{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
  });

  it("keeps the activity summary card readable instead of inheriting cramped status-card flow", () => {
    const accountPage = readAccountContentView();
    const styles = readFileSync(join(uiRoot, "src", "styles.css"), "utf8");

    expect(accountPage).toContain("activity-review-summary-card");
    expect(styles).toMatch(/\.activity-review-summary-card\s*{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*6px;/);
    expect(styles).toMatch(/\.activity-review-summary-card \.activity-review-stat-line\s*{[\s\S]*?display:\s*flex;[\s\S]*?flex-wrap:\s*wrap;/);
    expect(styles).toMatch(/\.activity-review-summary-card strong\s*{[\s\S]*?font-size:\s*20px;/);
  });

  it("routes the account page through a stable view model instead of wide UI props", () => {
    const accountContentView = readAccountContentView();
    const desktopAccountPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"),
      "utf8"
    );
    const prototypeMain = readFileSync(join(desktopRoot, "..", "prototype", "src", "main.tsx"), "utf8");
    const prototypeFixture = readFileSync(
      join(desktopRoot, "..", "prototype", "src", "fixtures", "usePrototypeFixtureRuntime.ts"),
      "utf8"
    );
    const webMain = readFileSync(join(desktopRoot, "..", "web", "src", "main.tsx"), "utf8");
    const webFixture = readFileSync(
      join(desktopRoot, "..", "web", "src", "fixtures", "useWebFixtureRuntime.ts"),
      "utf8"
    );

    expect(accountContentView).toContain("viewModel: AccountPageViewModel");
    expect(accountContentView).toContain("actions: AccountPageActions");
    expect(accountContentView).not.toContain("type AnyAccount");
    expect(accountContentView).not.toContain("startupState:");
    expect(accountContentView).not.toContain("accountWorkspace:");
    expect(accountContentView).not.toContain("selectedCharacter:");
    expect(desktopAccountPage).toContain("selectAccountPageModel");
    expect(prototypeMain).toContain("fixture.createAccountPageModel");
    expect(prototypeMain).not.toContain("selectAccountPageModel");
    expect(prototypeFixture).toContain("selectAccountPageModel");
    expect(webMain).toContain("fixture.createAccountPageModel");
    expect(webMain).not.toContain("selectAccountPageModel");
    expect(webFixture).toContain("selectAccountPageModel");
  });

  it("collapses account workbench columns when the AI drawer is open", () => {
    const styles = readFileSync(join(desktopRoot, "..", "ui", "src", "styles.css"), "utf8");

    expect(styles).toMatch(/\.assistant-open \.account-page-shell\s*{[\s\S]*?grid-template-columns:\s*1fr;/);
    expect(styles).toMatch(/\.assistant-open \.account-page-nav\s*{[\s\S]*?position:\s*static;[\s\S]*?display:\s*flex;[\s\S]*?flex-wrap:\s*wrap;/);
    expect(styles).toMatch(/\.assistant-open \.account-profile-strip,[\s\S]*?\.assistant-open \.account-primary-workbench,[\s\S]*?\.assistant-open \.account-slot-comparison-columns,[\s\S]*?\.assistant-open \.account-secondary-workbench,[\s\S]*?\{[\s\S]*?grid-template-columns:\s*1fr;/);
    expect(styles).toMatch(/\.assistant-open \.character-title\s*{[\s\S]*?grid-template-columns:\s*48px minmax\(0,\s*1fr\);/);
    expect(styles).toMatch(/\.assistant-open \.character-actions\s*{[\s\S]*?grid-column:\s*1 \/ -1;[\s\S]*?justify-content:\s*flex-start;/);
  });

});
