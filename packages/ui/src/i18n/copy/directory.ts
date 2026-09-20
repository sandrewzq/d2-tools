import type { InterfaceLocale, LocaleCopy } from "../types.js";

export const directoryCopy: Record<InterfaceLocale, LocaleCopy["directory"]> = {
  "zh-CN": {
    searchLabel: "搜索工具站",
    searchPlaceholder: "搜索站名、用途或说明",
    categoryLabel: "分类",
    categoryAll: "全部",
    categories: {
      vault: "仓库与配装",
      weapons: "武器与 Perk",
      account: "账号与统计",
      activities: "活动与轮换",
      knowledge: "资料与百科",
      dev: "开发参考"
    },
    accessLabels: {
      web: "在线网页",
      desktop: "桌面应用",
      mobile: "移动应用",
      github: "GitHub 项目"
    },
    recommendedBadge: "推荐",
    resultCount: (count) => `共 ${count} 个站点`,
    open: "打开",
    openGithub: "GitHub",
    android: "Android",
    ios: "iOS",
    reset: "清空筛选",
    emptyTitle: "没有匹配的站点",
    emptyBody: "换个关键词，或者把分类切回全部。",
    developerTitle: "开发者与历史",
    developerHint: "这些项目面向开发者，或者已经归档；列在这里便于核对来源，不作为日常工具。",
    boundaryNotice: "这里只收集公开地址和一句话用途，不复制任何站点的内容、图标或数据。第三方工具的能力和稳定性由各自的维护者负责。"
  },
  "en-US": {
    searchLabel: "Search tools",
    searchPlaceholder: "Search name, purpose or note",
    categoryLabel: "Category",
    categoryAll: "All",
    categories: {
      vault: "Vault & loadouts",
      weapons: "Weapons & perks",
      account: "Account & stats",
      activities: "Activities & rotations",
      knowledge: "Reference & wiki",
      dev: "Developer reference"
    },
    accessLabels: {
      web: "Web app",
      desktop: "Desktop app",
      mobile: "Mobile app",
      github: "GitHub project"
    },
    recommendedBadge: "Recommended",
    resultCount: (count) => `${count} site${count === 1 ? "" : "s"}`,
    open: "Open",
    openGithub: "GitHub",
    android: "Android",
    ios: "iOS",
    reset: "Clear filters",
    emptyTitle: "No matching sites",
    emptyBody: "Try another keyword, or switch the category back to all.",
    developerTitle: "Developer & historical",
    developerHint: "These projects are aimed at developers or already archived. They are listed so the sources stay checkable, not as everyday tools.",
    boundaryNotice: "This page only collects public addresses and a one-line purpose. It does not copy any site's content, icons or data. Each third-party tool's capability and uptime is its maintainer's responsibility."
  }
};
