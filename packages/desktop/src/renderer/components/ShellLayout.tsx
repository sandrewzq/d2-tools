import type { ReactNode } from "react";

export type ShellPageKey = "home" | "account" | "vault" | "loadouts" | "library" | "settings";
export type ShellAssistantMode = "ai" | "tasks" | null;

export type ShellNavItem = {
  key: ShellPageKey;
  label: string;
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
  children: ReactNode;
}) {
  const shellClassName = props.assistantMode ? "app-shell assistant-open" : "app-shell";

  function toggleAssistant(mode: Exclude<ShellAssistantMode, null>) {
    props.onAssistantModeChange(props.assistantMode === mode ? null : mode);
  }

  return (
    <main className={shellClassName}>
      <aside className="shell-sidebar" aria-label="主导航">
        <div className="brand-block">
          <h1>d2-tools</h1>
          <p>Destiny 2 本地助手</p>
        </div>
        <nav className="shell-nav">
          {navItems.map((item) => (
            <button
              className={item.key === props.activePage ? "active" : ""}
              key={item.key}
              type="button"
              onClick={() => props.onNavigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="global-assistant-rail" aria-label="全局助手">
          <button
            className={props.assistantMode === "ai" ? "active" : ""}
            type="button"
            onClick={() => toggleAssistant("ai")}
          >
            AI 助手
          </button>
          <button
            className={props.assistantMode === "tasks" ? "active" : ""}
            type="button"
            onClick={() => toggleAssistant("tasks")}
          >
            任务助手
          </button>
        </div>
      </aside>
      <section className="shell-content">{props.children}</section>
      {props.assistantMode ? (
        <aside className="global-assistant-panel" aria-label="全局助手侧边栏">
          {props.assistantPanel}
        </aside>
      ) : null}
    </main>
  );
}
