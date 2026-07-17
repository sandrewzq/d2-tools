import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AccountSnapshot } from "@d2-tools/core/account/summary";
import {
  loadCachedAccountSnapshot,
  saveCachedAccountSnapshot
} from "../src/account/snapshotStore.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("account snapshot store", () => {
  it("只为匹配的 Bungie 账号返回缓存", async () => {
    const dataDir = await createTempDir();
    await saveCachedAccountSnapshot(dataDir, snapshot("destiny-1"), new Date(1), {
      accountId: "bungie-1"
    });

    await expect(loadCachedAccountSnapshot(dataDir, { accountId: "bungie-1" }))
      .resolves.toMatchObject({ snapshot: { destiny_membership_id: "destiny-1" } });
    await expect(loadCachedAccountSnapshot(dataDir, { accountId: "bungie-2" }))
      .resolves.toBeNull();
  });

  it("并发保存按调用顺序串行化，最后一次写入最终落盘", async () => {
    const dataDir = await createTempDir();
    await Promise.all([
      saveCachedAccountSnapshot(dataDir, snapshot("destiny-1"), new Date(1), { accountId: "bungie-1" }),
      saveCachedAccountSnapshot(dataDir, snapshot("destiny-2"), new Date(2), { accountId: "bungie-2" }),
      saveCachedAccountSnapshot(dataDir, snapshot("destiny-3"), new Date(3), { accountId: "bungie-3" })
    ]);

    const parsed = JSON.parse(await readFile(join(dataDir, "account-snapshot-cache.json"), "utf8"));
    expect(parsed.account_id).toBe("bungie-3");
    expect(parsed.snapshot.destiny_membership_id).toBe("destiny-3");
  });
});

async function createTempDir(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "d2-account-cache-"));
  tempDirs.push(path);
  return path;
}

function snapshot(membershipId: string): AccountSnapshot {
  return {
    account_name: membershipId,
    destiny_membership_id: membershipId,
    membership_type: 3,
    characters: [],
    vault: { item_count: 0, items: [], sample_items: [] },
    materials: { item_count: 0, items: [] }
  };
}
