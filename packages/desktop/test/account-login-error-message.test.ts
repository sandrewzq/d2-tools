import { describe, expect, it } from "vitest";
import { formatBungieLoginError } from "../src/renderer/features/account/loginErrors";

describe("account login error message", () => {
  it("removes Electron IPC wrapper from Bungie login failures", () => {
    const error = new Error(
      "Error invoking remote method 'auth:login': Error: Bungie 登录回调端口 28780 已被占用。请关闭重复打开的 d2-tools 或占用该端口的程序后重试。"
    );

    expect(formatBungieLoginError(error)).toBe(
      "Bungie 登录回调端口 28780 已被占用。请关闭重复打开的 d2-tools 或占用该端口的程序后重试。"
    );
  });

  it("uses a Chinese fallback for unknown login failures", () => {
    expect(formatBungieLoginError(null)).toBe("Bungie 登录失败，请稍后重试");
  });
});
