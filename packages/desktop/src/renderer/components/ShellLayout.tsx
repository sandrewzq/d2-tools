import { useEffect, type ReactNode } from "react";

export type ShellPageKey = "home" | "account" | "vault" | "loadouts" | "library" | "settings";
export type ShellAssistantMode = "ai" | "tasks" | null;

export type ShellNavItem = {
  key: ShellPageKey;
  label: string;
};

export type ShellStatusItem = {
  label: string;
  value: string;
  tone?: "neutral" | "ready" | "warning" | "error";
};

export const navItems: ShellNavItem[] = [
  { key: "home", label: "首页" },
  { key: "account", label: "账号" },
  { key: "vault", label: "仓库" },
  { key: "loadouts", label: "配装" },
  { key: "library", label: "资料库" },
  { key: "settings", label: "设置" }
];

export function ShellLayout(props: {
  activePage: ShellPageKey;
  assistantMode: ShellAssistantMode;
  onNavigate: (page: ShellPageKey) => void;
  onInitializeManifest: () => void;
  onAssistantModeChange: (mode: ShellAssistantMode) => void;
  onColorModeToggle: () => void;
  isInitializingManifest: boolean;
  colorMode: "light" | "dark";
  assistantPanel: ReactNode;
  shellStatus: ShellStatusItem[];
  children: ReactNode;
}) {
  const shellClassName = props.assistantMode ? "app-shell assistant-open" : "app-shell";
  const manifestStatus = props.shellStatus.find((item) => item.label.includes("资料库"));
  const hasManifestUpdateSignal = manifestStatus?.tone === "warning" || manifestStatus?.tone === "error";

  function toggleAssistant(mode: Exclude<ShellAssistantMode, null>) {
    props.onAssistantModeChange(props.assistantMode === mode ? null : mode);
  }

  const themeToggleLabel = props.colorMode === "light" ? "切换为暗色" : "切换为亮色";

  useEffect(() => {
    if (typeof window === "undefined") return;
    void window.d2?.setWindowColorMode?.(props.colorMode);
  }, [props.colorMode]);

  return (
    <main className={shellClassName} data-color-mode={props.colorMode}>
      <header className="shell-titlebar shell-topbar">
        <div className="shell-window-brand">
          <span className="shell-app-mark">D2</span>
          <div>
            <strong>d2-tools</strong>
            <span>Destiny 2 本地助手</span>
          </div>
        </div>
        <div className="shell-status-strip shell-global-status global-shell-status" aria-label="全局状态">
          {props.shellStatus.map((item) => (
            <span
              className={[
                "shell-status-group",
                item.label.includes("账号") ? "shell-account-status" : "",
                `status-${item.tone ?? "neutral"}`
              ].filter(Boolean).join(" ")}
              key={item.label}
            >
              <span className="shell-status-dot" />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </span>
          ))}
        </div>
        <div className="shell-toolstrip" aria-label="全局工具">
          <button
            className="shell-tool-button shell-tool-update"
            type="button"
            title="后台更新资料库"
            aria-label="后台更新资料库"
            disabled={props.isInitializingManifest}
            onClick={props.onInitializeManifest}
          >
            ↧
            {hasManifestUpdateSignal ? <span className="shell-tool-badge" /> : null}
          </button>
          <button
            className={props.colorMode === "dark" ? "shell-tool-button shell-tool-theme active" : "shell-tool-button shell-tool-theme"}
            type="button"
            title={themeToggleLabel}
            aria-label={themeToggleLabel}
            onClick={props.onColorModeToggle}
          >
            {props.colorMode === "light" ? "☾" : "☀"}
          </button>
          <button className="shell-tool-button shell-tool-github" type="button" title="GitHub" aria-label="GitHub" onClick={() => { window.d2.openExternal("https://github.com/sandrewzq/d2-tools").catch(() => {}); }}>
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path d="M8 0.4a7.7 7.7 0 0 0-2.4 15c0.4 0.1 0.5-0.2 0.5-0.4v-1.5c-2.1 0.5-2.6-0.9-2.6-0.9-0.3-0.8-0.8-1-0.8-1-0.7-0.5 0.1-0.5 0.1-0.5 0.8 0.1 1.2 0.8 1.2 0.8 0.7 1.2 1.8 0.9 2.2 0.7 0.1-0.5 0.3-0.9 0.5-1.1-1.7-0.2-3.5-0.8-3.5-3.8 0-0.8 0.3-1.5 0.8-2.1-0.1-0.2-0.3-1 0.1-2 0 0 0.7-0.2 2.2 0.8A7.4 7.4 0 0 1 8 4c0.7 0 1.3 0.1 1.9 0.3 1.5-1 2.2-0.8 2.2-0.8 0.4 1 0.2 1.8 0.1 2 0.5 0.6 0.8 1.3 0.8 2.1 0 2.9-1.8 3.6-3.5 3.8 0.3 0.2 0.5 0.7 0.5 1.4V15c0 0.2 0.1 0.5 0.5 0.4A7.7 7.7 0 0 0 8 0.4Z" />
            </svg>
          </button>
          <button className="shell-tool-button" type="button" title="设置" aria-label="设置" onClick={() => props.onNavigate("settings")}>
            ⚙
          </button>
          <button
            type="button"
            className={props.assistantMode === "ai" ? "shell-tool-button shell-tool-ai active" : "shell-tool-button shell-tool-ai"}
            aria-label="打开 AI 助手抽屉"
            title="AI 助手"
            onClick={() => toggleAssistant("ai")}
          >
            AI
          </button>
        </div>
        <div className="shell-window-controls" aria-label="窗口控制" />
      </header>
      <div className="shell-workspace">
        <aside className="shell-sidebar" aria-label="主导航">
          <nav className="shell-nav">
            {navItems.map((item) => (
              <button
                className={item.key === props.activePage ? "active" : ""}
                key={item.key}
                type="button"
                title={item.label}
                onClick={() => props.onNavigate(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>
        <section className="shell-content">{props.children}</section>
        {props.assistantMode ? (
          <aside className="global-assistant-panel global-assistant-drawer" aria-label="AI 助手抽屉">
            {props.assistantPanel}
          </aside>
        ) : null}
      </div>
    </main>
  );
}
