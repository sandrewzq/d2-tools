import { Worker } from "node:worker_threads";

export type HeavyTaskInput =
  | { task: "manifest-update" }
  | { task: "account-summary" };

type HeavyTaskMessage<TResult> =
  | { ok: true; result: TResult }
  | { ok: false; error: string };

export function runHeavyTaskInWorker<TResult>(input: HeavyTaskInput): Promise<TResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./heavyTaskWorker.js", import.meta.url), {
      workerData: input
    });

    worker.once("message", (message: HeavyTaskMessage<TResult>) => {
      if (message.ok) {
        resolve(message.result);
        return;
      }
      reject(new Error(message.error));
    });
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`后台 worker 异常退出：${code}`));
      }
    });
  });
}
