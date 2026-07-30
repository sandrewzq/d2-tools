import type {
  HomeDailySummary,
  HomeStartupState,
  HomeWeeklySummary,
  ShellStatusItem
} from "@d2-tools/ui";
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

export const unavailableHomeSnapshot: WebHomeSnapshot = {
  shellStatus: [
    { key: "bungie", label: "Bungie", value: "服务未连接", tone: "warning" },
    { key: "account", label: "账号", value: "不可用", tone: "warning" },
    { key: "library", label: "资料库", value: "不可用", tone: "warning" },
    { key: "ai", label: "AI", value: "不可用", tone: "warning" },
    { key: "app-version", label: "应用版本", value: webAppVersion, tone: "ready" }
  ],
  homeState: {
    cards: {
      manifest: {
        label: "资料库服务未连接",
        status: "warning",
        lastUpdated: "无法读取",
        needsUpdate: false
      }
    }
  },
  homeDailySummary: {
    daily_reset: {
      label: "每日重置",
      time_remaining_label: "无法读取"
    },
    weekly_reset: {
      label: "每周重置",
      time_remaining_label: "无法读取"
    },
    sources: {
      weekly_report: {
        status: "warning",
        message: "Web 服务未连接。",
        items: []
      },
      rotations: {
        status: "warning",
        message: "Web 服务未连接。",
        items: []
      },
      vendors: {
        status: "warning",
        message: "Web 服务未连接。",
        items: []
      },
      lost_sector: {
        status: "warning",
        message: "Web 服务未连接。"
      }
    },
    checklist: []
  },
  homeWeeklySummary: {
    weekly_reset: {
      label: "每周重置",
      time_remaining_label: "无法读取"
    },
    priorities: {
      nightfall: { status: "warning", title: "日落数据不可用", detail: "Web 服务未连接", entries: [] },
      rotating_raid: { status: "warning", title: "轮换突袭不可用", detail: "Web 服务未连接" },
      rotating_dungeon: { status: "warning", title: "轮换地牢不可用", detail: "Web 服务未连接" },
      weekly_bonus: { status: "warning", title: "周常加成不可用", detail: "Web 服务未连接" },
      special_event: { status: "warning", title: "限时活动不可用", detail: "Web 服务未连接" }
    },
    public_clues: []
  }
};

export function createWebSnapshotProvider(input: {
  source?: WebSnapshotSource;
  unavailableSnapshot?: WebHomeSnapshot;
} = {}): WebSnapshotProvider {
  const unavailableSnapshot = input.unavailableSnapshot ?? unavailableHomeSnapshot;

  return {
    async loadHomeSnapshot() {
      if (!input.source) return unavailableSnapshot;

      try {
        return await input.source.getHomeSnapshot() ?? unavailableSnapshot;
      } catch {
        return unavailableSnapshot;
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
        return unavailableHomeSnapshot;
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
