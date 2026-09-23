import type { ItemDetailCopy } from "../i18n/types.js";

/**
 * 装备详情文案兜底查表。zh-CN 侧 `inline` 留空，key 本身就是最终展示的中文原文；
 * en-US 侧以同一段中文原文为 key 查英文，查不到就退回中文原文，不会渲染成空白。
 */
export function itemDetailText(copy: ItemDetailCopy, key: string): string {
  return copy.inline[key] ?? key;
}

/**
 * 带占位符的句子走这里：zh-CN 侧 key 就是最终展示的中文原文（含 `{名字}` 占位），
 * en-US 侧以同一段原文为 key 查英文。查不到就退回原文，不会渲染成空白。
 */
export function itemDetailTemplate(copy: ItemDetailCopy, key: string, values: Record<string, string | number>): string {
  return itemDetailText(copy, key).replace(/\{(\w+)\}/gu, (match, name: string) =>
    name in values ? String(values[name]) : match);
}
