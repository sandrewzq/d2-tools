import { lazy, Suspense, useEffect, useState } from "react";
import { api } from "./api/client";
import type { StartupState } from "./api/types";

const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));

export function App() {
  const [state, setState] = useState<StartupState | null>(null);
  const [startupError, setStartupError] = useState("");

  async function refresh() {
    // #region debug-point A:startup-refresh
    void fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "desktop-first-load-stall", runId: "pre-fix", hypothesisId: "A", location: "App.tsx:refresh", msg: "[DEBUG] startup refresh entered", data: { hasD2: Boolean(window.d2) }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    try {
      setStartupError("");
      const nextState = await api.getStartupState();
      // #region debug-point A:startup-resolved
      void fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "desktop-first-load-stall", runId: "pre-fix", hypothesisId: "A", location: "App.tsx:refresh", msg: "[DEBUG] startup state resolved", data: {}, ts: Date.now() }) }).catch(() => {});
      // #endregion
      setState(nextState);
    } catch (error) {
      // #region debug-point C:startup-error
      void fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "desktop-first-load-stall", runId: "pre-fix", hypothesisId: "C", location: "App.tsx:refresh", msg: "[DEBUG] startup state rejected", data: { error: error instanceof Error ? error.message : String(error) }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      setStartupError(error instanceof Error ? error.message : "启动状态读取失败");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (!state && startupError) {
    return (
      <main className="page">
        <p className="status-message status-error">启动状态读取失败：{startupError}</p>
        <button type="button" data-ui-kind="button" data-control-variant="primary" onClick={() => void refresh()}>
          重试启动检查
        </button>
      </main>
    );
  }

  if (!state) return <main className="page">正在启动 d2-tools...</main>;

  return (
    <Suspense fallback={<main className="page">加载中...</main>}>
      <HomePage
        state={state}
        onConfigChanged={() => void refresh()}
        onLoginComplete={() => void refresh()}
        onManifestInitialized={() => void refresh()}
      />
    </Suspense>
  );
}
