import { describe, expect, it } from "vitest";
import type { StartupState } from "../src/renderer/api/types";
import {
  formatAccountLoadFailure,
  isAuthenticationFailure
} from "../src/renderer/features/account/accountLoadError";

/**
 * 「登录可能已失效」只能用在真的认证失败上（Bug #88）。
 *
 * 过去这段判断只看「Bungie 已配置 + 账号已就绪」，于是应用自己的并发竞态
 * （`Bungie account session changed while the request was running`）也被说成登录失效，
 * 用户明明登录正常却被要求重新登录。
 */

function readyState(): StartupState {
  return {
    cards: {
      bungieConfig: { status: "ready" },
      account: { status: "ready" },
      manifest: { status: "ready" },
      ai: { status: "ready" }
    }
  } as unknown as StartupState;
}

/** 跨 IPC 传来的错误是纯对象（`DesktopIpcError` 形状），不是 Error 实例。 */
function ipcError(input: { code: string; message: string; causeCategory?: string }): Error {
  const error = new Error(input.message) as Error & { code: string; causeCategory?: string };
  error.name = "DesktopIpcError";
  error.code = input.code;
  if (input.causeCategory) error.causeCategory = input.causeCategory;
  return error;
}

describe("账号读取失败文案", () => {
  it("认证类错误才说「登录可能已失效」", () => {
    const error = ipcError({
      code: "ACCOUNT_AUTH_REQUIRED",
      message: "请先登录 Bungie",
      causeCategory: "authentication"
    });

    expect(isAuthenticationFailure(error)).toBe(true);
    expect(formatAccountLoadFailure(readyState(), error)).toContain("登录可能已失效");
  });

  it("内部竞态不冒充登录失效", () => {
    const error = ipcError({
      code: "ACCOUNT_LOAD_FAILED",
      message: "Bungie account session changed while the request was running",
      causeCategory: "internal"
    });

    expect(isAuthenticationFailure(error)).toBe(false);
    const message = formatAccountLoadFailure(readyState(), error);
    expect(message).not.toContain("登录可能已失效");
    expect(message).toContain("稍后会自动重新同步");
  });

  it("网络类错误同样不冒充登录失效", () => {
    const error = ipcError({
      code: "ACCOUNT_NETWORK_FAILED",
      message: "Bungie 请求失败",
      causeCategory: "network"
    });

    expect(formatAccountLoadFailure(readyState(), error)).not.toContain("登录可能已失效");
  });

  it("没登录 / 没配置 Bungie 时维持原有提示（与「登录失效」区分开）", () => {
    const state = readyState();
    state.cards.account = { status: "missing" } as StartupState["cards"]["account"];

    expect(formatAccountLoadFailure(state, new Error("读取失败"))).toContain("账号还没有登录");
  });

  it("纯 message 的旧式错误不误判成认证失败", () => {
    expect(isAuthenticationFailure(new Error("Bungie account session changed while the request was running"))).toBe(false);
    expect(isAuthenticationFailure(null)).toBe(false);
  });
});
