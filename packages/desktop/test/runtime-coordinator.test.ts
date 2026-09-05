import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadConfig: vi.fn(),
  recoverSqliteManifest: vi.fn(),
  warmAccountSession: vi.fn(),
  getAccountSnapshot: vi.fn(),
  resetAccountSession: vi.fn(),
  resetSharedBungieSession: vi.fn(),
  verifyGameDataRuntime: vi.fn(),
  closeGameDataRuntime: vi.fn(),
  resumeGameDataRuntime: vi.fn(),
  getHomeBriefing: vi.fn()
}));

vi.mock("@d2-tools/services/config/store", () => ({ loadConfig: mocks.loadConfig }));
vi.mock("@d2-tools/services/manifest/lifecycle", () => ({
  recoverSqliteManifest: mocks.recoverSqliteManifest
}));
vi.mock("../src/main/runtime/accountSession.js", () => ({
  warmAccountSession: mocks.warmAccountSession,
  getAccountSnapshot: mocks.getAccountSnapshot,
  resetAccountSession: mocks.resetAccountSession
}));
vi.mock("../src/main/runtime/bungieSession.js", () => ({
  resetSharedBungieSession: mocks.resetSharedBungieSession
}));
vi.mock("../src/main/runtime/gameDataRuntime.js", () => ({
  verifyGameDataRuntime: mocks.verifyGameDataRuntime,
  closeGameDataRuntime: mocks.closeGameDataRuntime,
  resumeGameDataRuntime: mocks.resumeGameDataRuntime
}));
vi.mock("../src/main/runtime/homeBriefing.js", () => ({
  getHomeBriefing: mocks.getHomeBriefing
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.loadConfig.mockReturnValue({
    data: { data_dir: "D:/data", manifest_language: "zh-chs" }
  });
  mocks.verifyGameDataRuntime.mockResolvedValue(undefined);
  mocks.warmAccountSession.mockResolvedValue(true);
  mocks.getAccountSnapshot.mockResolvedValue({});
  mocks.closeGameDataRuntime.mockResolvedValue(undefined);
  mocks.getHomeBriefing.mockResolvedValue(homeBriefing());
});

describe("runtime coordinator", () => {
  it("按恢复、SQLite、账号缓存、首页刷新的顺序执行且并发调用去重", async () => {
    const order: string[] = [];
    mocks.recoverSqliteManifest.mockImplementation(() => { order.push("recover"); });
    mocks.verifyGameDataRuntime.mockImplementation(async () => { order.push("sqlite"); });
    mocks.warmAccountSession.mockImplementation(async () => { order.push("account-cache"); return true; });
    mocks.getHomeBriefing.mockImplementation(async () => { order.push("home-refresh"); return homeBriefing(); });
    const coordinator = await import("../src/main/runtime/runtimeCoordinator.js");

    const first = coordinator.warmRuntimeInBackground();
    const second = coordinator.warmRuntimeInBackground();

    expect(second).toBe(first);
    await first;
    expect(order).toEqual([
      "recover",
      "sqlite",
      "account-cache",
      "home-refresh"
    ]);
    expect(mocks.verifyGameDataRuntime).toHaveBeenCalledTimes(1);
    expect(mocks.warmAccountSession).toHaveBeenCalledTimes(1);
    expect(mocks.getAccountSnapshot).not.toHaveBeenCalled();
  });

  it("前台 HomeBriefing 与后台 warmup 共享同一个请求", async () => {
    let resolveHome!: (value: ReturnType<typeof homeBriefing>) => void;
    mocks.getHomeBriefing.mockReturnValue(new Promise((resolve) => { resolveHome = resolve; }));
    const coordinator = await import("../src/main/runtime/runtimeCoordinator.js");

    const warmup = coordinator.warmRuntimeInBackground();
    await waitForCall(mocks.getHomeBriefing);
    const foreground = coordinator.getCoordinatedHomeBriefing();
    await new Promise<void>((resolve) => setImmediate(resolve));
    resolveHome(homeBriefing());

    await expect(foreground).resolves.toEqual(homeBriefing());
    await warmup;
    expect(mocks.getHomeBriefing).toHaveBeenCalledTimes(1);
  });

  it("Manifest 切换后使旧阶段失效并重新 warmup", async () => {
    const coordinator = await import("../src/main/runtime/runtimeCoordinator.js");
    await coordinator.warmRuntimeInBackground();

    await coordinator.quiesceRuntimeForManifestActivation();
    coordinator.resumeRuntimeAfterManifestActivation();
    await waitForCallCount(mocks.verifyGameDataRuntime, 2);

    expect(mocks.closeGameDataRuntime).toHaveBeenCalledTimes(1);
    expect(mocks.resumeGameDataRuntime).toHaveBeenCalledTimes(1);
    expect(mocks.verifyGameDataRuntime).toHaveBeenCalledTimes(2);
  });
});

function homeBriefing() {
  return {
    fetched_at: "2026-01-01T00:00:00.000Z",
    daily: {},
    weekly: {}
  };
}

async function waitForCall(mock: ReturnType<typeof vi.fn>): Promise<void> {
  await waitForCallCount(mock, 1);
}

async function waitForCallCount(mock: ReturnType<typeof vi.fn>, count: number): Promise<void> {
  for (let attempt = 0; attempt < 20 && mock.mock.calls.length < count; attempt += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  expect(mock).toHaveBeenCalledTimes(count);
}
