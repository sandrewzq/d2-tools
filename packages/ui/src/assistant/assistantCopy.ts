import type { ShellCopy } from "../i18n/types.js";
import { replacePlaceholders } from "../i18n/placeholders.js";

/**
 * AI 助手面板文案兜底查表。zh-CN 侧 `inline` 留空，key 本身就是最终展示的中文原文；
 * en-US 侧以同一段中文原文为 key 查英文，查不到就退回中文原文，不会渲染成空白。
 */
export function assistantText(copy: ShellCopy["assistant"], key: string): string {
  return copy.inline[key] ?? key;
}

/**
 * 带占位符的句子走这里：zh-CN 侧 key 就是最终展示的中文原文（含 `{名字}` 占位），
 * en-US 侧以同一段原文为 key 查英文。查不到就退回原文，不会渲染成空白。
 */
export function assistantTemplate(copy: ShellCopy["assistant"], key: string, values: Record<string, string | number>): string {
  return replacePlaceholders(assistantText(copy, key), values, (value) => assistantText(copy, value));
}
