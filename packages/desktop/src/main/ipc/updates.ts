import { app, BrowserWindow, ipcMain } from "electron";
import updaterPkg from "electron-updater";
import { dirname } from "node:path";
import type { UpdateSnapshot } from "../../shared/updateTypes.js";

const { autoUpdater } = updaterPkg;

const updateChannel = "updates:status";
const isDevelopment = process.env.NODE_ENV === "development";
const updatesEnabled = app.isPackaged && !isDevelopment;
let updateSnapshot: UpdateSnapshot = createBaseSnapshot("idle");
let hasRegisteredUpdaterEvents = false;
let hasScheduledInitialCheck = false;

export function registerUpdateIpcHandlers(): void {
  configureUpdater();

  ipcMain.handle("updates:get-status", () => updateSnapshot);
  ipcMain.handle("updates:check", () => checkForUpdates());
  ipcMain.handle("updates:download", () => downloadUpdate());
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
    void checkForUpdates();
  }, delayMs);
}

async function checkForUpdates(): Promise<UpdateSnapshot> {
  if (!updatesEnabled) {
    return setUpdateSnapshot({
      ...createBaseSnapshot("not_available"),
      error: "开发环境不会检查线上更新"
    });
  }

  setUpdateSnapshot(createBaseSnapshot("checking"));
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    setUpdateSnapshot({
      ...createBaseSnapshot("error"),
      error: normalizeUpdateError(error)
    });
  }
  return updateSnapshot;
}

async function downloadUpdate(): Promise<UpdateSnapshot> {
  if (!updatesEnabled) {
    return setUpdateSnapshot({
      ...createBaseSnapshot("not_available"),
      error: "开发环境不会下载线上更新"
    });
  }

  setUpdateSnapshot({ ...updateSnapshot, status: "downloading", error: undefined });
  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    setUpdateSnapshot({
      ...createBaseSnapshot("error"),
      available_version: updateSnapshot.available_version,
      error: normalizeUpdateError(error)
    });
  }
  return updateSnapshot;
}

function configureUpdater(): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  if (hasRegisteredUpdaterEvents) {
    return;
  }

  hasRegisteredUpdaterEvents = true;
  autoUpdater.on("checking-for-update", () => {
    setUpdateSnapshot(createBaseSnapshot("checking"));
  });
  autoUpdater.on("update-available", (info) => {
    setUpdateSnapshot({
      ...createBaseSnapshot("available"),
      available_version: info.version
    });
  });
  autoUpdater.on("update-not-available", () => {
    setUpdateSnapshot(createBaseSnapshot("not_available"));
  });
  autoUpdater.on("download-progress", (progress) => {
    setUpdateSnapshot({
      ...updateSnapshot,
      status: "downloading",
      progress_percent: Math.round(progress.percent)
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    setUpdateSnapshot({
      ...createBaseSnapshot("downloaded"),
      available_version: updateSnapshot.available_version ?? info.version,
      downloaded_version: info.version
    });
  });
  autoUpdater.on("error", (error) => {
    setUpdateSnapshot({
      ...createBaseSnapshot("error"),
      available_version: updateSnapshot.available_version,
      error: normalizeUpdateError(error)
    });
  });
}

function createBaseSnapshot(status: UpdateSnapshot["status"]): UpdateSnapshot {
  return {
    status,
    current_version: app.getVersion(),
    install_path: getInstallPath()
  };
}

function setUpdateSnapshot(snapshot: UpdateSnapshot): UpdateSnapshot {
  updateSnapshot = snapshot;
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) {
      continue;
    }
    window.webContents.send(updateChannel, updateSnapshot);
  }
  return updateSnapshot;
}

function getInstallPath(): string {
  if (app.isPackaged) {
    return dirname(app.getPath("exe"));
  }

  return process.cwd();
}

function normalizeUpdateError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "更新检查失败";
}
