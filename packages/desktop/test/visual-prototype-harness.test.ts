import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function read(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

function readProductStyles(): string {
  return read("packages/ui/src/styles.css");
}

function readCssRule(styles: string, selector: string): string {
  const start = styles.lastIndexOf(`${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = styles.indexOf("}", start);
  expect(end).toBeGreaterThan(start);
  return styles.slice(start + 1, end + 1);
}

describe("visual prototype harness", () => {
  it("provides a repeatable home prototype comparison script", () => {
    const script = read("scripts/visual-home-check.mjs");
    const packageJson = read("package.json");

    expect(packageJson).toContain('"visual:home"');
    expect(packageJson).toContain('"visual:settings"');
    expect(packageJson).toContain('"visual:loadouts"');
    expect(packageJson).toContain('"dev:prototype"');
    expect(script).toContain('@d2-tools/prototype');
    expect(script).toContain("capture React prototype reference");
    expect(script).not.toContain("desktop-ui-redesign-prototype.html");
    expect(script).toContain("--page");
    expect(script).toContain("VITE_D2_VISUAL_PAGE");
    expect(script).toContain("VITE_D2_VISUAL_THEME");
    expect(script).toContain("D2_VISUAL_CAPTURE_PAGE");
    expect(script).toContain("D2_VISUAL_CAPTURE_DIR");
    expect(script).toContain("D2_VISUAL_CAPTURE_VIEWPORT");
    expect(script).toContain("D2_COLOR_MODE");
    expect(script).toContain("findAvailablePort(53170)");
    expect(script).toContain("findAvailablePort(53172)");
    expect(script).toContain("reference-dark-1365x900.png");
    expect(script).toContain("app-dark-1365x900.png");
    expect(script).toContain("compare-dark-1365x900.png");
    expect(script).toContain("report.json");
    expect(script).toContain("home-briefing-grid");
    expect(script).toContain("home-daily-panel");
    expect(script).toContain("home-weekly-dashboard");
    expect(script).toContain("app-settings-shell");
    expect(script).toContain("app-settings-shell");
    expect(script).toContain("loadout-workbench-shell");
    expect(script).toContain("timeoutMs");
  });

  it("provides an interactive AI drawer visual check for prototype, web and desktop", () => {
    const script = read("scripts/visual-ai-check.mjs");
    const packageJson = read("package.json");

    expect(packageJson).toContain('"visual:ai"');
    expect(packageJson).toContain('"playwright"');
    expect(script).toContain("@d2-tools/prototype");
    expect(script).toContain("@d2-tools/web");
    expect(script).toContain("@d2-tools/desktop");
    expect(script).toContain("_electron");
    expect(script).toContain("D2_RENDERER_URL");
    expect(script).toContain("D2_COLOR_MODE");
    expect(script).toContain("shell-tool-ai");
    expect(script).toContain("data-color-mode");
    expect(script).toContain("shell-tool-theme");
    expect(script).toContain("AI 助手");
    expect(script).toContain("PrototypeAssistantPanel");
    expect(script).toContain("Web AI 助手入口待接入");
    expect(script).toContain("小日向");
    expect(script).toContain("prototype-ai-dark-1365x900.png");
    expect(script).toContain("web-ai-dark-1365x900.png");
    expect(script).toContain("desktop-ai-dark-1365x900.png");
    expect(script).toContain("report.json");
    expect(script).toContain("drawerStyles");
    expect(script).toContain("assertDarkDrawerStyles");
    expect(script).toContain("global-assistant-panel background");
  });

  it("provides a full visual matrix scanner across shells, pages, themes and settings sections", () => {
    const script = read("scripts/visual-all-check.mjs");
    const packageJson = read("package.json");

    expect(packageJson).toContain('"visual:all"');
    expect(script).toContain("@d2-tools/prototype");
    expect(script).toContain("@d2-tools/web");
    expect(script).toContain("@d2-tools/desktop");
    expect(script).toContain("_electron");
    expect(script).toContain('const pages = ["home", "account", "vault", "loadouts", "library", "vendors", "settings"]');
    expect(script).toContain('const settingsSections = ["overview", "language", "account", "library", "bungie", "ai", "backup", "diagnostics"]');
    expect(script).toContain('const themes = ["light", "dark"]');
    expect(script).toContain("scanVisibleElementStyles");
    expect(script).toContain("assertNoLargeLightBackgrounds");
    expect(script).toContain("assertReadableTextContrast");
    expect(script).toContain("allowedLightBackgroundSelectors");
    expect(script).toContain("computedStyles");
    expect(script).toContain("fullPage: true");
    expect(script).toContain("report.json");
  });

  it("fails visual checks instead of forcing the DOM when the requested color mode is not active", () => {
    const aiScript = read("scripts/visual-ai-check.mjs");
    const homeScript = read("scripts/visual-home-check.mjs");
    const mainProcess = read("packages/desktop/src/main/main.ts");
    const webEntry = read("packages/web/src/main.tsx");

    expect(aiScript).toContain("color mode mismatch");
    expect(aiScript).not.toContain("setAttribute(\"data-color-mode\"");
    expect(homeScript).toContain("assertVisualReportColorMode");
    expect(homeScript).toContain("colorMode");
    expect(mainProcess).toContain("colorMode:");
    expect(mainProcess).toContain("document.querySelector(\".app-shell\")?.getAttribute(\"data-color-mode\")");
    expect(webEntry).toContain("VITE_D2_VISUAL_THEME");
    expect(webEntry).toContain("colorMode: initialTheme");
  });

  it("lets Electron capture the real app with computed styles for visual review", () => {
    const mainProcess = read("packages/desktop/src/main/main.ts");
    const homePage = read("packages/desktop/src/renderer/pages/HomePage.tsx");
    const productShell = read("packages/desktop/src/renderer/pages/useDesktopProductShell.tsx");

    expect(mainProcess).toContain("D2_VISUAL_CAPTURE_DIR");
    expect(mainProcess).toContain("D2_VISUAL_CAPTURE_PAGE");
    expect(mainProcess).toContain("captureVisualSnapshot");
    expect(mainProcess).toContain('home: ".home-briefing-grid"');
    expect(mainProcess).toContain('loadouts: ".loadout-workbench-shell"');
    expect(mainProcess).toContain('settings: ".app-settings-shell"');
    expect(mainProcess).not.toContain('home: ".home-app-page"');
    expect(mainProcess).not.toContain('loadouts: ".loadout-product-layout"');
    expect(mainProcess).not.toContain('settings: ".settings-app-page"');
    expect(mainProcess).toContain("settingsTitleCount");
    expect(mainProcess).toContain("home-briefing-grid");
    expect(mainProcess).toContain("home-daily-panel");
    expect(mainProcess).toContain("home-weekly-panel");
    expect(mainProcess).toContain("home-weekly-dashboard");
    expect(mainProcess).toContain("computedStyles");
    expect(mainProcess).toContain("app.quit()");
    expect(homePage).toContain("ProductShellHost");
    expect(productShell).toContain("VITE_D2_VISUAL_PAGE");
    expect(productShell).toContain("isShellPageKey");
  });

  it("keeps home prototype classes isolated from global status overrides", () => {
    const homeDashboard = read("packages/desktop/src/renderer/features/home/HomeDashboard.tsx");
    const homePageView = read("packages/ui/src/home/HomePageContentView.tsx");
    const styles = readProductStyles();
    const canonicalBlock = styles.slice(
      styles.indexOf("/* Canonical product token surface rules. Shared by Prototype, Web and Desktop. */"),
      styles.indexOf("/* End canonical product token surface rules */")
    );

    expect(homeDashboard).toContain("<HomePageContentView {...props} />");
    expect(homeDashboard).not.toContain("home-data-strip");
    expect(homePageView).not.toContain("app-page-head");
    expect(homePageView).not.toContain("status-${point.tone}");
    expect(homePageView).not.toContain("status-${item.tone}");
    expect(homePageView).not.toContain("status-${row.tone}");
    expect(homePageView).not.toContain("status-${card.tone}");
    expect(homePageView).not.toContain("data-tone={point.tone}");
    expect(homePageView).toContain("data-tone={item.tone}");
    expect(canonicalBlock).not.toContain(".status-ready {");
    expect(canonicalBlock).not.toContain(".status-warning {");
  });

  it("keeps settings diagnostics aligned with the prototype shell", () => {
    const settingsPage = `${read("packages/ui/src/settings/SettingsPageContentView.tsx")}\n${read("packages/ui/src/i18n/copy.ts")}\n${read("packages/desktop/src/renderer/features/settings/SettingsPage.tsx")}`;
    const styles = readProductStyles();
    const diagnosticsSection = settingsPage.slice(
      settingsPage.indexOf('id="settings-diagnostics"'),
      settingsPage.indexOf("</section>\n        </div>", settingsPage.indexOf('id="settings-diagnostics"'))
    );
    const backupSection = settingsPage.slice(
      settingsPage.indexOf('id="settings-backup"'),
      settingsPage.indexOf('id="settings-diagnostics"')
    );
    const accountSection = settingsPage.slice(
      settingsPage.indexOf('id="settings-account"'),
      settingsPage.indexOf('id="settings-library"')
    );

    expect(settingsPage).not.toContain("app-page-head");
    expect(settingsPage).toContain("app-settings-shell");
    expect(settingsPage).toContain("settings-menu");
    expect(settingsPage).toContain("设置总览");
    expect(settingsPage).toContain("应用更新");
    expect(settingsPage).toContain("settings-update-actions");
    expect(settingsPage).toContain("数据备份与迁移");
    expect(settingsPage).toContain("导出配置");
    expect(settingsPage).toContain("导入配置");
    expect(settingsPage).toContain("清理缓存");
    expect(settingsPage).toContain("onExportConfig");
    expect(settingsPage).toContain("onImportConfig");
    expect(settingsPage).toContain("onClearCache");
    expect(accountSection).toContain("装备写操作");
    expect(accountSection).toContain("重新授权");
    expect(accountSection).toContain("管理账号");
    expect(backupSection).not.toContain("装备写操作");
    expect(backupSection).not.toContain("disabled>导入</button>");
    expect(backupSection).not.toContain("disabled>清理</button>");
    expect(settingsPage).toContain("settings-diagnostics-toolbar");
    expect(settingsPage).toContain("settings-log-row");
    expect(settingsPage).toContain("is-success");
    expect(settingsPage).toContain("is-failed");
    expect(diagnosticsSection).not.toContain("app-metric-grid");
    expect(diagnosticsSection).not.toContain("settings-background-tasks");
    expect(styles).toMatch(/\.settings-diagnostics-toolbar\s*{[\s\S]*?background:\s*var\(--surface-subtle\);/);
    expect(styles).toMatch(/\.settings-diagnostics-toolbar select\s*{[\s\S]*?background:\s*var\(--field-bg\);/);
    expect(styles).toMatch(/\.settings-log-row\s*{[\s\S]*?background:\s*var\(--surface-subtle\);/);
    expect(styles).toMatch(/\.settings-app-page\s+input:disabled,[\s\S]*?\.settings-ai-section\s+select:disabled\s*{[\s\S]*?background:\s*var\(--field-bg\);/);
    expect(styles).not.toContain(".settings-log-row.is-success {\n  background: var(--status-ready-bg);");
    expect(styles).not.toContain(".settings-log-row.is-failed {\n  background: var(--status-error-bg);");
  });

  it("uses the React prototype as the active visual reference", () => {
    const prototypeEntry = read("packages/prototype/src/main.tsx");
    const prototypeStyles = read("packages/prototype/src/styles.css");
    const prototypeScenarios = read("packages/prototype/src/mock/scenarios.ts");
    const uiEntry = read("packages/ui/src/index.ts");
    const panelRule = readCssRule(prototypeStyles, ".prototype-debug-panel");
    const headingRule = readCssRule(prototypeStyles, ".prototype-debug-heading strong");
    const selectRule = readCssRule(prototypeStyles, ".prototype-debug select");
    const optionRule = readCssRule(prototypeStyles, ".prototype-debug option");

    expect(prototypeEntry).toContain("ProductShellHost");
    expect(prototypeEntry).toContain("HomePageContentView");
    expect(prototypeEntry).toContain("AccountPageContentView");
    expect(prototypeEntry).toContain("VaultPageContentView");
    expect(prototypeEntry).toContain("SettingsPageContentView");
    expect(prototypeEntry).toContain("prototype-debug-toggle");
    expect(prototypeEntry).toContain("prototype-debug-panel");
    expect(prototypeEntry).not.toContain("prototype-controls");
    expect(prototypeEntry).not.toContain("</ProductShellHost>\n      <div className=\"prototype-debug\"");
    expect(prototypeEntry).toContain("PrototypeScenarioKey");
    expect(prototypeScenarios).toContain("ready");
    expect(prototypeScenarios).toContain("account-missing");
    expect(prototypeScenarios).toContain("manifest-stale");
    expect(prototypeScenarios).toContain("background-running");
    expect(prototypeEntry).toContain("VITE_D2_VISUAL_PAGE");
    expect(prototypeEntry).toContain("VITE_D2_VISUAL_THEME");
    expect(prototypeEntry).toContain("VITE_D2_VISUAL_SCENARIO");
    expect(panelRule).toContain("color: var(--text-body)");
    expect(headingRule).toContain("color: var(--text-title)");
    expect(selectRule).toContain("color: var(--text-title)");
    expect(selectRule).toContain("background: var(--field-bg)");
    expect(selectRule).toContain("color-scheme: light dark");
    expect(optionRule).toContain("color: var(--text-title)");
    expect(optionRule).toContain("background: var(--surface-panel)");
    expect(uiEntry).toContain("AppShell");
    expect(uiEntry).toContain("ProductShellHost");
    expect(uiEntry).toContain("HomePageContentView");
    expect(uiEntry).toContain("HomePageView");
    expect(uiEntry).toContain("AccountPageView");
    expect(uiEntry).toContain("SettingsPageView");
  });

  it("keeps the web shell behind an adapter instead of inline mock data", () => {
    const webEntry = read("packages/web/src/main.tsx");
    const webAdapter = read("packages/web/src/webAdapter.ts");

    expect(webEntry).toContain("createWebShellAdapter");
    expect(webEntry).not.toContain("const shellStatus");
    expect(webEntry).not.toContain("const homeDailySummary");
    expect(webAdapter).toContain("WebShellAdapter");
    expect(webAdapter).toContain("loadHomeSnapshot");
    expect(webAdapter).toContain("fetch");
    expect(webAdapter).toContain("fallbackHomeSnapshot");
  });

  it("keeps shared AppShell status bar ordered and platform-neutral", () => {
    const appShell = read("packages/ui/src/shell/AppShell.tsx");
    const productHost = read("packages/ui/src/product/ProductShellHost.tsx");
    const desktopHomePage = read("packages/desktop/src/renderer/pages/HomePage.tsx");
    const productShell = read("packages/desktop/src/renderer/pages/useDesktopProductShell.tsx");

    expect(appShell).toContain("visibleShellStatus.map");
    expect(appShell).toContain("background-task-dock");
    expect(appShell).toContain("props.platformActions.openExternal");
    expect(appShell).toContain("props.platformActions.setColorMode");
    expect(appShell).not.toContain("window.d2");
    expect(productHost).toContain("<AppShell");
    expect(productHost).toContain("onNavigate={changePage}");
    expect(productHost).toContain("backgroundTasks={props.backgroundTasks}");
    expect(desktopHomePage).toContain("ProductShellHost");
    expect(productShell).toContain("window.d2.openExternal");
    expect(productShell).toContain("window.d2?.setWindowColorMode");
    expect(desktopHomePage).not.toContain("<ShellLayout");
    expect(existsSync(join(repoRoot, "packages", "desktop", "src", "renderer", "components", "ShellLayout.tsx"))).toBe(false);
  });

  it("retires the static HTML prototype from the active visual harness", () => {
    const developmentGuide = read("docs/development.md");
    const script = read("scripts/visual-home-check.mjs");

    expect(developmentGuide).toContain("React prototype");
    expect(developmentGuide).toContain("packages/prototype");
    expect(developmentGuide).toContain("静态 HTML 可以保留规范说明");
    expect(developmentGuide).toContain("不得迁入 `packages/ui`");
    expect(script).not.toContain("referenceHtml");
    expect(script).not.toContain("prepareReferenceHtml");
  });

  it("keeps the desktop shell status bar aligned with the prototype", () => {
    const productShell = read("packages/desktop/src/renderer/pages/useDesktopProductShell.tsx");
    const appShell = read("packages/ui/src/shell/AppShell.tsx");
    const styles = readProductStyles();
    const shellStatusBuilder = productShell.slice(
      productShell.indexOf("function buildShellStatus"),
      productShell.indexOf("function formatAccountShellStatus")
    );

    expect(shellStatusBuilder).toContain('label: "Bungie"');
    expect(shellStatusBuilder).toContain('label: "账号"');
    expect(shellStatusBuilder).toContain('label: "资料库"');
    expect(shellStatusBuilder).toContain('label: "AI"');
    expect(shellStatusBuilder).not.toContain('label: "后台任务"');
    expect(shellStatusBuilder).toContain('label: "应用版本"');
    expect(shellStatusBuilder.indexOf('label: "Bungie"')).toBeLessThan(shellStatusBuilder.indexOf('label: "账号"'));
    expect(shellStatusBuilder.indexOf('label: "账号"')).toBeLessThan(shellStatusBuilder.indexOf('label: "资料库"'));
    expect(shellStatusBuilder.indexOf('label: "资料库"')).toBeLessThan(shellStatusBuilder.indexOf('label: "AI"'));
    expect(shellStatusBuilder.indexOf('label: "AI"')).toBeLessThan(shellStatusBuilder.indexOf('label: "应用版本"'));
    expect(shellStatusBuilder).toContain("formatUpdateShellStatus");
    expect(shellStatusBuilder).toContain("updateSnapshot");
    expect(appShell).not.toContain("shell-tool-update");
    expect(appShell).not.toContain("后台更新资料库");
    expect(styles).toMatch(/\.shell-status-group\s*{[\s\S]*?border-radius:\s*999px;/);
    expect(styles).toMatch(/\.shell-status-group\s*{[\s\S]*?background:\s*var\(--surface-panel\);/);
    expect(shellStatusBuilder).not.toContain('label: "账号状态"');
  });

  it("wires backup migration operations through real desktop APIs", () => {
    const configApi = read("packages/desktop/src/renderer/api/configApi.ts");
    const preload = read("packages/desktop/src/preload/preload.ts");
    const configIpc = read("packages/desktop/src/main/ipc/config.ts");
    const settingsHook = read("packages/desktop/src/renderer/features/settings/useDiagnosticsSettings.ts");
    const productShell = read("packages/desktop/src/renderer/pages/useDesktopProductShell.tsx");

    expect(configApi).toContain("exportConfig(): Promise<ConfigBackupResult>");
    expect(configApi).toContain("importConfig(): Promise<ConfigBackupResult>");
    expect(configApi).toContain("clearCache(): Promise<ConfigBackupResult>");
    expect(preload).toContain('ipcRenderer.invoke("config:export")');
    expect(preload).toContain('ipcRenderer.invoke("config:import")');
    expect(preload).toContain('ipcRenderer.invoke("config:clear-cache")');
    expect(configIpc).toContain('ipcMain.handle("config:export"');
    expect(configIpc).toContain('ipcMain.handle("config:import"');
    expect(configIpc).toContain('ipcMain.handle("config:clear-cache"');
    expect(settingsHook).toContain("exportConfig");
    expect(settingsHook).toContain("importConfig");
    expect(settingsHook).toContain("clearCache");
    expect(productShell).toContain("onExportConfig: () => void diagnostics.exportConfig()");
    expect(productShell).toContain("onImportConfig: () => void diagnostics.importConfig()");
    expect(productShell).toContain("onClearCache: () => void diagnostics.clearCache()");
  });

  it("maps prototype tokens into both light and dark desktop modes", () => {
    const styles = readProductStyles();

    expect(styles).toContain("--prototype-page:");
    expect(styles).toContain("--prototype-panel:");
    expect(styles).toContain("--prototype-panel-soft:");
    expect(styles).toContain("--prototype-line:");
    expect(styles).toContain("--prototype-good:");
    expect(styles).toContain("--prototype-warn:");
    expect(styles).toMatch(/\.app-shell\[data-color-mode="dark"\]\s*{[\s\S]*?--surface-page:\s*#0e1218;/);
    expect(styles).toMatch(/\.app-shell\[data-color-mode="dark"\]\s*{[\s\S]*?--surface-panel:\s*#171d26;/);
    expect(styles).toMatch(/\.app-shell\[data-color-mode="dark"\]\s*{[\s\S]*?--surface-subtle:\s*#1b222c;/);
    expect(styles).toMatch(/\.home-briefing-grid\s*{[\s\S]*?grid-template-columns:\s*minmax\(288px,\s*0\.58fr\) minmax\(0,\s*1\.72fr\);/);
    expect(styles).toMatch(/\.home-weekly-dashboard\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.35fr\) minmax\(260px,\s*0\.75fr\);/);
    expect(styles).not.toContain(".home-data-strip");
    expect(styles).not.toContain(".home-data-point");
  });

  it("keeps product styles in packages/ui instead of the Desktop renderer stylesheet", () => {
    const desktopEntry = read("packages/desktop/src/renderer/main.tsx");
    const desktopStyles = read("packages/desktop/src/renderer/styles.css");
    const productStyles = readProductStyles();

    expect(desktopEntry).toContain('import "@d2-tools/ui/styles.css"');
    expect(desktopStyles).toContain("Electron-only platform adjustments");
    expect(desktopStyles).not.toContain(".shell-titlebar");
    expect(desktopStyles).not.toContain(".home-app-page");
    expect(desktopStyles).not.toContain(".settings-app-page");
    expect(productStyles).toContain(".shell-titlebar");
    expect(productStyles).toContain(".home-app-page");
    expect(productStyles).toContain(".settings-app-page");
    expect(productStyles).not.toContain("Light mode legacy surface compatibility");
    expect(productStyles).not.toContain("Desktop UI design system v2 final overrides");
  });
});
