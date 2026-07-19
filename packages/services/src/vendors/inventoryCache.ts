import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { VendorInventorySnapshot } from "@d2-tools/core/vendors/inventory";

export type VendorInventoryCacheContext = {
  membershipType: number;
  membershipId: string;
  characterIds: readonly string[];
  detailVendorHashes?: readonly number[];
  manifestLanguage: string;
};

export type CachedVendorInventory = {
  saved_at: string;
  snapshot: VendorInventorySnapshot;
};

type VendorInventoryCacheFile = {
  version: 1;
  entries: Record<string, CachedVendorInventory>;
};

const fileName = "vendor-inventory-cache.json";
const maxEntries = 12;
const saveQueues = new Map<string, Promise<void>>();
let temporarySequence = 0;

export function createVendorInventoryCacheKey(context: VendorInventoryCacheContext): string {
  const characterIds = [...new Set(context.characterIds)].sort();
  const detailVendorHashes = [...new Set(context.detailVendorHashes ?? [])]
    .filter((hash) => Number.isInteger(hash) && hash > 0)
    .sort((left, right) => left - right);
  return JSON.stringify([
    context.manifestLanguage,
    context.membershipType,
    context.membershipId,
    characterIds,
    detailVendorHashes
  ]);
}

export async function loadCachedVendorInventory(
  dataDir: string,
  context: VendorInventoryCacheContext
): Promise<CachedVendorInventory | null> {
  const file = await readCacheFile(dataDir);
  const exact = file.entries[createVendorInventoryCacheKey(context)];
  if (exact) return exact;
  return Object.entries(file.entries)
    .filter(([key]) => isCompatibleCacheKey(key, context))
    .map(([, cached]) => cached)
    .sort((left, right) => right.saved_at.localeCompare(left.saved_at))[0]
    ?? null;
}

export async function saveCachedVendorInventory(
  dataDir: string,
  context: VendorInventoryCacheContext,
  snapshot: VendorInventorySnapshot,
  now = new Date()
): Promise<CachedVendorInventory> {
  const cached: CachedVendorInventory = {
    saved_at: now.toISOString(),
    snapshot
  };
  const target = cachePath(dataDir);
  const previous = saveQueues.get(target) ?? Promise.resolve();
  const operation = previous.catch(() => undefined).then(async () => {
    const file = await readCacheFile(dataDir);
    file.entries[createVendorInventoryCacheKey(context)] = cached;
    file.entries = Object.fromEntries(
      Object.entries(file.entries)
        .sort(([, left], [, right]) => right.saved_at.localeCompare(left.saved_at))
        .slice(0, maxEntries)
    );
    await mkdir(dataDir, { recursive: true });
    const temporary = `${target}.tmp-${process.pid}-${Date.now()}-${temporarySequence++}`;
    try {
      await writeFile(temporary, `${JSON.stringify(file)}\n`, "utf8");
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

async function readCacheFile(dataDir: string): Promise<VendorInventoryCacheFile> {
  try {
    const parsed = JSON.parse(await readFile(cachePath(dataDir), "utf8")) as Partial<VendorInventoryCacheFile>;
    if (parsed.version !== 1 || !parsed.entries || typeof parsed.entries !== "object") {
      return emptyCacheFile();
    }
    return {
      version: 1,
      entries: Object.fromEntries(Object.entries(parsed.entries).filter((entry): entry is [string, CachedVendorInventory] => (
        typeof entry[1]?.saved_at === "string" && isVendorInventorySnapshot(entry[1]?.snapshot)
      )))
    };
  } catch {
    return emptyCacheFile();
  }
}

function emptyCacheFile(): VendorInventoryCacheFile {
  return { version: 1, entries: {} };
}

function cachePath(dataDir: string): string {
  return join(dataDir, fileName);
}

function isCompatibleCacheKey(
  key: string,
  context: VendorInventoryCacheContext
): boolean {
  try {
    const parsed = JSON.parse(key) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 5) return false;
    const [manifestLanguage, membershipType, membershipId, characterIds, detailVendorHashes] = parsed;
    if (
      manifestLanguage !== context.manifestLanguage
      || membershipType !== context.membershipType
      || membershipId !== context.membershipId
      || !Array.isArray(characterIds)
      || !Array.isArray(detailVendorHashes)
    ) return false;
    const requestedCharacterIds = [...new Set(context.characterIds)].sort();
    const cachedCharacterIds = characterIds.filter((value): value is string => typeof value === "string").sort();
    if (JSON.stringify(cachedCharacterIds) !== JSON.stringify(requestedCharacterIds)) return false;
    const cachedDetailVendorHashes = new Set(
      detailVendorHashes.filter((value): value is number => (
        typeof value === "number" && Number.isInteger(value) && value > 0
      ))
    );
    return (context.detailVendorHashes ?? [])
      .filter((hash) => Number.isInteger(hash) && hash > 0)
      .every((hash) => cachedDetailVendorHashes.has(hash));
  } catch {
    return false;
  }
}

function isVendorInventorySnapshot(value: unknown): value is VendorInventorySnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<VendorInventorySnapshot>;
  return typeof snapshot.status === "string"
    && typeof snapshot.fetchedAt === "string"
    && Array.isArray(snapshot.vendors)
    && Boolean(snapshot.characterContexts && typeof snapshot.characterContexts === "object");
}
