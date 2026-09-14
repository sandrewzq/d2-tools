import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { VaultRecommendationScanState } from "@d2-tools/app/account";
import type { LocalCommunityRecommendationTable } from "@d2-tools/core/community-perks";
import { useState } from "react";
import { ControlButton } from "../control/ControlButton.js";
import { VaultWishlistManager, type VaultRecommendationManagedSource, type VaultWishlistActions } from "./VaultWishlistManager.js";
import { VaultRecommendationSourceManager } from "./VaultRecommendationSourceManager.js";

export type VaultRecommendationSourceState = {
  recommendationScan: VaultRecommendationScanState;
  customRules: LocalCommunityRecommendationTable | null;
  customRulesLoadState: "loading" | "ready" | "error";
  customRulesLoadError?: string;
};

export function VaultRecommendationEvidencePanel(props: {
  wishlist?: DimWishlist | null;
  sourceState?: VaultRecommendationSourceState;
  wishlistActions?: VaultWishlistActions;
  onCopyAuditReport?: () => void | Promise<void>;
  onManagedSourcesChange?: (sources: readonly VaultRecommendationManagedSource[]) => void;
}) {
  const [importFocus, setImportFocus] = useState<"knowledge" | "dim">("knowledge");
  const [importOpen, setImportOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ready" | "error"; message: string } | null>(null);
  const [copying, setCopying] = useState(false);
  const scan = props.sourceState?.recommendationScan;

  function openImport(focus: "knowledge" | "dim") {
    setImportFocus(focus);
    setImportOpen(true);
  }

  return (
    <section className="vault-evidence-panel" data-surface="section" aria-label="推荐来源">
      <div className="vault-column-head">
        <div><h3>推荐来源管理</h3><span>一级页面管理来源和状态；点击“查看详情”进入二级明细。装备命中筛选与来源证据在“浏览装备”中查看。</span></div>
      </div>
      {feedback ? <p className={`status-message status-${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.message}</p> : null}
      <div className="vault-recommendation-import-entry" data-ui-kind="state-frame" data-surface="frame">
        <div><span className="ui-badge" data-ui-kind="status-chip" data-status="neutral">导入来源</span><h3>添加或替换推荐数据</h3><p>人工推荐使用 CSV，DIM 使用 Wishlist。导入前会先预览，确认后才会写入本机。</p></div>
        {props.wishlistActions ? <div className="vault-recommendation-import-actions"><ControlButton variant="primary" onClick={() => openImport("knowledge")}>导入人工推荐 CSV</ControlButton><ControlButton size="compact" variant="secondary" onClick={() => openImport("dim")}>导入 DIM Wishlist</ControlButton></div> : null}
      </div>
      <div className="vault-recommendation-summary" data-ui-kind="callout" data-status="neutral">
        <span>{formatRecommendationScanDetail(scan)}</span>
        {props.onCopyAuditReport ? <ControlButton size="compact" variant="quiet" disabled={copying} onClick={() => { setCopying(true); void Promise.resolve(props.onCopyAuditReport?.()).then(() => setFeedback({ tone: "ready", message: "只读验收报告已复制。" }), () => setFeedback({ tone: "error", message: "复制失败，请稍后重试。" })).finally(() => setCopying(false)); }}>{copying ? "正在生成报告" : "复制验收报告"}</ControlButton> : null}
      </div>
      {props.wishlistActions ? <VaultRecommendationSourceManager actions={props.wishlistActions} onApplied={(message) => setFeedback({ tone: "ready", message })} onSourcesChange={props.onManagedSourcesChange} /> : <div className="vault-evidence-empty" data-surface="empty"><strong>当前平台不支持来源管理</strong><span>请使用支持导入和来源管理的桌面端。</span></div>}
      {importOpen && props.wishlistActions ? <VaultWishlistManager wishlist={props.wishlist} actions={props.wishlistActions} initialFocus={importFocus} showManagement={false} onApplied={(message) => setFeedback({ tone: "ready", message })} onClose={() => setImportOpen(false)} /> : null}
    </section>
  );
}

function formatRecommendationScanDetail(scan?: VaultRecommendationScanState): string {
  if (!scan) return "尚未读取账号推荐核对状态。";
  if (scan.message) return scan.message;
  if (scan.phase === "complete") return `已核对 ${scan.scanned_weapon_count}/${scan.total_weapon_count} 件账号武器，${scan.covered_weapon_count} 件有推荐来源覆盖。`;
  if (scan.phase === "scanning") return `正在核对 ${scan.total_weapon_count} 件账号武器。`;
  if (scan.phase === "partial") return `当前保留 ${scan.retained_result_count} 件上次核对结果。`;
  if (scan.phase === "error") return "账号武器推荐来源核对失败。";
  return "尚未开始账号武器推荐来源核对。";
}
