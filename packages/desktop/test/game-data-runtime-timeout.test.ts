import { afterEach, describe, expect, it, vi } from "vitest";

const workerMocks = vi.hoisted(() => ({
  created: 0,
  postMessage: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  terminate: vi.fn(async () => 0)
}));

vi.mock("node:worker_threads", () => ({
  Worker: class {
    constructor() {
      workerMocks.created += 1;
    }

    postMessage = workerMocks.postMessage;
    on = workerMocks.on.mockReturnValue(this);
    once = workerMocks.once.mockReturnValue(this);
    terminate = workerMocks.terminate;
  }
}));

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  workerMocks.created = 0;
});

describe("game data runtime request timeout", () => {
  it("replaces a worker after consecutive request timeouts", async () => {
    vi.useFakeTimers();
    const { getGameDataCatalog } = await import("../src/main/runtime/gameDataRuntime.js");

    const firstRequest = getGameDataCatalog().searchItems({ query: "first" });
    const firstRejection = expect(firstRequest).rejects.toThrow("资料库查询超时：searchItems");
    await vi.advanceTimersByTimeAsync(15_000);
    await firstRejection;

    const secondRequest = getGameDataCatalog().searchItems({ query: "second" });
    const secondRejection = expect(secondRequest).rejects.toThrow("资料库查询超时：searchItems");
    await vi.advanceTimersByTimeAsync(15_000);
    await secondRejection;

    const thirdRequest = getGameDataCatalog().searchItems({ query: "third" });
    const thirdRejection = expect(thirdRequest).rejects.toThrow("资料库查询超时：searchItems");
    await vi.advanceTimersByTimeAsync(15_000);
    await thirdRejection;

    expect(workerMocks.created).toBe(2);
    expect(workerMocks.terminate).toHaveBeenCalledTimes(1);
    expect(workerMocks.postMessage).toHaveBeenCalledTimes(3);
  });
});
