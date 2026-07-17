import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AccountSnapshot } from "@d2-tools/core/account/summary";

export type CachedAccountSnapshot = {
  version: 2;
  account_id?: string;
  saved_at: string;
  snapshot: AccountSnapshot;
};

export type AccountSnapshotCacheOptions = {
  accountId?: string;
};

const fileName = "account-snapshot-cache.json";
const saveQueues = new Map<string, Promise<void>>();
let temporarySequence = 0;

export async function loadCachedAccountSnapshot(
  dataDir: string,
  options: AccountSnapshotCacheOptions = {}
): Promise<CachedAccountSnapshot | null> {
  try {
    const parsed = JSON.parse(await readFile(snapshotPath(dataDir), "utf8")) as Partial<CachedAccountSnapshot>;
    if (parsed.version !== 2
      || !parsed.saved_at
      || !isAccountSnapshot(parsed.snapshot)
      || (options.accountId !== undefined && parsed.account_id !== options.accountId)) {
      return null;
    }
    return parsed as CachedAccountSnapshot;
  } catch {
    return null;
  }
}

export async function saveCachedAccountSnapshot(
  dataDir: string,
  snapshot: AccountSnapshot,
  now = new Date(),
  options: AccountSnapshotCacheOptions = {}
): Promise<CachedAccountSnapshot> {
  const cached: CachedAccountSnapshot = {
    version: 2,
    ...(options.accountId ? { account_id: options.accountId } : {}),
    saved_at: now.toISOString(),
    snapshot
  };
  const target = snapshotPath(dataDir);
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

function snapshotPath(dataDir: string): string {
  return join(dataDir, fileName);
}

function isAccountSnapshot(value: unknown): value is AccountSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<AccountSnapshot>;
  return typeof snapshot.account_name === "string"
    && typeof snapshot.destiny_membership_id === "string"
    && typeof snapshot.membership_type === "number"
    && Array.isArray(snapshot.characters)
    && Boolean(snapshot.vault && Array.isArray(snapshot.vault.items))
    && Boolean(snapshot.materials && Array.isArray(snapshot.materials.items));
}
