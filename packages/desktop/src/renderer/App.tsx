import { useEffect, useState } from "react";
import { api, type StartupState } from "./api/client";
import { HomePage } from "./pages/HomePage";
import { WizardPage } from "./pages/WizardPage";

export function App() {
  const [state, setState] = useState<StartupState | null>(null);

  async function refresh() {
    setState(await api.getStartupState());
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (!state) return <main className="page">正在启动 d2-service...</main>;

  if (state.nextStep === "bungie-config") {
    return <WizardPage onSaved={() => void refresh()} />;
  }

  return (
    <HomePage
      state={state}
      onLoginComplete={() => void refresh()}
      onManifestInitialized={() => void refresh()}
    />
  );
}
