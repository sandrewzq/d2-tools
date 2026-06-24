import { useEffect, useMemo, useState } from "react";
import { buildAiChatContext } from "@d2-tools/core/ai/chat";
import {
  api,
  type AccountItemSummary,
  type AccountSummary,
  type ActivityHistorySummary,
  type DailySummary,
  type VaultTags
} from "../api/client";
import type { AssistantPageContext } from "../shared/domain/assistant/assistantContext";
import {
  clearAssistantHistory,
  loadAssistantHistory,
  saveAssistantSession,
  type AssistantHistoryEntry
} from "../utils/assistantHistory";

type AiChatMessage = {
  role: "user" | "assistant";
  text: string;
};

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
  isLoadingAccount: boolean;
}) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [history, setHistory] = useState<AssistantHistoryEntry[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const contextFacts = useMemo(() => props.pageContext.facts.slice(0, 4), [props.pageContext]);
  const safeTags = props.tags ?? { items: {} };

  useEffect(() => {
    setHistory(loadAssistantHistory());
  }, []);

  async function sendChat(nextQuestion = question) {
    const trimmedQuestion = nextQuestion.trim();
    if (!trimmedQuestion) return;
    const userMessage: AiChatMessage = { role: "user", text: trimmedQuestion };

    setIsSendingChat(true);
    setError("");
    setQuestion("");
    setMessages((current) => [...current, userMessage]);

    try {
      const context = buildAiChatContext({
        account: props.account as never,
        tags: safeTags as never,
        daily: props.daily as never,
        activity: props.activity as never,
        pageContext: props.pageContext
      });
      const reply = await api.sendAiChat({
        question: trimmedQuestion,
        context
      });
      const assistantMessage: AiChatMessage = { role: "assistant", text: reply.text };
      setMessages((current) => {
        const nextMessages = [...current, assistantMessage];
        saveSession(trimmedQuestion, nextMessages);
        return nextMessages;
      });
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "AI 聊天失败");
    } finally {
      setIsSendingChat(false);
    }
  }

  function saveSession(title: string, nextMessages: AiChatMessage[]) {
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
  }

  function switchSession(entry: AssistantHistoryEntry) {
    setMessages(entry.messages);
    setQuestion("");
    setError("");
    setActiveSessionId(entry.id);
  }

  function clearHistory() {
    setHistory(clearAssistantHistory());
    setMessages([]);
    setQuestion("");
    setError("");
    setActiveSessionId(null);
  }

  return (
    <section className="tool-panel ai-chat-panel">
      <div className="section-heading">
        <div>
          <h2>AI 助手</h2>
          <p>像聊天一样提问。AI 会读取当前账号摘要，但不会读取或发送 token、client secret、API Key。</p>
        </div>
        <button type="button" className="secondary-button" disabled={isSendingChat} onClick={startNewSession}>
          新会话
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {!props.items.length ? (
        <div className="item-detail-inline-status">
          <p>先读取账号数据，AI 才能结合角色、仓库、背包、标签、备注和今日信息分析。历史记录仍可查看和恢复。</p>
          <button type="button" disabled={props.isLoadingAccount} onClick={props.onLoadAccount}>
            {props.isLoadingAccount ? "读取中..." : "读取账号数据"}
          </button>
        </div>
      ) : null}

      <div className="ai-chat-workspace">
        <div className="ai-chat-main">
          <div className="ai-chat-log" aria-live="polite">
            {messages.length ? messages.map((message, index) => (
              <article className={`ai-chat-message message-${message.role}`} key={`${message.role}-${index}`}>
                <strong>{message.role === "user" ? "你" : "AI"}</strong>
                <p>{message.text}</p>
              </article>
            )) : (
              <p className="notice">可以直接问“哪些装备可以分解”“这周刷什么”“帮我整理 PVE 配装”。</p>
            )}
            {isSendingChat ? <p className="notice">AI 正在读取上下文并生成回答...</p> : null}
          </div>

          <form className="ai-chat-input" onSubmit={(event) => {
            event.preventDefault();
            void sendChat();
          }}>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="输入你的问题，例如：帮我找出仓库里可以清理的同名装备"
              rows={3}
            />
            <button type="submit" disabled={isSendingChat || !question.trim()}>
              {isSendingChat ? "发送中..." : "发送"}
            </button>
          </form>
        </div>

        <aside className="ai-chat-sidebar">
          <div className="ai-context-strip">
            <span>当前页面：{props.pageContext.page_label}</span>
            <span>仓库 {props.items.length} 件</span>
            <span>角色 {props.account?.characters.length ?? 0} 个</span>
            <span>材料 {props.account?.materials.item_count ?? 0} 种</span>
            <span>{props.daily ? "今日信息已载入" : "今日信息未载入"}</span>
          </div>
          <div className="ai-page-context">
            <strong>页面分析重点</strong>
            <p>{props.pageContext.focus}</p>
            {contextFacts.length ? (
              <ul>
                {contextFacts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="ai-quick-prompts">
            {quickPrompts.map((prompt) => (
              <button
                type="button"
                className="secondary-button"
                key={prompt}
                disabled={isSendingChat}
                onClick={() => void sendChat(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
          <div className="ai-chat-history">
            <div className="ai-history-heading">
              <strong>会话历史</strong>
              <button type="button" className="secondary-button" disabled={!history.length} onClick={clearHistory}>
                清空历史
              </button>
            </div>
            {history.length ? (
              <ul>
                {history.map((entry) => (
                  <li key={entry.id}>
                    <span>{entry.page_label} · {entry.title}</span>
                    <button type="button" className="secondary-button" disabled={isSendingChat || activeSessionId === entry.id} onClick={() => switchSession(entry)}>
                      {activeSessionId === entry.id ? "当前" : "切换"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>本次会话还没有历史记录。</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
