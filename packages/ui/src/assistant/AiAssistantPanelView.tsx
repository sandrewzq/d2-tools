import type { AssistantArtifact } from "@d2-tools/app/capabilities";
import type { ShellCopy } from "../i18n/types.js";
import { assistantTemplate, assistantText } from "./assistantCopy.js";

export type AiAssistantMessageView = {
  role: "user" | "assistant";
  text: string;
  context_snapshot_id?: string;
  artifact?: AssistantArtifact;
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
  snapshotState: "current" | "historical" | "unsaved";
  snapshotLabel: string;
};

export type AiAssistantPanelViewProps = {
  copy: ShellCopy["assistant"];
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
  onOpenArtifact: (artifact: AssistantArtifact) => void;
};

export function AiAssistantPanelView(props: AiAssistantPanelViewProps) {
  if (!props.isConfigured) {
    return (
      <section className="tool-panel ai-chat-panel ai-config-panel">
        <div className="section-heading">
          <div>
            <h2>{props.copy.title}</h2>
            <p>{assistantText(props.copy, "还没有配置 AI。先到设置页填写提供商、模型和 API Key，再回来聊天分析。")}</p>
          </div>
          <div className="button-row">
            <button type="button" onClick={props.onConfigureAi}>{assistantText(props.copy, "去设置配置 AI")}</button>
            <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onClose}>{assistantText(props.copy, "关闭")}</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="tool-panel ai-chat-panel">
      <div className="ai-conversation-toolbar" aria-label={assistantText(props.copy, "AI 助手工具")}>
        <div className="ai-conversation-actions">
          <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isSending} onClick={props.onStartNewSession}>
            {assistantText(props.copy, "新会话")}
          </button>
          <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={props.isSending} onClick={props.onToggleSessionDrawer}>
            {assistantText(props.copy, "会话记录")}
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
          {props.context.snapshotState === "historical"
            ? assistantText(props.copy, "已恢复历史快照")
            : props.hasAccountItems
              ? assistantText(props.copy, "已载入当前页面上下文")
              : props.contextChip}
        </button>
      </div>

      <div className="ai-chat-workspace">
        <div className="ai-conversation-log" data-scroll-region="pane" aria-live="polite">
          {props.error ? <p className="status-message status-error">{props.error}</p> : null}
          {!props.hasAccountItems ? (
            <div className="item-detail-inline-status">
              <p>{assistantText(props.copy, "先同步装备数据，AI 才能结合角色、仓库、背包、标签、备注和今日信息分析。历史记录仍可查看和恢复。")}</p>
              <button type="button" disabled={props.isLoadingAccount} onClick={props.onLoadAccount}>
                {props.isLoadingAccount ? assistantText(props.copy, "正在同步装备数据...") : assistantText(props.copy, "同步装备数据")}
              </button>
            </div>
          ) : null}

          {props.messages.length ? props.messages.map((message, index) => (
            <article className={`ai-chat-message message-${message.role}`} key={`${message.role}-${index}`}>
              <strong>{message.role === "user" ? assistantText(props.copy, "你") : assistantText(props.copy, "AI")}</strong>
              <p>{message.text}</p>
              {message.role === "assistant" && message.artifact ? (
                <div className="ai-message-artifact">
                  <div>
                    <strong>{formatArtifactKind(props.copy, message.artifact)}</strong>
                    <span>{message.artifact.title}</span>
                    <small>{message.artifact.kind === "armor_solution_comparison"
                      ? `${formatArmorArtifactMode(props.copy, message.artifact.mode)} · ${formatArmorArtifactOutcome(props.copy, message.artifact.outcome)} · ${assistantTemplate(props.copy, "{reachable}/{total} 个候选达标", { reachable: message.artifact.reachable_candidate_count, total: message.artifact.candidate_count })}`
                      : message.artifact.kind === "equipment_target_candidates"
                        ? assistantTemplate(props.copy, "{owned} 个账号实例 · {defined} 个仅定义目标", {
                          owned: message.artifact.candidates.filter((candidate) => candidate.status === "owned-instance").length,
                          defined: message.artifact.candidates.filter((candidate) => candidate.status === "definition-only").length
                        })
                      : message.artifact.result_ids.length
                        ? assistantTemplate(props.copy, "引用 {count} 个确定性结果", { count: message.artifact.result_ids.length })
                        : assistantText(props.copy, "未引用额外能力结果")}</small>
                  </div>
                  <button
                    type="button"
                    data-ui-kind="button"
                    data-control-variant="secondary"
                    onClick={() => props.onOpenArtifact(message.artifact!)}
                  >
                    {assistantText(props.copy, "交给配装页")}
                  </button>
                </div>
              ) : null}
            </article>
          )) : (
            <>
              <article className="ai-chat-message" data-ui-kind="callout">
                <strong>{assistantText(props.copy, "当前页面上下文已就绪")}</strong>
                <p>{assistantText(props.copy, "可以基于当前页面和已同步装备数据回答；详细上下文可通过顶部状态入口查看。")}</p>
              </article>
              <article className="ai-chat-message ai-chat-ready-message" data-ui-kind="callout">
                <strong>{assistantText(props.copy, "等待提问")}</strong>
                <p>{assistantText(props.copy, "AI 生成内容与事实数据分区展示，不会自动执行写操作。")}</p>
                {props.quickPrompts.length ? (
                  <details className="ai-quick-prompts">
                    <summary>{assistantText(props.copy, "常用问题")}</summary>
                    <div aria-label={assistantText(props.copy, "常用问题")}>
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
          {props.isSending ? <p className="status-message status-pending">{assistantText(props.copy, "AI 正在读取上下文并生成回答...")}</p> : null}
        </div>

        <form className="ai-composer" onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}>
          <textarea
            value={props.question}
            onChange={(event) => props.onQuestionChange(event.target.value)}
            aria-label={assistantText(props.copy, "输入 AI 问题")}
            placeholder={assistantText(props.copy, "询问当前页面或账号数据")}
            rows={3}
          />
          <button type="submit" data-ui-kind="button" data-control-variant="ai" disabled={props.isSending || !props.question.trim()}>
            {props.isSending ? assistantText(props.copy, "发送中...") : assistantText(props.copy, "发送")}
          </button>
        </form>

        {props.isSessionDrawerOpen ? (
          <section className="ai-chat-history ai-session-drawer" data-scroll-region="overlay" aria-label={assistantText(props.copy, "会话列表")}>
            <div className="ai-history-heading">
              <strong>{assistantText(props.copy, "会话列表")}</strong>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!props.history.length} onClick={props.onClearHistory}>
                {assistantText(props.copy, "清空历史")}
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
                        {props.activeSessionId === entry.id ? assistantText(props.copy, "当前") : assistantText(props.copy, "恢复")}
                      </button>
                      <button
                        type="button"
                        data-ui-kind="button" data-control-variant="secondary"
                        disabled={props.isSending || props.activeSessionId === entry.id}
                        onClick={() => props.onDeleteSession(entry.id)}
                      >
                        {assistantText(props.copy, "删除")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{assistantText(props.copy, "还没有历史记录。发送第一条消息后会自动创建会话。")}</p>
            )}
          </section>
        ) : null}

        {props.isContextDrawerOpen ? (
          <section className="ai-context-drawer" data-scroll-region="overlay" aria-label={assistantText(props.copy, "上下文")}>
            <div className="ai-history-heading">
              <strong>{assistantText(props.copy, "上下文")}</strong>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onCloseContextDrawer}>
                {assistantText(props.copy, "收起")}
              </button>
            </div>
            <div className="ai-context-strip">
              <span>{props.copy.currentPage(props.context.pageLabel)}</span>
              <span>{assistantTemplate(props.copy, "仓库 {count} 件", { count: props.context.itemCount })}</span>
              <span>{assistantTemplate(props.copy, "角色 {count} 个", { count: props.context.characterCount })}</span>
              <span>{assistantTemplate(props.copy, "材料 {count} 种", { count: props.context.materialCount })}</span>
              <span>{props.context.dailyLoaded ? assistantText(props.copy, "今日信息已载入") : assistantText(props.copy, "今日信息未载入")}</span>
              <span>{props.context.snapshotLabel}</span>
            </div>
            <div className="ai-page-context">
              <strong>{assistantText(props.copy, "页面分析重点")}</strong>
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

function formatArtifactKind(copy: ShellCopy["assistant"], artifact: AssistantArtifact): string {
  if (artifact.kind === "armor_solution_comparison") return assistantText(copy, "护甲方案对比");
  if (artifact.kind === "equipment_target_candidates") return assistantText(copy, "装备目标候选");
  return assistantText(copy, "配装草稿");
}

function formatArmorArtifactMode(copy: ShellCopy["assistant"], mode: "theoretical" | "owned" | "acquisition" | "upgrade"): string {
  if (mode === "theoretical") return assistantText(copy, "理论上限");
  if (mode === "acquisition") return assistantText(copy, "待刷目标");
  if (mode === "upgrade") return assistantText(copy, "升级路径");
  return assistantText(copy, "库存成装");
}

function formatArmorArtifactOutcome(copy: ShellCopy["assistant"], outcome: "reachable" | "unreachable" | "indeterminate" | "invalid"): string {
  if (outcome === "reachable") return assistantText(copy, "可达");
  if (outcome === "unreachable") return assistantText(copy, "不可达");
  if (outcome === "indeterminate") return assistantText(copy, "未确定");
  return assistantText(copy, "输入无效");
}
