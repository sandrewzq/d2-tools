import { useEffect, useState } from "react";
import { getLocaleCopy } from "../i18n/copy.js";
import type { ShellCopy } from "../i18n/types.js";
import { getLocalizedNavItems } from "./navigation.js";
import type { AppShellLayoutProps, PlatformActions, ShellAssistantMode, ShellBackgroundTaskItem } from "./types.js";

export type AppShellProps = AppShellLayoutProps & {
  platformActions: PlatformActions;
};

export function AppShell(props: AppShellProps) {
  const [isBackgroundTaskDockOpen, setIsBackgroundTaskDockOpen] = useState(false);
  const shellClassName = props.assistantMode ? "app-shell assistant-open" : "app-shell";
  const interfaceLocale = props.interfaceLocale ?? "zh-CN";
  const copy = getLocaleCopy(interfaceLocale).shell;
  const navItems = getLocalizedNavItems(interfaceLocale);
  const themeToggleLabel = props.colorMode === "light" ? copy.tools.switchToDark : copy.tools.switchToLight;
  const languageToggleLabel = interfaceLocale === "zh-CN" ? copy.tools.switchToEnglish : copy.tools.switchToChinese;
  const visibleShellStatus = props.shellStatus.filter((item) => item.key !== "background");
  const backgroundTasks = props.backgroundTasks ?? [];
  const taskDockState = getBackgroundTaskDockState(backgroundTasks, copy);

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
                <span aria-hidden="true" className="window-control-icon">-</span>
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
          <aside className="global-assistant-panel global-assistant-drawer" aria-label={copy.assistantPanelAriaLabel}>
            <div className="global-assistant-sidebar">
              {props.assistantPanel}
            </div>
          </aside>
        ) : null}
      </div>
      {taskDockState ? (
        <section className={`background-task-dock task-${taskDockState.tone}`} aria-label={copy.backgroundTasks.ariaLabel}>
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
          <div className="background-task-popover" data-open={isBackgroundTaskDockOpen} aria-hidden={!isBackgroundTaskDockOpen}>
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

function renderShellStatusItem(item: AppShellLayoutProps["shellStatus"][number]) {
  const className = [
    "shell-status-group",
    item.key === "account" ? "shell-account-status" : "",
    item.onAction && item.actionLabel ? "shell-status-action" : "",
    `status-${item.tone ?? "neutral"}`
  ].filter(Boolean).join(" ");
  const content = (
    <>
      <span className="shell-status-dot" />
      <span>{item.label}</span>
      <strong>{item.value}</strong>
    </>
  );

  if (item.onAction && item.actionLabel) {
    return (
      <button className={className} type="button" title={item.actionLabel} aria-label={item.actionLabel} onClick={item.onAction} key={item.label}>
        {content}
      </button>
    );
  }

  return <span className={className} key={item.label}>{content}</span>;
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

  const orderedTasks = [
    ...importantTasks,
    ...tasks.filter((task) => !importantTasks.includes(task))
  ].slice(0, 5);
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
