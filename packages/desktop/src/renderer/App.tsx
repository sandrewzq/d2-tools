import { lazy, Suspense, useEffect, useState } from "react";
import { api, type StartupState } from "./api/client";

const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const WizardPage = lazy(() => import("./pages/WizardPage").then((m) => ({ default: m.WizardPage })));

export function App() {
  const [state, setState] = useState<StartupState | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);

  async function refresh() {
    // #region debug-point A:renderer-refresh-start
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "startup-stuck", runId: "pre-fix", hypothesisId: "A", location: "App.tsx:refresh:start", msg: "[DEBUG] renderer refresh start", data: { hasWindowD2: typeof window !== "undefined" && !!window.d2, hasGetStartupState: typeof window !== "undefined" && !!window.d2?.getStartupState }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    try {
      const nextState = await api.getStartupState();
      // #region debug-point A:renderer-refresh-success
      fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "startup-stuck", runId: "pre-fix", hypothesisId: "A", location: "App.tsx:refresh:success", msg: "[DEBUG] renderer refresh success", data: { nextStep: nextState?.nextStep ?? null }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      setState(nextState);
    } catch (error) {
      // #region debug-point E:renderer-refresh-error
      fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "startup-stuck", runId: "pre-fix", hypothesisId: "E", location: "App.tsx:refresh:error", msg: "[DEBUG] renderer refresh error", data: { error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error) }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      throw error;
    }
  }

  async function finishConfiguring() {
    setIsConfiguring(false);
    await refresh();
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (!state) return <main className="page">正在启动 d2-tools...</main>;

  if (state.nextStep === "bungie-config" || isConfiguring) {
    return (
      <Suspense fallback={<main className="page">加载中...</main>}>
        <WizardPage
          canCancel={state.nextStep !== "bungie-config"}
          onCancel={() => setIsConfiguring(false)}
          onSaved={() => void finishConfiguring()}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<main className="page">加载中...</main>}>
      <HomePage
        state={state}
        onConfigure={() => setIsConfiguring(true)}
        onConfigChanged={() => void refresh()}
        onLoginComplete={() => void refresh()}
        onManifestInitialized={() => void refresh()}
      />
    </Suspense>
  );
}
