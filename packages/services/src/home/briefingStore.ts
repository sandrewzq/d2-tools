import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DailySummary } from "@d2-tools/core/daily/summary";
import type { WeeklySummary } from "@d2-tools/core/weekly/summary";

export type CachedHomeBriefing = {
  version: 4;
  context_key: string;
  saved_at: string;
  fetched_at: string;
  daily_period_key: string;
  weekly_period_key: string;
  xur_period_key: string;
  xur_refresh_at?: string;
  daily: DailySummary;
  weekly: WeeklySummary;
};

const fileName = "home-briefing-cache.json";
const saveQueues = new Map<string, Promise<void>>();
let temporarySequence = 0;

export async function loadCachedHomeBriefing(
  dataDir: string,
  contextKey: string
): Promise<CachedHomeBriefing | null> {
  try {
    const parsed = JSON.parse(await readFile(cachePath(dataDir), "utf8")) as Partial<CachedHomeBriefing>;
    if (parsed.version !== 4
      || parsed.context_key !== contextKey
      || !parsed.saved_at
      || !parsed.fetched_at
      || !parsed.daily_period_key
      || !parsed.weekly_period_key
      || !parsed.xur_period_key
      || !isDailySummary(parsed.daily)
      || !isWeeklySummary(parsed.weekly)) {
      return null;
    }
    return parsed as CachedHomeBriefing;
  } catch {
    return null;
  }
}

export async function saveCachedHomeBriefing(
  dataDir: string,
  value: CachedHomeBriefing
): Promise<void> {
  const target = cachePath(dataDir);
  const previous = saveQueues.get(target) ?? Promise.resolve();
  const operation = previous.catch(() => undefined).then(async () => {
    await mkdir(dataDir, { recursive: true });
    const temporary = `${target}.tmp-${process.pid}-${Date.now()}-${temporarySequence++}`;
    try {
      await writeFile(temporary, `${JSON.stringify(value)}\n`, "utf8");
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true }).catch(() => undefined);
    }
  });
  const tail = operation.then(() => undefined, () => undefined);
  saveQueues.set(target, tail);
  try {
    await operation;
  } finally {
    if (saveQueues.get(target) === tail) saveQueues.delete(target);
  }
}

function cachePath(dataDir: string): string {
  return join(dataDir, fileName);
}

function isDailySummary(value: unknown): value is DailySummary {
  if (!value || typeof value !== "object") return false;
  const summary = value as Partial<DailySummary>;
  return Boolean(summary.daily_reset?.next_reset_iso)
    && Boolean(summary.weekly_reset?.next_reset_iso)
    && Boolean(summary.sources?.vendors)
    && Boolean(summary.sources?.lost_sector);
}

function isWeeklySummary(value: unknown): value is WeeklySummary {
  if (!value || typeof value !== "object") return false;
  const summary = value as Partial<WeeklySummary>;
  return Boolean(summary.weekly_reset?.next_reset_iso)
    && Boolean(summary.priorities?.nightfall)
    && Boolean(summary.iron_banner)
    && Array.isArray(summary.public_clues);
}
