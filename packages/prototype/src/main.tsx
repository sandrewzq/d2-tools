import { createRoot } from "react-dom/client";
import { useMemo, useState } from "react";
import {
  AccountPageView,
  defaultProductPreferences,
  HomePageView,
  ProductShellHost,
  SettingsPageView,
  type ShellPageKey,
} from "@d2-tools/ui";
import "@d2-tools/ui/styles.css";
import {
  defaultPrototypeScenarioKey,
  prototypeScenarios,
  type PrototypeScenarioKey
} from "./mock/scenarios";
import "./styles.css";

function PrototypeApp() {
  const env = import.meta.env as Record<string, string | undefined>;
  const initialPage = isShellPageKey(env.VITE_D2_VISUAL_PAGE) ? env.VITE_D2_VISUAL_PAGE : "home";
  const initialTheme = env.VITE_D2_VISUAL_THEME === "dark" ? "dark" : "light";
  const initialScenario = isPrototypeScenarioKey(env.VITE_D2_VISUAL_SCENARIO)
    ? env.VITE_D2_VISUAL_SCENARIO
    : defaultPrototypeScenarioKey;
  const [scenarioKey, setScenarioKey] = useState<PrototypeScenarioKey>(initialScenario);
  const scenario = prototypeScenarios[scenarioKey];
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
      shellStatus={scenario.shellStatus}
      assistantPanel={(
        <section>
          <h2>AI 助手</h2>
          <p>这是 prototype 的 mock 抽屉，后续接入真实页面上下文。</p>
        </section>
      )}
      platformActions={platformActions}
      renderPage={(activePage, preferences) => (
        <>
          <div className="prototype-controls" aria-label="Prototype scenario controls">
            <label>
              <span>状态</span>
              <select value={scenarioKey} onChange={(event) => setScenarioKey(event.target.value as PrototypeScenarioKey)}>
                {Object.values(prototypeScenarios).map((item) => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>
            </label>
            <small>{scenario.description}</small>
          </div>
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
                interfaceLocale={preferences.interfaceLocale}
                state={scenario.homeState}
                diagnosticRows={scenario.diagnosticRows}
                accountError={scenario.accountError}
                hasAccountData={scenario.hasAccountData}
                dailySummary={scenario.homeDailySummary}
                isInitializingManifest={scenario.isInitializingManifest}
                isLoadingDaily={scenario.isLoadingDaily}
                isRefreshingDiagnostics={scenario.isRefreshingDiagnostics}
                onCopyDailySummary={() => undefined}
                onRefreshDiagnostics={() => undefined}
              />
            </>
          ) : null}
          {activePage === "account" ? (
            <AccountPageView interfaceLocale={preferences.interfaceLocale} />
          ) : null}
          {activePage === "settings" ? (
            <SettingsPageView interfaceLocale={preferences.interfaceLocale} />
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

function isPrototypeScenarioKey(value: string | undefined): value is PrototypeScenarioKey {
  return value === "ready"
    || value === "account-missing"
    || value === "manifest-stale"
    || value === "background-running"
    || value === "update-available"
    || value === "ai-unconfigured"
    || value === "account-error"
    || value === "manifest-missing-components";
}
