import type { AccountSummary } from "@d2-tools/core/account/summary";
import type { LoadoutTemplate } from "@d2-tools/core/loadouts/templates";
import type { HomeDashboardDiagnosticRow } from "./homeDashboard.js";

export type HomePageKey = "home" | "account" | "vault" | "loadouts" | "library" | "settings";

export type AssistantPageContext = {
  page_key: HomePageKey;
  page_label: string;
  focus: string;
  facts: string[];
};

export type HomePageDerivedState = {
  activePage: HomePageKey;
  account: AccountSummary | null;
  selectedCharacterId?: string | null;
  activeLoadoutName?: string | null;
  activeLoadoutTemplate?: LoadoutTemplate | null;
  libraryRecentNames?: string[];
  vaultFacts?: string[];
  libraryViewMode: "equipment" | "perks";
  equipmentQuery: string;
  perkQuery: string;
  equipmentResultCount: number;
  perkResultCount: number;
  equipmentSearchTouched: boolean;
  perkSearchTouched: boolean;
  isAiConfigured: boolean;
  diagnosticRows: HomeDashboardDiagnosticRow[];
  pageMeta: { title: string; subtitle: string };
  assistantPageContext: AssistantPageContext;
  loadoutFacts: string[];
  libraryFacts: string[];
};

const pageMetaMap: Record<HomePageKey, { title: string; subtitle: string }> = {
  home: { title: "首页", subtitle: "检查当前状态，快速进入常用功能。" },
  account: { title: "账号", subtitle: "读取 Bungie 账号、角色装备、背包和材料数量。" },
  vault: { title: "仓库", subtitle: "查看完整仓库列表、筛选、排序和实际 roll。" },
  loadouts: { title: "配装", subtitle: "管理本地方案、补齐缺失装备并对比不同配装。" },
  library: { title: "资料库", subtitle: "搜索本地 Manifest 物品定义和 perk。" },
  settings: { title: "设置", subtitle: "管理 Bungie 配置和本地数据目录。" }
};

const pageLabels: Record<HomePageKey, string> = {
  home: "首页",
  account: "账号",
  vault: "仓库",
  loadouts: "配装",
  library: "资料库",
  settings: "设置"
};

const pageFocus: Record<HomePageKey, string> = {
  home: "当前正在查看首页，应优先分析今日状态、奖励进度、数据缺口和下一步入口。",
  account: "当前正在查看账号页，应优先分析当前角色、背包装备、邮政官、材料和账号状态。",
  vault: "当前正在查看仓库页，应优先分析仓库筛选、标签、同名装备、保留和清理问题。",
  loadouts: "当前正在查看配装页，应优先分析当前配装方案、缺失装备、转移计划和替代方案。",
  library: "当前正在查看资料库页，应优先分析物品定义、perk、最近查看和收藏资料。",
  settings: "当前正在查看设置页，应优先分析配置状态、AI 设置、写操作开关、更新和诊断信息。"
};

export function createHomePageDerivedState(input: Omit<HomePageDerivedState, "pageMeta" | "assistantPageContext" | "loadoutFacts" | "libraryFacts"> & {
  loadoutFacts?: string[];
  libraryFacts?: string[];
}): HomePageDerivedState {
  const loadoutFacts = input.loadoutFacts ?? buildLoadoutContextFacts({
    template: input.activeLoadoutTemplate ?? null,
    account: input.account
  });
  const libraryFacts = input.libraryFacts ?? buildLibraryContextFacts({
    viewMode: input.libraryViewMode,
    equipmentQuery: input.equipmentQuery,
    perkQuery: input.perkQuery,
    equipmentResultCount: input.equipmentResultCount,
    perkResultCount: input.perkResultCount,
    equipmentSearchTouched: input.equipmentSearchTouched,
    perkSearchTouched: input.perkSearchTouched
  });

  return {
    ...input,
    loadoutFacts,
    libraryFacts,
    pageMeta: resolvePageMeta(input.activePage),
    assistantPageContext: buildAssistantPageContext({
      activePage: input.activePage,
      account: input.account,
      selectedCharacterId: input.selectedCharacterId,
      activeLoadoutName: input.activeLoadoutName,
      libraryRecentNames: input.libraryRecentNames,
      vaultFacts: input.vaultFacts,
      loadoutFacts,
      libraryFacts
    })
  };
}

export function buildLoadoutContextFacts(input: {
  template: LoadoutTemplate | null;
  account: AccountSummary | null;
}): string[] {
  if (!input.template) {
    return ["当前没有选中的本地配装方案。"];
  }
  if (!input.account) {
    return [`配装方案：${input.template.name}，共 ${input.template.items.length} 件装备；账号数据未读取，暂不能判断缺失。`];
  }

  const knownItems = collectAccountItems(input.account);
  const readyCount = input.template.items.filter((item) => knownItems.some((knownItem) =>
    item.instance_id
      ? knownItem.instance_id === item.instance_id
      : knownItem.hash === item.hash
  )).length;
  const missingCount = Math.max(input.template.items.length - readyCount, 0);

  return [`配装缺失：${missingCount} 件，已找到 ${readyCount} / ${input.template.items.length} 件。`];
}

export function buildLibraryContextFacts(input: {
  viewMode: "equipment" | "perks";
  equipmentQuery: string;
  perkQuery: string;
  equipmentResultCount: number;
  perkResultCount: number;
  equipmentSearchTouched: boolean;
  perkSearchTouched: boolean;
}): string[] {
  const isPerkMode = input.viewMode === "perks";
  const query = isPerkMode ? input.perkQuery : input.equipmentQuery;
  const touched = isPerkMode ? input.perkSearchTouched : input.equipmentSearchTouched;
  const count = isPerkMode ? input.perkResultCount : input.equipmentResultCount;
  const modeLabel = isPerkMode ? "Perk" : "装备";

  return [
    touched
      ? `资料库搜索：${modeLabel}${query.trim() ? ` / ${query.trim()}` : ""}，命中 ${count} 条。`
      : `资料库搜索：当前在${modeLabel}模式，尚未执行搜索。`
  ];
}

export function resolvePageMeta(page: HomePageKey) {
  return pageMetaMap[page] ?? pageMetaMap.home;
}

function buildAssistantPageContext(input: {
  activePage: HomePageKey;
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

function collectAccountItems(account: AccountSummary) {
  return [
    ...account.characters.flatMap((character) => [
      ...character.equipped_items,
      ...character.inventory_items,
      ...character.postmaster_items
    ]),
    ...account.vault.items
  ];
}
