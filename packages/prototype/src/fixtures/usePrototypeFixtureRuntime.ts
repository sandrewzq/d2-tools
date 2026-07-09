import { useMemo } from "react";
import {
  buildLoadoutTemplateLookup,
  matchesLoadoutTemplateItem,
  selectAccountPageModel,
  selectHomePageModel,
  selectLibraryPageModel,
  selectLoadoutsPageModel,
  selectSettingsPageModel,
  selectVaultPageModel,
  selectVendorsPageModel,
  type SettingsSectionKey
} from "@d2-tools/app";
import type {
  AiAssistantContextView,
  AiAssistantMessageView,
  LibraryEquipmentFilter,
  LibraryPerkFilter,
  ShellBackgroundTaskItem,
  ShellPageKey,
  ShellStatusItem
} from "@d2-tools/ui";
import type { PrototypeScenario, PrototypeScenarioKey } from "../mock/scenarios";
export const prototypeAccountSummary: any = {
  account_name: "Prototype Guardian",
  destiny_membership_id: "4611686018429000000",
  membership_type: 3,
  characters: [
    {
      character_id: "hunter-1",
      class_name: "猎人",
      emblem_url: prototypeEmblem("猎", "#2f7dd1", "#9bd0ff"),
      light: 2022,
      equipped_items: [
        prototypeAccountItem("pulse-equipped", 1001, "快速命中脉冲", "动能武器", "轻质框架", "已装备"),
        prototypeAccountItem("shotgun-equipped", 1003, "终局霰弹枪", "能量武器", "精确框架", "已装备"),
        prototypeAccountItem("rocket-equipped", 1004, "边缘迁移火箭筒", "威能武器", "自适应框架", "已装备"),
        prototypeAccountItem("hunter-helmet-equipped", 1012, "猎人高纪律头盔", "头盔", "护甲", "已装备"),
        prototypeAccountItem("hunter-arms-equipped", 1013, "猎人恢复臂铠", "臂铠", "护甲", "已装备"),
        prototypeAccountItem("hunter-chest-equipped", 1014, "猎人抗性胸甲", "胸甲", "护甲", "已装备"),
        prototypeAccountItem("hunter-legs-equipped", 1015, "猎人机动腿甲", "腿甲", "护甲", "已装备"),
        prototypeAccountItem("hunter-class-equipped", 1016, "猎人职业物品", "职业物品", "护甲", "已装备")
      ],
      equipment_groups: [],
      inventory_items: [
        prototypeAccountItem("handcannon-inventory", 1002, "精准手炮", "能量武器", "精确框架", "背包"),
        prototypeAccountItem("fusion-inventory", 1005, "适配融合步枪", "能量武器", "适配框架", "背包"),
        prototypeAccountItem("sword-inventory", 1006, "连锁反应刀剑", "威能武器", "旋风框架", "背包"),
        prototypeAccountItem("scout-inventory", 1007, "旧赛季斥候", "动能武器", "适配框架", "背包"),
        prototypeAccountItem("hunter-alt-helmet", 1017, "PVP 机动头盔", "头盔", "护甲", "背包"),
        prototypeAccountItem("hunter-alt-arms", 1018, "手雷臂铠", "臂铠", "护甲", "背包"),
        prototypeAccountItem("hunter-alt-chest", 1019, "虚空胸甲", "胸甲", "护甲", "背包"),
        prototypeAccountItem("hunter-alt-legs", 1020, "跑图腿甲", "腿甲", "护甲", "背包")
      ],
      inventory_groups: [],
      postmaster_items: [
        prototypeAccountItem("postmaster-pulse", 1021, "邮政官脉冲", "动能武器", "高冲击力框架", "邮政官"),
        prototypeAccountItem("postmaster-cloak", 1022, "遗落披风", "职业物品", "护甲", "邮政官")
      ],
      loadout_slots: [
        {
          index: 0,
          name: "日落速刷",
          item_count: 8,
          items: [
            { instance_id: "pulse-equipped", name: "快速命中脉冲", bucket_name: "动能武器" },
            { instance_id: "shotgun-inventory", name: "终局霰弹枪", bucket_name: "能量武器" },
            { instance_id: "rocket-equipped", name: "边缘迁移火箭筒", bucket_name: "威能武器" }
          ]
        }
      ]
    },
    {
      character_id: "warlock-1",
      class_name: "术士",
      emblem_url: prototypeEmblem("术", "#8c5bd6", "#e1c7ff"),
      light: 2018,
      equipped_items: [
        prototypeAccountItem("warlock-pulse-equipped", 1030, "术士脉冲步枪", "动能武器", "适配框架", "术士已装备"),
        prototypeAccountItem("warlock-fusion-equipped", 1031, "术士融合步枪", "能量武器", "精确框架", "术士已装备"),
        prototypeAccountItem("warlock-linear-equipped", 1032, "术士线性融合", "威能武器", "线性框架", "术士已装备"),
        prototypeAccountItem("warlock-helmet-equipped", 1033, "术士头盔", "头盔", "护甲", "术士已装备"),
        prototypeAccountItem("warlock-arms-equipped", 1034, "术士臂铠", "臂铠", "护甲", "术士已装备"),
        prototypeAccountItem("warlock-chest-equipped", 1035, "术士胸甲", "胸甲", "护甲", "术士已装备"),
        prototypeAccountItem("warlock-legs-equipped", 1036, "术士腿甲", "腿甲", "护甲", "术士已装备"),
        prototypeAccountItem("warlock-class-equipped", 1037, "术士臂环", "职业物品", "护甲", "术士已装备")
      ],
      equipment_groups: [],
      inventory_items: [
        prototypeAccountItem("fusion-warlock", 1005, "适配融合步枪", "能量武器", "适配框架", "术士背包"),
        prototypeAccountItem("warlock-handcannon", 1038, "术士手炮", "能量武器", "精确框架", "术士背包"),
        prototypeAccountItem("warlock-rocket", 1039, "术士火箭筒", "威能武器", "自适应框架", "术士背包"),
        prototypeAccountItem("warlock-alt-helmet", 1040, "术士备用头盔", "头盔", "护甲", "术士背包"),
        prototypeAccountItem("warlock-alt-chest", 1041, "术士备用胸甲", "胸甲", "护甲", "术士背包"),
        prototypeAccountItem("warlock-alt-legs", 1042, "术士备用腿甲", "腿甲", "护甲", "术士背包")
      ],
      inventory_groups: [],
      postmaster_items: [
        prototypeAccountItem("warlock-postmaster-scout", 1043, "邮政官斥候", "动能武器", "轻质框架", "邮政官")
      ],
      loadout_slots: []
    }
  ],
  vault: {
    item_count: 764,
    items: [
      prototypeAccountItem("handcannon-vault", 1002, "精准手炮", "能量武器", "精确框架", "仓库"),
      prototypeAccountItem("sword-vault", 1006, "连锁反应刀剑", "威能武器", "旋风框架", "仓库"),
      prototypeAccountItem("scout-vault", 1007, "旧赛季斥候", "动能武器", "适配框架", "仓库"),
      prototypeAccountItem("auto-vault", 1008, "高射速自动步枪", "动能武器", "速射框架", "仓库"),
      prototypeAccountItem("sniper-vault", 1009, "精准狙击枪", "能量武器", "攻击型框架", "仓库"),
      {
        ...prototypeAccountItem("helmet-vault", 1010, "高纪律头盔", "头盔", "护甲", "仓库"),
        group_key: "armor",
        item_type: "头盔",
        armor_stats: { total: 66, health: 18, melee: 4, grenade: 22, super: 10, class: 6, weapon: 6 }
      },
      {
        ...prototypeAccountItem("class-vault", 1011, "职业物品目标件", "职业物品", "护甲", "仓库"),
        group_key: "armor",
        item_type: "职业物品",
        armor_stats: { total: 0, health: 0, melee: 0, grenade: 0, super: 0, class: 0, weapon: 0 }
      },
      prototypeAccountItem("boots-vault", 1044, "高恢复腿甲", "腿甲", "护甲", "仓库"),
      prototypeAccountItem("gauntlets-vault", 1045, "近战臂铠", "臂铠", "护甲", "仓库"),
      prototypeAccountItem("glaive-vault", 1046, "实验偃月", "能量武器", "适配框架", "仓库"),
      prototypeAccountItem("machinegun-vault", 1047, "机枪清怪件", "威能武器", "高冲击力框架", "仓库"),
      prototypeAccountItem("sidearm-vault", 1048, "轻质手枪", "能量武器", "轻质框架", "仓库")
    ],
    sample_items: []
  },
  materials: {
    item_count: 28,
    items: [
      { hash: 9001, name: "增强核心", item_count: 126, icon: prototypeItemIcon("核", "#2e835c") },
      { hash: 9002, name: "升级模块", item_count: 18, icon: prototypeItemIcon("升", "#2f7dd1") },
      { hash: 9003, name: "异域密码", item_count: 1, icon: prototypeItemIcon("异", "#c6922e") }
    ]
  }
};

export const prototypeLoadoutTemplates: any[] = [
  {
    id: "nightfall-hunter",
    name: "宗师夜幕安全位",
    character_id: "hunter-1",
    class_name: "猎人",
    created_at: "2026-06-18T10:00:00.000Z",
    updated_at: "2026-07-02T14:18:00.000Z",
    items: [
      { hash: 1001, instance_id: "pulse-equipped", name: "快速命中脉冲", bucket_name: "动能武器", weapon_frame_name: "轻质框架", perk_names: ["快速命中", "动能震颤"] },
      { hash: 1002, instance_id: "handcannon-vault", name: "精准手炮", bucket_name: "能量武器", weapon_frame_name: "精确框架", perk_names: ["丰盈满溢", "爆炸载荷"] },
      { hash: 1003, instance_id: "shotgun-inventory", name: "终局霰弹枪", bucket_name: "能量武器", weapon_frame_name: "精确框架", perk_names: ["自动装填", "重组"] },
      { hash: 1004, instance_id: "rocket-equipped", name: "边缘迁移火箭筒", bucket_name: "威能武器", weapon_frame_name: "自适应框架", perk_names: ["追踪模块", "诱导推销"] }
    ]
  },
  {
    id: "raid-warlock",
    name: "突袭输出位",
    character_id: "warlock-1",
    class_name: "术士",
    created_at: "2026-06-24T09:00:00.000Z",
    updated_at: "2026-07-01T21:30:00.000Z",
    items: [
      { hash: 1001, name: "快速命中脉冲", bucket_name: "动能武器", weapon_frame_name: "轻质框架", perk_names: ["快速命中", "动能震颤"] },
      { hash: 1005, instance_id: "fusion-warlock", name: "适配融合步枪", bucket_name: "能量武器", weapon_frame_name: "适配框架", perk_names: ["自填", "控制爆破"] },
      { hash: 1006, instance_id: "sword-vault", name: "连锁反应刀剑", bucket_name: "威能武器", weapon_frame_name: "旋风框架", perk_names: ["无情打击", "连锁反应"] }
    ]
  }
];

export const prototypeEquipmentFilters: LibraryEquipmentFilter = {
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

export const prototypePerkFilters: LibraryPerkFilter = {
  query: "",
  relatedGroup: "all",
  hasRelatedItems: "all"
};

export const prototypeLibraryItems: any[] = [
  {
    hash: 1001,
    name: "快速命中脉冲",
    icon: prototypeItemIcon("脉", "#2f7dd1"),
    description: "适合宗师和赛季活动的稳定主手武器。",
    item_type: "脉冲步枪",
    tier: "传说",
    group_key: "weapons",
    bucket_name: "动能武器",
    ammo_type: "primary",
    weapon_frame: { key: "lightweight", name: "轻质框架" },
    source: { status: "ready", label: "来源可确认", description: "夜幕轮换奖励，需要等本周或后续轮换复查。" },
    definition_stats: [
      { hash: 4284893193, name: "射速", value: 450, display_maximum: 1000 },
      { hash: 4043523819, name: "伤害", value: 27, display_maximum: 100 },
      { hash: 1240592695, name: "射程", value: 62, display_maximum: 100 },
      { hash: 155624089, name: "稳定性", value: 72, display_maximum: 100 },
      { hash: 943549884, name: "操控性", value: 48, display_maximum: 100 },
      { hash: 4188031367, name: "装填速度", value: 41, display_maximum: 100 }
    ],
    perks: [{ socket_index: 3, plugs: [{ hash: 2001, name: "快速命中", description: "精准命中提高稳定性和装填速度。" }, { hash: 2002, name: "动能震颤", description: "持续命中会产生冲击波。" }] }]
  },
  {
    hash: 1002,
    name: "精准手炮",
    icon: prototypeItemIcon("手", "#7a4fb3"),
    description: "PVE 清怪和勇士控制都能使用。",
    item_type: "手炮",
    tier: "传说",
    group_key: "weapons",
    bucket_name: "能量武器",
    ammo_type: "primary",
    weapon_frame: { key: "precision", name: "精确框架" },
    source: { status: "ready", label: "来源可确认", description: "当前公开商人库存有售卖线索。" },
    definition_stats: [
      { hash: 4284893193, name: "射速", value: 140, display_maximum: 1000 },
      { hash: 4043523819, name: "伤害", value: 84, display_maximum: 100 },
      { hash: 1240592695, name: "射程", value: 61, display_maximum: 100 },
      { hash: 155624089, name: "稳定性", value: 68, display_maximum: 100 },
      { hash: 943549884, name: "操控性", value: 42, display_maximum: 100 },
      { hash: 4188031367, name: "装填速度", value: 36, display_maximum: 100 },
      { hash: 3871231066, name: "弹匣", value: 11, display_maximum: 100 }
    ],
    perks: [
      { socket_index: 0, plugs: [{ hash: 2101, name: "精确框架", description: "后坐方向更垂直，开火手感稳定。" }] },
      { socket_index: 1, plugs: [{ hash: 2102, name: "箭头制退器", description: "大幅控制后坐方向。" }, { hash: 2103, name: "小口径", description: "提高射程和稳定性。" }] },
      { socket_index: 2, plugs: [{ hash: 2104, name: "战术弹匣", description: "提高稳定性、装填速度和弹匣容量。" }, { hash: 2105, name: "附加弹匣", description: "提高弹匣容量。" }] },
      { socket_index: 3, plugs: [{ hash: 2003, name: "丰盈满溢", description: "拾取特殊或重弹溢出弹匣。" }, { hash: 2106, name: "快速命中", description: "精准命中提高稳定性和装填速度。" }] },
      { socket_index: 4, plugs: [{ hash: 2004, name: "爆炸载荷", description: "弹体造成范围爆炸伤害。" }, { hash: 2107, name: "狂暴", description: "击败目标后暂时提高伤害。" }] },
      { socket_index: 5, plugs: [{ hash: 2108, name: "原始特性", description: "来自该来源的武器定义特性。" }] },
      { socket_index: 6, plugs: [{ hash: 2109, name: "专家稳定性", description: "武器模组。" }] },
      { socket_index: 7, plugs: [{ hash: 2110, name: "6阶：稳定性", description: "大幅提升的属性。" }] }
    ]
  },
  {
    hash: 1007,
    name: "旧赛季斥候",
    icon: prototypeItemIcon("侦", "#6b7280"),
    description: "传承来源，当前不作为优先刷取目标。",
    item_type: "斥候步枪",
    tier: "传说",
    group_key: "weapons",
    bucket_name: "动能武器",
    ammo_type: "primary",
    weapon_frame: { key: "adaptive", name: "适配框架" },
    source: { status: "ready", label: "传承来源", description: "已下架或传承来源，需等待官方恢复入口。" },
    perks: []
  },
  {
    hash: 1008,
    name: "高射速自动步枪",
    icon: prototypeItemIcon("自", "#2e835c"),
    description: "适合赛季活动清怪，作为目标规则之外的复查样本。",
    item_type: "自动步枪",
    tier: "传说",
    group_key: "weapons",
    bucket_name: "动能武器",
    ammo_type: "primary",
    weapon_frame: { key: "rapid-fire", name: "速射框架" },
    source: { status: "ready", label: "来源可确认", description: "世界掉落和公开商人池中可复查。" },
    definition_stats: [
      { hash: 4284893193, name: "射速", value: 720, display_maximum: 1000 },
      { hash: 4043523819, name: "伤害", value: 18, display_maximum: 100 },
      { hash: 1240592695, name: "射程", value: 44, display_maximum: 100 },
      { hash: 155624089, name: "稳定性", value: 50, display_maximum: 100 },
      { hash: 943549884, name: "操控性", value: 65, display_maximum: 100 },
      { hash: 4188031367, name: "装填速度", value: 58, display_maximum: 100 }
    ],
    perks: [{ socket_index: 3, plugs: [{ hash: 2005, name: "维持生计", description: "击败目标后部分装填弹匣。" }, { hash: 2006, name: "目标锁定", description: "持续命中提高伤害。" }] }]
  },
  {
    hash: 1010,
    name: "高纪律头盔",
    icon: prototypeItemIcon("盔", "#a87118"),
    description: "用于测试护甲目标规则和属性筛选。",
    item_type: "头盔",
    tier: "传说",
    group_key: "armor",
    bucket_name: "头盔",
    ammo_type: "",
    weapon_frame: { key: "armor", name: "护甲" },
    source: { status: "ready", label: "来源可确认", description: "账号仓库中已有样本，可直接对照本地目标规则。" },
    perks: []
  }
];

export const prototypeLibraryPerks: any[] = [
  {
    hash: 2002,
    name: "动能震颤",
    description: "连续命中目标后产生动能冲击波。",
    related_items: [{ hash: 1001, name: "快速命中脉冲", group_key: "weapons" }]
  },
  {
    hash: 2003,
    name: "丰盈满溢",
    description: "拾取弹药时溢出当前武器弹匣。",
    related_items: [{ hash: 1002, name: "精准手炮", group_key: "weapons" }]
  }
];

export const prototypeLibraryHistory = {
  recent: [
    { hash: 1001, name: "快速命中脉冲", icon: prototypeItemIcon("脉", "#2f7dd1") },
    { hash: 1002, name: "精准手炮", icon: prototypeItemIcon("手", "#7a4fb3") }
  ],
  favorites: [
    { hash: 1002, name: "精准手炮", icon: prototypeItemIcon("手", "#7a4fb3") }
  ]
};

export const prototypeLibraryCommunityMatch = new Map<number, any>([
  [1001, { available: 3, sample_perks: [{ name: "快速命中" }, { name: "动能震颤" }] }],
  [1002, { available: 2, sample_perks: [{ name: "丰盈满溢" }, { name: "爆炸载荷" }] }]
]);

export const prototypeLiveAvailability = {
  account_scope: "character" as const,
  items: {
    "1002": {
      status: "public_vendor" as const,
      label: "公开商人售卖",
      description: "Prototype mock：当前公开商人库存命中，需进游戏确认价格和资格。",
      sources: [{ kind: "public_vendor" as const, label: "Banshee-44" }]
    }
  }
};

export const prototypeManifestStatus = {
  initialized: true,
  version: "DestinyInventoryItemDefinition.26.06.16.0000",
  latest_version: "DestinyInventoryItemDefinition.26.06.16.0000",
  needs_update: false,
  cached_at: "2026-06-16T17:00:00.000Z",
  checked_at: "2026-07-03T14:18:00+08:00",
  missing_required_components: []
};

export const prototypeUpdateSnapshot = {
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

export function prototypeStartupStateForScenario(scenario: PrototypeScenario): any {
  return {
    cards: {
      bungieConfig: {
        status: scenario.key === "account-missing" ? "missing" : "ready",
        label: scenario.key === "account-missing" ? "需要配置 Bungie" : "Bungie 已配置"
      },
      account: {
        status: scenario.hasAccountData ? "ready" : "missing",
        label: scenario.hasAccountData ? "账号已读取" : "需要登录 Bungie 账号"
      }
    }
  };
}

export const prototypeActivitySummary: any = {
  recent: {
    total: 10,
    pve: { total: 7, completed: 6 },
    pvp: { total: 3, completed: 2 },
    latest_period: "2026-07-03T13:42:00+08:00"
  },
  review: {
    completion_rate: 80,
    completions_in_a_row: 3,
    recent_10: [
      { status_label: "已完成", duration_label: "12分 08秒", key_stats: ["击杀 82", "死亡 1"] },
      { status_label: "已完成", duration_label: "10分 31秒", key_stats: ["击杀 64", "助攻 21"] }
    ]
  },
  raids: {
    entries: [
      {
        activity_type: "raid",
        activity_name: "克洛塔的末日",
        completions: 1,
        attempts: 2,
        last_completed_at: "2026-07-02T22:15:00+08:00"
      },
      {
        activity_type: "dungeon",
        activity_name: "战争领主的废墟",
        completions: 2,
        attempts: 2,
        last_completed_at: "2026-07-01T21:05:00+08:00"
      }
    ]
  },
  recent_items: [
    { period: "2026-07-03T13:42:00+08:00", mode: "pve", activity_name: "日落打击", completed: true },
    { period: "2026-07-03T12:18:00+08:00", mode: "pvp", activity_name: "控制", completed: true }
  ]
};

export const prototypeVaultTags = {
  items: {
    "handcannon-vault": { tag: "review", note: "同名 2 件，优先看 perk 差异。" },
    "sword-vault": { tag: "loadout", note: "突袭输出位可用。" },
    "scout-vault": { tag: "junk", note: "传承来源，无目标命中。" },
    "helmet-vault": { tag: "keep", note: "纪律目标命中。" }
  }
} as const;

export const prototypeLocalTargetRules = {
  action_policy: "notify_only" as const,
  armor: [
    {
      id: "prototype-armor-discipline",
      name: "高纪律护甲",
      conditions: [{ stat: "grenade" as const, min: 20 }]
    }
  ],
  weapons: [
    {
      id: "prototype-weapon-handcannon",
      name: "PVE 手炮",
      item_hash: 1002,
      item_name: "精准手炮",
      conditions: [{ perk_hash: 2004, perk_name: "爆炸载荷" }]
    }
  ]
};

export const prototypeWishlist = {
  title: "Prototype DIM Wishlist",
  rules: [
    {
      item_hash: 1002,
      perk_hashes: [2003, 2004],
      mode: "pve" as const,
      note: "PVE 推荐"
    }
  ]
};

export const prototypeVaultCommunityMatch = new Map<number, any>([
  [1002, { matched: 2, modes: ["pve"], sample_perks: [{ name: "丰盈满溢" }, { name: "爆炸载荷" }] }],
  [1006, { matched: 1, modes: ["pve"], sample_perks: [{ name: "连锁反应" }] }]
]);

export const prototypeBatchResult = {
  success_count: 0,
  failed_count: 0,
  results: []
};

export function getPrototypeBackgroundTasks(scenarioKey: PrototypeScenarioKey): ShellBackgroundTaskItem[] {
  if (scenarioKey === "background-running") {
    return [
      {
        id: "prototype-account-sync",
        title: "读取账号数据",
        status: "running",
        message: "正在同步角色、仓库和最近活动。",
        progress_percent: 48,
        updated_at: "2026-07-03T14:18:00+08:00"
      },
      {
        id: "prototype-manifest-check",
        title: "资料库版本检查",
        status: "retrying",
        message: "网络暂时不可用，稍后自动重试。",
        next_retry_at: "2026-07-03T14:22:00+08:00",
        updated_at: "2026-07-03T14:18:00+08:00"
      },
      ...prototypeBackgroundTasks
    ];
  }

  return prototypeBackgroundTasks;
}

export const prototypeBackgroundTasks: ShellBackgroundTaskItem[] = [
  {
    id: "manifest-check",
    title: "资料库检查",
    status: "succeeded",
    message: "Prototype mock：资料库已是最新。",
    created_at: "2026-07-03T14:10:00+08:00",
    updated_at: "2026-07-03T14:18:00+08:00"
  }
];

export const prototypeActionLog = [
  {
    id: "action-1",
    created_at: "2026-07-03T14:12:00+08:00",
    action: "transfer",
    item_name: "精准手炮",
    ok: true,
    message: "Prototype mock：已生成仓库转移计划。"
  },
  {
    id: "action-2",
    created_at: "2026-07-03T14:13:00+08:00",
    action: "loadout-equip",
    item_name: "宗师夜幕安全位",
    ok: false,
    message: "Prototype mock：缺少仓库待取装备。"
  }
];

export const prototypeBungieConfig = {
  bungie: {
    api_key: "prototype-api-key",
    client_id: "prototype-client-id",
    client_secret: "prototype-client-secret",
    redirect_uri: "https://127.0.0.1:28780/oauth/callback"
  }
};

export const prototypeVaultItems = [
  {
    name: "快速命中脉冲",
    short: "脉",
    bucket: "动能武器",
    frame: "轻质框架",
    perks: "快速命中 / 动能震颤",
    score: "保留",
    tone: "keep",
    signals: ["DIM 命中", "配装占用"]
  },
  {
    name: "精准手炮",
    short: "手",
    bucket: "能量武器",
    frame: "精确框架",
    perks: "丰盈满溢 / 爆炸载荷",
    score: "复查",
    tone: "review",
    signals: ["商人售卖", "同名 2 件"]
  },
  {
    name: "旧赛季斥候",
    short: "侦",
    bucket: "动能武器",
    frame: "适配框架",
    perks: "边打边劫 / 禅意时刻",
    score: "清理",
    tone: "junk",
    signals: ["传承来源", "无目标命中"]
  }
];

export function prototypeAccountItem(instanceId: string, hash: number, name: string, bucketName: string, frameName: string, location: string) {
  const isWeapon = bucketName.includes("武器");
  const sourceKind = location === "仓库"
    ? "vault"
    : location === "邮政官"
      ? "postmaster"
      : location.includes("背包")
        ? "inventory"
        : "equipped";

  return {
    hash,
    instance_id: instanceId,
    name,
    icon: prototypeItemIcon(bucketName.slice(0, 1), isWeapon ? "#2f7dd1" : "#a87118"),
    item_type: isWeapon ? "武器" : bucketName,
    tier: "传说",
    bucket_name: bucketName,
    group_key: isWeapon ? "weapons" : "armor",
    weapon_frame: isWeapon ? { key: frameName, name: frameName } : undefined,
    armor_stats: isWeapon ? undefined : { total: 64, health: 12, melee: 8, grenade: 20, super: 10, class: 6, weapon: 8 },
    socket_plugs: [
      { hash: hash + 10000, name: "快速命中" },
      { hash: hash + 20000, name: "目标锁定" }
    ],
    source_kind: sourceKind,
    source_character_id: location.includes("术士") ? "warlock-1" : "hunter-1"
  };
}

export function prototypeEmblem(label: string, bg: string, fg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="14" fill="${bg}"/><path d="M18 70h60L48 16 18 70Z" fill="rgba(255,255,255,.18)"/><text x="48" y="59" text-anchor="middle" font-size="34" font-family="Arial, sans-serif" font-weight="700" fill="${fg}">${label}</text></svg>`)}`;
}

export function prototypeItemIcon(label: string, bg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="${bg}"/><rect x="10" y="10" width="44" height="44" rx="6" fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.45)"/><text x="32" y="40" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" font-weight="700" fill="#fff">${label}</text></svg>`)}`;
}

function findPrototypeLoadoutTemplate(templateId: string) {
  return prototypeLoadoutTemplates.find((template) => template.id === templateId)
    ?? prototypeLoadoutTemplates[0]
    ?? null;
}

function createPrototypeActiveLoadout(templateId: string) {
  const selectedTemplate = findPrototypeLoadoutTemplate(templateId);
  const activeLoadoutLookup = selectedTemplate ? buildLoadoutTemplateLookup(selectedTemplate) : null;

  return { selectedTemplate, activeLoadoutLookup };
}

export function createPrototypeHomePageModel(scenario: PrototypeScenario) {
  return selectHomePageModel({
    state: scenario.homeState,
    diagnosticRows: scenario.diagnosticRows,
    accountError: scenario.accountError,
    hasAccountData: scenario.hasAccountData,
    dailySummary: scenario.homeDailySummary,
    isInitializingManifest: scenario.isInitializingManifest,
    isLoadingDaily: scenario.isLoadingDaily,
    isRefreshingDiagnostics: scenario.isRefreshingDiagnostics
  });
}

export function createPrototypeAccountPageModel(input: {
  scenario: PrototypeScenario;
  selectedCharacterId: string;
  selectedTemplateId: string;
}) {
  const { selectedTemplate, activeLoadoutLookup } = createPrototypeActiveLoadout(input.selectedTemplateId);
  const accountSummary = input.scenario.hasAccountData ? prototypeAccountSummary : null;
  const isBungieConfigured = input.scenario.key !== "account-missing";

  return selectAccountPageModel({
    cache: {
      accountSummary,
      activitySummary: prototypeActivitySummary
    },
    pageState: {
      selectedCharacterId: input.selectedCharacterId,
      openingItemKey: "",
      isLoadoutMatch: (item) => matchesLoadoutTemplateItem(item, activeLoadoutLookup),
      isBungieConfigured,
      isAccountLoggedIn: input.scenario.hasAccountData,
      isLoadingAccount: false,
      writeActionsEnabled: false,
      accountStatusLabel: prototypeStartupStateForScenario(input.scenario).cards.account.label,
      accountError: input.scenario.accountError,
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

export function createPrototypeVaultPageModel(input: {
  selectedCharacterId: string;
  selectedTemplateId: string;
}) {
  const { selectedTemplate, activeLoadoutLookup } = createPrototypeActiveLoadout(input.selectedTemplateId);

  return selectVaultPageModel({
    account: prototypeAccountSummary,
    selectedCharacterId: input.selectedCharacterId,
    activeLoadoutLookup,
    activeLoadoutName: selectedTemplate?.name,
    tags: prototypeVaultTags,
    targetRules: prototypeLocalTargetRules,
    wishlist: prototypeWishlist,
    communityMatch: prototypeVaultCommunityMatch
  });
}

export function createPrototypeLoadoutsPageModel(input: {
  scenario: PrototypeScenario;
  selectedTemplateId: string;
  selectedEntryId: string;
  compareTemplateId: string;
  showDiffOnly: boolean;
}) {
  return selectLoadoutsPageModel({
    accountSummary: input.scenario.hasAccountData ? prototypeAccountSummary : null,
    templates: prototypeLoadoutTemplates,
    selectedTemplateId: input.selectedTemplateId,
    selectedEntryId: input.selectedEntryId,
    compareTemplateId: input.compareTemplateId,
    showDiffOnly: input.showDiffOnly
  });
}

export function createPrototypeLibraryPageModel(input: {
  libraryViewMode: "equipment" | "perks";
  equipmentFilters: LibraryEquipmentFilter;
  perkFilters: LibraryPerkFilter;
  aliasDraft: string;
  aliasTargetDraft: string;
  aliasKind: "item" | "perk";
}) {
  return selectLibraryPageModel({
    items: prototypeLibraryItems,
    perks: prototypeLibraryPerks,
    libraryHistory: prototypeLibraryHistory,
    libraryCommunityMatch: prototypeLibraryCommunityMatch,
    liveAvailability: prototypeLiveAvailability,
    liveAvailabilityError: "",
    manifestStatus: prototypeManifestStatus,
    manifestStatusError: ""
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
    aliasMessage: "Prototype：别名保存为 mock 状态。",
    isLoadingLiveAvailability: false,
    isLoadingManifestStatus: false,
    isInitializingManifest: false,
    itemDetailLoadingKey: ""
  });
}

export function createPrototypeSettingsPageModel(input: {
  interfaceLocale: "zh-CN" | "en-US";
  bungieLocale: "zh-chs" | "en";
  followInterfaceLocaleForBungie: boolean;
  initialSection: SettingsSectionKey;
  scenario: PrototypeScenario;
  backgroundTasks: ShellBackgroundTaskItem[];
}) {
  return selectSettingsPageModel({
    interfaceLocale: input.interfaceLocale,
    initialSection: input.initialSection,
    message: "",
    error: "",
    diagnosticDataDir: "D:\\Users\\Prototype\\AppData\\Roaming\\d2-tools",
    writeActionsEnabled: true,
    updateSnapshot: prototypeUpdateSnapshot,
    manifestStatus: prototypeManifestStatus,
    manifestStatusError: "",
    isLoadingManifestStatus: false,
    isInitializingManifest: false,
    accountSummary: prototypeAccountSummary,
    accountError: input.scenario.accountError,
    isLoadingAccount: false,
    lastAccountLoadedAt: new Date("2026-07-03T14:18:00+08:00"),
    isAiConfigured: input.scenario.key !== "ai-unconfigured",
    backgroundTasks: input.backgroundTasks,
    actionLog: prototypeActionLog,
    actionLogResultFilter: "all",
    actionLogTypeFilter: "all",
    languagePreferences: {
      interfaceLocale: input.interfaceLocale,
      bungieLocale: input.bungieLocale,
      followInterfaceLocaleForBungie: input.followInterfaceLocaleForBungie
    }
  });
}

export const prototypeAssistantInitialMessages: AiAssistantMessageView[] = [
  {
    role: "assistant",
    text: "我已经读取当前页面上下文，可以按今日重点、仓库清理、配装缺口或资料库来源给出 mock 建议。"
  }
];

export const prototypeAssistantQuickPrompts = [
  "今天先刷什么",
  "仓库清理建议",
  "这套配装缺什么",
  "资料库来源怎么确认"
];

export function createPrototypeAssistantContext(
  activePage: ShellPageKey,
  scenarioLabel: string,
  shellStatus: ShellStatusItem[]
): AiAssistantContextView {
  const statusValue = (key: NonNullable<ShellStatusItem["key"]>) => {
    const item = shellStatus.find((status) => status.key === key);
    return item ? `${item.label}：${item.value}` : "未提供";
  };

  return {
    pageLabel: getPrototypePageLabel(activePage),
    focus: getPrototypeAssistantFocus(activePage),
    facts: [
      `状态方案：${scenarioLabel}`,
      statusValue("account"),
      statusValue("library")
    ],
    itemCount: 496,
    characterCount: 2,
    materialCount: 28,
    dailyLoaded: true
  };
}

export function createPrototypeAssistantContextChip(context: AiAssistantContextView) {
  return [
    `当前页面：${context.pageLabel}`,
    `仓库 ${context.itemCount} 件`,
    `角色 ${context.characterCount} 个`,
    context.dailyLoaded ? "今日信息已载入" : "今日信息未载入"
  ].join(" · ");
}

export function createPrototypeAssistantReply(prompt: string, page: ShellPageKey) {
  const bullets = getPrototypeAssistantBullets(page);
  const suffix = bullets.length ? `\n\n下一步：${bullets.join("；")}。` : "";
  if (prompt.includes("仓库")) {
    return `先从重复同名和无目标命中的装备开始，保留 DIM 命中、配装占用和当前商人可替代项需要复查的装备。${suffix}`;
  }
  if (prompt.includes("配装")) {
    return `这套 mock 配装有两件需要处理：一件在仓库待取，一件在当前角色背包，真实实现应拆成补齐和应用两个动作。${suffix}`;
  }
  if (prompt.includes("资料库") || prompt.includes("来源")) {
    return `资料库页应优先展示来源状态、Perk 池命中和公开商人线索；版本过期时只提示更新，不把配置细节常驻在首页。${suffix}`;
  }
  if (page === "home") {
    return `首页建议先看今日 / 本周官方可确认内容，再处理账号、资料库、应用版本这类顶部状态异常。${suffix}`;
  }
  return `我会按当前页面上下文给出下一步：先处理高风险状态，再看能直接行动的按钮，最后检查低频设置。${suffix}`;
}

function getPrototypePageLabel(page: ShellPageKey) {
  const labels: Record<ShellPageKey, string> = {
    home: "首页工作台",
    account: "账号摘要",
    vault: "仓库整理",
    loadouts: "配装方案",
    library: "资料库搜索",
    vendors: "商人库存",
    settings: "设置中心"
  };

  return labels[page];
}

function getPrototypeAssistantFocus(page: ShellPageKey) {
  const focus: Record<ShellPageKey, string> = {
    home: "先看官方可确认的今日 / 本周内容，再处理账号、资料库和应用版本状态。",
    account: "检查角色、仓库和最近活动是否已读取，后续账号切换也应从这里进入。",
    vault: "从重复同名、目标命中、配装占用和清理候选中找出下一步整理动作。",
    loadouts: "确认配装缺口、转移计划和可直接应用的装备，避免把状态藏在页面底部。",
    library: "核对资料库版本、Perk 池、来源状态和公开商人线索。",
    vendors: "只展示可确认的商人、轮换和掉落线索，未确认内容保留复查状态。",
    settings: "只处理低频配置、重新授权、资料库更新、备份迁移和诊断导出。"
  };

  return focus[page];
}

function getPrototypeAssistantBullets(page: ShellPageKey) {
  if (page === "vault") {
    return ["复查同名重复和清理候选", "保留配装占用与目标命中装备", "清理动作先做确认队列"];
  }
  if (page === "loadouts") {
    return ["先补仓库待取装备", "再应用已在背包的装备", "缺失项复制为检查清单"];
  }
  if (page === "library") {
    return ["优先看来源可确认项", "Perk 搜索支持别名", "版本过期时先更新资料库"];
  }
  if (page === "vendors") {
    return ["先看推荐关注项", "费用和拥有状态只做可确认展示", "未接真实库存时保留 mock 标记"];
  }
  if (page === "settings") {
    return ["账号、资料库、AI 和备份都保留操作按钮", "顶部只展示状态，不堆大卡片", "异常时给出明确修复入口"];
  }
  return ["今日重点放在首页", "账号和资料库状态在顶部可见", "AI 抽屉负责解释原因和下一步"];
}

export function usePrototypeFixtureRuntime() {
  return useMemo(() => ({
    accountSummary: prototypeAccountSummary,
    loadoutTemplates: prototypeLoadoutTemplates,
    equipmentFilters: prototypeEquipmentFilters,
    perkFilters: prototypePerkFilters,
    libraryItems: prototypeLibraryItems,
    libraryPerks: prototypeLibraryPerks,
    libraryHistory: prototypeLibraryHistory,
    libraryCommunityMatch: prototypeLibraryCommunityMatch,
    liveAvailability: prototypeLiveAvailability,
    manifestStatus: prototypeManifestStatus,
    updateSnapshot: prototypeUpdateSnapshot,
    startupStateForScenario: prototypeStartupStateForScenario,
    activitySummary: prototypeActivitySummary,
    vaultTags: prototypeVaultTags,
    localTargetRules: prototypeLocalTargetRules,
    wishlist: prototypeWishlist,
    vaultCommunityMatch: prototypeVaultCommunityMatch,
    batchResult: prototypeBatchResult,
    getBackgroundTasks: getPrototypeBackgroundTasks,
    actionLog: prototypeActionLog,
    bungieConfig: prototypeBungieConfig,
    vaultItems: prototypeVaultItems,
    vendorsModel: selectVendorsPageModel(null),
    assistantInitialMessages: prototypeAssistantInitialMessages,
    assistantQuickPrompts: prototypeAssistantQuickPrompts,
    findLoadoutTemplate: findPrototypeLoadoutTemplate,
    createHomePageModel: createPrototypeHomePageModel,
    createAccountPageModel: createPrototypeAccountPageModel,
    createVaultPageModel: createPrototypeVaultPageModel,
    createLoadoutsPageModel: createPrototypeLoadoutsPageModel,
    createLibraryPageModel: createPrototypeLibraryPageModel,
    createSettingsPageModel: createPrototypeSettingsPageModel,
    createAssistantContext: createPrototypeAssistantContext,
    createAssistantContextChip: createPrototypeAssistantContextChip,
    createAssistantReply: createPrototypeAssistantReply
  }), []);
}
