import { ipcMain } from "electron";
import { loadConfig } from "@d2-tools/services/config/store";
import {
  checkManifestVersion,
  getManifestStatus,
  loadManifestVersionCheckCache,
  recoverManifestCacheDirectories,
  saveManifestVersionCheckCache,
  type ManifestStatus
} from "@d2-tools/services/manifest/cache";
import { clearDefinitionMemoryCache } from "@d2-tools/services/manifest/definitions";
import { listBackgroundTasks, startBackgroundTask } from "../backgroundTasks.js";
import { runHeavyTaskInWorker } from "../workers/heavyTaskRunner.js";
import type { BackgroundTaskRunContext } from "../../shared/backgroundTasks.js";

const MANIFEST_RETRY_DELAYS_MS = [30_000, 120_000, 300_000, 900_000];
const isVisualCapture = Boolean(process.env.D2_VISUAL_CAPTURE_DIR);
let hasScheduledInitialManifestVersionCheck = false;
let lastManifestVersionStatus: (Pick<ManifestStatus, "latest_version" | "needs_update" | "checked_at"> & {
  data_dir: string;
}) | null = null;

type ManifestStatusRequestOptions = {
  forceCheck?: boolean;
};

export function registerManifestIpcHandlers(): void {
  const initialConfig = loadConfig();
  recoverManifestCacheDirectories(initialConfig.data.data_dir);

  ipcMain.handle("manifest:status", (_event, options?: ManifestStatusRequestOptions) => {
    const config = loadConfig();
    const status = getManifestStatus(config.data.data_dir);
    if (!isVisualCapture && shouldRunManifestVersionCheck(status, Boolean(options?.forceCheck))) {
      runManifestVersionCheckTask(Boolean(options?.forceCheck));
    }
    return mergeManifestVersionStatus(status, config.data.data_dir, config.data.manifest_language);
  });

  ipcMain.handle("manifest:initialize", async () => {
    return startManifestUpdateTask({ restartIfRetrying: true });
  });

  ipcMain.handle("manifest:repair", async () => {
    return startManifestUpdateTask({ repair: true, restartIfRetrying: true });
  });
}

export function scheduleInitialManifestVersionCheck(delayMs = 12000): void {
  if (hasScheduledInitialManifestVersionCheck || isVisualCapture) {
    return;
  }

  hasScheduledInitialManifestVersionCheck = true;
  setTimeout(() => {
    runScheduledManifestVersionCheck();
  }, delayMs);
  setInterval(runScheduledManifestVersionCheck, 60 * 60 * 1000);
}

function runScheduledManifestVersionCheck(): void {
  try {
    const config = loadConfig();
    const status = getManifestStatus(config.data.data_dir);
    if (shouldRunManifestVersionCheck(status, false)) {
      runManifestVersionCheckTask();
    }
  } catch {
    startManifestUpdateTask();
  }
}

function runManifestVersionCheckTask(restartIfRetrying = false): void {
  const config = loadConfig();
  if (!config.bungie.api_key.trim()) {
    startBackgroundTask({
      type: "manifest-version-check",
      title: "检查资料库版本",
      message: "缺少 Bungie API Key，无法检查资料库版本。",
      restartIfRetrying,
      run: async () => {
        throw new Error("请先在设置中配置 Bungie API Key");
      }
    });
    return;
  }

  startBackgroundTask({
    type: "manifest-version-check",
    title: "检查资料库版本",
    message: "正在检查 Bungie Manifest 最新版本。",
    retryDelaysMs: MANIFEST_RETRY_DELAYS_MS,
    restartIfRetrying,
    run: async ({ update }) => {
      const attemptConfig = loadConfig();
      if (!attemptConfig.bungie.api_key.trim()) {
        throw new Error("请先在设置中配置 Bungie API Key");
      }
      const status = await checkManifestVersion({ config: attemptConfig });
      lastManifestVersionStatus = {
        data_dir: attemptConfig.data.data_dir,
        latest_version: status.latest_version,
        needs_update: status.needs_update,
        checked_at: status.checked_at
      };
      saveManifestVersionCheckCache({
        dataDir: attemptConfig.data.data_dir,
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
        startManifestUpdateTask();
      }
    }
  });
}

function mergeManifestVersionStatus(status: ManifestStatus, dataDir: string, configuredLanguage: string): ManifestStatus {
  const versionStatus = getManifestVersionStatus(dataDir);
  if (!versionStatus) {
    return {
      ...status,
      needs_update: status.needs_update || manifestLanguageNeedsUpdate(status, configuredLanguage)
    };
  }
  return {
    ...status,
    latest_version: versionStatus.latest_version,
    checked_at: versionStatus.checked_at,
    needs_update: Boolean(
      versionStatus.needs_update
      || (versionStatus.latest_version && status.version !== versionStatus.latest_version)
      || manifestLanguageNeedsUpdate(status, configuredLanguage)
    )
  };
}

function shouldAutoUpdateManifest(status: ManifestStatus): boolean {
  return Boolean(status.needs_update || status.missing_required_components?.length || !status.initialized);
}

function shouldRunManifestVersionCheck(status: ManifestStatus, forceCheck: boolean): boolean {
  if (forceCheck) {
    return true;
  }
  const hasActiveManifestTask = listBackgroundTasks().some((task) => (
    ["manifest-version-check", "manifest-update", "manifest-repair"].includes(task.type)
    && ["queued", "running", "retrying"].includes(task.status)
  ));
  if (hasActiveManifestTask) {
    return false;
  }
  if (!status.initialized || status.missing_required_components?.length) {
    return true;
  }

  const config = loadConfig();
  if (manifestLanguageNeedsUpdate(status, config.data.manifest_language)) {
    return true;
  }

  const versionStatus = getManifestVersionStatus(config.data.data_dir);
  return Boolean(
    versionStatus?.needs_update
    || !versionStatus?.checked_at
    || localDateKey(versionStatus.checked_at) !== localDateKey(new Date())
  );
}

function getManifestVersionStatus(dataDir: string): Pick<ManifestStatus, "latest_version" | "needs_update" | "checked_at"> | null {
  if (lastManifestVersionStatus?.data_dir === dataDir) {
    return lastManifestVersionStatus;
  }

  const cache = loadManifestVersionCheckCache(dataDir);
  if (!cache) {
    lastManifestVersionStatus = null;
    return null;
  }
  lastManifestVersionStatus = {
    data_dir: dataDir,
    latest_version: cache.latest_version,
    needs_update: cache.needs_update,
    checked_at: cache.checked_at
  };
  return lastManifestVersionStatus;
}

function manifestLanguageNeedsUpdate(status: ManifestStatus, configuredLanguage: string): boolean {
  if (!status.initialized) {
    return false;
  }
  return status.language?.trim().toLowerCase() !== configuredLanguage.trim().toLowerCase();
}

function localDateKey(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function startManifestUpdateTask(options: { repair?: boolean; restartIfRetrying?: boolean } = {}): Promise<ReturnType<typeof getManifestStatus>> {
  const config = loadConfig();
  const hasApiKey = Boolean(config.bungie.api_key.trim());
  startBackgroundTask({
    type: "manifest-update",
    title: options.repair ? "修复资料库" : "更新资料库",
    message: hasApiKey
      ? (options.repair ? "正在清理并重建 Destiny 2 资料库。" : "正在后台更新 Destiny 2 资料库。")
      : "缺少 Bungie API Key，无法更新资料库。",
    retryDelaysMs: hasApiKey ? MANIFEST_RETRY_DELAYS_MS : undefined,
    restartIfRetrying: options.restartIfRetrying,
    run: async (context) => {
      if (!hasApiKey) {
        throw new Error("请先在设置中配置 Bungie API Key");
      }
      await runManifestUpdate(Boolean(options.repair), context);
    }
  });

  const currentStatus = mergeManifestVersionStatus(
    getManifestStatus(config.data.data_dir),
    config.data.data_dir,
    config.data.manifest_language
  );
  return Promise.resolve(currentStatus);
}

async function runManifestUpdate(
  repair: boolean,
  context: BackgroundTaskRunContext
): Promise<ReturnType<typeof getManifestStatus>> {
  const config = loadConfig();
  const status = await runHeavyTaskInWorker<ManifestStatus>(
    { task: "manifest-update", repair, config },
    (progress) => context.update(progress)
  );
  clearDefinitionMemoryCache(config.data.data_dir);
  const checkedAt = new Date().toISOString();
  lastManifestVersionStatus = {
    data_dir: config.data.data_dir,
    latest_version: status.version,
    needs_update: false,
    checked_at: checkedAt
  };
  saveManifestVersionCheckCache({
    dataDir: config.data.data_dir,
    checkedAt,
    latestVersion: status.version,
    needsUpdate: false
  });
  return mergeManifestVersionStatus(
    getManifestStatus(config.data.data_dir),
    config.data.data_dir,
    config.data.manifest_language
  );
}
