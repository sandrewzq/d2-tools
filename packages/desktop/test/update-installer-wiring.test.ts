import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const uiRoot = join(repoRoot, "packages", "ui");

describe("desktop installer and update wiring", () => {
  it("declares updater dependencies and installer process guard assets", () => {
    const packageJson = readFileSync(join(desktopRoot, "package.json"), "utf8");
    const installerScriptPath = join(desktopRoot, "build", "installer.nsh");
    const installerScript = readFileSync(installerScriptPath, "utf8");

    expect(packageJson).toContain('"electron-updater"');
    expect(existsSync(installerScriptPath)).toBe(true);
    expect(installerScript).toContain("ensureTargetDirectoryIsNotRunning");
    expect(installerScript).toContain("$INSTDIR");
    expect(installerScript).toContain("请先关闭这个安装目录中的 d2-tools");
    expect(installerScript).not.toContain('FindProc "d2-tools.exe"');
  });

  it("wires update IPC through preload and renderer API contracts", () => {
    const ipcRegister = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");
    const updatesIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "updates.ts"), "utf8");
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const updateApi = readFileSync(join(desktopRoot, "src", "renderer", "api", "updateApi.ts"), "utf8");
    const apiTypes = readFileSync(join(desktopRoot, "src", "renderer", "api", "types.ts"), "utf8");

    expect(ipcRegister).toContain("registerUpdateIpcHandlers()");
    expect(updatesIpc).toContain("electron-updater");
    expect(updatesIpc).toContain('import updaterPkg from "electron-updater"');
    expect(updatesIpc).toContain("const { autoUpdater } = updaterPkg");
    expect(updatesIpc).not.toContain('import { autoUpdater } from "electron-updater"');
    expect(updatesIpc).toContain("updates:get-status");
    expect(updatesIpc).toContain("updates:check");
    expect(updatesIpc).toContain("updates:download");
    expect(updatesIpc).toContain("updates:quit-and-install");
    expect(updatesIpc).toContain("app.isPackaged");
    expect(updatesIpc).toContain("getPath(\"exe\")");
    expect(updatesIpc).toContain("getApplicationVersion()");
    expect(updatesIpc).not.toContain("current_version: app.getVersion()");
    expect(updatesIpc).toContain("window.isDestroyed()");
    expect(preload).toContain("getUpdateStatus");
    expect(preload).toContain("onUpdateStatusChanged");
    expect(preload).toContain("checkForUpdates");
    expect(preload).toContain("downloadUpdate");
    expect(preload).toContain("quitAndInstallUpdate");
    expect(preload).toContain("openUpdateDownloadPage");
    expect(updateApi).toContain("export type UpdateStatus");
    expect(updateApi).toContain("install_path: string");
    expect(updateApi).toContain("export type UpdateApi");
    expect(updateApi).toContain("openUpdateDownloadPage(): Promise");
    expect(apiTypes).toContain("UpdateApi");
    expect(apiTypes).toContain("export type * from \"./updateApi\"");
  });

  it("mounts product-grade application update controls in the settings page", () => {
    const settingsPage = [
      readFileSync(join(uiRoot, "src", "settings", "SettingsPageContentView.tsx"), "utf8"),
      readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "SettingsPage.tsx"), "utf8")
    ].join("\n");
    const settingsHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "useDiagnosticsSettings.ts"), "utf8");
    const updateFlow = readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "useUpdateFlow.ts"), "utf8");
    const diagnosticsModel = readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "diagnosticsModel.ts"), "utf8");
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const homeRoutes = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePageRoutes.tsx"), "utf8");

    expect(settingsPage).toContain("应用更新");
    expect(settingsPage).toContain('id="settings-updates"');
    expect(settingsPage).toContain("panel-subsection app-setting-group update-");
    expect(settingsPage).toContain("app-section-title");
    expect(settingsPage).toContain("app-chip status-");
    expect(settingsPage).toContain("update-progress-bar");
    expect(settingsPage).toContain("应用版本");
    expect(settingsPage).toContain("当前安装版本");
    expect(settingsPage).toContain("更新来源");
    expect(settingsPage).toContain("上次检查");
    expect(settingsPage).toContain("检查更新");
    expect(settingsPage).toContain("下载更新");
    expect(settingsPage).toContain("重启并安装");
    expect(settingsPage).toContain("打开下载页");
    expect(settingsPage).toContain("复制更新诊断");
    expect(settingsPage).toContain("GitHub 连接失败");
    expect(settingsHook).toContain("useUpdateFlow");
    expect(settingsHook).toContain("createDiagnosticsSettingsModel");
    expect(updateFlow).toContain("api.getUpdateStatus()");
    expect(updateFlow).toContain("api.onUpdateStatusChanged");
    expect(updateFlow).toContain("api.checkForUpdates()");
    expect(updateFlow).toContain("api.downloadUpdate()");
    expect(updateFlow).toContain("api.quitAndInstallUpdate()");
    expect(updateFlow).toContain("api.openUpdateDownloadPage()");
    expect(updateFlow).toContain("copyUpdateDiagnostic");
    expect(diagnosticsModel).toContain("api.getConfig()");
    expect(diagnosticsModel).toContain("api.getManifestStatus()");
    expect(diagnosticsModel).toContain("api.getActionLog()");
    expect(homePage).toContain("updateSnapshot: diagnostics.updateSnapshot");
    expect(homePage).toContain("global-update-banner");
    expect(homePage).toContain("updateSnapshot.status === \"available\"");
    expect(homePage).toContain("updateSnapshot.status === \"downloaded\"");
    expect(homePage).toContain("onOpenUpdateDownloadPage: () => void diagnostics.openUpdateDownloadPage()");
    expect(homePage).toContain("onCopyUpdateDiagnostic: () => void diagnostics.copyUpdateDiagnostic()");
    expect(homeRoutes).toContain("<SettingsPage {...props.settings}");
  });

  it("adds resilient update metadata, manual fallback and optional mirror source", () => {
    const updatesIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "updates.ts"), "utf8");
    const updateTypes = readFileSync(join(desktopRoot, "src", "shared", "updateTypes.ts"), "utf8");

    expect(updateTypes).toContain("release_page_url: string");
    expect(updateTypes).toContain("update_source_label: string");
    expect(updateTypes).toContain("last_checked_at?: string");
    expect(updateTypes).toContain("user_message?: string");
    expect(updateTypes).toContain("technical_error?: string");
    expect(updatesIpc).toContain("D2_TOOLS_UPDATE_FEED_URL");
    expect(updatesIpc).toContain("autoUpdater.setFeedURL");
    expect(updatesIpc).toContain('ipcMain.handle("updates:open-download-page"');
    expect(updatesIpc).toContain("shell.openExternal");
    expect(updatesIpc).toContain("GitHub 连接失败");
    expect(updatesIpc).toContain("net::ERR_CONNECTION_CLOSED");
  });

  it("hides the default Electron menu and aligns the native window with the app shell", () => {
    const main = readFileSync(join(desktopRoot, "src", "main", "main.ts"), "utf8");

    expect(main).toContain("Menu.setApplicationMenu(null)");
    expect(main).toContain("autoHideMenuBar: true");
    expect(main).toContain('titleBarStyle: "hidden"');
    expect(main).not.toContain("titleBarOverlay");
    expect(main).toContain("backgroundColor: getWindowBackgroundColor(");
  });

  it("adds a backup and migration guide to the settings release experience", () => {
    const settingsPage = [
      readFileSync(join(uiRoot, "src", "settings", "SettingsPageContentView.tsx"), "utf8"),
      readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "SettingsPage.tsx"), "utf8")
    ].join("\n");
    const settingsHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "useDiagnosticsSettings.ts"), "utf8");
    const diagnosticsModel = readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "diagnosticsModel.ts"), "utf8");
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const development = readFileSync(join(repoRoot, "docs", "development.md"), "utf8");

    expect(settingsPage).toContain("settings-backup");
    expect(settingsPage).toContain("数据备份与迁移");
    expect(settingsPage).toContain("复制备份/迁移说明");
    expect(settingsPage).toContain("onCopyDataBackupGuide");
    expect(settingsHook).toContain("copyDataBackupGuide");
    expect(diagnosticsModel).toContain("buildDataBackupGuide");
    expect(diagnosticsModel).toContain("关闭 d2-tools 后复制整个数据目录");
    expect(homePage).toContain("onCopyDataBackupGuide: () => void diagnostics.copyDataBackupGuide()");
    expect(development).toContain("备份与恢复");
    expect(development).toContain("关闭 d2-tools 后复制整个数据目录");
    expect(development).toContain("诊断导出不包含 token、client secret 或 API Key");
  });

  it("updates public docs away from green packages", () => {
    const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
    const development = readFileSync(join(repoRoot, "docs", "development.md"), "utf8");

    expect(readme).toContain("d2-tools-setup-<version>.exe");
    expect(readme).toContain("下载安装器并运行");
    expect(development).toContain("Windows NSIS 安装器");
    expect(development).toContain("d2-tools-setup-<version>.exe");
    expect(readme).not.toContain("下载绿色包、解压");
    expect(readme).not.toContain("d2-tools-win-x64-<version>.7z");
    expect(development).not.toContain("Windows `.7z` 绿色包");
  });
});
