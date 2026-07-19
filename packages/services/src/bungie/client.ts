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
    throw new Error("Bungie API key is required");
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
      throw new Error(`Bungie request timed out after ${timeoutMs} ms`);
    }
    throw error;
  }

  if (!response.ok) {
    const details = await readBungieErrorDetails(response);
    throw new Error(details
      ? `Bungie request failed: HTTP ${response.status} (${details})`
      : `Bungie request failed: HTTP ${response.status}`);
  }

  const body = await response.json() as BungiePlatformResponse<T>;
  if (body.ErrorCode !== undefined && body.ErrorCode !== 1) {
    throw new Error(`Bungie API error ${body.ErrorCode}: ${body.Message ?? "Unknown error"}`);
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
