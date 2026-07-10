import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readItemDetailSources } from "./source-readers";

const desktopRoot = join(process.cwd(), "packages", "desktop");
const uiRoot = join(process.cwd(), "packages", "ui");
const referenceRoot = join(process.cwd(), "docs", "work", "references");

function readUiStyles(): string {
  return readFileSync(join(uiRoot, "src", "styles.css"), "utf8");
}

function readCssRule(styles: string, selector: string): string {
  const start = styles.indexOf(`\n${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = styles.indexOf("}", start);
  expect(end).toBeGreaterThan(start);
  return styles.slice(start, end + 1);
}

function readUiSource(relativePath: string): string {
  return readFileSync(join(uiRoot, "src", ...relativePath.split("/")), "utf8");
}

function readDesktopRendererSource(relativePath: string): string {
  return readFileSync(join(desktopRoot, "src", "renderer", ...relativePath.split("/")), "utf8");
}

function readPlatformSource(root: string, relativePath: string): string {
  return readFileSync(join(root, ...relativePath.split("/")), "utf8");
}

function readFilesRecursive(root: string, predicate: (path: string) => boolean): Array<{ path: string; content: string }> {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) return readFilesRecursive(fullPath, predicate);
    if (!entry.isFile() || !predicate(fullPath)) return [];
    return [{ path: fullPath, content: readFileSync(fullPath, "utf8") }];
  });
}

function getReferenceOnlyTexts(): string[] {
  const html = readFileSync(join(referenceRoot, "d2-unified-workspace-layout-v0.html"), "utf8");
  const markedBlocks = [...html.matchAll(/<!--\s*d2-reference-only:start\b[^>]*-->([\s\S]*?)<!--\s*d2-reference-only:end\s*-->/gi)].map(
    (match) => match[1]
  );

  expect(markedBlocks.length).toBeGreaterThan(0);
  for (const block of markedBlocks) {
    expect(block).toContain('data-reference-only="true"');
  }

  return markedBlocks
    .flatMap((block) => [...block.matchAll(/<(?:strong|span|p|h[1-6])\b[^>]*>([\s\S]*?)<\/(?:strong|span|p|h[1-6])>/gi)])
    .map((match) => match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter((text) => text.length > 0);
}

describe("desktop workspace layout", () => {
  it("uses a wide shell content area for desktop workspaces", () => {
    const styles = readFileSync(join(desktopRoot, "..", "ui", "src", "styles.css"), "utf8");

    expect(styles).toMatch(/\.shell-content\s*{[\s\S]*?width:\s*100%;/);
    expect(styles).toMatch(/\.shell-content\s*{[\s\S]*?max-width:\s*none;/);
  });

  it("uses one compact product workspace frame across all primary menus", () => {
    const styles = readFileSync(join(uiRoot, "src", "styles.css"), "utf8");
    const productHost = readUiSource("product/ProductShellHost.tsx");
    const contentSources = [
      readUiSource("home/HomePageContentView.tsx"),
      readUiSource("account/AccountPageContentView.tsx"),
      readUiSource("vault/VaultPageContentView.tsx"),
      readUiSource("loadouts/LoadoutsPageContentView.tsx"),
      readUiSource("library/LibraryPageContentView.tsx"),
      readUiSource("vendors/VendorsPageContentView.tsx"),
      readUiSource("settings/SettingsPageContentView.tsx")
    ].join("\n");

    for (const selector of [
      ".product-workspace-page",
      ".product-workspace-header",
      ".product-workspace-panel",
      ".product-command-bar",
      ".product-split-workspace",
      ".product-side-rail",
      ".product-content-stack"
    ]) {
      expect(styles).toContain(selector);
    }

    expect(productHost).toContain("ProductWorkspacePage");
    expect(productHost).toContain("ProductWorkspaceHeader");
    expect(productHost).not.toContain("page-header product-page-header product-workspace-header");
    expect(styles).toMatch(/\.product-workspace-header\s*{[\s\S]*?min-height:\s*42px;/);
    expect(styles).toMatch(/\.product-workspace-page\s*{[\s\S]*?gap:\s*10px;/);
    expect(styles).toMatch(/\.product-workspace-panel\s*{[\s\S]*?border-radius:\s*var\(--radius-panel\);/);
    expect(styles).toMatch(/\.product-workspace-panel\s*{[\s\S]*?padding:\s*var\(--space-16\);/);
    expect(styles).toMatch(/\.product-side-rail\s*{[\s\S]*?padding:\s*var\(--space-16\);/);
    expect(styles).toMatch(/\.product-side-rail\s*{[\s\S]*?background:\s*var\(--surface-panel\);/);
    expect(styles).toMatch(/\.product-side-rail\s*{[\s\S]*?box-shadow:\s*var\(--shadow-panel\);/);
    expect(styles).toMatch(/\.product-split-workspace\s*{[\s\S]*?grid-template-columns:\s*var\(--workspace-side-width,\s*240px\)\s*minmax\(0,\s*1fr\);/);

    expect(contentSources).not.toContain("ProductWorkspacePage");
    expect(contentSources).not.toMatch(/from\s+["']\.\/[A-Za-z]+PageView\.js["']/);
    expect(contentSources).not.toContain("showInternalHeading");
    expect(contentSources).toMatch(/ProductWorkspaceCommandBar|product-command-bar/);
    expect(contentSources).toMatch(/ProductWorkspaceSplit|product-split-workspace/);
    expect(contentSources).toMatch(/ProductWorkspaceSideRail|product-side-rail/);
    expect(contentSources).toMatch(/ProductWorkspaceContentStack|product-content-stack/);
  });

  it("keeps page header actions aligned to the right of the title on desktop", () => {
    const styles = readUiStyles();
    const workspaceComponents = readUiSource("workspace/ProductWorkspace.tsx");
    const headerRule = readCssRule(styles, ".product-workspace-header");
    const actionsRule = readCssRule(styles, ".product-page-header-actions");

    expect(workspaceComponents).toContain('classNames("product-workspace-header"');
    expect(workspaceComponents).toContain('className="button-row product-page-header-actions"');
    expect(headerRule).toContain("display: grid");
    expect(headerRule).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(headerRule).toContain("gap: var(--space-16)");
    expect(actionsRule).toContain("justify-content: flex-end");
    expect(actionsRule).toContain("flex-wrap: nowrap");
  });

  it("moves workspace layout ownership into shared ProductWorkspace components", () => {
    const uiIndex = readUiSource("index.ts");
    const workspaceComponents = readUiSource("workspace/ProductWorkspace.tsx");
    const libraryContent = readUiSource("library/LibraryPageContentView.tsx");
    const accountContent = readUiSource("account/AccountPageContentView.tsx");
    const settingsContent = readUiSource("settings/SettingsPageContentView.tsx");
    const vaultContent = readUiSource("vault/VaultPageContentView.tsx");
    const loadoutsContent = readUiSource("loadouts/LoadoutsPageContentView.tsx");
    const vendorsContent = readUiSource("vendors/VendorsPageContentView.tsx");
    const styles = readFileSync(join(uiRoot, "src", "styles.css"), "utf8");

    for (const exportName of [
      "ProductWorkspacePage",
      "ProductWorkspaceHeader",
      "ProductWorkspacePanel",
      "ProductWorkspaceCommandBar",
      "ProductWorkspaceSplit",
      "ProductWorkspaceSideRail",
      "ProductWorkspaceContentStack",
      "ProductWorkspaceEmptyState"
    ]) {
      expect(workspaceComponents).toContain(`export function ${exportName}`);
      expect(uiIndex).toContain(exportName);
    }

    expect(libraryContent).not.toContain("LibraryPageView");
    expect(libraryContent).toContain("ProductWorkspaceSplit");
    expect(libraryContent).toContain("ProductWorkspaceSideRail");
    expect(libraryContent).toContain("ProductWorkspaceContentStack");
    expect(libraryContent).toContain("ProductWorkspaceEmptyState");
    expect(accountContent).toContain("ProductWorkspaceSplit");
    expect(settingsContent).toContain("ProductWorkspaceSplit");
    expect(vaultContent).not.toContain("ProductWorkspacePage");
    expect(vaultContent).toContain("ProductWorkspaceCommandBar");
    expect(vaultContent).toContain("ProductWorkspaceSideRail");
    expect(loadoutsContent).not.toContain("LoadoutsPageView");
    expect(loadoutsContent).toContain("ProductWorkspaceSplit");
    expect(loadoutsContent).toContain("ProductWorkspaceSideRail");
    expect(loadoutsContent).toContain('<ProductWorkspacePanel element="section" className="loadout-template-detail">');
    expect(loadoutsContent).toContain("ProductWorkspaceEmptyState");
    expect(vendorsContent).not.toContain("VendorsPageView");
    expect(vendorsContent).toContain("ProductWorkspaceSplit");
    expect(vendorsContent).toContain("ProductWorkspaceContentStack");

    expect(styles).toMatch(/\.product-workspace-empty\s*{[\s\S]*?min-height:\s*220px;/);
    expect(styles).toMatch(/\.product-workspace-page\s*{[\s\S]*?gap:\s*10px;/);
  });

  it("keeps real Prototype, Web and Desktop page mounts on content views", () => {
    const platformEntries = [
      readPlatformSource(join(process.cwd(), "packages", "prototype", "src"), "main.tsx"),
      readPlatformSource(join(process.cwd(), "packages", "web", "src"), "main.tsx"),
      readDesktopRendererSource("pages/HomePageRoutes.tsx"),
      readDesktopRendererSource("features/home/HomeDashboard.tsx"),
      readDesktopRendererSource("features/account/AccountPage.tsx"),
      readDesktopRendererSource("features/vault/VaultPage.tsx"),
      readDesktopRendererSource("features/loadouts/LoadoutsPage.tsx"),
      readDesktopRendererSource("features/library/LibraryPage.tsx"),
      readDesktopRendererSource("features/vendors/VendorsPage.tsx"),
      readDesktopRendererSource("features/settings/SettingsPage.tsx")
    ].join("\n");

    expect(platformEntries).toContain("HomePageContentView");
    expect(platformEntries).toContain("AccountPageContentView");
    expect(platformEntries).toContain("VaultPageContentView");
    expect(platformEntries).toContain("LoadoutsPageContentView");
    expect(platformEntries).toContain("LibraryPageContentView");
    expect(platformEntries).toContain("VendorsPageContentView");
    expect(platformEntries).toContain("SettingsPageContentView");
    expect(platformEntries).not.toContain("showInternalHeading={false}");
    expect(platformEntries).not.toMatch(/<VaultPageView[\s>]/);
    expect(platformEntries).not.toMatch(/<LoadoutsPageView[\s>]/);
    expect(platformEntries).not.toMatch(/<LibraryPageView[\s>]/);
    expect(platformEntries).not.toMatch(/<VendorsPageView[\s>]/);
  });

  it("keeps workspace chrome classes owned by ProductWorkspace components", () => {
    const uiFiles = readFilesRecursive(join(uiRoot, "src"), (path) => /\.(tsx|ts)$/.test(path));
    const workspaceComponentNames = [
      "ProductWorkspacePanel",
      "ProductWorkspaceContentStack",
      "ProductWorkspaceSideRail",
      "ProductWorkspaceEmptyState",
      "ProductWorkspaceSplit"
    ];
    const forbiddenClassFragments = [
      "product-workspace-panel",
      "product-side-rail",
      "product-content-stack",
      "app-panel",
      "product-card",
      "tool-panel"
    ];
    const offenders = uiFiles.flatMap((file) => {
      const matches: string[] = [];
      for (const componentName of workspaceComponentNames) {
        const pattern = new RegExp("<" + componentName + "[^>]*className=(?:\"([^\"]*)\"|\\{`([^`]*)`\\})", "g");
        for (const match of file.content.matchAll(pattern)) {
          const className = match[1] ?? match[2] ?? "";
          if (forbiddenClassFragments.some((fragment) => className.includes(fragment))) {
            matches.push(`${file.path}: ${componentName} className="${className}"`);
          }
        }
      }
      return matches;
    });

    expect(offenders).toEqual([]);
  });

  it("keeps menu-specific classes from overriding shared workspace chrome", () => {
    const styles = readUiStyles();
    const protectedWorkspaceRules = [
      ".vault-workbench-header",
      ".library-search-command",
      ".vendor-summary-strip",
      ".vendor-evidence-panel"
    ];

    for (const selector of protectedWorkspaceRules) {
      const rule = readCssRule(styles, selector);
      expect(rule).not.toMatch(/\n\s*padding\s*:/);
      expect(rule).not.toMatch(/\n\s*border\s*:/);
      expect(rule).not.toMatch(/\n\s*border-radius\s*:/);
      expect(rule).not.toMatch(/\n\s*background\s*:/);
      expect(rule).not.toMatch(/\n\s*box-shadow\s*:/);
    }

    expect(readCssRule(styles, ".product-command-bar")).toMatch(/padding:\s*var\(--space-12\);/);
    expect(readCssRule(styles, ".product-command-bar")).toMatch(/background:\s*var\(--surface-toolbar\);/);
  });

  it("keeps vault item card headers resilient when cards are narrow", () => {
    const styles = readUiStyles();
    const vaultListItem = readUiSource("vault/VaultListItem.tsx");
    const titleRowRule = readCssRule(styles, ".vault-title-row");
    const decisionBadgeRule = readCssRule(styles, ".vault-card-body .decision-badge");
    const actionsRule = readCssRule(styles, ".vault-card-actions");

    expect(vaultListItem).toContain('className="vault-title-row"');
    expect(titleRowRule).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(titleRowRule).toContain("align-items: start");
    expect(decisionBadgeRule).toContain("justify-self: start");
    expect(decisionBadgeRule).toContain("max-width: 100%");
    expect(actionsRule).toContain("grid-template-columns: minmax(0, 1fr)");
  });

  it("keeps reference-only guidance out of shared product UI", () => {
    const referenceOnlyTexts = getReferenceOnlyTexts();
    const uiSources = [
      readFileSync(join(uiRoot, "src", "home", "HomePageContentView.tsx"), "utf8"),
      readFileSync(join(uiRoot, "src", "i18n", "copy.ts"), "utf8"),
      readFileSync(join(uiRoot, "src", "styles.css"), "utf8")
    ].join("\n");

    expect(referenceOnlyTexts).toEqual(
      expect.arrayContaining(["骨架层统一", "内容层私有", "禁止覆盖 chrome"])
    );

    for (const text of referenceOnlyTexts) {
      expect(uiSources).not.toContain(text);
    }

    expect(uiSources).not.toContain("home-standard-bar");
  });

  it("renders the home page as a workbench instead of a single long stream", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const homeRoutes = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePageRoutes.tsx"), "utf8");
    const homeDashboard = readFileSync(join(uiRoot, "src", "home", "HomePageContentView.tsx"), "utf8");
    const homeCopy = readFileSync(join(uiRoot, "src", "i18n", "copy.ts"), "utf8");
    const styles = readFileSync(join(desktopRoot, "..", "ui", "src", "styles.css"), "utf8");
    const dailyPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "daily", "DailyPage.tsx"), "utf8");

    expect(homePage).toContain("<HomePageRoutes");
    expect(homePage).not.toContain("<HomeDashboard");
    expect(homeRoutes).toContain("<HomeMenuProvider");
    expect(homePage).not.toContain('className="home-workbench"');
    expect(homeDashboard).toContain("ProductWorkspacePanel");
    expect(homeDashboard).not.toContain("ProductWorkspacePage");
    expect(homeDashboard).not.toContain('className="app-page home-app-page');
    expect(homeDashboard).not.toContain('className="home-data-strip"');
    expect(homeDashboard).toContain('className="home-briefing-grid"');
    expect(homeDashboard).toContain('className="home-daily-panel"');
    expect(homeDashboard).toContain('className="home-weekly-panel"');
    expect(homeDashboard).toContain('className="home-weekly-dashboard"');
    expect(homeDashboard).not.toContain('className="home-main-grid"');
    expect(homeDashboard).not.toContain('className="home-secondary-grid"');
    expect(homeDashboard).toContain('homeText(copy, "本日更新")');
    expect(homeDashboard).toContain('homeText(copy, "本周更新")');
    expect(homeDashboard).not.toContain("copy.sections.vendors.title");
    expect(homeCopy).toContain("本周奖励与轮换");
    expect(homeDashboard).not.toContain("<DailySummaryPanel");
    expect(homeDashboard).not.toContain("../daily/DailyPage");
    expect(homePage).not.toContain("function renderDailyPanel");
    expect(dailyPage).toContain("export function DailyPage");
    expect(styles).toMatch(/\.home-briefing-grid\s*{[\s\S]*?grid-template-columns:\s*minmax\(360px,\s*0\.95fr\) minmax\(0,\s*1\.25fr\);/);
    expect(styles).toMatch(/\.home-weekly-dashboard\s*{[\s\S]*?grid-template-columns:\s*1fr;/);
    expect(styles).toMatch(/\.home-weekly-support\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.32fr\) minmax\(240px,\s*0\.68fr\);/);
    expect(styles).toMatch(/@media \(max-width:\s*1180px\)\s*{[\s\S]*?\.home-weekly-dashboard,[\s\S]*?\.home-main-grid,[\s\S]*?\.home-secondary-grid,[\s\S]*?\.app-settings-grid\s*{[\s\S]*?grid-template-columns:\s*1fr;/);
  });

  it("keeps AI in the global assistant sidebar instead of a main page", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const productShell = readFileSync(join(desktopRoot, "src", "renderer", "pages", "useDesktopProductShell.tsx"), "utf8");
    const aiPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "ai", "AiPage.tsx"), "utf8");
    const assistantSidebar = readFileSync(join(desktopRoot, "src", "renderer", "components", "GlobalAssistantSidebar.tsx"), "utf8");

    expect(productShell).toContain("<GlobalAssistantSidebar");
    expect(homePage).not.toContain("<AiPage");
    expect(homePage).not.toContain("去设置配置 AI");
    expect(assistantSidebar).toContain("<AiPage");
    expect(assistantSidebar).toContain("任务助手");
    expect(assistantSidebar).toContain("任务 / 攻略上下文");
    expect(aiPage).toContain("export function AiPage");
    expect(aiPage).toContain("AiAnalysisPanel");
    expect(aiPage).toContain("onConfigureAi");
  });

  it("collapses the home briefing when the AI assistant narrows the workspace", () => {
    const styles = readFileSync(join(desktopRoot, "..", "ui", "src", "styles.css"), "utf8");

    expect(styles).toMatch(/\.assistant-open \.home-briefing-grid\s*{[\s\S]*?grid-template-columns:\s*1fr;/);
    expect(styles).toMatch(/\.assistant-open \.home-weekly-dashboard\s*{[\s\S]*?grid-template-columns:\s*1fr;/);
    expect(styles).toMatch(/\.assistant-open \.home-reward-heading\s*{[\s\S]*?align-items:\s*flex-start;/);
    expect(styles).toMatch(/\.assistant-open \.home-weekly-panel \.home-reward-list\s*{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(180px,\s*1fr\)\);/);
  });

  it("keeps the vault menu in an isolated feature entry", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const homeRoutes = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePageRoutes.tsx"), "utf8");
    const vaultPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultPage.tsx"), "utf8");
    const vaultPanel = readFileSync(join(desktopRoot, "src", "renderer", "components", "VaultPanel.tsx"), "utf8");
    const vaultView = readFileSync(join(uiRoot, "src", "vault", "VaultPageView.tsx"), "utf8");
    const uiCopy = readFileSync(join(uiRoot, "src", "i18n", "copy.ts"), "utf8");

    expect(homePage).toContain("<HomePageRoutes");
    expect(homePage).not.toContain("<VaultPage");
    expect(homeRoutes).toContain("<VaultMenuProvider");
    expect(homePage).not.toContain("function renderVaultPanel");
    expect(vaultPage).toContain("export function VaultPage");
    expect(vaultPage).toContain("<VaultPageContentView");
    expect(vaultPanel).toContain("VaultPageContentView as VaultPanel");
    expect(vaultPage).not.toContain("<VaultPageView");
    expect(vaultView).toContain("copy.emptySubtitle");
    expect(uiCopy).toContain("先读取账号数据，然后查看完整仓库列表。");
  });

  it("keeps page data orchestration in feature hooks instead of growing HomePage", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const productShell = readFileSync(join(desktopRoot, "src", "renderer", "pages", "useDesktopProductShell.tsx"), "utf8");
    const dailyHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "daily", "useDailySummary.ts"), "utf8");
    const libraryHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "library", "useLibraryWorkspace.ts"), "utf8");
    const settingsHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "useDiagnosticsSettings.ts"), "utf8");
    const accountHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "account", "useAccountWorkspace.ts"), "utf8");
    const loadoutWriteHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "useLoadoutWriteActions.ts"), "utf8");
    const productWriteHook = readFileSync(join(desktopRoot, "src", "renderer", "pages", "useDesktopProductWriteActions.ts"), "utf8");
    const itemDetailHook = readFileSync(join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetailWorkspace.ts"), "utf8");
    const vaultWriteHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "useVaultWriteActions.ts"), "utf8");

    expect(homePage).toContain("useDesktopProductShell");
    expect(homePage).not.toContain("useDailySummary");
    expect(homePage).not.toContain("useLibraryWorkspace");
    expect(homePage).not.toContain("useDiagnosticsSettings");
    expect(homePage).not.toContain("useAccountWorkspace");
    expect(homePage).not.toContain("useHomePageWriteActions");
    expect(productShell).toContain("useDailySummary");
    expect(productShell).toContain("useLibraryWorkspace");
    expect(productShell).toContain("useDiagnosticsSettings");
    expect(productShell).toContain("useAccountWorkspace");
    expect(productShell).toContain("useDesktopProductWriteActions");
    expect(homePage).not.toContain("useLoadoutWriteActions");
    expect(homePage).not.toContain("useLoadoutTemplateActions");
    expect(homePage).not.toContain("useItemDetailWorkspace");
    expect(homePage).not.toContain("useVaultWriteActions");
    expect(dailyHook).toContain("export function useDailySummary");
    expect(libraryHook).toContain("export function useLibraryWorkspace");
    expect(settingsHook).toContain("export function useDiagnosticsSettings");
    expect(accountHook).toContain("export function useAccountWorkspace");
    expect(loadoutWriteHook).toContain("export function useLoadoutWriteActions");
    expect(productWriteHook).toContain("export function useDesktopProductWriteActions");
    expect(productWriteHook).toContain("useLoadoutWriteActions");
    expect(productWriteHook).toContain("useLoadoutTemplateActions");
    expect(productWriteHook).toContain("useItemDetailWorkspace");
    expect(productWriteHook).toContain("useVaultWriteActions");
    expect(itemDetailHook).toContain("export function useItemDetailWorkspace");
    expect(vaultWriteHook).toContain("export function useVaultWriteActions");
    expect(homePage).not.toContain("async function loadDailySummary");
    expect(homePage).not.toContain("async function searchItems");
    expect(homePage).not.toContain("async function refreshDiagnostics");
    expect(homePage).not.toContain("async function loadAccountSummary");
    expect(homePage).not.toContain("async function executeMissingLoadoutTransfer");
    expect(homePage).not.toContain("async function runItemWriteAction");
    expect(homePage).not.toContain("async function runVaultBatchTransfer");
  });

  it("keeps setup details out of persistent home cards unless they are actionable", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const homeDashboard = readFileSync(join(uiRoot, "src", "home", "HomePageContentView.tsx"), "utf8");
    const homeCopy = readFileSync(join(uiRoot, "src", "i18n", "copy.ts"), "utf8");

    expect(homeDashboard).not.toContain("home-data-strip");
    expect(homeDashboard).toContain("home-briefing-grid");
    expect(homeDashboard).not.toContain("copy.sections.pending.title");
    expect(homeDashboard).toContain('homeText(copy, "本日更新")');
    expect(homeDashboard).toContain('homeText(copy, "本周更新")');
    expect(homeDashboard).toContain('homeText(copy, "先锋行动 · 宗师先锋警戒")');
    expect(homeDashboard).toContain('homeText(copy, "本周轮换突袭")');
    expect(homeDashboard).toContain('homeText(copy, "本周轮换地牢")');
    expect(homeDashboard).toContain('homeText(copy, "周商人")');
    expect(homeCopy).toContain("健康检查正常");
    expect(homeDashboard).not.toContain("Bungie App 已配置");
    expect(homeDashboard).not.toContain("AI 未配置");
    expect(homeDashboard).not.toContain("home-readiness-grid");
    expect(homeDashboard).not.toContain("<StatusOverview");
    expect(homeDashboard).not.toContain("<DiagnosticsPanel");
    expect(homePage).not.toContain('activePage !== "home" ? (');
  });

  it("keeps home status cards compact and surfaces account read failures", () => {
    const productShell = readFileSync(join(desktopRoot, "src", "renderer", "pages", "useDesktopProductShell.tsx"), "utf8");
    const homeDashboard = readFileSync(join(desktopRoot, "src", "renderer", "features", "home", "HomeDashboard.tsx"), "utf8");
    const statusOverview = readFileSync(join(desktopRoot, "src", "renderer", "components", "StatusOverview.tsx"), "utf8");
    const statusCard = readFileSync(join(desktopRoot, "src", "renderer", "components", "StatusCard.tsx"), "utf8");
    const styles = readFileSync(join(desktopRoot, "..", "ui", "src", "styles.css"), "utf8");
    const homePageWorkspace = readFileSync(join(desktopRoot, "..", "app", "src", "workspaces", "homePage.ts"), "utf8");
    const homePageWorkspaceTest = readFileSync(join(desktopRoot, "..", "app", "test", "home-page-workspace.test.ts"), "utf8");

    expect(productShell).toContain("accountError");
    expect(productShell).toContain("hasAccountData: Boolean(accountSummary)");
    expect(homeDashboard).toContain("selectHomePageModel(props)");
    expect(homeDashboard).toContain("{...model}");
    expect(homePageWorkspace).toContain("accountError: input.accountError ?? \"\"");
    expect(homePageWorkspace).toContain("hasAccountData: input.hasAccountData ?? false");
    expect(homePageWorkspaceTest).toContain("expect(model.accountError).toBe(\"账号未读取\")");
    expect(homePageWorkspaceTest).toContain("expect(model.hasAccountData).toBe(false)");
    expect(statusOverview).toContain("accountError");
    expect(statusOverview).toContain("账号数据读取失败");
    expect(statusOverview).toContain("重试读取");
    expect(statusCard).toContain("status-card-action");
    expect(styles).toMatch(/\.status-card\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);/);
    expect(styles).toMatch(/\.status-card-action\s*{[\s\S]*?justify-self:\s*start;/);
  });

  it("keeps vault page composition thin and moved into the app workspace", () => {
    const vaultPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultPage.tsx"), "utf8");
    const appIndex = readFileSync(join(process.cwd(), "packages", "app", "src", "index.ts"), "utf8");
    const vaultWorkspace = readFileSync(join(process.cwd(), "packages", "app", "src", "workspaces", "vaultPage.ts"), "utf8");

    expect(vaultPage).toContain("selectVaultPageModel");
    expect(vaultPage).toContain("model.vaultItems");
    expect(vaultPage).toContain("model.currentCharacterId");
    expect(vaultPage).toContain("model.currentCharacterLabel");
    expect(vaultPage).not.toContain("currentCharacterId = props.selectedCharacterId || props.account.characters[0]?.character_id");
    expect(vaultWorkspace).toContain("selectVaultPageModel");
    expect(appIndex).toContain("selectVaultPageModel");
  });

  it("uses shared source status styling for fallback and warning messages", () => {
    const itemDetailModal = readItemDetailSources(desktopRoot);
    const aiPanel = readFileSync(join(desktopRoot, "src", "renderer", "components", "AiAnalysisPanel.tsx"), "utf8");
    const diagnosticsPanel = readFileSync(join(desktopRoot, "src", "renderer", "components", "DiagnosticsPanel.tsx"), "utf8");
    const styles = readFileSync(join(desktopRoot, "..", "ui", "src", "styles.css"), "utf8");
    const finalBlock = styles.slice(
      styles.indexOf("/* Canonical product token surface rules. Shared by Prototype, Web and Desktop. */"),
      styles.indexOf("/* End canonical product token surface rules */")
    );

    expect(itemDetailModal).toContain('className="source-status-list source-status-warning"');
    expect(itemDetailModal).toContain('source-status-card source-status-');
    expect(itemDetailModal).toContain('source-status-badge source-status-');
    expect(itemDetailModal).toContain('className="source-status-card source-status-pending item-detail-loading"');
    expect(itemDetailModal).toContain('className="source-status-card source-status-pending community-recommendations-panel loading"');
    expect(itemDetailModal).toContain('className="source-status-card source-status-neutral community-recommendations-panel empty"');
    expect(itemDetailModal).toContain('className="source-status-badge source-status-pending">社区推荐</span>');
    expect(itemDetailModal).toContain('className="source-status-badge source-status-neutral">社区推荐</span>');
    expect(itemDetailModal).toContain('className="source-status-card source-status-neutral community-ai-analysis"');
    expect(itemDetailModal).toContain('className="source-status-badge source-status-neutral">AI 原始分析</span>');
    expect(itemDetailModal).toContain('className="source-status-card source-status-warning item-ai-skipped-reason"');
    expect(itemDetailModal).toContain('className="source-status-badge source-status-warning">AI 跳过</span>');
    expect(diagnosticsPanel).toContain('source-status-card source-status-');
    expect(diagnosticsPanel).toContain('source-status-badge source-status-');
    expect(styles).toMatch(/\.source-status-list\s*{[\s\S]*?display:\s*grid;/);
    expect(styles).toMatch(/\.source-status-badge\s*{[\s\S]*?border-radius:\s*999px;/);
    expect(finalBlock).toContain(".source-status-card");
    expect(finalBlock).toContain(".source-status-ready");
    expect(finalBlock).toContain(".source-status-warning");
    expect(finalBlock).toContain(".source-status-neutral");
    expect(finalBlock).toContain("border-color: var(--status-ready)");
    expect(finalBlock).toContain("border-color: var(--status-warning)");
    expect(finalBlock).toContain("border-color: var(--border-control)");
  });

  it("collapses workbench and chat columns on narrow screens", () => {
    const styles = readFileSync(join(desktopRoot, "..", "ui", "src", "styles.css"), "utf8");

    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)\s*{[\s\S]*?\.app-page-head,[\s\S]*?\.app-info-strip,[\s\S]*?\.app-status-row,[\s\S]*?\.app-setting-row,[\s\S]*?\.app-health-grid,[\s\S]*?\.app-metric-grid,[\s\S]*?\.home-card-grid\s*{[\s\S]*?grid-template-columns:\s*1fr;/,
    );
    expect(styles).not.toContain(".home-data-strip");
    expect(styles).toMatch(/@media \(max-width:\s*760px\)\s*{[\s\S]*?\.ai-chat-input\s*{[\s\S]*?grid-template-columns:\s*1fr;/);
  });
});
