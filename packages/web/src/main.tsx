import { createRoot } from "react-dom/client";
import { useEffect, useMemo, useState } from "react";
import {
  defaultProductPreferences,
  HomePageView,
  ProductShellHost,
} from "@d2-tools/ui";
import "@d2-tools/ui/styles.css";
import {
  createWebShellAdapter,
  fallbackHomeSnapshot,
  type WebHomeSnapshot
} from "./webAdapter";

function WebApp() {
  const adapter = useMemo(() => createWebShellAdapter(), []);
  const [snapshot, setSnapshot] = useState<WebHomeSnapshot>(fallbackHomeSnapshot);
  const platformActions = useMemo(() => ({
    openExternal: adapter.openExternal
  }), [adapter]);

  useEffect(() => {
    let isMounted = true;
    void adapter.loadHomeSnapshot().then((nextSnapshot) => {
      if (isMounted) {
        setSnapshot(nextSnapshot);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [adapter]);

  return (
    <ProductShellHost
      initialPage="home"
      initialPreferences={defaultProductPreferences}
      shellStatus={snapshot.shellStatus}
      assistantPanel={<p>Web AI 助手入口待接入。</p>}
      platformActions={platformActions}
      renderPage={(activePage, preferences) => (
        <>
          <header className="page-header">
            <div>
              <h2>今日工作台</h2>
              <p>先看官方可确认的今日 / 本周内容，再处理商人、账号和仓库提醒。</p>
            </div>
            <button type="button" className="secondary-button">刷新今日信息</button>
          </header>
          <HomePageView
            interfaceLocale={preferences.interfaceLocale}
            state={snapshot.homeState}
            accountError={activePage === "home" ? "" : "当前 Web 入口仅接首页"}
            diagnosticRows={[{ tone: "warning" }]}
            dailySummary={snapshot.homeDailySummary}
            onCopyDailySummary={() => undefined}
            onRefreshDiagnostics={() => undefined}
          />
        </>
      )}
    />
  );
}

createRoot(document.getElementById("root")!).render(<WebApp />);
