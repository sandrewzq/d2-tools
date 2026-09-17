import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import { saveDimWishlist, saveDimWishlistFromSource } from "../src/analysis/wishlistStore.js";
import { findRecommendationDocumentBySourceUrl, listRecommendationDocuments } from "../src/community/recommendationDocumentStore.js";

/**
 * 「点一下同步」背后的判定（T63）。
 *
 * 判据只有一个：**重新读到的内容指纹，与库里这份来源的指纹是否相同**。
 * 不看名字（名字是用户起的，同一条链接可能被起过不同的名字），
 * 也不看任何上游专有元数据（ETag 只当版本号记着，不参与判断）。
 *
 * 所以这里钉的是这条往返：导入时写进去的指纹，必须正是同一份文本重算出来的那个值。
 */

// 文件名里带一个大写字母：链接的等价写法（大小写、转义、末尾斜杠）能不能对上，
// 只有存下来的原样写法与归一化写法不同时才看得出来。
const sourceUrl = "https://raw.githubusercontent.com/example/wishlist/refs/heads/main/Wishlist.txt";

describe("链接来源的再同步判定", () => {
  it("导入时写进去的指纹，等于同一份文本重算出来的指纹", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-link-sync-"));
    const text = wishlistText([1234, 5678]);
    const fingerprint = fingerprintOf(text);

    saveDimWishlistFromSource(dir, wishlist(), {
      name: "moc 的愿望单",
      mode: "create",
      source_url: sourceUrl,
      revision: "\"etag-1\"",
      source_fingerprint: fingerprint
    });

    const found = findRecommendationDocumentBySourceUrl(dir, sourceUrl);
    expect(found?.title).toBe("moc 的愿望单");
    expect(found?.sourceUrl).toBe(sourceUrl);
    expect(found?.fingerprint).toBe(fingerprint);
    // 同一份文本再读一次 → 指纹相同 → 界面说「已是最新」。
    expect(found?.fingerprint === fingerprint).toBe(true);

    // 内容变了 → 指纹不同 → 才进入覆盖确认。
    const changedFingerprint = fingerprintOf(wishlistText([1234, 5678, 9999]));
    expect(changedFingerprint).not.toBe(fingerprint);

    // 覆盖之后库里就是新指纹：同一条链接不会停在旧内容上。
    saveDimWishlistFromSource(dir, wishlist(), {
      name: "moc 的愿望单",
      mode: "overwrite",
      source_url: sourceUrl,
      revision: "\"etag-2\"",
      source_fingerprint: changedFingerprint
    });
    expect(findRecommendationDocumentBySourceUrl(dir, sourceUrl)?.fingerprint).toBe(changedFingerprint);
    expect(listRecommendationDocuments(dir)).toHaveLength(1);
  });

  it("链接的等价写法指向同一份来源", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-link-sync-"));
    saveDimWishlistFromSource(dir, wishlist(), {
      name: "moc 的愿望单",
      mode: "create",
      source_url: sourceUrl,
      revision: "",
      source_fingerprint: fingerprintOf(wishlistText([1234]))
    });

    // 大小写、末尾斜杠、百分号转义、片段标识都只是同一条链接的表面写法。
    for (const equivalent of [
      sourceUrl.toLocaleUpperCase(),
      `${sourceUrl}/`,
      `${sourceUrl}#top`,
      sourceUrl.replace("/Wishlist.txt", "/Wishlist%2Etxt")
    ]) {
      expect(findRecommendationDocumentBySourceUrl(dir, equivalent)?.title).toBe("moc 的愿望单");
    }
  });

  it("本地文件来源没有链接，因此查不到、也没有可同步的对象", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-link-sync-"));
    saveDimWishlist(dir, wishlist(), { name: "本地文件", mode: "create", origin: "file" });

    expect(findRecommendationDocumentBySourceUrl(dir, sourceUrl)).toBeNull();
    expect(listRecommendationDocuments(dir)).toHaveLength(1);
  });

  it("没导入过的链接（含空链接）查不到", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-link-sync-"));
    saveDimWishlistFromSource(dir, wishlist(), {
      name: "moc 的愿望单",
      mode: "create",
      source_url: sourceUrl,
      revision: "",
      source_fingerprint: fingerprintOf(wishlistText([1234]))
    });

    expect(findRecommendationDocumentBySourceUrl(dir, `${sourceUrl}.other`)).toBeNull();
    expect(findRecommendationDocumentBySourceUrl(dir, "   ")).toBeNull();
    expect(findRecommendationDocumentBySourceUrl(dir, "not a url")).toBeNull();
  });
});

function wishlist(): DimWishlist {
  return {
    title: "moc 的愿望单",
    rules: [{ item_hash: 1234, perk_hashes: [11, 22], mode: "pve", note: "" }]
  };
}

function wishlistText(hashes: number[]): string {
  return `${hashes.map((hash) => `dimwishlist:item=${hash}&perks=11,22`).join("\n")}\n`;
}

function fingerprintOf(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
