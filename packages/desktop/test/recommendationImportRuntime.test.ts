import { beforeEach, describe, expect, it, vi } from "vitest";

const workers = vi.hoisted(() => [] as Array<{
  emit: (event: string, value?: unknown) => void;
  cancellation: Int32Array;
  terminate: ReturnType<typeof vi.fn>;
  postMessage: ReturnType<typeof vi.fn>;
}>);
vi.mock("node:worker_threads", async () => {
  const { EventEmitter } = await import("node:events");
  return { Worker: class extends EventEmitter {
    cancellation: Int32Array;
    terminate = vi.fn(async () => 0);
    postMessage = vi.fn();
    constructor(_url: URL, options: { workerData: { cancellation: SharedArrayBuffer } }) {
      super();
      this.cancellation = new Int32Array(options.workerData.cancellation);
      workers.push(this);
    }
  } };
});
import { RecommendationImportSession } from "../src/main/runtime/recommendationImportRuntime.js";

const input = { data_dir: "/isolated", manifest_language: "zh-chs", manifest_version: "test", path: "/isolated/table.csv" };
const target = { name: "测试来源", mode: "create" as const };
beforeEach(() => { workers.length = 0; });

describe("CSV 导入会话的取消与保存边界", () => {
  it("校验期间取消会结束等待并终止 Worker", async () => {
    const progress = vi.fn();
    const session = new RecommendationImportSession(input, progress);
    const rejected = expect(session.preview).rejects.toThrow("已取消");
    expect(session.cancel()).toBe(true);
    await rejected;
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(Atomics.load(workers[0].cancellation, 0)).toBe(1);
  });

  it("预览只能确认一次；取消写入准备不会发送第二次导入", async () => {
    const session = new RecommendationImportSession(input, vi.fn());
    workers[0].emit("message", { preview: { importable_recommendation_count: 1 } });
    await session.preview;
    const first = session.confirm(target);
    const rejected = expect(first).rejects.toThrow("已取消");
    await expect(session.confirm(target)).rejects.toThrow("正在导入");
    expect(session.cancel()).toBe(true);
    await rejected;
    expect(workers[0].postMessage).toHaveBeenCalledTimes(1);
  });

  it("进入保存事务后拒绝取消，并正常返回提交结果", async () => {
    const session = new RecommendationImportSession(input, vi.fn());
    workers[0].emit("message", { preview: { importable_recommendation_count: 1 } });
    await session.preview;
    const saved = session.confirm(target);
    expect(Atomics.compareExchange(workers[0].cancellation, 0, 0, 2)).toBe(0);
    expect(session.cancel()).toBe(false);
    expect(workers[0].terminate).not.toHaveBeenCalled();
    workers[0].emit("message", { result: { imported_row_count: 1 } });
    await expect(saved).resolves.toEqual({ imported_row_count: 1 });
  });

  it("Worker 异常退出会结束等待，不留下永远忙碌的界面", async () => {
    const session = new RecommendationImportSession(input, vi.fn());
    const rejected = expect(session.preview).rejects.toThrow("已退出");
    workers[0].emit("exit", 1);
    await rejected;
  });
});
