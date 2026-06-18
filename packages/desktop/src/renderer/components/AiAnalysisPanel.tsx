import { useState } from "react";
import { api, type AccountItemSummary, type VaultAiAdviceResult, type VaultAnalysisResult, type VaultTags } from "../api/client";

export function AiAnalysisPanel(props: {
  items: AccountItemSummary[];
  tags: VaultTags;
  onLoadAccount: () => void;
  isLoadingAccount: boolean;
}) {
  const [result, setResult] = useState<VaultAnalysisResult | null>(null);
  const [aiResult, setAiResult] = useState<VaultAiAdviceResult["ai"] | null>(null);
  const [aiSkippedReason, setAiSkippedReason] = useState("");
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

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
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "AI 深度分析失败");
    } finally {
      setIsGeneratingAi(false);
    }
  }

  if (!props.items.length) {
    return (
      <section className="tool-panel placeholder-panel">
        <div className="section-heading">
          <div>
            <h2>AI 分析</h2>
            <p>先读取账号数据，再基于仓库、实际 roll 和本地标记生成分析。</p>
          </div>
          <button type="button" disabled={props.isLoadingAccount} onClick={props.onLoadAccount}>
            {props.isLoadingAccount ? "读取中..." : "读取账号数据"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="tool-panel">
      <div className="section-heading">
        <div>
          <h2>AI 分析</h2>
          <p>先用本地确定性分析整理事实、风险和下一步建议，后续再接模型深度分析。</p>
        </div>
        <div className="button-row">
          <button type="button" disabled={isAnalyzing || isGeneratingAi} onClick={() => void analyze()}>
            {isAnalyzing ? "分析中..." : "本地分析"}
          </button>
          <button type="button" disabled={isAnalyzing || isGeneratingAi} onClick={() => void generateAiAdvice()}>
            {isGeneratingAi ? "生成中..." : "AI 深度建议"}
          </button>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {aiSkippedReason ? <p className="notice">{aiSkippedReason}</p> : null}
      {result ? (
        <div className="analysis-grid">
          <AnalysisSection title="事实" lines={result.facts} />
          <AnalysisSection title="分析" lines={result.analysis} />
          <AnalysisSection title="建议" lines={result.suggestions} />
          {aiResult ? (
            <section className="analysis-section ai-advice-section">
              <h3>AI 深度建议</h3>
              <p className="muted-copy">{aiResult.provider} / {aiResult.model}</p>
              <div className="ai-advice-text">{aiResult.text}</div>
            </section>
          ) : null}
          <section className="analysis-section">
            <h3>标记清单</h3>
            <TaggedItems title="保留" items={result.items.keep} />
            <TaggedItems title="关注" items={result.items.review} />
            <TaggedItems title="可清理" items={result.items.junk} />
          </section>
        </div>
      ) : (
        <p className="notice">点击“分析仓库”生成第一版本地分析。</p>
      )}
    </section>
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
