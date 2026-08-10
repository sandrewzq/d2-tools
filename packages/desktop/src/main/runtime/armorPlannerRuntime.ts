import { Worker } from "node:worker_threads";
import {
  createArmorPlannerService,
  type ArmorPlannerJob,
  type ArmorPlannerJobResult,
  type ArmorPlannerRunRequest,
  type ArmorPlannerRunResult,
  type ArmorPlannerService,
  type ArmorPlannerWorkerRunner
} from "@d2-tools/services/armor/planner";
import { measureRuntime } from "./runtimeMetrics.js";

type ArmorPlannerOperation = "run" | "ping" | "close";

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  worker: Worker;
};

let worker: Worker | null = null;
let service: ArmorPlannerService | null = null;
let nextRequestId = 1;
let closeRequest: Promise<void> | null = null;
const pendingRequests = new Map<number, PendingRequest>();
const operationTimeoutMs: Record<ArmorPlannerOperation, number> = {
  run: 90_000,
  ping: 5_000,
  close: 5_000
};

export function planArmorInWorker<Job extends ArmorPlannerJob>(
  request: ArmorPlannerRunRequest<Job>
): Promise<ArmorPlannerRunResult<Job>> {
  return measureRuntime(
    `armor-planner.${request.job.mode}`,
    () => ensureService().plan(request),
    { measurePayload: true }
  );
}

export function invalidateArmorPlannerRuntime(scopeId?: string): void {
  ensureService().invalidate(scopeId);
}

export function verifyArmorPlannerRuntime(): Promise<void> {
  return requestWorker("ping").then(() => undefined);
}

export async function closeArmorPlannerRuntime(): Promise<void> {
  if (closeRequest) return closeRequest;
  const activeService = service;
  if (!activeService && !worker) return;
  const operation = (async () => {
    if (activeService) {
      await activeService.dispose();
    } else {
      await closeWorker();
    }
    service = null;
  })();
  closeRequest = operation;
  try {
    await operation;
  } finally {
    if (closeRequest === operation) closeRequest = null;
  }
}

function ensureService(): ArmorPlannerService {
  if (service) return service;
  const runner: ArmorPlannerWorkerRunner = {
    run<Job extends ArmorPlannerJob>(job: Job): Promise<ArmorPlannerJobResult<Job>> {
      return requestWorker<ArmorPlannerJobResult<Job>>("run", job);
    },
    close: closeWorker
  };
  service = createArmorPlannerService({
    runner,
    cacheTtlMs: 10 * 60_000,
    maxCacheEntries: 16
  });
  return service;
}

function requestWorker<TResult>(
  operation: ArmorPlannerOperation,
  job?: ArmorPlannerJob,
  targetWorker?: Worker
): Promise<TResult> {
  const activeWorker = targetWorker ?? ensureWorker();
  const id = nextRequestId++;
  return new Promise<TResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      const pending = pendingRequests.get(id);
      if (!pending) return;
      pendingRequests.delete(id);
      pending.reject(new Error(`护甲规划 Worker 超时：${operation}`));
      if (worker === activeWorker) worker = null;
      rejectPendingForWorker(activeWorker, new Error("护甲规划 Worker 已因超时重启"));
      void activeWorker.terminate().catch(() => undefined);
    }, operationTimeoutMs[operation]);
    pendingRequests.set(id, {
      resolve: (value) => resolve(value as TResult),
      reject,
      timeout,
      worker: activeWorker
    });
    try {
      activeWorker.postMessage({ id, operation, ...(job ? { job } : {}) });
    } catch (error) {
      clearTimeout(timeout);
      pendingRequests.delete(id);
      reject(error instanceof Error ? error : new Error("护甲规划请求发送失败"));
    }
  });
}

function ensureWorker(): Worker {
  if (worker) return worker;
  const nextWorker = new Worker(new URL("../workers/armorPlannerWorker.js", import.meta.url));
  nextWorker.on("message", (message: {
    id: number;
    ok: boolean;
    result?: unknown;
    error?: string;
  }) => {
    const pending = pendingRequests.get(message.id);
    if (!pending || pending.worker !== nextWorker) return;
    pendingRequests.delete(message.id);
    clearTimeout(pending.timeout);
    if (message.ok) pending.resolve(message.result);
    else pending.reject(new Error(message.error ?? "护甲规划失败"));
  });
  nextWorker.once("error", (error) => {
    if (worker === nextWorker) worker = null;
    rejectPendingForWorker(nextWorker, error);
  });
  nextWorker.once("exit", (code) => {
    if (worker === nextWorker) worker = null;
    rejectPendingForWorker(
      nextWorker,
      new Error(code === 0 ? "护甲规划 Worker 已退出" : `护甲规划 Worker 异常退出：${code}`)
    );
  });
  worker = nextWorker;
  return nextWorker;
}

async function closeWorker(): Promise<void> {
  const current = worker;
  if (!current) return;
  try {
    await requestWorker("close", undefined, current);
  } finally {
    if (worker === current) worker = null;
    await current.terminate();
    rejectPendingForWorker(current, new Error("护甲规划 Worker 已关闭"));
  }
}

function rejectPendingForWorker(targetWorker: Worker, error: Error): void {
  for (const [id, pending] of pendingRequests) {
    if (pending.worker !== targetWorker) continue;
    clearTimeout(pending.timeout);
    pending.reject(error);
    pendingRequests.delete(id);
  }
}
