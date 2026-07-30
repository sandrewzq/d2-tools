import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const harnessPath = fileURLToPath(
  new URL("./fixtures/sqlite-search-index-harness.mjs", import.meta.url)
);

describe("SQLite game data search index", () => {
  it("stores canonical identity and expands same-name versions through item_version_relation", () => {
    const output = execFileSync(process.execPath, [harnessPath], {
      cwd: process.cwd(),
      encoding: "utf8",
      windowsHide: true
    });

    expect(JSON.parse(output)).toEqual({
      searchHashes: [300, 200, 101],
      duplicateVersionHashes: [200, 101],
      canonicalVersionHashes: [200, 101],
      separateBucketHashes: [300],
      rejectsOutdatedSchema: true
    });
  });
});
