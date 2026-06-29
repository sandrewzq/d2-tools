import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

function readRendererTsxFiles(dir: string): Array<{ path: string; content: string }> {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return readRendererTsxFiles(fullPath);
    if (!entry.isFile() || !entry.name.endsWith(".tsx")) return [];
    return [{ path: fullPath, content: readFileSync(fullPath, "utf8") }];
  });
}

function readCssRule(styles: string, selector: string): string {
  const start = styles.indexOf(`${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = styles.indexOf("}", start);
  expect(end).toBeGreaterThan(start);
  return styles.slice(start, end + 1);
}

describe("UI style system", () => {
  it("defines shared visual tokens before page-level polish", () => {
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");

    expect(styles).toContain("--space-8: 8px");
    expect(styles).toContain("--space-12: 12px");
    expect(styles).toContain("--space-16: 16px");
    expect(styles).toContain("--space-24: 24px");
    expect(styles).toContain("--space-32: 32px");
    expect(styles).toContain("--radius-control: 8px");
    expect(styles).toContain("--radius-panel: 12px");
    expect(styles).toContain("--radius-pill: 999px");
    expect(styles).toContain("--surface-page:");
    expect(styles).toContain("--surface-panel:");
    expect(styles).toContain("--surface-interactive:");
    expect(styles).toContain("--text-title:");
    expect(styles).toContain("--text-body:");
    expect(styles).toContain("--text-muted:");
  });

  it("locks the C1 global visual upgrade into shell, controls and shared surfaces", () => {
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");
    const shellLayout = readFileSync(
      join(desktopRoot, "src", "renderer", "components", "ShellLayout.tsx"),
      "utf8"
    );

    expect(shellLayout).toContain("shell-titlebar");
    expect(shellLayout).toContain("shell-workspace");
    expect(shellLayout).toContain("shell-current-page");
    expect(shellLayout).toContain("shell-status-strip");
    expect(styles).toContain("--surface-sidebar:");
    expect(styles).toContain("--surface-elevated:");
    expect(styles).toContain("--surface-toolbar:");
    expect(styles).toContain("--accent-primary:");
    expect(styles).toContain("--accent-primary-strong:");
    expect(styles).toContain("--shadow-panel:");
    expect(styles).toContain("--shadow-focus:");

    expect(styles).toMatch(/\.app-shell\s*{[\s\S]*?background:\s*var\(--surface-page\);/);
    expect(styles).toMatch(/\.shell-titlebar\s*{[\s\S]*?height:\s*44px;/);
    expect(styles).toMatch(/\.shell-sidebar\s*{[\s\S]*?width:\s*88px;/);
    expect(styles).toMatch(/\.shell-content\s*{[\s\S]*?background:\s*var\(--surface-page\);/);
    expect(styles).toMatch(/\.global-assistant-panel\s*{[\s\S]*?background:\s*var\(--surface-sidebar\);/);
    expect(styles).toMatch(/\.shell-nav button\.active,[\s\S]*?\.global-assistant-rail button\.active\s*{[\s\S]*?box-shadow:\s*inset 3px 0 0 var\(--accent-primary\)/);

    expect(styles).toMatch(/button:focus-visible,[\s\S]*?input:focus-visible,[\s\S]*?select:focus-visible,[\s\S]*?textarea:focus-visible\s*{[\s\S]*?box-shadow:\s*var\(--shadow-focus\);/);
    expect(styles).toMatch(/\.tool-panel\s*{[\s\S]*?box-shadow:\s*var\(--shadow-panel\);/);
    expect(styles).toMatch(/\.ui-filter-toolbar\s*{[\s\S]*?background:\s*var\(--surface-toolbar\);/);
    expect(styles).toMatch(/\.ui-item-card:hover,[\s\S]*?\.vault-item-card:hover\s*{[\s\S]*?background:\s*var\(--surface-elevated\);/);
    expect(styles).toMatch(/\.home-dashboard-panel,[\s\S]*?\.account-dashboard-panel,[\s\S]*?\.vault-dashboard-panel,[\s\S]*?\.item-tool-panel\s*{[\s\S]*?background:\s*var\(--surface-elevated\);/);
  });

  it("polishes desktop shell details from the latest visual review", () => {
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");
    const mainProcess = readFileSync(join(desktopRoot, "src", "main", "main.ts"), "utf8");
    const homeDashboard = readFileSync(join(desktopRoot, "src", "renderer", "features", "home", "HomeDashboard.tsx"), "utf8");
    const aiPanel = readFileSync(join(desktopRoot, "src", "renderer", "components", "AiAnalysisPanel.tsx"), "utf8");

    expect(mainProcess).toContain('titleBarStyle: "hidden"');
    expect(mainProcess).toContain("titleBarOverlay");
    expect(styles).toMatch(/\.shell-titlebar\s*{[\s\S]*?-webkit-app-region:\s*drag;/);
    expect(styles).toMatch(/\.shell-titlebar button,[\s\S]*?\.global-shell-status-item\s*{[\s\S]*?-webkit-app-region:\s*no-drag;/);

    expect(homeDashboard).not.toContain("常用入口");
    expect(homeDashboard).not.toContain("quick-actions");
    expect(styles).toMatch(/\.daily-source-matrix-grid\s*{[\s\S]*?grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/);
    expect(styles).toMatch(/@media \(max-width:\s*1280px\)\s*{[\s\S]*?\.daily-source-matrix-grid\s*{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
    expect(styles).toMatch(/\.daily-source-matrix-item\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);/);
    expect(styles).toMatch(/\.source-status-badge\s*{[\s\S]*?white-space:\s*nowrap;/);

    expect(styles).toMatch(/\.global-assistant-sidebar\s*{[\s\S]*?height:\s*100%;/);
    expect(styles).not.toMatch(/\.global-assistant-sidebar\s*{[\s\S]*?height:\s*100vh;/);
    expect(aiPanel).toContain("ai-history-session-row");
    expect(styles).toMatch(/\.ai-history-session-row\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);/);
    expect(styles).toMatch(/\.ai-chat-history \.button-row\s*{[\s\S]*?justify-content:\s*flex-start;/);

    expect(styles).toMatch(/\.account-page-shell\s*{[\s\S]*?grid-template-columns:\s*160px\s*minmax\(0,\s*1fr\);/);
    expect(styles).toMatch(/\.vault-tag-current\.tag-none\s*{[\s\S]*?opacity:\s*0\.62;/);
  });

  it("keeps shell scrolling scoped to workspace panes with fixed titlebar", () => {
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");

    expect(styles).toMatch(/body\s*{[\s\S]*?overflow:\s*hidden;/);
    expect(styles).toMatch(/\.app-shell\s*{[\s\S]*?height:\s*100vh;/);
    expect(styles).toMatch(/\.app-shell\s*{[\s\S]*?overflow:\s*hidden;/);
    expect(styles).toMatch(/\.shell-titlebar\s*{[\s\S]*?position:\s*sticky;/);
    expect(styles).toMatch(/\.shell-titlebar\s*{[\s\S]*?top:\s*0;/);
    expect(styles).toMatch(/\.shell-workspace\s*{[\s\S]*?height:\s*calc\(100vh - 44px\);/);
    expect(styles).toMatch(/\.shell-workspace\s*{[\s\S]*?overflow:\s*hidden;/);
    expect(styles).toMatch(/\.shell-content\s*{[\s\S]*?overflow-y:\s*auto;/);
    expect(styles).toMatch(/\.shell-content\s*{[\s\S]*?scrollbar-gutter:\s*stable;/);
    expect(styles).toMatch(/\.global-assistant-panel\s*{[\s\S]*?position:\s*relative;/);
    expect(styles).toMatch(/\.global-assistant-panel\s*{[\s\S]*?height:\s*100%;/);
    expect(styles).toMatch(/\.shell-scroll-area,[\s\S]*?\.ai-context-drawer\s*{[\s\S]*?scrollbar-width:\s*thin;/);
    expect(styles).toMatch(/\.shell-scroll-area::-webkit-scrollbar-thumb,[\s\S]*?\.ai-context-drawer::-webkit-scrollbar-thumb\s*{[\s\S]*?border-radius:\s*999px;/);
  });

  it("keeps dense item surfaces responsive by avoiding animated shadows and movement", () => {
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");
    const vaultItemCard = readCssRule(styles, ".vault-item-card");
    const vaultListItem = readCssRule(styles, ".vault-list-item");
    const equipmentItem = readCssRule(styles, ".equipment-item");
    const sharedHover = readCssRule(styles, ".ui-item-card:hover,\n.vault-item-card:hover");
    const vaultListHover = readCssRule(styles, ".vault-list-item:hover");
    const equipmentHover = readCssRule(styles, ".equipment-item:hover,\n.vault-item:hover");
    const denseItemOverride = readCssRule(styles, ".vault-dashboard-panel .vault-item-card,\n.vault-dashboard-panel .vault-list-item,\n.vault-dashboard-panel .equipment-item,\n.vault-dashboard-panel .vault-item");
    const denseButtonOverride = readCssRule(styles, ".vault-dashboard-panel button,\n.vault-dashboard-panel .secondary-button,\n.vault-card-actions button,\n.vault-tag-actions button,\n.vault-organize-bar button,\n.vault-batch-panel button,\n.vault-content-tab");
    const selectedVaultItemCard = readCssRule(styles, ".vault-item-card.selected");

    expect(vaultItemCard).not.toContain("box-shadow 120ms");
    expect(vaultListItem).not.toContain("box-shadow 120ms");
    expect(equipmentItem).not.toContain("box-shadow 120ms");
    expect(sharedHover).not.toContain("transform:");
    expect(vaultListHover).not.toContain("transform:");
    expect(equipmentHover).not.toContain("box-shadow:");
    expect(denseItemOverride).toContain("transition: none");
    expect(denseItemOverride).toContain("box-shadow: none");
    expect(denseItemOverride).toContain("filter: none");
    expect(denseButtonOverride).toContain("transition: none");
    expect(denseButtonOverride).toContain("box-shadow: none");
    expect(denseButtonOverride).toContain("filter: none");
    expect(selectedVaultItemCard).not.toContain("box-shadow:");
    expect(styles).toContain("--shadow-panel: 0 8px 20px");
  });

  it("starts settings page migration with a two-column desktop tool layout", () => {
    const settingsPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "SettingsPage.tsx"), "utf8");
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");

    expect(settingsPage).toContain('className="settings-page"');
    expect(settingsPage).toContain('className="settings-nav"');
    expect(settingsPage).toContain('className="settings-main"');
    expect(settingsPage).toContain('className="status-message status-ready"');
    expect(settingsPage).toContain('className="status-message status-error"');
    expect(styles).toContain(".settings-page");
    expect(styles).toContain(".settings-nav");
    expect(styles).toContain(".settings-main");
    expect(styles).toContain(".status-message");
    expect(styles).toContain(".status-message.status-ready");
    expect(styles).toContain(".status-message.status-error");
  });

  it("finishes the next UI refactor slices with shared panel, status, list, badge and filter styles", () => {
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");
    const settingsPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "SettingsPage.tsx"), "utf8");
    const homeDashboard = readFileSync(join(desktopRoot, "src", "renderer", "features", "home", "HomeDashboard.tsx"), "utf8");
    const dailyPanel = readFileSync(join(desktopRoot, "src", "renderer", "shared", "components", "DailySummaryPanel.tsx"), "utf8");
    const accountPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"), "utf8");
    const vaultPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultPage.tsx"), "utf8");
    const vaultPanel = readFileSync(join(desktopRoot, "src", "renderer", "components", "VaultPanel.tsx"), "utf8");
    const vaultToolbar = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultFilterToolbar.tsx"), "utf8");
    const vaultSections = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultItemSections.tsx"), "utf8");
    const itemDetailTools = readFileSync(join(desktopRoot, "src", "renderer", "shared", "components", "item-detail", "ItemDetailTools.tsx"), "utf8");

    expect(styles).toContain(".panel-subsection");
    expect(styles).toContain(".ui-list-row");
    expect(styles).toContain(".ui-badge");
    expect(styles).toContain(".ui-filter-toolbar");
    expect(styles).toContain(".ui-item-card");
    expect(styles).toContain(".home-dashboard-panel");
    expect(styles).toContain(".account-dashboard-panel");
    expect(styles).toContain(".vault-dashboard-panel");
    expect(styles).toContain(".item-tool-panel");

    expect(settingsPage).toContain("panel-subsection settings-subsection");
    expect(settingsPage).toContain("ui-list-row diagnostic-row");
    expect(settingsPage).toContain("ui-list-row action-log-row");

    expect(homeDashboard).toContain("status-message status-error");
    expect(dailyPanel).toContain("home-dashboard-panel");
    expect(dailyPanel).toContain("status-message status-error");
    expect(dailyPanel).toContain("status-message status-ready");

    expect(accountPage).toContain("account-dashboard-panel");
    expect(accountPage).toContain("status-message status-error");
    expect(accountPage).toContain("status-message status-warning");
    expect(accountPage).toContain("status-message status-ready");

    expect(vaultPage).toContain("vault-dashboard-panel");
    expect(vaultPage).toContain("status-message status-error");
    expect(vaultPanel).toContain("vault-dashboard-panel");
    expect(vaultPanel).toContain("status-message status-ready");
    expect(vaultSections).toContain("status-message status-neutral");

    expect(vaultToolbar).toContain("ui-filter-toolbar vault-toolbar");
    expect(vaultToolbar).toContain("ui-filter-toolbar");
    expect(itemDetailTools).toContain("item-tool-panel");
    expect(itemDetailTools).toContain("ui-badge");
  });

  it("uses the shared status message language instead of legacy notice and error classes", () => {
    const rendererFiles = readRendererTsxFiles(join(desktopRoot, "src", "renderer"));
    const legacyStatusUsages = rendererFiles
      .flatMap((file) => {
        const matches = [...file.content.matchAll(/className=(?:"(?:notice|error)"|\{[^}\n]*(?:"notice"|"error")[^}\n]*\})/g)];
        return matches.map((match) => `${file.path}: ${match[0]}`);
      });

    expect(legacyStatusUsages).toEqual([]);
  });
});
