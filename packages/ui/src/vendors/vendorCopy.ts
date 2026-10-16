import type { VendorsCopy } from "../i18n/types.js";
import { replacePlaceholders } from "../i18n/placeholders.js";

/**
 * 商人文案查表。zh-CN 侧 key 就是最终展示的中文原文；
 * en-US 侧以同一段中文原文为 key 查英文，查不到就退回 key 本身，不会渲染成空白。
 */
export function vendorsText(copy: VendorsCopy, key: string): string {
  return copy.inline[key] ?? key;
}

/**
 * 带占位符的句子走这里：zh-CN 侧 key 就是含 `{名字}` 占位的中文原文，
 * en-US 侧以同一段原文为 key 查英文。查不到就退回原文。
 */
export function vendorsTemplate(copy: VendorsCopy, key: string, values: Record<string, string | number>): string {
  return replacePlaceholders(vendorsText(copy, key), values, (value) => vendorsText(copy, value));
}

/**
 * 上游抛出的错误文本也过一遍查表。
 *
 * IPC 带上来的 `message` 是上游原文（`core` / `services` 里抛的中文），英文界面下会整条露出中文。
 * 把已经登记过的原文交给同一张表查译文，未登记的（例如 Bungie 自己返回的英文 HTTP 错误）原样透出，
 * 不做替换——界面文案不该靠猜上游文本。
 */
export function vendorsErrorText(copy: VendorsCopy, error: unknown, fallbackKey: string): string {
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return vendorsText(copy, message);
  }
  return vendorsText(copy, fallbackKey);
}
