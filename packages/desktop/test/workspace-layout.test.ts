import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const desktopRoot = join(process.cwd(), "packages", "desktop");

describe("desktop workspace layout", () => {
  it("uses a wide shell content area for desktop workspaces", () => {
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");

    expect(styles).toMatch(/\.shell-content\s*{[\s\S]*?width:\s*100%;/);
    expect(styles).toMatch(/\.shell-content\s*{[\s\S]*?max-width:\s*none;/);
  });

  it("renders the home page as a workbench instead of a single long stream", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const homeDashboard = readFileSync(join(desktopRoot, "src", "renderer", "features", "home", "HomeDashboard.tsx"), "utf8");
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");
    const dailyPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "daily", "DailyPage.tsx"), "utf8");

    expect(homePage).toContain("<HomeDashboard");
    expect(homePage).not.toContain('className="home-workbench"');
    expect(homeDashboard).toContain('className="home-workbench"');
    expect(homeDashboard).toContain('className="home-primary-column"');
    expect(homeDashboard).toContain('className="home-side-column"');
    expect(homeDashboard).toContain("<DailyPage");
    expect(homePage).not.toContain("function renderDailyPanel");
    expect(dailyPage).toContain("export function DailyPage");
    expect(styles).toMatch(/\.home-workbench\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(320px,\s*420px\);/);
  });

  it("keeps the AI menu in an isolated feature entry", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const aiPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "ai", "AiPage.tsx"), "utf8");

    expect(homePage).toContain("<AiPage");
    expect(homePage).not.toContain("去设置配置 AI");
    expect(aiPage).toContain("export function AiPage");
    expect(aiPage).toContain("AiAnalysisPanel");
    expect(aiPage).toContain("onConfigureAi");
  });

  it("keeps the vault menu in an isolated feature entry", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const vaultPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultPage.tsx"), "utf8");

    expect(homePage).toContain("<VaultPage");
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
    const itemDetailHook = readFileSync(join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetailWorkspace.ts"), "utf8");
    const vaultWriteHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "useVaultWriteActions.ts"), "utf8");

    expect(homePage).toContain("useDailySummary");
    expect(homePage).toContain("useLibraryWorkspace");
    expect(homePage).toContain("useDiagnosticsSettings");
    expect(homePage).toContain("useAccountWorkspace");
    expect(homePage).toContain("useLoadoutWriteActions");
    expect(homePage).toContain("useItemDetailWorkspace");
    expect(homePage).toContain("useVaultWriteActions");
    expect(dailyHook).toContain("export function useDailySummary");
    expect(libraryHook).toContain("export function useLibraryWorkspace");
    expect(settingsHook).toContain("export function useDiagnosticsSettings");
    expect(accountHook).toContain("export function useAccountWorkspace");
    expect(loadoutWriteHook).toContain("export function useLoadoutWriteActions");
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

  it("keeps global setup cards on the home sidebar instead of repeating them on every page", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const homeDashboard = readFileSync(join(desktopRoot, "src", "renderer", "features", "home", "HomeDashboard.tsx"), "utf8");
    const overviewMatches = homeDashboard.match(/<StatusOverview/g) ?? [];

    expect(overviewMatches).toHaveLength(1);
    expect(homePage).not.toContain('activePage !== "home" ? (');
  });

  it("keeps AI conversations inside a bounded desktop chat workspace", () => {
    const aiPanel = readFileSync(join(desktopRoot, "src", "renderer", "components", "AiAnalysisPanel.tsx"), "utf8");
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");

    expect(aiPanel).toContain('className="ai-chat-workspace"');
    expect(aiPanel).toContain('className="ai-chat-main"');
    expect(aiPanel).toContain('className="ai-chat-sidebar"');
    expect(styles).toMatch(/\.ai-chat-log\s*{[\s\S]*?max-height:\s*min\(52vh,\s*560px\);/);
    expect(styles).toMatch(/\.ai-chat-input\s*{[\s\S]*?position:\s*sticky;/);
  });

  it("uses shared source status styling for fallback and warning messages", () => {
    const itemDetailModal = readFileSync(join(desktopRoot, "src", "renderer", "shared", "components", "ItemDetailModal.tsx"), "utf8");
    const aiPanel = readFileSync(join(desktopRoot, "src", "renderer", "components", "AiAnalysisPanel.tsx"), "utf8");
    const diagnosticsPanel = readFileSync(join(desktopRoot, "src", "renderer", "components", "DiagnosticsPanel.tsx"), "utf8");
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");

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
    expect(aiPanel).toContain('className="source-status-card source-status-warning ai-skipped-reason"');
    expect(aiPanel).toContain('className="source-status-badge source-status-warning">AI 跳过</span>');
    expect(diagnosticsPanel).toContain('source-status-card source-status-');
    expect(diagnosticsPanel).toContain('source-status-badge source-status-');
    expect(styles).toMatch(/\.source-status-list\s*{[\s\S]*?display:\s*grid;/);
    expect(styles).toMatch(/\.source-status-card\s*{[\s\S]*?border:\s*1px solid #303848;/);
    expect(styles).toMatch(/\.source-status-badge\s*{[\s\S]*?border-radius:\s*999px;/);
    expect(styles).toMatch(/\.source-status-ready\s*{[\s\S]*?border-color:\s*#2f8f63;/);
    expect(styles).toMatch(/\.source-status-warning\s*{[\s\S]*?border-color:\s*#66502a;/);
    expect(styles).toMatch(/\.source-status-neutral\s*{[\s\S]*?border-color:\s*#3f5572;/);
  });

  it("collapses workbench and chat columns on narrow screens", () => {
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");

    expect(styles).toMatch(
      /@media \(max-width:\s*760px\)\s*{[\s\S]*?\.home-workbench,\s*[\r\n\s]*\.ai-chat-workspace\s*{[\s\S]*?grid-template-columns:\s*1fr;/,
    );
    expect(styles).toMatch(/@media \(max-width:\s*760px\)\s*{[\s\S]*?\.home-side-column\s*{[\s\S]*?position:\s*static;/);
    expect(styles).toMatch(/@media \(max-width:\s*760px\)\s*{[\s\S]*?\.ai-chat-input\s*{[\s\S]*?grid-template-columns:\s*1fr;/);
  });
});
