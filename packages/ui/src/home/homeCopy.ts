import type { WeeklyTextToken } from "@d2-tools/core/weekly/summary";
import type { HomeCopy } from "../i18n/types.js";
import { replacePlaceholders } from "../i18n/placeholders.js";

/**
 * 首页文案兜底查表。zh-CN 侧 `inline` 留空，key 本身就是最终展示的中文原文；
 * en-US 侧以同一段中文原文为 key 查英文，查不到就退回中文原文，不会渲染成空白。
 */
export function homeText(copy: HomeCopy, key: string): string {
  return copy.inline[key] ?? key;
}

/**
 * 带占位符的句子走这里：zh-CN 侧 key 就是最终展示的中文原文（含 `{名字}` 占位），
 * en-US 侧以同一段原文为 key 查英文。查不到就退回原文，不会渲染成空白。
 */
export function homeTemplate(copy: HomeCopy, key: string, values: Record<string, string | number>): string {
  return replacePlaceholders(homeText(copy, key), values, (value) => homeText(copy, value));
}

/**
 * 周报 token 成句。`literal` 的 token 是数据原文（活动名、目标名），原样输出、不进表；
 * 其余 token 的 `key` 是中文原文模板，取值在 `params` 里。
 */
export function homeToken(copy: HomeCopy, token: WeeklyTextToken | undefined | null): string {
  if (!token) return "";
  if (token.literal) return token.key;
  return token.params ? homeTemplate(copy, token.key, token.params) : homeText(copy, token.key);
}

/** 一段由多个 token 拼成的说明句，分隔符本身也过表（中英标点不同）。 */
export function homeTokenList(copy: HomeCopy, tokens: WeeklyTextToken[] | undefined): string {
  return (tokens ?? [])
    .map((token) => homeToken(copy, token))
    .filter(Boolean)
    .join(homeText(copy, " · "));
}
