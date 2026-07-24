import type {
  HomeDailySummary,
  HomeStartupState,
  HomeWeeklySummary,
  ShellStatusItem
} from "@d2-tools/ui";
import { createFixtureShellStatus } from "@d2-tools/ui/fixtures";
import { prototypeAppVersion } from "../buildInfo";

export type PrototypeScenarioKey =
  | "ready"
  | "account-missing"
  | "manifest-stale"
  | "background-running"
  | "update-available"
  | "ai-unconfigured"
  | "account-error"
  | "vendor-partial-failure"
  | "manifest-missing-components";

export type PrototypeScenario = {
  key: PrototypeScenarioKey;
  label: string;
  description: string;
  shellStatus: ShellStatusItem[];
  homeState: HomeStartupState;
  homeDailySummary: HomeDailySummary | null;
  homeWeeklySummary?: HomeWeeklySummary | null;
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
          vendorHash: 2190858386,
          vendorEnabled: true,
          vendorLocation: "高塔",
          vendorRefreshDate: "2026-07-17T09:00:00Z",
          items: [
            { itemHash: 1001, vendorHash: 2190858386, title: "仄浪板", subtitle: "载具 · 异域", description: "97 奇异硬币" },
            { itemHash: 1002, vendorHash: 2190858386, title: "幼年阿罕卡拉之脊", subtitle: "臂铠 · 异域", description: "41 奇异硬币" },
            { itemHash: 1003, vendorHash: 2190858386, title: "至纯光能护心甲", subtitle: "胸部护甲 · 异域", description: "41 奇异硬币" },
            { itemHash: 1004, vendorHash: 2190858386, title: "炎阳护腕", subtitle: "臂铠 · 异域", description: "41 奇异硬币" },
            { itemHash: 1005, vendorHash: 2190858386, title: "陨星胸甲", subtitle: "胸部护甲 · 异域", description: "41 奇异硬币" },
            { itemHash: 1006, vendorHash: 2190858386, title: "特里同之罪", subtitle: "臂铠 · 异域", description: "41 奇异硬币" },
            { itemHash: 1007, vendorHash: 2190858386, title: "霜袍服装", subtitle: "胸部护甲 · 异域", description: "41 奇异硬币" },
            { itemHash: 1008, vendorHash: 2190858386, title: "唯我主义", subtitle: "术士臂环 · 异域", description: "41 奇异硬币" }
          ]
        }
      ]
    },
    lost_sector: {
      status: "pending",
      message: "无法确认当天激活的专家遗失区域。"
    }
  },
  checklist: []
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

const readyWeeklySummary: HomeWeeklySummary = {
  weekly_reset: {
    label: "每周三 01:00 重置",
    time_remaining_label: "距离每周重置还有 5 天 14 小时"
  },
  priorities: {
    nightfall: {
      status: "ready",
      title: "光之利刃",
      detail: "屏障 · 势不可挡 · 电弧威胁",
      source: "公开周常 JSON",
      entries: [{
        title: "光之利刃",
        detail: "屏障 · 势不可挡 · 电弧威胁",
        rewards: [{ hash: 1, name: "本周奖励武器", item_type: "武器" }]
      }]
    },
    rotating_raid: {
      status: "ready",
      title: "2 个高亮突袭",
      detail: "奖励可重复获取",
      source: "公开周常 JSON",
      entries: [
        { title: "救赎的边缘", detail: "奖励可重复获取" },
        { title: "门徒誓约", detail: "奖励可重复获取" }
      ]
    },
    rotating_dungeon: {
      status: "ready",
      title: "2 个高亮地牢",
      detail: "奖励可重复获取",
      source: "公开周常 JSON",
      entries: [
        { title: "晚星之主", detail: "奖励可重复获取" },
        { title: "二象性", detail: "奖励可重复获取" }
      ]
    },
    weekly_bonus: {
      status: "ready",
      title: "先锋声望加成",
      detail: "本周声望额外奖励",
      source: "Bungie Public Milestones"
    },
    special_event: {
      status: "ready",
      title: "铁旗已开放",
      detail: "限时活动",
      source: "Bungie Public Milestones"
    }
  },
  public_clues: []
};

const baseShellStatus: ShellStatusItem[] = createFixtureShellStatus({
  bungie: { value: "已配置", tone: "ready" },
  account: { value: "2 个角色 · 14:18", tone: "ready" },
  library: { value: "2026/06/16 最新", tone: "ready" },
  ai: { value: "未配置", tone: "warning" },
  appVersion: { version: prototypeAppVersion, suffix: " 最新", tone: "ready" }
});

export const prototypeScenarios: Record<PrototypeScenarioKey, PrototypeScenario> = {
  ready: {
    key: "ready",
    label: "正常",
    description: "账号、资料库和今日信息都已读取。",
    shellStatus: baseShellStatus,
    homeState: readyHomeState,
    homeDailySummary: readyDailySummary,
    homeWeeklySummary: readyWeeklySummary,
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
    shellStatus: baseShellStatus.map((item) => item.key === "app-version" ? { ...item, value: `${prototypeAppVersion} 有新版`, tone: "warning" } : item),
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
  "vendor-partial-failure": {
    key: "vendor-partial-failure",
    label: "商人部分失败",
    description: "用于确认单个商人详情失败时仍保留基础库存和其他成功商人。",
    shellStatus: baseShellStatus,
    homeState: readyHomeState,
    homeDailySummary: readyDailySummary,
    homeWeeklySummary: readyWeeklySummary,
    hasAccountData: true,
    accountError: "",
    diagnosticRows: [{ tone: "warning" }],
    isInitializingManifest: false,
    isLoadingDaily: false,
    isRefreshingDiagnostics: false
  },
  "manifest-missing-components": {
    key: "manifest-missing-components",
    label: "资料库缺组件",
    description: "用于确认必要组件缺失时以资料库异常状态展示。",
    shellStatus: baseShellStatus.map((item) => item.key === "library" ? {
      ...item,
      value: "需修复",
      tone: "warning",
      actionLabel: "修复资料库",
      onAction: () => undefined
    } : item),
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
