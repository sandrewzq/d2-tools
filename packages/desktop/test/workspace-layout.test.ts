import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readItemDetailSources } from "./source-readers";

const desktopRoot = join(process.cwd(), "packages", "desktop");
const uiRoot = join(process.cwd(), "packages", "ui");

describe("desktop workspace layout", () => {
  it("uses a wide shell content area for desktop workspaces", () => {
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");

    expect(styles).toMatch(/\.shell-content\s*{[\s\S]*?width:\s*100%;/);
    expect(styles).toMatch(/\.shell-content\s*{[\s\S]*?max-width:\s*none;/);
  });

  it("renders the home page as a workbench instead of a single long stream", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const homeRoutes = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePageRoutes.tsx"), "utf8");
    const homeDashboard = readFileSync(join(uiRoot, "src", "home", "HomePageView.tsx"), "utf8");
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");
    const dailyPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "daily", "DailyPage.tsx"), "utf8");

    expect(homePage).toContain("<HomePageRoutes");
    expect(homePage).not.toContain("<HomeDashboard");
    expect(homeRoutes).toContain("<HomeDashboard");
    expect(homePage).not.toContain('className="home-workbench"');
    expect(homeDashboard).toContain('className="app-page home-app-page');
    expect(homeDashboard).toContain('className="home-data-strip"');
    expect(homeDashboard).toContain('className="home-weekly-dashboard"');
    expect(homeDashboard).toContain('className="home-main-grid"');
    expect(homeDashboard).toContain('className="home-secondary-grid"');
    expect(homeDashboard).toContain("本周奖励与轮换");
    expect(homeDashboard).toContain("商人重点");
    expect(homeDashboard).not.toContain("<DailySummaryPanel");
    expect(homeDashboard).not.toContain("../daily/DailyPage");
    expect(homePage).not.toContain("function renderDailyPanel");
    expect(dailyPage).toContain("export function DailyPage");
    expect(styles).toMatch(/\.home-data-strip\s*{[\s\S]*?grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/);
    expect(styles).toMatch(/\.home-weekly-dashboard\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.45fr\) minmax\(320px,\s*0\.85fr\);/);
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

  it("keeps the vault menu in an isolated feature entry", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const homeRoutes = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePageRoutes.tsx"), "utf8");
    const vaultPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultPage.tsx"), "utf8");

    expect(homePage).toContain("<HomePageRoutes");
    expect(homePage).not.toContain("<VaultPage");
    expect(homeRoutes).toContain("<VaultPage");
    expect(homePage).not.toContain("function renderVaultPanel");
    expect(vaultPage).toContain("export function VaultPage");
    expect(vaultPage).toContain("<VaultPanel");
    expect(vaultPage).toContain("先读取账号数据，然后查看完整仓库列表。");
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

    expect(homeDashboard).toContain("home-data-strip");
    expect(homeDashboard).toContain("待确认数据");
    expect(homeDashboard).toContain("健康检查正常");
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
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");

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
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");
    const finalBlock = styles.slice(
      styles.indexOf("/* Desktop UI design system v2 final overrides */"),
      styles.indexOf("/* End desktop UI design system v2 final overrides */")
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
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");

    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)\s*{[\s\S]*?\.app-page-head,[\s\S]*?\.app-info-strip,[\s\S]*?\.app-status-row,[\s\S]*?\.app-setting-row,[\s\S]*?\.app-health-grid,[\s\S]*?\.app-metric-grid,[\s\S]*?\.home-card-grid\s*{[\s\S]*?grid-template-columns:\s*1fr;/,
    );
    expect(styles).toMatch(/@media \(max-width:\s*760px\)\s*{[\s\S]*?\.home-data-strip\s*{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
    expect(styles).toMatch(/@media \(max-width:\s*760px\)\s*{[\s\S]*?\.ai-chat-input\s*{[\s\S]*?grid-template-columns:\s*1fr;/);
  });
});
