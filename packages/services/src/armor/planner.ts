import { createHash } from "node:crypto";
import {
  type ArmorAcquisitionPlanRequest,
  type ArmorAcquisitionPlanResult,
  type ArmorOwnedPlanRequest,
  type ArmorOwnedPlanResult,
  type ArmorTheoreticalPlanRequest,
  type ArmorTheoreticalPlanResult,
  type ArmorUpgradePlanRequest,
  type ArmorUpgradePlanResult
} from "@d2-tools/core/armor";

export type ArmorPlannerJob =
  | { mode: "theoretical"; request: ArmorTheoreticalPlanRequest }
  | { mode: "owned"; request: ArmorOwnedPlanRequest }
  | { mode: "acquisition"; request: ArmorAcquisitionPlanRequest }
  | { mode: "upgrade"; request: ArmorUpgradePlanRequest };

export type ArmorPlannerJobResult<Job extends ArmorPlannerJob = ArmorPlannerJob> =
  Job extends { mode: "theoretical" } ? ArmorTheoreticalPlanResult
    : Job extends { mode: "owned" } ? ArmorOwnedPlanResult
      : Job extends { mode: "acquisition" } ? ArmorAcquisitionPlanResult
        : Job extends { mode: "upgrade" } ? ArmorUpgradePlanResult
          : never;

export type ArmorPlannerSourceRevision = {
  account?: string;
  manifest?: string;
  ruleset: string;
};

export type ArmorPlannerRunRequest<Job extends ArmorPlannerJob = ArmorPlannerJob> = {
  scope_id: string;
  revision: number;
  sources: ArmorPlannerSourceRevision;
  job: Job;
};

export type ArmorPlannerRunResult<Job extends ArmorPlannerJob = ArmorPlannerJob> = {
  status: "current" | "stale";
  scope_id: string;
  revision: number;
  result_id: string;
  cache_key: string;
  from_cache: boolean;
  checked_at: string;
  expires_at: string;
  result: ArmorPlannerJobResult<Job>;
};

export type ArmorPlannerWorkerRunner = {
  run<Job extends ArmorPlannerJob>(job: Job): Promise<ArmorPlannerJobResult<Job>>;
  close?(): void | Promise<void>;
};

export type ArmorPlannerService = {
  plan<Job extends ArmorPlannerJob>(
    request: ArmorPlannerRunRequest<Job>
  ): Promise<ArmorPlannerRunResult<Job>>;
  latestRevision(scopeId: string): number | undefined;
  invalidate(scopeId?: string): void;
  dispose(): Promise<void>;
};

export type CreateArmorPlannerServiceOptions = {
  runner: ArmorPlannerWorkerRunner;
  now?: () => number;
  cacheTtlMs?: number;
  maxCacheEntries?: number;
};

type CacheEntry = {
  result: ArmorPlannerJobResult;
  checkedAt: string;
  expiresAt: number;
};

type ScopeRevision = {
  revision: number;
  cacheKey: string;
};

export class ArmorPlannerStaleRevisionError extends Error {
  readonly code = "armor_planner_stale_revision";

  constructor(
    readonly scopeId: string,
    readonly requestedRevision: number,
    readonly latestRevision: number
  ) {
    super(`Armor planner revision ${requestedRevision} is stale; latest is ${latestRevision}`);
    this.name = "ArmorPlannerStaleRevisionError";
  }
}

export function createArmorPlannerService(
  options: CreateArmorPlannerServiceOptions
): ArmorPlannerService {
  const now = options.now ?? Date.now;
  const cacheTtlMs = normalizePositiveInteger(options.cacheTtlMs, 10 * 60_000);
  const maxCacheEntries = normalizePositiveInteger(options.maxCacheEntries, 16);
  const cache = new Map<string, CacheEntry>();
  const inFlight = new Map<string, Promise<CacheEntry>>();
  const latestByScope = new Map<string, ScopeRevision>();
  let disposed = false;

  return {
    async plan<Job extends ArmorPlannerJob>(
      request: ArmorPlannerRunRequest<Job>
    ): Promise<ArmorPlannerRunResult<Job>> {
      assertNotDisposed();
      const scopeId = normalizeScopeId(request.scope_id);
      const revision = normalizeRevision(request.revision);
      const cacheKey = createArmorPlannerCacheKey(request.sources, request.job);
      registerRevision(scopeId, revision, cacheKey);

      const cached = readCache(cacheKey);
      if (cached) {
        return envelope(scopeId, revision, cacheKey, true, cached as CacheEntry & { result: ArmorPlannerJobResult<Job> });
      }

      let calculation = inFlight.get(cacheKey);
      if (!calculation) {
        calculation = Promise.resolve(options.runner.run(request.job))
          .then((result) => {
            const checkedAt = now();
            return {
              result,
              checkedAt: new Date(checkedAt).toISOString(),
              expiresAt: checkedAt + cacheTtlMs
            };
          })
          .finally(() => {
            if (inFlight.get(cacheKey) === calculation) inFlight.delete(cacheKey);
          });
        inFlight.set(cacheKey, calculation);
      }
      const entry = await calculation as CacheEntry & { result: ArmorPlannerJobResult<Job> };
      const current = isCurrent(scopeId, revision, cacheKey);
      if (current) writeCache(cacheKey, entry);
      return envelope(scopeId, revision, cacheKey, false, entry, current ? "current" : "stale");
    },

    latestRevision(scopeId: string): number | undefined {
      return latestByScope.get(scopeId.trim())?.revision;
    },

    invalidate(scopeId?: string): void {
      if (scopeId === undefined) {
        latestByScope.clear();
        cache.clear();
        return;
      }
      latestByScope.delete(scopeId.trim());
    },

    async dispose(): Promise<void> {
      if (disposed) return;
      disposed = true;
      latestByScope.clear();
      cache.clear();
      inFlight.clear();
      await options.runner.close?.();
    }
  };

  function registerRevision(scopeId: string, revision: number, cacheKey: string): void {
    const latest = latestByScope.get(scopeId);
    if (latest && revision < latest.revision) {
      throw new ArmorPlannerStaleRevisionError(scopeId, revision, latest.revision);
    }
    if (latest && revision === latest.revision && latest.cacheKey !== cacheKey) {
      throw new Error(`Armor planner revision ${revision} was reused with different input`);
    }
    if (!latest || revision > latest.revision) {
      latestByScope.set(scopeId, { revision, cacheKey });
    }
  }

  function isCurrent(scopeId: string, revision: number, cacheKey: string): boolean {
    const latest = latestByScope.get(scopeId);
    return latest?.revision === revision && latest.cacheKey === cacheKey;
  }

  function readCache(cacheKey: string): CacheEntry | undefined {
    const entry = cache.get(cacheKey);
    if (!entry) return undefined;
    if (entry.expiresAt <= now()) {
      cache.delete(cacheKey);
      return undefined;
    }
    cache.delete(cacheKey);
    cache.set(cacheKey, entry);
    return entry;
  }

  function writeCache(cacheKey: string, entry: CacheEntry): void {
    cache.delete(cacheKey);
    cache.set(cacheKey, entry);
    while (cache.size > maxCacheEntries) {
      const oldestKey = cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      cache.delete(oldestKey);
    }
  }

  function assertNotDisposed(): void {
    if (disposed) throw new Error("Armor planner service is disposed");
  }
}

export function createArmorPlannerCacheKey(
  sources: ArmorPlannerSourceRevision,
  job: ArmorPlannerJob
): string {
  const digest = createHash("sha256")
    .update(JSON.stringify(canonicalize({ sources, job })))
    .digest("hex");
  return `armor:${job.mode}:${digest}`;
}

export function createArmorPlannerResultId(cacheKey: string): string {
  const normalized = cacheKey.trim();
  return normalized.startsWith("armor:")
    ? `armor-result:${normalized.slice("armor:".length)}`
    : `armor-result:${createHash("sha256").update(normalized).digest("hex")}`;
}

function envelope<Job extends ArmorPlannerJob>(
  scopeId: string,
  revision: number,
  cacheKey: string,
  fromCache: boolean,
  entry: CacheEntry & { result: ArmorPlannerJobResult<Job> },
  status: ArmorPlannerRunResult<Job>["status"] = "current"
): ArmorPlannerRunResult<Job> {
  return {
    status,
    scope_id: scopeId,
    revision,
    result_id: createArmorPlannerResultId(cacheKey),
    cache_key: cacheKey,
    from_cache: fromCache,
    checked_at: entry.checkedAt,
    expires_at: new Date(entry.expiresAt).toISOString(),
    result: entry.result
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") {
    return typeof value === "number" && !Number.isFinite(value) ? String(value) : value;
  }
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => [key, canonicalize(entry)]));
}

function normalizeScopeId(value: string): string {
  const scopeId = value.trim();
  if (!scopeId) throw new Error("Armor planner scope_id is required");
  return scopeId;
}

function normalizeRevision(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Armor planner revision must be a non-negative integer");
  }
  return value;
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && value! > 0 ? value! : fallback;
}
