import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const uiRoot = join(repoRoot, "packages", "ui");

describe("product shell background task wiring", () => {
  it("keeps todo as a numbered task directory", () => {
    const todo = readFileSync(join(repoRoot, "docs", "todo.md"), "utf8");

    expect(todo).toContain("| 编号 | 优先级 | 状态 | 任务 | Backlog | 下一步 |");
    expect(todo).toContain("| T1 |");
    expect(todo).toContain("| T2 |");
    expect(todo).toContain("跨端 UI 壳、可交互原型与桌面视觉收口");
    expect(todo).toContain("仓库推荐与清理工作台");
  });

  it("exposes background task IPC through preload and renderer API contracts", () => {
    const ipcRegister = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const apiTypes = readFileSync(join(desktopRoot, "src", "renderer", "api", "types.ts"), "utf8");

    expect(ipcRegister).toContain("registerBackgroundTaskIpcHandlers()");
    expect(preload).toContain("getBackgroundTasks");
    expect(preload).toContain("onBackgroundTasksChanged");
    expect(apiTypes).toContain("BackgroundTaskApi");
    expect(apiTypes).toContain("export type * from \"./backgroundTaskApi\"");
  });

  it("subscribes to background tasks at the product shell and renders the non-intrusive task dock", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const shellLayout = readFileSync(join(uiRoot, "src", "shell", "AppShell.tsx"), "utf8");
    const settingsPage = [
      readFileSync(join(uiRoot, "src", "settings", "SettingsPageContentView.tsx"), "utf8"),
      readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "SettingsPage.tsx"), "utf8")
    ].join("\n");
    const diagnosticsHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "useDiagnosticsSettings.ts"), "utf8");
    const backgroundHook = readFileSync(join(desktopRoot, "src", "renderer", "shared", "hooks", "useBackgroundTasks.ts"), "utf8");

    expect(backgroundHook).toContain("api.getBackgroundTasks()");
    expect(backgroundHook).toContain("api.onBackgroundTasksChanged");
    expect(diagnosticsHook).toContain("useBackgroundTasks");
    expect(homePage).not.toContain("global-background-task-banner");
    expect(homePage).toContain("shellStatus={");
    expect(homePage).toContain("backgroundTasks={diagnostics.backgroundTasks}");
    expect(homePage).toContain("onOpenBackgroundTasks={() => setActivePage(\"settings\")}");
    expect(shellLayout).toContain("global-shell-status");
    expect(shellLayout).toContain("background-task-dock");
    expect(shellLayout).toContain("visibleShellStatus");
    expect(shellLayout).toContain('item.key !== "background"');
    expect(homePage).toContain('label: "应用版本"');
    expect(homePage).toContain('label: "Bungie"');
    expect(homePage).toContain('label: "AI"');
    expect(homePage).toContain("资料库");
    expect(homePage).not.toContain('label: "后台任务"');
    expect(homePage).toContain("backgroundTasks: diagnostics.backgroundTasks");
    expect(settingsPage).toContain("后台任务");
    expect(settingsPage).toContain("getBackgroundTaskUi");
    expect(settingsPage).not.toContain("settings-background-tasks");
    expect(settingsPage).not.toContain("formatBackgroundTaskStatus");
    expect(settingsPage).not.toContain("formatBackgroundTaskTime");
  });

  it("moves application update and manifest work onto application-level tasks", () => {
    const main = readFileSync(join(desktopRoot, "src", "main", "main.ts"), "utf8");
    const updatesIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "updates.ts"), "utf8");
    const manifestIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "manifest.ts"), "utf8");

    expect(main).toContain("scheduleInitialManifestVersionCheck()");
    expect(updatesIpc).toContain("startBackgroundTask");
    expect(updatesIpc).toContain("app-update-check");
    expect(updatesIpc).toContain("UPDATE_RETRY_DELAYS_MS");
    expect(updatesIpc).toContain("getUpdateRetryDelaysMs");
    expect(updatesIpc).toContain("Number.POSITIVE_INFINITY");
    expect(manifestIpc).toContain("startBackgroundTask");
    expect(manifestIpc).toContain("manifest-update");
    expect(manifestIpc).toContain("manifest-version-check");
    expect(manifestIpc).toContain("checkManifestVersion");
    expect(manifestIpc).toContain("scheduleInitialManifestVersionCheck");
    expect(manifestIpc).toContain("runHeavyTaskInWorker");
    expect(manifestIpc).toContain('task: "manifest-update"');
    expect(manifestIpc).toContain("return mergeManifestVersionStatus(getManifestStatus");
  });

  it("runs account refresh as an application-level background task and defers derived analysis", () => {
    const accountIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "account.ts"), "utf8");
    const activitiesIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "activities.ts"), "utf8");
    const communityIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "community.ts"), "utf8");
    const accountHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "useAccountWorkspace.ts"),
      "utf8"
    );

    expect(accountIpc).toContain("startBackgroundTask");
    expect(accountIpc).toContain("account-sync");
    expect(accountIpc).toContain("accountSummaryPromise");
    expect(accountIpc).toContain("runHeavyTaskInWorker");
    expect(accountIpc).toContain('task: "account-summary"');
    expect(activitiesIpc).toContain("startBackgroundTask");
    expect(activitiesIpc).toContain("account-activity");
    expect(activitiesIpc).not.toContain('type: "account-sync"');
    expect(communityIpc).toContain("startBackgroundTask");
    expect(communityIpc).toContain("community-analysis");
    expect(accountHook).toContain("loadAccountWorkspace(services)");
    expect(accountHook).toContain("void loadActivitySummary(summary)");
    expect(accountHook).not.toContain("loadFullAccountWorkspace");
  });

  it("passes background tasks to the shared floating dock instead of rendering a page banner", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const shellLayout = readFileSync(join(uiRoot, "src", "shell", "AppShell.tsx"), "utf8");

    expect(homePage).not.toContain("visibleBackgroundTask");
    expect(homePage).not.toContain("activeBackgroundTaskCount");
    expect(homePage).not.toContain("formatVisibleBackgroundTaskTitle");
    expect(shellLayout).toContain("copy.backgroundTasks.itemCount");
  });

  it("automatically upgrades stale or incomplete manifest data in the background", () => {
    const manifestIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "manifest.ts"), "utf8");
    const manifestApi = readFileSync(join(desktopRoot, "src", "renderer", "api", "manifestApi.ts"), "utf8");
    const libraryHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "library", "useLibraryWorkspace.ts"),
      "utf8"
    );
    const libraryPage = [
      readFileSync(join(uiRoot, "src", "library", "LibraryPageContentView.tsx"), "utf8"),
      readFileSync(join(desktopRoot, "src", "renderer", "features", "library", "LibraryPage.tsx"), "utf8")
    ].join("\n");
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");

    expect(manifestIpc).toContain("shouldAutoUpdateManifest");
    expect(manifestIpc).toContain("lastManifestVersionStatus");
    expect(manifestIpc).toContain("mergeManifestVersionStatus");
    expect(manifestIpc).toContain("status.needs_update");
    expect(manifestIpc).toContain("status.missing_required_components");
    expect(manifestIpc).toContain("initializeManifestWithBackgroundTask()");
    expect(manifestApi).toContain("latest_version?: string");
    expect(manifestApi).toContain("needs_update?: boolean");
    expect(manifestApi).toContain("checked_at?: string");
    expect(libraryHook).toContain("manifestStatus");
    expect(libraryHook).toContain("useManifestStatus");
    expect(libraryPage).toContain("library-manifest-alert");
    expect(libraryPage).toContain("isManifestBlocked");
    expect(libraryPage).toContain("disabled={props.isSearching || isManifestBlocked}");
    expect(libraryPage).toContain("资料库更新完成前暂不可搜索");
    expect(libraryPage).toContain("资料库不是最新版本");
    expect(libraryPage).toContain("缺少必要资料库组件");
    expect(libraryPage).toContain("后台更新资料库");
    expect(homePage).toContain("manifestStatus: library.manifestStatus");
    expect(homePage).toContain("onRefreshManifestStatus: () => void library.refreshManifestStatus()");
    expect(homePage).toContain("onInitializeManifest: () => void library.initializeManifest()");
  });

  it("shares manifest status UI state across library and settings pages", () => {
    const sharedHookPath = join(
      desktopRoot,
      "src",
      "renderer",
      "shared",
      "hooks",
      "useManifestStatus.ts"
    );
    const settingsHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "settings", "useDiagnosticsSettings.ts"),
      "utf8"
    );
    const libraryHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "library", "useLibraryWorkspace.ts"),
      "utf8"
    );
    const settingsPage = [
      readFileSync(join(uiRoot, "src", "settings", "SettingsPageContentView.tsx"), "utf8"),
      readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "SettingsPage.tsx"), "utf8")
    ].join("\n");
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");

    expect(existsSync(sharedHookPath)).toBe(true);
    const sharedHook = readFileSync(sharedHookPath, "utf8");
    expect(sharedHook).toContain("api.getManifestStatus()");
    expect(sharedHook).toContain("api.initializeManifest()");
    expect(libraryHook).toContain("useManifestStatus");
    expect(settingsHook).toContain("useManifestStatus");
    expect(settingsPage).toContain('id="settings-manifest"');
    expect(settingsPage).toContain("app-panel app-setting-group app-settings-wide manifest-");
    expect(settingsPage).toContain('settingsText(copy, "资料库")');
    expect(settingsPage).toContain('settingsText(copy, "当前版本")');
    expect(settingsPage).toContain('settingsText(copy, "最新版本")');
    expect(settingsPage).toContain('settingsText(copy, "资料库日期")');
    expect(settingsPage).toContain('settingsText(copy, "资料完整性")');
    expect(settingsPage).toContain("getBackgroundTaskUi");
    expect(settingsPage).not.toContain("settings-background-tasks");
    expect(homePage).toContain("manifestStatus: diagnostics.manifestStatus");
    expect(homePage).toContain("onRefreshManifestStatus: () => void diagnostics.refreshManifestStatus()");
    expect(homePage).toContain("onInitializeManifest: () => void diagnostics.initializeManifest()");
  });
});
