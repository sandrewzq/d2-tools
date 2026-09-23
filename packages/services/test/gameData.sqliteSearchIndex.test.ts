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
      spacedExactNameHashes: [400],
      punctuatedExactNameHashes: [400],
      spacedSearchHashes: [400],
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

  /**
   * 官方名把中文与字母数字连写（`迪凯特02`），人工表格按页面习惯写 `迪凯特 02`。只比原样的话
   * 这一行取不到 hash、定义池缺人，校验期就报「无法根据官方中文名称找到可核对的武器」。
   */
  it("folds spaces and punctuation when resolving a name to item hashes", () => {
    const output = readHarnessOutput();

    // `Compact 02` 是 `Compact02` 的另一种写法：取 hash 的精确名接口和搜索接口都要认。
    expect(output.spacedExactNameHashes).toEqual([400]);
    expect(output.spacedSearchHashes).toEqual([400]);
    // 折叠口径是「去掉标点与空白」，不是「只删空格」。
    expect(output.punctuatedExactNameHashes).toEqual([400]);
  });
});

function readHarnessOutput(): {
  searchHashes: number[];
  cappedSearchHashes: number[];
  exactNameHashes: number[];
  normalizedExactNameHashes: number[];
  spacedExactNameHashes: number[];
  punctuatedExactNameHashes: number[];
  spacedSearchHashes: number[];
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
