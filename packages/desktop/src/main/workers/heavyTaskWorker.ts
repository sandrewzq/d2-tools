import { parentPort, workerData } from "node:worker_threads";
import { existsSync, readdirSync, statfsSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "@d2-tools/services/config/store";
import {
  initializeManifestMetadata,
  loadManifestMetadataCache,
  manifestDir,
  recoverManifestCacheDirectories
} from "@d2-tools/services/manifest/cache";
import {
  syncSqliteManifest,
  type ManifestLifecyclePhase,
  type SqliteManifestActivation
} from "@d2-tools/services/manifest/lifecycle";
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

async function runWorkerTask(input: HeavyTaskInput): Promise<SqliteManifestActivation> {
  return runManifestUpdate(input.config, input.repair);
}

async function runManifestUpdate(
  config: ReturnType<typeof loadConfig>,
  _repair = false
): Promise<SqliteManifestActivation> {
  recoverManifestCacheDirectories(config.data.data_dir);
  ensureManifestDiskSpace(config.data.data_dir);
  parentPort?.postMessage({
    type: "progress",
    progress_percent: 2,
    message: "正在读取 Bungie 资料库版本。"
  });
  await initializeManifestMetadata({ config });
  const cache = loadManifestMetadataCache(config.data.data_dir);
  if (!cache) {
    throw new Error("Manifest metadata cache was not created");
  }

  return syncSqliteManifest({
    dataDir: config.data.data_dir,
    language: config.data.manifest_language,
    metadata: cache.metadata,
    onProgress: reportManifestProgress,
    beforeActivate: requestActivationPermission
  });
}

function ensureManifestDiskSpace(dataDir: string): void {
  try {
    const fileSystem = statfsSync(dataDir, { bigint: true });
    const availableBytes = fileSystem.bavail * fileSystem.bsize;
    const existingBytes = directorySize(manifestDir(dataDir), new Set<string>());
    const minimumBytes = 2n * 1024n * 1024n * 1024n;
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

function reportManifestProgress(phase: ManifestLifecyclePhase): void {
  const progressByPhase: Record<ManifestLifecyclePhase, {
    progress_percent: number;
    message: string;
  }> = {
    download: { progress_percent: 8, message: "正在下载 Bungie SQLite 资料库。" },
    extract: { progress_percent: 30, message: "正在解压 SQLite 资料库。" },
    validate: { progress_percent: 48, message: "正在校验 SQLite 表和完整性。" },
    index: { progress_percent: 62, message: "正在构建装备与 Perk 查询索引。" },
    activate: { progress_percent: 95, message: "正在关闭旧连接并切换资料库。" }
  };
  parentPort?.postMessage({ type: "progress", ...progressByPhase[phase] });
}

function requestActivationPermission(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      parentPort?.off("message", onMessage);
      reject(new Error("等待主进程关闭旧资料库连接超时"));
    }, 15_000);
    const onMessage = (message: {
      type?: string;
      ok?: boolean;
      error?: string;
    }): void => {
      if (message.type !== "activation-ready") {
        return;
      }
      clearTimeout(timeout);
      parentPort?.off("message", onMessage);
      if (message.ok) {
        resolve();
      } else {
        reject(new Error(message.error ?? "关闭旧资料库连接失败"));
      }
    };
    parentPort?.on("message", onMessage);
    parentPort?.postMessage({ type: "activation-request" });
  });
}
