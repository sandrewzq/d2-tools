import { Worker } from "node:worker_threads";
import type { RecommendationImportProgress } from "@d2-tools/core/community-perks";
import type { RecommendationImportTarget } from "@d2-tools/services/community/recommendationDocumentStore";
import type { WeaponKnowledgeImportPreview, WeaponKnowledgeImportResult } from "@d2-tools/services/community/weaponRecommendationKnowledge";

export type RecommendationImportWorkerInput = {
  data_dir: string;
  manifest_language: string;
  manifest_version: string;
  path: string;
};

type WorkerMessage = {
  progress?: RecommendationImportProgress;
  preview?: WeaponKnowledgeImportPreview;
  result?: WeaponKnowledgeImportResult;
  error?: string;
};

/** 每个窗口独占一份预览；大定义池只存在 Worker 内。 */
export class RecommendationImportSession {
  readonly preview: Promise<WeaponKnowledgeImportPreview>;
  private readonly worker: Worker;
  private readonly cancellation = new Int32Array(new SharedArrayBuffer(4));
  private state: "previewing" | "ready" | "confirming" | "closed" = "previewing";
  private rejectPending: (error: Error) => void = () => {};
  private resolveImport?: (result: WeaponKnowledgeImportResult) => void;
  private timer?: ReturnType<typeof setTimeout>;

  constructor(input: RecommendationImportWorkerInput, private readonly onProgress: (value: RecommendationImportProgress) => void) {
    this.worker = new Worker(new URL("../workers/recommendationImportWorker.js", import.meta.url), {
      workerData: { ...input, cancellation: this.cancellation.buffer }
    });
    this.preview = new Promise((resolve, reject) => {
      this.rejectPending = reject;
      this.worker.on("message", (message: WorkerMessage) => {
        if (this.state === "closed") return;
        if (message.progress) this.onProgress(message.progress);
        if (message.error) { this.fail(new Error(message.error)); return; }
        if (message.preview && this.state === "previewing") {
          this.state = "ready";
          this.resetTimeout();
          resolve(message.preview);
        }
        if (message.result && this.state === "confirming") {
          this.resolveImport?.(message.result);
          this.finish();
        }
      });
    });
    this.worker.once("error", (error) => this.fail(error));
    this.worker.once("exit", () => {
      if (this.state !== "closed") this.fail(new Error("推荐导入任务已退出，请重新选择文件。"));
    });
    this.resetTimeout();
  }

  confirm(target: RecommendationImportTarget): Promise<WeaponKnowledgeImportResult> {
    if (this.state !== "ready") return Promise.reject(new Error("推荐预览已失效或正在导入，请重新选择文件。"));
    this.state = "confirming";
    this.resetTimeout();
    return new Promise((resolve, reject) => {
      this.resolveImport = resolve;
      this.rejectPending = reject;
      this.worker.postMessage(target);
    });
  }

  cancel(): boolean {
    if (this.state === "closed") return true;
    if (Atomics.compareExchange(this.cancellation, 0, 0, 1) !== 0) return false;
    this.onProgress({ phase: "cancelled", cancellable: false });
    this.rejectPending(new Error("已取消导入，当前数据未更改。"));
    this.finish();
    void this.worker.terminate();
    return true;
  }

  private resetTimeout(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      // 事务已开始时必须等它结束，不能把“已取消”回报给用户。
      if (Atomics.compareExchange(this.cancellation, 0, 0, 1) !== 0) return;
      this.fail(new Error("推荐导入任务已过期，请重新选择文件。"));
      void this.worker.terminate();
    }, 10 * 60_000);
    this.timer.unref();
  }

  private fail(error: Error): void {
    if (this.state === "closed") return;
    this.onProgress({ phase: "failed", cancellable: false });
    this.rejectPending(error);
    this.finish();
  }

  private finish(): void {
    this.state = "closed";
    clearTimeout(this.timer);
  }
}
