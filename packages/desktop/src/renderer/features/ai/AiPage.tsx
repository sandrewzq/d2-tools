import type {
  AccountSummary,
  ActivityHistorySummary,
  DailySummary,
  VaultTags
} from "../../api/types";
import { AiAssistantPanelView, assistantText, getLocaleCopy, type InterfaceLocale } from "@d2-tools/ui";
import type { AssistantArtifact } from "@d2-tools/app/capabilities";
import { AiAnalysisPanel } from "../../components/AiAnalysisPanel";
import type { AssistantPageContext } from "../../shared/domain/assistant/assistantContext";
import { resolveAssistantPageLabel } from "../../shared/domain/assistant/assistantContext";

export function AiPage(props: {
  isConfigured: boolean;
  interfaceLocale?: InterfaceLocale;
  account: AccountSummary | null;
  daily: DailySummary | null;
  activity: ActivityHistorySummary | null;
  pageContext: AssistantPageContext;
  getPageContext?: () => AssistantPageContext;
  tags: VaultTags;
  isLoadingAccount: boolean;
  onLoadAccount: () => void;
  onConfigureAi: () => void;
  onOpenArtifact: (artifact: AssistantArtifact) => void;
  onClose?: () => void;
}) {
  const pageContext = props.getPageContext?.() ?? props.pageContext;
  const shellCopy = getLocaleCopy(props.interfaceLocale ?? "zh-CN").shell;
  const copy = shellCopy.assistant;
  if (!props.isConfigured) {
    return (
      <AiAssistantPanelView
        copy={copy}
        isConfigured={false}
        sessionTitle={assistantText(copy, "新会话")}
        messages={[]}
        question=""
        isSending={false}
        isLoadingAccount={props.isLoadingAccount}
        hasAccountItems={false}
        history={[]}
        activeSessionId={null}
        isSessionDrawerOpen={false}
        isContextDrawerOpen={false}
        contextChip={assistantText(copy, "AI 未配置")}
        context={{
          pageLabel: resolveAssistantPageLabel(shellCopy, pageContext.page_key),
          focus: assistantText(copy, pageContext.focus),
          facts: pageContext.facts.slice(0, 4),
          itemCount: 0,
          characterCount: props.account?.characters.length ?? 0,
          materialCount: props.account?.materials.item_count ?? 0,
          dailyLoaded: Boolean(props.daily),
          snapshotState: "unsaved",
          snapshotLabel: assistantText(copy, "尚未创建上下文快照")
        }}
        quickPrompts={[]}
        onQuestionChange={() => undefined}
        onSubmit={() => undefined}
        onQuickPrompt={() => undefined}
        onLoadAccount={props.onLoadAccount}
        onConfigureAi={props.onConfigureAi}
        onClose={props.onClose ?? (() => undefined)}
        onStartNewSession={() => undefined}
        onToggleSessionDrawer={() => undefined}
        onToggleContextDrawer={() => undefined}
        onOpenContextDrawer={() => undefined}
        onCloseContextDrawer={() => undefined}
        onClearHistory={() => undefined}
        onSwitchSession={() => undefined}
        onDeleteSession={() => undefined}
        onOpenArtifact={() => undefined}
      />
    );
  }

  return (
    <AiAnalysisPanel
      account={props.account}
      interfaceLocale={props.interfaceLocale}
      daily={props.daily}
      activity={props.activity}
      pageContext={pageContext}
      getPageContext={props.getPageContext}
      items={props.account?.vault.items ?? []}
      tags={props.tags}
      isLoadingAccount={props.isLoadingAccount}
      onLoadAccount={props.onLoadAccount}
      onConfigureAi={props.onConfigureAi}
      onOpenArtifact={props.onOpenArtifact}
      onClose={props.onClose ?? (() => undefined)}
    />
  );
}
