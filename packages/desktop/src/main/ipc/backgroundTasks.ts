import { ipcMain } from "electron";
import { listBackgroundTasks, startBackgroundTask } from "../backgroundTasks.js";
import type {
  AssetCacheTaskCompletion,
  AssetCacheTaskInput,
  BackgroundTaskSnapshot
} from "../../shared/backgroundTasks.js";

type AssetCacheDeferred = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
};

const pendingAssetCacheTasks = new Map<string, AssetCacheDeferred>();
const ASSET_CACHE_TASK_TIMEOUT_MS = 60_000;

export function registerBackgroundTaskIpcHandlers(): void {
  ipcMain.handle("background-tasks:list", () => listBackgroundTasks());
  ipcMain.handle("background-tasks:asset-cache:start", (_event, input: AssetCacheTaskInput) => {
    return queueAssetCacheTask(input);
  });
  ipcMain.handle("background-tasks:asset-cache:complete", (_event, input: AssetCacheTaskCompletion) => {
    return completeAssetCacheTask(input);
  });
}

function queueAssetCacheTask(input: AssetCacheTaskInput): BackgroundTaskSnapshot {
  const key = assetCacheTaskKey(input);
  const existing = pendingAssetCacheTasks.get(key);
  if (existing) {
    const active = listBackgroundTasks().find((task) =>
      task.type === "asset-cache" && task.message === input.src &&
      ["queued", "running", "retrying"].includes(task.status)
    );
    if (active) return active;
  }

  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = (error) => promiseReject(error);
  });
  pendingAssetCacheTasks.set(key, { promise, resolve, reject });

  return startBackgroundTask({
    type: "asset-cache",
    dedupeKey: key,
    title: "缓存游戏资源",
    message: input.src,
    run: async () => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          promise,
          new Promise<void>((_resolve, reject) => {
            timeout = setTimeout(() => reject(new Error("资源缓存响应超时")), ASSET_CACHE_TASK_TIMEOUT_MS);
          })
        ]);
      } finally {
        if (timeout) clearTimeout(timeout);
        if (pendingAssetCacheTasks.get(key)?.promise === promise) {
          pendingAssetCacheTasks.delete(key);
        }
      }
    }
  });
}

function completeAssetCacheTask(input: AssetCacheTaskCompletion): { ok: boolean } {
  const key = assetCacheTaskKey(input);
  const deferred = pendingAssetCacheTasks.get(key);
  if (!deferred) return { ok: false };
  if (input.ok) {
    deferred.resolve();
  } else {
    deferred.reject(new Error(input.error || "资源缓存失败"));
  }
  return { ok: true };
}

function assetCacheTaskKey(input: AssetCacheTaskInput): string {
  return `${input.cache_name}\n${input.src}`;
}
