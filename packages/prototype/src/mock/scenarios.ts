import type {
  HomeDailySummary,
  HomeStartupState,
  ShellStatusItem
} from "@d2-tools/ui";

export type PrototypeScenarioKey =
  | "ready"
  | "account-missing"
  | "manifest-stale"
  | "background-running"
  | "update-available"
  | "ai-unconfigured"
  | "account-error"
  | "manifest-missing-components";

export type PrototypeScenario = {
  key: PrototypeScenarioKey;
  label: string;
  description: string;
  shellStatus: ShellStatusItem[];
  homeState: HomeStartupState;
  homeDailySummary: HomeDailySummary | null;
  hasAccountData: boolean;
  accountError: string;
  diagnosticRows: Array<{ tone?: string }>;
  isInitializingManifest: boolean;
  isLoadingDaily: boolean;
  isRefreshingDiagnostics: boolean;
};

const readyLostSectorItems: NonNullable<HomeDailySummary["sources"]["lost_sector"]["items"]> = [
  {
    title: "采石场",
    destinationName: "欧洲无人区",
    championTypes: ["屏障", "势不可挡"],
    shieldTypes: ["烈日", "虚空"],
    threatType: "虚空",
    expertSoloRewards: ["异域记忆水晶（稀有）", "传说武器（罕见）"],
    masterSoloRewards: ["异域记忆水晶（普通）", "传说武器（普通）"]
  },
  {
    title: "萃取地",
    destinationName: "萨瓦图恩的王座世界",
    championTypes: ["过载", "势不可挡"],
    shieldTypes: ["电弧", "虚空"],
    expertSoloRewards: ["异域臂甲（稀有）", "异域胸甲（稀有）", "异域头盔（稀有）", "异域腿甲（稀有）"],
    masterSoloRewards: ["异域臂甲（常见）", "异域胸甲（常见）", "异域头盔（常见）", "异域腿甲（常见）"]
  },
  {
    title: "地堡E15",
    destinationName: "木卫二",
    championTypes: ["屏障", "过载"],
    shieldTypes: ["电弧", "虚空"],
    threatType: "电弧",
    expertSoloRewards: ["异域记忆水晶（稀有）", "传说武器（罕见）"],
    masterSoloRewards: ["异域记忆水晶（普通）", "传说武器（普通）"]
  },
  {
    title: "镀金箴言",
    destinationName: "内欧姆那",
    championTypes: ["屏障", "势不可挡"],
    shieldTypes: ["烈日", "电弧"],
    threatType: "烈日",
    expertSoloRewards: ["传说武器（罕见）"],
    masterSoloRewards: ["传说武器（普通）"]
  },
  {
    title: "繁盛深渊",
    destinationName: "苍白之心",
    championTypes: ["过载", "势不可挡"],
    shieldTypes: ["虚空", "缚丝"],
    threatType: "缚丝",
    expertSoloRewards: ["异域记忆水晶（稀有）"],
    masterSoloRewards: ["异域记忆水晶（普通）"]
  },
  {
    title: "黑色移民号花园2A",
    destinationName: "涅索斯",
    championTypes: ["屏障", "过载"],
    shieldTypes: ["电弧", "烈日"],
    expertSoloRewards: ["传说武器（罕见）"],
    masterSoloRewards: ["传说武器（普通）"]
  },
  {
    title: "汇流",
    destinationName: "涅索斯",
    championTypes: ["屏障", "势不可挡"],
    shieldTypes: ["虚空", "烈日"],
    threatType: "虚空",
    expertSoloRewards: ["异域记忆水晶（稀有）", "传说武器（罕见）"],
    masterSoloRewards: ["异域记忆水晶（普通）", "传说武器（普通）"]
  },
  {
    title: "惊颤竞速",
    destinationName: "月球",
    championTypes: ["过载", "势不可挡"],
    shieldTypes: ["电弧", "虚空"],
    threatType: "电弧",
    expertSoloRewards: ["传说武器（罕见）"],
    masterSoloRewards: ["传说武器（普通）"]
  },
  {
    title: "空坦克",
    destinationName: "纷争海岸",
    championTypes: ["屏障", "过载"],
    shieldTypes: ["烈日", "虚空"],
    expertSoloRewards: ["异域记忆水晶（稀有）"],
    masterSoloRewards: ["异域记忆水晶（普通）"]
  }
];

const readyDailySummary: HomeDailySummary = {
  daily_reset: {
    label: "每日 01:00 重置",
    time_remaining_label: "14小时 22分"
  },
  weekly_reset: {
    label: "每周三 01:00 重置",
    time_remaining_label: "5天 14小时"
  },
  sources: {
    weekly_report: {
      status: "ready",
      message: "本周周报已读取。",
      items: [
        { title: "克洛塔的末日", subtitle: "轮换突袭", description: "关注巅峰奖励", source: "Bungie 周报", weeklyActivityKind: "rotating_raid" },
        { title: "守望者尖塔", subtitle: "轮换地牢", description: "可反复刷取轮换奖励", source: "Bungie 周报", weeklyActivityKind: "rotating_dungeon" }
      ]
    },
    rotations: {
      status: "ready",
      message: "公共轮换已读取。",
      items: [
        { title: "活动线索", subtitle: "先锋 / 熔炉 / 智谋", description: "优先确认每周挑战", source: "公共轮换" }
      ]
    },
    vendors: {
      status: "ready",
      message: "奇异商人库存已读取。",
      items: [
        {
          title: "仄 / Xur",
          subtitle: "奇异商人库存",
          description: "关键库存已读取",
          source: "公共商人",
          items: [
            { title: "透视之眼", subtitle: "异域武器", iconUrl: "/common/destiny2_content/icons/2a8f3f3c3fcb7f6d4b47d5f1f2d9a5cf.jpg" },
            { title: "圣火之心", subtitle: "泰坦胸甲", iconUrl: "/common/destiny2_content/icons/8f3c3fcb7f6d4b47d5f1f2d9a5cf2a8f.jpg" }
          ]
        }
      ]
    },
    lost_sector: {
      status: "ready",
      message: "已找到 9 个世界遗失区域。",
      items: readyLostSectorItems
    }
  },
  checklist: ["先确认每日重置和世界遗失区域；重点商人等展示规范收口后再接首页摘要。"]
};

const readyHomeState: HomeStartupState = {
  cards: {
    manifest: {
      label: "可用",
      status: "ready",
      lastUpdated: "6月17日",
      needsUpdate: false
    }
  }
};

const baseShellStatus: ShellStatusItem[] = [
  { key: "bungie", label: "Bungie", value: "已配置", tone: "ready" },
  { key: "account", label: "账号", value: "14:18", tone: "ready" },
  { key: "library", label: "资料库", value: "2026/06/16 最新", tone: "ready" },
  { key: "ai", label: "AI", value: "未配置", tone: "warning" },
  { key: "app-version", label: "应用版本", value: "0.0.10 最新", tone: "ready" }
];

export const prototypeScenarios: Record<PrototypeScenarioKey, PrototypeScenario> = {
  ready: {
    key: "ready",
    label: "正常",
    description: "账号、资料库和今日信息都已读取。",
    shellStatus: baseShellStatus,
    homeState: readyHomeState,
    homeDailySummary: readyDailySummary,
    hasAccountData: true,
    accountError: "",
    diagnosticRows: [{ tone: "ready" }],
    isInitializingManifest: false,
    isLoadingDaily: false,
    isRefreshingDiagnostics: false
  },
  "account-missing": {
    key: "account-missing",
    label: "账号未登录",
    description: "用于确认账号提醒和顶部账号状态。",
    shellStatus: baseShellStatus.map((item) => item.key === "account" ? { ...item, value: "未登录", tone: "warning" } : item),
    homeState: readyHomeState,
    homeDailySummary: readyDailySummary,
    hasAccountData: false,
    accountError: "",
    diagnosticRows: [{ tone: "warning" }],
    isInitializingManifest: false,
    isLoadingDaily: false,
    isRefreshingDiagnostics: false
  },
  "manifest-stale": {
    key: "manifest-stale",
    label: "资料库过期",
    description: "用于确认资料库提示只在顶部和设置中处理。",
    shellStatus: baseShellStatus.map((item) => item.key === "library" ? { ...item, value: "有新版", tone: "warning" } : item),
    homeState: {
      cards: {
        manifest: {
          label: "需要更新",
          status: "warning",
          lastUpdated: "6月10日",
          needsUpdate: true
        }
      }
    },
    homeDailySummary: readyDailySummary,
    hasAccountData: true,
    accountError: "",
    diagnosticRows: [{ tone: "warning" }],
    isInitializingManifest: false,
    isLoadingDaily: false,
    isRefreshingDiagnostics: false
  },
  "background-running": {
    key: "background-running",
    label: "后台任务运行",
    description: "用于确认后台任务和刷新中状态不会挤占首页。",
    shellStatus: baseShellStatus,
    homeState: readyHomeState,
    homeDailySummary: null,
    hasAccountData: true,
    accountError: "",
    diagnosticRows: [{ tone: "warning" }],
    isInitializingManifest: true,
    isLoadingDaily: true,
    isRefreshingDiagnostics: true
  },
  "update-available": {
    key: "update-available",
    label: "应用有新版",
    description: "用于确认应用版本在顶部提示新版，不占用首页大卡片。",
    shellStatus: baseShellStatus.map((item) => item.key === "app-version" ? { ...item, value: "0.0.10 有新版", tone: "warning" } : item),
    homeState: readyHomeState,
    homeDailySummary: readyDailySummary,
    hasAccountData: true,
    accountError: "",
    diagnosticRows: [{ tone: "warning" }],
    isInitializingManifest: false,
    isLoadingDaily: false,
    isRefreshingDiagnostics: false
  },
  "ai-unconfigured": {
    key: "ai-unconfigured",
    label: "AI 未配置",
    description: "用于确认 AI 状态只保留在顶部和设置入口。",
    shellStatus: baseShellStatus.map((item) => item.key === "ai" ? { ...item, value: "未配置", tone: "warning" } : item),
    homeState: readyHomeState,
    homeDailySummary: readyDailySummary,
    hasAccountData: true,
    accountError: "",
    diagnosticRows: [{ tone: "warning" }],
    isInitializingManifest: false,
    isLoadingDaily: false,
    isRefreshingDiagnostics: false
  },
  "account-error": {
    key: "account-error",
    label: "账号读取失败",
    description: "用于确认账号异常会进入首页账号提醒和顶部状态。",
    shellStatus: baseShellStatus.map((item) => item.key === "account" ? { ...item, value: "读取失败", tone: "error" } : item),
    homeState: readyHomeState,
    homeDailySummary: readyDailySummary,
    hasAccountData: false,
    accountError: "Bungie 账号读取失败，请重新授权后再试。",
    diagnosticRows: [{ tone: "error" }],
    isInitializingManifest: false,
    isLoadingDaily: false,
    isRefreshingDiagnostics: false
  },
  "manifest-missing-components": {
    key: "manifest-missing-components",
    label: "资料库缺组件",
    description: "用于确认必要组件缺失时以资料库异常状态展示。",
    shellStatus: baseShellStatus.map((item) => item.key === "library" ? { ...item, value: "需修复", tone: "warning" } : item),
    homeState: {
      cards: {
        manifest: {
          label: "缺少必要组件",
          status: "warning",
          lastUpdated: "6月16日",
          needsUpdate: true
        }
      }
    },
    homeDailySummary: readyDailySummary,
    hasAccountData: true,
    accountError: "",
    diagnosticRows: [{ tone: "warning" }],
    isInitializingManifest: false,
    isLoadingDaily: false,
    isRefreshingDiagnostics: false
  }
};

export const defaultPrototypeScenarioKey: PrototypeScenarioKey = "ready";
