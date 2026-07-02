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
        { title: "克洛塔的末日", subtitle: "轮换突袭", description: "关注巅峰奖励", source: "Bungie 周报" }
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
      status: "warning",
      message: "等待周末商人刷新。",
      items: [
        { title: "Xur", subtitle: "周末商人", description: "周末出现后展示异域装备摘要", source: "公共商人" }
      ]
    },
    lost_sector: {
      status: "ready",
      message: "遗失区域已确认。",
      items: [
        { title: "专家遗失区域", subtitle: "等待正式名称", description: "只展示可确认掉落线索", source: "活动数据" }
      ]
    }
  },
  checklist: ["先确认每日重置和本周固定奖励，再处理商人和账号提醒。"]
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
  { key: "background", label: "后台任务", value: "空闲", tone: "neutral" },
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
    shellStatus: baseShellStatus.map((item) => item.key === "background" ? { ...item, value: "2 个运行中", tone: "warning" } : item),
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
