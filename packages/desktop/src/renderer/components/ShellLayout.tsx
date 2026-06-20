import type { ReactNode } from "react";

export type ShellPageKey = "home" | "account" | "vault" | "library" | "ai" | "settings";

export type ShellNavItem = {
  key: ShellPageKey;
  label: string;
};

export const navItems: ShellNavItem[] = [
  { key: "home", label: "首页" },
  { key: "account", label: "账号" },
  { key: "vault", label: "仓库" },
  { key: "library", label: "资料库" },
  { key: "ai", label: "AI 助手" },
  { key: "settings", label: "设置" }
];

export function ShellLayout(props: {
  activePage: ShellPageKey;
  onNavigate: (page: ShellPageKey) => void;
  children: ReactNode;
}) {
  return (
    <main className="app-shell">
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
      </aside>
      <section className="shell-content">{props.children}</section>
    </main>
  );
}
