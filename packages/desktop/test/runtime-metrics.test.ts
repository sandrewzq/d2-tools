import { describe, expect, it } from "vitest";
import {
  formatProcessMemoryBudgetStatus,
  formatRuntimeBudgetStatus,
  getRuntimeMetricSnapshot,
  measureRuntime,
  recordRuntimeMetric
} from "../src/main/runtime/runtimeMetrics";

describe("runtime performance diagnostics", () => {
  it("reports sampled budgets without making them CI timing assertions", () => {
    const suffix = `${Date.now()}-${Math.random()}`;
    recordRuntimeMetric(`custom.${suffix}`, 12, 128);
    const snapshot = getRuntimeMetricSnapshot();

    expect(snapshot[`custom.${suffix}`]).toMatchObject({
      count: 1,
      last_ms: 12,
      p95_ms: 12,
      last_payload_bytes: 128
    });
    expect(formatRuntimeBudgetStatus()).toEqual(expect.arrayContaining([
      expect.stringMatching(/本地装备详情：(未采样|达标|超预算)/),
      expect.stringMatching(/账号快照 IPC：(未采样|达标|超预算)/)
    ]));
  });

  it("records detailed metric keys without serializing the payload again", async () => {
    const suffix = `${Date.now()}-${Math.random()}`;
    const result = await measureRuntime(`aggregate.${suffix}`, async () => ({ value: "ok" }), {
      measurePayload: true,
      additionalKeys: [`detail.${suffix}`]
    });
    const snapshot = getRuntimeMetricSnapshot();

    expect(result).toEqual({ value: "ok" });
    expect(snapshot[`detail.${suffix}`]?.last_payload_bytes).toBe(
      snapshot[`aggregate.${suffix}`]?.last_payload_bytes
    );
  });

  it("compares main and renderer working sets with the documented budgets", () => {
    expect(formatProcessMemoryBudgetStatus([
      { type: "Browser", memory: { workingSetSize: 200 * 1024 } },
      { type: "Tab", memory: { workingSetSize: 500 * 1024 } }
    ])).toEqual([
      "- 主进程：达标（200 MiB / 250 MiB）",
      "- Renderer：超预算（500 MiB / 450 MiB）"
    ]);
  });
});
