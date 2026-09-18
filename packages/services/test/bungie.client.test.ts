import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchBungieJson, postBungieJson } from "../src/bungie/client.js";
import { D2ServiceError } from "../src/errors.js";
import {
  configureBungieCookieJar,
  createBungieAffinityCookieJar
} from "../src/bungie/cookies.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

/** 接住一次应当抛出的调用。`rejects.toThrow` 只看得到 message，这里要连 `retryable` / `details` 一起看。 */
async function catchRejection(run: () => Promise<unknown>): Promise<D2ServiceError> {
  try {
    await run();
  } catch (error) {
    if (error instanceof D2ServiceError) return error;
    throw error;
  }
  throw new Error("期望这次调用抛错，但它成功了");
}

const bungieBaseUrl = "https://www.bungie.net/Platform";
const farFuture = "Wed, 01 Jan 2031 00:00:00 GMT";

function setCookieResponse(cookieLine: string): Response {
  return new Response(JSON.stringify({ ErrorCode: 1, Response: { ok: true } }), {
    status: 200,
    headers: { "content-type": "application/json", "set-cookie": cookieLine }
  });
}

function emptyJar() {
  return createBungieAffinityCookieJar({ dataDir: mkdtempSync(join(tmpdir(), "d2-tools-client-affinity-")) });
}

describe("Bungie API client", () => {
  it("sends the API key header and unwraps successful responses", async () => {
    let request: Request | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ ErrorCode: 1, Response: { version: "123" } });
    };

    await expect(fetchBungieJson<{ version: string }>("/Destiny2/Manifest/", {
      apiKey: "api-key", baseUrl: "https://example.test/Platform", fetchImpl
    })).resolves.toEqual({ version: "123" });
    expect(request?.url).toBe("https://example.test/Platform/Destiny2/Manifest/");
    expect(request?.headers.get("x-api-key")).toBe("api-key");
  });

  it("sends authenticated POST requests and reports Bungie failures", async () => {
    let request: Request | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ ErrorCode: 1, Response: { ok: true } });
    };

    await expect(postBungieJson("/Destiny2/Actions/Items/EquipItem/", { itemId: "item-1" }, {
      apiKey: "api-key", accessToken: "access-token", baseUrl: "https://example.test/Platform", fetchImpl
    })).resolves.toEqual({ ok: true });
    expect(request?.headers.get("authorization")).toBe("Bearer access-token");
    expect(await request?.json()).toEqual({ itemId: "item-1" });

    await expect(fetchBungieJson("/Destiny2/Manifest/", {
      apiKey: "api", fetchImpl: async () => jsonResponse({ ErrorCode: 5, Message: "System disabled" })
    })).rejects.toThrow("Bungie API error 5: System disabled");
  });

  it("把认识的游戏状态拒绝换成中文动作句，并标成不可自动重试", async () => {
    // 2026-09-18 实窗：角色在活动中换 Perk，Bungie 回 HTTP 500 + ErrorCode 1634，
    // 写面板上直接显示英文原文，用户看不出该做什么。
    const error = await catchRejection(() => fetchBungieJson("/Destiny2/Profile/", {
      apiKey: "api",
      fetchImpl: async () => jsonResponse(
        { ErrorCode: 1634, Message: "You must either be logged off or in orbit to perform this action." },
        500
      )
    }));

    expect(error.message).toContain("状态码 1634：角色正在活动中");
    // 重试一百次角色还在活动里；归成网络问题还会让调用方以为过一会儿自己会好。
    expect({
      retryable: error.retryable,
      causeCategory: error.causeCategory,
      details: error.details
    }).toEqual({
      retryable: false,
      causeCategory: "validation",
      details: { status: 500, bungie_error_code: 1634 }
    });
  });

  it("同一个码走 HTTP 200 回来也认，不认识的码仍透传原文", async () => {
    await expect(fetchBungieJson("/Destiny2/Profile/", {
      apiKey: "api",
      fetchImpl: async () => jsonResponse({ ErrorCode: 1634, Message: "You must either be logged off or in orbit to perform this action." })
    })).rejects.toThrow("状态码 1634：角色正在活动中");

    // 1640（装备当前不可装备）原本就是这条路上唯一的特例，顺手钉住它还在。
    await expect(fetchBungieJson("/Destiny2/Actions/Items/EquipItem/", {
      apiKey: "api",
      fetchImpl: async () => jsonResponse({ ErrorCode: 1640, Message: "The item is not equippable." }, 500)
    })).rejects.toThrow("状态码 1640：该装备当前不可装备");

    // 没见过的码不做翻译：宁可给原文，也不要编一句可能不准的中文。
    await expect(fetchBungieJson("/Destiny2/Profile/", {
      apiKey: "api",
      fetchImpl: async () => jsonResponse({ ErrorCode: 99, Message: "Something new" }, 500)
    })).rejects.toThrow("Bungie request failed: HTTP 500 (ErrorCode 99: Something new)");
  });
});

describe("Bungie 请求漏斗的粘滞 cookie（affinitize）", () => {
  afterEach(() => {
    configureBungieCookieJar(undefined);
  });

  it("捕获 set-cookie 并在下一次请求回带", async () => {
    const requests: Request[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      requests.push(new Request(input, init));
      return setCookieResponse(`__cflb=abc123; Expires=${farFuture}; HttpOnly; SameSite=None; Secure`);
    };
    const options = {
      apiKey: "api-key",
      baseUrl: bungieBaseUrl,
      fetchImpl,
      cookieJar: emptyJar()
    };

    await fetchBungieJson("/Destiny2/Manifest/", options);
    expect(requests[0]?.headers.get("cookie")).toBeNull();

    await fetchBungieJson("/Destiny2/Manifest/", options);
    expect(requests[1]?.headers.get("cookie")).toBe("__cflb=abc123");
  });

  it("jar 为空时不发 Cookie 头", async () => {
    let request: Request | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ ErrorCode: 1, Response: {} });
    };

    await fetchBungieJson("/Destiny2/Manifest/", {
      apiKey: "api-key", baseUrl: bungieBaseUrl, fetchImpl, cookieJar: emptyJar()
    });
    expect(request?.headers.get("cookie")).toBeNull();
  });

  it("cookieJar: false 能关掉整条粘滞链路", async () => {
    let request: Request | undefined;
    // 先让活跃 jar 里真的有值，否则「没发 Cookie」是空 jar 的必然结果，证明不了什么。
    const jar = emptyJar();
    jar.capture(setCookieResponse(`__cflb=abc123; Expires=${farFuture}`));
    expect(jar.cookieHeader()).toBe("__cflb=abc123");
    configureBungieCookieJar(jar);
    const options = {
      apiKey: "api-key",
      baseUrl: bungieBaseUrl,
      cookieJar: false as const,
      fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
        request = new Request(input, init);
        return setCookieResponse(`__cflb=def456; Expires=${farFuture}`);
      }) as typeof fetch
    };

    await fetchBungieJson("/Destiny2/Manifest/", options);
    await fetchBungieJson("/Destiny2/Manifest/", options);
    expect(request?.headers.get("cookie")).toBeNull();
    // 也没把响应里的新值写进 jar。
    expect(jar.cookieHeader()).toBe("__cflb=abc123");
  });

  it("非 Bungie 主机的请求既不回带也不捕获", async () => {
    const requests: Request[] = [];
    const jar = emptyJar();
    jar.capture(setCookieResponse(`__cflb=abc123; Expires=${farFuture}`));
    expect(jar.cookieHeader()).toBe("__cflb=abc123");
    configureBungieCookieJar(jar);
    const fetchImpl: typeof fetch = async (input, init) => {
      requests.push(new Request(input, init));
      return setCookieResponse(`__cflb=def456; Expires=${farFuture}`);
    };

    // 现有测试用的就是 example.test；粘滞标识是 Bungie host 的，不能跟着 baseUrl 跑。
    await fetchBungieJson("/Destiny2/Manifest/", {
      apiKey: "api-key", baseUrl: "https://example.test/Platform", fetchImpl
    });
    await fetchBungieJson("/Destiny2/Manifest/", {
      apiKey: "api-key", baseUrl: "https://example.test/Platform", fetchImpl
    });

    expect(requests).toHaveLength(2);
    expect(requests[0]?.headers.get("cookie")).toBeNull();
    expect(requests[1]?.headers.get("cookie")).toBeNull();
    expect(jar.cookieHeader()).toBe("__cflb=abc123");
  });

  it("对没有 headers 的 Response 不抛异常", async () => {
    // 这正是 packages/desktop/test/account-token-refresh-coalescing.test.ts 打桩全局 fetch 的形状。
    await expect(fetchBungieJson("/Destiny2/Manifest/", {
      apiKey: "api-key",
      baseUrl: bungieBaseUrl,
      cookieJar: emptyJar(),
      fetchImpl: (async () => ({ ok: true, status: 200, json: async () => ({ ErrorCode: 1, Response: {} }) })) as unknown as typeof fetch
    })).resolves.toEqual({});
  });
});
