import { useEffect, useMemo, useState } from "react";
import { homePageLabels } from "@d2-tools/app";
import type {
  AccountSummary,
  AccountItemSummary,
  ActivityHistorySummary,
  BuildGuideLoadoutDraft,
  BuildGuideTaskState,
  DailySummary,
  VaultTags
} from "../api/types";
import { api } from "../api/client";
import { collectAccountItems } from "../utils/accountItems";
import { AiPage } from "../features/ai/AiPage";
import type { AssistantPageContext } from "../shared/domain/assistant/assistantContext";
import { buildAssistantTaskContext } from "../shared/domain/assistant/assistantTaskContext";
import { formatKohinataTaskGroups } from "../shared/domain/assistant/kohinataViewModel";
import type { ShellAssistantMode, ShellPageKey } from "@d2-tools/ui";

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
  onSaveGuideDraft?: (draft: BuildGuideLoadoutDraft) => void;
}) {
  if (props.assistantMode === "ai") {
    return (
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
    );
  }

  if (props.assistantMode === "tasks") {
    return (
      <>
        <AssistantHeader title="小日向" subtitle="解析攻略、对照账号、生成配装草稿。" onClose={props.onClose} />
        <TaskAssistantPanel
          activePage={props.activePage}
          account={props.account}
          pageContext={props.pageContext}
          onSaveGuideDraft={props.onSaveGuideDraft}
        />
      </>
    );
  }

  return null;
}

function TaskAssistantPanel(props: {
  activePage: ShellPageKey;
  account: AccountSummary | null;
  pageContext: AssistantPageContext;
  onSaveGuideDraft?: (draft: BuildGuideLoadoutDraft) => void;
}) {
  const [taskContextDraft, setTaskContextDraft] = useState("");
  const [taskAssistantMessage, setTaskAssistantMessage] = useState("");
  const [kohinataTask, setKohinataTask] = useState<BuildGuideTaskState | null>(null);
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

  async function handleParseGuide() {
    if (!taskContextDraft.trim()) {
      setTaskAssistantMessage("请先粘贴攻略。");
      return;
    }
    setTaskAssistantMessage("正在解析攻略...");
    try {
      const parseResult = await api.parseBuildGuide({ rawText: taskContextDraft });
      setKohinataTask({
        raw_text: taskContextDraft,
        parse_result: parseResult,
        next_actions: ["match", "create_draft", "save_draft", "review_gaps"]
      });
      setTaskAssistantMessage("攻略已解析。");
    } catch (error) {
      setTaskAssistantMessage(error instanceof Error ? error.message : "攻略解析失败");
    }
  }

  async function handleMatchGuide() {
    setTaskAssistantMessage("正在对照账号...");
    try {
      const parseResult = kohinataTask?.parse_result ?? (taskContextDraft.trim()
        ? await api.parseBuildGuide({ rawText: taskContextDraft })
        : null);
      if (!parseResult) {
        setTaskAssistantMessage("请先粘贴并解析攻略。");
        return;
      }
      const matchResult = await api.matchBuildGuide({
        requirement: parseResult.requirement,
        characterId: props.account?.characters[0]?.character_id
      });
      setKohinataTask({
        raw_text: taskContextDraft,
        parse_result: parseResult,
        match_result: matchResult,
        next_actions: ["create_draft", "save_draft", "review_gaps"]
      });
      setTaskAssistantMessage("账号对照完成。");
    } catch (error) {
      setTaskAssistantMessage(error instanceof Error ? error.message : "账号对照失败");
    }
  }

  async function handleCreateDraft() {
    const matchResult = kohinataTask?.match_result;
    const characterId = props.account?.characters[0]?.character_id;
    if (!matchResult || !characterId) {
      setTaskAssistantMessage("请先读取账号并完成对照。");
      return;
    }
    setTaskAssistantMessage("正在生成草稿...");
    try {
      const draft = await api.createGuideLoadoutDraft({
        match: matchResult,
        characterId,
        fallbackName: taskContext.title
      });
      setKohinataTask((current) => ({
        raw_text: current?.raw_text ?? taskContextDraft,
        parse_result: current?.parse_result,
        match_result: matchResult,
        draft,
        next_actions: ["save_draft", "review_gaps"]
      }));
      setTaskAssistantMessage("配装草稿已生成。");
    } catch (error) {
      setTaskAssistantMessage(error instanceof Error ? error.message : "生成草稿失败");
    }
  }

  function handleSaveDraft() {
    if (!kohinataTask?.draft) {
      setTaskAssistantMessage("请先生成草稿。");
      return;
    }
    props.onSaveGuideDraft?.(kohinataTask.draft);
    setTaskAssistantMessage(`已发送到配装页保存：${kohinataTask.draft.name}`);
  }

  function handleReviewGaps() {
    const missingCount = kohinataTask?.match_result?.missing_requirements.length ?? 0;
    const confirmationCount = kohinataTask?.match_result?.needs_confirmation.length ?? 0;
    setTaskAssistantMessage(`缺口 ${missingCount} 项，待确认 ${confirmationCount} 项。`);
  }

  return (
    <section className="assistant-task-panel">
      <div className="assistant-context-card">
        <strong>当前上下文</strong>
        <span>{props.pageContext.page_label || homePageLabels[props.activePage]}</span>
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
      <div className="button-row">
        <button type="button" onClick={handleParseGuide} disabled={!taskContextDraft.trim()}>解析攻略</button>
        <button type="button" onClick={() => void handleMatchGuide()} disabled={!taskContextDraft.trim()}>对照账号</button>
        <button type="button" onClick={() => void handleCreateDraft()} disabled={!kohinataTask?.match_result}>生成草稿</button>
        <button type="button" onClick={handleSaveDraft} disabled={!kohinataTask?.draft}>保存草稿</button>
        <button type="button" className="secondary-button" onClick={handleReviewGaps}>查看缺口</button>
      </div>
      {taskAssistantMessage ? <p className="status-message status-neutral">{taskAssistantMessage}</p> : null}
      <div className="assistant-context-card">
        <strong>{taskContext.title}</strong>
        <small>
          已识别 {taskContext.steps.length} 个攻略步骤，关联 {taskContext.linkedItems.length} 件账号装备。
        </small>
      </div>
      <div className="assistant-task-tree">
        <h3>小日向任务状态</h3>
        {formatKohinataTaskGroups(kohinataTask).map((group) => (
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
      <div className="assistant-task-tree">
        <h3>任务 / 攻略上下文</h3>
        {taskContext.treeGroups.map((group) => (
          <details key={group.title}>
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
