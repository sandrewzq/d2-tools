import { createRoot } from "react-dom/client";
import { useMemo } from "react";
import {
  AccountPageView,
  defaultProductPreferences,
  HomePageView,
  ProductShellHost,
  SettingsPageView,
  type HomeDailySummary,
  type HomeStartupState,
  type ShellPageKey,
  type ShellStatusItem
} from "@d2-tools/ui";
import "@d2-tools/ui/styles.css";

const shellStatus: ShellStatusItem[] = [
  { label: "Bungie", value: "已配置", tone: "ready" },
  { label: "账号", value: "14:18", tone: "ready" },
  { label: "资料库", value: "2026/06/16 最新", tone: "ready" },
  { label: "AI", value: "未配置", tone: "warning" },
  { label: "后台任务", value: "空闲", tone: "neutral" },
  { label: "应用版本", value: "0.0.10 最新", tone: "ready" }
];

const homeState: HomeStartupState = {
  cards: {
    manifest: {
      label: "可用",
      status: "ready",
      lastUpdated: "6月17日",
      needsUpdate: false
    }
  }
};

const homeDailySummary: HomeDailySummary = {
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

function PrototypeApp() {
  const env = import.meta.env as Record<string, string | undefined>;
  const initialPage = isShellPageKey(env.VITE_D2_VISUAL_PAGE) ? env.VITE_D2_VISUAL_PAGE : "home";
  const initialTheme = env.VITE_D2_VISUAL_THEME === "dark" ? "dark" : "light";
  const platformActions = useMemo(() => ({
    openExternal: (url: string) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    setColorMode: (mode: "light" | "dark") => {
      document.documentElement.dataset.colorMode = mode;
    }
  }), []);

  return (
    <ProductShellHost
      initialPage={initialPage}
      initialPreferences={{
        ...defaultProductPreferences,
        colorMode: initialTheme
      }}
      shellStatus={shellStatus}
      assistantPanel={(
        <section>
          <h2>AI 助手</h2>
          <p>这是 prototype 的 mock 抽屉，后续接入真实页面上下文。</p>
        </section>
      )}
      platformActions={platformActions}
      renderPage={(activePage) => (
        <>
          {activePage === "home" ? (
            <>
              <header className="page-header">
                <div>
                  <h2>今日工作台</h2>
                  <p>先看官方可确认的今日 / 本周内容，再处理商人、账号和仓库提醒。</p>
                </div>
                <button type="button" className="secondary-button">刷新今日信息</button>
              </header>
              <HomePageView
                state={homeState}
                diagnosticRows={[{ tone: "ready" }]}
                hasAccountData
                dailySummary={homeDailySummary}
                onCopyDailySummary={() => undefined}
                onRefreshDiagnostics={() => undefined}
              />
            </>
          ) : null}
          {activePage === "account" ? (
            <AccountPageView />
          ) : null}
          {activePage === "settings" ? (
            <SettingsPageView />
          ) : null}
          {activePage !== "home" && activePage !== "account" && activePage !== "settings" ? (
            <section className="prototype-panel">
              <h1>{activePage} 原型</h1>
              <p>这个页面会在后续阶段接入共享 View。</p>
            </section>
          ) : null}
        </>
      )}
    />
  );
}

createRoot(document.getElementById("root")!).render(<PrototypeApp />);

function isShellPageKey(value: string | undefined): value is ShellPageKey {
  return value === "home"
    || value === "account"
    || value === "vault"
    || value === "loadouts"
    || value === "library"
    || value === "settings";
}
