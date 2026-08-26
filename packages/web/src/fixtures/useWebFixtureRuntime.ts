import { useMemo } from "react";
import type { ArmorSetCatalogItem } from "@d2-tools/core/items/equipableItemSet";
import { buildLoadoutTemplateLookup, matchesLoadoutTemplateItem, selectLoadoutsPageModel, type LoadoutTemplate, type LoadoutTemplateItem } from "@d2-tools/app/loadouts";
import { selectAccountPageModel } from "@d2-tools/app/account";
import { selectHomePageModel } from "@d2-tools/app/home";
import { selectLibraryPageModel } from "@d2-tools/app/library";
import type { ItemSearchResult, PerkSearchResult, VaultItemMatchInfo } from "@d2-tools/app/library";
import { selectSettingsPageModel, type SettingsSectionKey } from "@d2-tools/app/settings";
import { selectVaultPageModel } from "@d2-tools/app/vault";
import type { VaultItemMatchInfo as VaultCommunityMatchInfo } from "@d2-tools/app/vault";
import { selectVendorsPageModel } from "@d2-tools/app/vendors";
import type {
  AiAssistantContextView,
  AiAssistantMessageView,
  LibraryEquipmentFilter,
  LibraryPerkFilter,
  ShellBackgroundTaskItem
} from "@d2-tools/ui";
import {
  createFixtureActivitySummary,
  createFixtureAccountItem,
  createFixtureAccountSummary,
  createFixtureLibraryFilters
} from "@d2-tools/ui/fixtures";
import { webAppVersion } from "../buildInfo";
import type { WebHomeSnapshot } from "../webAdapter";
export const webAccountSummary = createFixtureAccountSummary({
  account_name: "Web Guardian",
  destiny_membership_id: "4611686018429100000",
  membership_type: 3,
  characters: [
    {
      character_id: "web-hunter",
      class_name: "猎人",
      light: 2022,
      equipped_items: [
        webWeaponAccountItem("web-pulse-equipped", 3001, "快速命中脉冲", "动能武器", "轻质框架", "已装备"),
        webWeaponAccountItem("web-rocket-equipped", 3004, "边缘迁移火箭筒", "威能武器", "自适应框架", "已装备"),
        webArmorAccountItem("web-helmet-equipped", 7101, "铁血意志头盔", "头盔", "已装备", 2021),
        webArmorAccountItem("web-chest-equipped", 7103, "铁血意志胸甲", "胸甲", "已装备", 2019),
        webArmorAccountItem("web-class-equipped", 7105, "铁血意志披风", "职业物品", "已装备", 2022)
      ],
      equipment_groups: [],
      inventory_items: [
        webWeaponAccountItem("web-shotgun-inventory", 3003, "终局霰弹枪", "能量武器", "精确框架", "背包"),
        webArmorAccountItem("web-gauntlets-inventory", 7102, "铁血意志臂铠", "臂铠", "背包", 2023),
        webArmorAccountItem("web-legs-inventory", 7104, "铁血意志腿甲", "腿甲", "背包", 2020)
      ],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    },
    {
      character_id: "web-warlock",
      class_name: "术士",
      light: 2018,
      equipped_items: [],
      equipment_groups: [],
      inventory_items: [webWeaponAccountItem("web-fusion-warlock", 3005, "适配融合步枪", "能量武器", "适配框架", "术士背包")],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    }
  ],
  vault: {
    item_count: 485,
    capacity: 1000,
    items: [
      webWeaponAccountItem("web-handcannon-vault", 3002, "精准手炮", "能量武器", "精确框架", "仓库"),
      webWeaponAccountItem("web-sword-vault", 3006, "连锁反应刀剑", "威能武器", "旋风框架", "仓库"),
      webWeaponAccountItem("web-scout-vault", 3007, "旧赛季斥候", "动能武器", "适配框架", "仓库")
    ],
    sample_items: []
  },
  materials: { item_count: 0, items: [] }
});

export const webActivitySummary = createFixtureActivitySummary({
  latestPeriod: "2026-07-03T14:18:00+08:00",
  pve: { total: 7, completed: 6 },
  pvp: { total: 3, completed: 2 },
  review: { completion_rate: 80, completions_in_a_row: 3 }
});

export const webLoadoutTemplates: LoadoutTemplate[] = [
  {
    id: "web-nightfall",
    name: "Web 夜幕模板",
    character_id: "web-hunter",
    class_name: "猎人",
    created_at: "2026-07-01T10:00:00.000Z",
    updated_at: "2026-07-03T14:18:00.000Z",
    items: [
      { hash: 3001, instance_id: "web-pulse-equipped", name: "快速命中脉冲", bucket_name: "动能武器", weapon_frame_name: "轻质框架", perk_names: ["快速命中", "动能震颤"] },
      { hash: 3002, instance_id: "web-handcannon-vault", name: "精准手炮", bucket_name: "能量武器", weapon_frame_name: "精确框架", perk_names: ["丰盈满溢", "爆炸载荷"] }
    ]
  },
  {
    id: "web-raid",
    name: "Web 突袭模板",
    character_id: "web-warlock",
    class_name: "术士",
    created_at: "2026-07-01T10:00:00.000Z",
    updated_at: "2026-07-03T14:18:00.000Z",
    items: [
      { hash: 3005, instance_id: "web-fusion-warlock", name: "适配融合步枪", bucket_name: "能量武器", weapon_frame_name: "适配框架", perk_names: ["自填", "控制爆破"] }
    ]
  }
];

export const webSelectedAnalysis = { equipped: [webLoadoutTemplates[0].items[0]], missing: [webLoadoutTemplates[0].items[1]] };
export const webTransferPlan = { steps: [], blocked: [] };
export const webLoadoutStatusSummary = [
  { key: "equipped", label: "已装备", count: 1 },
  { key: "vault", label: "仓库", count: 1 }
];
export const webCompareRows = [
  {
    slot: "能量武器",
    changed: true,
    left: { name: "精准手炮", frame: "精确框架", perks: ["丰盈满溢", "爆炸载荷"] },
    right: { name: "适配融合步枪", frame: "适配框架", perks: ["自填", "控制爆破"] }
  }
];

const webLibraryFilters = createFixtureLibraryFilters();
export const webEquipmentFilters: LibraryEquipmentFilter = webLibraryFilters.equipment;
export const webPerkFilters: LibraryPerkFilter = webLibraryFilters.perks;

export const webLibraryItems: ItemSearchResult[] = [
  {
    hash: 3001,
    name: "快速命中脉冲",
    description: "Web mock 装备。",
    item_type: "脉冲步枪",
    tier: "传说",
    group_key: "weapons",
    bucket_name: "动能武器",
    ammo_type: "primary",
    weapon_frame: { key: "lightweight", name: "轻质框架" },
    release: {
      status: "ready",
      label: "发布版本",
      kind: "season",
      description: "第6年 · 第21赛季 · 深渊赛季",
      season_number: 21,
      year_number: 6,
      name: "深渊赛季"
    },
    source: { status: "ready", label: "来源可确认", description: "Web provider 后续接真实来源。" },
    definition_stats: [
      { hash: 4284893193, name: "射速", value: 450, display_maximum: 1000 },
      { hash: 4043523819, name: "伤害", value: 27, display_maximum: 100 },
      { hash: 1240592695, name: "射程", value: 62, display_maximum: 100 },
      { hash: 155624089, name: "稳定性", value: 72, display_maximum: 100 },
      { hash: 943549884, name: "操控性", value: 48, display_maximum: 100 },
      { hash: 4188031367, name: "装填速度", value: 41, display_maximum: 100 }
    ],
    perks: []
  }
];
export const webLibraryPerks: PerkSearchResult[] = [{
  key: "perk:4001",
  hash: 4001,
  hashes: [4001],
  name: "动能震颤",
  description: "连续命中目标后产生动能冲击波。",
  variants: [{ sandbox_perk_hash: 4001, plug_hashes: [], kind: "standard", description: "连续命中目标后产生动能冲击波。", related_count: 1 }],
  related_count: 1,
  related_groups: ["weapons"]
}];
export const webPerkRelatedEquipment = {
  "perk:4001": {
    items: webLibraryItems,
    total: 1,
    hasMore: false,
    isLoading: false,
    isLoaded: true,
    error: ""
  }
};
export const webLibraryHistory = { recent: [{ hash: 3001, name: "快速命中脉冲" }], favorites: [] };
export const webLibraryCommunityMatch = new Map<number, VaultItemMatchInfo>([[3001, { available: 1, sample_perks: [{ name: "快速命中" }] }]]);
export const webLiveAvailability = { account_scope: "character" as const, items: {} };

export const webManifestStatus = {
  initialized: true,
  version: "DestinyInventoryItemDefinition.26.06.16.0000",
  latest_version: "DestinyInventoryItemDefinition.26.06.16.0000",
  needs_update: false,
  cached_at: "2026-06-16T17:00:00.000Z",
  checked_at: "2026-07-03T14:18:00+08:00",
  language: "zh-chs",
  item_count: 14406,
  perk_count: 3871,
  relation_count: 451375,
  missing_required_components: []
};

export const webUpdateSnapshot = {
  status: "idle",
  current_version: webAppVersion,
  available_version: null,
  downloaded_version: null,
  progress_percent: undefined,
  last_checked_at: undefined,
  update_source_label: "GitHub Release",
  user_message: "尚未检查软件版本。",
  error: ""
};

export const webVaultTags = { items: { "web-handcannon-vault": { tag: "review", note: "Web mock 同名复查。" }, "web-scout-vault": { tag: "junk" } } } as const;
export const webLocalTargetRules = { action_policy: "notify_only" as const, armor: [], weapons: [] };
export const webWishlist = { title: "Web DIM Wishlist", rules: [{ item_hash: 3002, perk_hashes: [4001], mode: "pve" as const, note: "Web 推荐" }] };
export const webVaultCommunityMatch = new Map<number, VaultCommunityMatchInfo>([[3002, { matched: 1, available: 1, modes: ["pve"], sample_perks: [{ hash: 4001, name: "爆炸载荷" }] }]]);
export const webArmorSetCatalog: ArmorSetCatalogItem[] = [
  { hash: 7001, name: "铁血意志套装" },
  { hash: 7002, name: "流放者套装" },
  { hash: 7003, name: "遗产誓言套装" },
  { hash: 7004, name: "远古福音套装" }
];
export const webBackgroundTasks: ShellBackgroundTaskItem[] = [{ id: "web-task", title: "Web snapshot", status: "succeeded", message: "Web mock 已载入。", created_at: "2026-07-03T14:18:00+08:00", updated_at: "2026-07-03T14:18:00+08:00" }];
export const webActionLog = [{ id: "web-action", created_at: "2026-07-03T14:18:00+08:00", action: "mock", item_name: "Web mock", ok: true, message: "共享设置页操作日志 mock。" }];
export const webBungieConfig = { bungie: { api_key: "web-api-key", client_id: "web-client-id", client_secret: "web-client-secret", redirect_uri: "https://127.0.0.1:28780/oauth/callback" } };

function webWeaponAccountItem(instanceId: string, hash: number, name: string, bucketName: string, frameName: string, location: string) {
  const sourceKind = location === "仓库" ? "vault" : location.includes("背包") ? "inventory" : "equipped";

  return createFixtureAccountItem({
    instanceId,
    hash,
    name,
    bucketName,
    groupKey: "weapons",
    frameName,
    itemType: "武器",
    power: 2018 + (hash % 7),
    socketPlugs: [{ hash: 4001, name: "快速命中" }, { hash: 4002, name: "爆炸载荷" }],
    sourceKind,
    sourceCharacterId: location === "术士背包" ? "web-warlock" : "web-hunter"
  });
}

function webArmorAccountItem(instanceId: string, hash: number, name: string, bucketName: string, location: string, power: number) {
  return createFixtureAccountItem({
    instanceId,
    hash,
    name,
    bucketName,
    groupKey: "armor",
    frameName: "",
    itemType: bucketName,
    power,
    classType: 1,
    armorStats: { total: 66, health: 14, melee: 10, grenade: 12, super: 8, class: 12, weapon: 10 },
    socketPlugs: [],
    sourceKind: location === "仓库" ? "vault" : location.includes("背包") ? "inventory" : "equipped",
    sourceCharacterId: "web-hunter"
  });
}

export function getWebLoadoutItemStatus(item: LoadoutTemplateItem) {
  if (item.instance_id === "web-pulse-equipped") {
    return { key: "equipped", badge_label: "已装备", badge_tone: "ready", location_label: "当前角色已装备" };
  }
  return { key: "vault", badge_label: "仓库待取", badge_tone: "info", location_label: "仓库", guidance_label: "可自动补齐", guidance_hint: "Web mock 暂不执行写操作。" };
}

export function getWebSourceItem(item: LoadoutTemplateItem) {
  return item.instance_id ? { instance_id: item.instance_id, source_kind: item.instance_id.includes("vault") ? "vault" : "inventory", source_character_id: "web-hunter" } : null;
}

function findWebLoadoutTemplate(templateId: string) {
  return webLoadoutTemplates.find((template) => template.id === templateId)
    ?? webLoadoutTemplates[0]
    ?? null;
}

function createWebActiveLoadout(templateId: string) {
  const selectedTemplate = findWebLoadoutTemplate(templateId);
  const activeLoadoutLookup = selectedTemplate ? buildLoadoutTemplateLookup(selectedTemplate) : null;

  return { selectedTemplate, activeLoadoutLookup };
}

export function createWebHomePageModel(snapshot: WebHomeSnapshot) {
  return selectHomePageModel({
    state: snapshot.homeState,
    accountError: "",
    diagnosticRows: [{ tone: "warning" }],
    dailySummary: snapshot.homeDailySummary,
    weeklySummary: snapshot.homeWeeklySummary
  });
}

export function createWebAccountPageModel(input: {
  selectedCharacterId: string;
  selectedTemplateId: string;
}) {
  const { selectedTemplate, activeLoadoutLookup } = createWebActiveLoadout(input.selectedTemplateId);

  return selectAccountPageModel({
    cache: {
      accountSummary: webAccountSummary,
      activitySummary: webActivitySummary
    },
    pageState: {
      selectedCharacterId: input.selectedCharacterId,
      lastAccountLoadedAt: new Date("2026-07-23T09:47:39+08:00"),
      openingItemKey: "",
      isLoadoutMatch: (item) => matchesLoadoutTemplateItem(item, activeLoadoutLookup),
      isBungieConfigured: true,
      isAccountLoggedIn: true,
      isLoadingAccount: false,
      accountStatusLabel: "账号已读取",
      accountError: "",
      accountWarning: "",
      itemDetailError: "",
      activityMessage: "",
      activityError: "",
      loadoutMessage: "",
      itemActionMessage: "",
      isRunningItemAction: false,
      activeLoadoutTemplateName: selectedTemplate?.name
    }
  });
}

export function createWebVaultPageModel(input: {
  selectedCharacterId: string;
  selectedTemplateId: string;
}) {
  const { selectedTemplate, activeLoadoutLookup } = createWebActiveLoadout(input.selectedTemplateId);

  return selectVaultPageModel({
    account: webAccountSummary,
    selectedCharacterId: input.selectedCharacterId,
    activeLoadoutLookup,
    activeLoadoutName: selectedTemplate?.name,
    tags: webVaultTags,
    targetRules: webLocalTargetRules,
    wishlist: webWishlist,
    communityMatch: webVaultCommunityMatch
  });
}

export function createWebLoadoutsPageModel(input: {
  selectedTemplateId: string;
  selectedEntryId: string;
  compareTemplateId: string;
  showDiffOnly: boolean;
}) {
  return selectLoadoutsPageModel({
    accountSummary: webAccountSummary,
    templates: webLoadoutTemplates,
    selectedTemplateId: input.selectedTemplateId,
    selectedEntryId: input.selectedEntryId,
    compareTemplateId: input.compareTemplateId,
    showDiffOnly: input.showDiffOnly
  });
}

export function createWebLibraryPageModel(input: {
  libraryViewMode: "equipment" | "perks";
  equipmentFilters: LibraryEquipmentFilter;
  perkFilters: LibraryPerkFilter;
  aliasDraft: string;
  aliasTargetDraft: string;
  aliasKind: "item" | "perk";
}) {
  return selectLibraryPageModel({
    items: webLibraryItems,
    perks: webLibraryPerks,
    perkRelatedEquipment: webPerkRelatedEquipment,
    libraryHistory: webLibraryHistory,
    libraryCommunityMatch: webLibraryCommunityMatch,
    liveAvailability: webLiveAvailability,
    liveAvailabilityError: "",
    manifestStatus: webManifestStatus,
    manifestStatusError: "",
    accountSummary: webAccountSummary
  }, {
    libraryViewMode: input.libraryViewMode,
    equipmentFilters: input.equipmentFilters,
    perkFilters: input.perkFilters,
    equipmentSearchTouched: true,
    perkSearchTouched: true,
    isSearching: false,
    searchError: "",
    aliasDraft: input.aliasDraft,
    aliasTargetDraft: input.aliasTargetDraft,
    aliasKind: input.aliasKind,
    aliasMessage: "Web mock：别名保存待接 provider。",
    isLoadingLiveAvailability: false,
    isLoadingManifestStatus: false,
    isInitializingManifest: false,
    itemDetailLoadingKey: ""
  });
}

export function createWebSettingsPageModel(input: {
  interfaceLocale: "zh-CN" | "en-US";
  bungieLocale: "zh-chs" | "en";
  followInterfaceLocaleForBungie: boolean;
  initialSection?: SettingsSectionKey;
}) {
  return selectSettingsPageModel({
    interfaceLocale: input.interfaceLocale,
    initialSection: input.initialSection ?? "overview",
    message: "",
    error: "",
    diagnosticDataDir: "Web mock storage",
    appUpdateSnapshot: webUpdateSnapshot,
    manifestStatus: webManifestStatus,
    manifestStatusError: "",
    isLoadingManifestStatus: false,
    isInitializingManifest: false,
    accountSummary: webAccountSummary,
    accountError: "",
    accountWarning: "",
    isLoadingAccount: false,
    lastAccountLoadedAt: new Date("2026-07-03T14:18:00+08:00"),
    isAiConfigured: true,
    backgroundTasks: webBackgroundTasks,
    actionLog: webActionLog,
    actionLogResultFilter: "all",
    actionLogTypeFilter: "all",
    languagePreferences: {
      interfaceLocale: input.interfaceLocale,
      bungieLocale: input.bungieLocale,
      followInterfaceLocaleForBungie: input.followInterfaceLocaleForBungie
    }
  });
}

export const webAssistantInitialMessages: AiAssistantMessageView[] = [
  {
    role: "assistant",
    text: "Web 入口已接入共享 AI 助手界面。当前使用首页 snapshot 作为上下文，后续由 Web provider 提供真实账号和 AI 服务。"
  }
];

export const webAssistantQuickPrompts = [
  "今天先刷什么",
  "仓库清理建议",
  "资料库状态怎么处理",
  "首页哪些状态需要优先看"
];

export function createWebAssistantContext(snapshot: WebHomeSnapshot): AiAssistantContextView {
  const hasAccountData = snapshot.shellStatus.some((item) => item.key === "account" && item.tone === "ready");

  return {
    pageLabel: "首页工作台",
    focus: "只看官方可确认的本周活动、限时事件和仄商人库存。",
    facts: snapshot.shellStatus.map((item) => `${item.label}：${item.value}`),
    itemCount: 496,
    characterCount: hasAccountData ? 2 : 0,
    materialCount: 28,
    dailyLoaded: true,
    snapshotState: "unsaved",
    snapshotLabel: "Web 预览未创建上下文快照"
  };
}

export function createWebAssistantContextChip(context: AiAssistantContextView) {
  return [
    `当前页面：${context.pageLabel}`,
    `仓库 ${context.itemCount} 件`,
    `角色 ${context.characterCount} 个`,
    context.dailyLoaded ? "今日信息已载入" : "今日信息未载入",
    context.snapshotLabel
  ].join(" · ");
}

export function createWebAssistantReply() {
  return "这是 Web adapter 的 mock 回复：当前页面使用共享 AI 助手 View，真实回答会在 Web provider 接入账号和 AI 服务后替换。";
}

export function useWebFixtureRuntime() {
  return useMemo(() => ({
    accountSummary: webAccountSummary,
    activitySummary: webActivitySummary,
    loadoutTemplates: webLoadoutTemplates,
    equipmentFilters: webEquipmentFilters,
    perkFilters: webPerkFilters,
    libraryItems: webLibraryItems,
    libraryPerks: webLibraryPerks,
    libraryHistory: webLibraryHistory,
    libraryCommunityMatch: webLibraryCommunityMatch,
    liveAvailability: webLiveAvailability,
    manifestStatus: webManifestStatus,
    appUpdateSnapshot: webUpdateSnapshot,
    vaultTags: webVaultTags,
    localTargetRules: webLocalTargetRules,
    wishlist: webWishlist,
    vaultCommunityMatch: webVaultCommunityMatch,
    armorSetCatalog: webArmorSetCatalog,
    backgroundTasks: webBackgroundTasks,
    actionLog: webActionLog,
    bungieConfig: webBungieConfig,
    vendorsModel: selectVendorsPageModel({
      snapshot: null,
      account: webAccountSummary,
      scope: { kind: "account" },
      refreshState: "idle"
    }),
    assistantInitialMessages: webAssistantInitialMessages,
    assistantQuickPrompts: webAssistantQuickPrompts,
    findLoadoutTemplate: findWebLoadoutTemplate,
    createHomePageModel: createWebHomePageModel,
    createAccountPageModel: createWebAccountPageModel,
    createVaultPageModel: createWebVaultPageModel,
    createLoadoutsPageModel: createWebLoadoutsPageModel,
    createLibraryPageModel: createWebLibraryPageModel,
    createSettingsPageModel: createWebSettingsPageModel,
    createAssistantContext: createWebAssistantContext,
    createAssistantContextChip: createWebAssistantContextChip,
    createAssistantReply: createWebAssistantReply
  }), []);
}
