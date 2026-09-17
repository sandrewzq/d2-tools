import type { RecommendationSourceKind } from "./recommendationDocumentStore.js";

/**
 * 来源格式的**面向用户名字**：存储里的类型（`kind`）→ 界面上显示的那几个字。
 *
 * 这张表是「格式名 → 用户说法」的唯一出处。表按 `kind` 取值索引，不是分支：
 * 新增一种格式时类型上必须在这里补一行，否则编译不过——「新格式没名字」会当场暴露，
 * 而不是在界面上显示一个内部代号。
 *
 * 表里的词是**内容描述**，不是格式名：面向用户不出现 `DIM` / `CSV` 这类称呼。
 * 消费方（管理面 / 界面）拿到的就是字符串，照原样显示，不得再按格式分叉。
 */
export const recommendationSourceKindLabels: Record<RecommendationSourceKind, string> = {
  csv: "推荐表格",
  dim: "愿望单文本"
};

/**
 * 取一个来源类型对应的用户说法。
 *
 * 入参是存储里读回来的字符串：库里存着历史遗留的类型值（`builtin` / `excel`，当前没有写入方），
 * 认不出来就返回空串——调用方据此不显示，而不是把内部代号漏到界面上。
 */
export function recommendationSourceKindLabel(kind: string): string {
  return recommendationSourceKindLabels[kind as RecommendationSourceKind] ?? "";
}
