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
    const loadoutsView = read("packages/ui/src/loadouts/LoadoutsPageView.tsx");
    const libraryView = read("packages/ui/src/library/LibraryPageView.tsx");
    const loadoutsContent = read("packages/ui/src/loadouts/LoadoutsPageContentView.tsx");
    const libraryContent = read("packages/ui/src/library/LibraryPageContentView.tsx");
    const vaultPage = read("packages/desktop/src/renderer/features/vault/VaultPage.tsx");
    const loadoutsPage = read("packages/desktop/src/renderer/features/loadouts/LoadoutsPage.tsx");
    const libraryPage = read("packages/desktop/src/renderer/features/library/LibraryPage.tsx");

    expect(uiIndex).toContain("VaultPageView");
    expect(uiIndex).toContain("LoadoutsPageView");
    expect(uiIndex).toContain("LibraryPageView");

    expect(vaultView).toContain("export function VaultPageView");
    expect(loadoutsView).toContain("export function LoadoutsPageView");
    expect(libraryView).toContain("export function LibraryPageView");
    expect(loadoutsContent).toContain("<LoadoutsPageView");
    expect(libraryContent).toContain("<LibraryPageView");

    expect(vaultPage).toContain("<VaultPageView");
    expect(loadoutsPage).toContain("<LoadoutsPageContentView");
    expect(libraryPage).toContain("<LibraryPageContentView");

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
    expect(types).toContain("account: AccountCopy");
    expect(types).toContain("settings: SettingsCopy");
    expect(copy).toContain("Vault");
    expect(copy).toContain("Loadouts");
    expect(copy).toContain("Library");
    expect(copy).toContain("Account");
    expect(copy).toContain("Settings");
    expect(copy).toContain("仓库");
    expect(copy).toContain("本地方案库");
    expect(copy).toContain("资料库搜索");
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

    expect(prototypeMain).toContain("VaultPageView");
    expect(prototypeMain).toContain("LoadoutsPageContentView");
    expect(prototypeMain).toContain("LibraryPageContentView");
    expect(prototypeMain).toContain('activePage === "vault"');
    expect(prototypeMain).toContain('activePage === "loadouts"');
    expect(prototypeMain).toContain('activePage === "library"');
    expect(prototypeMain).toContain("interfaceLocale={preferences.interfaceLocale}");
    expect(prototypeMain).not.toContain("这个页面会在后续阶段接入共享 View。");
    expect(prototypeMain).not.toContain('activePage !== "home" && activePage !== "account" && activePage !== "settings"');

    expect(uiStyles).toContain(".vault-product-layout");
    expect(uiStyles).toContain(".loadout-product-layout");
    expect(uiStyles).toContain(".library-product-layout");
    expect(uiStyles).toContain(".item-result");
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

  it("replaces the prototype AI drawer placeholder with an interactive mock assistant", () => {
    const prototypeMain = read("packages/prototype/src/main.tsx");
    const prototypeStyles = read("packages/prototype/src/styles.css");

    expect(prototypeMain).toContain("PrototypeAssistantPanel");
    expect(prototypeMain).toContain("assistant-context-card");
    expect(prototypeMain).toContain("assistant-quick-prompts");
    expect(prototypeMain).toContain("assistant-chat-input");
    expect(prototypeMain).toContain("onSubmit={handleSend}");
    expect(prototypeMain).not.toContain("这是 prototype 的 mock 抽屉");
    expect(prototypeMain).not.toContain("后续接入真实页面上下文");

    expect(prototypeStyles).toContain(".prototype-assistant-panel");
    expect(prototypeStyles).toContain(".assistant-context-card");
    expect(prototypeStyles).toContain(".assistant-chat-message");
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
