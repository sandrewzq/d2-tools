import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const harnessPath = fileURLToPath(
  new URL("./fixtures/sqlite-search-index-harness.mjs", import.meta.url)
);

describe("SQLite game data search index", () => {
  it("stores canonical identity and expands same-name versions through item_version_relation", () => {
    expect(readHarnessOutput()).toEqual({
      searchHashes: [300, 200, 101],
      cappedSearchHashes: [300, 200],
      exactNameHashes: [100, 101, 200, 300],
      normalizedExactNameHashes: [100, 101, 200, 300],
      missingNameHashes: [],
      duplicateVersionHashes: [200, 101],
      canonicalVersionHashes: [200, 101],
      separateBucketHashes: [300],
      rejectsOutdatedSchema: true
    });
  });

  /**
   * 人工表格只写武器名时，定义池必须拿到该名字的**全部**官方版本：搜索有上限（`cappedSearchHashes` 只剩 2 条），
   * 代表版本折叠又会漏掉版本（`100` 在任何一条折叠路线里都不出现）。少一个版本，本来写对的行就会被判成异常。
   */
  it("returns every same-name version for an exact name, beyond the ranked search cap", () => {
    const output = readHarnessOutput();

    expect(output.exactNameHashes).toEqual(expect.arrayContaining([
      ...output.searchHashes,
      ...output.cappedSearchHashes
    ]));
    expect(output.exactNameHashes).toEqual([100, 101, 200, 300]);
    // 首尾空白与大小写不影响命中（英文名写法不统一时仍要能对上）。
    expect(output.normalizedExactNameHashes).toEqual(output.exactNameHashes);
    expect(output.missingNameHashes).toEqual([]);
  });
});

function readHarnessOutput(): {
  searchHashes: number[];
  cappedSearchHashes: number[];
  exactNameHashes: number[];
  normalizedExactNameHashes: number[];
  missingNameHashes: number[];
  duplicateVersionHashes: number[];
  canonicalVersionHashes: number[];
  separateBucketHashes: number[];
  rejectsOutdatedSchema: boolean;
} {
  const output = execFileSync(process.execPath, [harnessPath], {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true
  });

  return JSON.parse(output);
}
