import { afterEach, describe, expect, it, vi } from "vitest";
import { isSupportedPublicUrlText, readPublicTextUrl } from "../src/net/publicUrlReader.js";

/**
 * 共享的公开链接读取边界（T63）。
 *
 * 攻略链接与愿望单链接共用这一份实现，守的是同一件事：**只把一段公网文本取回来**。
 * 四道关（协议、跳转、体积、超时）里最容易在改动里悄悄失效的是跳转——
 * 它必须一跳一跳地重新校验，否则「先给一个公网地址、再跳到 127.0.0.1」就能绕过去。
 */

/** 公网 IP 字面量：测试里不查 DNS，也不碰真网络。 */
const publicHost = "https://93.184.216.34";
const options = {
  label: "愿望单链接",
  userAgent: "d2-tools-test-reader",
  maxBytes: 1024 * 1024,
  timeoutMs: 1000
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("公开链接读取边界", () => {
  it("只接受 http 与 https，且不接受带凭据的地址", async () => {
    const calls = stubFetch(() => new Response("never", { status: 200 }));

    for (const rejected of ["file:///etc/passwd", "javascript:alert(1)", "data:text/plain,hi"]) {
      await expect(readPublicTextUrl(rejected, options)).rejects.toThrow("愿望单链接必须是一个 http 或 https 地址。");
    }
    expect(isSupportedPublicUrlText(`${publicHost}/a.txt`)).toBe(true);
    expect(isSupportedPublicUrlText("https://user:pass@93.184.216.34/a.txt")).toBe(false);
    // 拒绝发生在本机任何动作之前：一条请求都不该发出去。
    expect(calls).toEqual([]);
  });

  it("拒绝本机与局域网地址，且不发起请求", async () => {
    const calls = stubFetch(() => new Response("never", { status: 200 }));

    for (const rejected of ["http://127.0.0.1/a.txt", "http://localhost/a.txt", "http://10.0.0.5/a.txt", "http://192.168.1.10/a.txt"]) {
      await expect(readPublicTextUrl(rejected, options)).rejects.toThrow("愿望单链接不能访问本机或局域网地址。");
    }
    expect(calls).toEqual([]);
  });

  it("跳转落地后仍然必须是公网地址", async () => {
    // 「先公网、再跳内网」是这条边界最典型的绕法：只有第一跳被校验就守不住。
    const calls = stubFetch((url) => url.endsWith("/start.txt")
      ? redirectTo("http://127.0.0.1/secret.txt")
      : new Response("secret", { status: 200 }));

    await expect(readPublicTextUrl(`${publicHost}/start.txt`, options)).rejects.toThrow("愿望单链接不能访问本机或局域网地址。");
    expect(calls).toEqual([`${publicHost}/start.txt`]);
  });

  it("跟随跳转并记录最终地址", async () => {
    stubFetch((url) => url.endsWith("/start.txt")
      ? redirectTo(`${publicHost}/real.txt`)
      : new Response("dimwishlist:item=1&perks=2", { status: 200, headers: { "content-type": "text/plain" } }));

    const result = await readPublicTextUrl(`${publicHost}/start.txt`, options);
    expect(result.final_url).toBe(`${publicHost}/real.txt`);
    expect(result.text).toBe("dimwishlist:item=1&perks=2");
    expect(result.warnings).toEqual([`来源经过跳转：${publicHost}/real.txt`]);
  });

  it("跳转缺少目标地址、或跳转次数过多都当场报错", async () => {
    stubFetch(() => new Response("", { status: 302 }));
    await expect(readPublicTextUrl(`${publicHost}/start.txt`, options)).rejects.toThrow("愿望单链接返回了缺少目标地址的跳转。");

    const calls = stubFetch((url) => redirectTo(`${url}-next`));
    await expect(readPublicTextUrl(`${publicHost}/start.txt`, { ...options, maxRedirects: 2 })).rejects.toThrow("愿望单链接跳转次数过多。");
    expect(calls).toHaveLength(3);
  });

  it("正文超过上限时中断，且在读正文之前先看声明的体积", async () => {
    stubFetch(() => new Response("x".repeat(1_500_000), { status: 200, headers: { "content-type": "text/plain" } }));
    await expect(readPublicTextUrl(`${publicHost}/big.txt`, options)).rejects.toThrow("愿望单链接超过 1 MB 读取上限。");

    stubFetch(() => new Response("tiny", { status: 200, headers: { "content-type": "text/plain", "content-length": "200000000" } }));
    await expect(readPublicTextUrl(`${publicHost}/declared-big.txt`, options)).rejects.toThrow("愿望单链接超过 1 MB 读取上限。");
  });

  it("请求只带可识别的 UA 与超时信号，不带任何本机凭据", async () => {
    let captured: RequestInit | undefined;
    const calls = stubFetch((_url, init) => {
      captured = init;
      return new Response("text", { status: 200, headers: { "content-type": "text/plain" } });
    });

    await readPublicTextUrl(`${publicHost}/a.txt`, options);

    expect(calls).toEqual([`${publicHost}/a.txt`]);
    expect(captured?.redirect).toBe("manual");
    expect(captured?.signal).toBeInstanceOf(AbortSignal);
    const headers = captured?.headers as Record<string, string>;
    expect(headers["User-Agent"]).toBe("d2-tools-test-reader");
    expect(Object.keys(headers).map((key) => key.toLocaleLowerCase())).not.toContain("cookie");
    // 凭据不从本机环境里被自动带上：没有 Authorization，也没有任何继承来的头。
    expect(Object.keys(headers)).toEqual(["User-Agent"]);
  });

  it("内容类型白名单给了就按它卡", async () => {
    stubFetch(() => new Response("<html></html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }));
    await expect(readPublicTextUrl(`${publicHost}/a.html`, { ...options, acceptedContentTypes: ["text/plain"] })).rejects.toThrow("愿望单链接的内容类型不受支持：text/html。");

    // 不给白名单就不挑内容类型——内容本身能不能用由调用方判断。
    stubFetch(() => new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } }));
    const result = await readPublicTextUrl(`${publicHost}/a.html`, options);
    expect(result.content_type).toBe("text/html");
  });
});

function stubFetch(handler: (url: string, init?: RequestInit) => Response): string[] {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof URL ? input.toString() : String(input);
    calls.push(url);
    return handler(url, init);
  }));
  return calls;
}

function redirectTo(location: string): Response {
  return new Response(null, { status: 302, headers: { location } });
}
