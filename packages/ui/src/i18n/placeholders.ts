/**
 * 占位符替换的统一实现，各菜单的 `xxxTemplate` 都走这里。
 *
 * `{class}` / `{className}` 的值是 app 侧对 Bungie `classType` 的映射结果
 * （「猎人」「泰坦」「术士」这类应用内文案），不是上游数据的原文，所以要和普通界面文本
 * 一样过 copy 表，否则英文界面里会剩下「Switch to 猎人」这种半截句子。
 *
 * 其余占位符保持原样：它们的值是装备名、桶名、tier、赛季名这类数据原文，过表会被 copy
 * 表里同名的界面文本误译（仓库表里就有 `"武器": "Weapon"`，而物品类型字段的值正好也是「武器」）。
 */
const CLASS_PLACEHOLDER_NAMES: ReadonlySet<string> = new Set(["class", "className"]);

/**
 * 把 `{name}` 占位符替换成取值。
 *
 * `text` 是该菜单的查表函数（`xxxText`），只用来翻译职业名，不参与其他占位符。
 * 取值为空字符串时照样替换，保持改动前的行为。
 */
export function replacePlaceholders(
  template: string,
  values: Record<string, string | number>,
  text: (key: string) => string
): string {
  return template.replace(/\{(\w+)\}/gu, (match, name: string) => {
    if (!(name in values)) return match;
    const value = values[name];
    return CLASS_PLACEHOLDER_NAMES.has(name) ? text(String(value)) : String(value);
  });
}
