import type { InterfaceLocale, LocaleCopy } from "../types.js";

export const vaultCopy: Record<InterfaceLocale, LocaleCopy["vault"]> = {
    "zh-CN": {
      title: "仓库",
      subtitle: "查看完整仓库列表、清理候选、同名对比和推荐命中。",
      emptyTitle: "仓库",
      emptySubtitle: "先读取账号数据，然后查看完整仓库列表。",
      loading: "读取中...",
      loadAccount: "读取账号数据"
    },
    "en-US": {
      title: "Vault",
      subtitle: "Review the full vault, cleanup candidates, duplicate comparisons, and recommendation hits.",
      emptyTitle: "Vault",
      emptySubtitle: "Read account data first, then review the full vault list.",
      loading: "Reading...",
      loadAccount: "Read account data"
    }
};
