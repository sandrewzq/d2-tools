import { useState } from "react";
import { buildAiChatContext } from "@d2-tools/core/ai/chat";
import {
  api,
  type AccountItemSummary,
  type AccountSummary,
  type ActivityHistorySummary,
  type DailySummary,
  type AiAdviceSections,
  type VaultAiAdviceResult,
  type VaultAnalysisResult,
  type VaultTags
} from "../api/client";

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
  items: AccountItemSummary[];
  tags: VaultTags;
  onLoadAccount: () => void;
  isLoadingAccount: boolean;
}) {
  const [result, setResult] = useState<VaultAnalysisResult | null>(null);
  const [aiResult, setAiResult] = useState<VaultAiAdviceResult["ai"] | null>(null);
  const [aiSkippedReason, setAiSkippedReason] = useState("");
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);

  async function analyze() {
    setIsAnalyzing(true);
    setError("");

    try {
      setAiResult(null);
      setAiSkippedReason("");
      setResult(await api.analyzeVault({
        items: props.items,
        tags: props.tags
      }));
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "仓库分析失败");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function generateAiAdvice() {
    setIsGeneratingAi(true);
    setError("");
    setAiSkippedReason("");

    try {
      const advice = await api.generateVaultAiAdvice({
        items: props.items,
        tags: props.tags
      });
      setResult(advice.local);
      setAiResult(advice.ai);
      setAiSkippedReason(advice.skipped_reason ?? "");
      const aiText = advice.ai?.text;
      if (aiText) {
        setMessages((current) => [
          ...current,
          { role: "user", text: "请基于当前仓库做一次深度分析。" },
          { role: "assistant", text: aiText }
        ]);
      }
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "AI 深度分析失败");
    } finally {
      setIsGeneratingAi(false);
    }
  }

  async function sendChat(nextQuestion = question) {
    const trimmedQuestion = nextQuestion.trim();
    if (!trimmedQuestion) return;

    setIsSendingChat(true);
    setError("");
    setQuestion("");
    setMessages((current) => [...current, { role: "user", text: trimmedQuestion }]);

    try {
      const context = buildAiChatContext({
        account: props.account as never,
        tags: props.tags as never,
        daily: props.daily as never,
        activity: props.activity as never
      });
      const reply = await api.sendAiChat({
        question: trimmedQuestion,
        context
      });
      setMessages((current) => [...current, { role: "assistant", text: reply.text }]);
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "AI 聊天失败");
    } finally {
      setIsSendingChat(false);
    }
  }

  if (!props.items.length) {
    return (
      <section className="tool-panel placeholder-panel">
        <div className="section-heading">
          <div>
            <h2>AI 助手</h2>
            <p>先读取账号数据，AI 才能分析角色、仓库、背包、标签、备注和今日信息。</p>
          </div>
          <button type="button" disabled={props.isLoadingAccount} onClick={props.onLoadAccount}>
            {props.isLoadingAccount ? "读取中..." : "读取账号数据"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="tool-panel ai-chat-panel">
      <div className="section-heading">
        <div>
          <h2>AI 助手</h2>
          <p>像聊天一样提问。AI 会读取当前账号摘要，但不会读取或发送 token、client secret、API Key。</p>
        </div>
        <div className="button-row">
          <button type="button" disabled={isAnalyzing || isGeneratingAi || isSendingChat} onClick={() => void analyze()}>
            {isAnalyzing ? "分析中..." : "本地分析"}
          </button>
          <button type="button" disabled={isAnalyzing || isGeneratingAi || isSendingChat} onClick={() => void generateAiAdvice()}>
            {isGeneratingAi ? "生成中..." : "AI 深度建议"}
          </button>
        </div>
      </div>

      <div className="ai-context-strip">
        <span>仓库 {props.items.length} 件</span>
        <span>角色 {props.account?.characters.length ?? 0} 个</span>
        <span>材料 {props.account?.materials.item_count ?? 0} 种</span>
        <span>{props.daily ? "今日信息已载入" : "今日信息未载入"}</span>
      </div>

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

      {error ? <p className="error">{error}</p> : null}
      {aiSkippedReason ? <p className="notice">{aiSkippedReason}</p> : null}

      <div className="ai-chat-log" aria-live="polite">
        {messages.length ? messages.map((message, index) => (
          <article className={`ai-chat-message message-${message.role}`} key={`${message.role}-${index}`}>
            <strong>{message.role === "user" ? "你" : "AI"}</strong>
            <p>{message.text}</p>
          </article>
        )) : (
          <p className="notice">可以直接问“哪些装备可以分解”“这周刷什么”“帮我整理 PVE 配装”。</p>
        )}
        {isSendingChat ? <p className="notice">AI 正在读取上下文并生成回答...</p> : null}
      </div>

      <form className="ai-chat-input" onSubmit={(event) => {
        event.preventDefault();
        void sendChat();
      }}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="输入你的问题，例如：帮我找出仓库里可以清理的同名装备"
          rows={3}
        />
        <button type="submit" disabled={isSendingChat || !question.trim()}>
          {isSendingChat ? "发送中..." : "发送"}
        </button>
      </form>

      {result ? (
        <div className="analysis-grid">
          <AnalysisSection title="事实" lines={result.facts} />
          <AnalysisSection title="分析" lines={result.analysis} />
          <AnalysisSection title="建议" lines={result.suggestions} />
          <section className="analysis-section">
            <h3>本地评分</h3>
            <div className="score-summary-row">
              <span>建议保留 <strong>{result.scoring.counts.keep}</strong></span>
              <span>建议复查 <strong>{result.scoring.counts.review}</strong></span>
              <span>可清理 <strong>{result.scoring.counts.junk}</strong></span>
            </div>
            <ScoreExamples title="高分装备" items={result.scoring.top_keep} />
            <ScoreExamples title="复查装备" items={result.scoring.top_review} />
            <ScoreExamples title="清理候选" items={result.scoring.top_junk} />
          </section>
          {aiResult ? (
            <section className="analysis-section ai-advice-section">
              <h3>AI 深度建议</h3>
              <p className="muted-copy">{aiResult.provider} / {aiResult.model}</p>
              <AiSectionView sections={aiResult.sections} />
            </section>
          ) : null}
          <section className="analysis-section">
            <h3>标记清单</h3>
            <TaggedItems title="保留" items={result.items.keep} />
            <TaggedItems title="关注" items={result.items.review} />
            <TaggedItems title="可清理" items={result.items.junk} />
          </section>
        </div>
      ) : null}
    </section>
  );
}

function AiSectionView(props: { sections: AiAdviceSections }) {
  const hasSections = props.sections.facts.length
    || props.sections.analysis.length
    || props.sections.suggestions.length
    || props.sections.action_reminders.length;
  if (!hasSections) {
    return <div className="ai-advice-text">{props.sections.raw}</div>;
  }

  return (
    <div className="ai-section-grid">
      <AiSection title="事实" items={props.sections.facts} />
      <AiSection title="分析" items={props.sections.analysis} />
      <AiSection title="建议" items={props.sections.suggestions} />
      <AiSection title="操作提醒" items={props.sections.action_reminders} />
    </div>
  );
}

function AiSection(props: { title: string; items: string[] }) {
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

function ScoreExamples(props: { title: string; items: VaultAnalysisResult["scoring"]["top_keep"] }) {
  if (!props.items.length) {
    return null;
  }

  return (
    <div className="analysis-tag-block">
      <strong>{props.title}</strong>
      <ul>
        {props.items.slice(0, 4).map((item) => (
          <li key={item.item_key}>
            {item.name}
            <span>{item.score} 分 / {item.reasons.slice(0, 2).join(" / ")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnalysisSection(props: { title: string; lines: string[] }) {
  return (
    <section className="analysis-section">
      <h3>{props.title}</h3>
      <ul>
        {props.lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </section>
  );
}

function TaggedItems(props: { title: string; items: VaultAnalysisResult["items"]["keep"] }) {
  return (
    <div className="analysis-tag-block">
      <strong>{props.title}</strong>
      {props.items.length ? (
        <ul>
          {props.items.map((item) => (
            <li key={item.item_key}>
              {item.name}
              {item.plugs.length ? <span>{item.plugs.join(" / ")}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>暂无</p>
      )}
    </div>
  );
}
