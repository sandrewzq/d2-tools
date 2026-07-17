import { Worker } from "node:worker_threads";
import type { DefinitionComponentData, DefinitionComponentName } from "@d2-tools/core/manifest/definitions";
import type { PerkSearchResult } from "@d2-tools/core/items/perkSearch";
import type { ItemSearchResult } from "@d2-tools/core/items/search";
import type {
  GameDataCatalog,
  ItemDetailQuery,
  ItemSearchQuery,
  PerkSearchQuery
} from "@d2-tools/services/gameData";
import { measureRuntime } from "./runtimeMetrics.js";

type GameDataOperation =
  | "searchItems"
  | "searchPerks"
  | "getItemDetail"
  | "getDefinitions"
  | "ping"
  | "close";

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

export type DefinitionProjection = "account-snapshot" | "community-match" | "display-summary";

let worker: Worker | null = null;
let nextRequestId = 1;
let suspended = false;
let closeRequest: Promise<void> | null = null;
const pendingRequests = new Map<number, PendingRequest>();
const closeTimeoutMs = 5_000;

const catalog: GameDataCatalog = {
  searchItems(input: ItemSearchQuery) {
    return measureRuntime(
      "game-data.search-items",
      () => request<ItemSearchResult[]>("searchItems", input),
      { measurePayload: true }
    );
  },
  searchPerks(input: PerkSearchQuery) {
    return measureRuntime(
      "game-data.search-perks",
      () => request<PerkSearchResult[]>("searchPerks", input),
      { measurePayload: true }
    );
  },
  getItemDetail(input: ItemDetailQuery) {
    return measureRuntime(
      "game-data.item-detail",
      () => request<ItemSearchResult | null>("getItemDetail", input),
      { measurePayload: true }
    );
  }
};

export function getGameDataCatalog(): GameDataCatalog {
  return catalog;
}

export function getDefinitions(
  component: DefinitionComponentName,
  hashes: Iterable<number>,
  options: { projection?: DefinitionProjection } = {}
): Promise<DefinitionComponentData> {
  const detailKey = [
    "game-data.definition-batch",
    component,
    options.projection ?? "full"
  ].join(".");
  return measureRuntime(
    "game-data.definition-batch",
    () => request<DefinitionComponentData>("getDefinitions", {
      component,
      hashes: [...new Set([...hashes].map((hash) => hash >>> 0))],
      projection: options.projection
    }),
    { measurePayload: true, additionalKeys: [detailKey] }
  );
}

export async function closeGameDataRuntime(): Promise<void> {
  suspended = true;
  if (closeRequest) {
    return closeRequest;
  }
  const current = worker;
  if (!current) {
    return;
  }
  const operation = (async () => {
    try {
      await withTimeout(
        request("close", undefined, current),
        closeTimeoutMs,
        "关闭资料库查询 worker 超时"
      );
    } finally {
      if (worker === current) worker = null;
      await current.terminate();
      rejectPendingRequests(new Error("资料库查询 worker 已关闭"));
    }
  })();
  closeRequest = operation;
  try {
    await operation;
  } finally {
    if (closeRequest === operation) closeRequest = null;
  }
}

export function resumeGameDataRuntime(): void {
  suspended = false;
}

export function verifyGameDataRuntime(): Promise<void> {
  return request("ping").then(() => undefined);
}

function request<TResult>(
  operation: GameDataOperation,
  input?: unknown,
  targetWorker?: Worker
): Promise<TResult> {
  if (operation !== "close" && suspended) {
    return Promise.reject(new Error("资料库正在更新，请稍后重试"));
  }
  const activeWorker = targetWorker ?? ensureWorker();
  const id = nextRequestId++;
  return new Promise<TResult>((resolve, reject) => {
    pendingRequests.set(id, {
      resolve: (value) => resolve(value as TResult),
      reject
    });
    activeWorker.postMessage({ id, operation, input });
  });
}

function ensureWorker(): Worker {
  if (worker) {
    return worker;
  }
  const nextWorker = new Worker(new URL("../workers/gameDataWorker.js", import.meta.url));
  nextWorker.on("message", (message: {
    id: number;
    ok: boolean;
    result?: unknown;
    error?: string;
  }) => {
    const pending = pendingRequests.get(message.id);
    if (!pending) {
      return;
    }
    pendingRequests.delete(message.id);
    if (message.ok) {
      pending.resolve(message.result);
    } else {
      pending.reject(new Error(message.error ?? "资料库查询失败"));
    }
  });
  nextWorker.once("error", (error) => {
    if (worker !== nextWorker) return;
    worker = null;
    rejectPendingRequests(error);
  });
  nextWorker.once("exit", (code) => {
    if (worker !== nextWorker) return;
    worker = null;
    if (code !== 0) {
      rejectPendingRequests(new Error(`资料库查询 worker 异常退出：${code}`));
    } else {
      rejectPendingRequests(new Error("资料库查询 worker 已退出"));
    }
  });
  worker = nextWorker;
  return nextWorker;
}

function rejectPendingRequests(error: Error): void {
  for (const pending of pendingRequests.values()) {
    pending.reject(error);
  }
  pendingRequests.clear();
}

function withTimeout<TResult>(
  promise: Promise<TResult>,
  timeoutMs: number,
  message: string
): Promise<TResult> {
  return new Promise<TResult>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    void promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}
