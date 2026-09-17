import { createHash } from "node:crypto";
import { readPublicTextUrl } from "../net/publicUrlReader.js";

/**
 * 「愿望单文本链接」这一条来路：把用户给的公开链接取回来。
 *
 * 这里只做三件事：下载、判断它是不是文本（而不是把网页源码当愿望单）、
 * 从链接里取出一个可用的文件名。**解析与校验不在这里**——取回的文本与
 * 本地文件走完全同一条流水线（同一个解析器、同一个定义池校验、同一份预览），
 * 否则同一份内容走两条路会得出两种结果。
 */

const maximumWishlistBytes = 128 * 1024 * 1024;
// 单一时限：不像从前分段 30 秒 + 180 秒又加一层界面兜底，那样失败时用户要干等三分半。
const requestTimeoutMs = 60_000;

export const dimWishlistLinkLabel = "愿望单链接";

export type DimWishlistLinkDownload = {
  /** 链接里实际取回的文本，直接交给愿望单解析器。 */
  text: string;
  /** 用户填写的链接，原样保存为来源地址。 */
  source_url: string;
  /** 跟随跳转后真正读到内容的地址。 */
  final_url: string;
  /** 从链接末段还原出的文件名，例如 `DIMLGpigWeaponWishlist by moc.txt`。 */
  file_name: string;
  /** 内容指纹：判断「有没有新内容」的唯一依据。 */
  fingerprint: string;
  /** 上游给的版本标识（ETag / Last-Modified），有就记下，没有也不要紧。 */
  revision: string;
};

export async function downloadDimWishlistLink(sourceUrl: string): Promise<DimWishlistLinkDownload> {
  const trimmed = sourceUrl.trim();
  let read: Awaited<ReturnType<typeof readPublicTextUrl>>;
  try {
    read = await readPublicTextUrl(trimmed, {
      label: dimWishlistLinkLabel,
      userAgent: "d2-tools-wishlist-reader",
      accept: "text/plain,text/markdown,application/octet-stream;q=0.9,*/*;q=0.1",
      maxBytes: maximumWishlistBytes,
      timeoutMs: requestTimeoutMs
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("必须是一个 http 或 https 地址")) throw error;
    throw new Error(`${message}当前推荐数据没有改动，也可以改用本地文件导入。`);
  }
  if (read.content_type === "text/html" || read.content_type === "application/xhtml+xml") {
    throw new Error(
      `${dimWishlistLinkLabel}指向的是一个网页而不是文本文件，当前推荐数据没有改动。`
      + "请改用这份文本的原始文件地址（通常以 .txt 结尾），或改用本地文件导入。"
    );
  }
  if (!read.text.trim()) {
    throw new Error(`${dimWishlistLinkLabel}没有读到内容，当前推荐数据没有改动。也可以改用本地文件导入。`);
  }
  return {
    text: read.text,
    source_url: trimmed,
    final_url: read.final_url,
    file_name: wishlistFileNameFromUrl(trimmed),
    fingerprint: createHash("sha256").update(read.text).digest("hex"),
    revision: read.etag || read.last_modified
  };
}

/**
 * 文件名取链接末段并还原百分号转义——链接里的 `My%20Wishlist.txt` 就是文件名 `My Wishlist.txt`。
 * 末尾是斜杠的链接指向目录、没有文件名可取，这时给一个中性名字而不是拿目录名冒充：
 * 缺省名只是省一次输入，用户可以改。
 */
export function wishlistFileNameFromUrl(sourceUrl: string): string {
  const trimmed = sourceUrl.trim();
  let path = trimmed;
  try {
    path = new URL(trimmed).pathname;
  } catch {
    // 不是合法链接就按字符串取末段。
  }
  const lastSegment = path.endsWith("/") ? "" : path.split("/").filter(Boolean).at(-1) ?? "";
  let decoded = lastSegment;
  try {
    decoded = decodeURIComponent(lastSegment);
  } catch {
    // 转义写错就按原样用，不影响读取。
  }
  return decoded.trim() || "愿望单文本";
}
