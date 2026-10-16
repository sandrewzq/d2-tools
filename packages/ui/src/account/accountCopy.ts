import type { AccountTextToken } from "@d2-tools/app/account";
import type { AccountCopy } from "../i18n/types.js";
import { replacePlaceholders } from "../i18n/placeholders.js";

/**
 * 账号文案查表。zh-CN 的 `inline` 里 key 基本都是最终展示的中文原文；
 * en-US 侧以同一段中文原文为 key 查英文，查不到就退回 key 本身，不会渲染成空白。
 */
export function accountText(copy: AccountCopy, key: string): string {
  return copy.inline[key] ?? key;
}

/**
 * 带占位符的句子走这里：zh-CN 侧 key 就是含 `{名字}` 占位的中文原文，
 * en-US 侧以同一段原文为 key 查英文。查不到就退回原文。
 */
export function accountTemplate(copy: AccountCopy, key: string, values: Record<string, string | number>): string {
  return replacePlaceholders(accountText(copy, key), values, (value) => accountText(copy, value));
}

/**
 * app 侧产出的展示 token 成句。`literal` 的数据原文（物品类型、桶名、tier 等）
 * 原样输出，不进 copy 查表；UI 文本按 key 查表，带 `values` 时走模板。
 */
export function accountTokenText(copy: AccountCopy, token: AccountTextToken): string {
  if (token.literal) return token.key;
  return token.values ? accountTemplate(copy, token.key, token.values) : accountText(copy, token.key);
}

/** 多段 token 用调用方给的连接符拼；连接符本身也交给调用方从 copy 取，跟着语言走。 */
export function accountTokensText(copy: AccountCopy, tokens: AccountTextToken[], separator: string): string {
  return tokens.map((token) => accountTokenText(copy, token)).join(separator);
}

/**
 * 上游抛出的错误文本也过一遍查表。
 *
 * IPC 带上来的 `message` 是上游原文（`core` / `services` 里抛的中文），英文界面下会整条露出中文。
 * 把已经登记过的原文交给同一张表查译文，未登记的（例如 Bungie 自己返回的英文错误）原样透出。
 * 错误可能是 `Error`，也可能是跨包传过来的纯对象（`ServiceError`），两种都要能取到文案。
 */
export function accountErrorText(copy: AccountCopy, error: unknown, fallbackKey: string): string {
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return accountText(copy, message);
  }
  return accountText(copy, fallbackKey);
}
