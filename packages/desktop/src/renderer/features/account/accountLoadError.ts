import type { StartupState } from "../../api/types";

/**
 * 账号读取失败的对外文案。
 *
 * 这里过去只判「Bungie 已配置 + 账号已就绪」，于是**任何**错误都被说成
 * 「登录可能已失效，请重新登录 Bungie」——包括应用自己的并发竞态：
 * 用户明明登录正常，却被要求重新登录（Bug #88：
 * `Bungie account session changed while the request was running`）。
 *
 * 现在只有当错误本身确实是认证类时才说登录失效；其余按临时故障措辞。
 * 「是不是认证类」只能看结构化字段（IPC 错误的 `code` / `causeCategory`），
 * 所以调用方必须把**错误对象**传进来，不能只传 message 字符串。
 */
export function formatAccountLoadFailure(state: StartupState, error: unknown): string {
  const message = accountErrorText(error);

  if (state.cards.bungieConfig.status !== "ready") {
    return `未连接 Bungie：请先在设置里填写 Bungie API Key、Client ID 和 Client Secret。${message}`;
  }

  if (state.cards.account.status !== "ready") {
    return `账号还没有登录：请先完成 Bungie 登录。${message}`;
  }

  if (isAuthenticationFailure(error)) {
    return `登录可能已失效，请重新登录 Bungie。${message}`;
  }

  return `读取装备数据时遇到临时问题，稍后会自动重新同步。${message}`;
}

/**
 * 认证类失败：登录态本身有问题，重新登录是正解。
 * `authorization`（有登录但没权限）也算——对用户而言处置都是重新登录。
 */
export function isAuthenticationFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, causeCategory } = error as { code?: unknown; causeCategory?: unknown };
  if (causeCategory === "authentication" || causeCategory === "authorization") return true;
  return typeof code === "string" && (code === "auth_required" || code.endsWith("AUTH_REQUIRED"));
}

/** 错误可能是 Error，也可能是跨包传过来的纯对象（`ServiceError`），两种都要能取到文案。 */
function accountErrorText(error: unknown): string {
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "账号数据读取失败";
}
