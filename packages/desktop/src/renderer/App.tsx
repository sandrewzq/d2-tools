import { lazy, Suspense, useEffect, useState } from "react";
import { api } from "./api/client";
import type { StartupState } from "./api/types";

const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));

export function App() {
  const [state, setState] = useState<StartupState | null>(null);
  const [startupError, setStartupError] = useState("");

  async function refresh() {
    try {
      setStartupError("");
      const nextState = await api.getStartupState();
      setState(nextState);
    } catch (error) {
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
