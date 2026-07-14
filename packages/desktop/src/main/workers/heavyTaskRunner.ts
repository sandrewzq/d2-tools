import { Worker } from "node:worker_threads";
import type { D2Config } from "@d2-tools/core/config/schema";

export type HeavyTaskInput =
  | { task: "manifest-update"; repair?: boolean; config: D2Config }
  | { task: "account-summary" };

type HeavyTaskMessage<TResult> =
  | { type: "result"; ok: true; result: TResult }
  | { type: "result"; ok: false; error: string }
  | { type: "progress"; progress_percent: number; message: string };

export function runHeavyTaskInWorker<TResult>(
  input: HeavyTaskInput,
  onProgress?: (progress: { progress_percent: number; message: string }) => void
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
          message: message.message
        });
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
