import type {
  HomeCopy,
  HomeDailySummary,
  HomeStartupState,
  HomeWeeklySummary,
  ShellCopy,
  ShellStatusItem
} from "@d2-tools/ui";
import { webAppVersion } from "./buildInfo";

export type WebHomeSnapshot = {
  shellStatus: ShellStatusItem[];
  homeState: HomeStartupState;
  homeDailySummary: HomeDailySummary;
  homeWeeklySummary: HomeWeeklySummary;
};

/**
 * 降级快照需要的 copy 切片。这个文件被 `webApi.ts` 的服务端路由 import，
 * 对 `@d2-tools/ui` 只能留 `import type`，所以文案表由调用方查好后传进来，
 * 不在本文件 value-import `getLocaleCopy`。
 */
export type WebSnapshotCopy = {
  home: HomeCopy;
  shell: ShellCopy;
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

/**
 * 服务未连接时的降级快照。文案全部从传入的 copy 表取：
 * zh-CN 侧 key 就是中文原文，en-US 侧用同一段原文查英文，查不到退回原文。
 */
export function createUnavailableHomeSnapshot(copy: WebSnapshotCopy): WebHomeSnapshot {
  const homeText = (key: string) => copy.home.inline[key] ?? key;
  const shellText = (key: string) => copy.shell.inline[key] ?? key;
  // 周报的展示文本在 core 侧是 token（key + 取值，由渲染层查表成句）。这份降级快照的文案
  // 已经按当前语言查好了，所以标 `literal` 让渲染层原样输出，不再二次查表。
  const literal = (text: string) => ({ key: text, literal: true });

  return {
    shellStatus: [
      { key: "bungie", label: "Bungie", value: shellText("服务未连接"), tone: "warning" },
      { key: "account", label: shellText("账号"), value: shellText("不可用"), tone: "warning" },
      { key: "library", label: shellText("资料库"), value: shellText("不可用"), tone: "warning" },
      { key: "ai", label: "AI", value: shellText("不可用"), tone: "warning" },
      { key: "app-version", kind: "update", label: copy.shell.update.versionLabel, value: webAppVersion.startsWith("v") ? webAppVersion : `v${webAppVersion}`, tone: "ready", priority: "quiet" }
    ],
    homeState: {
      cards: {
        manifest: {
          label: homeText("资料库服务未连接"),
          status: "warning",
          lastUpdated: homeText("无法读取"),
          needsUpdate: false
        }
      }
    },
    homeDailySummary: {
      daily_reset: {
        label: copy.home.labels.dailyReset,
        time_remaining_label: homeText("无法读取")
      },
      weekly_reset: {
        label: copy.home.labels.weeklyReset,
        time_remaining_label: homeText("无法读取")
      },
      sources: {
        weekly_report: {
          status: "warning",
          message: homeText("Web 服务未连接。"),
          items: []
        },
        rotations: {
          status: "warning",
          message: homeText("Web 服务未连接。"),
          items: []
        },
        vendors: {
          status: "warning",
          message: homeText("Web 服务未连接。"),
          items: []
        },
        lost_sector: {
          status: "warning",
          message: homeText("Web 服务未连接。")
        }
      },
      checklist: []
    },
    homeWeeklySummary: {
      weekly_reset: {
        label: copy.home.labels.weeklyReset,
        time_remaining_label: homeText("无法读取")
      },
      priorities: {
        nightfall: { status: "warning", title: literal(homeText("日落数据不可用")), detail: [literal(homeText("Web 服务未连接"))], entries: [] },
        rotating_raid: { status: "warning", title: literal(homeText("轮换突袭不可用")), detail: [literal(homeText("Web 服务未连接"))] },
        rotating_dungeon: { status: "warning", title: literal(homeText("轮换地牢不可用")), detail: [literal(homeText("Web 服务未连接"))] },
        activity_challenge: { status: "warning", title: literal(homeText("本周活动挑战不可用")), detail: [literal(homeText("Web 服务未连接"))] },
        weekly_surge: { status: "warning", title: literal(homeText("活动激涌不可用")), detail: [literal(homeText("Web 服务未连接"))] },
        special_event: { status: "warning", title: literal(homeText("限时活动不可用")), detail: [literal(homeText("Web 服务未连接"))] }
      },
      iron_banner: {
        status: "unavailable",
        title: literal(homeText("铁旗状态不可用")),
        detail: [literal(homeText("Web 服务未连接。"))],
        characters: { available_count: 0, total_count: 0, entries: {} },
        reward_groups: [],
        loot_pool: {
          status: "pending",
          source: homeText("Web 服务未连接"),
          attunement_count: 0,
          weapon_offer_count: 0,
          armor_offer_count: 0,
          featured_items: []
        }
      },
      public_clues: []
    }
  };
}

export function createWebSnapshotProvider(input: {
  copy: WebSnapshotCopy;
  source?: WebSnapshotSource;
  unavailableSnapshot?: WebHomeSnapshot;
}): WebSnapshotProvider {
  const unavailableSnapshot = input.unavailableSnapshot ?? createUnavailableHomeSnapshot(input.copy);

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
  copy: WebSnapshotCopy;
  fetchHomeSnapshot?: () => Promise<WebHomeSnapshot>;
  fetchJson?: <T>(url: string) => Promise<T>;
}): WebShellAdapter {
  const fetchJson = input.fetchJson ?? defaultFetchJson;
  const unavailableSnapshot = createUnavailableHomeSnapshot(input.copy);

  return {
    async loadHomeSnapshot() {
      if (input.fetchHomeSnapshot) {
        return input.fetchHomeSnapshot();
      }

      try {
        return await fetchJson<WebHomeSnapshot>("/api/home-snapshot");
      } catch {
        return unavailableSnapshot;
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
