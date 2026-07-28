export type AiAssistantMessageView = {
  role: "user" | "assistant";
  text: string;
};

export type AiAssistantHistoryEntryView = {
  id: string;
  title: string;
  page_label: string;
  messages: AiAssistantMessageView[];
};

export type AiAssistantContextView = {
  pageLabel: string;
  focus: string;
  facts: string[];
  itemCount: number;
  characterCount: number;
  materialCount: number;
  dailyLoaded: boolean;
};

export type AiAssistantPanelViewProps = {
  isConfigured: boolean;
  sessionTitle: string;
  messages: AiAssistantMessageView[];
  question: string;
  error?: string;
  isSending: boolean;
  isLoadingAccount: boolean;
  hasAccountItems: boolean;
  history: AiAssistantHistoryEntryView[];
  activeSessionId?: string | null;
  isSessionDrawerOpen: boolean;
  isContextDrawerOpen: boolean;
  contextChip: string;
  context: AiAssistantContextView;
  quickPrompts: string[];
  onQuestionChange: (value: string) => void;
  onSubmit: () => void;
  onQuickPrompt: (prompt: string) => void;
  onLoadAccount: () => void;
  onConfigureAi: () => void;
  onClose: () => void;
  onStartNewSession: () => void;
  onToggleSessionDrawer: () => void;
  onToggleContextDrawer: () => void;
  onOpenContextDrawer: () => void;
  onCloseContextDrawer: () => void;
  onClearHistory: () => void;
  onSwitchSession: (entry: AiAssistantHistoryEntryView) => void;
  onDeleteSession: (entryId: string) => void;
};

export function AiAssistantPanelView(props: AiAssistantPanelViewProps) {
  if (!props.isConfigured) {
    return (
      <section className="tool-panel ai-chat-panel ai-config-panel">
        <div className="section-heading">
          <div>
            <h2>AI 助手</h2>
            <p>还没有配置 AI。先到设置页填写提供商、模型和 API Key，再回来聊天分析。</p>
          </div>
          <div className="button-row">
            <button type="button" onClick={props.onConfigureAi}>去设置配置 AI</button>
            <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onClose}>关闭</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="tool-panel ai-chat-panel">
      <div className="ai-conversation-toolbar" aria-label="AI 助手工具">
        <div className="ai-conversation-actions">
          <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isSending} onClick={props.onStartNewSession}>
            新会话
          </button>
          <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isSending} onClick={props.onToggleSessionDrawer}>
            会话记录
          </button>
        </div>
        <button
          type="button"
          className="ai-conversation-context"
          data-ui-kind="status-chip"
          aria-expanded={props.isContextDrawerOpen}
          title={props.contextChip}
          onClick={props.onToggleContextDrawer}
        >
          {props.hasAccountItems ? "已载入当前页面上下文" : props.contextChip}
        </button>
      </div>

      <div className="ai-chat-workspace">
        <div className="ai-conversation-log" data-scroll-region="pane" aria-live="polite">
          {props.error ? <p className="status-message status-error">{props.error}</p> : null}
          {!props.hasAccountItems ? (
            <div className="item-detail-inline-status">
              <p>先读取账号数据，AI 才能结合角色、仓库、背包、标签、备注和今日信息分析。历史记录仍可查看和恢复。</p>
              <button type="button" disabled={props.isLoadingAccount} onClick={props.onLoadAccount}>
                {props.isLoadingAccount ? "读取中..." : "读取账号数据"}
              </button>
            </div>
          ) : null}

          {props.messages.length ? props.messages.map((message, index) => (
            <article className={`ai-chat-message message-${message.role}`} key={`${message.role}-${index}`}>
              <strong>{message.role === "user" ? "你" : "AI"}</strong>
              <p>{message.text}</p>
            </article>
          )) : (
            <>
              <article className="ai-chat-message" data-ui-kind="callout">
                <strong>当前页面上下文已就绪</strong>
                <p>可以基于当前页面和已读取账号数据回答；详细上下文可通过顶部状态入口查看。</p>
              </article>
              <article className="ai-chat-message ai-chat-ready-message" data-ui-kind="callout">
                <strong>等待提问</strong>
                <p>AI 生成内容与事实数据分区展示，不会自动执行写操作。</p>
                {props.quickPrompts.length ? (
                  <details className="ai-quick-prompts">
                    <summary>常用问题</summary>
                    <div aria-label="常用问题">
                      {props.quickPrompts.map((prompt) => (
                        <button
                          type="button"
                          data-ui-kind="button" data-control-variant="secondary"
                          key={prompt}
                          disabled={props.isSending}
                          onClick={() => props.onQuickPrompt(prompt)}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </details>
                ) : null}
              </article>
            </>
          )}
          {props.isSending ? <p className="status-message status-pending">AI 正在读取上下文并生成回答...</p> : null}
        </div>

        <form className="ai-composer" onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}>
          <textarea
            value={props.question}
            onChange={(event) => props.onQuestionChange(event.target.value)}
            aria-label="输入 AI 问题"
            placeholder="询问当前页面或账号数据"
            rows={3}
          />
          <button type="submit" data-ui-kind="button" data-control-variant="ai" disabled={props.isSending || !props.question.trim()}>
            {props.isSending ? "发送中..." : "发送"}
          </button>
        </form>

        {props.isSessionDrawerOpen ? (
          <section className="ai-chat-history ai-session-drawer" data-scroll-region="overlay" aria-label="会话列表">
            <div className="ai-history-heading">
              <strong>会话列表</strong>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!props.history.length} onClick={props.onClearHistory}>
                清空历史
              </button>
            </div>
            {props.history.length ? (
              <ul>
                {props.history.map((entry) => (
                  <li className="ai-history-session-row" key={entry.id}>
                    <span>{entry.page_label} · {entry.title}</span>
                    <div className="button-row">
                      <button
                        type="button"
                        data-ui-kind="button" data-control-variant="secondary"
                        disabled={props.isSending || props.activeSessionId === entry.id}
                        onClick={() => props.onSwitchSession(entry)}
                      >
                        {props.activeSessionId === entry.id ? "当前" : "恢复"}
                      </button>
                      <button
                        type="button"
                        data-ui-kind="button" data-control-variant="secondary"
                        disabled={props.isSending || props.activeSessionId === entry.id}
                        onClick={() => props.onDeleteSession(entry.id)}
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

        {props.isContextDrawerOpen ? (
          <section className="ai-context-drawer" data-scroll-region="overlay" aria-label="上下文">
            <div className="ai-history-heading">
              <strong>上下文</strong>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onCloseContextDrawer}>
                收起
              </button>
            </div>
            <div className="ai-context-strip">
              <span>当前页面：{props.context.pageLabel}</span>
              <span>仓库 {props.context.itemCount} 件</span>
              <span>角色 {props.context.characterCount} 个</span>
              <span>材料 {props.context.materialCount} 种</span>
              <span>{props.context.dailyLoaded ? "今日信息已载入" : "今日信息未载入"}</span>
            </div>
            <div className="ai-page-context">
              <strong>页面分析重点</strong>
              <p>{props.context.focus}</p>
              {props.context.facts.length ? (
                <ul>
                  {props.context.facts.map((fact) => (
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
