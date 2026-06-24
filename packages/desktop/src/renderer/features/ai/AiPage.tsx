import type {
  AccountSummary,
  ActivityHistorySummary,
  DailySummary,
  VaultTags
} from "../../api/client";
import { AiAnalysisPanel } from "../../components/AiAnalysisPanel";
import type { AssistantPageContext } from "../../shared/domain/assistant/assistantContext";

export function AiPage(props: {
  isConfigured: boolean;
  account: AccountSummary | null;
  daily: DailySummary | null;
  activity: ActivityHistorySummary | null;
  pageContext: AssistantPageContext;
  tags: VaultTags;
  isLoadingAccount: boolean;
  onLoadAccount: () => void;
  onConfigureAi: () => void;
}) {
  if (!props.isConfigured) {
    return (
      <section className="tool-panel placeholder-panel">
        <div className="section-heading">
          <div>
            <h2>AI 助手</h2>
            <p>还没有配置 AI。先到设置页填写提供商、模型和 API Key，再回来聊天分析。</p>
          </div>
          <button type="button" onClick={props.onConfigureAi}>去设置配置 AI</button>
        </div>
      </section>
    );
  }

  return (
    <AiAnalysisPanel
      account={props.account}
      daily={props.daily}
      activity={props.activity}
      pageContext={props.pageContext}
      items={props.account?.vault.items ?? []}
      tags={props.tags}
      isLoadingAccount={props.isLoadingAccount}
      onLoadAccount={props.onLoadAccount}
    />
  );
}
