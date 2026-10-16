/**
 * 一段展示文本。
 *
 * `packages/app` 不认识界面语言，所以这里不写死译文，只产出 copy 表的 key 与取值，
 * 句子由 UI 层按 `copy` 现算。`literal` 为真表示 key 本身就是数据原文
 * （物品类型、桶名、tier、用户命名等），渲染层原样输出，不进 copy 查表——
 * 否则「头盔」「异域」这类会撞上 copy 里同名 UI 文本的键，被误译成英文。
 */
export type AccountTextToken = {
  key: string;
  values?: Record<string, string | number>;
  literal?: boolean;
};

/** 数据原文片段：渲染层原样输出，不查表。 */
export function literalText(value: string | undefined | null): AccountTextToken | undefined {
  return value ? { key: value, literal: true } : undefined;
}

/** 去掉空片段，收敛成最终的 token 数组。 */
export function filterTextTokens(values: Array<AccountTextToken | undefined | null>): AccountTextToken[] {
  return values.filter((value): value is AccountTextToken => Boolean(value));
}
