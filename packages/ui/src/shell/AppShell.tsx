import { useEffect } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import { getLocalizedNavItems } from "./navigation.js";
import type { AppShellLayoutProps, PlatformActions, ShellAssistantMode } from "./types.js";

export type AppShellProps = AppShellLayoutProps & {
  platformActions: PlatformActions;
};

export function AppShell(props: AppShellProps) {
  const shellClassName = props.assistantMode ? "app-shell assistant-open" : "app-shell";
  const interfaceLocale = props.interfaceLocale ?? "zh-CN";
  const copy = getLocaleCopy(interfaceLocale).shell;
  const navItems = getLocalizedNavItems(interfaceLocale);
  const themeToggleLabel = props.colorMode === "light" ? copy.tools.switchToDark : copy.tools.switchToLight;
  const languageToggleLabel = interfaceLocale === "zh-CN" ? copy.tools.switchToEnglish : copy.tools.switchToChinese;

  function toggleAssistant(mode: Exclude<ShellAssistantMode, null>) {
    props.onAssistantModeChange(props.assistantMode === mode ? null : mode);
  }

  useEffect(() => {
    void props.platformActions.setColorMode?.(props.colorMode);
  }, [props.colorMode, props.platformActions]);

  return (
    <main className={shellClassName} data-color-mode={props.colorMode}>
      <header className="shell-titlebar shell-topbar">
        <div className="shell-window-brand">
          <span className="shell-app-mark">D2</span>
          <div>
            <strong>d2-tools</strong>
            <span>{copy.brandSubtitle}</span>
          </div>
        </div>
        <div className="shell-status-strip shell-global-status global-shell-status" aria-label={copy.statusAriaLabel}>
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
        <div className="shell-toolstrip" aria-label={copy.toolstripAriaLabel}>
          <button
            className={props.colorMode === "dark" ? "shell-tool-button shell-tool-theme active" : "shell-tool-button shell-tool-theme"}
            type="button"
            title={themeToggleLabel}
            aria-label={themeToggleLabel}
            onClick={props.onColorModeToggle}
          >
            {props.colorMode === "light" ? "☾" : "☀"}
          </button>
          <button
            className="shell-tool-button shell-tool-locale"
            type="button"
            title={languageToggleLabel}
            aria-label={languageToggleLabel}
            onClick={props.onInterfaceLocaleToggle}
          >
            {copy.tools.languageBadge}
          </button>
          <button
            className="shell-tool-button shell-tool-github"
            type="button"
            title={copy.tools.github}
            aria-label={copy.tools.github}
            onClick={() => void props.platformActions.openExternal("https://github.com/sandrewzq/d2-tools")}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path d="M8 0.4a7.7 7.7 0 0 0-2.4 15c0.4 0.1 0.5-0.2 0.5-0.4v-1.5c-2.1 0.5-2.6-0.9-2.6-0.9-0.3-0.8-0.8-1-0.8-1-0.7-0.5 0.1-0.5 0.1-0.5 0.8 0.1 1.2 0.8 1.2 0.8 0.7 1.2 1.8 0.9 2.2 0.7 0.1-0.5 0.3-0.9 0.5-1.1-1.7-0.2-3.5-0.8-3.5-3.8 0-0.8 0.3-1.5 0.8-2.1-0.1-0.2-0.3-1 0.1-2 0 0 0.7-0.2 2.2 0.8A7.4 7.4 0 0 1 8 4c0.7 0 1.3 0.1 1.9 0.3 1.5-1 2.2-0.8 2.2-0.8 0.4 1 0.2 1.8 0.1 2 0.5 0.6 0.8 1.3 0.8 2.1 0 2.9-1.8 3.6-3.5 3.8 0.3 0.2 0.5 0.7 0.5 1.4V15c0 0.2 0.1 0.5 0.5 0.4A7.7 7.7 0 0 0 8 0.4Z" />
            </svg>
          </button>
          <button className="shell-tool-button" type="button" title={copy.tools.settings} aria-label={copy.tools.settings} onClick={() => props.onNavigate("settings")}>
            ⚙
          </button>
          <button
            type="button"
            className={props.assistantMode === "ai" ? "shell-tool-button shell-tool-ai active" : "shell-tool-button shell-tool-ai"}
            aria-label={copy.tools.openAiAssistant}
            title={copy.tools.aiAssistant}
            onClick={() => toggleAssistant("ai")}
          >
            AI
          </button>
        </div>
        <div className="shell-window-controls" aria-label={copy.windowControlsAriaLabel} />
      </header>
      <div className="shell-workspace">
        <aside className="shell-sidebar" aria-label={copy.navigationAriaLabel}>
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
