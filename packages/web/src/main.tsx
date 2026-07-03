import { createRoot } from "react-dom/client";
import { useEffect, useMemo, useState } from "react";
import {
  AiAssistantPanelView,
  defaultProductPreferences,
  HomePageView,
  ProductShellHost,
  type AiAssistantMessageView,
  type ShellAssistantMode
} from "@d2-tools/ui";
import "@d2-tools/ui/styles.css";
import {
  createWebShellAdapter,
  fallbackHomeSnapshot,
  type WebHomeSnapshot
} from "./webAdapter";

function WebApp() {
  const env = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env) ?? {};
  const initialTheme = env.VITE_D2_VISUAL_THEME === "dark" ? "dark" : "light";
  const adapter = useMemo(() => createWebShellAdapter(), []);
  const [snapshot, setSnapshot] = useState<WebHomeSnapshot>(fallbackHomeSnapshot);
  const [assistantMode, setAssistantMode] = useState<ShellAssistantMode>(null);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<AiAssistantMessageView[]>(() => [
    {
      role: "assistant",
      text: "Web 入口已接入共享 AI 助手界面。当前使用首页 snapshot 作为上下文，后续由 Web provider 提供真实账号和 AI 服务。"
    }
  ]);
  const [isAssistantSessionDrawerOpen, setIsAssistantSessionDrawerOpen] = useState(false);
  const [isAssistantContextDrawerOpen, setIsAssistantContextDrawerOpen] = useState(false);
  const platformActions = useMemo(() => ({
    openExternal: adapter.openExternal
  }), [adapter]);
  const hasAccountData = snapshot.shellStatus.some((item) => item.key === "account" && item.tone === "ready");
  const assistantContext = useMemo(() => ({
    pageLabel: "首页工作台",
    focus: "先看官方可确认的今日 / 本周内容，再处理账号、资料库、应用版本和后台任务状态。",
    facts: snapshot.shellStatus.map((item) => `${item.label}：${item.value}`),
    itemCount: 496,
    characterCount: hasAccountData ? 2 : 0,
    materialCount: 28,
    dailyLoaded: true
  }), [hasAccountData, snapshot.shellStatus]);

  function appendAssistantReply(prompt: string) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setAssistantMessages((current) => [
      ...current,
      { role: "user", text: trimmedPrompt },
      {
        role: "assistant",
        text: "这是 Web adapter 的 mock 回复：当前页面使用共享 AI 助手 View，真实回答会在 Web provider 接入账号和 AI 服务后替换。"
      }
    ]);
    setAssistantQuestion("");
  }

  useEffect(() => {
    let isMounted = true;
    void adapter.loadHomeSnapshot().then((nextSnapshot) => {
      if (isMounted) {
        setSnapshot(nextSnapshot);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [adapter]);

  return (
    <ProductShellHost
      initialPage="home"
      initialPreferences={{
        ...defaultProductPreferences,
        colorMode: initialTheme
      }}
      assistantMode={assistantMode}
      onAssistantModeChange={setAssistantMode}
      shellStatus={snapshot.shellStatus}
      assistantPanel={(
        <AiAssistantPanelView
          isConfigured
          sessionTitle="Web mock 会话"
          messages={assistantMessages}
          question={assistantQuestion}
          isSending={false}
          isLoadingAccount={false}
          hasAccountItems={hasAccountData}
          history={[]}
          activeSessionId={null}
          isSessionDrawerOpen={isAssistantSessionDrawerOpen}
          isContextDrawerOpen={isAssistantContextDrawerOpen}
          contextChip={[
            `当前页面：${assistantContext.pageLabel}`,
            `仓库 ${assistantContext.itemCount} 件`,
            `角色 ${assistantContext.characterCount} 个`,
            assistantContext.dailyLoaded ? "今日信息已载入" : "今日信息未载入"
          ].join(" · ")}
          context={assistantContext}
          quickPrompts={["今天先刷什么", "仓库清理建议", "资料库状态怎么处理", "首页哪些状态需要优先看"]}
          onQuestionChange={setAssistantQuestion}
          onSubmit={() => appendAssistantReply(assistantQuestion)}
          onQuickPrompt={appendAssistantReply}
          onLoadAccount={() => undefined}
          onConfigureAi={() => undefined}
          onClose={() => setAssistantMode(null)}
          onStartNewSession={() => {
            setAssistantMessages([]);
            setAssistantQuestion("");
            setIsAssistantSessionDrawerOpen(false);
            setIsAssistantContextDrawerOpen(false);
          }}
          onToggleSessionDrawer={() => {
            setIsAssistantSessionDrawerOpen((current) => !current);
            setIsAssistantContextDrawerOpen(false);
          }}
          onToggleContextDrawer={() => {
            setIsAssistantContextDrawerOpen((current) => !current);
            setIsAssistantSessionDrawerOpen(false);
          }}
          onOpenContextDrawer={() => setIsAssistantContextDrawerOpen(true)}
          onCloseContextDrawer={() => setIsAssistantContextDrawerOpen(false)}
          onClearHistory={() => undefined}
          onSwitchSession={() => undefined}
          onDeleteSession={() => undefined}
        />
      )}
      platformActions={platformActions}
      renderPage={(activePage, preferences) => (
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
            state={snapshot.homeState}
            accountError={activePage === "home" ? "" : "当前 Web 入口仅接首页"}
            diagnosticRows={[{ tone: "warning" }]}
            dailySummary={snapshot.homeDailySummary}
            onCopyDailySummary={() => undefined}
            onRefreshDiagnostics={() => undefined}
          />
        </>
      )}
    />
  );
}

createRoot(document.getElementById("root")!).render(<WebApp />);
