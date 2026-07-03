import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));
const uiRoot = join(desktopRoot, "..", "ui");

function readRendererTsxFiles(dir: string): Array<{ path: string; content: string }> {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return readRendererTsxFiles(fullPath);
    if (!entry.isFile() || !entry.name.endsWith(".tsx")) return [];
    return [{ path: fullPath, content: readFileSync(fullPath, "utf8") }];
  });
}

function readProductStyles(): string {
  return readFileSync(join(uiRoot, "src", "styles.css"), "utf8");
}

function readDesktopPlatformStyles(): string {
  return readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");
}

function readCssRule(styles: string, selector: string): string {
  const needle = selector.includes("\n") ? `${selector} {` : `\n${selector} {`;
  let start = styles.indexOf(needle);
  if (start >= 0 && !selector.includes("\n")) {
    start += 1;
  } else if (start < 0 && styles.startsWith(`${selector} {`)) {
    start = 0;
  }
  expect(start).toBeGreaterThanOrEqual(0);
  const end = styles.indexOf("}", start);
  expect(end).toBeGreaterThan(start);
  return styles.slice(start, end + 1);
}

describe("UI style system", () => {
  it("defines shared visual tokens before page-level polish", () => {
    const styles = readProductStyles();

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
    expect(styles).toContain("--scrollbar-track:");
    expect(styles).toContain("--scrollbar-thumb:");
    expect(styles).toContain("--scrollbar-thumb-hover:");
    expect(styles).toContain("--field-bg:");
    expect(styles).toContain("--field-bg-hover:");
    expect(styles).toContain("--chip-bg:");
    expect(styles).toContain("--chip-border:");
    expect(styles).toContain("--item-bg:");
    expect(styles).toContain("--item-bg-hover:");
    expect(styles).toContain("--drawer-surface:");
    expect(styles).toContain("--drawer-border:");
    expect(styles).toContain("--drawer-message-user-bg:");
    expect(styles).toContain("--drawer-message-assistant-bg:");
    expect(styles).toContain("--game-surface:");
    expect(styles).toContain("--game-text:");
  });

  it("keeps Desktop renderer CSS platform-only while product styles live in packages/ui", () => {
    const desktopEntry = readFileSync(join(desktopRoot, "src", "renderer", "main.tsx"), "utf8");
    const desktopStyles = readDesktopPlatformStyles();
    const productStyles = readProductStyles();

    expect(desktopEntry).toContain('import "@d2-tools/ui/styles.css"');
    expect(desktopStyles).toContain("Electron-only platform adjustments");
    expect(desktopStyles).not.toContain(".shell-titlebar");
    expect(desktopStyles).not.toContain(".home-app-page");
    expect(desktopStyles).not.toContain(".settings-app-page");
    expect(desktopStyles).not.toContain("--surface-page:");
    expect(productStyles).toContain(".shell-titlebar");
    expect(productStyles).toContain(".home-app-page");
    expect(productStyles).toContain(".settings-app-page");
    expect(productStyles).toContain("Canonical product token surface rules");
  });

  it("unifies button and selected-state tokens so active surfaces stay readable", () => {
    const styles = readProductStyles();
    const sharedStyles = readFileSync(join(uiRoot, "src", "styles.css"), "utf8");
    const buttonRule = readCssRule(styles, "button");
    const primaryButtonRule = readCssRule(styles, ".primary-button");
    const secondaryButtonRule = readCssRule(styles, ".secondary-button");
    const selectedVaultItemCard = readCssRule(styles, ".vault-item-card.selected");
    const sharedAppMarkRule = readCssRule(sharedStyles, ".shell-app-mark");
    const sharedNavActiveRule = readCssRule(sharedStyles, ".shell-nav button.active,\n.global-assistant-rail button.active");
    const sharedToolActiveRule = readCssRule(sharedStyles, ".shell-tool-button:hover,\n.shell-tool-button.active");

    expect(styles).toContain("--action-primary-bg:");
    expect(styles).toContain("--action-primary-bg-hover:");
    expect(styles).toContain("--action-secondary-bg:");
    expect(styles).toContain("--action-secondary-bg-hover:");
    expect(styles).toContain("--state-selected-bg:");
    expect(styles).toContain("--state-selected-border:");
    expect(styles).toContain("--text-on-accent:");
    expect(styles).not.toContain("--state-selected-rail:");
    expect(styles).not.toContain("inset 3px 0 0");
    expect(styles).not.toContain("border-left: 3px");

    expect(buttonRule).toContain("color: var(--text-body)");
    expect(buttonRule).toContain("background: var(--action-secondary-bg)");
    expect(buttonRule).not.toContain("#93d5ff");
    expect(primaryButtonRule).toContain("color: var(--text-on-accent)");
    expect(primaryButtonRule).toContain("background: var(--action-primary-bg)");
    expect(secondaryButtonRule).toContain("background: var(--action-secondary-bg)");

    expect(styles).toMatch(/\.shell-nav button\.active,[\s\S]*?\.global-assistant-rail button\.active\s*{[\s\S]*?background:\s*var\(--state-selected-bg\);/);
    expect(styles).toMatch(/\.settings-nav a:hover,[\s\S]*?\.account-page-nav a:focus-visible\s*{[\s\S]*?background:\s*var\(--state-selected-bg\);/);
    expect(styles).toMatch(/\.character-tab\.active\s*{[\s\S]*?background:\s*var\(--state-selected-bg\);/);
    expect(styles).toMatch(/\.vault-workflow-tab:hover,[\s\S]*?\.vault-workflow-tab\.active\s*{[\s\S]*?background:\s*var\(--state-selected-bg\);/);
    expect(styles).toMatch(/\.segmented-control button\.active\s*{[\s\S]*?color:\s*var\(--text-title\);[\s\S]*?background:\s*var\(--state-selected-bg\);/);
    expect(selectedVaultItemCard).toContain("background: var(--state-selected-bg)");
    expect(selectedVaultItemCard).toContain("border-color: var(--state-selected-border)");

    expect(sharedAppMarkRule).toContain("border: 1px solid var(--state-selected-border)");
    expect(sharedAppMarkRule).toContain("color: var(--accent-primary-strong)");
    expect(sharedAppMarkRule).toContain("background: var(--state-selected-bg)");
    expect(sharedNavActiveRule).toContain("border-color: var(--state-selected-border)");
    expect(sharedNavActiveRule).toContain("color: var(--accent-primary-strong)");
    expect(sharedNavActiveRule).toContain("background: var(--state-selected-bg)");
    expect(sharedToolActiveRule).toContain("border-color: var(--state-selected-border)");
    expect(sharedToolActiveRule).toContain("color: var(--accent-primary-strong)");
    expect(sharedToolActiveRule).toContain("background: var(--state-selected-bg)");
    expect(sharedAppMarkRule).not.toContain("#07518c");
    expect(sharedNavActiveRule).not.toContain("#e6f1fb");
    expect(sharedToolActiveRule).not.toContain("#e6f1fb");
  });

  it("keeps migrated product surfaces readable through canonical semantic tokens", () => {
    const styles = readProductStyles();

    const requiredSelectors = [
      ".home-overview-hero",
      ".daily-reset-grid > div",
      ".daily-source",
      ".source-status-card",
      ".drop-query-panel",
      ".diagnostic-row",
      ".action-log-row",
      ".equipment-item strong",
      ".equipment-item span",
      ".weapon-filter-panel",
      ".armor-filter-panel",
      ".vault-card-select",
      ".loadout-compare-row"
    ];

    for (const selector of requiredSelectors) {
      expect(styles).toContain(selector);
    }

    const canonicalBlock = styles.slice(
      styles.indexOf("/* Canonical product token surface rules. Shared by Prototype, Web and Desktop. */"),
      styles.indexOf("/* End canonical product token surface rules */")
    );
    expect(canonicalBlock).toContain("background: var(--surface-panel)");
    expect(canonicalBlock).toContain("color: var(--text-title)");
    expect(canonicalBlock).toContain("color: var(--text-muted)");
    expect(canonicalBlock).not.toContain("#f3f6fc");
    expect(canonicalBlock).not.toContain("#181d27");
    expect(canonicalBlock).not.toContain("#141924");
    expect(styles).not.toContain("Light mode legacy surface compatibility");
    expect(styles).not.toContain(".app-shell[data-color-mode=\"light\"] .daily-source");
  });

  it("blocks direct light background declarations outside semantic tokens", () => {
    const styles = readProductStyles();
    const offenders = styles
      .split(/\r?\n/)
      .map((line, index) => ({ line: index + 1, text: line.trim() }))
      .filter((entry) => /background(?:-color)?:\s*(?:#fff(?:fff)?|#f8fafc|rgb\(255|rgb\(255 255|white)\b/i.test(entry.text));

    expect(offenders).toEqual([]);
  });

  it("keeps light-mode controls and success states readable with semantic tokens", () => {
    const styles = readProductStyles();
    const selectRule = readCssRule(styles, "select");
    const selectHoverRule = readCssRule(styles, "select:hover");
    const compactFieldRule = readCssRule(styles, ".compact-field");
    const switchRowRule = readCssRule(styles, ".switch-row");
    const statusReadyRule = readCssRule(styles, ".status-message.status-ready");
    const badgeReadyRule = readCssRule(styles, ".ui-badge.status-ready");

    expect(selectRule).toContain("border-color: var(--field-border)");
    expect(selectRule).toContain("background-color: var(--field-bg)");
    expect(selectRule).toContain("color: var(--text-title)");
    expect(selectHoverRule).toContain("background-color: var(--field-bg-hover)");
    expect(selectHoverRule).not.toContain("#151d28");
    expect(compactFieldRule).toContain("color: var(--text-body)");
    expect(switchRowRule).toContain("color: var(--text-body)");
    expect(switchRowRule).toContain("accent-color: var(--accent-primary)");
    expect(statusReadyRule).toContain("color: var(--status-ready)");
    expect(statusReadyRule).toContain("background: var(--status-ready-bg)");
    expect(statusReadyRule).not.toContain("#b8f3c7");
    expect(badgeReadyRule).toContain("color: var(--status-ready)");
    expect(badgeReadyRule).toContain("background: var(--status-ready-bg)");
    expect(badgeReadyRule).not.toContain("#b8f3c7");
  });

  it("locks the C1 global visual upgrade into shell, controls and shared surfaces", () => {
    const styles = readProductStyles();
    const shellLayout = readFileSync(
      join(uiRoot, "src", "shell", "AppShell.tsx"),
      "utf8"
    );
    const shellNavActiveRule = readCssRule(
      styles,
      ".shell-nav button.active,\n.global-assistant-rail button.active"
    );

    expect(shellLayout).toContain("shell-titlebar");
    expect(shellLayout).toContain("shell-workspace");
    expect(shellLayout).toContain("shell-status-strip");
    expect(shellLayout).toContain("shell-status-group");
    expect(shellLayout).toContain("shell-tool-button");
    expect(shellLayout).toContain("shell-window-controls");
    expect(shellLayout).not.toContain("shell-current-page");
    expect(styles).toContain("--surface-sidebar:");
    expect(styles).toContain("--surface-elevated:");
    expect(styles).toContain("--surface-toolbar:");
    expect(styles).toContain("--accent-primary:");
    expect(styles).toContain("--accent-primary-strong:");
    expect(styles).toContain("--shadow-panel:");
    expect(styles).toContain("--shadow-focus:");

    expect(styles).toMatch(/\.app-shell\s*{[\s\S]*?background:\s*var\(--surface-page\);/);
    expect(styles).toMatch(/\.shell-titlebar\s*{[\s\S]*?height:\s*48px;/);
    expect(styles).toMatch(/\.shell-sidebar\s*{[\s\S]*?width:\s*88px;/);
    expect(styles).toMatch(/\.shell-content\s*{[\s\S]*?background:\s*var\(--surface-page\);/);
    expect(styles).toMatch(/\.global-assistant-panel\s*{[\s\S]*?background:\s*var\(--drawer-surface\);/);
    expect(shellNavActiveRule).toContain("background: var(--state-selected-bg)");
    expect(shellNavActiveRule).not.toContain("inset 3px 0 0");

    expect(styles).toMatch(/button:focus-visible,[\s\S]*?input:focus-visible,[\s\S]*?select:focus-visible,[\s\S]*?textarea:focus-visible\s*{[\s\S]*?box-shadow:\s*var\(--shadow-focus\);/);
    expect(styles).toMatch(/\.tool-panel\s*{[\s\S]*?box-shadow:\s*var\(--shadow-panel\);/);
    expect(styles).toMatch(/\.ui-filter-toolbar\s*{[\s\S]*?background:\s*var\(--surface-toolbar\);/);
    expect(styles).toMatch(/\.ui-item-card:hover,[\s\S]*?\.vault-item-card:hover\s*{[\s\S]*?background:\s*var\(--surface-elevated\);/);
    expect(styles).toMatch(/\.home-dashboard-panel,[\s\S]*?\.account-dashboard-panel,[\s\S]*?\.vault-dashboard-panel,[\s\S]*?\.item-tool-panel\s*{[\s\S]*?background:\s*var\(--surface-elevated\);/);
  });

  it("polishes desktop shell details from the latest visual review", () => {
    const styles = readProductStyles();
    const mainProcess = readFileSync(join(desktopRoot, "src", "main", "main.ts"), "utf8");
    const homeDashboard = readFileSync(join(desktopRoot, "src", "renderer", "features", "home", "HomeDashboard.tsx"), "utf8");
    const aiPanel = readFileSync(join(desktopRoot, "src", "renderer", "components", "AiAnalysisPanel.tsx"), "utf8");
    const aiAssistantView = readFileSync(join(uiRoot, "src", "assistant", "AiAssistantPanelView.tsx"), "utf8");

    expect(mainProcess).toContain('titleBarStyle: "hidden"');
    expect(mainProcess).not.toContain("titleBarOverlay");
    expect(styles).toMatch(/\.shell-titlebar\s*{[\s\S]*?-webkit-app-region:\s*drag;/);
    expect(styles).toMatch(/\.shell-titlebar button,[\s\S]*?\.shell-status-group\s*{[\s\S]*?-webkit-app-region:\s*no-drag;/);

    expect(homeDashboard).not.toContain("常用入口");
    expect(homeDashboard).not.toContain("quick-actions");
    expect(styles).toMatch(/\.daily-source-matrix-grid\s*{[\s\S]*?grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/);
    expect(styles).toMatch(/@media \(max-width:\s*1280px\)\s*{[\s\S]*?\.daily-source-matrix-grid\s*{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
    expect(styles).toMatch(/\.daily-source-matrix-item\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);/);
    expect(styles).toMatch(/\.source-status-badge\s*{[\s\S]*?white-space:\s*nowrap;/);

    expect(styles).toMatch(/\.global-assistant-sidebar\s*{[\s\S]*?height:\s*100%;/);
    expect(styles).not.toMatch(/\.global-assistant-sidebar\s*{[\s\S]*?height:\s*100vh;/);
    expect(aiPanel).toContain("AiAssistantPanelView");
    expect(aiAssistantView).toContain("ai-history-session-row");
    expect(styles).toMatch(/\.ai-history-session-row\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);/);
    expect(styles).toMatch(/\.ai-chat-history \.button-row\s*{[\s\S]*?justify-content:\s*flex-start;/);

    expect(styles).toMatch(/\.account-page-shell\s*{[\s\S]*?grid-template-columns:\s*160px\s*minmax\(0,\s*1fr\);/);
    expect(styles).toMatch(/\.vault-tag-current\.tag-none\s*{[\s\S]*?opacity:\s*0\.62;/);
  });

  it("keeps shell scrolling scoped to workspace panes with fixed titlebar", () => {
    const styles = readProductStyles();
    const shellScrollbarRule = readCssRule(
      styles,
      ".shell-scroll-area,\n.shell-content,\n.ai-conversation-log,\n.ai-session-drawer,\n.ai-context-drawer"
    );
    const shellScrollbarTrackRule = readCssRule(
      styles,
      ".shell-scroll-area::-webkit-scrollbar-track,\n.shell-content::-webkit-scrollbar-track,\n.ai-conversation-log::-webkit-scrollbar-track,\n.ai-session-drawer::-webkit-scrollbar-track,\n.ai-context-drawer::-webkit-scrollbar-track"
    );
    const shellScrollbarThumbRule = readCssRule(
      styles,
      ".shell-scroll-area::-webkit-scrollbar-thumb,\n.shell-content::-webkit-scrollbar-thumb,\n.ai-conversation-log::-webkit-scrollbar-thumb,\n.ai-session-drawer::-webkit-scrollbar-thumb,\n.ai-context-drawer::-webkit-scrollbar-thumb"
    );
    const itemModalRule = readCssRule(styles, ".item-modal");

    expect(styles).toMatch(/body\s*{[\s\S]*?overflow:\s*hidden;/);
    expect(styles).toMatch(/\.app-shell\s*{[\s\S]*?height:\s*100vh;/);
    expect(styles).toMatch(/\.app-shell\s*{[\s\S]*?overflow:\s*hidden;/);
    expect(styles).toMatch(/\.shell-titlebar\s*{[\s\S]*?position:\s*sticky;/);
    expect(styles).toMatch(/\.shell-titlebar\s*{[\s\S]*?top:\s*0;/);
    expect(styles).toMatch(/\.shell-workspace\s*{[\s\S]*?height:\s*calc\(100vh - 48px\);/);
    expect(styles).toMatch(/\.shell-workspace\s*{[\s\S]*?overflow:\s*hidden;/);
    expect(styles).toMatch(/\.shell-content\s*{[\s\S]*?overflow-y:\s*auto;/);
    expect(styles).toMatch(/\.shell-content\s*{[\s\S]*?scrollbar-gutter:\s*stable;/);
    expect(styles).toMatch(/\.global-assistant-panel\s*{[\s\S]*?position:\s*relative;/);
    expect(styles).toMatch(/\.global-assistant-panel\s*{[\s\S]*?height:\s*100%;/);
    expect(styles).toMatch(/\.shell-scroll-area,[\s\S]*?\.ai-context-drawer\s*{[\s\S]*?scrollbar-width:\s*thin;/);
    expect(styles).toMatch(/\.shell-scroll-area::-webkit-scrollbar-thumb,[\s\S]*?\.ai-context-drawer::-webkit-scrollbar-thumb\s*{[\s\S]*?border-radius:\s*999px;/);
    expect(shellScrollbarRule).toContain("scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track)");
    expect(shellScrollbarTrackRule).toContain("background: var(--scrollbar-track)");
    expect(shellScrollbarThumbRule).toContain("border: 2px solid var(--scrollbar-track)");
    expect(shellScrollbarThumbRule).toContain("background: var(--scrollbar-thumb)");
    expect(itemModalRule).toContain("scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track)");
    expect(styles).not.toContain("scrollbar-color: #40536c #0f141c");
  });

  it("keeps the AI drawer and main workspace as separate scroll panes", () => {
    const styles = readProductStyles();
    const shellLayout = readFileSync(
      join(uiRoot, "src", "shell", "AppShell.tsx"),
      "utf8"
    );
    const assistantWorkspaceRule = readCssRule(styles, ".app-shell.assistant-open .shell-workspace");
    const shellContentRule = readCssRule(styles, ".shell-content");
    const assistantPanelRule = readCssRule(styles, ".global-assistant-panel");
    const assistantSidebarRule = readCssRule(styles, ".global-assistant-sidebar");
    const assistantDrawerRule = readCssRule(styles, ".global-assistant-drawer");
    const darkModeRule = readCssRule(styles, ".app-shell[data-color-mode=\"dark\"]");
    const assistantMessageRule = readCssRule(styles, ".ai-chat-message");

    expect(shellLayout).toContain('<aside className="global-assistant-panel global-assistant-drawer"');
    expect(shellLayout).not.toContain("global-assistant-backdrop");
    expect(assistantWorkspaceRule).toContain("grid-template-columns: 88px minmax(0, 1fr) minmax(360px, 420px)");
    expect(shellContentRule).toContain("overflow-y: auto");
    expect(shellContentRule).toContain("scrollbar-gutter: stable");
    expect(assistantPanelRule).toContain("position: relative");
    expect(assistantPanelRule).toContain("overflow: hidden");
    expect(assistantPanelRule).toContain("background: var(--drawer-surface)");
    expect(assistantSidebarRule).toContain("overflow-y: auto");
    expect(assistantSidebarRule).toContain("background: var(--drawer-surface)");
    expect(assistantDrawerRule).toContain("background: var(--drawer-surface)");
    expect(darkModeRule).toContain("--drawer-surface: #111720");
    expect(darkModeRule).toContain("--drawer-header-bg: #121821");
    expect(darkModeRule).toContain("--drawer-message-assistant-bg: #171d26");
    expect(assistantMessageRule).toContain("background: var(--drawer-message-assistant-bg)");
    expect(styles).not.toContain(".global-assistant-backdrop");
    expect(assistantDrawerRule).not.toContain("position: fixed");
  });

  it("keeps high-risk product surfaces on shared semantic tokens", () => {
    const styles = readProductStyles();
    const finalBlockStart = styles.indexOf("/* Canonical product token surface rules. Shared by Prototype, Web and Desktop. */");
    const finalBlockEnd = styles.indexOf("/* End canonical product token surface rules */");
    expect(finalBlockStart).toBeGreaterThanOrEqual(0);
    expect(finalBlockEnd).toBeGreaterThan(finalBlockStart);
    const finalBlock = styles.slice(finalBlockStart, finalBlockEnd);

    const requiredSelectors = [
      ".daily-action-list",
      ".weekly-focus-list",
      ".daily-source-items b",
      ".equipment-section-heading h4",
      ".equipment-section-heading span",
      ".account-slot-category-heading h4",
      ".account-slot-category-heading span",
      ".account-slot-heading span",
      ".account-slot-heading strong",
      ".account-slot-source-heading small",
      ".account-slot-source-badge.equipped",
      ".account-slot-source-badge.inventory",
      ".vault-slot-heading h3",
      ".vault-slot-heading span",
      ".vault-card-body strong",
      ".vault-card-body span",
      ".vault-card-meta",
      ".vault-card-roll",
      ".vault-list-item strong",
      ".vault-list-item span",
      ".vault-list-item small",
      ".vault-score-badge",
      ".decision-badge",
      ".vault-card-signals .wishlist-hit span",
      ".vault-card-actions button",
      ".vault-tag-current",
      ".vault-tag-actions button",
      ".weapon-filter-heading strong",
      ".weapon-filter-heading span",
      ".vault-render-limit-message",
      ".material-item strong",
      ".material-item span",
      ".section-heading h2",
      ".section-heading h3",
      ".section-heading p",
      ".library-reference-card",
      ".item-result",
      ".perk-chip",
      ".source-status-card",
      ".source-status-badge",
      ".daily-source-status.status-ready",
      ".daily-source-status.status-pending",
      ".daily-brief",
      ".daily-brief strong",
      ".daily-source-count",
      ".loadout-status-chip",
      ".loadout-compare-row",
      ".loadout-compare-side",
      ".target-match-panel",
      ".target-rule-row",
      ".community-recommendations-panel",
      ".community-recommendations-panel.source-status-pending.loading",
      ".community-recommendations-panel.source-status-neutral.empty",
      ".community-source-badge",
      ".source-status-list",
      ".source-status-badge.source-status-warning",
      ".community-combo",
      ".community-perk",
      ".duplicate-row",
      ".same-roll-row",
      ".assistant-task-editor",
      ".assistant-context-card span",
      ".assistant-task-tree li",
      ".ai-chat-history li span",
      ".config-help",
      ".status-card",
      ".diagnostics-panel",
      ".diagnostic-row",
      ".analysis-section",
      ".score-summary-row span",
      ".action-log-row strong",
      ".action-log-row span",
      ".compact-field",
      ".ai-empty-state strong",
      ".ai-composer-context",
      ".vault-content-tab strong",
      ".vault-content-tab span",
      ".vault-batch-panel span",
      ".vault-cleanup-panel p",
      ".vault-cleanup-locator b",
      ".vault-cleanup-locator small",
      ".vault-armor-filter-heading p",
      ".vault-item span",
      ".vault-score-badge.score-keep",
      ".vault-tag-current.tag-keep",
      ".equipment-item.equipped:hover",
      ".equipment-item.inventory",
      ".compact-items span",
      ".library-community-match",
      ".inline-action.is-pending",
      ".inline-action.is-success",
      ".item-modal",
      ".modal-close",
      ".item-detail-tool-area",
      ".item-detail-tool-tabs span",
      ".item-detail-description",
      ".item-local-tag-header > span",
      ".item-detail-loading",
      ".same-roll-chip",
      ".item-detail-socket-summary",
      ".modal-plug p"
    ];

    for (const selector of requiredSelectors) {
      expect(finalBlock).toContain(selector);
    }

    expect(finalBlock).toContain("color: var(--text-title)");
    expect(finalBlock).toContain("color: var(--text-body)");
    expect(finalBlock).toContain("color: var(--text-muted)");
    expect(finalBlock).toContain("background: var(--item-bg)");
    expect(finalBlock).toContain("background: var(--chip-bg)");
    expect(finalBlock).toContain("background: var(--field-bg)");
    expect(finalBlock).toContain("background: var(--surface-toolbar)");
    expect(finalBlock).toContain("color: var(--chip-text)");
    expect(finalBlock).not.toContain("#f3f6fc");
    expect(finalBlock).not.toContain("#8bd3ff");
    expect(finalBlock).not.toContain("#9da9bc");
    expect(finalBlock).not.toContain("#cbd6e8");
    expect(finalBlock).not.toContain("#ddd9ff");
    expect(finalBlock).not.toContain("#181d27");
    expect(finalBlock).not.toContain("#141924");
    expect(finalBlock).not.toContain("#090b0f");
  });

  it("uses shared self-drawn window controls instead of the native titlebar overlay", () => {
    const mainProcess = readFileSync(join(desktopRoot, "src", "main", "main.ts"), "utf8");
    const ipcRegister = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");
    const windowIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "window.ts"), "utf8");
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const windowApi = readFileSync(join(desktopRoot, "src", "renderer", "api", "windowApi.ts"), "utf8");
    const apiTypes = readFileSync(join(desktopRoot, "src", "renderer", "api", "types.ts"), "utf8");
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const shellLayout = readFileSync(join(uiRoot, "src", "shell", "AppShell.tsx"), "utf8");

    expect(mainProcess).not.toContain("createTitleBarOverlayOptions");
    expect(mainProcess).not.toContain("titleBarOverlay");
    expect(mainProcess).not.toContain('color: "#10151d"');
    expect(mainProcess).not.toContain('backgroundColor: "#0d1118"');
    expect(ipcRegister).toContain("registerWindowIpcHandlers()");
    expect(windowIpc).not.toContain("setTitleBarOverlay");
    expect(windowIpc).toContain('ipcMain.handle("window:minimize"');
    expect(windowIpc).toContain('ipcMain.handle("window:toggle-maximize"');
    expect(windowIpc).toContain('ipcMain.handle("window:close"');
    expect(preload).toContain("setWindowColorMode");
    expect(preload).toContain('ipcRenderer.invoke("window:set-color-mode"');
    expect(preload).toContain("minimizeWindow");
    expect(preload).toContain('ipcRenderer.invoke("window:minimize"');
    expect(preload).toContain("toggleMaximizeWindow");
    expect(preload).toContain('ipcRenderer.invoke("window:toggle-maximize"');
    expect(preload).toContain("closeWindow");
    expect(preload).toContain('ipcRenderer.invoke("window:close"');
    expect(windowApi).toContain("minimizeWindow(): Promise<void>");
    expect(windowApi).toContain("toggleMaximizeWindow(): Promise<void>");
    expect(windowApi).toContain("closeWindow(): Promise<void>");
    expect(apiTypes).toContain("WindowApi");
    expect(apiTypes).toContain("export type * from \"./windowApi\"");
    expect(homePage).toContain("setColorMode: (mode: \"light\" | \"dark\") => window.d2?.setWindowColorMode?.(mode)");
    expect(homePage).toContain("windowControls");
    expect(homePage).toContain("minimize: () => window.d2.minimizeWindow()");
    expect(homePage).toContain("toggleMaximize: () => window.d2.toggleMaximizeWindow()");
    expect(homePage).toContain("close: () => window.d2.closeWindow()");
    expect(shellLayout).toContain("shell-window-control-button window-minimize");
    expect(shellLayout).toContain("shell-window-control-button window-toggle-maximize");
    expect(shellLayout).toContain("shell-window-control-button window-close");
  });

  it("keeps dense item surfaces responsive by avoiding animated shadows and movement", () => {
    const styles = readProductStyles();
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
    const settingsPage = [
      readFileSync(join(uiRoot, "src", "settings", "SettingsPageContentView.tsx"), "utf8"),
      readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "SettingsPage.tsx"), "utf8")
    ].join("\n");
    const settingsPageView = readFileSync(join(uiRoot, "src", "settings", "SettingsPageView.tsx"), "utf8");
    const styles = readProductStyles();

    expect(settingsPageView).toContain('className="app-page settings-app-page"');
    expect(settingsPage).not.toContain("app-page-head");
    expect(settingsPage).toContain("app-settings-shell");
    expect(settingsPage).toContain("settings-menu");
    expect(settingsPage).toContain("app-settings-grid");
    expect(settingsPage).toContain("settings-diagnostics-toolbar");
    expect(settingsPage).toContain('className="status-message status-ready"');
    expect(settingsPage).toContain('className="status-message status-error"');
    expect(styles).toContain(".settings-app-page");
    expect(styles).toContain(".app-page-head");
    expect(styles).toContain(".app-settings-shell");
    expect(styles).toContain(".app-settings-grid");
    expect(styles).toContain(".status-message");
    expect(styles).toContain(".status-message.status-ready");
    expect(styles).toContain(".status-message.status-error");
  });

  it("finishes the next UI refactor slices with shared panel, status, list, badge and filter styles", () => {
    const styles = readProductStyles();
    const settingsPage = [
      readFileSync(join(uiRoot, "src", "settings", "SettingsPageContentView.tsx"), "utf8"),
      readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "SettingsPage.tsx"), "utf8")
    ].join("\n");
    const homeDashboard = readFileSync(join(uiRoot, "src", "home", "HomePageView.tsx"), "utf8");
    const dailyPanel = readFileSync(join(desktopRoot, "src", "renderer", "shared", "components", "DailySummaryPanel.tsx"), "utf8");
    const accountPage = [
      readFileSync(join(uiRoot, "src", "account", "AccountPageView.tsx"), "utf8"),
      readFileSync(join(uiRoot, "src", "account", "AccountPageContentView.tsx"), "utf8"),
      readFileSync(join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"), "utf8")
    ].join("\n");
    const vaultPageAdapter = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultPage.tsx"), "utf8");
    const vaultCompatPanel = readFileSync(join(desktopRoot, "src", "renderer", "components", "VaultPanel.tsx"), "utf8");
    const vaultToolbarAdapter = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultFilterToolbar.tsx"), "utf8");
    const vaultSectionsAdapter = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultItemSections.tsx"), "utf8");
    const vaultPage = [
      readFileSync(join(uiRoot, "src", "vault", "VaultPageView.tsx"), "utf8"),
      readFileSync(join(uiRoot, "src", "vault", "VaultPageContentView.tsx"), "utf8")
    ].join("\n");
    const vaultToolbar = readFileSync(join(uiRoot, "src", "vault", "VaultFilterToolbar.tsx"), "utf8");
    const vaultSections = readFileSync(join(uiRoot, "src", "vault", "VaultItemSections.tsx"), "utf8");
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

    expect(settingsPage).toContain("app-panel app-setting-group");
    expect(settingsPage).toContain("app-setting-row");
    expect(settingsPage).toContain("app-log-row");

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
    expect(vaultPage).toContain("status-message status-ready");
    expect(vaultPageAdapter).toContain("VaultPageContentView");
    expect(vaultPageAdapter).toContain("VaultPageView");
    expect(vaultCompatPanel).toContain("VaultPageContentView as VaultPanel");
    expect(vaultToolbarAdapter).toContain("VaultFilterToolbar");
    expect(vaultSectionsAdapter).toContain("VaultItemSections");
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
