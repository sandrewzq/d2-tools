export type HomePageKey = "home" | "account" | "vault" | "loadouts" | "library" | "settings";

export const homePageMetaMap: Record<HomePageKey, { title: string; subtitle: string }> = {
  home: { title: "首页", subtitle: "检查当前状态，快速进入常用功能。" },
  account: { title: "账号", subtitle: "读取 Bungie 账号、角色装备、背包和材料数量。" },
  vault: { title: "仓库", subtitle: "查看完整仓库列表、筛选、排序和实际 roll。" },
  loadouts: { title: "配装", subtitle: "管理本地方案、补齐缺失装备并对比不同配装。" },
  library: { title: "资料库", subtitle: "搜索本地 Manifest 物品定义和 perk。" },
  settings: { title: "设置", subtitle: "管理 Bungie 配置和本地数据目录。" }
};

export const homePageLabels: Record<HomePageKey, string> = {
  home: "首页",
  account: "账号",
  vault: "仓库",
  loadouts: "配装",
  library: "资料库",
  settings: "设置"
};

export const homePageFocus: Record<HomePageKey, string> = {
  home: "当前正在查看首页，应优先分析今日状态、奖励进度、数据缺口和下一步入口。",
  account: "当前正在查看账号页，应优先分析当前角色、背包装备、邮政官、材料和账号状态。",
  vault: "当前正在查看仓库页，应优先分析仓库筛选、标签、同名装备、保留和清理问题。",
  loadouts: "当前正在查看配装页，应优先分析当前配装方案、缺失装备、转移计划和替代方案。",
  library: "当前正在查看资料库页，应优先分析物品定义、perk、最近查看和收藏资料。",
  settings: "当前正在查看设置页，应优先分析配置状态、AI 设置、写操作开关、更新和诊断信息。"
};
