import type {
  HomeDailySummary,
  HomeStartupState,
  HomeWeeklySummary,
  ShellStatusItem
} from "@d2-tools/ui";
import { createFixtureShellStatus } from "@d2-tools/ui/fixtures";
import { webAppVersion } from "./buildInfo";

export type WebHomeSnapshot = {
  shellStatus: ShellStatusItem[];
  homeState: HomeStartupState;
  homeDailySummary: HomeDailySummary;
  homeWeeklySummary: HomeWeeklySummary;
};

export type WebSnapshotSource = {
  getHomeSnapshot: () => Promise<WebHomeSnapshot | null>;
};

export type WebSnapshotProvider = {
  loadHomeSnapshot: () => Promise<WebHomeSnapshot>;
};

export type WebShellAdapter = {
  loadHomeSnapshot: () => Promise<WebHomeSnapshot>;
  openExternal: (url: string) => void;
};

export const fallbackHomeSnapshot: WebHomeSnapshot = {
  shellStatus: createFixtureShellStatus({
    bungie: { value: "Web 待接入", tone: "neutral" },
    account: { value: "未登录", tone: "warning" },
    library: { value: "待同步", tone: "neutral" },
    ai: { value: "未配置", tone: "warning" },
    appVersion: { version: webAppVersion }
  }),
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
            vendorHash: 2190858386,
            vendorEnabled: true,
            items: [
              { title: "透视之眼", subtitle: "异域武器", iconUrl: "/common/destiny2_content/icons/xur-weapon.png" },
              { title: "圣火之心", subtitle: "泰坦胸甲", iconUrl: "/common/destiny2_content/icons/xur-armor.png" }
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
  },
  homeWeeklySummary: {
    weekly_reset: {
      label: "每周三 01:00 重置",
      time_remaining_label: "距离每周重置还有 5 天 14 小时"
    },
    priorities: {
      nightfall: {
        status: "ready",
        title: "光之利刃",
        detail: "屏障 · 势不可挡 · 电弧威胁",
        entries: [{
          title: "光之利刃",
          rewards: [{ hash: 1, name: "本周奖励武器", item_type: "武器" }]
        }]
      },
      rotating_raid: { status: "ready", title: "最后一愿", detail: "奖励可重复获取" },
      rotating_dungeon: { status: "ready", title: "预言", detail: "奖励可重复获取" },
      weekly_bonus: { status: "ready", title: "先锋声望加成", detail: "本周声望额外奖励" },
      special_event: { status: "ready", title: "铁旗已开放", detail: "限时活动" }
    },
    public_clues: []
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
    }
  };
}

export function createWebShellAdapter(input: {
  fetchHomeSnapshot?: () => Promise<WebHomeSnapshot>;
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
