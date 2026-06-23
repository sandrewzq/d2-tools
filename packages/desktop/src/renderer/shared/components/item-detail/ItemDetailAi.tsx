import type { ItemAiAdviceResult } from "../../../api/client";
import { protocolLabel } from "../../../utils/aiSettings";

export type ItemDetailAiProps = {
  isGeneratingItemAi: boolean;
  itemAiError: string;
  itemAiResult: ItemAiAdviceResult | null;
  itemShareMessage: string;
  onCopySelectedItemChatGuide: () => void;
  onCopySelectedItemSummary: () => void;
  onGenerateItemAiAdvice: () => void;
};

export function ItemDetailAi(props: ItemDetailAiProps) {
  return (
    <section className="modal-score-panel">
      <div>
        <h3>装备操作</h3>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={props.onCopySelectedItemSummary}>
            复制结论
          </button>
          <button type="button" className="secondary-button" onClick={props.onCopySelectedItemChatGuide}>
            生成群聊说明
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={props.isGeneratingItemAi}
            onClick={props.onGenerateItemAiAdvice}
          >
            {props.isGeneratingItemAi ? "AI 解读中..." : "AI 解读"}
          </button>
        </div>
      </div>
      {props.itemShareMessage ? <p className="notice">{props.itemShareMessage}</p> : null}
      {props.itemAiError ? <p className="error">{props.itemAiError}</p> : null}
      {props.itemAiResult?.skipped_reason ? (
        <section className="source-status-card source-status-warning item-ai-skipped-reason" aria-live="polite">
          <span className="source-status-badge source-status-warning">AI 跳过</span>
          <p>{props.itemAiResult.skipped_reason}</p>
        </section>
      ) : null}
      {props.itemAiResult?.ai ? (
        <section className="item-ai-panel">
          <div>
            <h3>AI 装备解读</h3>
            <p>{protocolLabel(props.itemAiResult.ai.provider)} / {props.itemAiResult.ai.model}</p>
          </div>
          <ItemAiSections sections={props.itemAiResult.ai.sections} />
        </section>
      ) : null}
    </section>
  );
}

function ItemAiSections(props: { sections: NonNullable<ItemAiAdviceResult["ai"]>["sections"] }) {
  const hasSections = props.sections.facts.length
    || props.sections.analysis.length
    || props.sections.suggestions.length
    || props.sections.action_reminders.length;
  if (!hasSections) {
    return <div className="ai-advice-text">{props.sections.raw}</div>;
  }
  return (
    <div className="ai-section-grid">
      <SimpleAiSection title="事实" items={props.sections.facts} />
      <SimpleAiSection title="分析" items={props.sections.analysis} />
      <SimpleAiSection title="建议" items={props.sections.suggestions} />
      <SimpleAiSection title="操作提醒" items={props.sections.action_reminders} />
    </div>
  );
}

function SimpleAiSection(props: { title: string; items: string[] }) {
  if (!props.items.length) return null;
  return (
    <section className="ai-section-card">
      <h4>{props.title}</h4>
      <ul>
        {props.items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}
