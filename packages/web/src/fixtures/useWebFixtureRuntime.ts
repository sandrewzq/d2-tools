import type {
  LibraryEquipmentFilter,
  LibraryPerkFilter,
  ShellBackgroundTaskItem
} from "@d2-tools/ui";
export const webAccountSummary: any = {
  account_name: "Web Guardian",
  destiny_membership_id: "4611686018429100000",
  membership_type: 3,
  characters: [
    {
      character_id: "web-hunter",
      class_name: "猎人",
      light: 2022,
      equipped_items: [
        webAccountItem("web-pulse-equipped", 3001, "快速命中脉冲", "动能武器", "轻质框架", "已装备"),
        webAccountItem("web-rocket-equipped", 3004, "边缘迁移火箭筒", "威能武器", "自适应框架", "已装备")
      ],
      equipment_groups: [],
      inventory_items: [
        webAccountItem("web-shotgun-inventory", 3003, "终局霰弹枪", "能量武器", "精确框架", "背包")
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
      inventory_items: [webAccountItem("web-fusion-warlock", 3005, "适配融合步枪", "能量武器", "适配框架", "术士背包")],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    }
  ],
  vault: {
    item_count: 485,
    items: [
      webAccountItem("web-handcannon-vault", 3002, "精准手炮", "能量武器", "精确框架", "仓库"),
      webAccountItem("web-sword-vault", 3006, "连锁反应刀剑", "威能武器", "旋风框架", "仓库"),
      webAccountItem("web-scout-vault", 3007, "旧赛季斥候", "动能武器", "适配框架", "仓库")
    ],
    sample_items: []
  },
  materials: { item_count: 0, items: [] }
};

export const webActivitySummary: any = {
  recent: { total: 10, pve: { total: 7, completed: 6 }, pvp: { total: 3, completed: 2 }, latest_period: "2026-07-03T14:18:00+08:00" },
  review: { completion_rate: 80, completions_in_a_row: 3, recent_10: [] },
  raids: { entries: [] },
  recent_items: []
};

export const webLoadoutTemplates: any[] = [
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

export const webEquipmentFilters: LibraryEquipmentFilter = {
  query: "",
  group: "all",
  tier: "all",
  bucket: "all",
  ammo: "all",
  frame: [],
  sourceStatus: "all",
  perkPool: "all",
  dropAccess: "all",
  perkQuery: ""
};

export const webPerkFilters: LibraryPerkFilter = {
  query: "",
  relatedGroup: "all",
  hasRelatedItems: "all"
};

export const webLibraryItems: any[] = [
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
    source: { status: "ready", label: "来源可确认", description: "Web provider 后续接真实来源。" },
    perks: []
  }
];
export const webLibraryPerks: any[] = [{ hash: 4001, name: "动能震颤", description: "连续命中目标后产生动能冲击波。", related_items: [] }];
export const webLibraryHistory = { recent: [{ hash: 3001, name: "快速命中脉冲" }], favorites: [] };
export const webLibraryCommunityMatch = new Map<number, any>([[3001, { available: 1, sample_perks: [{ name: "快速命中" }] }]]);
export const webLiveAvailability = { account_scope: "character" as const, items: {} };

export const webManifestStatus = {
  initialized: true,
  version: "DestinyInventoryItemDefinition.26.06.16.0000",
  latest_version: "DestinyInventoryItemDefinition.26.06.16.0000",
  needs_update: false,
  cached_at: "2026-06-16T17:00:00.000Z",
  checked_at: "2026-07-03T14:18:00+08:00",
  missing_required_components: []
};

export const webUpdateSnapshot = {
  status: "not_available",
  current_version: "0.0.10",
  available_version: null,
  downloaded_version: null,
  progress_percent: undefined,
  last_checked_at: "2026-07-03T14:18:00+08:00",
  update_source_label: "GitHub Release",
  user_message: "当前已是最新版本。",
  error: ""
};

export const webVaultTags = { items: { "web-handcannon-vault": { tag: "review", note: "Web mock 同名复查。" }, "web-scout-vault": { tag: "junk" } } } as const;
export const webLocalTargetRules = { action_policy: "notify_only" as const, armor: [], weapons: [] };
export const webWishlist = { title: "Web DIM Wishlist", rules: [{ item_hash: 3002, perk_hashes: [4001], mode: "pve" as const, note: "Web 推荐" }] };
export const webVaultCommunityMatch = new Map<number, any>([[3002, { matched: 1, modes: ["pve"], sample_perks: [{ name: "爆炸载荷" }] }]]);
export const webBatchResult = { success_count: 0, failed_count: 0, results: [] };
export const webBackgroundTasks: ShellBackgroundTaskItem[] = [{ id: "web-task", title: "Web snapshot", status: "succeeded", message: "Web mock 已载入。", created_at: "2026-07-03T14:18:00+08:00", updated_at: "2026-07-03T14:18:00+08:00" }];
export const webActionLog = [{ id: "web-action", created_at: "2026-07-03T14:18:00+08:00", action: "mock", item_name: "Web mock", ok: true, message: "共享设置页操作日志 mock。" }];
export const webBungieConfig = { bungie: { api_key: "web-api-key", client_id: "web-client-id", client_secret: "web-client-secret", redirect_uri: "https://127.0.0.1:28780/oauth/callback" } };

function webAccountItem(instanceId: string, hash: number, name: string, bucketName: string, frameName: string, location: string) {
  return {
    hash,
    instance_id: instanceId,
    name,
    item_type: bucketName.includes("武器") ? "武器" : "装备",
    tier: "传说",
    bucket_name: bucketName,
    group_key: bucketName.includes("武器") ? "weapons" : "armor",
    weapon_frame: { key: frameName, name: frameName },
    socket_plugs: [{ hash: 4001, name: "快速命中" }, { hash: 4002, name: "爆炸载荷" }],
    source_kind: location === "仓库" ? "vault" : location.includes("背包") ? "inventory" : "equipped",
    source_character_id: location === "术士背包" ? "web-warlock" : "web-hunter"
  };
}

export function getWebLoadoutItemStatus(item: any) {
  if (item.instance_id === "web-pulse-equipped") {
    return { key: "equipped", badge_label: "已装备", badge_tone: "ready", location_label: "当前角色已装备" };
  }
  return { key: "vault", badge_label: "仓库待取", badge_tone: "info", location_label: "仓库", guidance_label: "可自动补齐", guidance_hint: "Web mock 暂不执行写操作。" };
}

export function getWebSourceItem(item: any) {
  return item.instance_id ? { instance_id: item.instance_id, source_kind: item.instance_id.includes("vault") ? "vault" : "inventory", source_character_id: "web-hunter" } : null;
}

export function useWebFixtureRuntime() {
  return {
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
    updateSnapshot: webUpdateSnapshot,
    vaultTags: webVaultTags,
    localTargetRules: webLocalTargetRules,
    wishlist: webWishlist,
    vaultCommunityMatch: webVaultCommunityMatch,
    batchResult: webBatchResult,
    backgroundTasks: webBackgroundTasks,
    actionLog: webActionLog,
    bungieConfig: webBungieConfig
  };
}
