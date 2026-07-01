import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const desktopRoot = join(process.cwd(), "packages", "desktop");
const rendererRoot = join(desktopRoot, "src", "renderer");

function readRendererFile(path: string): string {
  return readFileSync(join(rendererRoot, path), "utf8");
}

function readCssRule(styles: string, selector: string): string {
  const start = styles.indexOf(`\n${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = styles.indexOf("}", start);
  expect(end).toBeGreaterThan(start);
  return styles.slice(start + 1, end + 1);
}

describe("desktop T5 visual redesign", () => {
  it("renders a desktop shell with top global status, right-side tools and an AI drawer", () => {
    const shell = readRendererFile("components/ShellLayout.tsx");
    const styles = readRendererFile("styles.css");

    expect(shell).toContain("shell-topbar");
    expect(shell).toContain("shell-global-status");
    expect(shell).toContain("shell-status-group");
    expect(shell).toContain("shell-status-dot");
    expect(shell).toContain("shell-account-status");
    expect(shell).toContain("shell-toolstrip");
    expect(shell).toContain("shell-tool-button");
    expect(shell).toContain("shell-tool-ai");
    expect(shell).toContain("shell-tool-github");
    expect(shell).toContain('{ key: "settings", label: "设置" }');
    expect(shell).not.toContain("onInitializeManifest");
    expect(shell).not.toContain("aria-label=\"后台更新资料库\"");
    expect(shell).toContain("global-assistant-drawer");
    expect(shell).toContain("aria-label=\"打开 AI 助手抽屉\"");
    expect(shell).not.toContain("title=\"本地数据\"");
    expect(shell).not.toContain("title=\"操作历史\"");
    expect(shell).not.toContain("title=\"工具\"");
    expect(shell).not.toContain("GitHub\n");
    expect(shell).not.toContain("global-assistant-rail");
    expect(shell).not.toContain("任务助手");
    expect(shell).not.toContain("brand-block");
    expect(shell).not.toContain("工作区");
    expect(shell).toContain("窗口控制");
    expect(shell).toContain("shell-window-controls");
    expect(shell).not.toContain("shell-current-page");
    expect(styles).toContain(".shell-topbar");
    expect(styles).toMatch(/\.shell-topbar\s*{[\s\S]*?grid-template-columns:\s*220px minmax\(0,\s*1fr\) auto 138px;/);
    expect(styles).toMatch(/\.shell-titlebar\s*{[\s\S]*?height:\s*48px;/);
    expect(styles).toContain(".shell-status-group");
    expect(styles).toContain(".shell-status-dot");
    expect(styles).toContain(".shell-toolstrip");
    expect(styles).toContain(".shell-tool-button");
    expect(styles).toContain(".shell-tool-github");
    expect(styles).toContain(".shell-tool-ai.active");
    expect(styles).toContain("grid-template-columns: repeat(4, 46px);");
    expect(styles).toContain(".global-assistant-drawer");
    expect(styles).not.toContain(".global-assistant-backdrop");
    expect(shell).not.toContain("global-assistant-backdrop");
    expect(styles).toMatch(/\.app-shell\.assistant-open \.shell-workspace\s*{[\s\S]*?grid-template-columns:\s*88px minmax\(0,\s*1fr\) minmax\(360px,\s*420px\);/);
    const assistantDrawerRule = readCssRule(styles, ".global-assistant-drawer");
    expect(assistantDrawerRule).toContain("position: relative");
    expect(assistantDrawerRule).not.toContain("position: fixed");
  });

  it("keeps home as a product overview instead of a navigation or task launcher page", () => {
    const homeDashboard = readRendererFile("features/home/HomeDashboard.tsx");
    const styles = readRendererFile("styles.css");

    expect(homeDashboard).toContain("app-page home-app-page");
    expect(homeDashboard).toContain("home-data-strip");
    expect(homeDashboard).toContain("本周奖励与轮换");
    expect(homeDashboard).toContain("home-weekly-dashboard");
    expect(homeDashboard).toContain("今天可确认");
    expect(homeDashboard).toContain("待确认数据");
    expect(homeDashboard).toContain("运行诊断");
    expect(homeDashboard).not.toContain("当前桌面状态");
    expect(homeDashboard).not.toContain("状态与设置");
    expect(homeDashboard).not.toContain("下一步建议");
    expect(homeDashboard).not.toContain("读取账号");
    expect(homeDashboard).not.toContain("商人库存");
    expect(homeDashboard).not.toContain("<StatusOverview");
    expect(homeDashboard).not.toContain("<DiagnosticsPanel");
    expect(homeDashboard).not.toContain("小日向菜单");
    expect(homeDashboard).not.toContain("任务入口");
    expect(styles).toContain(".home-data-strip");
    expect(styles).toContain(".home-weekly-dashboard");
    expect(styles).toContain(".home-reward-list");
    expect(styles).toMatch(/\.home-weekly-dashboard\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.45fr\) minmax\(320px,\s*0\.85fr\);/);
  });

  it("uses the account A2 layout with visible backpack previews and a narrow secondary summary", () => {
    const accountPage = readRendererFile("features/account/AccountPage.tsx");
    const styles = readRendererFile("styles.css");

    expect(accountPage).toContain("account-a2-layout");
    expect(accountPage).toContain("account-slot-backpack-preview");
    expect(accountPage).toContain("背包候选");
    expect(accountPage).toContain("account-side-summary");
    expect(accountPage).toContain("account-side-summary-grid");
    expect(accountPage).toContain("ACCOUNT_SLOT_PREVIEW_LIMIT");
    expect(styles).toContain(".account-a2-layout");
    expect(styles).toContain(".account-slot-backpack-preview");
    expect(styles).toContain(".account-side-summary");
    expect(styles).toMatch(/\.account-a2-layout\s*{[\s\S]*?grid-template-columns:\s*1fr;/);
    expect(styles).toMatch(/\.account-secondary-workbench\s*{[\s\S]*?grid-template-columns:\s*1fr;/);
    expect(styles).toMatch(/\.account-side-summary-grid\s*{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/);
    expect(styles).toMatch(/\.activity-review-grid\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*0\.8fr\)\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
  });

  it("splits vault workflows into first-class tabs while keeping weapon and armor filters separate", () => {
    const vaultPanel = readRendererFile("components/VaultPanel.tsx");
    const toolbar = readRendererFile("features/vault/VaultFilterToolbar.tsx");
    const armorPanel = readRendererFile("features/vault/VaultArmorFilterPanel.tsx");
    const styles = readRendererFile("styles.css");

    expect(vaultPanel).toContain("VaultWorkspaceTab");
    expect(vaultPanel).toContain("筛选列表");
    expect(vaultPanel).toContain("清理工作台");
    expect(vaultPanel).toContain("同名对比");
    expect(vaultPanel).toContain("目标规则");
    expect(vaultPanel).toContain("推荐数据");
    expect(vaultPanel).toContain("vault-workflow-tabs");
    expect(vaultPanel).toContain("activeVaultTab");
    expect(vaultPanel).toContain("isSearchActive={Boolean(query.trim())}");
    expect(vaultPanel).toContain("setGroup(\"weapons\")");
    expect(vaultPanel).toContain("setGroup(\"armor\")");
    expect(toolbar).toContain("vault-filter-mode-tabs");
    expect(toolbar).toContain("weapon-filter-panel");
    expect(toolbar).toContain("weapon-filter-heading");
    expect(toolbar).toContain("vault-frame-filter");
    expect(toolbar).toContain("armor-filter-panel");
    expect(toolbar).toContain("weapon-filter-lane");
    expect(toolbar).toContain("armor-filter-lane");
    expect(toolbar).toContain("Perk / 推荐");
    expect(armorPanel).toContain("护甲属性筛选");
    expect(styles).toContain(".vault-workflow-tabs");
    expect(styles).toContain(".weapon-filter-lane");
    expect(styles).toMatch(/\.vault-frame-filter\s*{[\s\S]*?grid-template-columns:\s*auto minmax\(0,\s*1fr\);/);
    expect(styles).toContain(".armor-filter-lane");
    expect(styles).toMatch(/\.vault-workflow-tab:hover,\s*[\s\S]*?\.vault-workflow-tab.active\s*{[\s\S]*?background:\s*var\(--state-selected-bg\);/);
    expect(styles).toMatch(/\.vault-dashboard-panel \.segmented-control button\.active\s*{[\s\S]*?color:\s*var\(--text-title\);/);
  });

  it("makes the library default workflow an acquisition-source query with manifest freshness visible", () => {
    const libraryPage = readRendererFile("features/library/LibraryPage.tsx");
    const styles = readRendererFile("styles.css");

    expect(libraryPage).toContain("library-reference-page");
    expect(libraryPage).toContain("出处查询");
    expect(libraryPage).toContain("获取优先级");
    expect(libraryPage).toContain("资料库版本");
    expect(libraryPage).not.toContain("资料库日期");
    expect(libraryPage).toContain("library-acquisition-tabs");
    expect(libraryPage).toContain("library-source-groups");
    expect(libraryPage).toContain("library-reference-card");
    expect(libraryPage).toContain("formatManifestDataDate");
    expect(libraryPage).toContain("来源可确认");
    expect(libraryPage).toContain("等轮换");
    expect(libraryPage).toContain("已下架或待确认");
    expect(libraryPage).toContain("来源待补");
    expect(styles).toContain(".library-reference-page");
    expect(styles).toContain(".library-acquisition-tabs");
    expect(styles).toContain(".library-source-groups");
    expect(styles).toContain(".library-reference-card");
  });
});
