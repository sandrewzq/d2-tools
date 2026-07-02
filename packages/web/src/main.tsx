import { createRoot } from "react-dom/client";
import { useMemo } from "react";
import {
  defaultProductPreferences,
  HomePageView,
  ProductShellHost,
  type HomeDailySummary,
  type HomeStartupState,
  type ShellStatusItem
} from "@d2-tools/ui";
import "@d2-tools/ui/styles.css";

const shellStatus: ShellStatusItem[] = [
  { label: "Bungie", value: "Web 待接入", tone: "neutral" },
  { label: "账号", value: "未登录", tone: "warning" },
  { label: "资料库", value: "待同步", tone: "neutral" },
  { label: "AI", value: "未配置", tone: "warning" },
  { label: "后台任务", value: "Web", tone: "neutral" },
  { label: "应用版本", value: "0.0.10", tone: "ready" }
];

const homeState: HomeStartupState = {
  cards: {
    manifest: {
      label: "Web 待同步",
      status: "pending",
      lastUpdated: "待同步",
      needsUpdate: true
    }
  }
};

const homeDailySummary: HomeDailySummary = {
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
};

function WebApp() {
  const platformActions = useMemo(() => ({
    openExternal: (url: string) => {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }), []);

  return (
    <ProductShellHost
      initialPage="home"
      initialPreferences={defaultProductPreferences}
      shellStatus={shellStatus}
      assistantPanel={<p>Web AI 助手入口待接入。</p>}
      platformActions={platformActions}
      renderPage={(activePage) => (
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
            accountError={activePage === "home" ? "" : "当前 Web 入口仅接首页"}
            diagnosticRows={[{ tone: "warning" }]}
            dailySummary={homeDailySummary}
            onCopyDailySummary={() => undefined}
            onRefreshDiagnostics={() => undefined}
          />
        </>
      )}
    />
  );
}

createRoot(document.getElementById("root")!).render(<WebApp />);
