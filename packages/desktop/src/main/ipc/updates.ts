import { app, BrowserWindow, ipcMain, shell } from "electron";
import updaterPkg from "electron-updater";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { startBackgroundTask } from "../backgroundTasks.js";
import type { AppUpdateSnapshot } from "../../shared/updateTypes.js";
import { normalizeUpdateError } from "../../shared/updateError.js";

const { autoUpdater } = updaterPkg;
const require = createRequire(import.meta.url);

const updateChannel = "updates:status";
const isDevelopment = process.env.NODE_ENV === "development";
const updatesEnabled = app.isPackaged && !isDevelopment;
const releasePageUrl = "https://github.com/sandrewzq/d2-tools/releases/latest";
const mirrorFeedUrl = process.env.D2_TOOLS_UPDATE_FEED_URL?.trim();
const UPDATE_RETRY_DELAYS_MS = [30_000, 120_000, 300_000, 900_000, 1_800_000, Number.POSITIVE_INFINITY];
let appUpdateSnapshot: AppUpdateSnapshot = createBaseAppUpdateSnapshot("idle");
let hasRegisteredUpdaterEvents = false;
let hasScheduledInitialCheck = false;

export function registerUpdateIpcHandlers(): void {
  configureUpdater();

  ipcMain.handle("updates:get-status", () => appUpdateSnapshot);
  ipcMain.handle("updates:check", () => checkAppUpdates());
  ipcMain.handle("updates:download", () => downloadAppUpdate());
  ipcMain.handle("updates:open-download-page", async () => {
    await shell.openExternal(appUpdateSnapshot.release_page_url || releasePageUrl);
  });
  ipcMain.handle("updates:quit-and-install", () => {
    if (!updatesEnabled) {
      return;
    }

    autoUpdater.quitAndInstall(false, true);
  });
}

export function scheduleInitialUpdateCheck(delayMs = 10000): void {
  if (!updatesEnabled || hasScheduledInitialCheck) {
    return;
  }

  hasScheduledInitialCheck = true;
  setTimeout(() => {
    void checkAppUpdates({ restartIfRetrying: false });
  }, delayMs);
}

async function checkAppUpdates(options: { restartIfRetrying?: boolean } = {}): Promise<AppUpdateSnapshot> {
  startBackgroundTask({
    type: "app-update-check",
    title: "检查应用更新",
    message: "正在连接更新服务。",
    retryDelaysMs: getUpdateRetryDelaysMs(),
    restartIfRetrying: options.restartIfRetrying ?? true,
    run: async () => {
      await runAppUpdateCheck();
    }
  });

  return appUpdateSnapshot;
}

function getUpdateRetryDelaysMs(): number[] | undefined {
  return updatesEnabled ? UPDATE_RETRY_DELAYS_MS : undefined;
}

async function runAppUpdateCheck(): Promise<AppUpdateSnapshot> {
  if (!updatesEnabled) {
    return setAppUpdateSnapshot({
      ...createBaseAppUpdateSnapshot("not_available"),
      error: "开发环境不会检查线上更新",
      user_message: "开发环境不会检查线上更新。打包安装后会使用正式更新通道。"
    });
  }

  setAppUpdateSnapshot({ ...createBaseAppUpdateSnapshot("checking"), last_checked_at: new Date().toISOString() });
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    const normalized = normalizeUpdateError(error);
    setAppUpdateSnapshot({
      ...createBaseAppUpdateSnapshot("error"),
      last_checked_at: new Date().toISOString(),
      error: normalized.userMessage,
      user_message: normalized.userMessage,
      technical_error: normalized.technicalMessage
    });
    throw new Error(normalized.technicalMessage);
  }
  return appUpdateSnapshot;
}

async function downloadAppUpdate(): Promise<AppUpdateSnapshot> {
  startBackgroundTask({
    type: "app-update-download",
    title: "下载应用更新",
    message: "正在下载应用更新。",
    run: async ({ update }) => {
      update({ progress_percent: appUpdateSnapshot.progress_percent ?? 0 });
      await runAppUpdateDownload();
    }
  });

  return appUpdateSnapshot;
}

async function runAppUpdateDownload(): Promise<AppUpdateSnapshot> {
  if (!updatesEnabled) {
    return setAppUpdateSnapshot({
      ...createBaseAppUpdateSnapshot("not_available"),
      error: "开发环境不会下载线上更新",
      user_message: "开发环境不会下载线上更新。打包安装后会使用正式更新通道。"
    });
  }

  setAppUpdateSnapshot({ ...appUpdateSnapshot, status: "downloading", error: undefined });
  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    const normalized = normalizeUpdateError(error);
    setAppUpdateSnapshot({
      ...createBaseAppUpdateSnapshot("error"),
      available_version: appUpdateSnapshot.available_version,
      last_checked_at: appUpdateSnapshot.last_checked_at,
      error: normalized.userMessage,
      user_message: normalized.userMessage,
      technical_error: normalized.technicalMessage
    });
    throw new Error(normalized.technicalMessage);
  }
  return appUpdateSnapshot;
}

function configureUpdater(): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  if (mirrorFeedUrl) {
    autoUpdater.setFeedURL({
      provider: "generic",
      url: mirrorFeedUrl
    });
  }

  if (hasRegisteredUpdaterEvents) {
    return;
  }

  hasRegisteredUpdaterEvents = true;
  autoUpdater.on("checking-for-update", () => {
    setAppUpdateSnapshot({ ...createBaseAppUpdateSnapshot("checking"), last_checked_at: new Date().toISOString() });
  });
  autoUpdater.on("update-available", (info) => {
    setAppUpdateSnapshot({
      ...createBaseAppUpdateSnapshot("available"),
      available_version: info.version,
      last_checked_at: new Date().toISOString(),
      user_message: `发现新版本 ${info.version}，可先下载，下载完成后再重启安装。`
    });
  });
  autoUpdater.on("update-not-available", () => {
    setAppUpdateSnapshot({
      ...createBaseAppUpdateSnapshot("not_available"),
      last_checked_at: new Date().toISOString(),
      user_message: "当前已是最新版本。"
    });
  });
  autoUpdater.on("download-progress", (progress) => {
    setAppUpdateSnapshot({
      ...appUpdateSnapshot,
      status: "downloading",
      user_message: "正在下载更新，下载完成后可以手动重启安装。",
      progress_percent: Math.round(progress.percent)
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    setAppUpdateSnapshot({
      ...createBaseAppUpdateSnapshot("downloaded"),
      available_version: appUpdateSnapshot.available_version ?? info.version,
      downloaded_version: info.version,
      last_checked_at: appUpdateSnapshot.last_checked_at,
      user_message: `更新 ${info.version} 已下载，重启后安装。`
    });
  });
  autoUpdater.on("error", (error) => {
    const normalized = normalizeUpdateError(error);
    setAppUpdateSnapshot({
      ...createBaseAppUpdateSnapshot("error"),
      available_version: appUpdateSnapshot.available_version,
      last_checked_at: appUpdateSnapshot.last_checked_at,
      error: normalized.userMessage,
      user_message: normalized.userMessage,
      technical_error: normalized.technicalMessage
    });
  });
}

function createBaseAppUpdateSnapshot(status: AppUpdateSnapshot["status"]): AppUpdateSnapshot {
  return {
    status,
    current_version: getApplicationVersion(),
    install_path: getInstallPath(),
    release_page_url: releasePageUrl,
    update_source_label: mirrorFeedUrl ? "镜像更新源" : "GitHub Releases"
  };
}

function getApplicationVersion(): string {
  try {
    const packageJson = require("../../../package.json") as { version?: string };
    if (packageJson.version) {
      return packageJson.version;
    }
  } catch {
    // 打包形态异常时退回 Electron 提供的版本，避免更新状态不可用。
  }

  return app.getVersion();
}

function setAppUpdateSnapshot(snapshot: AppUpdateSnapshot): AppUpdateSnapshot {
  appUpdateSnapshot = snapshot;
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) {
      continue;
    }
    window.webContents.send(updateChannel, appUpdateSnapshot);
  }
  return appUpdateSnapshot;
}

function getInstallPath(): string {
  if (app.isPackaged) {
    return dirname(app.getPath("exe"));
  }

  return process.cwd();
}
