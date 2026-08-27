/** Lightweight process-local counters for account cache diagnostics. */
export type AccountCacheResource = "snapshot" | "item-detail";
export type AccountCacheMetricKind = "hit" | "miss" | "stale" | "refresh" | "error";
export type AccountCacheMetricCounts = Record<AccountCacheMetricKind, number>;
export type AccountCacheMetrics = {
  generated_at: string;
  snapshot: AccountCacheMetricCounts;
  item_detail: AccountCacheMetricCounts;
  total: AccountCacheMetricCounts;
};

const kinds: readonly AccountCacheMetricKind[] = ["hit", "miss", "stale", "refresh", "error"];
const counters: Record<AccountCacheResource | "total", AccountCacheMetricCounts> = {
  snapshot: emptyCounts(),
  "item-detail": emptyCounts(),
  total: emptyCounts()
};

export function recordAccountCacheMetric(
  resource: AccountCacheResource,
  kind: AccountCacheMetricKind
): void {
  counters[resource][kind] += 1;
  counters.total[kind] += 1;
}

export function getAccountCacheMetrics(): AccountCacheMetrics {
  return {
    generated_at: new Date().toISOString(),
    snapshot: { ...counters.snapshot },
    item_detail: { ...counters["item-detail"] },
    total: { ...counters.total }
  };
}

export function resetAccountCacheMetrics(): void {
  for (const resource of ["snapshot", "item-detail", "total"] as const) {
    for (const kind of kinds) counters[resource][kind] = 0;
  }
}

export function formatAccountCacheMetrics(metrics = getAccountCacheMetrics()): string[] {
  const format = (label: string, counts: AccountCacheMetricCounts) => {
    const lookups = counts.hit + counts.miss;
    const hitRate = lookups ? `${Math.round(counts.hit / lookups * 100)}%` : "-";
    return `- ${label}：命中率 ${hitRate}（命中 ${counts.hit} / 未命中 ${counts.miss}）/ 过期 ${counts.stale} / 刷新 ${counts.refresh} / 错误 ${counts.error}`;
  };
  return [
    `采样时间：${metrics.generated_at}`,
    format("账号快照", metrics.snapshot),
    format("装备详情", metrics.item_detail),
    format("合计", metrics.total)
  ];
}

function emptyCounts(): AccountCacheMetricCounts {
  return { hit: 0, miss: 0, stale: 0, refresh: 0, error: 0 };
}
