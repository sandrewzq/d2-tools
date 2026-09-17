import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { D2Config } from "@d2-tools/core/config/schema";
import { loadOAuthToken, saveOAuthToken } from "@d2-tools/services/oauth/tokenStore";
import { loadFreshOAuthToken } from "../src/main/ipc/authSession";

/**
 * token 刷新必须全局只有一次在飞（Bug #88）。
 *
 * 启动时账号 Session、最近活动、首页简报、写操作会同时要 token；过去它们各发各的刷新，
 * 隔夜后再打开应用就并发刷出好几个不同的 access token。账号 Session 把 token 变化当成
 * 换账号，正在飞行中的请求被丢弃，界面上报成「登录可能已失效」——而登录完全正常。
 */

function config(dataDir: string): D2Config {
  return {
    bungie: {
      api_key: "api",
      client_id: "client",
      client_secret: "secret",
      redirect_uri: "https://127.0.0.1:28780/oauth/callback"
    },
    data: { data_dir: dataDir, manifest_language: "zh-chs" },
    ai: { protocol: "", api_key: "", model: "", base_url: "" },
    features: { color_mode: "light" }
  };
}

/** 已过期的 token：`created_at` 远在过去，必然触发刷新。 */
function saveExpiredToken(dataDir: string): void {
  saveOAuthToken(dataDir, {
    access_token: "expired-access-token",
    token_type: "Bearer",
    expires_in: 1,
    refresh_token: "refresh-token",
    membership_id: "destiny-1",
    created_at: "2020-01-01T00:00:00.000Z"
  });
}

function stubTokenEndpoint(): { refreshCalls: () => number } {
  let refreshCalls = 0;
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    refreshCalls += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: `fresh-${refreshCalls}`,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "refresh-token",
        membership_id: "destiny-1"
      })
    } as unknown as Response;
  });
  return { refreshCalls: () => refreshCalls };
}

describe("access token 刷新合并", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("并发调用只刷新一次，并拿到同一个新 token", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "d2-tools-token-coalesce-"));
    saveExpiredToken(dataDir);
    const endpoint = stubTokenEndpoint();

    const [first, second, third] = await Promise.all([
      loadFreshOAuthToken(config(dataDir)),
      loadFreshOAuthToken(config(dataDir)),
      loadFreshOAuthToken(config(dataDir))
    ]);

    expect(endpoint.refreshCalls()).toBe(1);
    expect(second.access_token).toBe(first.access_token);
    expect(third.access_token).toBe(first.access_token);
    // 刷新结果必须落盘：下一个调用方不该再刷一次。
    expect(loadOAuthToken(dataDir)?.access_token).toBe(first.access_token);
  });

  it("刷新完成后不再重复刷新（新 token 已在校验窗口内）", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "d2-tools-token-coalesce-"));
    saveExpiredToken(dataDir);
    const endpoint = stubTokenEndpoint();

    const first = await loadFreshOAuthToken(config(dataDir));
    const second = await loadFreshOAuthToken(config(dataDir));

    expect(endpoint.refreshCalls()).toBe(1);
    expect(second.access_token).toBe(first.access_token);
  });
});
