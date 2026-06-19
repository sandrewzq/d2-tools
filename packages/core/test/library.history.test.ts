import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addFavoriteItem, addRecentItem, loadLibraryHistory, removeFavoriteItem } from "../src/library/history.js";

describe("library history", () => {
  it("keeps recent items newest first without duplicates", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-service-history-"));

    addRecentItem(dir, { hash: 1, name: "Riskrunner" }, new Date("2026-06-19T00:00:00.000Z"));
    addRecentItem(dir, { hash: 2, name: "Gjallarhorn" }, new Date("2026-06-19T00:01:00.000Z"));
    addRecentItem(dir, { hash: 1, name: "Riskrunner" }, new Date("2026-06-19T00:02:00.000Z"));

    expect(loadLibraryHistory(dir).recent.map((item) => item.hash)).toEqual([1, 2]);
  });

  it("adds and removes favorites", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-service-history-"));

    addFavoriteItem(dir, { hash: 1, name: "Riskrunner" });
    removeFavoriteItem(dir, 1);

    expect(loadLibraryHistory(dir).favorites).toEqual([]);
  });
});
