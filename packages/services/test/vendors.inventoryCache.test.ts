import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { VendorInventorySnapshot } from "@d2-tools/core/vendors/inventory";
import {
  loadCachedVendorInventory,
  saveCachedVendorInventory
} from "../src/vendors/inventoryCache.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("vendor inventory cache", () => {
  it("按账号、角色、详情范围和资料库语言隔离缓存", async () => {
    const dataDir = await createTempDir();
    const context = {
      membershipType: 3,
      membershipId: "membership-1",
      characterIds: ["hunter"],
      detailVendorHashes: [2190858386],
      manifestLanguage: "zh-chs"
    };
    await saveCachedVendorInventory(dataDir, context, snapshot(), new Date("2026-07-19T12:00:00.000Z"));

    await expect(loadCachedVendorInventory(dataDir, context))
      .resolves.toMatchObject({ snapshot: { fetchedAt: "2026-07-19T12:00:00.000Z" } });
    await expect(loadCachedVendorInventory(dataDir, {
      ...context,
      characterIds: ["warlock"]
    })).resolves.toBeNull();
    await expect(loadCachedVendorInventory(dataDir, {
      ...context,
      detailVendorHashes: []
    })).resolves.toMatchObject({ snapshot: { fetchedAt: "2026-07-19T12:00:00.000Z" } });
  });

  it("详情缓存只能复用于相同或更小的商人范围", async () => {
    const dataDir = await createTempDir();
    const context = {
      membershipType: 3,
      membershipId: "membership-1",
      characterIds: ["hunter"],
      detailVendorHashes: [2190858386],
      manifestLanguage: "zh-chs"
    };
    await saveCachedVendorInventory(dataDir, context, snapshot(), new Date("2026-07-19T12:00:00.000Z"));

    await expect(loadCachedVendorInventory(dataDir, {
      ...context,
      detailVendorHashes: [2190858386, 672118013]
    })).resolves.toBeNull();
  });
});

async function createTempDir(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "d2-vendor-inventory-cache-"));
  tempDirs.push(path);
  return path;
}

function snapshot(): VendorInventorySnapshot {
  return {
    status: "ready",
    fetchedAt: "2026-07-19T12:00:00.000Z",
    failedCharacterIds: [],
    failedVendorDetails: [],
    currencyBalances: {},
    characterContexts: {
      hunter: { characterId: "hunter", armorerModHash: null, armorerModName: null }
    },
    detailVendorHashes: [2190858386],
    vendors: []
  };
}
