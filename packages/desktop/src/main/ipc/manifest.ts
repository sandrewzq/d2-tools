import { ipcMain } from "electron";
import { loadConfig } from "@d2-tools/services/config/store";
import {
  checkManifestVersion,
  getManifestStatus,
  type ManifestStatus
} from "@d2-tools/services/manifest/cache";
import { startBackgroundTask } from "../backgroundTasks.js";
import { runHeavyTaskInWorker } from "../workers/heavyTaskRunner.js";

const MANIFEST_RETRY_DELAYS_MS = [30_000, 120_000, 300_000, 900_000];
const isVisualCapture = Boolean(process.env.D2_VISUAL_CAPTURE_DIR);
let manifestUpdatePromise: Promise<ReturnType<typeof getManifestStatus>> | null = null;
let hasScheduledInitialManifestVersionCheck = false;
let lastManifestVersionStatus: Pick<ManifestStatus, "latest_version" | "needs_update" | "checked_at"> | null = null;

export function registerManifestIpcHandlers(): void {
  ipcMain.handle("manifest:status", () => {
    const config = loadConfig();
    if (!isVisualCapture) {
      runManifestVersionCheckTask();
    }
    return mergeManifestVersionStatus(getManifestStatus(config.data.data_dir));
  });

  ipcMain.handle("manifest:initialize", async () => {
    return initializeManifestWithBackgroundTask();
  });

  ipcMain.handle("manifest:repair", async () => {
    return initializeManifestWithBackgroundTask({ repair: true });
  });
}

export function scheduleInitialManifestVersionCheck(delayMs = 12000): void {
  if (hasScheduledInitialManifestVersionCheck) {
    return;
  }

  hasScheduledInitialManifestVersionCheck = true;
  setTimeout(() => {
    runManifestVersionCheckTask();
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
  if (!lastManifestVersionStatus) {
    return status;
  }
  return {
    ...status,
    latest_version: lastManifestVersionStatus.latest_version,
    checked_at: lastManifestVersionStatus.checked_at,
    needs_update: status.version !== lastManifestVersionStatus.latest_version
  };
}

function shouldAutoUpdateManifest(status: ManifestStatus): boolean {
  return Boolean(status.needs_update || status.missing_required_components?.length || !status.initialized);
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
  lastManifestVersionStatus = {
    latest_version: status.version,
    needs_update: false,
    checked_at: new Date().toISOString()
  };
  return mergeManifestVersionStatus(getManifestStatus(config.data.data_dir));
}
