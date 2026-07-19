import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DailySummary } from "@d2-tools/core/daily/summary";
import type { WeeklySummary } from "@d2-tools/core/weekly/summary";

export type CachedHomeBriefingValue = {
  fetched_at: string;
  daily: DailySummary;
  weekly: WeeklySummary;
};

export type CachedHomeBriefing = {
  version: 1;
  account_id?: string;
  manifest_language: string;
  saved_at: string;
  briefing: CachedHomeBriefingValue;
};

export type HomeBriefingCacheOptions = {
  accountId?: string;
  manifestLanguage: string;
};

const fileName = "home-briefing-cache.json";
const saveQueues = new Map<string, Promise<void>>();
let temporarySequence = 0;

export async function loadCachedHomeBriefing(
  dataDir: string,
  options: HomeBriefingCacheOptions
): Promise<CachedHomeBriefing | null> {
  try {
    const parsed = JSON.parse(await readFile(cachePath(dataDir), "utf8")) as Partial<CachedHomeBriefing>;
    if (parsed.version !== 1
      || parsed.account_id !== options.accountId
      || parsed.manifest_language !== options.manifestLanguage
      || typeof parsed.saved_at !== "string"
      || !isHomeBriefing(parsed.briefing)) {
      return null;
    }
    return parsed as CachedHomeBriefing;
  } catch {
    return null;
  }
}

export async function saveCachedHomeBriefing(
  dataDir: string,
  briefing: CachedHomeBriefingValue,
  options: HomeBriefingCacheOptions,
  now = new Date()
): Promise<CachedHomeBriefing> {
  const cached: CachedHomeBriefing = {
    version: 1,
    ...(options.accountId ? { account_id: options.accountId } : {}),
    manifest_language: options.manifestLanguage,
    saved_at: now.toISOString(),
    briefing
  };
  const target = cachePath(dataDir);
  const previous = saveQueues.get(target) ?? Promise.resolve();
  const operation = previous.catch(() => undefined).then(async () => {
    await mkdir(dataDir, { recursive: true });
    const temporary = `${target}.tmp-${process.pid}-${Date.now()}-${temporarySequence++}`;
    try {
      await writeFile(temporary, `${JSON.stringify(cached)}\n`, "utf8");
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
  return cached;
}

function cachePath(dataDir: string): string {
  return join(dataDir, fileName);
}

function isHomeBriefing(value: unknown): value is CachedHomeBriefingValue {
  if (!value || typeof value !== "object") return false;
  const briefing = value as Partial<CachedHomeBriefingValue>;
  return typeof briefing.fetched_at === "string"
    && isRecord(briefing.daily)
    && isRecord(briefing.weekly);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
