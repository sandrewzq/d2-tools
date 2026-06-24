import type { AccountSummary } from "../../../api/client";

export type AssistantPageKey = "home" | "account" | "vault" | "loadouts" | "library" | "settings";

export type AssistantPageContext = {
  page_key: AssistantPageKey;
  page_label: string;
  focus: string;
  facts: string[];
};

const pageLabels: Record<AssistantPageKey, string> = {
  home: "首页",
  account: "账号",
  vault: "仓库",
  loadouts: "配装",
  library: "资料库",
  settings: "设置"
};

const pageFocus: Record<AssistantPageKey, string> = {
  home: "当前正在查看首页，应优先分析今日状态、奖励进度、数据缺口和下一步入口。",
  account: "当前正在查看账号页，应优先分析当前角色、背包装备、邮政官、材料和账号状态。",
  vault: "当前正在查看仓库页，应优先分析仓库筛选、标签、同名装备、保留和清理问题。",
  loadouts: "当前正在查看配装页，应优先分析当前配装方案、缺失装备、转移计划和替代方案。",
  library: "当前正在查看资料库页，应优先分析物品定义、perk、最近查看和收藏资料。",
  settings: "当前正在查看设置页，应优先分析配置状态、AI 设置、写操作开关、更新和诊断信息。"
};

export function buildAssistantPageContext(input: {
  activePage: AssistantPageKey;
  account: AccountSummary | null;
  selectedCharacterId?: string | null;
  activeLoadoutName?: string | null;
  libraryRecentNames?: string[];
  vaultFacts?: string[];
  loadoutFacts?: string[];
  libraryFacts?: string[];
}): AssistantPageContext {
  const selectedCharacter = input.account?.characters.find((character) => character.character_id === input.selectedCharacterId)
    ?? input.account?.characters[0]
    ?? null;
  const facts = [
    input.account
      ? `账号已读取：${input.account.characters.length} 个角色，仓库 ${input.account.vault.item_count} 件装备，材料 ${input.account.materials.item_count} 种。`
      : "账号数据未读取。",
    selectedCharacter
      ? `当前角色：${selectedCharacter.class_name}，光等 ${selectedCharacter.light}。`
      : "当前没有可用角色。",
    input.activeLoadoutName ? `当前配装方案：${input.activeLoadoutName}` : "",
    input.libraryRecentNames?.length ? `最近查看资料：${input.libraryRecentNames.slice(0, 5).join(" / ")}` : "",
    ...(input.vaultFacts ?? []),
    ...(input.loadoutFacts ?? []),
    ...(input.libraryFacts ?? [])
  ].filter(Boolean);

  return {
    page_key: input.activePage,
    page_label: pageLabels[input.activePage],
    focus: pageFocus[input.activePage],
    facts
  };
}
