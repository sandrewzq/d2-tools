/**
 * 查表用的名字规范化：把同一个名字的不同写法折叠成一个键。
 *
 * 资料库索引查找与人工表格导入校验共用这一份。两边曾经各写各的：校验去掉空格和标点，
 * 查找只 trim + 小写。官方名把中文与字母数字连写（`迪凯特02`），表格里按页面习惯写
 * `迪凯特 02`，于是同一行「校验认、查找找不到」——拿不到定义 hash 的行在校验期被整行拦下，
 * 提示还是「无法根据官方中文名称找到可核对的武器」。
 */
export function normalizeLookupText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{Z}\s]+/gu, "");
}
