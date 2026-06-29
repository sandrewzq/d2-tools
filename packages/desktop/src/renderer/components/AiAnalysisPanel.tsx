import { useEffect, useMemo, useState } from "react";
import { buildAiChatContext } from "@d2-tools/core/ai/chat";
import { sendAssistantMessage } from "@d2-tools/app";
import {
  type AccountItemSummary,
  type AccountSummary,
  type ActivityHistorySummary,
  type DailySummary,
  type VaultTags
} from "../api/client";
import { services } from "../api/services";
import type { AssistantPageContext } from "../shared/domain/assistant/assistantContext";
import {
  clearAssistantHistory,
  loadAssistantHistory,
  removeAssistantHistoryEntry,
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
  onConfigureAi: () => void;
  onClose: () => void;
  isLoadingAccount: boolean;
}) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
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
    const userMessage: AiChatMessage = { role: "user", text: trimmedQuestion };

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
      const assistantMessage: AiChatMessage = { role: "assistant", text: reply.text };
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
    setIsSessionDrawerOpen(false);
    setIsContextDrawerOpen(false);
  }

  function switchSession(entry: AssistantHistoryEntry) {
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
    <section className="tool-panel ai-chat-panel">
      <header className="ai-conversation-header">
        <div>
          <h2>AI 助手</h2>
          <p>{sessionTitle}</p>
        </div>
        <div className="ai-conversation-actions">
          <button type="button" className="secondary-button" disabled={isSendingChat} onClick={startNewSession}>
            新会话
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={isSendingChat}
            onClick={() => {
              setIsSessionDrawerOpen((current) => !current);
              setIsContextDrawerOpen(false);
            }}
          >
            会话列表
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setIsContextDrawerOpen((current) => !current);
              setIsSessionDrawerOpen(false);
            }}
          >
            上下文
          </button>
          <button type="button" className="secondary-button" onClick={props.onConfigureAi}>
            设置
          </button>
          <button type="button" className="secondary-button" onClick={props.onClose}>
            关闭
          </button>
        </div>
      </header>

      <div className="ai-chat-workspace">
        <div className="ai-conversation-log" aria-live="polite">
          {error ? <p className="status-message status-error">{error}</p> : null}
          {!props.items.length ? (
            <div className="item-detail-inline-status">
              <p>先读取账号数据，AI 才能结合角色、仓库、背包、标签、备注和今日信息分析。历史记录仍可查看和恢复。</p>
              <button type="button" disabled={props.isLoadingAccount} onClick={props.onLoadAccount}>
                {props.isLoadingAccount ? "读取中..." : "读取账号数据"}
              </button>
            </div>
          ) : null}

          {messages.length ? messages.map((message, index) => (
            <article className={`ai-chat-message message-${message.role}`} key={`${message.role}-${index}`}>
              <strong>{message.role === "user" ? "你" : "AI"}</strong>
              <p>{message.text}</p>
            </article>
          )) : (
            <div className="ai-empty-state">
              <strong>可以直接问当前页面里的问题</strong>
              <p>例如装备清理、仓库筛选、配装缺口、今日优先级。上下文和历史都在顶部按钮里，不会挤占对话区。</p>
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
            </div>
          )}
          {isSendingChat ? <p className="status-message status-pending">AI 正在读取上下文并生成回答...</p> : null}
        </div>

        <form className="ai-composer" onSubmit={(event) => {
          event.preventDefault();
          void sendChat();
        }}>
          <span className="ai-composer-context">{contextChip}</span>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="输入你的问题，例如：帮我找出仓库里可以清理的同名装备"
            rows={3}
          />
          <div className="ai-composer-actions">
            <button type="button" className="secondary-button" onClick={() => setIsContextDrawerOpen(true)}>
              查看上下文
            </button>
            <button type="submit" disabled={isSendingChat || !question.trim()}>
              {isSendingChat ? "发送中..." : "发送"}
            </button>
          </div>
        </form>

        {isSessionDrawerOpen ? (
          <section className="ai-chat-history ai-session-drawer" aria-label="会话列表">
            <div className="ai-history-heading">
              <strong>会话列表</strong>
              <button type="button" className="secondary-button" disabled={!history.length} onClick={clearHistory}>
                清空历史
              </button>
            </div>
            {history.length ? (
              <ul>
                {history.map((entry) => (
                  <li className="ai-history-session-row" key={entry.id}>
                    <span>{entry.page_label} · {entry.title}</span>
                    <div className="button-row">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={isSendingChat || activeSessionId === entry.id}
                        onClick={() => switchSession(entry)}
                      >
                        {activeSessionId === entry.id ? "当前" : "恢复"}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={isSendingChat || activeSessionId === entry.id}
                        onClick={() => deleteSession(entry.id)}
                      >
                        删除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>还没有历史记录。发送第一条消息后会自动创建会话。</p>
            )}
          </section>
        ) : null}

        {isContextDrawerOpen ? (
          <section className="ai-context-drawer" aria-label="上下文">
            <div className="ai-history-heading">
              <strong>上下文</strong>
              <button type="button" className="secondary-button" onClick={() => setIsContextDrawerOpen(false)}>
                收起
              </button>
            </div>
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
          </section>
        ) : null}
      </div>
    </section>
  );
}
