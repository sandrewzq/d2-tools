import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const desktopRoot = join(repoRoot, "packages", "desktop");

function read(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("visual prototype harness", () => {
  it("provides a repeatable home prototype comparison script", () => {
    const script = read("scripts/visual-home-check.mjs");
    const packageJson = read("package.json");

    expect(packageJson).toContain('"visual:home"');
    expect(packageJson).toContain('"visual:settings"');
    expect(script).toContain("desktop-ui-redesign-prototype.html");
    expect(script).toContain("--page");
    expect(script).toContain("VITE_D2_VISUAL_PAGE");
    expect(script).toContain("D2_VISUAL_CAPTURE_PAGE");
    expect(script).toContain("D2_VISUAL_CAPTURE_DIR");
    expect(script).toContain("D2_VISUAL_CAPTURE_VIEWPORT");
    expect(script).toContain("findAvailablePort(53217)");
    expect(script).toContain("reference-dark-1365x900.png");
    expect(script).toContain("app-dark-1365x900.png");
    expect(script).toContain("compare-dark-1365x900.png");
    expect(script).toContain("report.json");
    expect(script).toContain("home-data-point");
    expect(script).toContain("home-weekly-dashboard");
    expect(script).toContain("settings-app-page");
    expect(script).toContain("app-settings-shell");
  });

  it("lets Electron capture the real app with computed styles for visual review", () => {
    const mainProcess = read("packages/desktop/src/main/main.ts");
    const homePage = read("packages/desktop/src/renderer/pages/HomePage.tsx");

    expect(mainProcess).toContain("D2_VISUAL_CAPTURE_DIR");
    expect(mainProcess).toContain("D2_VISUAL_CAPTURE_PAGE");
    expect(mainProcess).toContain("captureVisualSnapshot");
    expect(mainProcess).toContain(".home-app-page");
    expect(mainProcess).toContain(".settings-app-page");
    expect(mainProcess).toContain("settingsTitleCount");
    expect(mainProcess).toContain("home-data-point");
    expect(mainProcess).toContain("home-weekly-dashboard");
    expect(mainProcess).toContain("computedStyles");
    expect(mainProcess).toContain("app.quit()");
    expect(homePage).toContain("VITE_D2_VISUAL_PAGE");
    expect(homePage).toContain("isShellPageKey");
  });

  it("keeps home prototype classes isolated from global status overrides", () => {
    const homeDashboard = read("packages/desktop/src/renderer/features/home/HomeDashboard.tsx");
    const styles = read("packages/desktop/src/renderer/styles.css");
    const finalOverrideBlock = styles.slice(
      styles.indexOf("/* Desktop UI design system v2 final overrides */"),
      styles.indexOf("/* End desktop UI design system v2 final overrides */")
    );

    expect(homeDashboard).not.toContain("app-page-head");
    expect(homeDashboard).not.toContain("status-${point.tone}");
    expect(homeDashboard).not.toContain("status-${item.tone}");
    expect(homeDashboard).not.toContain("status-${row.tone}");
    expect(homeDashboard).not.toContain("status-${card.tone}");
    expect(homeDashboard).toContain("data-tone={point.tone}");
    expect(homeDashboard).toContain("data-tone={item.tone}");
    expect(finalOverrideBlock).not.toContain(".status-ready {");
    expect(finalOverrideBlock).not.toContain(".status-warning {");
  });

  it("keeps settings diagnostics aligned with the prototype shell", () => {
    const settingsPage = read("packages/desktop/src/renderer/features/settings/SettingsPage.tsx");
    const styles = read("packages/desktop/src/renderer/styles.css");
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

  it("keeps the HTML settings prototype aligned with current settings content", () => {
    const prototype = read("docs/work/backlog/desktop-ui-redesign-prototype.html");

    expect(prototype).toContain("核心状态");
    expect(prototype).toContain("应用更新");
    expect(prototype).toContain("settings-update-actions");
    expect(prototype).toContain("应用版本</span><strong>0.0.9</strong>");
    expect(prototype).toContain("更新来源</span><strong>GitHub Releases</strong>");
    expect(prototype).toContain("上次检查</span><strong>未检查</strong>");
    expect(prototype).toContain("装备写操作");
    expect(prototype).toContain("已开启，允许锁定、装备和转移。");
    expect(prototype).toContain("gpt-5.4");
    expect(prototype).toContain("启用 light.gg 实时分析");
    expect(prototype).toContain("settings-diagnostics-toolbar");
    expect(prototype).toContain("settings-log-row is-failed");
    expect(prototype).toContain("失败 / 覆盖游戏内配装栏 / 配装槽 2");
    expect(prototype).toContain("Bungie request failed: HTTP 500 (ErrorCode 1622: Your request was invalid.)");
    expect(prototype).toContain("成功 / 装备 / 精明幸存者臂环");

    const overviewActions = prototype.slice(
      prototype.indexOf("<h2>常用操作</h2>"),
      prototype.indexOf('id="settings-account"')
    );
    expect(overviewActions).toContain("<strong>管理账号</strong>");
    expect(overviewActions).toContain("<button>刷新账号</button>");
    expect(overviewActions).not.toContain("<button>打开</button>");
  });

  it("keeps the HTML prototype top status bar ordered and update-aware", () => {
    const prototype = read("docs/work/backlog/desktop-ui-redesign-prototype.html");
    const globalStatus = prototype.slice(
      prototype.indexOf('<div class="global-status">'),
      prototype.indexOf('<div class="toolbar">')
    );

    expect(globalStatus).toContain('<span class="status-pill"><span>Bungie</span><strong>已配置</strong></span>');
    expect(globalStatus).toContain('<span class="status-pill"><span>账号</span><strong>14:18</strong></span>');
    expect(globalStatus).toContain('<span class="status-pill"><span>资料库</span><strong>2026/06/16 最新</strong></span>');
    expect(globalStatus).toContain('<span class="status-pill warn"><span>AI</span><strong>未配置</strong></span>');
    expect(globalStatus).toContain('<span class="status-pill muted"><span>后台任务</span><strong>空闲</strong></span>');
    expect(globalStatus).toContain('<span class="status-pill"><span>应用版本</span><strong>0.0.9 最新</strong></span>');
    expect(globalStatus.indexOf("<span>Bungie</span>")).toBeLessThan(globalStatus.indexOf("<span>账号</span>"));
    expect(globalStatus.indexOf("<span>账号</span>")).toBeLessThan(globalStatus.indexOf("<span>资料库</span>"));
    expect(globalStatus.indexOf("<span>资料库</span>")).toBeLessThan(globalStatus.indexOf("<span>AI</span>"));
    expect(globalStatus.indexOf("<span>AI</span>")).toBeLessThan(globalStatus.indexOf("<span>后台任务</span>"));
    expect(globalStatus.indexOf("<span>后台任务</span>")).toBeLessThan(globalStatus.indexOf("<span>应用版本</span>"));
    expect(globalStatus).not.toContain("<strong>已读取</strong>");
  });

  it("keeps the HTML prototype toolbar aligned with the desktop shell", () => {
    const prototype = read("docs/work/backlog/desktop-ui-redesign-prototype.html");
    const toolbar = prototype.slice(
      prototype.indexOf('<div class="toolbar">'),
      prototype.indexOf('<div class="win-controls"')
    );

    expect(toolbar).not.toContain("更新资料库");
    expect(toolbar).not.toContain(">↧</button>");
    expect(toolbar).toContain('class="icon-btn github-icon" title="GitHub"');
    expect(toolbar).toContain('<svg aria-hidden="true" viewBox="0 0 16 16">');
    expect(toolbar).toContain("M8 0.4a7.7 7.7 0 0 0-2.4 15");
    expect(toolbar).not.toContain("<button class=\"icon-btn\" title=\"GitHub\">◐</button>");
  });

  it("keeps the desktop shell status bar aligned with the prototype", () => {
    const homePage = read("packages/desktop/src/renderer/pages/HomePage.tsx");
    const shellLayout = read("packages/desktop/src/renderer/components/ShellLayout.tsx");
    const styles = read("packages/desktop/src/renderer/styles.css");
    const shellStatusBuilder = homePage.slice(
      homePage.indexOf("function buildShellStatus"),
      homePage.indexOf("function formatAccountShellStatus")
    );

    expect(shellStatusBuilder).toContain('label: "Bungie"');
    expect(shellStatusBuilder).toContain('label: "账号"');
    expect(shellStatusBuilder).toContain('label: "资料库"');
    expect(shellStatusBuilder).toContain('label: "AI"');
    expect(shellStatusBuilder).toContain('label: "后台任务"');
    expect(shellStatusBuilder).toContain('label: "应用版本"');
    expect(shellStatusBuilder.indexOf('label: "Bungie"')).toBeLessThan(shellStatusBuilder.indexOf('label: "账号"'));
    expect(shellStatusBuilder.indexOf('label: "账号"')).toBeLessThan(shellStatusBuilder.indexOf('label: "资料库"'));
    expect(shellStatusBuilder.indexOf('label: "资料库"')).toBeLessThan(shellStatusBuilder.indexOf('label: "AI"'));
    expect(shellStatusBuilder.indexOf('label: "AI"')).toBeLessThan(shellStatusBuilder.indexOf('label: "后台任务"'));
    expect(shellStatusBuilder.indexOf('label: "后台任务"')).toBeLessThan(shellStatusBuilder.indexOf('label: "应用版本"'));
    expect(shellStatusBuilder).toContain("formatUpdateShellStatus");
    expect(shellStatusBuilder).toContain("updateSnapshot");
    expect(shellLayout).not.toContain("shell-tool-update");
    expect(shellLayout).not.toContain("后台更新资料库");
    expect(styles).toMatch(/\.shell-status-group\s*{[\s\S]*?border-radius:\s*999px;/);
    expect(styles).toMatch(/\.shell-status-group\s*{[\s\S]*?background:\s*var\(--surface-panel\);/);
    expect(shellStatusBuilder).not.toContain('label: "账号状态"');
  });

  it("wires backup migration operations through real desktop APIs", () => {
    const configApi = read("packages/desktop/src/renderer/api/configApi.ts");
    const preload = read("packages/desktop/src/preload/preload.ts");
    const configIpc = read("packages/desktop/src/main/ipc/config.ts");
    const settingsHook = read("packages/desktop/src/renderer/features/settings/useDiagnosticsSettings.ts");
    const homePage = read("packages/desktop/src/renderer/pages/HomePage.tsx");

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
    expect(homePage).toContain("onExportConfig: () => void diagnostics.exportConfig()");
    expect(homePage).toContain("onImportConfig: () => void diagnostics.importConfig()");
    expect(homePage).toContain("onClearCache: () => void diagnostics.clearCache()");
  });

  it("maps prototype tokens into both light and dark desktop modes", () => {
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");

    expect(styles).toContain("--prototype-page:");
    expect(styles).toContain("--prototype-panel:");
    expect(styles).toContain("--prototype-panel-soft:");
    expect(styles).toContain("--prototype-line:");
    expect(styles).toContain("--prototype-good:");
    expect(styles).toContain("--prototype-warn:");
    expect(styles).toMatch(/\.app-shell\[data-color-mode="dark"\]\s*{[\s\S]*?--surface-page:\s*#0e1218;/);
    expect(styles).toMatch(/\.app-shell\[data-color-mode="dark"\]\s*{[\s\S]*?--surface-panel:\s*#171d26;/);
    expect(styles).toMatch(/\.app-shell\[data-color-mode="dark"\]\s*{[\s\S]*?--surface-subtle:\s*#1b222c;/);
    expect(styles).toMatch(/\.home-data-strip\s*{[\s\S]*?background:\s*var\(--prototype-panel\);/);
    expect(styles).toMatch(/\.home-data-point\s*{[\s\S]*?background:\s*transparent;/);
  });
});
