import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  bungieAffinityPath,
  createBungieAffinityCookieJar
} from "../src/bungie/cookies.js";

/**
 * 这个文件守的是「写后读回能不能读到自己的写入」这条路（T76）。
 *
 * 真实场景：Bungie 的 Platform 背后是多台后端，写请求只冲掉它命中的那一台的缓存；
 * 不回带 `set-cookie` 下发的粘滞 cookie，随后的读回可能落到另一台还留着旧副本的后端。
 * 这里的每一条都对应一个会让修复静默失效的具体退化。
 */

function tempDataDir(): string {
  return mkdtempSync(join(tmpdir(), "d2-tools-affinity-"));
}

function cookieResponse(...lines: string[]): Response {
  const headers = new Headers();
  for (const line of lines) headers.append("set-cookie", line);
  return new Response("{}", { status: 200, headers });
}

function readPersistedCookies(dataDir: string): Record<string, unknown> {
  const path = bungieAffinityPath(dataDir);
  if (!existsSync(path)) return {};
  return (JSON.parse(readFileSync(path, "utf8")) as { cookies?: Record<string, unknown> }).cookies ?? {};
}

const farFuture = "Wed, 01 Jan 2031 00:00:00 GMT";

describe("Bungie affinity cookie jar", () => {
  it("回带捕获到的 __cflb，并按第一个 = 切分名值", () => {
    const jar = createBungieAffinityCookieJar({ dataDir: tempDataDir() });
    jar.capture(cookieResponse(`__cflb=a=b=c; Expires=${farFuture}; Secure`));
    expect(jar.cookieHeader()).toBe("__cflb=a=b=c");
  });

  it("Max-Age 优先于 Expires，并按时间过期", () => {
    let now = Date.parse("2026-09-18T00:00:00.000Z");
    const jar = createBungieAffinityCookieJar({ dataDir: tempDataDir(), now: () => now });
    // Expires 说 2031 年才到期；Max-Age=600 才是真的。只认 Expires 的解析器会在这里挂住。
    jar.capture(cookieResponse(`__cflb=abc123; Expires=${farFuture}; Max-Age=600`));
    expect(jar.cookieHeader()).toBe("__cflb=abc123");
    now += 601_000;
    expect(jar.cookieHeader()).toBeUndefined();
  });

  it("墓碑（Max-Age=0）必须删条目，且不写进文件", () => {
    const dataDir = tempDataDir();
    const jar = createBungieAffinityCookieJar({ dataDir });
    jar.capture(cookieResponse("__cflb=abc123; Max-Age=3600"));
    expect(jar.cookieHeader()).toBe("__cflb=abc123");

    jar.capture(cookieResponse("__cflb=abc123; Max-Age=0"));
    expect(jar.cookieHeader()).toBeUndefined();
    // 只做「后写覆盖」的话，下次启动会把作废的值从文件里读回来永久回带。
    expect(readPersistedCookies(dataDir)).toEqual({});
  });

  it("白名单之外的名字既不回带也不落盘", () => {
    const dataDir = tempDataDir();
    const jar = createBungieAffinityCookieJar({ dataDir });
    jar.capture(cookieResponse(
      "cf_clearance=super-secret; Max-Age=3600",
      "__cflb=abc123; Max-Age=3600"
    ));
    expect(jar.cookieHeader()).toBe("__cflb=abc123");
    expect(readFileSync(bungieAffinityPath(dataDir), "utf8")).not.toContain("super-secret");
  });

  it("落盘后能被新实例读回（含首次创建目录）", () => {
    const dataDir = join(tempDataDir(), "尚未创建的目录");
    createBungieAffinityCookieJar({ dataDir })
      .capture(cookieResponse("__cflb=keepme; Max-Age=3600"));

    const reloaded = createBungieAffinityCookieJar({ dataDir });
    expect(reloaded.cookieHeader()).toBe("__cflb=keepme");
  });

  it("会话级 cookie（没有到期属性）留在内存，不跨实例", () => {
    const dataDir = tempDataDir();
    const jar = createBungieAffinityCookieJar({ dataDir });
    jar.capture(cookieResponse("__cflb=sessiononly"));
    expect(jar.cookieHeader()).toBe("__cflb=sessiononly");
    expect(readPersistedCookies(dataDir)).toEqual({});
  });

  it("过期条目载入时即被丢弃", () => {
    const dataDir = tempDataDir();
    writeFileSync(bungieAffinityPath(dataDir), JSON.stringify({
      version: 1,
      cookies: { __cflb: { value: "stale", expires_at: "2020-01-01T00:00:00.000Z" } }
    }), "utf8");
    expect(createBungieAffinityCookieJar({ dataDir }).cookieHeader()).toBeUndefined();
  });

  it("版本号不认识的文件被忽略，不当成坏数据", () => {
    const dataDir = tempDataDir();
    writeFileSync(bungieAffinityPath(dataDir), JSON.stringify({
      version: 99,
      cookies: { __cflb: { value: "fromthefuture", expires_at: "2031-01-01T00:00:00.000Z" } }
    }), "utf8");
    expect(createBungieAffinityCookieJar({ dataDir }).cookieHeader()).toBeUndefined();
  });

  it("读不动的文件只降级为空 jar，之后仍能重新捕获", () => {
    const dataDir = tempDataDir();
    writeFileSync(bungieAffinityPath(dataDir), "{ 这不是 JSON", "utf8");
    const jar = createBungieAffinityCookieJar({ dataDir });
    expect(jar.cookieHeader()).toBeUndefined();

    jar.capture(cookieResponse("__cflb=abc123; Max-Age=3600"));
    expect(jar.cookieHeader()).toBe("__cflb=abc123");
  });

  it("对没有 headers 的 Response 免疫", () => {
    // 现有测试（packages/desktop/test/account-token-refresh-coalescing.test.ts）就是这样
    // 打桩全局 fetch 的，而那正是本漏斗会调到的对象。
    const jar = createBungieAffinityCookieJar({ dataDir: tempDataDir() });
    expect(() => jar.capture({ ok: true, status: 200 } as unknown as Response)).not.toThrow();
    expect(jar.cookieHeader()).toBeUndefined();
  });
});
