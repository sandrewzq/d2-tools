import type { ShellCopy } from "../i18n/types.js";
import { replacePlaceholders } from "../i18n/placeholders.js";

/**
 * 外壳文案查表。zh-CN 侧 key 就是最终展示的中文原文；
 * en-US 侧以同一段中文原文为 key 查英文，查不到就退回 key 本身，不会渲染成空白。
 */
export function shellText(copy: ShellCopy, key: string): string {
  return copy.inline[key] ?? key;
}

/**
 * 带占位符的句子走这里：zh-CN 侧 key 就是含 `{名字}` 占位的中文原文，
 * en-US 侧以同一段原文为 key 查英文。查不到就退回原文。
 */
export function shellTemplate(copy: ShellCopy, key: string, values: Record<string, string | number>): string {
  return replacePlaceholders(shellText(copy, key), values, (value) => shellText(copy, value));
}
