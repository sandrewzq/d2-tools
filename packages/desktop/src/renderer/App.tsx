import { useEffect, useState } from "react";
import { api, type StartupState } from "./api/client";
import { HomePage } from "./pages/HomePage";
import { WizardPage } from "./pages/WizardPage";

export function App() {
  const [state, setState] = useState<StartupState | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);

  async function refresh() {
    setState(await api.getStartupState());
  }

  async function finishConfiguring() {
    setIsConfiguring(false);
    await refresh();
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (!state) return <main className="page">正在启动 d2-service...</main>;

  if (state.nextStep === "bungie-config" || isConfiguring) {
    return (
      <WizardPage
        canCancel={state.nextStep !== "bungie-config"}
        onCancel={() => setIsConfiguring(false)}
        onSaved={() => void finishConfiguring()}
      />
    );
  }

  return (
    <HomePage
      state={state}
      onConfigure={() => setIsConfiguring(true)}
      onLoginComplete={() => void refresh()}
      onManifestInitialized={() => void refresh()}
    />
  );
}
