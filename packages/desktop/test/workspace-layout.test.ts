import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readItemDetailSources } from "./source-readers";

const desktopRoot = join(process.cwd(), "packages", "desktop");
const uiRoot = join(process.cwd(), "packages", "ui");

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

describe("desktop workspace layout", () => {
  it("uses a wide shell content area for desktop workspaces", () => {
    const styles = readFileSync(join(desktopRoot, "..", "ui", "src", "styles.css"), "utf8");

    expect(styles).toMatch(/\.shell-content\s*{[\s\S]*?width:\s*100%;/);
    expect(styles).toMatch(/\.shell-content\s*{[\s\S]*?max-width:\s*none;/);
  });

  it("uses one compact product workspace frame across all primary menus", () => {
    const styles = readFileSync(join(uiRoot, "src", "styles.css"), "utf8");
    const productHost = readFileSync(join(uiRoot, "src", "product", "ProductShellHost.tsx"), "utf8");
    const pageSources = [
      readFileSync(join(uiRoot, "src", "home", "HomePageView.tsx"), "utf8"),
      readFileSync(join(uiRoot, "src", "account", "AccountPageView.tsx"), "utf8"),
      readFileSync(join(uiRoot, "src", "vault", "VaultPageView.tsx"), "utf8"),
      readFileSync(join(uiRoot, "src", "loadouts", "LoadoutsPageView.tsx"), "utf8"),
      readFileSync(join(uiRoot, "src", "library", "LibraryPageView.tsx"), "utf8"),
      readFileSync(join(uiRoot, "src", "vendors", "VendorsPageView.tsx"), "utf8"),
      readFileSync(join(uiRoot, "src", "settings", "SettingsPageView.tsx"), "utf8")
    ];
    const contentSources = [
      readFileSync(join(uiRoot, "src", "vault", "VaultPageContentView.tsx"), "utf8"),
      readFileSync(join(uiRoot, "src", "loadouts", "LoadoutsPageContentView.tsx"), "utf8"),
      readFileSync(join(uiRoot, "src", "library", "LibraryPageContentView.tsx"), "utf8"),
      readFileSync(join(uiRoot, "src", "vendors", "VendorsPageContentView.tsx"), "utf8"),
      readFileSync(join(uiRoot, "src", "settings", "SettingsPageContentView.tsx"), "utf8")
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

    expect(productHost).toContain("page-header product-page-header product-workspace-header");
    expect(styles).toMatch(/\.product-workspace-header\s*{[\s\S]*?min-height:\s*42px;/);
    expect(styles).toMatch(/\.product-workspace-page\s*{[\s\S]*?gap:\s*10px;/);
    expect(styles).toMatch(/\.product-workspace-panel\s*{[\s\S]*?border-radius:\s*var\(--radius-panel\);/);
    expect(styles).toMatch(/\.product-split-workspace\s*{[\s\S]*?grid-template-columns:\s*var\(--workspace-side-width,\s*240px\)\s*minmax\(0,\s*1fr\);/);

    for (const source of pageSources) {
      expect(source).toMatch(/ProductWorkspacePage|product-workspace-page/);
    }

    expect(contentSources).toMatch(/ProductWorkspaceCommandBar|product-command-bar/);
    expect(contentSources).toMatch(/ProductWorkspaceSplit|product-split-workspace/);
    expect(contentSources).toMatch(/ProductWorkspaceSideRail|product-side-rail/);
    expect(contentSources).toMatch(/ProductWorkspaceContentStack|product-content-stack/);
  });

  it("moves workspace layout ownership into shared ProductWorkspace components", () => {
    const uiIndex = readFileSync(join(uiRoot, "src", "index.ts"), "utf8");
    const workspaceComponents = readFileSync(join(uiRoot, "src", "workspace", "ProductWorkspace.tsx"), "utf8");
    const libraryView = readFileSync(join(uiRoot, "src", "library", "LibraryPageView.tsx"), "utf8");
    const libraryContent = readFileSync(join(uiRoot, "src", "library", "LibraryPageContentView.tsx"), "utf8");
    const accountContent = readFileSync(join(uiRoot, "src", "account", "AccountPageContentView.tsx"), "utf8");
    const settingsContent = readFileSync(join(uiRoot, "src", "settings", "SettingsPageContentView.tsx"), "utf8");
    const vaultView = readFileSync(join(uiRoot, "src", "vault", "VaultPageView.tsx"), "utf8");
    const vaultContent = readFileSync(join(uiRoot, "src", "vault", "VaultPageContentView.tsx"), "utf8");
    const loadoutsView = readFileSync(join(uiRoot, "src", "loadouts", "LoadoutsPageView.tsx"), "utf8");
    const loadoutsContent = readFileSync(join(uiRoot, "src", "loadouts", "LoadoutsPageContentView.tsx"), "utf8");
    const vendorsView = readFileSync(join(uiRoot, "src", "vendors", "VendorsPageView.tsx"), "utf8");
    const vendorsContent = readFileSync(join(uiRoot, "src", "vendors", "VendorsPageContentView.tsx"), "utf8");
    const styles = readFileSync(join(uiRoot, "src", "styles.css"), "utf8");

    for (const exportName of [
      "ProductWorkspacePage",
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

    expect(libraryView).toContain("ProductWorkspacePage");
    expect(libraryView).toContain("ProductWorkspaceSplit");
    expect(libraryContent).toContain("ProductWorkspaceSideRail");
    expect(libraryContent).toContain("ProductWorkspaceContentStack");
    expect(libraryContent).toContain("ProductWorkspaceEmptyState");
    expect(accountContent).toContain("ProductWorkspaceSplit");
    expect(settingsContent).toContain("ProductWorkspaceSplit");
    expect(vaultView).toContain("ProductWorkspacePage");
    expect(vaultContent).toContain("ProductWorkspaceCommandBar");
    expect(vaultContent).toContain("ProductWorkspaceSideRail");
    expect(loadoutsView).toContain("ProductWorkspacePage");
    expect(loadoutsContent).toContain("ProductWorkspaceSideRail");
    expect(loadoutsContent).toContain("ProductWorkspaceEmptyState");
    expect(vendorsView).toContain("ProductWorkspaceCommandBar");
    expect(vendorsContent).toContain("ProductWorkspaceSplit");
    expect(vendorsContent).toContain("ProductWorkspaceContentStack");

    expect(styles).toMatch(/\.product-workspace-empty\s*{[\s\S]*?min-height:\s*220px;/);
    expect(styles).toMatch(/\.library-results-panel\.product-workspace-panel\s*{[\s\S]*?min-height:\s*min\(620px,\s*calc\(100vh - 190px\)\);/);
    expect(styles).toMatch(/\.product-workspace-page\s*{[\s\S]*?gap:\s*10px;/);
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

  it("renders the home page as a workbench instead of a single long stream", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const homeRoutes = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePageRoutes.tsx"), "utf8");
    const homeDashboard = readFileSync(join(uiRoot, "src", "home", "HomePageView.tsx"), "utf8");
    const homeCopy = readFileSync(join(uiRoot, "src", "i18n", "copy.ts"), "utf8");
    const styles = readFileSync(join(desktopRoot, "..", "ui", "src", "styles.css"), "utf8");
    const dailyPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "daily", "DailyPage.tsx"), "utf8");

    expect(homePage).toContain("<HomePageRoutes");
    expect(homePage).not.toContain("<HomeDashboard");
    expect(homeRoutes).toContain("<HomeDashboard");
    expect(homePage).not.toContain('className="home-workbench"');
    expect(homeDashboard).toContain("ProductWorkspacePage");
    expect(homeDashboard).toContain('className="app-page home-app-page');
    expect(homeDashboard).not.toContain('className="home-data-strip"');
    expect(homeDashboard).toContain('className="home-briefing-grid"');
    expect(homeDashboard).toContain('className="app-panel app-panel-body home-daily-panel"');
    expect(homeDashboard).toContain('className="app-panel app-panel-body home-weekly-panel"');
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
    expect(styles).toMatch(/\.home-briefing-grid\s*{[\s\S]*?grid-template-columns:\s*minmax\(288px,\s*0\.58fr\) minmax\(0,\s*1\.72fr\);/);
    expect(styles).toMatch(/\.home-weekly-dashboard\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.35fr\) minmax\(260px,\s*0\.75fr\);/);
    expect(styles).toMatch(/@media \(max-width:\s*1180px\)\s*{[\s\S]*?\.home-weekly-dashboard,[\s\S]*?\.home-main-grid,[\s\S]*?\.home-secondary-grid,[\s\S]*?\.app-settings-grid\s*{[\s\S]*?grid-template-columns:\s*1fr;/);
  });

  it("keeps AI in the global assistant sidebar instead of a main page", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const aiPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "ai", "AiPage.tsx"), "utf8");
    const assistantSidebar = readFileSync(join(desktopRoot, "src", "renderer", "components", "GlobalAssistantSidebar.tsx"), "utf8");

    expect(homePage).toContain("<GlobalAssistantSidebar");
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
    expect(homeRoutes).toContain("<VaultPage");
    expect(homePage).not.toContain("function renderVaultPanel");
    expect(vaultPage).toContain("export function VaultPage");
    expect(vaultPage).toContain("<VaultPageContentView");
    expect(vaultPanel).toContain("VaultPageContentView as VaultPanel");
    expect(vaultPage).toContain("<VaultPageView");
    expect(vaultView).toContain("copy.emptySubtitle");
    expect(uiCopy).toContain("先读取账号数据，然后查看完整仓库列表。");
  });

  it("keeps page data orchestration in feature hooks instead of growing HomePage", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const dailyHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "daily", "useDailySummary.ts"), "utf8");
    const libraryHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "library", "useLibraryWorkspace.ts"), "utf8");
    const settingsHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "useDiagnosticsSettings.ts"), "utf8");
    const accountHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "account", "useAccountWorkspace.ts"), "utf8");
    const loadoutWriteHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "useLoadoutWriteActions.ts"), "utf8");
    const homeWriteHook = readFileSync(join(desktopRoot, "src", "renderer", "pages", "useHomePageWriteActions.ts"), "utf8");
    const itemDetailHook = readFileSync(join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetailWorkspace.ts"), "utf8");
    const vaultWriteHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "useVaultWriteActions.ts"), "utf8");

    expect(homePage).toContain("useDailySummary");
    expect(homePage).toContain("useLibraryWorkspace");
    expect(homePage).toContain("useDiagnosticsSettings");
    expect(homePage).toContain("useAccountWorkspace");
    expect(homePage).toContain("useHomePageWriteActions");
    expect(homePage).not.toContain("useLoadoutWriteActions");
    expect(homePage).not.toContain("useLoadoutTemplateActions");
    expect(homePage).not.toContain("useItemDetailWorkspace");
    expect(homePage).not.toContain("useVaultWriteActions");
    expect(dailyHook).toContain("export function useDailySummary");
    expect(libraryHook).toContain("export function useLibraryWorkspace");
    expect(settingsHook).toContain("export function useDiagnosticsSettings");
    expect(accountHook).toContain("export function useAccountWorkspace");
    expect(loadoutWriteHook).toContain("export function useLoadoutWriteActions");
    expect(homeWriteHook).toContain("export function useHomePageWriteActions");
    expect(homeWriteHook).toContain("useLoadoutWriteActions");
    expect(homeWriteHook).toContain("useLoadoutTemplateActions");
    expect(homeWriteHook).toContain("useItemDetailWorkspace");
    expect(homeWriteHook).toContain("useVaultWriteActions");
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
    const homeDashboard = readFileSync(join(uiRoot, "src", "home", "HomePageView.tsx"), "utf8");
    const homeCopy = readFileSync(join(uiRoot, "src", "i18n", "copy.ts"), "utf8");

    expect(homeDashboard).not.toContain("home-data-strip");
    expect(homeDashboard).toContain("home-briefing-grid");
    expect(homeDashboard).not.toContain("copy.sections.pending.title");
    expect(homeDashboard).toContain("copy.account.diagnosticReadyTitle");
    expect(homeCopy).toContain("健康检查正常");
    expect(homeDashboard).not.toContain("Bungie App 已配置");
    expect(homeDashboard).not.toContain("AI 未配置");
    expect(homeDashboard).not.toContain("home-readiness-grid");
    expect(homeDashboard).not.toContain("<StatusOverview");
    expect(homeDashboard).not.toContain("<DiagnosticsPanel");
    expect(homePage).not.toContain('activePage !== "home" ? (');
  });

  it("keeps home status cards compact and surfaces account read failures", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const homeDashboard = readFileSync(join(desktopRoot, "src", "renderer", "features", "home", "HomeDashboard.tsx"), "utf8");
    const statusOverview = readFileSync(join(desktopRoot, "src", "renderer", "components", "StatusOverview.tsx"), "utf8");
    const statusCard = readFileSync(join(desktopRoot, "src", "renderer", "components", "StatusCard.tsx"), "utf8");
    const styles = readFileSync(join(desktopRoot, "..", "ui", "src", "styles.css"), "utf8");

    expect(homePage).toContain("accountError");
    expect(homePage).toContain("hasAccountData: Boolean(accountSummary)");
    expect(homeDashboard).toContain("accountError");
    expect(homeDashboard).toContain("hasAccountData");
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

    expect(vaultPage).toContain("createVaultPageWorkspace");
    expect(vaultPage).toContain("workspace.vaultItems");
    expect(vaultPage).toContain("workspace.currentCharacterId");
    expect(vaultPage).toContain("workspace.currentCharacterLabel");
    expect(vaultPage).not.toContain("currentCharacterId = props.selectedCharacterId || props.account.characters[0]?.character_id");
    expect(vaultWorkspace).toContain("createVaultPageWorkspace");
    expect(appIndex).toContain("createVaultPageWorkspace");
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
