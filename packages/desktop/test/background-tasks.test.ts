import { describe, expect, it } from "vitest";
import { createBackgroundTaskStore } from "../src/shared/backgroundTasks";

describe("background task store", () => {
  it("keeps a single running task per type so menu switches cannot start duplicates", () => {
    const store = createBackgroundTaskStore({
      now: () => new Date("2026-06-29T00:00:00.000Z")
    });
    const first = store.startTask({
      type: "manifest-update",
      title: "更新资料库",
      run: () => new Promise<void>(() => {
        // Keep the task running for the singleton assertion.
      })
    });
    const second = store.startTask({
      type: "manifest-update",
      title: "更新资料库",
      run: async () => {
        throw new Error("should not start a duplicate task");
      }
    });

    expect(second.task_id).toBe(first.task_id);
    expect(store.getTask(first.task_id)?.status).toBe("running");
    expect(store.listTasks()).toHaveLength(1);
  });

  it("keeps different long-running task types visible at the same time", () => {
    const store = createBackgroundTaskStore({
      now: () => new Date("2026-06-29T00:00:00.000Z")
    });
    const manifestTask = store.startTask({
      type: "manifest-update",
      title: "更新资料库",
      run: () => new Promise<void>(() => {})
    });
    const accountTask = store.startTask({
      type: "account-sync",
      title: "读取账号数据",
      run: () => new Promise<void>(() => {})
    });
    const activityTask = store.startTask({
      type: "account-activity",
      title: "读取最近活动",
      run: () => new Promise<void>(() => {})
    });

    expect(new Set([manifestTask.task_id, accountTask.task_id, activityTask.task_id]).size).toBe(3);
    expect(store.listTasks().filter((task) => task.status === "running")).toHaveLength(3);
  });

  it("moves failed retryable tasks into retrying with the next retry time", async () => {
    const scheduled: Array<{ delayMs: number }> = [];
    const store = createBackgroundTaskStore({
      now: () => new Date("2026-06-29T00:00:00.000Z"),
      schedule: (_callback, delayMs) => {
        scheduled.push({ delayMs });
      }
    });

    const snapshot = store.startTask({
      type: "app-update-check",
      title: "检查应用更新",
      retryDelaysMs: [30_000],
      run: async () => {
        throw new Error("network failed");
      }
    });
    await Promise.resolve();
    await Promise.resolve();

    const failed = store.getTask(snapshot.task_id);
    expect(failed?.status).toBe("retrying");
    expect(failed?.attempt).toBe(1);
    expect(failed?.next_retry_at).toBe("2026-06-29T00:00:30.000Z");
    expect(failed?.error).toBe("network failed");
    expect(scheduled).toEqual([{ delayMs: 30_000 }]);
  });

  it("can keep retrying with the last finite delay when the retry policy is open ended", async () => {
    const scheduled: Array<{ callback: () => void; delayMs: number }> = [];
    let currentTime = new Date("2026-06-29T00:00:00.000Z").getTime();
    const store = createBackgroundTaskStore({
      now: () => new Date(currentTime),
      schedule: (callback, delayMs) => {
        scheduled.push({ callback, delayMs });
      }
    });

    const snapshot = store.startTask({
      type: "app-update-check",
      title: "检查应用更新",
      retryDelaysMs: [30_000, Number.POSITIVE_INFINITY],
      run: async () => {
        throw new Error("network failed");
      }
    });
    await Promise.resolve();
    await Promise.resolve();
    currentTime += 30_000;
    scheduled[0].callback();
    await Promise.resolve();
    await Promise.resolve();

    const retrying = store.getTask(snapshot.task_id);
    expect(retrying?.status).toBe("retrying");
    expect(retrying?.attempt).toBe(2);
    expect(retrying?.next_retry_at).toBe("2026-06-29T00:01:00.000Z");
    expect(scheduled.map((entry) => entry.delayMs)).toEqual([30_000, 30_000]);
  });
});
