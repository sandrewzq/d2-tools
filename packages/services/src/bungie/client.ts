import { createServiceError } from "../errors.js";
import { getActiveBungieCookieJar, type BungieCookieJar } from "./cookies.js";

export type BungieJsonFetcher = <T>(path: string, accessToken?: string) => Promise<T>;

export type FetchBungieJsonOptions = {
  apiKey: string;
  accessToken?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
  /**
   * 粘滞 cookie 的来源。省略＝用进程级注册的那个（见 `configureBungieCookieJar`）；
   * 传 `false`＝这条请求不读也不写 cookie（测试隔离用）。
   */
  cookieJar?: BungieCookieJar | false;
};

type BungiePlatformResponse<T> = {
  ErrorCode?: number;
  Message?: string;
  Response?: T;
};

const defaultBaseUrl = "https://www.bungie.net/Platform";

export function createBungieJsonFetcher(options: Omit<FetchBungieJsonOptions, "accessToken">): BungieJsonFetcher {
  return (path, accessToken) => fetchBungieJson(path, { ...options, accessToken });
}

export async function fetchBungieJson<T>(
  path: string,
  options: FetchBungieJsonOptions
): Promise<T> {
  return requestBungieJson<T>(path, {
    ...options,
    method: "GET"
  });
}

export async function postBungieJson<T>(
  path: string,
  body: unknown,
  options: FetchBungieJsonOptions
): Promise<T> {
  return requestBungieJson<T>(path, {
    ...options,
    method: "POST",
    body
  });
}

async function requestBungieJson<T>(
  path: string,
  options: FetchBungieJsonOptions & {
    method: "GET" | "POST";
    body?: unknown;
  }
): Promise<T> {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw createServiceError({
      code: "bungie_api_key_missing",
      message: "缺少 Bungie API Key",
      retryable: false,
      causeCategory: "configuration"
    });
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const url = new URL(normalizePath(path), ensureTrailingSlash(options.baseUrl ?? defaultBaseUrl));
  const timeoutMs = options.timeoutMs ?? 30_000;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;

  // 只对 Bungie 自己的 host 读写粘滞 cookie：`baseUrl` 生产里恒为 Platform，但测试与将来的
  // 覆盖会把它指到别处，affinity 标识不该跟着跑。
  const jar = options.cookieJar === false
    ? undefined
    : options.cookieJar ?? getActiveBungieCookieJar();
  const affinity = jar && isBungieHost(url.hostname) ? jar : undefined;
  const cookieHeader = affinity?.cookieHeader();

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: options.method,
      signal,
      headers: {
        "X-API-Key": apiKey,
        ...(options.accessToken ? { "Authorization": `Bearer ${options.accessToken}` } : {}),
        ...(cookieHeader ? { "Cookie": cookieHeader } : {}),
        "Accept": "application/json",
        ...(options.method === "POST" ? { "Content-Type": "application/json" } : {})
      },
      ...(options.method === "POST" ? { body: JSON.stringify(options.body ?? {}) } : {})
    });
  } catch (error) {
    if (timeoutSignal.aborted && !options.signal?.aborted) {
      throw createServiceError({
        code: "bungie_timeout",
        message: `Bungie 请求在 ${timeoutMs} ms 后超时`,
        retryable: true,
        causeCategory: "timeout",
        cause: error
      });
    }
    throw createServiceError({
      code: "bungie_network_failed",
      message: error instanceof Error ? error.message : "Bungie 网络请求失败",
      retryable: true,
      causeCategory: "network",
      cause: error
    });
  }

  // 成功和失败的响应都可能续期/作废粘滞 cookie，两者都要捕获。
  affinity?.capture(response);

  if (!response.ok) {
    const errorBody = await readBungieErrorBody(response);
    const errorCode = errorBody?.ErrorCode;
    const rejection = errorCode !== undefined ? bungieGameStateRejections[errorCode] : undefined;
    const details = [
      errorCode !== undefined ? `ErrorCode ${errorCode}` : undefined,
      errorBody?.Message
    ].filter(Boolean).join(": ") || undefined;
    const message = rejection
      ?? (details
        ? `Bungie request failed: HTTP ${response.status} (${details})`
        : `Bungie request failed: HTTP ${response.status}`);
    throw createServiceError({
      code: "bungie_http_failed",
      message,
      // 认识的游戏状态拒绝不该自动重试：重试一百次，角色还在活动里。
      retryable: rejection ? false : response.status >= 500 || response.status === 429,
      causeCategory: rejection
        ? "validation"
        : response.status === 401 || response.status === 403 ? "authentication" : "network",
      details: {
        status: response.status,
        ...(errorCode !== undefined ? { bungie_error_code: errorCode } : {})
      }
    });
  }

  const body = await response.json() as BungiePlatformResponse<T>;
  if (body.ErrorCode !== undefined && body.ErrorCode !== 1) {
    // 同一个码走 HTTP 200 回来的情况也要认（Bungie 两种都出现过），否则中文化只做了一半。
    const rejection = bungieGameStateRejections[body.ErrorCode];
    throw createServiceError({
      code: "bungie_api_failed",
      message: rejection ?? `Bungie API error ${body.ErrorCode}: ${body.Message ?? "Unknown error"}`,
      retryable: rejection ? false : body.ErrorCode === 5,
      causeCategory: rejection ? "validation" : "unavailable",
      details: { bungie_error_code: body.ErrorCode }
    });
  }
  return "Response" in body ? body.Response as T : body as T;
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path.slice(1) : path;
}

function isBungieHost(hostname: string): boolean {
  return hostname === "bungie.net" || hostname.endsWith(".bungie.net");
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

async function readBungieErrorBody(response: Response): Promise<BungiePlatformResponse<unknown> | undefined> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) return undefined;
  try {
    return await response.clone().json() as BungiePlatformResponse<unknown>;
  } catch {
    return undefined;
  }
}

/**
 * Bungie 用响应体里的 `ErrorCode` 表达「游戏状态不允许这次操作」。这类拒绝是可解释、可行动的，
 * 透传英文原句对用户没有用 —— 2026-09-18 的写面板上就是一行
 * `Bungie request failed: HTTP 500 (ErrorCode 1634: You must either be logged off or in orbit...)`，
 * 用户看不出该做什么。所以认识的码一律换成中文动作句，括号里保留码号，便于对上留痕、也便于报错时复述。
 *
 * **不认识的码继续透传原文**：宁可给原文，也不要编一句可能不准的翻译。
 *
 * 加码之前先看有没有人靠**原文**认它：`packages/desktop/src/main/ipc/actions.ts` 里的
 * `isItemRefreshRequiredWriteError` / `isItemNotFoundWriteError` 是按 `ErrorCode 1679` / `1623`
 * 的字面量匹配的。那两个码一旦进了这张表，匹配就会失效、重试路径静默失灵——要么别加，要么先把那里改成读码。
 */
const bungieGameStateRejections: Record<number, string> = {
  // 换 Perk 这类写操作在角色处于活动中时会被拒。回到轨道（或退回角色选择界面）后重试即可。
  1634: "Bungie 拒绝了这次更改（状态码 1634：角色正在活动中，必须回到轨道或退回角色选择界面才能改装备）。请回到轨道后再试。",
  // 装备槽位互斥、装备已被穿戴等情况下装备请求会被拒。
  1640: "Bungie 拒绝了这次装备请求（状态码 1640：该装备当前不可装备）。请刷新账号后重试。"
};
