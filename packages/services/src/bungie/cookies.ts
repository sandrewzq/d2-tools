import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Bungie 的粘滞 cookie（affinitize）。
 *
 * 背景：Bungie 的 Platform 接口背后是多台后端，每个响应会下发一个 Cloudflare 负载均衡的
 * 粘滞 cookie（目前叫 `__cflb`）。写操作只会冲掉**那一台**的缓存；如果随后的读请求落到
 * 另一台，它还会返回写入前的副本。Bungie 对单用户应用的指引就是把这个 cookie 持久化并在
 * 后续请求里回带。
 *
 * 没有它会发生什么：换 Perk 的写接口返回成功、服务端也确实更新了，但应用紧接着的读回
 * 连续十几次都读到旧配置，界面报「游戏服务返回的仍是旧配置」。见 T76。
 */
export type BungieCookieJar = {
  /** 回带用的 `Cookie` 头取值；没有任何可用 cookie 时返回 undefined。 */
  cookieHeader(): string | undefined;
  /** 从响应里捕获 `set-cookie`。对残缺的 Response 也必须安全。 */
  capture(response: Response): void;
};

type StoredCookie = {
  value: string;
  /**
   * 绝对到期时间（ISO）。缺省表示**会话级** cookie：本次进程内有效，不落盘。
   * 浏览器语义里没有 Max-Age / Expires 的 cookie 就是这样，不该跨重启存活。
   */
  expires_at?: string;
};

type StoredCookieFile = {
  version: number;
  saved_at?: string;
  cookies?: Record<string, StoredCookie>;
};

/**
 * 只认这几个名字，内存与磁盘同一套名单 —— 保持一致才不会有「内存里有、磁盘上没有」
 * 这种要靠猜的状态。不落 `cf_clearance` / `__cf_bm` 这类安全 cookie。
 *
 * 若哪天 Bungie 换了粘滞 cookie 的名字，这里要跟着加。换了名字的失效信号是
 * `write-action-debug.json` 里写后读回的 `verification-read` 再次出现不匹配（T76 的留痕）。
 */
const persistedCookieNames: readonly string[] = ["__cflb"];

const storedFileVersion = 1;

export function bungieAffinityPath(dataDir: string): string {
  return join(dataDir, "bungie-affinity.json");
}

export function createBungieAffinityCookieJar(options: {
  dataDir: string;
  now?: () => number;
}): BungieCookieJar {
  const now = options.now ?? Date.now;
  const path = bungieAffinityPath(options.dataDir);
  const cookies = new Map<string, StoredCookie>();
  let loaded = false;

  function ensureLoaded(): void {
    if (loaded) return;
    loaded = true;
    try {
      if (!existsSync(path)) return;
      const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<StoredCookieFile>;
      if (parsed.version !== storedFileVersion || !parsed.cookies) return;
      for (const [name, entry] of Object.entries(parsed.cookies)) {
        if (!persistedCookieNames.includes(name)) continue;
        if (!isStoredCookie(entry)) continue;
        if (Date.parse(entry.expires_at) <= now()) continue;
        cookies.set(name, { value: entry.value, expires_at: entry.expires_at });
      }
    } catch {
      // 读不动就当没有。这个文件只是粘滞标识，丢了只会退回「不粘」，不该影响任何请求。
    }
  }

  function persist(): void {
    try {
      const persisted: Record<string, StoredCookie> = {};
      for (const [name, cookie] of cookies) {
        // 会话级 cookie 留在内存里，不跨重启。
        if (cookie.expires_at === undefined) continue;
        persisted[name] = cookie;
      }
      mkdirSync(options.dataDir, { recursive: true });
      const file: StoredCookieFile = {
        version: storedFileVersion,
        saved_at: new Date(now()).toISOString(),
        cookies: persisted
      };
      writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    } catch {
      // 写不进去（只读目录、磁盘满）就只当这次不粘。下一次捕获会再试。
    }
  }

  return {
    cookieHeader(): string | undefined {
      ensureLoaded();
      const pairs: string[] = [];
      for (const [name, cookie] of cookies) {
        if (cookie.expires_at !== undefined && Date.parse(cookie.expires_at) <= now()) {
          cookies.delete(name);
          continue;
        }
        pairs.push(`${name}=${cookie.value}`);
      }
      return pairs.length ? pairs.join("; ") : undefined;
    },

    capture(response: Response): void {
      ensureLoaded();
      let changed = false;
      for (const line of readSetCookieLines(response)) {
        const parsed = parseSetCookie(line, now());
        if (!parsed || !persistedCookieNames.includes(parsed.name)) continue;
        if (parsed.expired) {
          // 墓碑要删，不能存：只做「后写覆盖」的话，一个已作废的值会被永久回带，
          // 比完全没有 cookie 更糟。
          changed = cookies.delete(parsed.name) || changed;
          continue;
        }
        const existing = cookies.get(parsed.name);
        if (existing?.value === parsed.value && existing.expires_at === parsed.expiresAt) continue;
        cookies.set(parsed.name, { value: parsed.value, expires_at: parsed.expiresAt });
        changed = true;
      }
      if (changed) persist();
    }
  };
}

let activeJar: BungieCookieJar | undefined;

/** 由组合根在启动时调用一次，让整个进程的 Bungie 请求共用同一个 jar。 */
export function configureBungieCookieJar(jar: BungieCookieJar | undefined): void {
  activeJar = jar;
}

export function getActiveBungieCookieJar(): BungieCookieJar | undefined {
  return activeJar;
}

/** 供留痕盖章用：只说「有没有」，不暴露值。 */
export function hasBungieAffinityCookie(): boolean {
  return activeJar?.cookieHeader() !== undefined;
}

/** 只清内存里的引用，**不删**磁盘上的文件：删了就丢掉跨重启的粘滞。 */
export function resetBungieCookieJar(): void {
  activeJar = undefined;
}

function isStoredCookie(value: unknown): value is { value: string; expires_at: string } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredCookie>;
  return typeof candidate.value === "string"
    && typeof candidate.expires_at === "string"
    && Number.isFinite(Date.parse(candidate.expires_at));
}

/**
 * 必须用 `getSetCookie()`。`headers.get("set-cookie")` 会把多个 cookie 用 ", " 拼起来，
 * 而 `Expires` 属性本身含逗号，用它必然切错。
 *
 * 对残缺的 Response 免疫是硬要求，不是防御性编程：现有测试
 * （`packages/desktop/test/account-token-refresh-coalescing.test.ts`）用
 * `{ ok: true, status: 200, json } as unknown as Response` 打桩全局 fetch，那个对象没有 headers。
 */
function readSetCookieLines(response: Response): string[] {
  const headers = response?.headers as Headers | undefined;
  if (typeof headers?.getSetCookie !== "function") return [];
  try {
    return headers.getSetCookie();
  } catch {
    return [];
  }
}

function parseSetCookie(
  line: string,
  now: number
): { name: string; value: string; expiresAt?: string; expired: boolean } | null {
  const segments = line.split(";");
  const first = segments[0] ?? "";
  // 按**第一个** `=` 切：值本身可能含 `=`（base64 补位就是）。
  const separator = first.indexOf("=");
  if (separator <= 0) return null;
  const name = first.slice(0, separator).trim();
  const value = first.slice(separator + 1).trim();
  if (!name) return null;

  let maxAgeSeconds: number | undefined;
  let expiresAtMs: number | undefined;
  for (const segment of segments.slice(1)) {
    const attributeSeparator = segment.indexOf("=");
    const attributeName = (attributeSeparator < 0 ? segment : segment.slice(0, attributeSeparator))
      .trim()
      .toLowerCase();
    const attributeValue = attributeSeparator < 0 ? "" : segment.slice(attributeSeparator + 1).trim();
    if (attributeName === "max-age") {
      const parsed = Number.parseInt(attributeValue, 10);
      if (Number.isFinite(parsed)) maxAgeSeconds = parsed;
    } else if (attributeName === "expires") {
      const parsed = Date.parse(attributeValue);
      if (Number.isFinite(parsed)) expiresAtMs = parsed;
    }
  }

  // Max-Age 优先于 Expires（RFC 6265 §4.1.2.2）。
  if (maxAgeSeconds !== undefined) {
    return maxAgeSeconds <= 0
      ? { name, value, expired: true }
      : { name, value, expiresAt: new Date(now + maxAgeSeconds * 1000).toISOString(), expired: false };
  }
  if (expiresAtMs !== undefined) {
    return expiresAtMs <= now
      ? { name, value, expired: true }
      : { name, value, expiresAt: new Date(expiresAtMs).toISOString(), expired: false };
  }
  // 没有到期属性 = 会话级。
  return { name, value, expired: false };
}
