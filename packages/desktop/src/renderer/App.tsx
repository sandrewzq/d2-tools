import { lazy, Suspense, useEffect, useState } from "react";
import { api, type StartupState } from "./api/client";

const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const WizardPage = lazy(() => import("./pages/WizardPage").then((m) => ({ default: m.WizardPage })));

export function App() {
  const [state, setState] = useState<StartupState | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);

  async function refresh() {
    const nextState = await api.getStartupState();
    setState(nextState);
  }

  async function finishConfiguring() {
    setIsConfiguring(false);
    await refresh();
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (!state) return <main className="page">正在启动 d2-tools...</main>;

  if (isConfiguring) {
    return (
      <Suspense fallback={<main className="page">加载中...</main>}>
        <WizardPage
          canCancel={true}
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
