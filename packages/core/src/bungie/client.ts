export type FetchBungieJsonOptions = {
  apiKey: string;
  accessToken?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
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
  const response = await fetchImpl(url, {
    method: options.method,
    headers: {
      "X-API-Key": apiKey,
      ...(options.accessToken ? { "Authorization": `Bearer ${options.accessToken}` } : {}),
      "Accept": "application/json",
      ...(options.method === "POST" ? { "Content-Type": "application/json" } : {})
    },
    ...(options.method === "POST" ? { body: JSON.stringify(options.body ?? {}) } : {})
  });

  if (!response.ok) {
    throw new Error(`Bungie request failed: HTTP ${response.status}`);
  }

  const body = await response.json() as BungiePlatformResponse<T>;
  if (body.ErrorCode !== undefined && body.ErrorCode !== 1) {
    throw new Error(`Bungie API error ${body.ErrorCode}: ${body.Message ?? "Unknown error"}`);
  }

  if ("Response" in body) {
    return body.Response as T;
  }

  return body as T;
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path.slice(1) : path;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
