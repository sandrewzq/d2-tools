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
            <button type="button" className="secondary-button" onClick={props.onClose}>关闭</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="tool-panel ai-chat-panel">
      <header className="ai-conversation-header">
        <div>
          <h2>AI 助手</h2>
          <p>{props.sessionTitle}</p>
        </div>
        <button type="button" className="secondary-button ai-drawer-close" onClick={props.onClose}>
          关闭
        </button>
      </header>

      <div className="ai-conversation-toolbar" aria-label="AI 助手工具">
        <div className="ai-conversation-actions">
          <button type="button" className="secondary-button" disabled={props.isSending} onClick={props.onStartNewSession}>
            新会话
          </button>
          <button type="button" className="secondary-button" disabled={props.isSending} onClick={props.onToggleSessionDrawer}>
            会话列表
          </button>
          <button type="button" className="secondary-button" onClick={props.onToggleContextDrawer}>
            上下文
          </button>
          <button type="button" className="secondary-button" onClick={props.onConfigureAi}>
            设置
          </button>
        </div>
      </div>

      <div className="ai-chat-workspace">
        <div className="ai-conversation-log" aria-live="polite">
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
            <div className="ai-empty-state">
              <strong>可以直接问当前页面里的问题</strong>
              <p>例如装备清理、仓库筛选、配装缺口、今日优先级。上下文和历史都在顶部按钮里，不会挤占对话区。</p>
              <div className="ai-quick-prompts">
                {props.quickPrompts.map((prompt) => (
                  <button
                    type="button"
                    className="secondary-button"
                    key={prompt}
                    disabled={props.isSending}
                    onClick={() => props.onQuickPrompt(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          {props.isSending ? <p className="status-message status-pending">AI 正在读取上下文并生成回答...</p> : null}
        </div>

        <form className="ai-composer" onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}>
          <span className="ai-composer-context">{props.contextChip}</span>
          <textarea
            value={props.question}
            onChange={(event) => props.onQuestionChange(event.target.value)}
            placeholder="输入你的问题，例如：帮我找出仓库里可以清理的同名装备"
            rows={3}
          />
          <div className="ai-composer-actions">
            <button type="button" className="secondary-button" onClick={props.onOpenContextDrawer}>
              查看上下文
            </button>
            <button type="submit" disabled={props.isSending || !props.question.trim()}>
              {props.isSending ? "发送中..." : "发送"}
            </button>
          </div>
        </form>

        {props.isSessionDrawerOpen ? (
          <section className="ai-chat-history ai-session-drawer" aria-label="会话列表">
            <div className="ai-history-heading">
              <strong>会话列表</strong>
              <button type="button" className="secondary-button" disabled={!props.history.length} onClick={props.onClearHistory}>
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
                        className="secondary-button"
                        disabled={props.isSending || props.activeSessionId === entry.id}
                        onClick={() => props.onSwitchSession(entry)}
                      >
                        {props.activeSessionId === entry.id ? "当前" : "恢复"}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
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
          <section className="ai-context-drawer" aria-label="上下文">
            <div className="ai-history-heading">
              <strong>上下文</strong>
              <button type="button" className="secondary-button" onClick={props.onCloseContextDrawer}>
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
