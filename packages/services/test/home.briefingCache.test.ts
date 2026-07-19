import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildDailySummary } from "@d2-tools/core/daily/summary";
import { buildWeeklySummary } from "@d2-tools/core/weekly/summary";
import {
  loadCachedHomeBriefing,
  saveCachedHomeBriefing
} from "../src/home/briefingCache.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("home briefing cache", () => {
  it("只为匹配的账号和资料库语言返回持久缓存", async () => {
    const dataDir = await createTempDir();
    const now = new Date("2026-07-19T12:00:00.000Z");
    await saveCachedHomeBriefing(dataDir, {
      fetched_at: now.toISOString(),
      daily: buildDailySummary(now, {}, { timeZone: "UTC" }),
      weekly: buildWeeklySummary(now, {}, { timeZone: "UTC" })
    }, {
      accountId: "account-1",
      manifestLanguage: "zh-chs"
    }, now);

    await expect(loadCachedHomeBriefing(dataDir, {
      accountId: "account-1",
      manifestLanguage: "zh-chs"
    })).resolves.toMatchObject({ briefing: { fetched_at: now.toISOString() } });
    await expect(loadCachedHomeBriefing(dataDir, {
      accountId: "account-2",
      manifestLanguage: "zh-chs"
    })).resolves.toBeNull();
    await expect(loadCachedHomeBriefing(dataDir, {
      accountId: "account-1",
      manifestLanguage: "en"
    })).resolves.toBeNull();
  });
});

async function createTempDir(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "d2-home-briefing-cache-"));
  tempDirs.push(path);
  return path;
}
