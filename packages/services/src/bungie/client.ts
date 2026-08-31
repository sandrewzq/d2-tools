import { createServiceError } from "../errors.js";

export type BungieJsonFetcher = <T>(path: string, accessToken?: string) => Promise<T>;

export type FetchBungieJsonOptions = {
  apiKey: string;
  accessToken?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
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
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: options.method,
      signal,
      headers: {
        "X-API-Key": apiKey,
        ...(options.accessToken ? { "Authorization": `Bearer ${options.accessToken}` } : {}),
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

  if (!response.ok) {
    const details = await readBungieErrorDetails(response);
    const itemCannotEquip = details?.includes("ErrorCode 1640") ?? false;
    const message = itemCannotEquip
      ? "Bungie 拒绝了这次装备请求（状态码 1640：该装备当前不可装备）。请刷新账号后重试。"
      : details
        ? `Bungie request failed: HTTP ${response.status} (${details})`
        : `Bungie request failed: HTTP ${response.status}`;
    throw createServiceError({
      code: "bungie_http_failed",
      message,
      retryable: itemCannotEquip ? false : response.status >= 500 || response.status === 429,
      causeCategory: itemCannotEquip
        ? "validation"
        : response.status === 401 || response.status === 403 ? "authentication" : "network",
      details: { status: response.status }
    });
  }

  const body = await response.json() as BungiePlatformResponse<T>;
  if (body.ErrorCode !== undefined && body.ErrorCode !== 1) {
    throw createServiceError({
      code: "bungie_api_failed",
      message: `Bungie API error ${body.ErrorCode}: ${body.Message ?? "Unknown error"}`,
      retryable: body.ErrorCode === 5,
      causeCategory: "unavailable",
      details: { bungie_error_code: body.ErrorCode }
    });
  }
  return "Response" in body ? body.Response as T : body as T;
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path.slice(1) : path;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

async function readBungieErrorDetails(response: Response): Promise<string | undefined> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) return undefined;
  try {
    const body = await response.clone().json() as BungiePlatformResponse<unknown>;
    const errorCode = body.ErrorCode !== undefined ? `ErrorCode ${body.ErrorCode}` : undefined;
    return [errorCode, body.Message].filter(Boolean).join(": ") || undefined;
  } catch {
    return undefined;
  }
}
