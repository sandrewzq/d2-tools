import type {
  HomeDailySummary,
  HomeStartupState,
  ShellPageKey,
  ShellStatusItem
} from "@d2-tools/ui";

export type WebHomeSnapshot = {
  shellStatus: ShellStatusItem[];
  homeState: HomeStartupState;
  homeDailySummary: HomeDailySummary;
};

export type WebPageSnapshot = {
  page: ShellPageKey;
  payload: unknown;
  updatedAt?: string;
};

export type WebSnapshotSource = {
  getHomeSnapshot: () => Promise<WebHomeSnapshot | null>;
  getPageSnapshot: (page: ShellPageKey) => Promise<WebPageSnapshot | null>;
};

export type WebSnapshotProvider = {
  loadHomeSnapshot: () => Promise<WebHomeSnapshot>;
  loadPageSnapshot: (page: ShellPageKey) => Promise<WebPageSnapshot | null>;
};

export type WebShellAdapter = {
  loadHomeSnapshot: () => Promise<WebHomeSnapshot>;
  loadPageSnapshot: (page: ShellPageKey) => Promise<WebPageSnapshot | null>;
  openExternal: (url: string) => void;
};

const fallbackLostSectorItems: NonNullable<HomeDailySummary["sources"]["lost_sector"]["items"]> = [
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

export const fallbackHomeSnapshot: WebHomeSnapshot = {
  shellStatus: [
    { key: "bungie", label: "Bungie", value: "Web 待接入", tone: "neutral" },
    { key: "account", label: "账号", value: "未登录", tone: "warning" },
    { key: "library", label: "资料库", value: "待同步", tone: "neutral" },
    { key: "ai", label: "AI", value: "未配置", tone: "warning" },
    { key: "app-version", label: "应用版本", value: "0.0.10", tone: "ready" }
  ],
  homeState: {
    cards: {
      manifest: {
        label: "Web 待同步",
        status: "pending",
        lastUpdated: "待同步",
        needsUpdate: true
      }
    }
  },
  homeDailySummary: {
    daily_reset: {
      label: "每日 01:00 重置",
      time_remaining_label: "等待服务接入"
    },
    weekly_reset: {
      label: "每周三 01:00 重置",
      time_remaining_label: "等待服务接入"
    },
    sources: {
      weekly_report: {
        status: "ready",
        message: "Web fallback 周报样例。",
        items: [
          { title: "克洛塔的末日", subtitle: "轮换突袭", description: "关注巅峰奖励", source: "Web fallback", weeklyActivityKind: "rotating_raid" },
          { title: "守望者尖塔", subtitle: "轮换地牢", description: "可反复刷取轮换奖励", source: "Web fallback", weeklyActivityKind: "rotating_dungeon" }
        ]
      },
      rotations: {
        status: "warning",
        message: "等待公共轮换服务。",
        items: []
      },
      vendors: {
        status: "ready",
        message: "Web fallback 奇异商人样例。",
        items: [
          {
            title: "仄 / Xur",
            subtitle: "奇异商人库存",
            description: "关键库存已读取",
            items: [
              { title: "透视之眼", subtitle: "异域武器", iconUrl: "/common/destiny2_content/icons/xur-weapon.png" },
              { title: "圣火之心", subtitle: "泰坦胸甲", iconUrl: "/common/destiny2_content/icons/xur-armor.png" }
            ]
          }
        ]
      },
      lost_sector: {
        status: "ready",
        message: "Web fallback 展示 9 个世界遗失区域样例。",
        items: fallbackLostSectorItems
      }
    },
    checklist: ["Web 入口先复用共享首页壳，后续接 HTTP/API adapter。"]
  }
};

export function createWebSnapshotProvider(input: {
  source?: WebSnapshotSource;
  fallback?: WebHomeSnapshot;
} = {}): WebSnapshotProvider {
  const fallback = input.fallback ?? fallbackHomeSnapshot;

  return {
    async loadHomeSnapshot() {
      if (!input.source) return fallback;

      try {
        return await input.source.getHomeSnapshot() ?? fallback;
      } catch {
        return fallback;
      }
    },
    async loadPageSnapshot(page) {
      if (!input.source) return null;

      try {
        return await input.source.getPageSnapshot(page);
      } catch {
        return null;
      }
    }
  };
}

export function createWebShellAdapter(input: {
  fetchHomeSnapshot?: () => Promise<WebHomeSnapshot>;
  fetchPageSnapshot?: (page: ShellPageKey) => Promise<WebPageSnapshot | null>;
  fetchJson?: <T>(url: string) => Promise<T>;
} = {}): WebShellAdapter {
  const fetchJson = input.fetchJson ?? defaultFetchJson;

  return {
    async loadHomeSnapshot() {
      if (input.fetchHomeSnapshot) {
        return input.fetchHomeSnapshot();
      }

      try {
        return await fetchJson<WebHomeSnapshot>("/api/home-snapshot");
      } catch {
        return fallbackHomeSnapshot;
      }
    },
    async loadPageSnapshot(page) {
      if (input.fetchPageSnapshot) {
        return input.fetchPageSnapshot(page);
      }

      try {
        return await fetchJson<WebPageSnapshot>(`/api/pages/${page}/snapshot`);
      } catch {
        return null;
      }
    },
    openExternal(url: string) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };
}

async function defaultFetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: "application/json" }
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return await response.json() as T;
}
