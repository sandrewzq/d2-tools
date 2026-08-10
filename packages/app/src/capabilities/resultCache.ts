import type { AnyAssistantCapabilityResult } from "./contracts.js";

export type AssistantCapabilityResultCache = {
  get(resultId: string): AnyAssistantCapabilityResult | undefined;
  set(result: AnyAssistantCapabilityResult): void;
  list(limit?: number): AnyAssistantCapabilityResult[];
  delete(resultId: string): boolean;
  clear(): void;
};

export type CreateAssistantCapabilityResultCacheOptions = {
  maxEntries?: number;
};

export function createAssistantCapabilityResultCache(
  options: CreateAssistantCapabilityResultCacheOptions = {}
): AssistantCapabilityResultCache {
  const maxEntries = normalizeMaxEntries(options.maxEntries);
  const entries = new Map<string, AnyAssistantCapabilityResult>();

  return {
    get(resultId) {
      const result = entries.get(resultId);
      return result ? structuredClone(result) : undefined;
    },

    set(result) {
      entries.delete(result.result_id);
      entries.set(result.result_id, structuredClone(result));
      while (entries.size > maxEntries) {
        const oldestResultId = entries.keys().next().value as string | undefined;
        if (!oldestResultId) break;
        entries.delete(oldestResultId);
      }
    },

    list(limit) {
      const count = normalizeListLimit(limit, entries.size);
      return [...entries.values()]
        .reverse()
        .slice(0, count)
        .map((result) => structuredClone(result));
    },

    delete(resultId) {
      return entries.delete(resultId);
    },

    clear() {
      entries.clear();
    }
  };
}

function normalizeMaxEntries(value: number | undefined): number {
  if (!Number.isFinite(value)) return 100;
  return Math.min(500, Math.max(1, Math.trunc(value!)));
}

function normalizeListLimit(value: number | undefined, size: number): number {
  if (!Number.isFinite(value)) return size;
  return Math.min(size, Math.max(0, Math.trunc(value!)));
}

