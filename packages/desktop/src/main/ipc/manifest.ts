import { ipcMain } from "electron";
import { loadConfig } from "@d2-tools/services/config/store";
import {
  checkManifestVersion,
  getManifestStatus,
  loadManifestVersionCheckCache,
  saveManifestVersionCheckCache,
  type ManifestStatus
} from "@d2-tools/services/manifest/cache";
import { clearDefinitionMemoryCache } from "@d2-tools/services/manifest/definitions";
import { startBackgroundTask } from "../backgroundTasks.js";
import { runHeavyTaskInWorker } from "../workers/heavyTaskRunner.js";

const MANIFEST_RETRY_DELAYS_MS = [30_000, 120_000, 300_000, 900_000];
const isVisualCapture = Boolean(process.env.D2_VISUAL_CAPTURE_DIR);
let manifestUpdatePromise: Promise<ReturnType<typeof getManifestStatus>> | null = null;
let hasScheduledInitialManifestVersionCheck = false;
let lastManifestVersionStatus: Pick<ManifestStatus, "latest_version" | "needs_update" | "checked_at"> | null = null;

type ManifestStatusRequestOptions = {
  forceCheck?: boolean;
};

export function registerManifestIpcHandlers(): void {
  ipcMain.handle("manifest:status", (_event, options?: ManifestStatusRequestOptions) => {
    const config = loadConfig();
    const status = getManifestStatus(config.data.data_dir);
    if (!isVisualCapture && shouldRunManifestVersionCheck(status, Boolean(options?.forceCheck))) {
      runManifestVersionCheckTask();
    }
    return mergeManifestVersionStatus(status);
  });

  ipcMain.handle("manifest:initialize", async () => {
    return initializeManifestWithBackgroundTask();
  });

  ipcMain.handle("manifest:repair", async () => {
    return initializeManifestWithBackgroundTask({ repair: true });
  });
}

export function scheduleInitialManifestVersionCheck(delayMs = 12000): void {
  if (hasScheduledInitialManifestVersionCheck || isVisualCapture) {
    return;
  }

  hasScheduledInitialManifestVersionCheck = true;
  setTimeout(() => {
    const config = loadConfig();
    const status = getManifestStatus(config.data.data_dir);
    if (shouldRunManifestVersionCheck(status, false)) {
      runManifestVersionCheckTask();
    }
  }, delayMs);
}

function runManifestVersionCheckTask(): void {
  const config = loadConfig();
  if (!config.bungie.api_key.trim()) {
    return;
  }

  startBackgroundTask({
    type: "manifest-version-check",
    title: "检查资料库版本",
    message: "正在检查 Bungie Manifest 最新版本。",
    retryDelaysMs: MANIFEST_RETRY_DELAYS_MS,
    run: async ({ update }) => {
      const status = await checkManifestVersion({ config });
      lastManifestVersionStatus = {
        latest_version: status.latest_version,
        needs_update: status.needs_update,
        checked_at: status.checked_at
      };
      saveManifestVersionCheckCache({
        dataDir: config.data.data_dir,
        checkedAt: status.checked_at ?? new Date().toISOString(),
        latestVersion: status.latest_version,
        needsUpdate: status.needs_update
      });
      update({
        message: shouldAutoUpdateManifest(status)
          ? `发现资料库新版本 ${status.latest_version ?? "未知版本"} 或必要组件缺失，已转入后台更新。`
          : `资料库已是最新版本：${status.version ?? "未知版本"}。`
      });
      if (shouldAutoUpdateManifest(status)) {
        await initializeManifestWithBackgroundTask();
      }
    }
  });
}

function mergeManifestVersionStatus(status: ManifestStatus): ManifestStatus {
  const versionStatus = lastManifestVersionStatus ?? loadPersistedManifestVersionStatus();
  if (!versionStatus) {
    return status;
  }
  return {
    ...status,
    latest_version: versionStatus.latest_version,
    checked_at: versionStatus.checked_at,
    needs_update: versionStatus.latest_version ? status.version !== versionStatus.latest_version : versionStatus.needs_update
  };
}

function shouldAutoUpdateManifest(status: ManifestStatus): boolean {
  return Boolean(status.needs_update || status.missing_required_components?.length || !status.initialized);
}

function shouldRunManifestVersionCheck(status: ManifestStatus, forceCheck: boolean): boolean {
  if (forceCheck) {
    return true;
  }
  if (!status.initialized || status.missing_required_components?.length) {
    return true;
  }

  const versionStatus = lastManifestVersionStatus ?? loadPersistedManifestVersionStatus();
  return !versionStatus?.checked_at || localDateKey(versionStatus.checked_at) !== localDateKey(new Date());
}

function loadPersistedManifestVersionStatus(): Pick<ManifestStatus, "latest_version" | "needs_update" | "checked_at"> | null {
  const config = loadConfig();
  const cache = loadManifestVersionCheckCache(config.data.data_dir);
  if (!cache) {
    return null;
  }
  lastManifestVersionStatus = {
    latest_version: cache.latest_version,
    needs_update: cache.needs_update,
    checked_at: cache.checked_at
  };
  return lastManifestVersionStatus;
}

function localDateKey(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function initializeManifestWithBackgroundTask(options: { repair?: boolean } = {}): Promise<ReturnType<typeof getManifestStatus>> {
  if (manifestUpdatePromise && !options.repair) {
    return manifestUpdatePromise;
  }

  const previousUpdate = manifestUpdatePromise;
  const update = options.repair && previousUpdate
    ? previousUpdate.catch(() => undefined).then(() => runManifestUpdate(true))
    : runManifestUpdate(options.repair);
  const trackedUpdate = update.finally(() => {
    if (manifestUpdatePromise === trackedUpdate) {
      manifestUpdatePromise = null;
    }
  });
  manifestUpdatePromise = trackedUpdate;

  startBackgroundTask({
    type: options.repair ? "manifest-repair" : "manifest-update",
    title: options.repair ? "修复资料库" : "更新资料库",
    message: options.repair ? "正在清理并重建 Destiny 2 资料库。" : "正在后台更新 Destiny 2 资料库。",
    retryDelaysMs: MANIFEST_RETRY_DELAYS_MS,
    run: async () => {
      await trackedUpdate;
    }
  });

  return trackedUpdate;
}

async function runManifestUpdate(repair = false): Promise<ReturnType<typeof getManifestStatus>> {
  const config = loadConfig();
  const status = await runHeavyTaskInWorker<ManifestStatus>({ task: "manifest-update", repair });
  clearDefinitionMemoryCache(config.data.data_dir);
  lastManifestVersionStatus = {
    latest_version: status.version,
    needs_update: false,
    checked_at: new Date().toISOString()
  };
  saveManifestVersionCheckCache({
    dataDir: config.data.data_dir,
    checkedAt: lastManifestVersionStatus.checked_at,
    latestVersion: status.version,
    needsUpdate: false
  });
  return mergeManifestVersionStatus(getManifestStatus(config.data.data_dir));
}
