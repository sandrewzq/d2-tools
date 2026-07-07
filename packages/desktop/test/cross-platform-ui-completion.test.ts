import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function read(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("cross-platform UI completion boundary", () => {
  it("moves vault, loadouts and library page shells into packages/ui", () => {
    const uiIndex = read("packages/ui/src/index.ts");
    const vaultView = read("packages/ui/src/vault/VaultPageView.tsx");
    const vaultContent = read("packages/ui/src/vault/VaultPageContentView.tsx");
    const desktopVaultUiShims = [
      read("packages/desktop/src/renderer/features/vault/VaultArmorFilterPanel.tsx"),
      read("packages/desktop/src/renderer/features/vault/VaultDuplicateGroups.tsx"),
      read("packages/desktop/src/renderer/features/vault/VaultFilterToolbar.tsx"),
      read("packages/desktop/src/renderer/features/vault/VaultItemSections.tsx"),
      read("packages/desktop/src/renderer/features/vault/VaultListItem.tsx"),
      read("packages/desktop/src/renderer/features/vault/VaultOrganizePanel.tsx"),
      read("packages/desktop/src/renderer/features/vault/VaultRecommendationImportPanel.tsx"),
      read("packages/desktop/src/renderer/features/vault/VaultTargetRulesPanel.tsx"),
      read("packages/desktop/src/renderer/features/vault/useVaultBatchActions.ts")
    ].join("\n");
    const loadoutsView = read("packages/ui/src/loadouts/LoadoutsPageView.tsx");
    const libraryView = read("packages/ui/src/library/LibraryPageView.tsx");
    const vendorsView = read("packages/ui/src/vendors/VendorsPageView.tsx");
    const loadoutsContent = read("packages/ui/src/loadouts/LoadoutsPageContentView.tsx");
    const libraryContent = read("packages/ui/src/library/LibraryPageContentView.tsx");
    const vendorsContent = read("packages/ui/src/vendors/VendorsPageContentView.tsx");
    const vaultPage = read("packages/desktop/src/renderer/features/vault/VaultPage.tsx");
    const desktopVaultPanel = read("packages/desktop/src/renderer/components/VaultPanel.tsx");
    const loadoutsPage = read("packages/desktop/src/renderer/features/loadouts/LoadoutsPage.tsx");
    const libraryPage = read("packages/desktop/src/renderer/features/library/LibraryPage.tsx");
    const vendorsPage = read("packages/desktop/src/renderer/features/vendors/VendorsPage.tsx");

    expect(uiIndex).toContain("VaultPageView");
    expect(uiIndex).toContain("VaultPageContentView");
    expect(uiIndex).toContain("LoadoutsPageView");
    expect(uiIndex).toContain("LibraryPageView");
    expect(uiIndex).toContain("VendorsPageView");
    expect(uiIndex).toContain("VendorsPageContentView");

    expect(vaultView).toContain("export function VaultPageView");
    expect(vaultContent).toContain("export function VaultPageContentView");
    expect(vaultContent).toContain("vault-workflow-tabs");
    expect(vaultContent).toContain("VaultFilterToolbar");
    expect(vaultContent).toContain("VaultDuplicateGroups");
    expect(vaultContent).toContain("VaultRecommendationImportPanel");
    expect(vaultContent).toContain("VaultTargetRulesPanel");
    expect(loadoutsView).toContain("export function LoadoutsPageView");
    expect(libraryView).toContain("export function LibraryPageView");
    expect(vendorsView).toContain("export function VendorsPageView");
    expect(loadoutsContent).toContain("export function LoadoutsPageContentView");
    expect(libraryContent).toContain("export function LibraryPageContentView");
    expect(vendorsContent).toContain("export function VendorsPageContentView");
    expect(loadoutsContent).not.toContain("<LoadoutsPageView");
    expect(libraryContent).not.toContain("<LibraryPageView");
    expect(vendorsContent).not.toContain("<VendorsPageView");
    expect(loadoutsContent).not.toContain("ProductWorkspacePage");
    expect(libraryContent).not.toContain("ProductWorkspacePage");
    expect(vendorsContent).not.toContain("ProductWorkspacePage");

    expect(vaultPage).toContain("<VaultPageContentView");
    expect(vaultPage).not.toContain("<VaultPageView");
    expect(vaultPage).not.toContain("VaultPanel");
    expect(desktopVaultPanel).not.toContain("export function VaultPanel");
    expect(desktopVaultUiShims).toContain("@d2-tools/ui");
    expect(desktopVaultUiShims).not.toContain("export function Vault");
    expect(desktopVaultUiShims).not.toContain("createVaultListWorkspace");
    expect(desktopVaultUiShims).not.toContain("useState");
    expect(vaultPage).not.toContain("导入 DIM 愿望单");
    expect(vaultPage).not.toContain("本地目标规则");
    expect(loadoutsPage).toContain("<LoadoutsPageContentView");
    expect(libraryPage).toContain("<LibraryPageContentView");
    expect(vendorsPage).toContain("<VendorsPageContentView");
    expect(vendorsPage).toContain("model={props.model}");
    expect(vendorsPage).toContain("actions={props.actions ?? {}}");

    expect(vaultPage).not.toContain("placeholder-panel");
    expect(loadoutsPage).not.toContain('className="tool-panel loadouts-page loadout-product-layout"');
    expect(libraryPage).not.toContain('className="tool-panel library-reference-page library-product-layout"');
  });

  it("keeps shared page copy in i18n for Chinese and English", () => {
    const types = read("packages/ui/src/i18n/types.ts");
    const copy = read("packages/ui/src/i18n/copy.ts");

    expect(types).toContain("vault: VaultCopy");
    expect(types).toContain("loadouts: LoadoutsCopy");
    expect(types).toContain("library: LibraryCopy");
    expect(types).toContain("vendors: VendorsCopy");
    expect(types).toContain("account: AccountCopy");
    expect(types).toContain("settings: SettingsCopy");
    expect(copy).toContain("Vault");
    expect(copy).toContain("Loadouts");
    expect(copy).toContain("Library");
    expect(copy).toContain("Vendors");
    expect(copy).toContain("Account");
    expect(copy).toContain("Settings");
    expect(copy).toContain("仓库");
    expect(copy).toContain("本地方案库");
    expect(copy).toContain("资料库搜索");
    expect(copy).toContain("商人库存");
    expect(copy).toContain("账号摘要");
    expect(copy).toContain("设置总览");
  });

  it("adds web adapter endpoints beyond the home fallback snapshot", () => {
    const adapter = read("packages/web/src/webAdapter.ts");

    expect(adapter).toContain("createWebSnapshotProvider");
    expect(adapter).toContain("WebSnapshotSource");
    expect(adapter).toContain("loadPageSnapshot");
    expect(adapter).toContain("/api/pages/");
    expect(adapter).toContain("WebPageSnapshot");
    expect(adapter).toContain("fetchJson");
  });

  it("adds prototype scenarios for update, AI, account error and missing manifest components", () => {
    const scenarios = read("packages/prototype/src/mock/scenarios.ts");

    expect(scenarios).toContain("update-available");
    expect(scenarios).toContain("ai-unconfigured");
    expect(scenarios).toContain("account-error");
    expect(scenarios).toContain("manifest-missing-components");
  });

  it("renders every primary prototype route with shared UI instead of generic placeholders", () => {
    const prototypeMain = read("packages/prototype/src/main.tsx");
    const uiStyles = read("packages/ui/src/styles.css");

    expect(prototypeMain).toContain("AccountPageContentView");
    expect(prototypeMain).toContain("selectAccountPageModel");
    expect(prototypeMain).not.toContain("<AccountPageView interfaceLocale={preferences.interfaceLocale} />");
    expect(prototypeMain).toContain("VaultPageContentView");
    expect(prototypeMain).toContain("LoadoutsPageContentView");
    expect(prototypeMain).toContain("LibraryPageContentView");
    expect(prototypeMain).toContain("VendorsPageContentView");
    expect(prototypeMain).toContain("createVendorsPageWorkspace");
    expect(prototypeMain).toContain("prototypeVendorsWorkspace");
    expect(prototypeMain).toContain("model={prototypeVendorsWorkspace}");
    expect(prototypeMain).toContain("actions={{}}");
    expect(prototypeMain).toContain('activePage === "vault"');
    expect(prototypeMain).toContain('activePage === "loadouts"');
    expect(prototypeMain).toContain('activePage === "library"');
    expect(prototypeMain).toContain('activePage === "vendors"');
    expect(prototypeMain).toContain("interfaceLocale={preferences.interfaceLocale}");
    expect(prototypeMain).toContain("pageHeader={getPrototypePageHeader");
    expect(prototypeMain).not.toContain('className="page-header"');
    expect(prototypeMain).not.toContain("vault-prototype-summary");
    expect(prototypeMain).not.toContain("这个页面会在后续阶段接入共享 View。");
    expect(prototypeMain).not.toContain('activePage !== "home" && activePage !== "account" && activePage !== "settings"');

    expect(uiStyles).toContain(".product-page-header");
    expect(uiStyles).toContain(".vault-product-layout");
    expect(uiStyles).toContain(".loadout-product-layout");
    expect(uiStyles).toContain(".library-product-layout");
    expect(uiStyles).toContain(".vendors-product-layout");
    expect(uiStyles).toContain(".vendor-inventory-grid");
    expect(uiStyles).toContain(".item-result");
  });

  it("keeps prototype mock data dense enough to compare with desktop pages", () => {
    const prototypeMain = read("packages/prototype/src/main.tsx");

    expect(prototypeMain).toContain("emblem_url");
    expect((prototypeMain.match(/prototypeAccountItem\(/g) ?? []).length).toBeGreaterThanOrEqual(24);
    expect(prototypeMain).toMatch(/item_count:\s*764/);
    expect(prototypeMain).toMatch(/materials:\s*\{\s*item_count:\s*28/);
    expect(prototypeMain).toContain("postmaster_items: [");
    expect(prototypeMain).toContain("prototypeLibraryItems: any[] = [");
    expect((prototypeMain.match(/source:\s*\{ status: "ready"/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it("keeps the prototype settings fallback menu interactive", () => {
    const settingsFallback = read("packages/ui/src/settings/SettingsPageView.tsx");

    expect(settingsFallback).toContain("useState");
    expect(settingsFallback).toContain("activeSection");
    expect(settingsFallback).toContain("setActiveSection");
    expect(settingsFallback).toContain("onClick={() => setActiveSection");
    expect(settingsFallback).toContain('activeSection === "overview"');
    expect(settingsFallback).toContain('activeSection === "account"');
    expect(settingsFallback).toContain('activeSection === "backup"');
  });

  it("reuses the shared AI assistant drawer in prototype and web instead of local placeholders", () => {
    const prototypeMain = read("packages/prototype/src/main.tsx");
    const webMain = read("packages/web/src/main.tsx");
    const uiIndex = read("packages/ui/src/index.ts");
    const uiAssistant = read("packages/ui/src/assistant/AiAssistantPanelView.tsx");
    const uiStyles = read("packages/ui/src/styles.css");
    const prototypeStyles = read("packages/prototype/src/styles.css");

    expect(uiIndex).toContain("AiAssistantPanelView");
    expect(uiAssistant).toContain("export function AiAssistantPanelView");
    expect(uiAssistant).toContain("AI 助手");
    expect(uiAssistant).toContain("ai-conversation-header");
    expect(uiAssistant).toContain("ai-composer");

    expect(prototypeMain).toContain("AiAssistantPanelView");
    expect(prototypeMain).not.toContain("PrototypeAssistantPanel");
    expect(prototypeMain).not.toContain("<h2>小日向</h2>");
    expect(prototypeMain).not.toContain("这是 prototype 的 mock 抽屉");
    expect(prototypeMain).not.toContain("后续接入真实页面上下文");

    expect(webMain).toContain("AiAssistantPanelView");
    expect(webMain).not.toContain("Web AI 助手入口待接入");

    expect(uiStyles).toContain(".ai-chat-panel");
    expect(uiStyles).toContain(".ai-conversation-header");
    expect(uiStyles).toContain(".ai-context-drawer");
    expect(prototypeStyles).not.toContain(".prototype-assistant-panel");
  });

  it("renders web primary routes through shared page views instead of the home page fallback", () => {
    const webMain = read("packages/web/src/main.tsx");

    expect(webMain).toContain("AccountPageContentView");
    expect(webMain).toContain("VaultPageContentView");
    expect(webMain).toContain("LoadoutsPageContentView");
    expect(webMain).toContain("LibraryPageContentView");
    expect(webMain).toContain("VendorsPageContentView");
    expect(webMain).toContain("createVendorsPageWorkspace");
    expect(webMain).toContain("webVendorsWorkspace");
    expect(webMain).toContain("model={webVendorsWorkspace}");
    expect(webMain).toContain("SettingsPageContentView");
    expect(webMain).toContain('activePage === "account"');
    expect(webMain).toContain('activePage === "vault"');
    expect(webMain).toContain('activePage === "vendors"');
    expect(webMain).toContain("pageHeader={getWebPageHeader");
    expect(webMain).not.toContain("当前 Web 入口仅接首页");
    expect(webMain).not.toContain('className="page-header"');
  });

  it("keeps the account fallback prototype free of unfinished placeholder copy", () => {
    const accountFallback = read("packages/ui/src/account/AccountPageView.tsx");

    expect(accountFallback).not.toMatch(/后续|待接入|待统计|接入真实/);
    expect(accountFallback).toContain("模拟账号已读取");
    expect(accountFallback).toContain("仓库 496 / 600");
    expect(accountFallback).toContain("最近 10 场已读取");
  });

  it("keeps the prototype home fallback account cards concrete instead of future placeholders", () => {
    const copy = read("packages/ui/src/i18n/copy.ts");

    expect(copy).toContain('weeklyFixedMeta: "本周固定关注位');
    expect(copy).toContain('vaultReady: "仓库 496 / 600');
    expect(copy).toContain('vaultReadyBadge: "496 / 600"');
    expect(copy).not.toContain('weeklyFixedMeta: "账号进度待接入前');
    expect(copy).not.toContain('vaultReady: "仓库数量和溢出提醒后续接真实统计。');
    expect(copy).not.toContain('vaultReadyBadge: "待统计"');
  });

  it("closes Bug #26 after restoring release and packaging script Chinese text", () => {
    const todo = read("docs/todo.md");
    const releaseNotes = read("scripts/generate-release-notes.mjs");
    const localPackage = read("scripts/local-package.ps1");

    expect(todo).toContain("✅ 已修复 | Bug #26");
    expect(releaseNotes).toContain("Windows x64 安装器");
    expect(releaseNotes).toContain("自动更新相关发布资产");
    expect(localPackage).toContain("本地一键打包脚本");
    expect(localPackage).toContain("打包完成");
  });
});
