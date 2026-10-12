import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  clearCachedArmorPieces,
  loadCachedArmorPieces,
  loadStaleArmorPieces,
  saveCachedArmorPieces
} from "../src/account/armorPiecesStore.js";

describe("armor pieces cache fallback", () => {
  it("keeps an invalidated same-account cache only as a warned fallback", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "d2-armor-pieces-"));
    const identity = {
      accountId: "account-one",
      manifestVersion: "manifest-one",
      rulesetId: "armor-3.0",
      rulesetVersion: 1
    };
    const savedAt = new Date("2026-10-12T00:00:00.000Z");
    const now = savedAt.getTime() + 60_000;
    try {
      await saveCachedArmorPieces(dataDir, identity, { destinyMembershipId: "destiny-one", pieces: [] }, savedAt);
      expect(await loadCachedArmorPieces(dataDir, identity, now)).not.toBeNull();

      await clearCachedArmorPieces(dataDir);
      expect(await loadCachedArmorPieces(dataDir, identity, now)).toBeNull();
      expect((await loadStaleArmorPieces(dataDir, identity, now))?.destiny_membership_id).toBe("destiny-one");
      expect(await loadStaleArmorPieces(dataDir, { ...identity, accountId: "account-two" }, now)).toBeNull();
      expect(await loadStaleArmorPieces(dataDir, identity, now + 25 * 60 * 60_000)).toBeNull();

      await saveCachedArmorPieces(dataDir, identity, { destinyMembershipId: "destiny-one", pieces: [] }, savedAt);
      await clearCachedArmorPieces(dataDir);
      expect(await loadCachedArmorPieces(dataDir, identity, now)).toBeNull();
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });
});
