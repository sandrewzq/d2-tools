import { useEffect, useState } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { ShellCopy } from "../i18n/types.js";
import { getLocalizedNavItems } from "./navigation.js";
import type { AppShellLayoutProps, PlatformActions, ShellAssistantMode, ShellBackgroundTaskItem, ShellPageKey } from "./types.js";

export type AppShellProps = AppShellLayoutProps & {
  platformActions: PlatformActions;
};

export function AppShell(props: AppShellProps) {
  const [isBackgroundTaskDockOpen, setIsBackgroundTaskDockOpen] = useState(false);
  const interfaceLocale = props.interfaceLocale ?? "zh-CN";
  const copy = getLocaleCopy(interfaceLocale).shell;
  const navItems = getLocalizedNavItems(interfaceLocale);
  const themeToggleLabel = props.colorMode === "light" ? copy.tools.switchToDark : copy.tools.switchToLight;
  const languageToggleLabel = interfaceLocale === "zh-CN" ? copy.tools.switchToEnglish : copy.tools.switchToChinese;
  const visibleShellStatus = props.shellStatus.filter((item) => item.key !== "background");
  const activePageLabel = navItems.find((item) => item.key === props.activePage)?.label ?? "";
  const backgroundTasks = props.backgroundTasks ?? [];
  const taskDockState = getBackgroundTaskDockState(backgroundTasks, copy);
  const shellClassName = [
    "app-shell",
    props.assistantMode ? "assistant-open" : "",
    taskDockState ? "has-background-tasks" : ""
  ].filter(Boolean).join(" ");

  function toggleAssistant(mode: Exclude<ShellAssistantMode, null>) {
    props.onAssistantModeChange(props.assistantMode === mode ? null : mode);
  }

  useEffect(() => {
    void props.platformActions.setColorMode?.(props.colorMode);
  }, [props.colorMode, props.platformActions]);

  return (
    <main className={shellClassName} data-color-mode={props.colorMode} data-density={props.density}>
      <header className="shell-titlebar shell-topbar" data-reference-id="shell.topbar" data-shell-role="titlebar">
        <div className="shell-window-brand" data-reference-id="shell.brand">
          <span className="shell-app-mark">D2</span>
          <div>
            <strong>d2-tools</strong>
            <span>{copy.brandSubtitle}</span>
          </div>
        </div>
        <div className="shell-status-strip shell-global-status global-shell-status" data-reference-id="shell.status-strip" aria-label={copy.statusAriaLabel}>
          {visibleShellStatus.map((item) => renderShellStatusItem(item))}
        </div>
        <div className="shell-toolstrip" aria-label={copy.toolstripAriaLabel}>
          <button
            className={props.colorMode === "dark" ? "shell-tool-button shell-tool-theme active" : "shell-tool-button shell-tool-theme"}
            type="button"
            title={themeToggleLabel}
            aria-label={themeToggleLabel}
            onClick={props.onColorModeToggle}
          >
            <ThemeToolIcon colorMode={props.colorMode} />
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
            <SettingsToolIcon />
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
        <div className="shell-window-controls" aria-label={copy.windowControlsAriaLabel}>
          {props.platformActions.windowControls ? (
            <>
              <button
                className="shell-window-control-button window-minimize"
                type="button"
                title={copy.windowControls.minimize}
                aria-label={copy.windowControls.minimize}
                onClick={() => void props.platformActions.windowControls?.minimize()}
              >
                <span aria-hidden="true" className="window-control-icon">－</span>
              </button>
              <button
                className="shell-window-control-button window-toggle-maximize"
                type="button"
                title={copy.windowControls.toggleMaximize}
                aria-label={copy.windowControls.toggleMaximize}
                onClick={() => void props.platformActions.windowControls?.toggleMaximize()}
              >
                <span aria-hidden="true" className="window-control-icon">□</span>
              </button>
              <button
                className="shell-window-control-button window-close"
                type="button"
                title={copy.windowControls.close}
                aria-label={copy.windowControls.close}
                onClick={() => void props.platformActions.windowControls?.close()}
              >
                <span aria-hidden="true" className="window-control-icon">×</span>
              </button>
            </>
          ) : null}
        </div>
      </header>
      <div className="shell-workspace">
        <aside className="shell-sidebar" data-reference-id="shell.sidebar" data-shell-role="sidebar" aria-label={copy.navigationAriaLabel}>
          {props.sidebarHeader ? <div className="shell-sidebar-header">{props.sidebarHeader}</div> : null}
          <nav className="shell-nav">
            {navItems.map((item) => {
              const isActive = item.key === props.activePage;

              return (
                <button
                  className={isActive ? "active" : ""}
                  key={item.key}
                  type="button"
                  title={item.label}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => props.onNavigate(item.key)}
                >
                  <span className="shell-nav-mark" aria-hidden="true"><ShellNavIcon page={item.key} /></span>
                  <span className="shell-nav-label">{item.label}</span>
                </button>
              );
            })}
          </nav>
          {props.sidebarFooter ? <div className="shell-sidebar-footer">{props.sidebarFooter}</div> : null}
        </aside>
        <section className="shell-content" data-reference-id="shell.page-content" data-scroll-region="page">{props.children}</section>
        {props.assistantMode ? (
          <aside className="global-assistant-panel global-assistant-drawer" data-reference-id="shell.assistant" aria-label={copy.assistantPanelAriaLabel}>
            <div className="global-assistant-sidebar">
              <div className="assistant-workspace">
                <header className="assistant-workspace-header">
                  <div>
                    <h2>AI 助手</h2>
                    <p>当前页面：<span>{activePageLabel}</span></p>
                  </div>
                  <button type="button" onClick={() => props.onAssistantModeChange(null)} aria-label="关闭助手">×</button>
                </header>
                <div className="assistant-workspace-body">{props.assistantPanel}</div>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
      {taskDockState ? (
        <section className={`background-task-dock task-${taskDockState.tone}`} data-reference-id="shell.task-dock" aria-label={copy.backgroundTasks.ariaLabel}>
          <button
            type="button"
            className="background-task-dock-button"
            aria-expanded={isBackgroundTaskDockOpen}
            onClick={() => setIsBackgroundTaskDockOpen((current) => !current)}
          >
            <span className="background-task-pulse" aria-hidden="true" />
            <span>{taskDockState.summary}</span>
            <strong>{taskDockState.primaryTitle}</strong>
          </button>
          <div className="background-task-popover" data-scroll-region="overlay" data-open={isBackgroundTaskDockOpen} aria-hidden={!isBackgroundTaskDockOpen}>
            <div className="background-task-popover-header">
              <strong>{copy.backgroundTasks.title}</strong>
              <span>{taskDockState.helper}</span>
            </div>
            <div className="background-task-dock-list">
              {taskDockState.tasks.map((task) => (
                <div className={`background-task-dock-row task-${getBackgroundTaskTone(task)}`} key={getBackgroundTaskKey(task)}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{formatBackgroundTaskStatus(task, copy)}</span>
                  </div>
                  {getBackgroundTaskMessage(task) ? <p>{getBackgroundTaskMessage(task)}</p> : null}
                </div>
              ))}
            </div>
            {props.onOpenBackgroundTasks ? (
              <button type="button" className="secondary-button background-task-open-all" onClick={props.onOpenBackgroundTasks}>
                {copy.backgroundTasks.openAll}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function ShellNavIcon(props: { page: ShellPageKey }) {
  const iconProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  switch (props.page) {
    case "home":
      return <svg {...iconProps}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></svg>;
    case "account":
      return <svg {...iconProps}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
    case "vault":
      return <svg {...iconProps}><path d="M4 7h16v13H4zM3 3h18v4H3z" /><path d="M10 11h4" /></svg>;
    case "loadouts":
      return <svg {...iconProps}><path d="m12 2 9 5-9 5-9-5Z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></svg>;
    case "library":
      return <svg {...iconProps}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></svg>;
    case "vendors":
      return <svg {...iconProps}><path d="M3 9h18l-2-6H5Z" /><path d="M5 9v12h14V9M9 21v-6h6v6" /></svg>;
    case "settings":
      return <svg {...iconProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34A1.7 1.7 0 0 0 14 20.92V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.52-1H3v-4h.08A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8.97 4.6 1.7 1.7 0 0 0 10 3.08V3h4v.08a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.13.62.68 1.05 1.32 1H21v4h-.28c-.64-.05-1.19.38-1.32 1Z" /></svg>;
  }
}

function ThemeToolIcon(props: { colorMode: "light" | "dark" }) {
  if (props.colorMode === "light") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.5 14.4A8.5 8.5 0 0 1 9.6 3.5 8.5 8.5 0 1 0 20.5 14.4Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function SettingsToolIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.52-1H3v-4h.08A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8.97 4.6 1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15.03 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.13.62.68 1.05 1.32 1H21v4h-.28c-.64-.05-1.19.38-1.32 1Z" />
    </svg>
  );
}

function renderShellStatusItem(item: AppShellLayoutProps["shellStatus"][number]) {
  const className = [
    "shell-status-group",
    item.key === "account" ? "shell-account-status" : "",
    item.onAction && item.actionLabel ? "shell-status-action" : "",
    `status-${item.tone ?? "neutral"}`
  ].filter(Boolean).join(" ");
  const accessibilityLabel = `${item.label}：${item.value}`;
  const content = (
    <>
      <ShellStatusIcon statusKey={item.key} />
      <span>{item.label}</span>
      <strong>{item.value}</strong>
    </>
  );

  if (item.onAction && item.actionLabel) {
    return (
      <button className={className} type="button" title={item.actionLabel} aria-label={`${item.actionLabel}：${accessibilityLabel}`} onClick={item.onAction} key={item.label}>
        {content}
      </button>
    );
  }

  return <span className={className} title={accessibilityLabel} aria-label={accessibilityLabel} key={item.label}>{content}</span>;
}

function ShellStatusIcon(props: { statusKey: AppShellLayoutProps["shellStatus"][number]["key"] }) {
  const commonProps = {
    "aria-hidden": true,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  switch (props.statusKey) {
    case "account":
      return <svg className="shell-status-icon" {...commonProps}><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>;
    case "library":
      return <svg className="shell-status-icon" {...commonProps}><ellipse cx="12" cy="5" rx="7" ry="2.5" /><path d="M5 5v7c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5" /><path d="M5 12v7c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-7" /></svg>;
    case "ai":
      return <svg className="shell-status-icon" {...commonProps}><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" /></svg>;
    case "app-version":
      return <svg className="shell-status-icon" {...commonProps}><circle cx="12" cy="12" r="8" /><path d="m8.5 12 2.2 2.2 4.8-4.8" /></svg>;
    case "bungie":
    default:
      return <svg className="shell-status-icon" {...commonProps}><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16" /></svg>;
  }
}

function getBackgroundTaskDockState(tasks: ShellBackgroundTaskItem[], copy: ShellCopy): {
  tone: "active" | "warning" | "error";
  summary: string;
  primaryTitle: string;
  helper: string;
  tasks: ShellBackgroundTaskItem[];
} | null {
  const importantTasks = tasks.filter(isBackgroundTaskActive);

  if (!importantTasks.length) {
    return null;
  }

  const orderedTasks = importantTasks.slice(0, 5);
  const primaryTask = importantTasks[0];
  const activeCount = importantTasks.filter(isBackgroundTaskActive).length;
  const tone = importantTasks.some((task) => task.status === "retrying") ? "warning" : "active";
  const count = importantTasks.length;

  return {
    tone,
    summary: copy.backgroundTasks.itemCount(count),
    primaryTitle: primaryTask?.title ?? copy.backgroundTasks.fallbackTitle,
    helper: activeCount
      ? copy.backgroundTasks.activeSummary(activeCount)
      : copy.backgroundTasks.recentSummary,
    tasks: orderedTasks
  };
}

function isBackgroundTaskActive(task: ShellBackgroundTaskItem): boolean {
  return task.status === "queued" || task.status === "running" || task.status === "retrying";
}

function getBackgroundTaskTone(task: ShellBackgroundTaskItem): "active" | "warning" | "ready" | "error" | "neutral" {
  if (task.status === "failed" || task.status === "blocked") return "error";
  if (task.status === "retrying") return "warning";
  if (task.status === "success" || task.status === "succeeded") return "ready";
  if (task.status === "running" || task.status === "queued") return "active";
  return "neutral";
}

function getBackgroundTaskKey(task: ShellBackgroundTaskItem): string {
  return task.task_id ?? task.id ?? `${task.title}:${task.updated_at ?? task.status}`;
}

function getBackgroundTaskMessage(task: ShellBackgroundTaskItem): string {
  return task.error ?? task.message ?? "";
}

function formatBackgroundTaskStatus(task: ShellBackgroundTaskItem, copy: ShellCopy): string {
  if (task.status === "queued") return copy.backgroundTasks.status.queued;
  if (task.status === "running") return formatProgressLabel(task.progress_percent, copy) ?? copy.backgroundTasks.status.running;
  if (task.status === "retrying") {
    return task.next_retry_at
      ? copy.backgroundTasks.status.retryingAt(formatTaskTime(task.next_retry_at))
      : copy.backgroundTasks.status.retrying;
  }
  if (task.status === "failed") return copy.backgroundTasks.status.failed;
  if (task.status === "blocked") return copy.backgroundTasks.status.blocked;
  if (task.status === "success" || task.status === "succeeded") return copy.backgroundTasks.status.success;
  return copy.backgroundTasks.status.idle;
}

function formatProgressLabel(progress: number | undefined, copy: ShellCopy): string | null {
  if (progress === undefined) return null;
  return copy.backgroundTasks.status.runningProgress(Math.round(progress));
}

function formatTaskTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}
