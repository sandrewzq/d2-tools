import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadDimWishlistLink, wishlistFileNameFromUrl } from "../src/community/dimWishlistLinkSource.js";

/**
 * 「愿望单文本链接」这一条来路（T63）。
 *
 * 这里钉三件事：**取回来的东西看起来像不像愿望单文本**（网页源码不算）、
 * **任何失败都不许动现有数据**（并且要给得出「换本地文件导入」这条退路）、
 * 以及**来源身份**：链接原样保存、文件名从链接末段还原。
 *
 * 解析与校验不在这里——那是与本地文件共用的同一条流水线，由 IPC 层负责接上。
 */

/** 公网 IP 字面量：测试里不查 DNS，也不碰真网络。 */
const publicHost = "https://93.184.216.34";
const sourceUrl = `${publicHost}/wishlists/My%20Wishlist.txt`;
const wishlistText = "dimwishlist:item=1234&perks=1,2\n//notes:测试\n";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("从链接读愿望单文本", () => {
  it("取回文本，并带上链接、最终地址、文件名与内容指纹", async () => {
    const calls = stubFetch(() => new Response(wishlistText, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8", etag: "\"v1\"" }
    }));

    const result = await downloadDimWishlistLink(sourceUrl);

    expect(calls).toEqual([sourceUrl]);
    expect(result.text).toBe(wishlistText);
    // 保存的是**用户填的链接**，不是跳转后的地址：以后同步要用同一个入口。
    expect(result.source_url).toBe(sourceUrl);
    expect(result.final_url).toBe(sourceUrl);
    expect(result.file_name).toBe("My Wishlist.txt");
    expect(result.fingerprint).toBe(createHash("sha256").update(wishlistText).digest("hex"));
    expect(result.revision).toBe("\"v1\"");
  });

  it("跳转只影响「实际读到的地址」：保存的链接与文件名仍是用户填的那一个", async () => {
    // 存最终地址会让来源行上的「同步」指向一个用户没填过的链接；
    // 文件名也跟着最终地址变，用户看到的名字就和他贴的不是一份东西了。
    stubFetch((url) => url.endsWith("/go.txt")
      ? new Response(null, { status: 302, headers: { location: `${publicHost}/real/renamed%20file.txt` } })
      : new Response(wishlistText, { status: 200, headers: { "content-type": "text/plain" } }));

    const result = await downloadDimWishlistLink(`${publicHost}/go.txt`);

    expect(result.source_url).toBe(`${publicHost}/go.txt`);
    // 最终地址按链接原样保存（转义不还原，它是实际请求过的那个地址）。
    expect(result.final_url).toBe(`${publicHost}/real/renamed%20file.txt`);
    expect(result.file_name).toBe("go.txt");
  });

  it("版本号取 ETag；上游没给 ETag 时才落到 Last-Modified", async () => {
    // 两个都在时必须以 ETag 为准：只测「缺 ETag」的话，把两者的优先级写反也看不出来。
    stubFetch(() => new Response(wishlistText, {
      status: 200,
      headers: {
        "content-type": "text/plain",
        etag: "\"v1\"",
        "last-modified": "Wed, 10 Sep 2026 00:00:00 GMT"
      }
    }));
    expect((await downloadDimWishlistLink(sourceUrl)).revision).toBe("\"v1\"");

    stubFetch(() => new Response(wishlistText, {
      status: 200,
      headers: { "content-type": "text/plain", "last-modified": "Wed, 10 Sep 2026 00:00:00 GMT" }
    }));
    expect((await downloadDimWishlistLink(sourceUrl)).revision).toBe("Wed, 10 Sep 2026 00:00:00 GMT");
  });

  it("网页源码不算愿望单文本，并指向原始的文本地址", async () => {
    for (const contentType of ["text/html; charset=utf-8", "application/xhtml+xml"]) {
      stubFetch(() => new Response("<!doctype html><html><body>仓库页面</body></html>", {
        status: 200,
        headers: { "content-type": contentType }
      }));

      await expect(downloadDimWishlistLink(sourceUrl)).rejects.toThrow("愿望单链接指向的是一个网页而不是文本文件，当前推荐数据没有改动。");
      await expect(downloadDimWishlistLink(sourceUrl)).rejects.toThrow(".txt");
    }
  });

  it("读到空文本时不动现有数据", async () => {
    stubFetch(() => new Response("   \n\t\n", { status: 200, headers: { "content-type": "text/plain" } }));

    await expect(downloadDimWishlistLink(sourceUrl)).rejects.toThrow("愿望单链接没有读到内容，当前推荐数据没有改动。也可以改用本地文件导入。");
  });

  it("下载失败或中断都保留现有数据，并给出本地文件这条退路", async () => {
    stubFetch(() => new Response("Not Found", { status: 404, headers: { "content-type": "text/plain" } }));
    await expect(downloadDimWishlistLink(sourceUrl)).rejects.toThrow("愿望单链接读取失败（HTTP 404）。当前推荐数据没有改动，也可以改用本地文件导入。");

    vi.stubGlobal("fetch", vi.fn(async () => { throw new DOMException("The operation was aborted due to timeout", "TimeoutError"); }));
    await expect(downloadDimWishlistLink(sourceUrl)).rejects.toThrow("愿望单链接读取失败：The operation was aborted due to timeout。当前推荐数据没有改动，也可以改用本地文件导入。");
  });

  it("链接本身不合法时当场拒绝，一条请求都不发（这不是数据没改，是还没开始读）", async () => {
    const calls = stubFetch(() => new Response(wishlistText, { status: 200 }));

    // 一字不差：链接写错了要说链接写错了，不该拖一句「当前数据没有改动」——
    // 那句话是给「读到了但内容不对」准备的，用在这里会把用户引向换文件而不是改链接。
    for (const rejected of ["file:///etc/passwd", "javascript:alert(1)", "  "]) {
      await expect(downloadDimWishlistLink(rejected)).rejects.toThrow(/^愿望单链接必须是一个 http 或 https 地址。$/);
    }
    expect(calls).toEqual([]);
  });
});

describe("从链接取文件名", () => {
  it("取末段、还原百分号转义、去掉查询串与末尾斜杠", () => {
    expect(wishlistFileNameFromUrl("https://example.invalid/示例愿望单%20by%20作者.txt")).toBe("示例愿望单 by 作者.txt");
    expect(wishlistFileNameFromUrl("https://example.invalid/作者/推荐表.txt?raw=1")).toBe("推荐表.txt");
    expect(wishlistFileNameFromUrl("https://example.invalid/dir/")).toBe("愿望单文本");
    expect(wishlistFileNameFromUrl("https://example.invalid")).toBe("愿望单文本");
    // 转义写错时按原样用，不影响读取。
    expect(wishlistFileNameFromUrl("https://example.invalid/100%bad.txt")).toBe("100%bad.txt");
  });
});

function stubFetch(handler: (url: string) => Response): string[] {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = input instanceof URL ? input.toString() : String(input);
    calls.push(url);
    return handler(url);
  }));
  return calls;
}
