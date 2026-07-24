import { useEffect, useMemo, useState } from "react";
import { homePageLabels } from "@d2-tools/app/home";
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
import { KohinataTaskPanelView, type ShellAssistantMode, type ShellPageKey } from "@d2-tools/ui";

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
    <KohinataTaskPanelView
      pageLabel={props.pageContext.page_label || homePageLabels[props.activePage]}
      pageFacts={props.pageContext.facts}
      draft={taskContextDraft}
      statusMessage={taskAssistantMessage}
      contextTitle={taskContext.title}
      recognizedStepCount={taskContext.steps.length}
      linkedItemCount={taskContext.linkedItems.length}
      taskGroups={formatKohinataTaskGroups(kohinataTask)}
      contextGroups={taskContext.treeGroups}
      canParse={Boolean(taskContextDraft.trim())}
      canMatch={Boolean(taskContextDraft.trim())}
      canCreateDraft={Boolean(kohinataTask?.match_result)}
      canSaveDraft={Boolean(kohinataTask?.draft)}
      onDraftChange={setTaskContextDraft}
      onSaveContext={saveTaskContextDraft}
      onClearContext={clearTaskContextDraft}
      onParse={() => void handleParseGuide()}
      onMatch={() => void handleMatchGuide()}
      onCreateDraft={() => void handleCreateDraft()}
      onSaveDraft={handleSaveDraft}
      onReviewGaps={handleReviewGaps}
    />
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
