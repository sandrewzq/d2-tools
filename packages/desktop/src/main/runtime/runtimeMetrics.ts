import { performance } from "node:perf_hooks";

type RuntimeMetric = {
  count: number;
  total_ms: number;
  max_ms: number;
  last_ms: number;
  last_payload_bytes?: number;
  max_payload_bytes?: number;
  samples_ms: number[];
};

export type RuntimeMetricSnapshot = Readonly<RuntimeMetric> & {
  average_ms: number;
  p95_ms: number;
};

type RuntimeBudget = {
  key: string;
  label: string;
  p95_ms?: number;
  payload_bytes?: number;
};

const metrics = new Map<string, RuntimeMetric>();
const startupMilestones = new Set<string>();
const runtimeBudgets: RuntimeBudget[] = [
  { key: "startup.window-load", label: "桌面外壳加载", p95_ms: 1_500 },
  { key: "startup.account-cache-warmup", label: "缓存账号预热", p95_ms: 1_000 },
  { key: "game-data.item-detail", label: "本地装备详情", p95_ms: 50 },
  { key: "game-data.search-items", label: "本地装备搜索", p95_ms: 100 },
  { key: "game-data.search-perks", label: "本地 Perk 搜索", p95_ms: 120 },
  { key: "account.snapshot", label: "账号快照 IPC", payload_bytes: 10 * 1024 * 1024 },
  { key: "account.item-detail", label: "账号装备详情 IPC", payload_bytes: 250 * 1024 }
];

export async function measureRuntime<TResult>(
  key: string,
  action: () => TResult | Promise<TResult>,
  options: { measurePayload?: boolean; additionalKeys?: readonly string[] } = {}
): Promise<TResult> {
  const started = performance.now();
  try {
    const result = await action();
    const durationMs = performance.now() - started;
    const payloadBytes = options.measurePayload ? jsonSize(result) : undefined;
    recordRuntimeMetric(key, durationMs, payloadBytes);
    for (const additionalKey of options.additionalKeys ?? []) {
      recordRuntimeMetric(additionalKey, durationMs, payloadBytes);
    }
    return result;
  } catch (error) {
    recordRuntimeMetric(`${key}.failed`, performance.now() - started);
    throw error;
  }
}

export function recordRuntimeMetric(key: string, durationMs: number, payloadBytes?: number): void {
  const current = metrics.get(key) ?? {
    count: 0,
    total_ms: 0,
    max_ms: 0,
    last_ms: 0,
    samples_ms: []
  };
  const samples = [...current.samples_ms, durationMs].slice(-128);
  const next: RuntimeMetric = {
    count: current.count + 1,
    total_ms: current.total_ms + durationMs,
    max_ms: Math.max(current.max_ms, durationMs),
    last_ms: durationMs,
    samples_ms: samples,
    ...(payloadBytes === undefined
      ? {
          last_payload_bytes: current.last_payload_bytes,
          max_payload_bytes: current.max_payload_bytes
        }
      : {
          last_payload_bytes: payloadBytes,
          max_payload_bytes: Math.max(current.max_payload_bytes ?? 0, payloadBytes)
        })
  };
  metrics.set(key, next);
}

export function recordStartupMilestone(key: string): void {
  if (startupMilestones.has(key)) return;
  startupMilestones.add(key);
  recordRuntimeMetric(key, performance.now());
}

export function getRuntimeMetricSnapshot(): Record<string, RuntimeMetricSnapshot> {
  return Object.fromEntries([...metrics.entries()].map(([key, metric]) => [key, {
    ...metric,
    samples_ms: [...metric.samples_ms],
    average_ms: metric.total_ms / metric.count,
    p95_ms: percentile(metric.samples_ms, 0.95)
  }]));
}

export function formatRuntimeMetrics(): string[] {
  return Object.entries(getRuntimeMetricSnapshot())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, metric]) => {
      const payload = metric.last_payload_bytes === undefined
        ? ""
        : ` / payload ${formatBytes(metric.last_payload_bytes)}（峰值 ${formatBytes(metric.max_payload_bytes ?? metric.last_payload_bytes)}）`;
      return `- ${key}：${metric.count} 次 / 最近 ${formatMs(metric.last_ms)} / 平均 ${formatMs(metric.average_ms)} / p95 ${formatMs(metric.p95_ms)} / 峰值 ${formatMs(metric.max_ms)}${payload}`;
    });
}

export function formatAccountRefreshMetrics(): string[] {
  const snapshot = getRuntimeMetricSnapshot();
  const formatStage = (label: string, key: string) => {
    const metric = snapshot[key];
    return metric
      ? `- ${label}：${metric.count} 次 / 最近 ${formatMs(metric.last_ms)} / 平均 ${formatMs(metric.average_ms)} / p95 ${formatMs(metric.p95_ms)}`
      : `- ${label}：未采样`;
  };
  const count = (key: string) => snapshot[key]?.count ?? 0;
  return [
    formatStage("OAuth", "account.refresh.oauth"),
    `${formatStage("Membership", "account.refresh.membership")} / 缓存 ${count("account.refresh.membership.cache-hit")} / in-flight 复用 ${count("account.refresh.membership.in-flight-reused")}`,
    `${formatStage("Profile", "account.refresh.profile")} / 缓存 ${count("account.refresh.profile.cache-hit")} / in-flight 复用 ${count("account.refresh.profile.in-flight-reused")} / 排队 ${count("account.refresh.profile.queued-after-in-flight")}`,
    formatStage("定义水合", "account.refresh.definition-hydration"),
    formatStage("快照构建", "account.refresh.snapshot-build"),
    formatStage("快照持久化", "account.refresh.persistence"),
    formatStage("IPC 总耗时", "account.refresh.ipc-total"),
    `- Session 快照请求：新建 ${count("account.refresh.snapshot-request.started")} / 缓存 ${count("account.refresh.snapshot-request.cache-hit")} / in-flight 复用 ${count("account.refresh.snapshot-request.in-flight-reused")} / 排队 ${count("account.refresh.snapshot-request.queued-after-in-flight")}`,
    `- Repository 请求：新建 ${count("account.refresh.repository.started")} / 缓存 ${count("account.refresh.repository.cache-hit")} / in-flight 复用 ${count("account.refresh.repository.in-flight-reused")}`,
    `- 持久化合并：${count("account.refresh.persistence.coalesced")} 次`
  ];
}

export function formatRuntimeBudgetStatus(): string[] {
  const snapshot = getRuntimeMetricSnapshot();
  return runtimeBudgets.map((budget) => {
    const metric = snapshot[budget.key];
    if (!metric) return `- ${budget.label}：未采样`;
    const violations = [
      ...(budget.p95_ms !== undefined && metric.p95_ms > budget.p95_ms
        ? [`p95 ${formatMs(metric.p95_ms)} > ${formatMs(budget.p95_ms)}`]
        : []),
      ...(budget.payload_bytes !== undefined
        && (metric.max_payload_bytes ?? metric.last_payload_bytes ?? 0) > budget.payload_bytes
        ? [`payload ${formatBytes(metric.max_payload_bytes ?? metric.last_payload_bytes ?? 0)} > ${formatBytes(budget.payload_bytes)}`]
        : [])
    ];
    return violations.length
      ? `- ${budget.label}：超预算（${violations.join("；")}）`
      : `- ${budget.label}：达标`;
  });
}

export function formatProcessMemoryBudgetStatus(
  processMetrics: Array<{ type: string; memory: { workingSetSize: number } }>
): string[] {
  const mainKiB = processMetrics
    .filter((metric) => metric.type === "Browser")
    .reduce((total, metric) => total + metric.memory.workingSetSize, 0);
  const rendererKiB = processMetrics
    .filter((metric) => metric.type === "Tab")
    .reduce((total, metric) => total + metric.memory.workingSetSize, 0);
  return [
    formatMemoryBudget("主进程", mainKiB, 250 * 1024),
    formatMemoryBudget("Renderer", rendererKiB, 450 * 1024)
  ];
}

function formatMemoryBudget(label: string, actualKiB: number, budgetKiB: number): string {
  if (!actualKiB) return `- ${label}：未采样`;
  return actualKiB <= budgetKiB
    ? `- ${label}：达标（${formatBytes(actualKiB * 1024)} / ${formatBytes(budgetKiB * 1024)}）`
    : `- ${label}：超预算（${formatBytes(actualKiB * 1024)} / ${formatBytes(budgetKiB * 1024)}）`;
}

function percentile(values: number[], ratio: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return sorted[Math.max(0, index)];
}

function jsonSize(value: unknown): number | undefined {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return undefined;
  }
}

function formatMs(value: number): string {
  return `${Math.round(value * 10) / 10} ms`;
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024 * 10) / 10} KiB`;
  return `${Math.round(value / 1024 / 1024 * 10) / 10} MiB`;
}
