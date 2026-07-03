import { useEffect, useMemo, useState } from "react";
import { buildAiChatContext } from "@d2-tools/core/ai/chat";
import { sendAssistantMessage } from "@d2-tools/app";
import {
  AiAssistantPanelView,
  type AiAssistantHistoryEntryView,
  type AiAssistantMessageView
} from "@d2-tools/ui";
import type { AccountItemSummary, AccountSummary, ActivityHistorySummary, DailySummary, VaultTags } from "../api/types";
import { services } from "../api/services";
import type { AssistantPageContext } from "../shared/domain/assistant/assistantContext";
import {
  clearAssistantHistory,
  loadAssistantHistory,
  removeAssistantHistoryEntry,
  saveAssistantSession,
  type AssistantHistoryEntry
} from "../utils/assistantHistory";

const quickPrompts = [
  "我现在最应该清理哪些装备？",
  "帮我分析仓库里值得保留的 PVE 武器。",
  "这周我应该优先刷什么？",
  "根据当前账号数据，给我一个配装整理计划。"
];

export function AiAnalysisPanel(props: {
  account: AccountSummary | null;
  daily: DailySummary | null;
  activity: ActivityHistorySummary | null;
  pageContext: AssistantPageContext;
  items: AccountItemSummary[];
  tags: VaultTags;
  onLoadAccount: () => void;
  onConfigureAi: () => void;
  onClose: () => void;
  isLoadingAccount: boolean;
}) {
  const [messages, setMessages] = useState<AiAssistantMessageView[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [history, setHistory] = useState<AssistantHistoryEntry[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSessionDrawerOpen, setIsSessionDrawerOpen] = useState(false);
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);
  const contextFacts = useMemo(() => props.pageContext.facts.slice(0, 4), [props.pageContext]);
  const safeTags = props.tags ?? { items: {} };
  const activeSession = activeSessionId ? history.find((entry) => entry.id === activeSessionId) : undefined;
  const sessionTitle = activeSession?.title ?? (messages.length ? "当前会话" : "新会话");
  const contextChip = [
    `当前页面：${props.pageContext.page_label}`,
    `仓库 ${props.items.length} 件`,
    props.account ? `角色 ${props.account.characters.length} 个` : "账号未读取",
    props.daily ? "今日信息已载入" : "今日信息未载入"
  ].join(" · ");

  useEffect(() => {
    setHistory(loadAssistantHistory());
  }, []);

  async function sendChat(nextQuestion = question) {
    const trimmedQuestion = nextQuestion.trim();
    if (!trimmedQuestion) return;
    const userMessage: AiAssistantMessageView = { role: "user", text: trimmedQuestion };

    setIsSendingChat(true);
    setError("");
    setQuestion("");
    setMessages((current) => [...current, userMessage]);

    try {
      const context = buildAiChatContext({
        account: props.account,
        tags: safeTags,
        daily: props.daily,
        activity: props.activity,
        pageContext: props.pageContext
      });
      const chatState = await sendAssistantMessage(services, {
        question: trimmedQuestion,
        context
      });
      if (chatState.status === "error") {
        throw new Error(chatState.error.message);
      }
      if (chatState.status !== "success") {
        throw new Error("AI 聊天失败");
      }
      const reply = chatState.data.reply;
      const assistantMessage: AiAssistantMessageView = { role: "assistant", text: reply.text };
      setMessages((current) => {
        const nextMessages = [...current, assistantMessage];
        saveSession(trimmedQuestion, nextMessages);
        return nextMessages;
      });
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "AI 聊天失败");
      setQuestion(trimmedQuestion);
    } finally {
      setIsSendingChat(false);
    }
  }

  function saveSession(title: string, nextMessages: AiAssistantMessageView[]) {
    const existingSession = activeSessionId ? history.find((entry) => entry.id === activeSessionId) : undefined;
    const id = activeSessionId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (!activeSessionId) {
      setActiveSessionId(id);
    }
    setHistory(saveAssistantSession(window.localStorage, {
      id,
      title: existingSession?.title ?? title,
      page_label: props.pageContext.page_label,
      messages: nextMessages
    }));
  }

  function startNewSession() {
    setMessages([]);
    setQuestion("");
    setError("");
    setActiveSessionId(null);
    setIsSessionDrawerOpen(false);
    setIsContextDrawerOpen(false);
  }

  function switchSession(entry: AiAssistantHistoryEntryView) {
    setMessages(entry.messages);
    setQuestion("");
    setError("");
    setActiveSessionId(entry.id);
    setIsSessionDrawerOpen(false);
  }

  function clearHistory() {
    setHistory(clearAssistantHistory());
    setMessages([]);
    setQuestion("");
    setError("");
    setActiveSessionId(null);
  }

  function deleteSession(entryId: string) {
    if (entryId === activeSessionId) {
      return;
    }
    setHistory(removeAssistantHistoryEntry(window.localStorage, entryId));
  }

  return (
    <AiAssistantPanelView
      isConfigured
      sessionTitle={sessionTitle}
      messages={messages}
      question={question}
      error={error}
      isSending={isSendingChat}
      isLoadingAccount={props.isLoadingAccount}
      hasAccountItems={props.items.length > 0}
      history={history}
      activeSessionId={activeSessionId}
      isSessionDrawerOpen={isSessionDrawerOpen}
      isContextDrawerOpen={isContextDrawerOpen}
      contextChip={contextChip}
      context={{
        pageLabel: props.pageContext.page_label,
        focus: props.pageContext.focus,
        facts: contextFacts,
        itemCount: props.items.length,
        characterCount: props.account?.characters.length ?? 0,
        materialCount: props.account?.materials.item_count ?? 0,
        dailyLoaded: Boolean(props.daily)
      }}
      quickPrompts={quickPrompts}
      onQuestionChange={setQuestion}
      onSubmit={() => void sendChat()}
      onQuickPrompt={(prompt) => void sendChat(prompt)}
      onLoadAccount={props.onLoadAccount}
      onConfigureAi={props.onConfigureAi}
      onClose={props.onClose}
      onStartNewSession={startNewSession}
      onToggleSessionDrawer={() => {
        setIsSessionDrawerOpen((current) => !current);
        setIsContextDrawerOpen(false);
      }}
      onToggleContextDrawer={() => {
        setIsContextDrawerOpen((current) => !current);
        setIsSessionDrawerOpen(false);
      }}
      onOpenContextDrawer={() => setIsContextDrawerOpen(true)}
      onCloseContextDrawer={() => setIsContextDrawerOpen(false)}
      onClearHistory={clearHistory}
      onSwitchSession={switchSession}
      onDeleteSession={deleteSession}
    />
  );
}
