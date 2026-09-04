import { Worker } from "node:worker_threads";
import type { D2Config } from "@d2-tools/core/config/schema";

export type HeavyTaskInput =
  | { task: "manifest-update"; repair?: boolean; config: D2Config };

type HeavyTaskMessage<TResult> =
  | { type: "result"; ok: true; result: TResult }
  | { type: "result"; ok: false; error: string }
  | {
      type: "progress";
      progress_percent: number;
      message: string;
      phase?: string;
      progress_current_bytes?: number;
      progress_total_bytes?: number;
    }
  | { type: "activation-request" };

export type HeavyTaskRunOptions = {
  beforeActivate?: () => void | Promise<void>;
};

const activationTimeoutMs = 10_000;

export function runHeavyTaskInWorker<TResult>(
  input: HeavyTaskInput,
  onProgress?: (progress: {
    progress_percent: number;
    message: string;
    phase?: string;
    progress_current_bytes?: number;
    progress_total_bytes?: number;
  }) => void,
  options: HeavyTaskRunOptions = {}
): Promise<TResult> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const worker = new Worker(new URL("./heavyTaskWorker.js", import.meta.url), {
      workerData: input
    });

    worker.on("message", (message: HeavyTaskMessage<TResult>) => {
      if (message.type === "progress") {
        onProgress?.({
          progress_percent: message.progress_percent,
          message: message.message,
          phase: message.phase,
          progress_current_bytes: message.progress_current_bytes,
          progress_total_bytes: message.progress_total_bytes
        });
        return;
      }
      if (message.type === "activation-request") {
        void withTimeout(
          Promise.resolve(options.beforeActivate?.()),
          activationTimeoutMs,
          "关闭旧资料库连接超时"
        ).then(
          () => worker.postMessage({ type: "activation-ready", ok: true }),
          (error) => worker.postMessage({
            type: "activation-ready",
            ok: false,
            error: error instanceof Error ? error.message : "关闭旧资料库连接失败"
          })
        );
        return;
      }
      settled = true;
      if (message.ok) {
        resolve(message.result);
        return;
      }
      reject(new Error(message.error));
    });
    worker.once("error", (error) => {
      settled = true;
      reject(error);
    });
    worker.once("exit", (code) => {
      if (!settled) {
        reject(new Error(code === 0 ? "后台 worker 未返回结果" : `后台 worker 异常退出：${code}`));
      }
    });
  });
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
