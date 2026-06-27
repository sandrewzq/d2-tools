import { useEffect, useMemo, useState } from "react";
import type {
  AccountSummary,
  AccountItemSummary,
  ActivityHistorySummary,
  DailySummary,
  VaultTags
} from "../api/client";
import { collectAccountItems } from "../utils/accountItems";
import { AiPage } from "../features/ai/AiPage";
import type { AssistantPageContext } from "../shared/domain/assistant/assistantContext";
import { buildAssistantTaskContext } from "../shared/domain/assistant/assistantTaskContext";
import type { ShellAssistantMode, ShellPageKey } from "./ShellLayout";

const pageLabels: Record<ShellPageKey, string> = {
  home: "首页",
  account: "账号",
  vault: "仓库",
  loadouts: "配装",
  library: "资料库",
  settings: "设置"
};

const taskContextStorageKey = "d2-tools.assistant.task-context";

export function GlobalAssistantSidebar(props: {
  assistantMode: ShellAssistantMode;
  activePage: ShellPageKey;
  isConfigured: boolean;
  account: AccountSummary | null;
  daily: DailySummary | null;
  activity: ActivityHistorySummary | null;
  pageContext: AssistantPageContext;
  tags: VaultTags;
  isLoadingAccount: boolean;
  onLoadAccount: () => void;
  onConfigureAi: () => void;
  onClose: () => void;
}) {
  if (props.assistantMode === "ai") {
    return (
      <div className="global-assistant-sidebar">
        <AiPage
          isConfigured={props.isConfigured}
          account={props.account}
          daily={props.daily}
          activity={props.activity}
          pageContext={props.pageContext}
          tags={props.tags}
          isLoadingAccount={props.isLoadingAccount}
          onLoadAccount={props.onLoadAccount}
          onConfigureAi={props.onConfigureAi}
          onClose={props.onClose}
        />
      </div>
    );
  }

  if (props.assistantMode === "tasks") {
    return (
      <div className="global-assistant-sidebar">
        <AssistantHeader title="任务助手" subtitle="任务文本、攻略和关联装备先在这里组织，不占用首页主体。" onClose={props.onClose} />
        <TaskAssistantPanel
          activePage={props.activePage}
          account={props.account}
          pageContext={props.pageContext}
        />
      </div>
    );
  }

  return null;
}

function TaskAssistantPanel(props: {
  activePage: ShellPageKey;
  account: AccountSummary | null;
  pageContext: AssistantPageContext;
}) {
  const [taskContextDraft, setTaskContextDraft] = useState("");
  const accountItems = useMemo(() => collectAccountItems(props.account), [props.account]);
  const taskContext = useMemo(() => buildAssistantTaskContext({
    text: taskContextDraft,
    accountItems,
    pageContextFacts: props.pageContext.facts
  }), [accountItems, props.pageContext.facts, taskContextDraft]);

  useEffect(() => {
    try {
      setTaskContextDraft(window.localStorage.getItem(taskContextStorageKey) ?? "");
    } catch {
      setTaskContextDraft("");
    }
  }, []);

  function saveTaskContextDraft() {
    try {
      window.localStorage.setItem(taskContextStorageKey, taskContextDraft);
    } catch {
      // 本地存储失败不影响当前侧边栏解析。
    }
  }

  function clearTaskContextDraft() {
    setTaskContextDraft("");
    try {
      window.localStorage.removeItem(taskContextStorageKey);
    } catch {
      // 本地存储失败不影响当前侧边栏解析。
    }
  }

  return (
    <section className="assistant-task-panel">
      <div className="assistant-context-card">
        <strong>当前上下文</strong>
        <span>{props.pageContext.page_label || pageLabels[props.activePage]}</span>
        <small>
          {props.pageContext.facts.join("；") || "当前页面暂无可用上下文。"}
        </small>
      </div>
      <label className="assistant-task-editor">
        <span>粘贴任务文本或攻略</span>
        <textarea
          value={taskContextDraft}
          onChange={(event) => setTaskContextDraft(event.target.value)}
          placeholder="粘贴任务步骤、攻略正文、配装说明或视频文案。任务助手会提取步骤，并匹配当前账号里提到的装备。"
          rows={7}
        />
      </label>
      <div className="button-row">
        <button type="button" className="secondary-button" disabled={!taskContextDraft.trim()} onClick={saveTaskContextDraft}>
          保存上下文
        </button>
        <button type="button" className="secondary-button" disabled={!taskContextDraft.trim()} onClick={clearTaskContextDraft}>
          清空
        </button>
      </div>
      <div className="assistant-context-card">
        <strong>{taskContext.title}</strong>
        <small>
          已识别 {taskContext.steps.length} 个攻略步骤，关联 {taskContext.linkedItems.length} 件账号装备。
        </small>
      </div>
      <div className="assistant-task-tree">
        <h3>任务 / 攻略上下文</h3>
        {taskContext.treeGroups.map((group) => (
          <details key={group.title} open>
            <summary>{group.title}</summary>
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>
      <p className="assistant-task-note">
        这棵树只整理你粘贴的任务和攻略，不会猜测外部数据；可保存方案草稿和 AI 问答节点可基于同一页面上下文继续问缺口和刷取建议。
      </p>
    </section>
  );
}

function AssistantHeader(props: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <div className="global-assistant-header">
      <div>
        <h2>{props.title}</h2>
        <p>{props.subtitle}</p>
      </div>
      <button type="button" onClick={props.onClose} aria-label="关闭助手">
        关闭
      </button>
    </div>
  );
}
