import { app, BrowserWindow, ipcMain, shell } from "electron";
import updaterPkg from "electron-updater";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { startBackgroundTask } from "../backgroundTasks.js";
import type { BackgroundTaskSnapshot } from "../../shared/backgroundTasks.js";
import type { AppUpdateSnapshot } from "../../shared/updateTypes.js";
import { normalizeUpdateError } from "../../shared/updateError.js";

const { autoUpdater } = updaterPkg;
const require = createRequire(import.meta.url);

const updateChannel = "updates:status";
const isDevelopment = process.env.NODE_ENV === "development";
const updatesEnabled = app.isPackaged && !isDevelopment;
const officialReleasePageUrl = "https://github.com/sandrewzq/d2-tools/releases/latest";
const mirrorFeedUrl = process.env.D2_TOOLS_UPDATE_FEED_URL?.trim();
const mirrorDownloadPageUrl = process.env.D2_TOOLS_UPDATE_DOWNLOAD_URL?.trim();
const UPDATE_RETRY_DELAYS_MS = [30_000, 120_000, 300_000, 900_000, 1_800_000, Number.POSITIVE_INFINITY];
const persistedUpdateStateFile = "app-update-state.json";
// createBaseAppUpdateSnapshot() runs during module initialization, so this must
// be initialized before appUpdateSnapshot is created.
let updateSource: "official" | "mirror" = "official";
let appUpdateSnapshot: AppUpdateSnapshot = createBaseAppUpdateSnapshot("idle");
let hasRegisteredUpdaterEvents = false;
let hasScheduledInitialCheck = false;
let operationSequence = 0;
let activeOperation: { kind: "check" | "download"; operationId: string } | null = null;
let updateInstallRequested = false;
let activeDownloadTaskUpdate: ((patch: Partial<BackgroundTaskSnapshot>) => BackgroundTaskSnapshot) | null = null;

export function registerUpdateIpcHandlers(): void {
  configureUpdater();
  void restorePersistedUpdateSnapshot();

  ipcMain.handle("updates:get-status", () => appUpdateSnapshot);
  ipcMain.handle("updates:check", () => checkAppUpdates());
  ipcMain.handle("updates:download", () => downloadAppUpdate());
  ipcMain.handle("updates:open-download-page", async () => {
    await shell.openExternal(appUpdateSnapshot.release_page_url || getReleasePageUrl());
  });
  ipcMain.handle("updates:quit-and-install", () => {
    if (!updatesEnabled || appUpdateSnapshot.status !== "downloaded") {
      return;
    }

    updateInstallRequested = true;
    // The main process owns the shutdown ordering. `before-quit` will close
    // runtimes first and call `startUpdateInstall` only after they are idle.
    app.quit();
  });
}

/** True after the user confirmed installation and before the updater starts. */
export function isUpdateInstallRequested(): boolean {
  return updateInstallRequested;
}

/** Called by main.ts after runtime shutdown has completed. */
export function startUpdateInstall(): void {
  if (!updateInstallRequested || appUpdateSnapshot.status !== "downloaded") {
    return;
  }

  updateInstallRequested = false;
  autoUpdater.quitAndInstall(false, true);
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
  if (appUpdateSnapshot.status === "checking" || appUpdateSnapshot.status === "downloading") {
    return appUpdateSnapshot;
  }

  const operationId = createOperationId("check");
  activeOperation = { kind: "check", operationId };
  setAppUpdateSnapshot({
    ...appUpdateSnapshot,
    status: "checking",
    operation_id: operationId,
    retrying: false,
    next_retry_at: undefined,
    error: undefined,
    technical_error: undefined,
    user_message: "正在连接更新服务。",
    last_checked_at: new Date().toISOString()
  });
  startBackgroundTask({
    type: "app-update-check",
    dedupeKey: "app",
    title: "检查应用更新",
    message: "正在连接更新服务。",
    retryDelaysMs: getUpdateRetryDelaysMs(),
    restartIfRetrying: options.restartIfRetrying ?? true,
    run: async () => {
      await runAppUpdateCheck(operationId);
    }
  });

  return appUpdateSnapshot;
}

function getUpdateRetryDelaysMs(): number[] | undefined {
  return updatesEnabled ? UPDATE_RETRY_DELAYS_MS : undefined;
}

async function runAppUpdateCheck(operationId: string): Promise<AppUpdateSnapshot> {
  if (!updatesEnabled) {
    activeOperation = null;
    return setAppUpdateSnapshot({
      ...createBaseAppUpdateSnapshot("not_available"),
      operation_id: operationId,
      error: "开发环境不会检查线上更新",
      user_message: "开发环境不会检查线上更新。打包安装后会使用正式更新通道。"
    });
  }

  setAppUpdateSnapshot({
    ...appUpdateSnapshot,
    status: "checking",
    operation_id: operationId,
    retrying: false,
    next_retry_at: undefined,
    last_checked_at: new Date().toISOString()
  });
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    if (await trySwitchToMirrorAndCheck()) {
      return appUpdateSnapshot;
    }
    const normalized = normalizeUpdateError(error);
    setAppUpdateSnapshot({
      ...createBaseAppUpdateSnapshot("error"),
      operation_id: operationId,
      available_version: appUpdateSnapshot.available_version,
      last_checked_at: new Date().toISOString(),
      error: normalized.userMessage,
      user_message: normalized.userMessage,
      technical_error: normalized.technicalMessage,
      retrying: Boolean(getUpdateRetryDelaysMs()?.length)
    });
    throw new Error(normalized.technicalMessage);
  }
  return appUpdateSnapshot;
}

async function downloadAppUpdate(): Promise<AppUpdateSnapshot> {
  const canRetryDownload = appUpdateSnapshot.status === "error"
    && appUpdateSnapshot.operation_id?.includes(":download:")
    && Boolean(appUpdateSnapshot.available_version);
  if (appUpdateSnapshot.status !== "available" && !canRetryDownload) {
    return appUpdateSnapshot;
  }

  const operationId = createOperationId("download");
  activeOperation = { kind: "download", operationId };
  setAppUpdateSnapshot({
    ...appUpdateSnapshot,
    status: "downloading",
    operation_id: operationId,
    progress_percent: 0,
    retrying: false,
    next_retry_at: undefined,
    error: undefined,
    technical_error: undefined,
    restart_required: false,
    user_message: "正在下载更新，下载完成后可以手动重启安装。"
  });
  startBackgroundTask({
    type: "app-update-download",
    dedupeKey: "app",
    title: "下载应用更新",
    message: "正在下载应用更新。",
    run: async ({ update }) => {
      activeDownloadTaskUpdate = update;
      update({ phase: "download", progress_percent: appUpdateSnapshot.progress_percent ?? 0 });
      try {
        await runAppUpdateDownload(operationId);
      } catch (error) {
        update({ progress_bytes_per_second: undefined });
        throw error;
      } finally {
        activeDownloadTaskUpdate = null;
      }
    }
  });

  return appUpdateSnapshot;
}

async function runAppUpdateDownload(operationId: string): Promise<AppUpdateSnapshot> {
  if (!updatesEnabled) {
    activeOperation = null;
    return setAppUpdateSnapshot({
      ...createBaseAppUpdateSnapshot("not_available"),
      operation_id: operationId,
      error: "开发环境不会下载线上更新",
      user_message: "开发环境不会下载线上更新。打包安装后会使用正式更新通道。"
    });
  }

  setAppUpdateSnapshot({
    ...appUpdateSnapshot,
    status: "downloading",
    operation_id: operationId,
    retrying: false,
    next_retry_at: undefined,
    error: undefined,
    technical_error: undefined
  });
  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    const normalized = normalizeUpdateError(error);
    setAppUpdateSnapshot({
      ...createBaseAppUpdateSnapshot("error"),
      operation_id: operationId,
      available_version: appUpdateSnapshot.available_version,
      last_checked_at: appUpdateSnapshot.last_checked_at,
      error: normalized.userMessage,
      user_message: normalized.userMessage,
      technical_error: normalized.technicalMessage,
      retrying: false
    });
    throw new Error(normalized.technicalMessage);
  }
  return appUpdateSnapshot;
}

function configureUpdater(): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  if (hasRegisteredUpdaterEvents) {
    return;
  }

  hasRegisteredUpdaterEvents = true;
  autoUpdater.on("checking-for-update", () => {
    if (activeOperation?.kind !== "check") return;
    setAppUpdateSnapshot({
      ...appUpdateSnapshot,
      status: "checking",
      operation_id: activeOperation.operationId,
      retrying: false,
      next_retry_at: undefined,
      last_checked_at: new Date().toISOString()
    });
  });
  autoUpdater.on("update-available", (info) => {
    if (activeOperation?.kind !== "check") return;
    const operationId = activeOperation.operationId;
    activeOperation = null;
    setAppUpdateSnapshot({
      ...createBaseAppUpdateSnapshot("available"),
      operation_id: operationId,
      available_version: info.version,
      last_checked_at: new Date().toISOString(),
      retrying: false,
      user_message: `发现新版本 ${info.version}，可先下载，下载完成后再重启安装。`
    });
  });
  autoUpdater.on("update-not-available", () => {
    if (activeOperation?.kind !== "check") return;
    const operationId = activeOperation.operationId;
    activeOperation = null;
    setAppUpdateSnapshot({
      ...createBaseAppUpdateSnapshot("not_available"),
      operation_id: operationId,
      last_checked_at: new Date().toISOString(),
      retrying: false,
      user_message: "当前已是最新版本。"
    });
  });
  autoUpdater.on("download-progress", (progress) => {
    if (activeOperation?.kind !== "download") return;
    const progressPercent = Math.round(progress.percent);
    activeDownloadTaskUpdate?.({
      phase: "download",
      progress_percent: progressPercent,
      progress_current_bytes: progress.transferred,
      progress_total_bytes: progress.total,
      progress_bytes_per_second: progress.bytesPerSecond,
      message: "正在下载应用更新。"
    });
    setAppUpdateSnapshot({
      ...appUpdateSnapshot,
      status: "downloading",
      retrying: false,
      user_message: "正在下载更新，下载完成后可以手动重启安装。",
      progress_percent: progressPercent
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    if (activeOperation?.kind !== "download") return;
    const operationId = activeOperation.operationId;
    activeOperation = null;
    setAppUpdateSnapshot({
      ...createBaseAppUpdateSnapshot("downloaded"),
      operation_id: operationId,
      available_version: appUpdateSnapshot.available_version ?? info.version,
      downloaded_version: info.version,
      last_checked_at: appUpdateSnapshot.last_checked_at,
      retrying: false,
      restart_required: true,
      progress_percent: 100,
      user_message: `更新 ${info.version} 已下载，重启后安装。`
    });
    activeDownloadTaskUpdate?.({
      phase: "complete",
      progress_percent: 100,
      progress_current_bytes: undefined,
      progress_total_bytes: undefined,
      progress_bytes_per_second: undefined,
      message: `更新 ${info.version} 已下载，等待重启安装。`
    });
  });
  autoUpdater.on("error", (error) => {
    if (!activeOperation) return;
    const failedOperation = activeOperation;
    if (failedOperation.kind === "download") {
      activeOperation = null;
      activeDownloadTaskUpdate = null;
    }
    const normalized = normalizeUpdateError(error);
    setAppUpdateSnapshot({
      ...createBaseAppUpdateSnapshot("error"),
      operation_id: failedOperation.operationId,
      available_version: appUpdateSnapshot.available_version,
      last_checked_at: appUpdateSnapshot.last_checked_at,
      error: normalized.userMessage,
      user_message: normalized.userMessage,
      technical_error: normalized.technicalMessage,
      retrying: failedOperation.kind === "check"
    });
  });
}

function createBaseAppUpdateSnapshot(status: AppUpdateSnapshot["status"]): AppUpdateSnapshot {
  return {
    status,
    retrying: false,
    restart_required: false,
    current_version: getApplicationVersion(),
    install_path: getInstallPath(),
    release_page_url: getReleasePageUrl(),
    update_source_label: getUpdateSourceLabel()
  };
}

async function trySwitchToMirrorAndCheck(): Promise<boolean> {
  if (!mirrorFeedUrl || updateSource === "mirror") return false;

  updateSource = "mirror";
  autoUpdater.setFeedURL({
    provider: "generic",
    url: mirrorFeedUrl
  });
  setAppUpdateSnapshot({
    ...appUpdateSnapshot,
    status: "checking",
    release_page_url: getReleasePageUrl(),
    update_source_label: getUpdateSourceLabel(),
    user_message: "官方更新源连接失败，正在切换国内镜像。"
  });

  try {
    await autoUpdater.checkForUpdates();
    return true;
  } catch {
    return false;
  }
}

function getReleasePageUrl(): string {
  return updateSource === "mirror" && mirrorDownloadPageUrl
    ? mirrorDownloadPageUrl
    : officialReleasePageUrl;
}

function getUpdateSourceLabel(): string {
  return updateSource === "mirror" ? "国内镜像更新源" : "GitHub Releases";
}

function createOperationId(kind: "check" | "download"): string {
  operationSequence += 1;
  return `app-update:${kind}:${Date.now()}:${operationSequence}`;
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
  void persistUpdateSnapshot(snapshot);
  broadcastUpdateSnapshot();
  return appUpdateSnapshot;
}

type PersistedUpdateState = Pick<
  AppUpdateSnapshot,
  "status" | "operation_id" | "current_version" | "available_version" | "downloaded_version"
  | "update_source_label" | "last_checked_at" | "restart_required" | "error" | "user_message"
>;

async function restorePersistedUpdateSnapshot(): Promise<void> {
  try {
    const state = JSON.parse(await readFile(getPersistedUpdateStatePath(), "utf8")) as Partial<PersistedUpdateState>;
    if (!state || typeof state.status !== "string") return;

    const restorableStatus: AppUpdateSnapshot["status"][] = ["available", "downloaded", "not_available", "error"];
    if (!restorableStatus.includes(state.status as AppUpdateSnapshot["status"])) return;
    if (state.status === "downloaded" && (!state.downloaded_version || state.downloaded_version === getApplicationVersion())) {
      return;
    }

    if (mirrorFeedUrl && state.update_source_label?.includes("镜像")) {
      updateSource = "mirror";
    }

    appUpdateSnapshot = {
      ...createBaseAppUpdateSnapshot(state.status as AppUpdateSnapshot["status"]),
      operation_id: state.operation_id,
      available_version: state.available_version,
      downloaded_version: state.downloaded_version,
      update_source_label: state.update_source_label ?? getUpdateSourceLabel(),
      last_checked_at: state.last_checked_at,
      restart_required: state.restart_required ?? state.status === "downloaded",
      error: state.error,
      user_message: state.user_message
    };
    broadcastUpdateSnapshot();
  } catch {
    // 首次启动没有状态文件是正常情况；损坏文件也不能阻断应用启动。
  }
}

async function persistUpdateSnapshot(snapshot: AppUpdateSnapshot): Promise<void> {
  const persisted: PersistedUpdateState = {
    status: snapshot.status,
    operation_id: snapshot.operation_id,
    current_version: snapshot.current_version,
    available_version: snapshot.available_version,
    downloaded_version: snapshot.downloaded_version,
    update_source_label: snapshot.update_source_label,
    last_checked_at: snapshot.last_checked_at,
    restart_required: snapshot.restart_required,
    error: snapshot.error,
    user_message: snapshot.user_message
  };
  try {
    await writeFile(getPersistedUpdateStatePath(), `${JSON.stringify(persisted, null, 2)}\n`, "utf8");
  } catch {
    // 更新状态持久化失败不应影响检查、下载或正常退出。
  }
}

function getPersistedUpdateStatePath(): string {
  return join(app.getPath("userData"), persistedUpdateStateFile);
}

function broadcastUpdateSnapshot(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue;
    window.webContents.send(updateChannel, appUpdateSnapshot);
  }
}

function getInstallPath(): string {
  if (app.isPackaged) {
    return dirname(app.getPath("exe"));
  }

  return process.cwd();
}
