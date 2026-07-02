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
    expect(copy).toContain("Vault");
    expect(copy).toContain("Loadouts");
    expect(copy).toContain("Library");
    expect(copy).toContain("仓库");
    expect(copy).toContain("本地方案库");
    expect(copy).toContain("资料库搜索");
  });

  it("adds web adapter endpoints beyond the home fallback snapshot", () => {
    const adapter = read("packages/web/src/webAdapter.ts");

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
