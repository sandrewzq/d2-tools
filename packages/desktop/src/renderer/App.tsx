import { lazy, Suspense, useEffect, useState } from "react";
import { getLocaleCopy, shellTemplate, shellText, type InterfaceLocale } from "@d2-tools/ui";
import { api } from "./api/client";
import type { StartupState } from "./api/types";

const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));

export function App() {
  const [state, setState] = useState<StartupState | null>(null);
  const [startupError, setStartupError] = useState("");
  // 启动画面在 `startup:get` 返回前就要出字，那之前拿不到 languagePreferences，所以单独早读一次配置。
  const [interfaceLocale, setInterfaceLocale] = useState<InterfaceLocale>("zh-CN");

  useEffect(() => {
    void api.getConfig()
      .then((config) => setInterfaceLocale(config.features.interface_locale))
      .catch(() => undefined);
  }, []);

  const copy = getLocaleCopy(interfaceLocale).shell;

  async function refresh() {
    try {
      setStartupError("");
      const nextState = await api.getStartupState();
      setState(nextState);
      setInterfaceLocale(nextState.languagePreferences.interfaceLocale);
    } catch (error) {
      setStartupError(error instanceof Error ? error.message : shellText(copy, "启动状态读取失败"));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (!state && startupError) {
    return (
      <main className="page">
        <p className="status-message status-error">{shellTemplate(copy, "启动状态读取失败：{error}", { error: startupError })}</p>
        <button type="button" data-ui-kind="button" data-control-variant="primary" onClick={() => void refresh()}>
          {shellText(copy, "重试启动检查")}
        </button>
      </main>
    );
  }

  if (!state) return <main className="page">{shellTemplate(copy, "正在启动 {brand}...", { brand: "d2-tools" })}</main>;

  return (
    <Suspense fallback={<main className="page">{shellText(copy, "加载中...")}</main>}>
      <HomePage
        state={state}
        onConfigChanged={() => void refresh()}
        onLoginComplete={() => void refresh()}
        onManifestInitialized={() => void refresh()}
      />
    </Suspense>
  );
}
