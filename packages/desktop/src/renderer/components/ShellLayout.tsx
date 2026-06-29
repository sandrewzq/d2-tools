import type { ReactNode } from "react";

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
  onAssistantModeChange: (mode: ShellAssistantMode) => void;
  assistantPanel: ReactNode;
  shellStatus: ShellStatusItem[];
  children: ReactNode;
}) {
  const shellClassName = props.assistantMode ? "app-shell assistant-open" : "app-shell";
  const currentPage = navItems.find((item) => item.key === props.activePage) ?? navItems[0];

  function toggleAssistant(mode: Exclude<ShellAssistantMode, null>) {
    props.onAssistantModeChange(props.assistantMode === mode ? null : mode);
  }

  return (
    <main className={shellClassName}>
      <header className="shell-titlebar">
        <div className="shell-window-brand">
          <span className="shell-app-mark">D2</span>
          <div>
            <strong>d2-tools</strong>
            <span>Destiny 2 本地助手</span>
          </div>
        </div>
        <div className="shell-current-page">
          <span>当前工作区</span>
          <strong>{currentPage.label}</strong>
        </div>
        <div className="shell-status-strip global-shell-status" aria-label="应用状态">
          {props.shellStatus.map((item) => (
            <div className={`global-shell-status-item status-${item.tone ?? "neutral"}`} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </header>
      <div className="shell-workspace">
        <aside className="shell-sidebar" aria-label="主导航">
          <div className="brand-block">
            <span>工作区</span>
          </div>
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
          <div className="global-assistant-rail" aria-label="全局助手">
            <button
              aria-label="AI 助手"
              className={props.assistantMode === "ai" ? "active" : ""}
              title="AI 助手"
              type="button"
              onClick={() => toggleAssistant("ai")}
            >
              AI
            </button>
            <button
              aria-label="任务助手"
              className={props.assistantMode === "tasks" ? "active" : ""}
              title="任务助手"
              type="button"
              onClick={() => toggleAssistant("tasks")}
            >
              任务
            </button>
          </div>
        </aside>
        <section className="shell-content">{props.children}</section>
        {props.assistantMode ? (
          <aside className="global-assistant-panel" aria-label="全局助手侧边栏">
            {props.assistantPanel}
          </aside>
        ) : null}
      </div>
    </main>
  );
}
