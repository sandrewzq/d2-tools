import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * 读取用户给出的公开链接（攻略链接、愿望单链接……）。
 *
 * 只做「把一段文本取回来」这件事：协议、跳转、体积、超时这四道关都在这里，
 * 各调用方自己决定拿到文本之后再做什么（抽正文 / 当愿望单解析）。
 *
 * 安全边界是共享的，不能各写一份：跳转要一跳一跳地重新校验，
 * 否则「先给一个公网地址、再跳到 127.0.0.1」就能绕过去。
 */

const defaultMaxRedirects = 5;

export type PublicUrlReadOptions = {
  /** 出错文案里的名字，例如「攻略链接」「愿望单链接」。 */
  label: string;
  userAgent: string;
  maxBytes: number;
  timeoutMs: number;
  /** 不给表示不限内容类型；给了就在读正文之前先卡掉。 */
  acceptedContentTypes?: readonly string[];
  accept?: string;
  maxRedirects?: number;
};

export type PublicUrlReadResult = {
  text: string;
  final_url: string;
  content_type: string;
  byte_length: number;
  etag: string;
  last_modified: string;
  warnings: string[];
};

export async function readPublicTextUrl(
  sourceUrl: string,
  options: PublicUrlReadOptions
): Promise<PublicUrlReadResult> {
  const trimmed = sourceUrl.trim();
  if (!isSupportedPublicUrlText(trimmed)) {
    throw new Error(`${options.label}必须是一个 http 或 https 地址。`);
  }
  let currentUrl = new URL(trimmed);
  const maxRedirects = options.maxRedirects ?? defaultMaxRedirects;
  const warnings: string[] = [];
  let response: Response | null = null;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    await assertPublicNetworkUrl(currentUrl, options.label);
    try {
      // 这条路径直连用户给的外部地址，**不**经过 bungie/client.ts 的请求漏斗，也不得
      // 读/写那里的 Bungie 粘滞 cookie（affinity）：那是 Bungie host 的负载均衡标识，
      // 发给第三方就是泄露。本文件自己发 fetch 是刻意的，别改成走公共漏斗。
      response = await fetch(currentUrl, {
        redirect: "manual",
        headers: {
          ...(options.accept ? { Accept: options.accept } : {}),
          "User-Agent": options.userAgent
        },
        signal: AbortSignal.timeout(options.timeoutMs)
      });
    } catch (error) {
      throw new Error(`${options.label}读取失败：${errorMessage(error)}。`);
    }
    if (!isRedirectStatus(response.status)) break;
    const location = response.headers.get("location");
    if (!location) throw new Error(`${options.label}返回了缺少目标地址的跳转。`);
    if (redirectCount === maxRedirects) throw new Error(`${options.label}跳转次数过多。`);
    await response.body?.cancel();
    currentUrl = new URL(location, currentUrl);
    warnings.push(`来源经过跳转：${currentUrl.toString()}`);
  }

  if (!response) throw new Error(`${options.label}没有返回响应。`);
  if (!response.ok) throw new Error(`${options.label}读取失败（HTTP ${response.status}）。`);
  const contentType = normalizeContentType(response.headers.get("content-type"));
  const accepted = options.acceptedContentTypes ?? [];
  if (accepted.length && !accepted.includes(contentType)) {
    throw new Error(`${options.label}的内容类型不受支持：${contentType || "未知"}。`);
  }
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > options.maxBytes) {
    throw new Error(`${options.label}超过 ${formatMegabytes(options.maxBytes)} MB 读取上限。`);
  }

  const bytes = await readLimitedResponseBody(response, options.maxBytes, options.label);
  return {
    text: decodeResponseBody(bytes, response.headers.get("content-type")),
    final_url: currentUrl.toString(),
    content_type: contentType,
    byte_length: bytes.byteLength,
    etag: response.headers.get("etag") ?? "",
    last_modified: response.headers.get("last-modified") ?? "",
    warnings
  };
}

export function isSupportedPublicUrlText(value: string): boolean {
  try {
    return isSupportedPublicUrl(new URL(value.trim()));
  } catch {
    return false;
  }
}

function isSupportedPublicUrl(url: URL): boolean {
  return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
}

async function assertPublicNetworkUrl(url: URL, label: string): Promise<void> {
  if (!isSupportedPublicUrl(url)) throw new Error(`${label}地址无效。`);
  const hostname = url.hostname.toLocaleLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error(`${label}不能访问本机或局域网地址。`);
  }
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error(`${label}不能访问本机或局域网地址。`);
  }
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLocaleLowerCase();
  if (normalized.includes(".")) {
    const ipv4 = normalized.startsWith("::ffff:") ? normalized.slice(7) : normalized;
    const parts = ipv4.split(".").map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
    const [a, b] = parts as [number, number, number, number];
    return a === 0
      || a === 10
      || a === 127
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 198 && (b === 18 || b === 19))
      || a >= 224;
  }
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("ff");
}

async function readLimitedResponseBody(response: Response, limit: number, label: string): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new Error(`${label}超过 ${formatMegabytes(limit)} MB 读取上限。`);
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function decodeResponseBody(bytes: Uint8Array, rawContentType: string | null): string {
  const charset = rawContentType?.match(/charset\s*=\s*["']?([^;"']+)/i)?.[1]?.trim() || "utf-8";
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function normalizeContentType(value: string | null): string {
  return value?.split(";", 1)[0]?.trim().toLocaleLowerCase() ?? "";
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function formatMegabytes(bytes: number): number {
  return Math.round(bytes / 1024 / 1024);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
