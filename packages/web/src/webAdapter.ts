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
        status: "warning",
        message: "Web API adapter 接入后读取。",
        items: []
      },
      rotations: {
        status: "warning",
        message: "等待公共轮换服务。",
        items: []
      },
      vendors: {
        status: "warning",
        message: "等待商人服务。",
        items: []
      },
      lost_sector: {
        status: "warning",
        message: "等待活动服务。",
        items: []
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
