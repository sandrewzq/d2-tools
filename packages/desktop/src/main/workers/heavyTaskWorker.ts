import { parentPort, workerData } from "node:worker_threads";
import { existsSync, mkdtempSync, readdirSync, renameSync, rmSync, statfsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fetchAccountSummary, type AccountSummary } from "@d2-tools/core/account/summary";
import { loadConfig } from "@d2-tools/services/config/store";
import {
  initializeDefinitionComponent,
  loadDefinitionComponent,
  requiredDefinitionComponents,
  type DefinitionComponentStatus
} from "@d2-tools/services/manifest/definitions";
import {
  getManifestStatus,
  initializeManifestMetadata,
  loadManifestMetadataCache,
  manifestDir,
  recoverManifestCacheDirectories,
  type ManifestStatus
} from "@d2-tools/services/manifest/cache";
import { loadFreshOAuthToken } from "../ipc/authSession.js";
import type { HeavyTaskInput } from "./heavyTaskRunner.js";

void runWorkerTask(workerData as HeavyTaskInput)
  .then((result) => {
    parentPort?.postMessage({ type: "result", ok: true, result });
  })
  .catch((error) => {
    parentPort?.postMessage({
      type: "result",
      ok: false,
      error: error instanceof Error ? error.message : "后台 worker 执行失败"
    });
  });

async function runWorkerTask(input: HeavyTaskInput): Promise<ManifestStatus | AccountSummary> {
  if (input.task === "manifest-update") {
    return runManifestUpdate(input.config, input.repair);
  }
  if (input.task === "account-summary") {
    return fetchDesktopAccountSummary();
  }
  throw new Error("未知后台 worker 任务");
}

async function runManifestUpdate(config: ReturnType<typeof loadConfig>, repair = false): Promise<ManifestStatus> {
  recoverManifestCacheDirectories(config.data.data_dir);
  ensureManifestDiskSpace(config.data.data_dir);
  const stagingDataDir = mkdtempSync(join(config.data.data_dir, "manifest-staging-"));
  const stagingConfig = {
    ...config,
    data: {
      ...config.data,
      data_dir: stagingDataDir
    }
  };

  try {
    await initializeManifestMetadata({ config: stagingConfig });
    const cache = loadManifestMetadataCache(stagingDataDir);
    if (!cache) {
      throw new Error("Manifest metadata cache was not created");
    }

    const primaryLanguage = cache.language;
    const primaryTasks = requiredDefinitionComponents.map((component) => async () => {
      const status = await initializeDefinitionComponent({
        dataDir: stagingDataDir,
        language: primaryLanguage,
        metadata: cache.metadata,
        component
      });
      return { label: component, status };
    });

    const englishTasks: Array<() => Promise<{ label: string; status: DefinitionComponentStatus | null }>> = [];
    if (primaryLanguage.toLowerCase() !== "en") {
      englishTasks.push(
        async () => ({
          label: "DestinyInventoryItemDefinition (en)",
          status: await initializeDefinitionComponent({
            dataDir: stagingDataDir,
            language: "en",
            metadata: cache.metadata,
            component: "DestinyInventoryItemDefinition",
            writeDefaultCache: false
          }).catch(() => null)
        }),
        async () => ({
          label: "DestinyPlugSetDefinition (en)",
          status: await initializeDefinitionComponent({
            dataDir: stagingDataDir,
            language: "en",
            metadata: cache.metadata,
            component: "DestinyPlugSetDefinition",
            writeDefaultCache: false
          }).catch(() => null)
        })
      );
    }

    const tasks = [...primaryTasks, ...englishTasks];
    await runWithConcurrency(tasks, 4, (completed, total, label) => {
      parentPort?.postMessage({
        type: "progress",
        progress_percent: Math.round((completed / total) * 90),
        message: `已下载资料库组件 ${completed}/${total}：${label}`
      });
    });
    parentPort?.postMessage({
      type: "progress",
      progress_percent: 95,
      message: "正在切换到新资料库。"
    });
    replaceManifestCache(config.data.data_dir, stagingDataDir, repair);
    return getManifestStatus(config.data.data_dir);
  } finally {
    rmSync(stagingDataDir, { recursive: true, force: true });
  }
}

function ensureManifestDiskSpace(dataDir: string): void {
  try {
    const fileSystem = statfsSync(dataDir, { bigint: true });
    const availableBytes = fileSystem.bavail * fileSystem.bsize;
    const existingBytes = directorySize(manifestDir(dataDir), new Set<string>());
    const minimumBytes = 1024n * 1024n * 1024n;
    const requiredBytes = existingBytes > 0n
      ? (existingBytes * 5n) / 4n
      : minimumBytes;
    if (availableBytes < requiredBytes) {
      throw new Error(
        `资料库更新空间不足：至少需要 ${formatGiB(requiredBytes)} GiB，当前可用 ${formatGiB(availableBytes)} GiB`
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("资料库更新空间不足")) {
      throw error;
    }
    // Some filesystems do not expose capacity information; download errors remain the fallback.
  }
}

function directorySize(path: string, seenFiles: Set<string>): bigint {
  if (!existsSync(path)) {
    return 0n;
  }
  let total = 0n;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) {
      total += directorySize(child, seenFiles);
    } else if (entry.isFile()) {
      const stats = statSync(child);
      const fileKey = stats.nlink > 1 && stats.ino > 0
        ? `${stats.dev}:${stats.ino}`
        : child;
      if (!seenFiles.has(fileKey)) {
        seenFiles.add(fileKey);
        total += BigInt(stats.size);
      }
    }
  }
  return total;
}

function formatGiB(bytes: bigint): string {
  return (Number(bytes / (1024n * 1024n)) / 1024).toFixed(1);
}

async function runWithConcurrency<T extends { label: string }>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
  onComplete: (completed: number, total: number, label: string) => void
): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let nextIndex = 0;
  let completed = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      const result = await tasks[index]();
      results[index] = result;
      completed += 1;
      onComplete(completed, tasks.length, result.label);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => runNext()));
  return results;
}

function replaceManifestCache(dataDir: string, stagingDataDir: string, repair: boolean): void {
  const targetDir = manifestDir(dataDir);
  const sourceDir = manifestDir(stagingDataDir);
  const backupDir = join(dataDir, `manifest-backup-${Date.now()}`);
  const hadExistingManifest = existsSync(targetDir);

  if (!existsSync(sourceDir)) {
    throw new Error("Manifest staging cache was not created");
  }

  if (hadExistingManifest) {
    renameSync(targetDir, backupDir);
  }

  try {
    renameSync(sourceDir, targetDir);
    if (hadExistingManifest || repair) {
      try {
        rmSync(backupDir, { recursive: true, force: true });
      } catch {
        // The new cache is already active; stale backups are cleaned on the next startup/update.
      }
    }
  } catch (error) {
    if (hadExistingManifest && !existsSync(targetDir) && existsSync(backupDir)) {
      renameSync(backupDir, targetDir);
    }
    throw error;
  }
}

async function fetchDesktopAccountSummary(): Promise<AccountSummary> {
  const config = loadConfig();
  const token = await loadFreshOAuthToken(config);
  const itemDefinitions = loadDefinitionComponent(
    config.data.data_dir,
    "DestinyInventoryItemDefinition"
  );
  const bucketDefinitions = loadDefinitionComponent(
    config.data.data_dir,
    "DestinyInventoryBucketDefinition"
  );
  const plugSetDefinitions = loadDefinitionComponent(
    config.data.data_dir,
    "DestinyPlugSetDefinition"
  );
  const loadoutNameDefinitions = loadDefinitionComponent(
    config.data.data_dir,
    "DestinyLoadoutNameDefinition"
  );
  const objectiveDefinitions = loadDefinitionComponent(
    config.data.data_dir,
    "DestinyObjectiveDefinition"
  );
  if (!itemDefinitions) {
    throw new Error("请先初始化资料库");
  }

  return fetchAccountSummary({
    config,
    token,
    itemDefinitions,
    bucketDefinitions: bucketDefinitions ?? undefined,
    plugSetDefinitions: plugSetDefinitions ?? undefined,
    loadoutNameDefinitions: loadoutNameDefinitions ?? undefined,
    objectiveDefinitions: objectiveDefinitions ?? undefined
  });
}
